-- IMP-004: database-foundation
--
-- Database-schema security foundation only. No business-domain table is
-- created here (see AGENTS.md). Role/database creation and default
-- privileges remain a Docker/local-infrastructure responsibility — see
-- docker/postgres/init/001-bootstrap.sh.
CREATE SCHEMA IF NOT EXISTS "app";
COMMENT ON SCHEMA "app" IS 'BOBA Bear application schema';
REVOKE CREATE ON SCHEMA "public" FROM PUBLIC;
REVOKE ALL ON SCHEMA "app" FROM PUBLIC;
