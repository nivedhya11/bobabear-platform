import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const nginxImage = "docker.io/library/nginx:1.30.4-alpine3.24";
const directoryRoutes = ["/order", "/login", "/order/cart", "/privacy"];

function resolveContainerCli() {
  for (const cli of ["docker", "podman"]) {
    try {
      execFileSync(cli, ["info"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      });
      return cli;
    } catch {
      // try next
    }
  }
  return null;
}

const containerCli = resolveContainerCli();

function docker(args) {
  return execFileSync(containerCli, args, { encoding: "utf8" }).trim();
}

function dockerDiagnostic(args) {
  try {
    return execFileSync(containerCli, args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const stdout =
      typeof error.stdout === "string" ? error.stdout.trim() : "";
    const stderr =
      typeof error.stderr === "string" ? error.stderr.trim() : "";

    return [stdout, stderr].filter(Boolean).join("\n");
  }
}

function inspectContainerState(containerId) {
  return dockerDiagnostic([
    "inspect",
    "--format",
    "status={{.State.Status}} running={{.State.Running}} exitCode={{.State.ExitCode}} oomKilled={{.State.OOMKilled}} error={{json .State.Error}}",
    containerId,
  ]);
}

function readContainerLogs(containerId) {
  return dockerDiagnostic(["logs", containerId]);
}

function dockerAvailable() {
  return containerCli !== null;
}

async function waitForNginx(origin, containerId) {
  let lastError;

  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(origin, { redirect: "manual" });
      if (response.ok) return;

      lastError = new Error(
        `Nginx readiness returned HTTP ${response.status}`,
      );
    } catch (error) {
      lastError = error;
    }

    const running = dockerDiagnostic([
      "inspect",
      "--format",
      "{{.State.Running}}",
      containerId,
    ]);

    if (running === "false") {
      const state = inspectContainerState(containerId);
      const logs = readContainerLogs(containerId);

      throw new Error(
        [
          "Nginx container exited before readiness.",
          `state: ${state || "<unavailable>"}`,
          "container logs:",
          logs || "<empty>",
          `last readiness error: ${
            lastError instanceof Error
              ? lastError.message
              : String(lastError)
          }`,
        ].join("\n"),
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const state = inspectContainerState(containerId);
  const logs = readContainerLogs(containerId);

  throw new Error(
    [
      `Nginx did not become ready at ${origin}.`,
      `state: ${state || "<unavailable>"}`,
      "container logs:",
      logs || "<empty>",
      `last readiness error: ${
        lastError instanceof Error
          ? lastError.message
          : String(lastError)
      }`,
    ].join("\n"),
  );
}

describe("Nginx directory redirects", { skip: !dockerAvailable() }, () => {
  let fixtureRoot;
  let bootstrapRoot;
  let containerId;
  let origin;

  before(async () => {
    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "boba-nginx-origin-"));

    // Production makes /usr/share/nginx/html recursively readable and
    // directory-traversable before switching to the non-root nginx user.
    // Reproduce that permission boundary for this bind-mounted fixture.
    fs.chmodSync(fixtureRoot, 0o755);

    for (const route of directoryRoutes) {
      const directory = path.join(fixtureRoot, route.slice(1));

      fs.mkdirSync(directory, {
        recursive: true,
        mode: 0o755,
      });
      fs.chmodSync(directory, 0o755);

      const indexPath = path.join(directory, "index.html");
      fs.writeFileSync(indexPath, "<!doctype html>", {
        mode: 0o644,
      });
      fs.chmodSync(indexPath, 0o644);
    }

    // Reproduce production Dockerfile: COPY + chmod 755 into /docker-entrypoint.d/
    // without changing the tracked mode of the repository bootstrap script.
    bootstrapRoot = fs.mkdtempSync(path.join(os.tmpdir(), "boba-nginx-bootstrap-"));
    const resolverBootstrap = path.join(bootstrapRoot, "40-boba-runtime-resolver.sh");
    fs.copyFileSync(
      path.join(repositoryRoot, "docker/nginx/40-boba-runtime-resolver.sh"),
      resolverBootstrap,
    );
    fs.chmodSync(resolverBootstrap, 0o755);

    containerId = docker([
      "run", "--rm", "-d", "-p", "127.0.0.1::8080",
      "--tmpfs", "/tmp", "--tmpfs", "/var/cache/nginx", "--tmpfs", "/var/run",
      "-v", `${path.join(repositoryRoot, "docker/nginx/nginx.conf")}:/etc/nginx/nginx.conf:ro`,
      "-v", `${path.join(repositoryRoot, "docker/nginx/cloudflare-real-ip.conf")}:/etc/nginx/boba/cloudflare-real-ip.conf:ro`,
      "-v", `${path.join(repositoryRoot, "docker/nginx/security-headers.conf")}:/etc/nginx/boba/security-headers.conf:ro`,
      "-v", `${resolverBootstrap}:/docker-entrypoint.d/40-boba-runtime-resolver.sh:ro`,
      "-v", `${fixtureRoot}:/usr/share/nginx/html:ro`,
      nginxImage,
    ]);
    const binding = docker(["port", containerId, "8080/tcp"]);
    const port = binding.match(/:(\d+)\s*$/)?.[1];
    assert.ok(port, `could not determine published Nginx port from ${binding}`);
    origin = `http://127.0.0.1:${port}`;
    await waitForNginx(`${origin}/order/`, containerId);
  });

  after(() => {
    if (containerId) {
      try {
        execFileSync(containerCli, ["rm", "-f", containerId], {
          stdio: "ignore",
        });
      } catch {
        // Container may already have been removed by --rm.
      }
    }
    if (fixtureRoot) fs.rmSync(fixtureRoot, { recursive: true, force: true });
    if (bootstrapRoot) fs.rmSync(bootstrapRoot, { recursive: true, force: true });
  });

  for (const route of directoryRoutes) {
    it(`redirects ${route} without exposing the internal listener`, async () => {
      const response = await fetch(`${origin}${route}`, { redirect: "manual" });
      assert.ok(response.status >= 300 && response.status < 400, `expected redirect, got ${response.status}`);
      const location = response.headers.get("location");
      assert.equal(location, `${route}/`);
      assert.doesNotMatch(location, /:8080(?:\/|$)/);
    });
  }

  it("serves IMP-038 security headers and enforcing CSP on the static path", async () => {
    const response = await fetch(`${origin}/order/`, { redirect: "manual" });
    assert.equal(response.status, 200);
    const csp = response.headers.get("content-security-policy");
    assert.ok(csp, "expected Content-Security-Policy");
    assert.equal(response.headers.get("content-security-policy-report-only"), null);
    assert.match(csp, /frame-ancestors 'self'/);
    assert.match(csp, /https:\/\/checkout\.razorpay\.com/);
    assert.match(csp, /https:\/\/challenges\.cloudflare\.com/);
    assert.match(csp, /https:\/\/maps\.googleapis\.com/);
    assert.match(csp, /https:\/\/maps\.gstatic\.com/);
    assert.match(csp, /https:\/\/fonts\.googleapis\.com/);
    assert.match(csp, /https:\/\/fonts\.gstatic\.com/);
    // Default committed CSP omits GA hosts (GA disabled). Generator unit
    // tests cover the GA-enabled allowlist variant.
    assert.doesNotMatch(csp, /googletagmanager/);
    assert.doesNotMatch(csp, /google-analytics/);
    assert.doesNotMatch(csp, /script-src[^;]*\*/);
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
    assert.equal(response.headers.get("referrer-policy"), "strict-origin-when-cross-origin");
    assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
    assert.match(response.headers.get("strict-transport-security") ?? "", /max-age=63072000/);
    assert.match(response.headers.get("permissions-policy") ?? "", /camera=\(\)/);
  });

  it("config replaces X-Forwarded-For with verified remote_addr (not append)", () => {
    const conf = fs.readFileSync(
      path.join(repositoryRoot, "docker/nginx/nginx.conf"),
      "utf8",
    );
    assert.match(conf, /proxy_set_header X-Forwarded-For \$remote_addr;/);
    assert.doesNotMatch(conf, /proxy_add_x_forwarded_for/);
    assert.match(conf, /include \/etc\/nginx\/boba\/cloudflare-real-ip\.conf;/);
    assert.match(conf, /include \/etc\/nginx\/boba\/security-headers\.conf;/);
  });
});
