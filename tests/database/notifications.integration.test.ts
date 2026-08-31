/**
 * PostgreSQL integration tests for the Notification Foundation (IMP-033).
 *
 * Real Testcontainers PostgreSQL only — every test gets its own isolated,
 * freshly-migrated database. The load-bearing properties here are negative:
 * at-least-once outbox redelivery must converge on one customer message, a
 * withdrawn consent or a superseded update must not be sent, and the
 * non-sending adapters must never leave behind a provider or recipient fact.
 */
import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { afterEach, describe, expect, inject, it } from "vitest";

import type { WebConfig } from "../../src/platform/config";
import {
  createNotificationRequestFromDomainEvent,
  listNotificationAttempts,
  manualResendNotification,
  NotificationOutboxProcessor,
  processPendingNotification,
  setCommunicationPreference,
  setConsentStatus,
  type NotificationOutboxPayload,
} from "../../src/server/notifications";
import { getApplicationPersistence } from "../../src/server/persistence";
import { enqueueOutboxEvent } from "../../src/server/persistence/outbox";
import type { Persistence } from "../../src/server/persistence/types";
import { applyMigrations, withIsolatedTestDatabase } from "./support/test-database";
import {
  closeTrackedPersistenceHandles,
  withCompletedPositiveOrderHarness,
} from "./support/order-fixtures";

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

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
  await closeTrackedPersistenceHandles();
});

async function withMigratedPersistence<T>(
  fn: (persistence: Persistence) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(
      applicationConfig(database.connectionString),
    );
    openHandles.push(persistence);
    return fn(persistence);
  });
}

const CUSTOMER_ID = "notif-customer-0000-4000-8000-000000000001";

function intent(
  overrides: Partial<NotificationOutboxPayload> = {},
): NotificationOutboxPayload {
  const occurredAt = new Date();
  return {
    customerId: CUSTOMER_ID,
    orderId: null,
    paymentId: null,
    deliveryId: null,
    domainEventRef: `order:${randomUUID()}:received`,
    semanticType: "ORDER_RECEIVED",
    occurredAt: occurredAt.toISOString(),
    ...overrides,
  };
}

async function enqueueIntent(
  persistence: Persistence,
  payload: NotificationOutboxPayload,
): Promise<void> {
  const occurredAt = new Date(payload.occurredAt);
  await persistence.transaction((tx) =>
    enqueueOutboxEvent(tx, {
      id: randomUUID(),
      eventType: "notification.domain.order_received",
      eventVersion: 1,
      aggregateType: "notification",
      aggregateId: payload.orderId,
      payload: { ...payload },
      occurredAt,
      availableAt: occurredAt,
      createdAt: occurredAt,
    }),
  );
}

/** Drizzle wraps a driver error, so the constraint name lives on the cause. */
function postgresErrorMessage(error: unknown): string {
  let current: unknown = error;
  const parts: string[] = [];
  for (let depth = 0; depth < 5 && current; depth += 1) {
    if (current instanceof Error) {
      parts.push(current.message);
      current = (current as { cause?: unknown }).cause;
      continue;
    }
    parts.push(String(current));
    break;
  }
  return parts.join("\n");
}

