#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Reset a workforce user's password (IMP-010).
 *
 * Uses Better Auth 1.6.25 `requestPasswordReset` + `resetPassword` through
 * an ephemeral operator auth runtime whose `sendResetPassword` callback is
 * an in-process token bridge (no email). Never prints the password or
 * reset token. Forces passwordChangeRequired=true; sessions are revoked by
 * Better Auth (`revokeSessionsOnPasswordReset: true`).
 *
 * Usage:
 *   npm run workforce:user:reset-password -- --email=ops@example.test --password='temporary-password-15+'
 */
import process from "node:process";

import { ConfigurationError } from "../../src/platform/config/config-error";
import { AuthFoundationConfigurationError } from "../../src/server/auth/shared/errors";
import {
  findWorkforceUserByEmail,
  resetWorkforceOperatorPassword,
  WorkforceOperatorResetTokenBridge,
} from "../../src/server/auth/workforce/operator";
import { WorkforceAuthConfigurationError } from "../../src/server/workforce-auth/errors";
import {
  openWorkforceOperatorCredentialRuntime,
  parseWorkforceCliArgs,
  printSafeError,
  printSafeOk,
  requireArg,
  requireNormalizedEmail,
  requireValidPassword,
} from "./cli-support";

async function main(): Promise<void> {
  const args = parseWorkforceCliArgs(process.argv.slice(2));
  const email = requireNormalizedEmail(requireArg(args, "email"));
  const password = requireValidPassword(requireArg(args, "password"));

  // Resolve the target identity first so the token bridge can fail closed on
  // unexpected callback identities. Close the probe runtime before opening
  // the reset runtime with the bridge wired in.
  const probe = openWorkforceOperatorCredentialRuntime();
  let target: { id: string; email: string };
  try {
    const found = await probe.runtime.withContext((ctx) => findWorkforceUserByEmail(ctx, email));
    if (!found) {
      throw new Error("Workforce user not found.");
    }
    target = { id: found.id, email: found.email };
  } finally {
    await probe.runtime.close();
  }

  const bridge = new WorkforceOperatorResetTokenBridge({
    userId: target.id,
    email: target.email,
  });

  const { runtime } = openWorkforceOperatorCredentialRuntime({
    sendResetPassword: bridge.sendResetPassword,
  });

  try {
    const result = await resetWorkforceOperatorPassword(
      runtime,
      { email: target.email, temporaryPassword: password },
      bridge,
    );

    printSafeOk({
      operation: "workforce_user_reset_password",
      userId: result.userId,
      passwordChangeRequired: true,
      sessionsRevoked: true,
    });
  } finally {
    bridge.clear();
    await runtime.close();
  }
}

main().catch((error: unknown) => {
  if (
    error instanceof ConfigurationError ||
    error instanceof AuthFoundationConfigurationError ||
    error instanceof WorkforceAuthConfigurationError
  ) {
    printSafeError(error.message);
  } else if (error instanceof Error) {
    printSafeError(error.message);
  } else {
    printSafeError("workforce:user:reset-password failed.");
  }
  process.exitCode = 1;
});
