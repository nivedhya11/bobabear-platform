import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  checkNoFloatingImageTags,
  checkPinnedBaseImages,
  checkFullyQualifiedExternalBaseImages,
  checkComposeImageReferences,
  checkNodeServiceHealthchecks,
  checkFinalStageIsWebRuntime,
  checkNoNodeServerAtRuntime,
  checkAppServiceHasNoDatabaseAccess,
  checkAppServiceSecurityHardening,
  checkCustomerAuthServiceHasNoHostPort,
  checkCustomerAuthServiceSecurityHardening,
  checkAppDoesNotDependOnCustomerAuth,
  checkDockerignoreExcludesSecrets,
  checkNoNewApiOrBusinessTable,
  checkNginxProxiesRazorpayWebhook,
  runAllChecks,
} from "./audit-docker-runtime.mjs";

const VALID_DOCKERFILE = `
ARG NODE_IMAGE=docker.io/library/node:22.23.1-bookworm-slim
ARG NGINX_IMAGE=docker.io/library/nginx:1.30.4-alpine3.24
FROM \${NODE_IMAGE} AS base
FROM base AS dependencies
FROM base AS builder
ARG NEXT_PUBLIC_SITE_URL=""
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID=""
FROM base AS tooling
FROM dependencies AS customer-auth-builder
FROM base AS customer-auth-dependencies
FROM base AS customer-auth-runtime
EXPOSE 8081
CMD ["node", "--conditions=react-server", "dist-customer-auth/server/customer-auth/main.js"]
FROM dependencies AS workforce-auth-builder
FROM base AS workforce-auth-dependencies
FROM base AS workforce-auth-runtime
EXPOSE 8082
CMD ["node", "--conditions=react-server", "dist-workforce-auth/server/workforce-auth/main.js"]
FROM dependencies AS customer-commerce-builder
FROM base AS customer-commerce-dependencies
FROM base AS customer-commerce-runtime
EXPOSE 8083
CMD ["node", "--conditions=react-server", "dist-customer-commerce/server/customer-commerce/main.js"]
FROM \${NGINX_IMAGE} AS web-runtime
CMD ["nginx", "-g", "daemon off;"]
`;

const VALID_COMPOSE = `
name: boba-bear
services:
  postgres:
    image: docker.io/library/postgres:18.4-trixie
  app:
    image: boba-bear-app:local
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD", "true"]
  customer-auth:
    image: boba-bear-customer-auth:local
    expose: ["8081"]
    depends_on:
      postgres:
        condition: service_healthy
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:8081/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
  workforce-auth:
    image: boba-bear-workforce-auth:local
    expose: ["8082"]
    env_file:
      - .env.runtime.docker.local
      - .env.workforce-auth.docker.local
    depends_on:
      postgres:
        condition: service_healthy
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:8082/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
  customer-commerce:
    image: boba-bear-customer-commerce:local
    expose: ["8083"]
    env_file:
      - .env.runtime.docker.local
      - .env.customer-auth.docker.local
      - .env.customer-commerce.docker.local
    depends_on:
      postgres:
        condition: service_healthy
    read_only: true
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    healthcheck:
      test: ["CMD-SHELL", "node -e \"fetch('http://127.0.0.1:8083/health/live').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))\""]
  migrate:
    profiles: ["tools"]
    depends_on:
      postgres:
        condition: service_healthy
  db-check:
    profiles: ["tools"]
  db-check-migration:
    profiles: ["tools"]
  menu-import-existing:
    profiles: ["tools"]
  menu-verify-existing:
    profiles: ["tools"]
volumes:
  postgres-data:
`;

test("checkPinnedBaseImages passes on the approved exact tags", () => {
  assert.equal(checkPinnedBaseImages(VALID_DOCKERFILE).passed, true);
});

test("checkPinnedBaseImages rejects a floating Node tag", () => {
  const dockerfile = VALID_DOCKERFILE.replace(
    "docker.io/library/node:22.23.1-bookworm-slim",
    "docker.io/library/node:latest",
  );
  assert.equal(checkPinnedBaseImages(dockerfile).passed, false);
});

test("checkFullyQualifiedExternalBaseImages passes qualified ARG defaults and stage self-refs", () => {
  assert.equal(checkFullyQualifiedExternalBaseImages(VALID_DOCKERFILE).passed, true);
});

test("checkFullyQualifiedExternalBaseImages rejects short-name Node/Nginx ARG defaults", () => {
  const dockerfile = VALID_DOCKERFILE.replaceAll("docker.io/library/", "");
  const result = checkFullyQualifiedExternalBaseImages(dockerfile);
  assert.equal(result.passed, false);
  assert.match(result.detail, /node:22\.23\.1-bookworm-slim/);
  assert.match(result.detail, /nginx:1\.30\.4-alpine3\.24/);
});