async function expectPostgresFailure(
  run: () => Promise<unknown>,
  pattern: RegExp,
): Promise<void> {
  let caught: unknown;
  try {
    await run();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeTruthy();
  expect(postgresErrorMessage(caught)).toMatch(pattern);
}

async function countRows(persistence: Persistence, table: string): Promise<number> {
  return persistence.withContext(async (ctx) => {
    const result = await ctx.db.execute<{ count: string }>(
      sql`select count(*)::text as count from ${sql.raw(table)}`,
    );
    return Number(result.rows[0]?.count ?? "0");
  });
}

describe("notification migration", () => {
  it("creates the six Notifications-owned tables and their dedup uniqueness", async () => {
    await withMigratedPersistence(async (persistence) => {
      await persistence.withContext(async (ctx) => {
        const tables = await ctx.db.execute<{ table_name: string }>(sql`
          select table_name
          from information_schema.tables
          where table_schema = 'app'
            and table_name like 'notification%'
          order by table_name
        `);
        expect(tables.rows.map((r) => r.table_name)).toEqual([
          "notification_communication_preferences",
          "notification_consents",
          "notification_message_attempts",
          "notification_provider_events",
          "notification_requests",
          "notification_templates",
        ]);

        const uniques = await ctx.db.execute<{ indexname: string }>(sql`
          select indexname
          from pg_indexes
          where schemaname = 'app'
            and indexname in (
              'notification_requests_dedup_key_uidx',
              'notification_consents_customer_purpose_uidx',
              'notification_communication_preferences_customer_channel_uidx',
              'notification_templates_key_locale_version_channel_uidx',
              'notification_provider_events_dedup_key_uidx'
            )
          order by indexname
        `);
        expect(uniques.rows).toHaveLength(5);
      });
    });
  });

  it("seeds one approved template per V1 semantic type with no provider template reference", async () => {
    await withMigratedPersistence(async (persistence) => {
      await persistence.withContext(async (ctx) => {
        const templates = await ctx.db.execute<{
          semantic_type: string;
          status: string;
          channel: string;
          provider_template_ref: string | null;
        }>(sql`
          select semantic_type, status, channel, provider_template_ref
          from app.notification_templates
          order by semantic_type
        `);
        expect(templates.rows.map((r) => r.semantic_type)).toEqual([
          "DELIVERED",
          "ORDER_ACCEPTED",
          "ORDER_CANCELLED",
          "ORDER_RECEIVED",
          "OUT_FOR_DELIVERY",
          "PAYMENT_CONFIRMED",
        ]);
        for (const row of templates.rows) {
          expect(row.status).toBe("APPROVED");
          expect(row.channel).toBe("WHATSAPP");
          // No provider adapter exists yet, so no external template is registered.
          expect(row.provider_template_ref).toBeNull();
        }
      });
    });
  });

  it("grants notification.resend to support and super admin only", async () => {
    await withMigratedPersistence(async (persistence) => {
      await persistence.withContext(async (ctx) => {
        const permission = await ctx.db.execute<{ key: string }>(
          sql`select key from app.access_permissions where key = 'notification.resend'`,
        );
        expect(permission.rows).toHaveLength(1);

        const grants = await ctx.db.execute<{
          role_key: string;
          inheritance_mode: string;
        }>(sql`
          select role_key, inheritance_mode
          from app.access_role_permissions
          where permission_key = 'notification.resend'
          order by role_key
        `);
        expect(grants.rows).toEqual([
          { role_key: "platform_super_admin", inheritance_mode: "descendants" },
          { role_key: "support_refund_operator", inheritance_mode: "descendants" },
        ]);
      });
    });
  });

  it("denies the application role destructive access to communication history", async () => {
    await withMigratedPersistence(async (persistence) => {
      await persistence.withContext(async (ctx) => {
        const privileges = await ctx.db.execute<{ count: string }>(sql`
          select count(*)::text as count
          from information_schema.table_privileges
          where table_schema = 'app'
            and grantee = 'boba_bear_app'
            and privilege_type = 'DELETE'
            and table_name in (
              'notification_requests',
              'notification_message_attempts',
              'notification_provider_events',
              'notification_consents'
            )
        `);
        expect(privileges.rows[0]?.count).toBe("0");
      });
    });
  });
});

describe("notification outbox processing", () => {
  it("converges at-least-once redelivery on exactly one notification request", async () => {
    await withMigratedPersistence(async (persistence) => {
      const payload = intent();
      // Two distinct outbox rows carrying the same committed fact: what
      // at-least-once redelivery looks like from the consumer's side.
      await enqueueIntent(persistence, payload);
      await enqueueIntent(persistence, payload);
      expect(await countRows(persistence, "app.outbox_events")).toBe(2);

      const processor = new NotificationOutboxProcessor({ persistence });
      await processor.tick();

      expect(await countRows(persistence, "app.notification_requests")).toBe(1);

      await persistence.withContext(async (ctx) => {
        const events = await ctx.db.execute<{ status: string }>(
          sql`select status from app.outbox_events`,
        );
        expect(events.rows.map((r) => r.status)).toEqual(["published", "published"]);
      });
    });
  });

  it("is idempotent across repeated ticks and repeated processing calls", async () => {
    await withMigratedPersistence(async (persistence) => {
      await enqueueIntent(persistence, intent());

      const processor = new NotificationOutboxProcessor({ persistence });
      await processor.tick();
      await processor.tick();
      await processor.tick();

      expect(await countRows(persistence, "app.notification_requests")).toBe(1);
      expect(await countRows(persistence, "app.notification_message_attempts")).toBe(1);

      const request = await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{ id: string; status: string }>(
          sql`select id::text as id, status from app.notification_requests`,
        );
        return rows.rows[0]!;
      });

      // Re-processing a request that is no longer awaiting a send is a no-op,
      // not a second customer message.
      const reprocessed = await processPendingNotification(persistence, request.id);
      expect(reprocessed.status).toBe(request.status);
      expect(await countRows(persistence, "app.notification_message_attempts")).toBe(1);
    });
  });

  it("dead-letters a malformed notification intent instead of crashing the poll loop", async () => {
    await withMigratedPersistence(async (persistence) => {
      const now = new Date();
      await persistence.transaction((tx) =>
        enqueueOutboxEvent(tx, {
          id: randomUUID(),
          eventType: "notification.domain.order_received",
          eventVersion: 1,
          aggregateType: "notification",
          aggregateId: null,
          payload: { semanticType: "ORDER_TELEPORTED" },
          occurredAt: now,
          availableAt: now,
          createdAt: now,
        }),
      );

      await new NotificationOutboxProcessor({ persistence }).tick();

      await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{ status: string; error_code: string | null }>(
          sql`select status, last_error_code as error_code from app.outbox_events`,
        );
        expect(rows.rows[0]?.status).toBe("dead_letter");
        expect(rows.rows[0]?.error_code).toBe("NOTIFICATION_PAYLOAD_INVALID");
      });
      expect(await countRows(persistence, "app.notification_requests")).toBe(0);
    });
  });

  it("leaves outbox events it does not own for their real consumer", async () => {
    await withMigratedPersistence(async (persistence) => {
      const now = new Date();
      await persistence.transaction((tx) =>
        enqueueOutboxEvent(tx, {
          id: randomUUID(),
          eventType: "order.created",
          eventVersion: 1,
          payload: { orderId: randomUUID() },
          occurredAt: now,
          availableAt: now,
          createdAt: now,
        }),
      );

      await new NotificationOutboxProcessor({ persistence }).tick();

      expect(await countRows(persistence, "app.notification_requests")).toBe(0);
      await persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{ status: string }>(
          sql`select status from app.outbox_events`,
        );
        // Published, not dead-lettered: another consumer legitimately owns it.
        expect(rows.rows[0]?.status).toBe("published");
      });
    });
  });
});

