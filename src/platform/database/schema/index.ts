/**
 * Drizzle application schema declaration.
 *
 * Declares the `app` Postgres schema that all BOBA Bear business tables must
 * live in. Table definitions live in sibling modules under this directory
 * (auth, outbox, organization, access-control, catalog, …) and are declared through
 * this schema object's own table helper, never the bare `pgTable` helper.
 */
import { pgSchema } from "drizzle-orm/pg-core";

/** The application object schema. Owned by `boba_bear_migrator` at the
 * database level (see docker/postgres/init/001-bootstrap.sh). Every future
 * business table must be declared through this schema object's own table
 * helper, never through the bare `pgTable` helper (which would target
 * `public`). */
export const appSchema = pgSchema("app");
