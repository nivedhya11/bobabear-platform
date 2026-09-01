#!/usr/bin/env node
// Static Docker runtime configuration audit (IMP-005A).
//
// Validates the repository's Docker configuration by reading files —
// never requires the Docker daemon, never builds an image, never starts a
// container. Safe to run in `npm run check` alongside the other static
// audits (audit:menu-images, audit:assets, audit:config, audit:database).
//
// Usage: node scripts/audit-docker-runtime.mjs
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), "utf8");
}

function exists(relativePath) {
  return existsSync(path.join(projectRoot, relativePath));
}

/** Every check returns `{ name, passed, detail? }`. Pure functions over
 * already-read file text so they are independently unit-testable. */

export function checkNoFloatingImageTags(dockerfileText, composeText) {
  const stageNames = new Set([...dockerfileText.matchAll(/\bAS\s+(\S+)/gi)].map((m) => m[1]));
  const dockerfileRefs = [...dockerfileText.matchAll(/^FROM\s+(\S+)/gm)].map((m) => m[1]);
  const composeRefs = [...composeText.matchAll(/^\s+image:\s*(\S+)/gm)].map((m) => m[1]);
  const floating = [...dockerfileRefs, ...composeRefs].filter((ref) => {
    if (ref.startsWith("$") || ref.startsWith("${")) return false; // resolved via ARG default, checked separately
    if (stageNames.has(ref)) return false; // reference to a prior build stage, not an external image
    if (!ref.includes(":")) return true; // no tag at all == implicit "latest"
    return ref.endsWith(":latest");
  });
  return { name: "No floating image tags (latest / untagged)", passed: floating.length === 0, detail: floating.join(", ") };
}

export function checkPinnedBaseImages(dockerfileText) {
  const hasNode =
    /ARG\s+NODE_IMAGE\s*=\s*docker\.io\/library\/node:22\.23\.1-bookworm-slim\b/.test(
      dockerfileText,
    );
  const hasNginx =
    /ARG\s+NGINX_IMAGE\s*=\s*docker\.io\/library\/nginx:1\.30\.4-alpine3\.24\b/.test(
      dockerfileText,
    );
  return {
    name: "Node and Nginx base images are pinned to the approved exact tags",
    passed: hasNode && hasNginx,
  };
}

/** True when `ref` includes an explicit registry host (e.g. docker.io/...). */
export function isFullyQualifiedImageRef(ref) {
  const slash = ref.indexOf("/");
  if (slash <= 0) return false;
  const registry = ref.slice(0, slash);
  return registry === "localhost" || registry.includes(".") || registry.includes(":");
}

/**
 * Every external Dockerfile base image must be a fully-qualified OCI reference.
 * Internal named-stage references (FROM base AS …) remain unqualified by design.
 */
export function checkFullyQualifiedExternalBaseImages(dockerfileText) {
  const argDefaults = new Map(
    [...dockerfileText.matchAll(/^ARG\s+(\w+)=(\S+)/gm)].map((m) => [m[1], m[2]]),
  );
  const stageNames = new Set(
    [...dockerfileText.matchAll(/\bAS\s+(\S+)/gi)].map((m) => m[1]),
  );
  const unresolved = [];
  for (const match of dockerfileText.matchAll(/^FROM\s+(\S+)/gm)) {
    let resolved = match[1];
    const argMatch = resolved.match(/^\$\{(\w+)\}$/);
    if (argMatch) {
      resolved = argDefaults.get(argMatch[1]);
      if (!resolved) {
        unresolved.push(match[1]);
        continue;
      }
    }
    if (stageNames.has(resolved)) continue;
    if (!isFullyQualifiedImageRef(resolved)) unresolved.push(resolved);
  }
  return {
    name: "External Dockerfile FROM references are fully-qualified OCI image refs",
    passed: unresolved.length === 0,
    detail: unresolved.join(", "),
  };
}

