/**
 * Drizzle Kit configuration.
 *
 * Used only for `drizzle-kit generate` (committed SQL migrations) — never
 * for `drizzle-kit push`. See AGENTS.md: schema changes always ship as
 * generated, reviewed, repository-committed SQL, never applied directly
 * against a live database.
 *
 * Deliberately does not import `dotenv` or duplicate the BOBA Bear
 * configuration boundary's environment parsing: `generate` only needs the
 * schema shape, not a live connection, so no database credentials are
 * required to run it.
 */
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/platform/database/schema/**/*.ts",
  out: "./drizzle",
  migrations: {
    schema: "drizzle",
    table: "__drizzle_migrations",
  },
});
