#!/usr/bin/env node
/**
 * Unit tests for IMP-038 Trivy production-image scan gate (no live builds).
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  TRIVY_VERSION,
  TRIVY_SHA256,
  PRODUCTION_IMAGE_TARGETS,
  buildArgsForTarget,
  trivyImageArgs,
  resolveContainerCli,
  imageExists,
  ensureImageBuilt,
} from "./run-trivy.mjs";

test("Trivy pin is immutable version + sha256 hex", () => {
  assert.equal(TRIVY_VERSION, "0.69.3");
  assert.match(TRIVY_SHA256, /^[a-f0-9]{64}$/);
});

test("PRODUCTION_IMAGE_TARGETS covers V1 deployable runtimes + postgres", () => {
  const ids = PRODUCTION_IMAGE_TARGETS.map((t) => t.id).sort();
  assert.deepEqual(ids, [
    "customer-auth-runtime",
    "customer-commerce-runtime",
    "operations-runtime",
    "postgres",
    "web-runtime",
    "workforce-auth-runtime",
  ]);
  for (const t of PRODUCTION_IMAGE_TARGETS) {
    assert.ok(t.image.endsWith(":trivy"), `image tag for ${t.id}`);
    assert.ok(t.dockerfile.length > 0);
  }
  const postgres = PRODUCTION_IMAGE_TARGETS.find((t) => t.id === "postgres");
  assert.equal(postgres?.dockerfile, "docker/postgres/Dockerfile");
  assert.equal(postgres?.target, null);
});

test("buildArgsForTarget includes --target when set", () => {
  assert.deepEqual(
    buildArgsForTarget({
      id: "web-runtime",
      image: "boba-bear-app:trivy",
      dockerfile: "Dockerfile",
      context: ".",
      target: "web-runtime",
    }),
    [
      "build",
      "--network=host",
      "-f",
      "Dockerfile",
      "-t",
      "boba-bear-app:trivy",
      "--target",
      "web-runtime",
      ".",
    ],
  );
  assert.deepEqual(
    buildArgsForTarget({
      id: "postgres",
      image: "boba-bear-postgres:trivy",
      dockerfile: "docker/postgres/Dockerfile",
      context: ".",
      target: null,
    }),
    ["build", "--network=host", "-f", "docker/postgres/Dockerfile", "-t", "boba-bear-postgres:trivy", "."],
  );
});

test("trivyImageArgs uses image mode fail-closed CRITICAL,HIGH + ignorefile", () => {
  const args = trivyImageArgs("boba-bear-app:trivy", "/repo/.trivyignore");
  assert.equal(args[0], "image");
  assert.equal(args[1], "boba-bear-app:trivy");
  assert.ok(args.includes("CRITICAL,HIGH"));
  assert.ok(args.includes("--exit-code"));
  assert.ok(args.includes("1"));
  assert.ok(args.includes("vuln,misconfig"));
  assert.ok(args.includes("--ignore-unfixed"));
  assert.ok(args.includes("/repo/.trivyignore"));
  assert.ok(!args.includes("fs"));
});

test("resolveContainerCli prefers working podman then docker; fails closed", () => {
  const calls = [];
  const spawn = (cmd, args) => {
    calls.push([cmd, ...args]);
    if (cmd === "podman") return { status: 0 };
    return { status: 1 };
  };
  assert.equal(resolveContainerCli("", spawn), "podman");
  assert.deepEqual(calls[0], ["podman", "info"]);
});

test("resolveContainerCli fails when neither engine works", () => {
  assert.throws(
    () => resolveContainerCli("", () => ({ status: 1 })),
    /CONTAINER_CLI_UNAVAILABLE/,
  );
});

test("ensureImageBuilt fails closed when skip-build and image missing", () => {
  const spawn = (cmd, args) => {
    if (args[0] === "image" && (args[1] === "exists" || args[1] === "inspect")) {
      return { status: 1 };
    }
    return { status: 0 };
  };
  assert.throws(
    () =>
      ensureImageBuilt({
        cli: "podman",
        target: PRODUCTION_IMAGE_TARGETS[0],
        cwd: "/tmp",
        skipBuild: true,
        spawn,
      }),
    /IMAGE_MISSING/,
  );
});

test("ensureImageBuilt invokes container build when not skipping", () => {
  /** @type {string[][]} */
  const builds = [];
  const spawn = (cmd, args, opts) => {
    builds.push([cmd, ...args]);
    assert.equal(opts?.cwd, "/repo");
    return { status: 0 };
  };
  ensureImageBuilt({
    cli: "podman",
    target: PRODUCTION_IMAGE_TARGETS[0],
    cwd: "/repo",
    skipBuild: false,
    spawn,
  });
  assert.equal(builds.length, 1);
  assert.equal(builds[0][0], "podman");
  assert.equal(builds[0][1], "build");
  assert.ok(builds[0].includes("--target"));
});

test("imageExists accepts podman image exists success", () => {
  assert.equal(
    imageExists("podman", "boba-bear-app:trivy", () => ({ status: 0 })),
    true,
  );
  assert.equal(
    imageExists("docker", "boba-bear-app:trivy", (cmd, args) => {
      if (args[1] === "exists") return { status: 1 };
      if (args[1] === "inspect") return { status: 0 };
      return { status: 1 };
    }),
    true,
  );
});