test("checkNoFloatingImageTags rejects an untagged image and accepts stage self-references", () => {
  const dockerfile = "FROM node AS base\nFROM base AS builder\n";
  const result = checkNoFloatingImageTags(dockerfile, "");
  assert.equal(result.passed, false);
  assert.match(result.detail, /node/);
});

test("checkNoFloatingImageTags rejects a compose service pinned to :latest", () => {
  const result = checkNoFloatingImageTags(VALID_DOCKERFILE, "  image: postgres:latest\n");
  assert.equal(result.passed, false);
});

test("checkNoFloatingImageTags passes the valid fixtures", () => {
  assert.equal(checkNoFloatingImageTags(VALID_DOCKERFILE, VALID_COMPOSE).passed, true);
});

test("checkComposeImageReferences requires qualified external images and local project images", () => {
  assert.equal(checkComposeImageReferences(VALID_COMPOSE).passed, true);
  assert.equal(checkComposeImageReferences(VALID_COMPOSE.replace("docker.io/library/postgres", "postgres")).passed, false);
  assert.equal(checkComposeImageReferences(VALID_COMPOSE.replace("boba-bear-app:local", "docker.io/library/boba-bear-app:local")).passed, false);
});

test("checkNodeServiceHealthchecks requires portable shell commands and exact live endpoints", () => {
  assert.equal(checkNodeServiceHealthchecks(VALID_COMPOSE).passed, true);
  assert.equal(checkNodeServiceHealthchecks(VALID_COMPOSE.replace("CMD-SHELL", "CMD")).passed, false);
  assert.equal(checkNodeServiceHealthchecks(VALID_COMPOSE.replace("8083/health/live", "8083/health/ready")).passed, false);
});

test("checkFinalStageIsWebRuntime rejects a Node runtime as the final stage", () => {
  const dockerfile = VALID_DOCKERFILE.replace('AS web-runtime\nCMD ["nginx", "-g", "daemon off;"]', "AS node-runtime\nCMD [\"node\", \"server.js\"]");
  assert.equal(checkFinalStageIsWebRuntime(dockerfile).passed, false);
});

test("checkNoNodeServerAtRuntime rejects a `next start` CMD", () => {
  const dockerfile = VALID_DOCKERFILE + "\nRUN echo \"next start\"\n";
  assert.equal(checkNoNodeServerAtRuntime(dockerfile).passed, false);
});

test("checkAppServiceHasNoDatabaseAccess rejects an app service with a database env var", () => {
  const compose = VALID_COMPOSE.replace("    read_only: true", "    read_only: true\n    environment:\n      BOBA_BEAR_DATABASE_URL: postgresql://x\n");
  assert.equal(checkAppServiceHasNoDatabaseAccess(compose).passed, false);
});

test("checkAppServiceHasNoDatabaseAccess passes the valid fixture", () => {
  assert.equal(checkAppServiceHasNoDatabaseAccess(VALID_COMPOSE).passed, true);
});

test("checkAppServiceSecurityHardening rejects a missing read_only flag", () => {
  const compose = VALID_COMPOSE.replace("    read_only: true\n", "");
  assert.equal(checkAppServiceSecurityHardening(compose).passed, false);
});

test("checkAppServiceSecurityHardening rejects a missing capability drop", () => {
  const compose = VALID_COMPOSE.replace("    cap_drop:\n      - ALL\n", "");
  assert.equal(checkAppServiceSecurityHardening(compose).passed, false);
});

test("checkAppServiceSecurityHardening passes the valid fixture", () => {
  assert.equal(checkAppServiceSecurityHardening(VALID_COMPOSE).passed, true);
});

test("checkDockerignoreExcludesSecrets rejects a fixture missing a generated secret pattern", () => {
  const result = checkDockerignoreExcludesSecrets(".git\nnode_modules\n.env.*\n");
  assert.equal(result.passed, false);
  assert.match(result.detail, /\.env\.docker\.local/);
});

test("checkDockerignoreExcludesSecrets passes a fixture listing every required pattern", () => {
  const result = checkDockerignoreExcludesSecrets(
    ".git\nnode_modules\n.env.*\n.env.docker.local\n.env.runtime.docker.local\n.env.migration.docker.local\n.env.customer-auth.docker.local\n.env.workforce-auth.docker.local\n.env.customer-commerce.docker.local\n",
  );
  assert.equal(result.passed, true);
});

