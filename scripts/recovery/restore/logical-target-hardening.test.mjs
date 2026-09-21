import assert from "node:assert/strict";
import { test } from "node:test";
import { generateRunId } from "../run-id.mjs";
import { redactText, safeJson } from "../redact.mjs";
import {
  NETWORK_OWNERSHIP_LABEL_OWNED,
  NETWORK_OWNERSHIP_LABEL_RUN_ID,
  cleanupProvisionedTarget,
  inspectNetworkInternal,
  provisionLogicalTarget,
  removeOwnedNetwork,
} from "./provision.mjs";

function createNetworkAwareExecFn(options = {}) {
  const {
    runId,
    publishedPort = "55432",
    internal = true,
    labels,
    foreignRunId,
  } = options;
  /** @type {string | null} */
  let createdNetwork = null;
  /** @type {string | null} */
  let createdContainer = null;
  /** @type {string[]} */
  const removedNetworks = [];

  const defaultLabels = {
    [NETWORK_OWNERSHIP_LABEL_OWNED]: "1",
    [NETWORK_OWNERSHIP_LABEL_RUN_ID]: runId,
  };

  const execFn = (_command, args) => {
    if (args[0] === "inspect" && args[1] && !String(args[1]).startsWith("boba-rec-net")) {
      return { status: 1, stdout: "", stderr: "missing" };
    }
    if (args[0] === "network" && args[1] === "inspect") {
      const name = args[2];
      if (createdNetwork !== name && !options.preexistingNetwork) {
        return { status: 1, stdout: "", stderr: "Error: network not found" };
      }
      return {
        status: 0,
        stdout: JSON.stringify([
          {
            Name: name,
            Internal: internal,
            Labels: labels ?? defaultLabels,
          },
        ]),
        stderr: "",
      };
    }
    if (args[0] === "network" && args[1] === "create") {
      assert.equal(args.includes("--internal"), true);
      const name = args[args.length - 1];
      createdNetwork = name;
      return { status: 0, stdout: name, stderr: "" };
    }
    if (args[0] === "network" && args[1] === "rm") {
      removedNetworks.push(args[2]);
      if (foreignRunId && labels?.[NETWORK_OWNERSHIP_LABEL_RUN_ID] === foreignRunId) {
        return { status: 1, stdout: "", stderr: "should not reach rm for foreign" };
      }
      createdNetwork = null;
      return { status: 0, stdout: "", stderr: "" };
    }
    if (args[0] === "run") {
      assert.equal(args.includes("--network"), true);
      assert.equal(args.includes(createdNetwork), true);
      assert.equal(args.includes("127.0.0.1::5432"), true);
      createdContainer = args[args.indexOf("--name") + 1];
      return { status: 0, stdout: "cid", stderr: "" };
    }
    if (args[0] === "port") {
      return { status: 0, stdout: `127.0.0.1:${publishedPort}`, stderr: "" };
    }
    if (args[0] === "exec" && args.includes("pg_isready")) {
      return { status: 0, stdout: "accepting connections", stderr: "" };
    }
    if (args[0] === "rm") {
      createdContainer = null;
      return { status: 0, stdout: "", stderr: "" };
    }
    return { status: 0, stdout: "", stderr: "" };
  };

  return { execFn, getCreatedNetwork: () => createdNetwork, getRemovedNetworks: () => removedNetworks, getCreatedContainer: () => createdContainer };
}

test("logical target password is not derived from RUN_ID and publish is loopback-only", async () => {
  const runId = generateRunId({
    now: new Date(Date.UTC(2026, 8, 20, 15, 0, 0)),
    randomHex: "eeeeeeeeeeeeeeee",
  });
  const { execFn } = createNetworkAwareExecFn({ runId });
  const result = await provisionLogicalTarget({
    runId,
    sourceIdentity: "prod-db-1",
    sourceClassification: "production",
    sourceDatabaseUrl: "postgresql://prod@10.0.0.5:5432/boba_prod",
    containerCli: "docker",
    execFn,
  });
  assert.equal(result.ok, true, result.reason);
  assert.match(result.target.databaseUrl, /^postgresql:\/\/boba_recovery:[^@]+@127\.0\.0\.1:55432\/boba_recovery$/);
  assert.equal(result.target.hostPort, 55432);
  assert.ok(result.target.networkName);
  assert.equal(result.target.networkInternalVerified, true);
  assert.equal(result.target.productionDnsAbsentVerified, true);

  const password = new URL(result.target.databaseUrl).password;
  assert.doesNotMatch(password, new RegExp(runId));
  assert.doesNotMatch(safeJson(result), new RegExp(password));
  assert.doesNotMatch(redactText(result.target.databaseUrl), new RegExp(password));
  assert.match(redactText(result.target.databaseUrl), /\[REDACTED\]/);

  const nonLoopbackRunId = generateRunId({
    now: new Date(Date.UTC(2026, 8, 20, 15, 1, 0)),
    randomHex: "ffffffffffffffff",
  });
  /** @type {string | null} */
  let nonLoopbackNetwork = null;
  const nonLoopback = await provisionLogicalTarget({
    runId: nonLoopbackRunId,
    sourceIdentity: "prod-db-1",
    sourceDatabaseUrl: "postgresql://prod@10.0.0.5:5432/boba_prod",
    containerCli: "docker",
    execFn: (_command, args) => {
      if (args[0] === "inspect") return { status: 1, stdout: "", stderr: "missing" };
      if (args[0] === "network" && args[1] === "inspect") {
        if (!nonLoopbackNetwork || args[2] !== nonLoopbackNetwork) {
          return { status: 1, stdout: "", stderr: "network not found" };
        }
        return {
          status: 0,
          stdout: JSON.stringify([
            {
              Name: args[2],
              Internal: true,
              Labels: {
                [NETWORK_OWNERSHIP_LABEL_OWNED]: "1",
                [NETWORK_OWNERSHIP_LABEL_RUN_ID]: nonLoopbackRunId,
              },
            },
          ]),
          stderr: "",
        };
      }
      if (args[0] === "network" && args[1] === "create") {
        nonLoopbackNetwork = args.at(-1);
        return { status: 0, stdout: nonLoopbackNetwork, stderr: "" };
      }
      if (args[0] === "network" && args[1] === "rm") return { status: 0, stdout: "", stderr: "" };
      if (args[0] === "run") return { status: 0, stdout: "cid", stderr: "" };
      if (args[0] === "port") return { status: 0, stdout: "0.0.0.0:55433", stderr: "" };
      if (args[0] === "rm") return { status: 0, stdout: "", stderr: "" };
      return { status: 0, stdout: "", stderr: "" };
    },
  });
  assert.equal(nonLoopback.ok, false);
  assert.equal(nonLoopback.code, "TARGET_PUBLISH_NOT_LOOPBACK");
});

