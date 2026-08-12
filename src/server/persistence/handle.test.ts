import { describe, expect, it, vi } from "vitest";

import { createPersistenceHandle, type PersistenceHandleDependencies } from "./handle";
import {
  PersistenceClosedError,
  PersistenceOperationError,
  PersistenceUnavailableError,
} from "./errors";

const SECRET = "S3cr3t-Conn3ction-Value";

function createFakeDeps(overrides?: {
  execute?: ReturnType<typeof vi.fn>;
  transaction?: ReturnType<typeof vi.fn>;
  close?: ReturnType<typeof vi.fn>;
}) {
  const execute = overrides?.execute ?? vi.fn().mockResolvedValue({ rows: [] });
  const transaction =
    overrides?.transaction ?? vi.fn(async (fn: (tx: unknown) => unknown) => fn({}));
  const close = overrides?.close ?? vi.fn().mockResolvedValue(undefined);

  const fakeClient = {
    db: { execute, transaction },
    pool: {},
    close,
  };

  const createClient = vi.fn(() => fakeClient);
  const dependencies: PersistenceHandleDependencies = {
    createClient: createClient as unknown as PersistenceHandleDependencies["createClient"],
  };
  return { dependencies, createClient, execute, transaction, close, fakeClient };
}

function baseOptions(overrides?: Partial<Parameters<typeof createPersistenceHandle>[0]>) {
  return {
    role: "application" as const,
    connectionString: `postgresql://user:${SECRET}@host:5432/db`,
    sslMode: "disable" as const,
    applicationName: "boba-bear-persistence-test",
    ...overrides,
  };
}

