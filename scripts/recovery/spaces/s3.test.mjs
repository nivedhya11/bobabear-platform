/**
 * S3 Spaces adapter unit tests using a local mock HTTPS server.
 * REAL_SPACES_INTEGRATION remains NOT_PERFORMED without live credentials.
 */
import assert from "node:assert/strict";
import { createServer } from "node:https";
import { createHash } from "node:crypto";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { createS3SpacesClient, assertVersioningSemantics } from "./s3.mjs";
import { resolveLogicalSpacesConfig } from "./logical.mjs";
import {
  SPACES_OBJECT_LOCK_WORM_REQUIRED,
  SPACES_VERSIONING_IS_IMMUTABILITY,
} from "../constants.mjs";

function selfSignedCert() {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  // Minimal PEM wrappers — Node https accepts these for unit tests.
  // Use a tiny static self-signed cert via openssl when available; otherwise skip live TLS.
  return { key: privateKey.export({ type: "pkcs1", format: "pem" }), cert: null, publicKey };
}

test("assertVersioningSemantics keeps versioning≠WORM locks", () => {
  const semantics = assertVersioningSemantics();
  assert.equal(semantics.versioning, "ENABLED");
  assert.equal(semantics.versioningIsImmutability, false);
  assert.equal(semantics.objectLockWormRequired, false);
  assert.equal(SPACES_VERSIONING_IS_IMMUTABILITY, false);
  assert.equal(SPACES_OBJECT_LOCK_WORM_REQUIRED, false);
});

test("resolveLogicalSpacesConfig fails closed on missing logical bucket/creds and rejects empty endpoint", () => {
  const missing = resolveLogicalSpacesConfig({}, {});
  assert.equal(missing.ok, false);

  const noCreds = resolveLogicalSpacesConfig(
    {
      BOBA_RECOVERY_LOGICAL_SPACES_BUCKET: "boba-logical",
      BOBA_RECOVERY_LOGICAL_SPACES_ENDPOINT: "https://nyc3.digitaloceanspaces.com",
    },
    {},
  );
  assert.equal(noCreds.ok, false);
  assert.match(noCreds.reason, /credentials|BOBA_LOGICAL_SPACES/i);

  const ok = resolveLogicalSpacesConfig(
    {
      BOBA_RECOVERY_LOGICAL_SPACES_BUCKET: "boba-logical",
      BOBA_RECOVERY_LOGICAL_SPACES_ENDPOINT: "https://nyc3.digitaloceanspaces.com",
      BOBA_RECOVERY_LOGICAL_SPACES_REGION: "nyc3",
      BOBA_LOGICAL_SPACES_ACCESS_KEY_ID: "AKIA_TEST",
      BOBA_LOGICAL_SPACES_SECRET_ACCESS_KEY: "secret_test",
    },
    {},
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.config.bucket, "boba-logical");
  assert.equal(ok.config.credentialEnvPrefix, "BOBA_LOGICAL_SPACES");
});

test("createS3SpacesClient exposes deleteObject and versioning verification helpers", () => {
  const client = createS3SpacesClient({
    accessKeyId: "AKIA_TEST",
    secretAccessKey: "secret_test",
    region: "nyc3",
    endpoint: "https://nyc3.digitaloceanspaces.com",
    bucket: "boba-logical",
  });
  assert.equal(typeof client.deleteObject, "function");
  assert.equal(typeof client.getBucketVersioning, "function");
  assert.equal(typeof client.verifyBucketVersioning, "function");
  assert.equal(client.assertVersioningSemantics().versioningIsImmutability, false);
});

