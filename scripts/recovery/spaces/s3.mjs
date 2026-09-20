/**
 * Minimal AWS SigV4 S3-compatible client for DigitalOcean Spaces.
 * Uses only node:crypto and node:https — NO aws-sdk.
 *
 * Real provider integration tests MUST set BOBA_RECOVERY_REAL_SPACES=1.
 * When that env is not "1", callers should not exercise live Spaces endpoints.
 */
import { createHash, createHmac } from "node:crypto";
import https from "node:https";
import { URL } from "node:url";
import {
  SPACES_OBJECT_LOCK_WORM_REQUIRED,
  SPACES_VERSIONING,
  SPACES_VERSIONING_IS_IMMUTABILITY,
} from "../constants.mjs";
import { redactText } from "../redact.mjs";

/**
 * @typedef {object} S3SpacesConfig
 * @property {string} accessKeyId
 * @property {string} secretAccessKey
 * @property {string} region
 * @property {string} endpoint
 * @property {string} bucket
 */

/**
 * Locked versioning semantics for Spaces recovery buckets.
 * @returns {{ versioning: string, versioningIsImmutability: false, objectLockWormRequired: false }}
 */
export function assertVersioningSemantics() {
  return {
    versioning: SPACES_VERSIONING,
    versioningIsImmutability: SPACES_VERSIONING_IS_IMMUTABILITY,
    objectLockWormRequired: SPACES_OBJECT_LOCK_WORM_REQUIRED,
  };
}

/**
 * @param {S3SpacesConfig} config
 */