test("checkCustomerAuthServiceHasNoHostPort rejects a ports: mapping", () => {
  const compose = VALID_COMPOSE.replace('    expose: ["8081"]', '    ports:\n      - "8081:8081"\n    expose: ["8081"]');
  assert.equal(checkCustomerAuthServiceHasNoHostPort(compose).passed, false);
});

test("checkCustomerAuthServiceHasNoHostPort passes the valid fixture", () => {
  assert.equal(checkCustomerAuthServiceHasNoHostPort(VALID_COMPOSE).passed, true);
});

test("checkCustomerAuthServiceSecurityHardening rejects a missing healthy-postgres dependency", () => {
  // The first "depends_on: postgres: condition: service_healthy" occurrence
  // in VALID_COMPOSE belongs to the customer-auth service block; `migrate`'s
  // own (identical) block is untouched.
  const compose = VALID_COMPOSE.replace("    depends_on:\n      postgres:\n        condition: service_healthy\n", "");
  assert.equal(checkCustomerAuthServiceSecurityHardening(compose).passed, false);
});

test("checkCustomerAuthServiceSecurityHardening passes the valid fixture", () => {
  assert.equal(checkCustomerAuthServiceSecurityHardening(VALID_COMPOSE).passed, true);
});

test("checkAppDoesNotDependOnCustomerAuth rejects an app service that references customer-auth", () => {
  const compose = VALID_COMPOSE.replace(
    "  app:\n    image: boba-bear-app:local\n",
    "  app:\n    image: boba-bear-app:local\n    depends_on:\n      customer-auth:\n        condition: service_healthy\n",
  );
  assert.equal(checkAppDoesNotDependOnCustomerAuth(compose).passed, false);
});

test("checkAppDoesNotDependOnCustomerAuth passes the valid fixture", () => {
  assert.equal(checkAppDoesNotDependOnCustomerAuth(VALID_COMPOSE).passed, true);
});

test("checkNginxProxiesRazorpayWebhook requires an exact webhook location", () => {
  assert.equal(
    checkNginxProxiesRazorpayWebhook(
      "location ^~ /api/v1/ { set $customer_commerce_upstream http://customer-commerce:8083; }",
    ).passed,
    false,
  );
  assert.equal(
    checkNginxProxiesRazorpayWebhook(
      "location ^~ /api/integrations/ { set $customer_commerce_upstream http://customer-commerce:8083; }",
    ).passed,
    false,
  );
  assert.equal(
    checkNginxProxiesRazorpayWebhook(
      "location = /api/integrations/payments/razorpay/webhook { set $customer_commerce_upstream http://customer-commerce:8083; }",
    ).passed,
    true,
  );
});

test("checkNoNewApiOrBusinessTable rejects a repository containing a Route Handler", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "boba-bear-docker-audit-test-"));
  try {
    mkdirSync(path.join(dir, "src", "app", "orders"), { recursive: true });
    writeFileSync(path.join(dir, "src", "app", "orders", "route.ts"), "export async function GET() {}\n");
    assert.equal(checkNoNewApiOrBusinessTable(dir).passed, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("checkNoNewApiOrBusinessTable passes a repository with no Route Handlers", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "boba-bear-docker-audit-test-"));
  try {
    mkdirSync(path.join(dir, "src", "app"), { recursive: true });
    writeFileSync(path.join(dir, "src", "app", "page.tsx"), "export default function Page() { return null; }\n");
    assert.equal(checkNoNewApiOrBusinessTable(dir).passed, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("runAllChecks passes every check against a fully valid fixture set", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "boba-bear-docker-audit-test-"));
  try {
    mkdirSync(path.join(dir, "src", "app"), { recursive: true });
    const results = runAllChecks({
      dockerfileText: VALID_DOCKERFILE,
      composeText: VALID_COMPOSE,
      nginxConfText:
        "server {\n  listen 8080;\n  location = /api/integrations/payments/razorpay/webhook {\n    set $customer_commerce_upstream http://customer-commerce:8083;\n    proxy_pass $customer_commerce_upstream;\n  }\n  location ^~ /api/v1/ {\n    set $customer_commerce_upstream http://customer-commerce:8083;\n    proxy_pass $customer_commerce_upstream;\n  }\n}\n",
      nextConfigText: 'const nextConfig = { output: "export" };\n',
      gitignoreText: ".env*\n!.env.example\n",
      dockerignoreText: ".git\nnode_modules\n.env.*\n.env.docker.local\n.env.runtime.docker.local\n.env.migration.docker.local\n.env.customer-auth.docker.local\n.env.workforce-auth.docker.local\n.env.customer-commerce.docker.local\n",
      projectRootDir: dir,
    });
    const failed = results.filter((r) => !r.passed);
    assert.deepEqual(failed, [], `unexpected failures: ${JSON.stringify(failed)}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