describe("notification send policy enforcement", () => {
  it("suppresses a withdrawn-consent notification without attempting a send", async () => {
    await withMigratedPersistence(async (persistence) => {
      const now = new Date();
      await persistence.transaction((tx) =>
        setConsentStatus(tx, {
          customerId: CUSTOMER_ID,
          purpose: "ORDER_UPDATES",
          status: "WITHDRAWN",
          evidenceType: "EXPLICIT_OPT_OUT",
          evidenceRef: null,
          now,
        }),
      );

      const created = await createNotificationRequestFromDomainEvent(
        persistence,
        intent(),
      );
      expect(created).not.toBeNull();

      // Creating the request records transactional-relationship evidence
      // insert-if-absent, which must not overwrite the withdrawal.
      await persistence.withContext(async (ctx) => {
        const consent = await ctx.db.execute<{ status: string }>(
          sql`select status from app.notification_consents where customer_id = ${CUSTOMER_ID}`,
        );
        expect(consent.rows[0]?.status).toBe("WITHDRAWN");
      });

      const processed = await processPendingNotification(persistence, created!.id);
      expect(processed.status).toBe("SUPPRESSED");
      expect(processed.suppressionReason).toBe("CONSENT_WITHDRAWN");
      expect(processed.terminalAt).not.toBeNull();
      expect(await countRows(persistence, "app.notification_message_attempts")).toBe(0);
    });
  });

  it("suppresses a notification for a disabled channel", async () => {
    await withMigratedPersistence(async (persistence) => {
      await persistence.transaction((tx) =>
        setCommunicationPreference(tx, {
          customerId: CUSTOMER_ID,
          channel: "WHATSAPP",
          enabled: false,
          quietHours: null,
          now: new Date(),
        }),
      );

      const created = await createNotificationRequestFromDomainEvent(
        persistence,
        intent(),
      );
      const processed = await processPendingNotification(persistence, created!.id);

      expect(processed.status).toBe("SUPPRESSED");
      expect(processed.suppressionReason).toBe("CHANNEL_DISABLED");
      expect(await countRows(persistence, "app.notification_message_attempts")).toBe(0);
    });
  });

  it("does not create a request for an intent older than the transactional max age", async () => {
    await withMigratedPersistence(async (persistence) => {
      const stale = intent({
        occurredAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
      });
      const created = await createNotificationRequestFromDomainEvent(persistence, stale);
      expect(created).toBeNull();
      expect(await countRows(persistence, "app.notification_requests")).toBe(0);
    });
  });
});