export function checkComposeImageReferences(composeText) {
  const imageRefs = [...composeText.matchAll(/^\s+image:\s*([^\s#]+)/gm)].map((match) => match[1]);
  const isProjectLocal = (ref) => ref.split("/").at(-1).startsWith("boba-bear-");
  const externalRefs = imageRefs.filter((ref) => !isProjectLocal(ref));
  const projectLocalRefs = imageRefs.filter(isProjectLocal);
  const unqualifiedExternal = externalRefs.filter((ref) => !isFullyQualifiedImageRef(ref));
  const qualifiedProjectLocal = projectLocalRefs.filter(isFullyQualifiedImageRef);
  const failures = [
    ...unqualifiedExternal.map((ref) => `external image is not fully qualified: ${ref}`),
    ...qualifiedProjectLocal.map((ref) => `project-local image is qualified: ${ref}`),
  ];
  return {
    name: "External Compose images are fully qualified and project-local images remain local",
    passed: failures.length === 0,
    detail: failures.join("; "),
  };
}

export function checkNodeServiceHealthchecks(composeText) {
  const endpoints = new Map([
    ["customer-auth", 8081],
    ["workforce-auth", 8082],
    ["customer-commerce", 8083],
    ["operations", 8084],
  ]);
  const failures = [];
  for (const [service, port] of endpoints) {
    const block = extractServiceBlock(composeText, service);
    const endpoint = `http://127.0.0.1:${port}/health/live`;
    const hasCommand =
      block.includes("node -e") &&
      block.includes(endpoint) &&
      block.includes("r=>process.exit(r.ok?0:1)") &&
      block.includes("catch(()=>process.exit(1))");
    if (!/"CMD-SHELL"/.test(block) || !hasCommand) {
      failures.push(service);
    }
  }
  return {
    name: "Node Compose healthchecks use portable shell commands with exact live endpoints",
    passed: failures.length === 0,
    detail: failures.join(", "),
  };
}

export function checkFinalStageIsWebRuntime(dockerfileText) {
  const stageNames = [...dockerfileText.matchAll(/FROM\s+\S+\s+AS\s+(\S+)/gi)].map((m) => m[1]);
  const passed = stageNames[stageNames.length - 1] === "web-runtime";
  return { name: "Final Dockerfile stage is the static Nginx web-runtime", passed, detail: stageNames.join(" -> ") };
}

export function checkNoNodeServerAtRuntime(dockerfileText) {
  const webRuntimeSection = dockerfileText.split(/FROM\s+\S+\s+AS\s+web-runtime/i)[1] ?? "";
  const hasNextStart = /next\s+start/.test(dockerfileText);
  const cmdUsesNginx = /CMD\s*\[\s*"nginx"/.test(webRuntimeSection);
  return {
    name: 'No "next start" and the web-runtime CMD launches Nginx, not Node',
    passed: !hasNextStart && cmdUsesNginx,
  };
}

export function checkStaticExportEnabled(nextConfigText) {
  const passed = /output\s*:\s*"export"/.test(nextConfigText);
  return { name: 'next.config.ts declares output: "export"', passed };
}

function extractServiceBlock(composeText, serviceName) {
  // Service blocks are 2-space-indented top-level keys under `services:`.
  // Matches from "  <name>:" up to (but not including) the next line at
  // the same 2-space indentation, or the `volumes:` top-level key.
  const pattern = new RegExp(`\\n  ${serviceName}:\\n([\\s\\S]*?)(?=\\n  \\S|\\nvolumes:|$)`);
  const match = composeText.match(pattern);
  return match ? match[1] : "";
}

export function checkAppServiceHasNoDatabaseAccess(composeText) {
  const appBlock = extractServiceBlock(composeText, "app");
  const failures = [];
  if (/env_file/.test(appBlock)) failures.push("app service has an env_file");
  if (/BOBA_BEAR_DATABASE/.test(appBlock)) failures.push("app service references a database env var");
  if (/db:migrate|db:check/.test(appBlock)) failures.push("app service runs a database command");
  if (/POSTGRES_/.test(appBlock)) failures.push("app service references a PostgreSQL env var");
  return { name: "app service has no database credentials, env file, or migration command", passed: failures.length === 0, detail: failures.join("; ") };
}

export function checkAppServiceSecurityHardening(composeText) {
  const appBlock = extractServiceBlock(composeText, "app");
  const checks = {
    "read_only: true": /read_only:\s*true/.test(appBlock),
    "cap_drop: ALL": /cap_drop:\s*\n\s*-\s*ALL/.test(appBlock),
    "no-new-privileges": /no-new-privileges:true/.test(appBlock),
    "healthcheck": /healthcheck:/.test(appBlock),
    "no source bind mount": !/\.\/(src|public)\b/.test(appBlock),
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  return { name: "app service is read-only, drops all capabilities, enables no-new-privileges, has a health check, and has no source bind mount", passed: failed.length === 0, detail: failed.join(", ") };
}

export function checkCustomerAuthServiceHasNoHostPort(composeText) {
  const block = extractServiceBlock(composeText, "customer-auth");
  const failures = [];
  if (/^\s*ports:/m.test(block)) failures.push("customer-auth service declares a ports: (host-published) mapping");
  if (!/expose:\s*\[\s*"?8081"?\s*\]|expose:\s*\n\s*-\s*"?8081"?/.test(block)) {
    failures.push('customer-auth service does not expose "8081" container-only');
  }
  return { name: "customer-auth service exposes 8081 container-only, never a published host port", passed: failures.length === 0, detail: failures.join("; ") };
}

export function checkCustomerAuthServiceSecurityHardening(composeText) {
  const block = extractServiceBlock(composeText, "customer-auth");
  const checks = {
    "read_only: true": /read_only:\s*true/.test(block),
    "cap_drop: ALL": /cap_drop:\s*\n\s*-\s*ALL/.test(block),
    "no-new-privileges": /no-new-privileges:true/.test(block),
    "healthcheck": /healthcheck:/.test(block),
    "depends on healthy postgres": /depends_on:\s*\n\s*postgres:\s*\n\s*condition:\s*service_healthy/.test(block),
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  return { name: "customer-auth service is read-only, drops all capabilities, enables no-new-privileges, has a health check, and depends on a healthy postgres", passed: failed.length === 0, detail: failed.join(", ") };
}

export function checkAppDoesNotDependOnCustomerAuth(composeText) {
  const appBlock = extractServiceBlock(composeText, "app");
  const passed = !/customer-auth/.test(appBlock);
  return { name: "app service's own health/startup does not depend on the customer-auth service", passed };
}

export function checkWorkforceAuthServiceHasNoHostPort(composeText) {
  const block = extractServiceBlock(composeText, "workforce-auth");
  const failures = [];
  if (/^\s*ports:/m.test(block)) failures.push("workforce-auth service declares a ports: (host-published) mapping");
  if (!/expose:\s*\[\s*"?8082"?\s*\]|expose:\s*\n\s*-\s*"?8082"?/.test(block)) {
    failures.push('workforce-auth service does not expose "8082" container-only');
  }
  return { name: "workforce-auth service exposes 8082 container-only, never a published host port", passed: failures.length === 0, detail: failures.join("; ") };
}

export function checkWorkforceAuthServiceSecurityHardening(composeText) {
  const block = extractServiceBlock(composeText, "workforce-auth");
  const checks = {
    "read_only: true": /read_only:\s*true/.test(block),
    "cap_drop: ALL": /cap_drop:\s*\n\s*-\s*ALL/.test(block),
    "no-new-privileges": /no-new-privileges:true/.test(block),
    "healthcheck": /healthcheck:/.test(block),
    "depends on healthy postgres": /depends_on:\s*\n\s*postgres:\s*\n\s*condition:\s*service_healthy/.test(block),
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  return { name: "workforce-auth service is read-only, drops all capabilities, enables no-new-privileges, has a health check, and depends on a healthy postgres", passed: failed.length === 0, detail: failed.join(", ") };
}

export function checkWorkforceAuthEnvFilesAreIsolated(composeText) {
  const block = extractServiceBlock(composeText, "workforce-auth");
  const failures = [];
  if (/\.env\.customer-auth\.docker\.local/.test(block)) {
    failures.push("workforce-auth env_file includes .env.customer-auth.docker.local");
  }
  if (/\.env\.migration\.docker\.local/.test(block)) {
    failures.push("workforce-auth env_file includes .env.migration.docker.local");
  }
  if (!/\.env\.runtime\.docker\.local/.test(block) || !/\.env\.workforce-auth\.docker\.local/.test(block)) {
    failures.push("workforce-auth must use .env.runtime.docker.local and .env.workforce-auth.docker.local");
  }
  return {
    name: "workforce-auth receives runtime + workforce env files only (never customer-auth or migration)",
    passed: failures.length === 0,
    detail: failures.join("; "),
  };
}

export function checkAppDoesNotDependOnWorkforceAuth(composeText) {
  const appBlock = extractServiceBlock(composeText, "app");
  const passed = !/workforce-auth/.test(appBlock);
  return { name: "app service's own health/startup does not depend on the workforce-auth service", passed };
}

export function checkCustomerCommerceServiceHasNoHostPort(composeText) {
  const block = extractServiceBlock(composeText, "customer-commerce");
  const failures = [];
  if (/^\s*ports:/m.test(block)) failures.push("customer-commerce service declares a ports: (host-published) mapping");
  if (!/expose:\s*\[\s*"?8083"?\s*\]|expose:\s*\n\s*-\s*"?8083"?/.test(block)) {
    failures.push('customer-commerce service does not expose "8083" container-only');
  }
  return {
    name: "customer-commerce service exposes 8083 container-only, never a published host port",
    passed: failures.length === 0,
    detail: failures.join("; "),
  };
}

export function checkCustomerCommerceServiceSecurityHardening(composeText) {
  const block = extractServiceBlock(composeText, "customer-commerce");
  const checks = {
    "read_only: true": /read_only:\s*true/.test(block),
    "cap_drop: ALL": /cap_drop:\s*\n\s*-\s*ALL/.test(block),
    "no-new-privileges": /no-new-privileges:true/.test(block),
    "healthcheck": /healthcheck:/.test(block),
    "depends on healthy postgres": /depends_on:\s*\n\s*postgres:\s*\n\s*condition:\s*service_healthy/.test(block),
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  return {
    name: "customer-commerce service is read-only, drops all capabilities, enables no-new-privileges, has a health check, and depends on a healthy postgres",
    passed: failed.length === 0,
    detail: failed.join(", "),
  };
}

export function checkAppDoesNotDependOnCustomerCommerce(composeText) {
  const appBlock = extractServiceBlock(composeText, "app");
  const passed = !/customer-commerce/.test(appBlock);
  return {
    name: "app service's own health/startup does not depend on the customer-commerce service",
    passed,
  };
}

export function checkOperationsDockerTargetExists(dockerfileText) {
  const hasBuilder = /FROM\s+\S+\s+AS\s+operations-builder/i.test(dockerfileText);
  const hasDeps = /FROM\s+\S+\s+AS\s+operations-dependencies/i.test(dockerfileText);
  const hasRuntime = /FROM\s+\S+\s+AS\s+operations-runtime/i.test(dockerfileText);
  const builds = /npm run operations:build/.test(dockerfileText);
  const copiesDist = /dist-operations/.test(dockerfileText);
  const userNode = /AS\s+operations-runtime[\s\S]*?\bUSER\s+node\b/i.test(dockerfileText);
  const exposes = /AS\s+operations-runtime[\s\S]*?\bEXPOSE\s+8084\b/i.test(dockerfileText);
  const cmd =
    /AS\s+operations-runtime[\s\S]*?CMD\s*\[\s*"node"[\s\S]*?dist-operations\/server\/operations\/main\.js/i.test(
      dockerfileText,
    );
  const noSrcInRuntime = (() => {
    const section =
      dockerfileText.split(/FROM\s+\S+\s+AS\s+operations-runtime/i)[1]?.split(/FROM\s+\S+\s+AS\s+/i)[0] ??
      "";
    return !/\bCOPY\b[\s\S]*\bsrc\b/.test(section);
  })();
  const failures = [];
  if (!hasBuilder) failures.push("missing operations-builder");
  if (!hasDeps) failures.push("missing operations-dependencies");
  if (!hasRuntime) failures.push("missing operations-runtime");
  if (!builds) failures.push("missing operations:build");
  if (!copiesDist) failures.push("missing dist-operations copy");
  if (!userNode) failures.push("operations-runtime is not USER node");
  if (!exposes) failures.push("operations-runtime does not EXPOSE 8084");
  if (!cmd) failures.push("operations-runtime CMD is not compiled operations entrypoint");
  if (!noSrcInRuntime) failures.push("operations-runtime copies TypeScript src");
  return {
    name: "Operations Docker target builds non-root compiled runtime on 8084",
    passed: failures.length === 0,
    detail: failures.join("; "),
  };
}

export function checkOperationsServiceHasNoHostPort(composeText) {
  const block = extractServiceBlock(composeText, "operations");
  const failures = [];
  if (/^\s*ports:/m.test(block)) failures.push("operations service declares a ports: (host-published) mapping");
  if (!/expose:\s*\[\s*"?8084"?\s*\]|expose:\s*\n\s*-\s*"?8084"?/.test(block)) {
    failures.push('operations service does not expose "8084" container-only');
  }
  return {
    name: "operations service exposes 8084 container-only, never a published host port",
    passed: failures.length === 0,
    detail: failures.join("; "),
  };
}

export function checkOperationsServiceSecurityHardening(composeText) {
  const block = extractServiceBlock(composeText, "operations");
  const checks = {
    "read_only: true": /read_only:\s*true/.test(block),
    "cap_drop: ALL": /cap_drop:\s*\n\s*-\s*ALL/.test(block),
    "no-new-privileges": /no-new-privileges:true/.test(block),
    "healthcheck": /healthcheck:/.test(block),
    "depends on healthy postgres": /depends_on:\s*\n\s*postgres:\s*\n\s*condition:\s*service_healthy/.test(block),
    "live healthcheck on 8084": /127\.0\.0\.1:8084\/health\/live/.test(block),
  };
  const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
  return {
    name: "operations service is read-only, drops all capabilities, enables no-new-privileges, has a live health check, and depends on a healthy postgres",
    passed: failed.length === 0,
    detail: failed.join(", "),
  };
}

export function checkOperationsEnvFilesAreIsolated(composeText) {
  const block = extractServiceBlock(composeText, "operations");
  const failures = [];
  if (/\.env\.migration\.docker\.local/.test(block)) {
    failures.push("operations env_file includes .env.migration.docker.local");
  }
  if (/\.env\.customer-auth\.docker\.local/.test(block)) {
    failures.push("operations env_file includes .env.customer-auth.docker.local");
  }
  if (
    !/\.env\.runtime\.docker\.local/.test(block) ||
    !/\.env\.workforce-auth\.docker\.local/.test(block) ||
    !/\.env\.operations\.docker\.local/.test(block)
  ) {
    failures.push(
      "operations must use .env.runtime.docker.local, .env.workforce-auth.docker.local, and .env.operations.docker.local",
    );
  }
  return {
    name: "operations receives runtime + workforce-auth + operations env files only (never migration or customer-auth)",
    passed: failures.length === 0,
    detail: failures.join("; "),
  };
}

export function checkOperationsDoesNotDependOnWorkforceAuthService(composeText) {
  const block = extractServiceBlock(composeText, "operations");
  const dependsOnWorkforceAuth =
    /depends_on:[\s\S]*workforce-auth/.test(block) ||
    /^\s*workforce-auth:\s*$/m.test(block);
  return {
    name: "operations Compose service does not depend_on workforce-auth",
    passed: !dependsOnWorkforceAuth,
  };
}

export function checkAppDoesNotDependOnOperations(composeText) {
  const appBlock = extractServiceBlock(composeText, "app");
  const passed = !/operations/.test(appBlock);
  return {
    name: "app service's own health/startup does not depend on the operations service",
    passed,
  };
}

export function checkNginxProxiesOperations(nginxConfText) {
  const hasLocation = /location\s+\^~\s+\/api\/operations\/v1\//.test(nginxConfText);
  const hasUpstream = /operations:8084/.test(nginxConfText);
  const hasHealthProxy =
    /location[^{]*\/health\/(?:live|ready)/.test(nginxConfText) ||
    /proxy_pass[^\n]*operations[^\n]*health/.test(nginxConfText);
  const synthesizesOrigin =
    /proxy_set_header\s+Origin\s+/i.test(nginxConfText) ||
    /proxy_set_header\s+origin\s+/i.test(nginxConfText);
  const failures = [];
  if (!hasLocation) failures.push("missing /api/operations/v1/ location");
  if (!hasUpstream) failures.push("missing operations:8084 upstream");
  if (hasHealthProxy) failures.push("operations health endpoints appear publicly proxied");
  if (synthesizesOrigin) failures.push("nginx synthesizes/overwrites Origin");
  return {
    name: "nginx.conf proxies /api/operations/v1/ to operations:8084 without public health or Origin rewrite",
    passed: failures.length === 0,
    detail: failures.join("; "),
  };
}

export function checkNginxProxiesCustomerCommerce(nginxConfText) {
  const hasLocation = /location\s+\^~\s+\/api\/v1\//.test(nginxConfText);
  const hasUpstream = /customer-commerce:8083/.test(nginxConfText);
  const passed = hasLocation && hasUpstream;
  return {
    name: "nginx.conf proxies /api/v1/ to customer-commerce:8083",
    passed,
    detail: !passed ? `location=${hasLocation} upstream=${hasUpstream}` : undefined,
  };
}

export function checkNginxProxiesRazorpayWebhook(nginxConfText) {
  const hasExactLocation =
    /location\s+=\s+\/api\/integrations\/payments\/razorpay\/webhook/.test(nginxConfText);
  const hasUpstream = /customer-commerce:8083/.test(nginxConfText);
  const hasGenericIntegrationsProxy = /location\s+\^~\s+\/api\/integrations\//.test(nginxConfText);
  const passed = hasExactLocation && hasUpstream && !hasGenericIntegrationsProxy;
  return {
    name: "nginx.conf proxies exact Razorpay webhook path to customer-commerce:8083",
    passed,
    detail: !passed
      ? `exact=${hasExactLocation} upstream=${hasUpstream} generic=${hasGenericIntegrationsProxy}`
      : undefined,
  };
}

export function checkNoDockerSocketOrPrivileged(composeText) {
  const hasSocket = /docker\.sock/.test(composeText);
  const isPrivileged = /privileged:\s*true/.test(composeText);
  const hostNetwork = /network_mode:\s*host/.test(composeText);
  const failures = [];
  if (hasSocket) failures.push("Docker socket referenced");
  if (isPrivileged) failures.push("a service is privileged");
  if (hostNetwork) failures.push("a service uses host networking");
  return { name: "No Docker socket mount, privileged mode, or host networking anywhere in compose.yaml", passed: failures.length === 0, detail: failures.join("; ") };
}

export function checkToolingServicesUseToolsProfile(composeText) {
  const services = ["migrate", "db-check", "db-check-migration", "menu-import-existing", "menu-verify-existing"];
  const failures = services.filter((name) => {
    const block = extractServiceBlock(composeText, name);
    return !/profiles:\s*\[\s*"tools"\s*\]|profiles:\s*\n\s*-\s*tools/.test(block);
  });
  return { name: 'tooling profile services (migrate/db-check/menu-*) all use the "tools" Compose profile', passed: failures.length === 0, detail: failures.join(", ") };
}

export function checkMigrateDependsOnHealthyPostgres(composeText) {
  const block = extractServiceBlock(composeText, "migrate");
  const passed = /depends_on:\s*\n\s*postgres:\s*\n\s*condition:\s*service_healthy/.test(block);
  return { name: "migrate service depends on a healthy postgres service", passed };
}

export function checkNoCredentialsInTrackedFiles(fileContents) {
  // Looks for an assigned value that itself looks like a real secret
  // (long random-looking string) rather than a placeholder/interpolation —
  // committed templates only ever contain placeholders or ${VAR} refs.
  const suspicious = /=[A-Za-z0-9+/]{20,}(?!\s*[}$])/;
  const failures = Object.entries(fileContents)
    .filter(([, text]) => suspicious.test(text))
    .map(([name]) => name);
  return { name: "No credential-shaped literal value in Dockerfile, compose.yaml, or nginx.conf", passed: failures.length === 0, detail: failures.join(", ") };
}

export function checkGeneratedEnvFilesAreIgnored(gitignoreText) {
  const generated = [".env.runtime.docker.local", ".env.migration.docker.local", ".env.docker.local"];
  const exceptionPattern = /^!\.env/m;
  const hasWildcard = /^\.env\*/m.test(gitignoreText);
  const explicitlyUnignored = generated.filter((name) =>
    gitignoreText.split("\n").some((line) => line.trim() === `!${name}`),
  );
  const passed = hasWildcard && explicitlyUnignored.length === 0 && exceptionPattern.test(gitignoreText);
  return { name: "Generated Docker env files remain git-ignored (no explicit !exception)", passed };
}

export function checkOperationsBuildArtifactsIgnored(gitignoreText, dockerignoreText) {
  const gitIgnores =
    /(?:^|\/)dist-operations\b/m.test(gitignoreText) || /dist-operations/.test(gitignoreText);
  const dockerIgnores = /dist-operations/.test(dockerignoreText);
  const envCoveredByWildcard = /^\.env\*/m.test(gitignoreText) || /\.env\.operations\.docker\.local/.test(gitignoreText);
  const failures = [];
  if (!gitIgnores) failures.push("gitignore missing dist-operations");
  if (!dockerIgnores) failures.push("dockerignore missing dist-operations");
  if (!envCoveredByWildcard) failures.push("operations env file not git-ignored");
  return {
    name: "Operations dist and local Docker env are ignored from git and Docker build context",
    passed: failures.length === 0,
    detail: failures.join("; "),
  };
}

export function checkDockerignoreExcludesSecrets(dockerignoreText) {
  const required = [".git", "node_modules", ".env.*", ".env.docker.local", ".env.runtime.docker.local", ".env.migration.docker.local", ".env.customer-auth.docker.local", ".env.workforce-auth.docker.local", ".env.customer-commerce.docker.local", ".env.operations.docker.local", "dist-operations"];
  const missing = required.filter((pattern) => !dockerignoreText.includes(pattern));
  return { name: ".dockerignore excludes .git, node_modules, generated secret env files, and dist-operations", passed: missing.length === 0, detail: missing.join(", ") };
}

export function checkNoUnapprovedPublicBuildArgs(dockerfileText) {
  const declared = [...dockerfileText.matchAll(/ARG\s+(NEXT_PUBLIC_\w+)/g)].map((m) => m[1]);
  const approved = new Set(["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_GA_MEASUREMENT_ID", "NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY"]);
  const unapproved = declared.filter((name) => !approved.has(name));
  return { name: "Only the two approved NEXT_PUBLIC_* build args are declared", passed: unapproved.length === 0, detail: unapproved.join(", ") };
}

export function checkNoDatabaseUrlBuildArg(dockerfileText) {
  const builderSection = dockerfileText.split(/FROM\s+\S+\s+AS\s+builder/i)[1]?.split(/FROM\s+\S+\s+AS\s+tooling/i)[0] ?? "";
  const passed = !/DATABASE_URL/i.test(builderSection) && !/POSTGRES_/i.test(builderSection);
  return { name: "No database URL or PostgreSQL credential is accepted as a build argument", passed };
}

function anyFileMatches(dir, predicate) {
  if (!existsSync(dir)) return false;
  for (const entry of readdirSync(dir)) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      if (anyFileMatches(fullPath, predicate)) return true;
    } else if (predicate(entry, fullPath)) {
      return true;
    }
  }
  return false;
}

export function checkNoNewApiOrBusinessTable(projectRootDir) {
  const hasRouteHandler = anyFileMatches(path.join(projectRootDir, "src", "app"), (name) =>
    name === "route.ts" || name === "route.tsx",
  );
  const hasApiDir = existsSync(path.join(projectRootDir, "src", "app", "api"));
  const failures = [];
  if (hasRouteHandler) failures.push("a Route Handler (route.ts) exists under src/app");
  if (hasApiDir) failures.push("src/app/api exists");
  return { name: "No API route or business table was introduced in this slice", passed: failures.length === 0, detail: failures.join("; ") };
}

export function runAllChecks({ dockerfileText, composeText, nginxConfText, nextConfigText, gitignoreText, dockerignoreText, projectRootDir }) {
  return [
    { name: "Dockerfile exists", passed: dockerfileText.length > 0 },
    { name: "Multi-stage Dockerfile (base/dependencies/builder/tooling/web-runtime)", passed: [...dockerfileText.matchAll(/^FROM/gm)].length >= 5 },
    checkPinnedBaseImages(dockerfileText),
    checkFullyQualifiedExternalBaseImages(dockerfileText),
    checkComposeImageReferences(composeText),
    checkNodeServiceHealthchecks(composeText),
    checkNoFloatingImageTags(dockerfileText, composeText),
    checkFinalStageIsWebRuntime(dockerfileText),
    checkNoNodeServerAtRuntime(dockerfileText),
    checkStaticExportEnabled(nextConfigText),
    checkAppServiceHasNoDatabaseAccess(composeText),
    checkAppServiceSecurityHardening(composeText),
    checkCustomerAuthServiceHasNoHostPort(composeText),
    checkCustomerAuthServiceSecurityHardening(composeText),
    checkAppDoesNotDependOnCustomerAuth(composeText),
    checkWorkforceAuthServiceHasNoHostPort(composeText),
    checkWorkforceAuthServiceSecurityHardening(composeText),
    checkWorkforceAuthEnvFilesAreIsolated(composeText),
    checkAppDoesNotDependOnWorkforceAuth(composeText),
    checkCustomerCommerceServiceHasNoHostPort(composeText),
    checkCustomerCommerceServiceSecurityHardening(composeText),
    checkAppDoesNotDependOnCustomerCommerce(composeText),
    checkOperationsDockerTargetExists(dockerfileText),
    checkOperationsServiceHasNoHostPort(composeText),
    checkOperationsServiceSecurityHardening(composeText),
    checkOperationsEnvFilesAreIsolated(composeText),
    checkOperationsDoesNotDependOnWorkforceAuthService(composeText),
    checkAppDoesNotDependOnOperations(composeText),
    checkNginxProxiesOperations(nginxConfText),
    checkNginxProxiesCustomerCommerce(nginxConfText),
    checkNginxProxiesRazorpayWebhook(nginxConfText),
    checkNoDockerSocketOrPrivileged(composeText),
    checkToolingServicesUseToolsProfile(composeText),
    checkMigrateDependsOnHealthyPostgres(composeText),
    checkNoCredentialsInTrackedFiles({ "Dockerfile": dockerfileText, "compose.yaml": composeText, "docker/nginx/nginx.conf": nginxConfText }),
    checkGeneratedEnvFilesAreIgnored(gitignoreText),
    checkOperationsBuildArtifactsIgnored(gitignoreText, dockerignoreText),
    checkDockerignoreExcludesSecrets(dockerignoreText),
    checkNoUnapprovedPublicBuildArgs(dockerfileText),
    checkNoDatabaseUrlBuildArg(dockerfileText),
    checkNoNewApiOrBusinessTable(projectRootDir),
  ];
}

function main() {
  const dockerfileText = exists("Dockerfile") ? read("Dockerfile") : "";
  const composeText = exists("compose.yaml") ? read("compose.yaml") : "";
  const nginxConfText = exists("docker/nginx/nginx.conf") ? read("docker/nginx/nginx.conf") : "";
  const nextConfigText = exists("next.config.ts") ? read("next.config.ts") : "";
  const gitignoreText = exists(".gitignore") ? read(".gitignore") : "";
  const dockerignoreText = exists(".dockerignore") ? read(".dockerignore") : "";

  const results = runAllChecks({
    dockerfileText,
    composeText,
    nginxConfText,
    nextConfigText,
    gitignoreText,
    dockerignoreText,
    projectRootDir: projectRoot,
  });

  const failed = results.filter((r) => !r.passed);
  console.log("audit:docker — static Docker configuration audit");
  console.log("=".repeat(60));
  for (const result of results) {
    const marker = result.passed ? "PASS" : "FAIL";
    const detail = result.detail ? ` (${result.detail})` : "";
    console.log(`  [${marker}] ${result.name}${detail}`);
  }
  console.log("=".repeat(60));

  if (failed.length > 0) {
    console.error(`${failed.length} of ${results.length} check(s) failed.`);
    process.exitCode = 1;
    return;
  }
  console.log(`All ${results.length} checks passed.`);
  process.exitCode = 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