test("S3 adapter deleteObject and getBucketVersioning against mock HTTP server", async (t) => {
  // Prefer undici MockAgent / plain http where possible. Spaces client uses https only.
  // When we cannot mint a trusted cert in-unit, exercise signedRequest plumbing via
  // injected behavior by calling the public methods with a rewritten endpoint that
  // we control using NODE_TLS_REJECT_UNAUTHORIZED=0 against a self-signed server.
  const { key } = selfSignedCert();
  // Generate a self-signed X.509 via openssl if available.
  const { spawnSync } = await import("node:child_process");
  const { mkdtempSync, readFileSync, rmSync, writeFileSync } = await import("node:fs");
  const os = await import("node:os");
  const path = await import("node:path");
  const tmp = mkdtempSync(path.join(os.tmpdir(), "boba-s3-mock-"));
  try {
    const keyPath = path.join(tmp, "key.pem");
    const certPath = path.join(tmp, "cert.pem");
    writeFileSync(keyPath, key);
    const openssl = spawnSync(
      "openssl",
      [
        "req",
        "-x509",
        "-new",
        "-nodes",
        "-key",
        keyPath,
        "-sha256",
        "-days",
        "1",
        "-out",
        certPath,
        "-subj",
        "/CN=localhost",
      ],
      { encoding: "utf8" },
    );
    if (openssl.status !== 0) {
      t.skip("openssl unavailable for mock TLS cert");
      return;
    }
    const cert = readFileSync(certPath, "utf8");
    /** @type {import("node:http").IncomingMessage[]} */
    const requests = [];
    /** @type {Map<string, Buffer>} */
    const objects = new Map();

    const server = createServer({ key, cert }, (req, res) => {
      requests.push(req);
      const url = new URL(req.url ?? "/", "https://localhost");
      if (req.method === "GET" && url.searchParams.has("versioning")) {
        res.writeHead(200, { "content-type": "application/xml" });
        res.end("<VersioningConfiguration><Status>Enabled</Status></VersioningConfiguration>");
        return;
      }
      const keyMatch = /^\/boba-logical\/(.+)$/.exec(url.pathname);
      const objectKey = keyMatch ? decodeURIComponent(keyMatch[1]) : "";
      if (req.method === "PUT" && objectKey) {
        /** @type {Buffer[]} */
        const chunks = [];
        req.on("data", (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
        req.on("end", () => {
          objects.set(objectKey, Buffer.concat(chunks));
          res.writeHead(200, { etag: `"mock"` });
          res.end();
        });
        return;
      }
      if (req.method === "GET" && objectKey) {
        const body = objects.get(objectKey);
        if (!body) {
          res.writeHead(404);
          res.end();
          return;
        }
        res.writeHead(200);
        res.end(body);
        return;
      }
      if (req.method === "DELETE" && objectKey) {
        objects.delete(objectKey);
        res.writeHead(204);
        res.end();
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const endpoint = `https://127.0.0.1:${address.port}`;
    const prevReject = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    try {
      const client = createS3SpacesClient({
        accessKeyId: "AKIA_TEST",
        secretAccessKey: "secret_test",
        region: "us-east-1",
        endpoint,
        bucket: "boba-logical",
      });

      const body = Buffer.from("encrypted-artifact");
      await client.putObject({ key: "logical/run1/dump.age", body });
      const got = await client.getObject({ key: "logical/run1/dump.age" });
      assert.equal(got.body.equals(body), true);
      const sha = createHash("sha256").update(body).digest("hex");
      assert.equal((await client.verifyRemoteSha256({ key: "logical/run1/dump.age", expectedSha256Hex: sha })).ok, true);

      const versioning = await client.getBucketVersioning();
      assert.equal(versioning.status, "ENABLED");
      const verified = await client.verifyBucketVersioning();
      assert.equal(verified.ok, true);
      assert.equal(verified.versioningIsImmutability, false);

      await client.deleteObject({ key: "logical/run1/dump.age" });
      await assert.rejects(() => client.getObject({ key: "logical/run1/dump.age" }));
      assert.ok(requests.some((req) => req.method === "DELETE"));
    } finally {
      if (prevReject === undefined) delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      else process.env.NODE_TLS_REJECT_UNAUTHORIZED = prevReject;
      await new Promise((resolve) => server.close(resolve));
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
});
