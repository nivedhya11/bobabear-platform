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

function docker(args) {
  return execFileSync("docker", args, { encoding: "utf8" }).trim();
}

function dockerAvailable() {
  try {
    docker(["info"]);
    return true;
  } catch {
    return false;
  }
}

async function waitForNginx(origin) {
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      // Readiness is transport-level here. This fixture intentionally has no
      // root index.html, so a healthy Nginx may answer `/` with 404.
      await fetch(origin, { redirect: "manual" });
      return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError ?? new Error(`Nginx did not become available at ${origin}`);
}

describe("Nginx directory redirects", { skip: !dockerAvailable() }, () => {
  let fixtureRoot;
  let containerId;
  let origin;

  before(async () => {
    fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "boba-nginx-origin-"));
    // mkdtemp creates the root as 0700. The Nginx worker runs as a non-root
    // user and must be able to traverse the bind-mounted static document root.
    fs.chmodSync(fixtureRoot, 0o755);
    for (const route of directoryRoutes) {
      const directory = path.join(fixtureRoot, route.slice(1));
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, "index.html"), "<!doctype html>");
    }

    // The production web-runtime copies this script into the official Nginx
    // entrypoint directory and marks it executable. Mirror that setup here so
    // nginx.conf can include the runtime-generated resolver fragment.
    const resolverScript = path.join(fixtureRoot, "40-boba-runtime-resolver.sh");
    fs.copyFileSync(
      path.join(repositoryRoot, "docker/nginx/40-boba-runtime-resolver.sh"),
      resolverScript,
    );
    fs.chmodSync(resolverScript, 0o755);

    containerId = docker([
      "run", "--rm", "-d", "-p", "127.0.0.1::8080",
      "--tmpfs", "/tmp", "--tmpfs", "/var/cache/nginx", "--tmpfs", "/var/run",
      "-v", `${path.join(repositoryRoot, "docker/nginx/nginx.conf")}:/etc/nginx/nginx.conf:ro`,
      "-v", `${resolverScript}:/docker-entrypoint.d/40-boba-runtime-resolver.sh:ro`,
      "-v", `${fixtureRoot}:/usr/share/nginx/html:ro`,
      nginxImage,
    ]);
    const binding = docker(["port", containerId, "8080/tcp"]);
    const port = binding.match(/:(\d+)\s*$/)?.[1];
    assert.ok(port, `could not determine published Nginx port from ${binding}`);
    origin = `http://127.0.0.1:${port}`;
    await waitForNginx(origin);
  });

  after(() => {
    if (containerId) execFileSync("docker", ["rm", "-f", containerId], { stdio: "ignore" });
    if (fixtureRoot) fs.rmSync(fixtureRoot, { recursive: true, force: true });
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
});