describe("non-sending adapter persistence", () => {
  it("records the attempt as not sent and never as a provider or recipient fact", async () => {
    await withMigratedPersistence(async (persistence) => {
      const created = await createNotificationRequestFromDomainEvent(
        persistence,
        intent(),
      );
      const processed = await processPendingNotification(persistence, created!.id);

      // PERMANENT_FAILURE is neither retryable nor operator-actionable, so the
      // request is terminally FAILED rather than a fabricated success.
      expect(processed.status).toBe("FAILED");
      expect(processed.reviewReason).toBeNull();
      expect(processed.templateKey).toBe("order_received");
      expect(processed.attemptCount).toBe(BigInt(1));

      const attempts = await persistence.withContext((ctx) =>
        listNotificationAttempts(ctx, created!.id),
      );
      expect(attempts).toHaveLength(1);
      const attempt = attempts[0]!;
      expect(attempt.status).toBe("FAILED");
      expect(attempt.provider).toBe("noop");
      expect(attempt.providerMessageId).toBeNull();
      expect(attempt.sentAt).toBeNull();
      expect(attempt.providerAckedAt).toBeNull();
      expect(attempt.failureCategory).toBe("PERMANENT_FAILURE");
      expect(attempt.failureCode).toBe("PROVIDER_NOT_CONFIGURED");
    });
  });

  it("refuses at the database level to record an external success for a non-sending provider", async () => {
    await withMigratedPersistence(async (persistence) => {
      const created = await createNotificationRequestFromDomainEvent(
        persistence,
        intent(),
      );
      await processPendingNotification(persistence, created!.id);

      await expectPostgresFailure(
        () =>
          persistence.withContext((ctx) =>
            ctx.db.execute(sql`
              update app.notification_message_attempts
              set status = 'DELIVERED',
                  provider_message_id = 'wamid.fabricated',
                  provider_acked_at = now()
              where notification_request_id = ${created!.id}::uuid
            `),
          ),
        /non_sending_provider_check|check constraint|23514/i,
      );
    });
  });
});

