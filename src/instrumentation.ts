/**
 * Next.js instrumentation entry point.
 *
 * See: https://nextjs.org/docs/app/guides/instrumentation
 *
 * This only wires the web process into the centralized startup bootstrap.
 * It must not initialize on the Edge runtime, must not add client
 * instrumentation, and must not call any external provider.
 *
 * Direct `process.env.NEXT_RUNTIME` access here (rather than through the
 * typed configuration boundary) is a deliberate, narrow framework-bootstrap
 * exception: this check has to run before any module that itself decides
 * whether it is safe to touch Node.js-only APIs.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapApplication } = await import(
      "./platform/startup/bootstrap"
    );
    await bootstrapApplication("web");
  }
}
