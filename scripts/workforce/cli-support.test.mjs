import assert from "node:assert/strict";
import { test } from "node:test";

import {
  WORKFORCE_OPERATOR_SAFE_ERROR_CODES,
  classifyWorkforceOperatorSafeError,
} from "./safe-operator-error.mjs";

test("invalid password length classifies as INVALID_PASSWORD_INPUT", () => {
  assert.equal(
    classifyWorkforceOperatorSafeError("Invalid --password value (must be 15–128 characters)."),
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.INVALID_PASSWORD_INPUT,
  );
  assert.equal(
    classifyWorkforceOperatorSafeError("Invalid password input."),
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.INVALID_PASSWORD_INPUT,
  );
  assert.equal(
    classifyWorkforceOperatorSafeError("INVALID_PASSWORD_INPUT"),
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.INVALID_PASSWORD_INPUT,
  );
});

test("existing-user response is safe and deterministic", () => {
  assert.equal(
    classifyWorkforceOperatorSafeError("A workforce user with that email already exists."),
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.USER_ALREADY_EXISTS,
  );
});

test("DB/query/auth failures remain redacted", () => {
  assert.equal(
    classifyWorkforceOperatorSafeError('Failed query: select * from app.workforce_auth_users where email = $1'),
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.PERSISTENCE_OR_AUTH_OPERATION_FAILED,
  );
  assert.equal(
    classifyWorkforceOperatorSafeError("postgresql://boba_bear_app:secret@postgres:5432/boba_bear_local"),
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.PERSISTENCE_OR_AUTH_OPERATION_FAILED,
  );
  assert.equal(
    classifyWorkforceOperatorSafeError("token secret leaked"),
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.PERSISTENCE_OR_AUTH_OPERATION_FAILED,
  );
});

test("configuration and persistence codes pass through unchanged", () => {
  assert.equal(
    classifyWorkforceOperatorSafeError("CONFIGURATION_ERROR"),
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.CONFIGURATION_ERROR,
  );
  assert.equal(
    classifyWorkforceOperatorSafeError("PERSISTENCE_OR_AUTH_OPERATION_FAILED"),
    WORKFORCE_OPERATOR_SAFE_ERROR_CODES.PERSISTENCE_OR_AUTH_OPERATION_FAILED,
  );
});

test("classification never echoes supplied password content", () => {
  const supplied = "my-super-secret-password-value";
  const classified = classifyWorkforceOperatorSafeError(`Invalid password: ${supplied}`);
  assert.equal(classified, WORKFORCE_OPERATOR_SAFE_ERROR_CODES.PERSISTENCE_OR_AUTH_OPERATION_FAILED);
  assert.equal(classified.includes(supplied), false);
});
