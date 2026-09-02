#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Create a workforce user with a temporary password (IMP-010).
 *
 * Uses Better Auth 1.6.25 `auth.api.signUpEmail` via the ephemeral operator
 * auth runtime (disableSignUp: false, autoSignIn: false). Never hashes the
 * password locally, never constructs a credential account, never prints the
 * password or any secret.
 *
 * Usage:
 *   npm run workforce:user:create -- --email=ops@example.test --name="Ops User" --password='temporary-password-15+'
 */
import process from "node:process";

import { ConfigurationError } from "../../src/platform/config/config-error";
import { AuthFoundationConfigurationError } from "../../src/server/auth/shared/errors";
import { createWorkforceOperatorUser } from "../../src/server/auth/workforce/operator";
import { WorkforceAuthConfigurationError } from "../../src/server/workforce-auth/errors";
import {
  WORKFORCE_OPERATOR_SAFE_ERROR_CODES,
  openWorkforceOperatorCredentialRuntime,
  parseWorkforceCliArgs,
  printSafeError,
  printSafeOk,
  requireArg,
  requireNormalizedEmail,
  requirePasswordFromStdin,
  requireValidPassword,
} from "./cli-support";

async function main(): Promise<void> {
  const args = parseWorkforceCliArgs(process.argv.slice(2));
  const email = requireNormalizedEmail(requireArg(args, "email"));
  const name = requireArg(args, "name").trim();
  if (name.length === 0) {
    throw new Error("Missing required --name argument.");
  }
  const hasPassword = args.password !== undefined;
  const readsPasswordFromStdin = args["password-stdin"] === "true";
  if (hasPassword === readsPasswordFromStdin) {
    throw new Error("Provide exactly one of --password or --password-stdin.");
  }
  const password = readsPasswordFromStdin
    ? requirePasswordFromStdin()
    : requireValidPassword(requireArg(args, "password"));

  const { runtime } = openWorkforceOperatorCredentialRuntime();
  try {
    const result = await createWorkforceOperatorUser(runtime, {
      email,
      name,
      temporaryPassword: password,
    });

    printSafeOk({
      operation: "workforce_user_create",
      userId: result.userId,
      passwordChangeRequired: true,
      twoFactorEnabled: false,
    });
  } finally {
    await runtime.close();
  }
}

main().catch((error: unknown) => {
  if (
    error instanceof ConfigurationError ||
    error instanceof AuthFoundationConfigurationError ||
    error instanceof WorkforceAuthConfigurationError
  ) {
    printSafeError(WORKFORCE_OPERATOR_SAFE_ERROR_CODES.CONFIGURATION_ERROR);
  } else if (error instanceof Error) {
    if (error.message === "A workforce user with that email already exists.") {
      printSafeError(WORKFORCE_OPERATOR_SAFE_ERROR_CODES.USER_ALREADY_EXISTS);
    } else if (error.message === WORKFORCE_OPERATOR_SAFE_ERROR_CODES.INVALID_PASSWORD_INPUT) {
      printSafeError(WORKFORCE_OPERATOR_SAFE_ERROR_CODES.INVALID_PASSWORD_INPUT);
    } else {
      // Auth/DB/driver failures may embed SQL, params, or connection details.
      printSafeError(WORKFORCE_OPERATOR_SAFE_ERROR_CODES.PERSISTENCE_OR_AUTH_OPERATION_FAILED);
    }
  } else {
    printSafeError(WORKFORCE_OPERATOR_SAFE_ERROR_CODES.PERSISTENCE_OR_AUTH_OPERATION_FAILED);
  }
  process.exitCode = 1;
});
