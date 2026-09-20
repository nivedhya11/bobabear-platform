/**
 * Secret-safe serialization for IMP-037 recovery tooling.
 * Never logs raw environment objects. Never emits credentials, tokens, or key material.
 */

const REDACTED = "[REDACTED]";

const SENSITIVE_KEY_PATTERN =
  /(password|passwd|secret|token|credential|passphrase|access[_-]?key|secret[_-]?key|api[_-]?key|private[_-]?key|private[_-]?identity|age[_-]?key|cipher|uri|url|database_url|connectionstring|connstr)/i;

const AGE_SECRET_KEY_PATTERN = /AGE-SECRET-KEY-[0-9A-Z]+/g;
const URI_USERINFO_PATTERN = /([a-z][a-z0-9+.-]*:\/\/)([^/@\s:]+):([^@\s]+)@/gi;
const CONNECTION_URI_PATTERN =
  /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp|cockroach(?:db)?):\/\/[^\s"'\\]+/gi;
const SIGNED_QUERY_PATTERN =
  /([?&](?:X-Amz-(?:Algorithm|Credential|Date|Expires|SignedHeaders|Signature|Security-Token)|AWSAccessKeyId|Signature|Expires|token|access_token|auth(?:entication)?_token)=)([^&\s"']+)/gi;
const BEARER_PATTERN = /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi;
const GENERIC_TOKEN_ASSIGN_PATTERN =
  /\b((?:password|passwd|secret|token|passphrase|access[_-]?key|secret[_-]?key|PGBACKREST_CIPHER_PASS|AWS_SECRET_ACCESS_KEY|SPACES_SECRET(?:_KEY)?|AGE_SECRET_KEY)["'\s:=]+)([^\s"',;]+)/gi;

/**
 * @param {unknown} value
 * @returns {string}
 */
export function redactText(value) {
  if (value == null) return "";
  let text = typeof value === "string" ? value : stringifyUnsafe(value);
  text = text.replace(AGE_SECRET_KEY_PATTERN, REDACTED);
  text = text.replace(URI_USERINFO_PATTERN, `$1$2:${REDACTED}@`);
  text = text.replace(CONNECTION_URI_PATTERN, REDACTED);
  text = text.replace(SIGNED_QUERY_PATTERN, `$1${REDACTED}`);
  text = text.replace(BEARER_PATTERN, `Bearer ${REDACTED}`);
  text = text.replace(GENERIC_TOKEN_ASSIGN_PATTERN, `$1${REDACTED}`);
  return text;
}

/**
 * Recursively redact objects. Sensitive keys are replaced entirely.
 * @param {unknown} value
 * @param {string} [keyHint]
 * @returns {unknown}
 */
export function redactValue(value, keyHint = "") {
  if (typeof value === "string") {
    if (keyHint && SENSITIVE_KEY_PATTERN.test(keyHint)) return REDACTED;
    return redactText(value);
  }
  if (typeof value === "number" || typeof value === "boolean" || value == null) {
    if (keyHint && SENSITIVE_KEY_PATTERN.test(keyHint) && value != null) return REDACTED;
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, keyHint));
  }
  if (typeof value === "object") {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : redactValue(nested, key);
    }
    return out;
  }
  return redactText(String(value));
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function safeJson(value) {
  return `${JSON.stringify(redactValue(value), null, 2)}\n`;
}

/**
 * @param {unknown} value
 * @returns {string}
 */
export function safePrint(value) {
  if (typeof value === "string") return redactText(value);
  return redactText(JSON.stringify(redactValue(value)));
}

/**
 * True when a raw secret still appears in output.
 * @param {string} output
 * @param {string} secret
 * @returns {boolean}
 */
export function containsSecret(output, secret) {
  if (!secret || secret.length === 0) return false;
  return output.includes(secret);
}

function stringifyUnsafe(value) {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}