describe("createPersistenceHandle: lazy initialization", () => {
  it("does not create a client when the handle is created", () => {
    const { dependencies, createClient } = createFakeDeps();
    createPersistenceHandle(baseOptions(), dependencies);
    expect(createClient).not.toHaveBeenCalled();
  });

  it("creates the client on first use, and reuses it on subsequent use", async () => {
    const { dependencies, createClient } = createFakeDeps();
    const handle = createPersistenceHandle(baseOptions(), dependencies);

    await handle.checkAvailability();
    await handle.checkAvailability();
    await handle.withContext(async () => undefined);

    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it("creates exactly one client under concurrent first use", async () => {
    const { dependencies, createClient } = createFakeDeps();
    const handle = createPersistenceHandle(baseOptions(), dependencies);

    await Promise.all([
      handle.checkAvailability(),
      handle.checkAvailability(),
      handle.withContext(async () => undefined),
    ]);

    expect(createClient).toHaveBeenCalledTimes(1);
  });
});

describe("createPersistenceHandle: shutdown", () => {
  it("close() before first use is safe and never creates a client", async () => {
    const { dependencies, createClient, close } = createFakeDeps();
    const handle = createPersistenceHandle(baseOptions(), dependencies);

    await handle.close();

    expect(createClient).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
  });

  it("close() after use closes the underlying client exactly once", async () => {
    const { dependencies, close } = createFakeDeps();
    const handle = createPersistenceHandle(baseOptions(), dependencies);

    await handle.checkAvailability();
    await handle.close();
    await handle.close();

    expect(close).toHaveBeenCalledTimes(1);
  });

  it("calls onClose exactly once even if close() is called twice", async () => {
    const { dependencies } = createFakeDeps();
    const onClose = vi.fn();
    const handle = createPersistenceHandle(baseOptions({ onClose }), dependencies);

    await handle.close();
    await handle.close();

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("using a closed handle throws PersistenceClosedError", async () => {
    const { dependencies } = createFakeDeps();
    const handle = createPersistenceHandle(baseOptions(), dependencies);

    await handle.close();

    await expect(handle.checkAvailability()).rejects.toBeInstanceOf(PersistenceClosedError);
    await expect(handle.withContext(async () => undefined)).rejects.toBeInstanceOf(
      PersistenceClosedError,
    );
    await expect(handle.transaction(async () => undefined)).rejects.toBeInstanceOf(
      PersistenceClosedError,
    );
  });
});

describe("createPersistenceHandle: availability", () => {
  it("returns { ok: true } on success", async () => {
    const { dependencies } = createFakeDeps();
    const handle = createPersistenceHandle(baseOptions(), dependencies);

    await expect(handle.checkAvailability()).resolves.toEqual({ ok: true });
  });

  it("normalizes a failure into a secret-safe PersistenceUnavailableError", async () => {
    const rawError = Object.assign(new Error(`connection failed to ${SECRET}`), {
      code: "08006",
    });
    const execute = vi.fn().mockRejectedValue(rawError);
    const { dependencies } = createFakeDeps({ execute });
    const handle = createPersistenceHandle(baseOptions(), dependencies);

    let caught: unknown;
    try {
      await handle.checkAvailability();
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(PersistenceUnavailableError);
    const safeJson = JSON.stringify((caught as PersistenceUnavailableError).toSafeJSON());
    expect((caught as Error).message).not.toContain(SECRET);
    expect((caught as Error).stack ?? "").not.toContain(SECRET);
    expect(safeJson).not.toContain(SECRET);
  });
});

describe("createPersistenceHandle: transaction", () => {
  it("returns the callback's result on commit", async () => {
    const { dependencies } = createFakeDeps();
    const handle = createPersistenceHandle(baseOptions(), dependencies);

    const result = await handle.transaction(async () => "committed-value");

    expect(result).toBe("committed-value");
  });

  it("calls the transaction executor exactly once", async () => {
    const { dependencies, transaction } = createFakeDeps();
    const handle = createPersistenceHandle(baseOptions(), dependencies);

    await handle.transaction(async () => "value");

    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it("re-throws a caller/domain error unchanged instead of wrapping it", async () => {
    class DomainError extends Error {}
    const domainError = new DomainError("business rule violated");
    const transactionFn = vi.fn(async (fn: (tx: unknown) => unknown) => fn({}));
    const { dependencies } = createFakeDeps({ transaction: transactionFn });
    const handle = createPersistenceHandle(baseOptions(), dependencies);

    await expect(
      handle.transaction(async () => {
        throw domainError;
      }),
    ).rejects.toBe(domainError);
  });

  it("normalizes a driver-shaped error (has a SQLSTATE-like code) safely", async () => {
    const driverError = Object.assign(new Error(`duplicate key using ${SECRET}`), {
      code: "23505",
    });
    const { dependencies } = createFakeDeps();
    const handle = createPersistenceHandle(baseOptions(), dependencies);

    let caught: unknown;
    try {
      await handle.transaction(async () => {
        throw driverError;
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(PersistenceOperationError);
    expect((caught as Error).message).not.toContain(SECRET);
  });

  it("never retries: the callback executing once means the underlying executor is called once even on failure", async () => {
    const transactionFn = vi.fn(async (fn: (tx: unknown) => unknown) => {
      try {
        return await fn({});
      } catch (error) {
        throw error;
      }
    });
    const { dependencies } = createFakeDeps({ transaction: transactionFn });
    const handle = createPersistenceHandle(baseOptions(), dependencies);
    const callback = vi.fn(async () => {
      throw new Error("fails");
    });

    await expect(handle.transaction(callback)).rejects.toThrow("fails");
    expect(callback).toHaveBeenCalledTimes(1);
    expect(transactionFn).toHaveBeenCalledTimes(1);
  });
});

describe("createPersistenceHandle: query context typing", () => {
  it("passes the role through to the context", async () => {
    const { dependencies } = createFakeDeps();
    const handle = createPersistenceHandle(baseOptions({ role: "migration" }), dependencies);

    let seenRole: string | undefined;
    await handle.withContext(async (ctx) => {
      seenRole = ctx.role;
    });

    expect(seenRole).toBe("migration");
  });
});
