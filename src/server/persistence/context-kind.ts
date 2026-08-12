/**
 * Internal runtime brand distinguishing a transaction-scoped persistence
 * context from an ordinary query context (IMP-007).
 *
 * IMP-006's `PersistenceTransactionContext` is a type alias of
 * `PersistenceQueryContext` — identical at the type level, by design, so
 * that accepting a context does not itself invite starting a nested
 * transaction. That means TypeScript alone cannot stop a caller from
 * passing a `withContext` query context to an API that requires a
 * transaction context; only a runtime check can. This module adds that one
 * runtime check without changing the public `Persistence` type surface —
 * the brand is a non-enumerable symbol property, invisible to
 * `JSON.stringify`, object spreads, and existing structural-equality tests.
 *
 * Not exported from `src/server/persistence/index.ts`: this is plumbing
 * for `createPersistenceHandle` (which attaches the brand when it builds a
 * transaction callback's context) and for consumers like the outbox store
 * (which checks it) — never part of the public persistence API surface.
 */

const TRANSACTION_CONTEXT_BRAND = Symbol("persistenceTransactionContext");

/** Attach the transaction brand to `context` in place and return it,
 * typed as `T` so callers see no extra property in the type system. */
export function brandAsTransactionContext<T extends object>(context: T): T {
  Object.defineProperty(context, TRANSACTION_CONTEXT_BRAND, {
    value: true,
    enumerable: false,
    configurable: false,
    writable: false,
  });
  return context;
}

/** True only for a context object created by `Persistence.transaction`'s
 * callback — false for a `withContext` query context, and false for any
 * caller-fabricated look-alike object. */
export function isTransactionContext(context: object): boolean {
  return (
    Object.prototype.hasOwnProperty.call(context, TRANSACTION_CONTEXT_BRAND) &&
    (context as Record<symbol, unknown>)[TRANSACTION_CONTEXT_BRAND] === true
  );
}