export function createS3SpacesClient(config) {
  const accessKeyId = requireString(config?.accessKeyId, "accessKeyId");
  const secretAccessKey = requireString(config?.secretAccessKey, "secretAccessKey");
  const region = requireString(config?.region, "region");
  const endpoint = requireString(config?.endpoint, "endpoint");
  const bucket = requireString(config?.bucket, "bucket");
  const endpointUrl = normalizeEndpoint(endpoint);

  return {
    backend: "s3",
    bucket,
    region,
    endpoint: endpointUrl.origin,
    assertVersioningSemantics,
    putObject,
    getObject,
    headObject,
    deleteObject,
    listObjectsV2,
    listObjects: listObjectsV2,
    verifyRemoteSha256,
    getBucketVersioning,
    verifyBucketVersioning,
  };

  /**
   * @param {{ key: string, body: Buffer | string }} input
   */
  async function putObject(input) {
    const key = requireString(input?.key, "key");
    const body = Buffer.isBuffer(input.body)
      ? input.body
      : Buffer.from(String(input.body ?? ""), "utf8");
    const response = await signedRequest({
      method: "PUT",
      key,
      body,
      headers: {
        "content-type": "application/octet-stream",
        "content-length": String(body.length),
      },
    });
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(redactText(`S3 putObject failed with status ${response.statusCode}`));
    }
    return {
      key,
      etag: stripQuotes(response.headers.etag),
      size: body.length,
    };
  }

  /**
   * @param {{ key: string }} input
   */
  async function getObject(input) {
    const key = requireString(input?.key, "key");
    const response = await signedRequest({ method: "GET", key });
    if (response.statusCode === 404) {
      throw new Error(`object not found: ${key}`);
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(redactText(`S3 getObject failed with status ${response.statusCode}`));
    }
    return {
      key,
      body: response.body,
      etag: stripQuotes(response.headers.etag),
    };
  }

  /**
   * @param {{ key: string }} input
   */
  async function headObject(input) {
    const key = requireString(input?.key, "key");
    const response = await signedRequest({ method: "HEAD", key });
    if (response.statusCode === 404) {
      return { exists: false, key };
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(redactText(`S3 headObject failed with status ${response.statusCode}`));
    }
    return {
      exists: true,
      key,
      etag: stripQuotes(response.headers.etag),
      size: Number(response.headers["content-length"] ?? 0),
    };
  }

  /**
   * Ordinary S3-compatible DELETE for Layer 2 retention prune.
   * No object-lock / WORM assumptions.
   *
   * @param {{ key: string }} input
   */
  async function deleteObject(input) {
    const key = requireString(input?.key, "key");
    const response = await signedRequest({ method: "DELETE", key });
    if (response.statusCode === 404) {
      return { deleted: true, key, alreadyAbsent: true };
    }
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(redactText(`S3 deleteObject failed with status ${response.statusCode}`));
    }
    return { deleted: true, key };
  }

  /**
   * GET Bucket Versioning (Spaces-compatible). Distinguishes ENABLED / NOT_ENABLED / UNKNOWN.
   * Versioning is NOT immutability and NOT WORM.
   *
   * @returns {Promise<{ status: "ENABLED" | "NOT_ENABLED" | "UNKNOWN" | "FAILED", rawStatus?: string, reason?: string }>}
   */
  async function getBucketVersioning() {
    try {
      const response = await signedRequest({
        method: "GET",
        key: "",
        query: { versioning: "" },
      });
      if (response.statusCode < 200 || response.statusCode >= 300) {
        return {
          status: "FAILED",
          reason: redactText(`getBucketVersioning failed with status ${response.statusCode}`),
        };
      }
      const xml = response.body.toString("utf8");
      const match = /<Status>\s*([^<]+)\s*<\/Status>/i.exec(xml);
      if (!match) {
        // Empty versioning configuration means versioning was never enabled.
        return { status: "NOT_ENABLED", rawStatus: "" };
      }
      const rawStatus = match[1].trim();
      if (/^enabled$/i.test(rawStatus)) {
        return { status: "ENABLED", rawStatus };
      }
      if (/^suspended$/i.test(rawStatus)) {
        return { status: "NOT_ENABLED", rawStatus };
      }
      return { status: "UNKNOWN", rawStatus };
    } catch (error) {
      return {
        status: "FAILED",
        reason: redactText(error instanceof Error ? error.message : String(error)),
      };
    }
  }

  /**
   * Production-shaped preflight: fail closed unless versioning is confirmed ENABLED.
   * Does not claim versioning means WORM/immutability.
   */
  async function verifyBucketVersioning() {
    const semantics = assertVersioningSemantics();
    const result = await getBucketVersioning();
    if (result.status === "ENABLED") {
      return {
        ok: true,
        status: "ENABLED",
        versioningIsImmutability: semantics.versioningIsImmutability,
        objectLockWormRequired: semantics.objectLockWormRequired,
      };
    }
    return {
      ok: false,
      status: result.status,
      reason:
        result.reason ??
        `Spaces bucket versioning must be ENABLED for production Layer 2 (got ${result.status})`,
      versioningIsImmutability: semantics.versioningIsImmutability,
      objectLockWormRequired: semantics.objectLockWormRequired,
    };
  }

  /**
   * @param {{ prefix?: string, maxKeys?: number }} [input]
   */
  async function listObjectsV2(input = {}) {
    const query = {
      "list-type": "2",
      "max-keys": String(input.maxKeys ?? 1000),
    };
    if (typeof input.prefix === "string" && input.prefix.length > 0) {
      query.prefix = input.prefix;
    }
    const response = await signedRequest({ method: "GET", key: "", query });
    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw new Error(redactText(`S3 listObjectsV2 failed with status ${response.statusCode}`));
    }
    const xml = response.body.toString("utf8");
    const contents = [...xml.matchAll(/<Key>([^<]*)<\/Key>/g)].map((match) => ({
      key: decodeXml(match[1]),
    }));
    return { contents };
  }

  /**
   * @param {{ key: string, expectedSha256Hex: string }} input
   */
  async function verifyRemoteSha256(input) {
    const key = requireString(input?.key, "key");
    const expected = String(input?.expectedSha256Hex ?? "")
      .trim()
      .toLowerCase();
    if (!/^[0-9a-f]{64}$/.test(expected)) {
      return { ok: false, key, reason: "expectedSha256Hex must be 64 lowercase hex characters" };
    }
    const remote = await getObject({ key });
    const actual = createHash("sha256").update(remote.body).digest("hex");
    if (actual !== expected) {
      return { ok: false, key, reason: "remote SHA-256 mismatch", actualSha256Hex: actual };
    }
    return { ok: true, key, actualSha256Hex: actual };
  }

  /**
   * @param {{ method: string, key: string, body?: Buffer, headers?: Record<string, string>, query?: Record<string, string> }} input
   */
  function signedRequest(input) {
    const method = input.method;
    const key = input.key ?? "";
    const body = input.body ?? Buffer.alloc(0);
    const now = new Date();
    const amzDate = formatAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256Hex(body);
    const canonicalUri = key ? `/${bucket}/${encodeRfc3986Path(key)}` : `/${bucket}`;
    const query = input.query ?? {};
    const canonicalQuery = canonicalQueryString(query);
    /** @type {Record<string, string>} */
    const headers = {
      host: endpointUrl.host,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      ...(input.headers ?? {}),
    };
    const signedHeaderNames = Object.keys(headers)
      .map((name) => name.toLowerCase())
      .sort();
    const canonicalHeaders = signedHeaderNames.map((name) => `${name}:${headers[name].trim()}\n`).join("");
    const signedHeaders = signedHeaderNames.join(";");
    const canonicalRequest = [
      method,
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join("\n");
    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      "AWS4-HMAC-SHA256",
      amzDate,
      credentialScope,
      sha256Hex(canonicalRequest),
    ].join("\n");
    const signingKey = getSignatureKey(secretAccessKey, dateStamp, region, "s3");
    const signature = createHmac("sha256", signingKey).update(stringToSign, "utf8").digest("hex");
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const requestUrl = new URL(canonicalUri + (canonicalQuery ? `?${canonicalQuery}` : ""), endpointUrl);
    return httpsRequest(requestUrl, {
      method,
      headers: {
        ...headers,
        authorization,
      },
      body: method === "GET" || method === "HEAD" || method === "DELETE" ? undefined : body,
    });
  }
}

