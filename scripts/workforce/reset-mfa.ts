#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Reset a workforce user's MFA enrollment (IMP-010).
 *
 * Clears the `twoFactor` row(s), sets twoFactorEnabled=false, and revokes
 * all sessions so the user must re-enroll after signing in again.
 *
 * Usage:
 *   npm run workforce:user:reset-mfa -- --email=ops@example.test
 */
import process from "node:process";

import { ConfigurationError } from "../../src/platform/config/config-error";
import { AuthFoundationConfigurationError } from "../../src/server/auth/shared/errors";
import { WorkforceAuthConfigurationError } from "../../src/server/workforce-auth/errors";
import {
  getWorkforceAuthContext,
  openWorkforceOperatorRuntime,
  parseWorkforceCliArgs,
  printSafeError,
  printSafeOk,
  requireArg,
  requireNormalizedEmail,
} from "./cli-support";

async function main(): Promise<void> {
  const args = parseWorkforceCliArgs(process.argv.slice(2));
  const email = requireNormalizedEmail(requireArg(args, "email"));

  const { runtime } = await openWorkforceOperatorRuntime();
  try {
    const ctx = await getWorkforceAuthContext(runtime);
    const found = await ctx.internalAdapter.findUserByEmail(email);
    if (!found) {
      throw new Error("Workforce user not found.");
    }

    await ctx.adapter.deleteMany({
      model: "twoFactor",
      where: [{ field: "userId", value: found.user.id }],
    });
    await ctx.internalAdapter.updateUser(found.user.id, {
      twoFactorEnabled: false,
    });
    await ctx.internalAdapter.deleteUserSessions(found.user.id);

    printSafeOk({
      operation: "workforce_user_reset_mfa",
      userId: found.user.id,
      twoFactorEnabled: false,
      sessionsRevoked: true,
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
    printSafeError(error.message);
  } else if (error instanceof Error) {
    printSafeError(error.message);
  } else {
    printSafeError("workforce:user:reset-mfa failed.");
  }
  process.exitCode = 1;
});