describe("order-scoped notification behaviour", () => {
  it("enqueues notification intents in the same transaction as the domain write", async () => {
    await withCompletedPositiveOrderHarness(async (harness) => {
      const events = await harness.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{ event_type: string }>(sql`
          select event_type
          from app.outbox_events
          where event_type like 'notification.domain.%'
          order by event_type
        `);
        return rows.rows.map((r) => r.event_type);
      });

      // Order materialization and payment success each committed their own
      // notification intent alongside the domain fact.
      expect(events).toContain("notification.domain.order_received");
      expect(events).toContain("notification.domain.payment_confirmed");
    });
  });

  it("suppresses a stale intermediate update once a later semantic went out", async () => {
    await withCompletedPositiveOrderHarness(async (harness) => {
      const orderId = harness.order.id;
      const customerId = await harness.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{ customer_id: string }>(sql`
          select c.customer_auth_user_id::text as customer_id
          from app.orders o
          join app.checkout_snapshots s on s.id = o.checkout_snapshot_id
          join app.checkouts c on c.id = s.checkout_id
          where o.id = ${orderId}::uuid
        `);
        return rows.rows[0]!.customer_id;
      });

      const delivered = await createNotificationRequestFromDomainEvent(
        harness.persistence,
        {
          customerId,
          orderId,
          paymentId: null,
          deliveryId: randomUUID(),
          domainEventRef: `delivery:${randomUUID()}:delivered`,
          semanticType: "DELIVERED",
          occurredAt: new Date().toISOString(),
        },
      );
      const accepted = await createNotificationRequestFromDomainEvent(
        harness.persistence,
        {
          customerId,
          orderId,
          paymentId: null,
          deliveryId: null,
          domainEventRef: `order:${orderId}:accepted:1`,
          semanticType: "ORDER_ACCEPTED",
          occurredAt: new Date().toISOString(),
        },
      );

      // The later step is dispatched first; the earlier one is now a regression.
      await processPendingNotification(harness.persistence, delivered!.id);
      const staleResult = await processPendingNotification(
        harness.persistence,
        accepted!.id,
      );

      expect(staleResult.status).toBe("SUPPRESSED");
      expect(staleResult.suppressionReason).toBe("SUPERSEDED_BY_LATER_SEMANTIC");

      const attempts = await harness.persistence.withContext((ctx) =>
        listNotificationAttempts(ctx, accepted!.id),
      );
      expect(attempts).toHaveLength(0);
    });
  });

  it("gates manual resend on notification.resend and re-applies policy", async () => {
    await withCompletedPositiveOrderHarness(async (harness) => {
      const created = await createNotificationRequestFromDomainEvent(
        harness.persistence,
        intent(),
      );
      const failed = await processPendingNotification(harness.persistence, created!.id);
      expect(failed.status).toBe("FAILED");

      // Kitchen holds no notification permission.
      await expect(
        manualResendNotification(harness.persistence, harness.workforce.kitchen, {
          notificationRequestId: created!.id,
          reason: "Customer says they never received the update.",
        }),
      ).rejects.toMatchObject({ code: "NOTIFICATION_UNAUTHORIZED" });

      // A reason is mandatory even for an authorized operator.
      await expect(
        manualResendNotification(harness.persistence, harness.workforce.support, {
          notificationRequestId: created!.id,
          reason: "   ",
        }),
      ).rejects.toMatchObject({ code: "NOTIFICATION_INVALID_INPUT" });

      const resent = await manualResendNotification(
        harness.persistence,
        harness.workforce.support,
        {
          notificationRequestId: created!.id,
          reason: "Customer says they never received the update.",
        },
      );

      // Still not sent — a resend cannot conjure a provider that does not exist.
      expect(resent.status).toBe("FAILED");
      expect(resent.attemptCount).toBe(BigInt(2));

      const attempts = await harness.persistence.withContext((ctx) =>
        listNotificationAttempts(ctx, created!.id),
      );
      expect(attempts).toHaveLength(2);
      expect(attempts[1]!.providerMessageId).toBeNull();

      // The operator-caused attempt carries its own audit trail.
      const audit = await harness.persistence.withContext(async (ctx) => {
        const rows = await ctx.db.execute<{
          manual_resend_reason: string | null;
          manual_resend_by_workforce_user_id: string | null;
        }>(sql`
          select manual_resend_reason, manual_resend_by_workforce_user_id
          from app.notification_message_attempts
          where notification_request_id = ${created!.id}::uuid
          order by attempt_sequence
        `);
        return rows.rows;
      });
      expect(audit[0]?.manual_resend_reason).toBeNull();
      expect(audit[1]?.manual_resend_reason).toBe(
        "Customer says they never received the update.",
      );
      expect(audit[1]?.manual_resend_by_workforce_user_id).toBe(
        harness.workforce.supportUser.id,
      );
    });
  });

  it("refuses to resend a suppressed notification", async () => {
    await withCompletedPositiveOrderHarness(async (harness) => {
      await harness.persistence.transaction((tx) =>
        setConsentStatus(tx, {
          customerId: CUSTOMER_ID,
          purpose: "ORDER_UPDATES",
          status: "WITHDRAWN",
          evidenceType: "EXPLICIT_OPT_OUT",
          evidenceRef: null,
          now: new Date(),
        }),
      );
      const created = await createNotificationRequestFromDomainEvent(
        harness.persistence,
        intent(),
      );
      const suppressed = await processPendingNotification(
        harness.persistence,
        created!.id,
      );
      expect(suppressed.status).toBe("SUPPRESSED");

      await expect(
        manualResendNotification(harness.persistence, harness.workforce.support, {
          notificationRequestId: created!.id,
          reason: "Operator asked to try again.",
        }),
      ).rejects.toMatchObject({ code: "NOTIFICATION_RESEND_NOT_ALLOWED" });
    });
  });
});
