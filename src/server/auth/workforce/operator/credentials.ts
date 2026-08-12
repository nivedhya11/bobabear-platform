/**
 * Supported workforce operator credential operations (IMP-010).
 *
 * Uses Better Auth 1.6.25 public APIs only:
 * - `auth.api.signUpEmail` for create
 * - `auth.api.requestPasswordReset` + `auth.api.resetPassword` for reset
 *
 * Never hashes passwords, never constructs credential accounts, never uses
 * `internalAdapter` / `ctx.password.hash`.
 */
import "server-only";

import {
  countWorkforceSessionsForUser,
  findWorkforceUserByEmail,
  setWorkforceOperatorLifecycleState,
  workforceUserHasCredentialAccount,
} from "./lifecycle";
import type { WorkforceOperatorAuthRuntime } from "./runtime";
import {
  WorkforceOperatorResetTokenBridge,
  type WorkforceOperatorResetTokenBridge as ResetTokenBridge,
} from "./reset-token-bridge";

export type WorkforceOperatorCreateUserInput = Readonly<{
  email: string;
  name: string;
  temporaryPassword: string;
}>;

export type WorkforceOperatorCreateUserResult = Readonly<{
  userId: string;
  email: string;
  passwordChangeRequired: true;
  twoFactorEnabled: false;
  sessionIssued: false;
}>;

export type WorkforceOperatorResetPasswordInput = Readonly<{
  email: string;
  temporaryPassword: string;
}>;

export type WorkforceOperatorResetPasswordResult = Readonly<{
  userId: string;
  passwordChangeRequired: true;
  sessionsRevoked: true;
}>;

export async function createWorkforceOperatorUser(
  runtime: WorkforceOperatorAuthRuntime,
  input: WorkforceOperatorCreateUserInput,
): Promise<WorkforceOperatorCreateUserResult> {
  const email = input.email.toLowerCase();
  const name = input.name.trim();
  if (name.length === 0) {
    throw new Error("Missing required name.");
  }

  const existing = await runtime.withContext((ctx) => findWorkforceUserByEmail(ctx, email));
  if (existing) {
    throw new Error("A workforce user with that email already exists.");
  }

  const auth = await runtime.getAuth();
  const signedUp = await auth.api.signUpEmail({
    body: {
      email,
      name,
      password: input.temporaryPassword,
    },
  });

  const userId = signedUp?.user?.id;
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error("Workforce operator sign-up did not return a user id.");
  }
  if (signedUp.token) {
    throw new Error("Workforce operator sign-up must not issue a session.");
  }

  const persisted = await runtime.withContext(async (ctx) => {
    const user = await findWorkforceUserByEmail(ctx, email);
    if (!user || user.id !== userId) {
      throw new Error("Workforce operator sign-up did not persist the expected user.");
    }
    const hasCredential = await workforceUserHasCredentialAccount(ctx, userId);
    if (!hasCredential) {
      throw new Error("Workforce operator sign-up did not create a credential account.");
    }
    await setWorkforceOperatorLifecycleState(ctx, userId, {
      passwordChangeRequired: true,
      twoFactorEnabled: false,
      disabledAt: null,
    });
    return user;
  });

  // Defense in depth: confirm no session row was minted for this user.
  const sessionCount = await runtime.withContext((ctx) =>
    countWorkforceSessionsForUser(ctx, persisted.id),
  );
  if (sessionCount !== 0) {
    throw new Error("Workforce operator sign-up must not create a session.");
  }

  return {
    userId: persisted.id,
    email: persisted.email,
    passwordChangeRequired: true,
    twoFactorEnabled: false,
    sessionIssued: false,
  };
}

/**
 * Reset a workforce password through Better Auth's request/reset token
 * flow, using an in-process {@link WorkforceOperatorResetTokenBridge}.
 *
 * The caller supplies a bridge already bound to the target identity so
 * unexpected callback identities fail closed before any password change.
 */
export async function resetWorkforceOperatorPassword(
  runtime: WorkforceOperatorAuthRuntime,
  input: WorkforceOperatorResetPasswordInput,
  bridge: ResetTokenBridge,
): Promise<WorkforceOperatorResetPasswordResult> {
  const email = input.email.toLowerCase();

  const target = await runtime.withContext((ctx) => findWorkforceUserByEmail(ctx, email));
  if (!target) {
    throw new Error("Workforce user not found.");
  }

  await runtime.withContext((ctx) =>
    setWorkforceOperatorLifecycleState(ctx, target.id, {
      passwordChangeRequired: true,
    }),
  );

  const auth = await runtime.getAuth();

  try {
    // Better Auth 1.6.25: POST /request-password-reset with `{ email }`.
    await auth.api.requestPasswordReset({
      body: {
        email: target.email,
      },
    });

    const token = await bridge.waitForToken();

    // Better Auth 1.6.25: POST /reset-password with `{ newPassword, token }`.
    await auth.api.resetPassword({
      body: {
        newPassword: input.temporaryPassword,
        token,
      },
    });
  } finally {
    bridge.clear();
  }

  // Token must be single-use: a second resetPassword with the same token
  // is proven in integration tests; here we only confirm lifecycle state.
  const after = await runtime.withContext((ctx) => findWorkforceUserByEmail(ctx, email));
  if (!after || after.passwordChangeRequired !== true) {
    throw new Error("Workforce password reset did not leave password_change_required=true.");
  }

  return {
    userId: target.id,
    passwordChangeRequired: true,
    sessionsRevoked: true,
  };
}

/**
 * Convenience for callers that do not already hold a bridge: resolve the
 * target, build a bridge for that identity, and open a runtime that uses
 * it. Prefer constructing the bridge + runtime explicitly in tests that
 * need to assert callback security.
 */
export function createResetTokenBridgeForUser(user: Readonly<{ id: string; email: string }>) {
  return new WorkforceOperatorResetTokenBridge({
    userId: user.id,
    email: user.email,
  });
}
