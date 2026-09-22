/**
 * PostgreSQL integration tests for workforce step-up proofs (IMP-038).
 *
 * Grant / consume / expire / replay / class mismatch / missing deny.
 */
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import {
  getApplicationPersistence,
  type Persistence,
} from "../../src/server/persistence";
import {
  consumeStepUpProof,
  enforcePrivacyDestructiveStepUp,
  grantStepUpProof,
  hashStepUpSessionToken,
  requireStepUpProof,
  StepUpError,
  STEP_UP_ERROR_CODES,
} from "../../src/server/security/step-up";
import { workforceAuthUsers } from "../../src/platform/database/schema/workforce-auth";
import { applyMigrations, withIsolatedTestDatabase } from "./support/test-database";

const HASH_SECRET = "workforce-step-up-integration-test-secret-32chars";
const SESSION_TOKEN = "step-up-integration-session-token-value";

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

function applicationConfig(databaseUrl: string): WebConfig {
  return {
    environment: "test",
    processKind: "web",
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };
}

describe("workforce step-up proofs (IMP-038)", () => {
  const open: Persistence[] = [];

  afterEach(async () => {
    await Promise.all(open.splice(0).map((p) => p.close()));
  });

  async function withStepUpDb(
    fn: (ctx: Readonly<{ persistence: Persistence; userId: string; hash: string }>) => Promise<void>,
  ): Promise<void> {
    await withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
      await applyMigrations(database.connectionString);
      const persistence = getApplicationPersistence(
        applicationConfig(database.connectionString),
      );
      open.push(persistence);
      const userId = await persistence.transaction(async (tx) => {
        const rows = await tx.db
          .insert(workforceAuthUsers)
          .values({
            id: "step-up-user-1",
            name: "Step Up User",
            email: "step-up@example.test",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            passwordChangeRequired: false,
            twoFactorEnabled: true,
          })
          .returning({ id: workforceAuthUsers.id });
        return rows[0]!.id;
      });
      const hash = hashStepUpSessionToken(HASH_SECRET, SESSION_TOKEN);
      await fn({ persistence, userId, hash });
    });
  }

  it("grants and consumes a proof once", async () => {
    await withStepUpDb(async ({ persistence, userId, hash }) => {
      const now = new Date("2026-09-22T12:00:00.000Z");
      const granted = await persistence.transaction((tx) =>
        grantStepUpProof(tx, {
          sessionTokenHash: hash,
          workforceUserId: userId,
          actionClass: "CLASS_ACCESS_MUTATION",
          grantMethod: "totp",
          now,
        }),
      );
      expect(granted.proofId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
      expect(granted.expiresAt.getTime()).toBe(now.getTime() + 600_000);

      await persistence.transaction((tx) =>
        consumeStepUpProof(tx, {
          proofId: granted.proofId,
          sessionTokenHash: hash,
          actionClass: "CLASS_ACCESS_MUTATION",
          now: new Date(now.getTime() + 1_000),
          workforceUserId: userId,
        }),
      );
    });
  });

  it("rejects replay of a consumed proof", async () => {
    await withStepUpDb(async ({ persistence, userId, hash }) => {
      const now = new Date("2026-09-22T12:00:00.000Z");
      const granted = await persistence.transaction((tx) =>
        grantStepUpProof(tx, {
          sessionTokenHash: hash,
          workforceUserId: userId,
          actionClass: "CLASS_FINANCIAL_REVERSAL",
          grantMethod: "password_and_totp",
          now,
        }),
      );
      await persistence.transaction((tx) =>
        consumeStepUpProof(tx, {
          proofId: granted.proofId,
          sessionTokenHash: hash,
          actionClass: "CLASS_FINANCIAL_REVERSAL",
          now: new Date(now.getTime() + 1_000),
        }),
      );
      await expect(
        persistence.transaction((tx) =>
          consumeStepUpProof(tx, {
            proofId: granted.proofId,
            sessionTokenHash: hash,
            actionClass: "CLASS_FINANCIAL_REVERSAL",
            now: new Date(now.getTime() + 2_000),
          }),
        ),
      ).rejects.toMatchObject({ code: STEP_UP_ERROR_CODES.STEP_UP_REPLAY });
    });
  });

  it("rejects expired proofs", async () => {
    await withStepUpDb(async ({ persistence, userId, hash }) => {
      const now = new Date("2026-09-22T12:00:00.000Z");
      const granted = await persistence.transaction((tx) =>
        grantStepUpProof(tx, {
          sessionTokenHash: hash,
          workforceUserId: userId,
          actionClass: "CLASS_CREDENTIAL_SECURITY",
          grantMethod: "password",
          now,
          ttlSeconds: 300,
        }),
      );
      await expect(
        persistence.transaction((tx) =>
          consumeStepUpProof(tx, {
            proofId: granted.proofId,
            sessionTokenHash: hash,
            actionClass: "CLASS_CREDENTIAL_SECURITY",
            now: new Date(now.getTime() + 301_000),
          }),
        ),
      ).rejects.toMatchObject({ code: STEP_UP_ERROR_CODES.STEP_UP_EXPIRED });
    });
  });

  it("rejects class mismatch", async () => {
    await withStepUpDb(async ({ persistence, userId, hash }) => {
      const now = new Date("2026-09-22T12:00:00.000Z");
      const granted = await persistence.transaction((tx) =>
        grantStepUpProof(tx, {
          sessionTokenHash: hash,
          workforceUserId: userId,
          actionClass: "CLASS_ACCESS_MUTATION",
          grantMethod: "totp",
          now,
        }),
      );
      await expect(
        persistence.transaction((tx) =>
          consumeStepUpProof(tx, {
            proofId: granted.proofId,
            sessionTokenHash: hash,
            actionClass: "CLASS_FINANCIAL_REVERSAL",
            now: new Date(now.getTime() + 1_000),
          }),
        ),
      ).rejects.toMatchObject({ code: STEP_UP_ERROR_CODES.STEP_UP_CLASS_MISMATCH });
    });
  });

  it("requireStepUpProof denies missing proof fail-closed", async () => {
    await withStepUpDb(async ({ persistence, userId, hash }) => {
      await expect(
        persistence.transaction((tx) =>
          requireStepUpProof(tx, {
            proofId: "",
            sessionTokenHash: hash,
            actionClass: "CLASS_ACCESS_MUTATION",
            now: new Date(),
            workforceUserId: userId,
          }),
        ),
      ).rejects.toBeInstanceOf(StepUpError);
    });
  });

  it("enforcePrivacyDestructiveStepUp is available without a product surface", async () => {
    await withStepUpDb(async ({ persistence, userId, hash }) => {
      const now = new Date("2026-09-22T12:00:00.000Z");
      const granted = await persistence.transaction((tx) =>
        grantStepUpProof(tx, {
          sessionTokenHash: hash,
          workforceUserId: userId,
          actionClass: "CLASS_PRIVACY_DESTRUCTIVE",
          grantMethod: "totp",
          now,
        }),
      );
      await persistence.transaction((tx) =>
        enforcePrivacyDestructiveStepUp(tx, {
          proofId: granted.proofId,
          sessionTokenHash: hash,
          now: new Date(now.getTime() + 1_000),
          workforceUserId: userId,
        }),
      );
    });
  });
});
