/**
 * Unit tests for the pure confirmation/command-construction helpers backing
 * scripts/database/reset-local.mjs (IMP-004). These tests never invoke
 * Docker — `buildResetPlan()` only proves the *shape* of the commands that
 * would run (project + service scoping), and `main()` is never called here.
 */
import { describe, expect, it } from "vitest";

import {
  COMPOSE_PROJECT_NAME,
  COMPOSE_SERVICE,
  REQUIRED_CONFIRMATION,
  buildResetPlan,
  isConfirmed,
  parseConfirmation,
} from "../../../scripts/database/reset-local.mjs";

describe("parseConfirmation", () => {
  it("returns null when no --confirm flag is present", () => {
    expect(parseConfirmation([])).toBeNull();
  });

  it("parses --confirm=<token>", () => {
    expect(parseConfirmation(["--confirm=SOMETHING"])).toBe("SOMETHING");
  });

  it("parses --confirm <token> as two args", () => {
    expect(parseConfirmation(["--confirm", "SOMETHING"])).toBe("SOMETHING");
  });
});

describe("isConfirmed", () => {
  it("rejects a missing confirmation", () => {
    expect(isConfirmed(null)).toBe(false);
  });

  it("rejects an incorrect confirmation", () => {
    expect(isConfirmed("WRONG")).toBe(false);
    expect(isConfirmed("reset_boba_bear_local_database")).toBe(false);
  });

  it("accepts the exact required token", () => {
    expect(isConfirmed(REQUIRED_CONFIRMATION)).toBe(true);
    expect(REQUIRED_CONFIRMATION).toBe("RESET_BOBA_BEAR_LOCAL_DATABASE");
  });
});

describe("buildResetPlan", () => {
  it("only ever targets the boba-bear Compose project and postgres service", () => {
    const plan = buildResetPlan();
    const composeSteps = plan.filter(
      (step: { command: string }) => step.command === "docker",
    );
    expect(composeSteps.length).toBeGreaterThan(0);
    for (const step of composeSteps) {
      expect(step.args).toContain("--project-name");
      expect(step.args).toContain(COMPOSE_PROJECT_NAME);
      expect(COMPOSE_PROJECT_NAME).toBe("boba-bear");
      expect(COMPOSE_SERVICE).toBe("postgres");
    }
  });

  it("includes exactly one destructive down --volumes step", () => {
    const plan = buildResetPlan();
    const destructiveSteps = plan.filter(
      (step: { args: string[] }) => step.args.includes("down") && step.args.includes("--volumes"),
    );
    expect(destructiveSteps).toHaveLength(1);
  });

  it("never includes a broad volume prune", () => {
    const plan = buildResetPlan();
    for (const step of plan) {
      expect(step.args.join(" ")).not.toContain("prune");
    }
  });
});