test("non-internal network after create → BLOCKED", async () => {
  const runId = generateRunId({
    now: new Date(Date.UTC(2026, 8, 21, 10, 0, 0)),
    randomHex: "1111111111111111",
  });
  const { execFn } = createNetworkAwareExecFn({ runId, internal: false });
  const result = await provisionLogicalTarget({
    runId,
    sourceIdentity: "prod-db-1",
    sourceDatabaseUrl: "postgresql://prod@10.0.0.5:5432/boba_prod",
    containerCli: "docker",
    execFn,
  });
  assert.equal(result.ok, false);
  assert.equal(result.code, "NETWORK_NOT_INTERNAL");
});

test("wrong/unowned network cannot be removed", () => {
  const runId = generateRunId({
    now: new Date(Date.UTC(2026, 8, 21, 10, 1, 0)),
    randomHex: "2222222222222222",
  });
  const otherRun = generateRunId({
    now: new Date(Date.UTC(2026, 8, 21, 10, 2, 0)),
    randomHex: "3333333333333333",
  });
  const execFn = (_command, args) => {
    if (args[0] === "network" && args[1] === "inspect") {
      return {
        status: 0,
        stdout: JSON.stringify([
          {
            Name: args[2],
            Internal: true,
            Labels: {
              [NETWORK_OWNERSHIP_LABEL_OWNED]: "1",
              [NETWORK_OWNERSHIP_LABEL_RUN_ID]: otherRun,
            },
          },
        ]),
        stderr: "",
      };
    }
    if (args[0] === "network" && args[1] === "rm") {
      assert.fail("must not remove unowned network");
    }
    return { status: 0, stdout: "", stderr: "" };
  };
  const refused = removeOwnedNetwork(execFn, "docker", {
    networkName: "boba-rec-net-foreign",
    runId,
  });
  assert.equal(refused.ok, false);
  assert.equal(refused.code, "NETWORK_CLEANUP_OWNERSHIP_AMBIGUOUS");

  const missingLabels = removeOwnedNetwork(
    (_c, args) => {
      if (args[0] === "network" && args[1] === "inspect") {
        return {
          status: 0,
          stdout: JSON.stringify([{ Name: args[2], Internal: true, Labels: {} }]),
          stderr: "",
        };
      }
      return { status: 0, stdout: "", stderr: "" };
    },
    "docker",
    { networkName: "boba-rec-net-nolabel", runId },
  );
  assert.equal(missingLabels.ok, false);
  assert.equal(missingLabels.code, "NETWORK_CLEANUP_OWNERSHIP_AMBIGUOUS");
});

test("target cleanup also cleans only its own network", async () => {
  const runId = generateRunId({
    now: new Date(Date.UTC(2026, 8, 21, 10, 3, 0)),
    randomHex: "4444444444444444",
  });
  const { execFn, getRemovedNetworks, getCreatedNetwork } = createNetworkAwareExecFn({ runId });
  const provisioned = await provisionLogicalTarget({
    runId,
    sourceIdentity: "prod-db-1",
    sourceDatabaseUrl: "postgresql://prod@10.0.0.5:5432/boba_prod",
    containerCli: "docker",
    execFn,
  });
  assert.equal(provisioned.ok, true, provisioned.reason);
  const networkName = provisioned.target.networkName;
  assert.equal(networkName, getCreatedNetwork());

  const cleaned = cleanupProvisionedTarget(provisioned.target, { execFn });
  assert.equal(cleaned.ok, true, cleaned.reason);
  assert.deepEqual(getRemovedNetworks(), [networkName]);
});

test("inspectNetworkInternal reads docker Internal and podman internal", () => {
  const docker = inspectNetworkInternal(
    () => ({
      status: 0,
      stdout: JSON.stringify([{ Name: "n1", Internal: true, Labels: {} }]),
      stderr: "",
    }),
    "docker",
    "n1",
  );
  assert.equal(docker.ok, true);
  assert.equal(docker.internal, true);

  const podman = inspectNetworkInternal(
    () => ({
      status: 0,
      stdout: JSON.stringify([{ name: "n2", internal: true, labels: {} }]),
      stderr: "",
    }),
    "podman",
    "n2",
  );
  assert.equal(podman.ok, true);
  assert.equal(podman.internal, true);

  const bridge = inspectNetworkInternal(
    () => ({
      status: 0,
      stdout: JSON.stringify([{ Name: "bridge", Internal: false }]),
      stderr: "",
    }),
    "docker",
    "bridge",
  );
  assert.equal(bridge.ok, true);
  assert.equal(bridge.internal, false);
});
