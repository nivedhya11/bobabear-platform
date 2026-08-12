#!/usr/bin/env -S node --conditions=react-server --import tsx
/**
 * Re-enable a previously disabled workforce user (IMP-010).
 *
 * Usage:
 *   npm run workforce:user:enable -- --email=ops@example.test
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

    await ctx.internalAdapter.updateUser(found.user.id, {
      disabledAt: null,
    });

    printSafeOk({
      operation: "workforce_user_enable",
      userId: found.user.id,
      disabled: false,
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
    printSafeError("workforce:user:enable failed.");
  }
  process.exitCode = 1;
});