/**
 * @param {URL} url
 * @param {{ method: string, headers: Record<string, string>, body?: Buffer }} options
 * @returns {Promise<{ statusCode: number, headers: Record<string, string>, body: Buffer }>}
 */
function httpsRequest(url, options) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      {
        method: options.method,
        headers: options.headers,
      },
      (res) => {
        /** @type {Buffer[]} */
        const chunks = [];
        res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        res.on("end", () => {
          /** @type {Record<string, string>} */
          const headers = {};
          for (const [key, value] of Object.entries(res.headers)) {
            if (typeof value === "string") headers[key.toLowerCase()] = value;
            else if (Array.isArray(value)) headers[key.toLowerCase()] = value.join(",");
          }
          resolve({
            statusCode: res.statusCode ?? 0,
            headers,
            body: Buffer.concat(chunks),
          });
        });
      },
    );
    req.on("error", (error) => reject(new Error(redactText(String(error.message ?? error)))));
    if (options.body && options.body.length > 0) req.write(options.body);
    req.end();
  });
}

/**
 * @param {string} endpoint
 * @returns {URL}
 */
function normalizeEndpoint(endpoint) {
  const withScheme = /^https?:\/\//i.test(endpoint) ? endpoint : `https://${endpoint}`;
  return new URL(withScheme);
}

/**
 * @param {unknown} value
 * @param {string} name
 * @returns {string}
 */
function requireString(value, name) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required`);
  }
  return value.trim();
}

/**
 * @param {Buffer | string} value
 * @returns {string}
 */
function sha256Hex(value) {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * @param {string} key
 * @param {string} dateStamp
 * @param {string} region
 * @param {string} service
 * @returns {Buffer}
 */
function getSignatureKey(key, dateStamp, region, service) {
  const kDate = createHmac("sha256", `AWS4${key}`).update(dateStamp, "utf8").digest();
  const kRegion = createHmac("sha256", kDate).update(region, "utf8").digest();
  const kService = createHmac("sha256", kRegion).update(service, "utf8").digest();
  return createHmac("sha256", kService).update("aws4_request", "utf8").digest();
}

/**
 * @param {Date} date
 * @returns {string}
 */
function formatAmzDate(date) {
  return date.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

/**
 * @param {Record<string, string>} query
 * @returns {string}
 */
function canonicalQueryString(query) {
  return Object.keys(query)
    .sort()
    .map((key) => `${encodeRfc3986(key)}=${encodeRfc3986(query[key])}`)
    .join("&");
}

/**
 * @param {string} value
 * @returns {string}
 */
function encodeRfc3986(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

/**
 * @param {string} key
 * @returns {string}
 */
function encodeRfc3986Path(key) {
  return key
    .split("/")
    .map((segment) => encodeRfc3986(segment))
    .join("/");
}

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function stripQuotes(value) {
  if (typeof value !== "string") return undefined;
  return value.replace(/^"|"$/g, "");
}

/**
 * @param {string} value
 * @returns {string}
 */
function decodeXml(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}
