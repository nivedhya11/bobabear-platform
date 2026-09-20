/**
 * Candidate provenance for IMP-037 recovery evidence (no secrets).
 */
import { spawnSync } from "node:child_process";
import path from "node:path";
import { redactText } from "./redact.mjs";

/**
 * @typedef {object} CandidateProvenance
 * @property {string} repositoryPath
 * @property {string} branch
 * @property {string} commitSha
 * @property {string} tree
 */

/**
 * Soft-fail candidate resolver. Missing git yields empty string fields (never throws secrets).
 *
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {(args: string[], opts: { cwd: string, env: NodeJS.ProcessEnv }) => { status: number, stdout: string, stderr?: string }} [options.execGit]
 * @returns {CandidateProvenance}
 */
export function resolveCandidateProvenance(options = {}) {
  const cwd = typeof options.cwd === "string" && options.cwd.length > 0 ? options.cwd : process.cwd();
  const env = options.env ?? process.env;
  const execGit =
    options.execGit ??
    ((args, opts) => {
      const result = spawnSync("git", args, {
        cwd: opts.cwd,
        env: opts.env,
        encoding: "utf8",
        timeout: 10_000,
      });
      return {
        status: typeof result.status === "number" ? result.status : 1,
        stdout: typeof result.stdout === "string" ? result.stdout : "",
        stderr: typeof result.stderr === "string" ? result.stderr : "",
      };
    });

  /** @type {CandidateProvenance} */
  const empty = {
    repositoryPath: "",
    branch: "",
    commitSha: "",
    tree: "",
  };

  try {
    const top = runGit(execGit, ["rev-parse", "--show-toplevel"], cwd, env);
    const repositoryPath = top ? path.resolve(top) : "";
    const branch = runGit(execGit, ["rev-parse", "--abbrev-ref", "HEAD"], cwd, env);
    const commitSha = runGit(execGit, ["rev-parse", "HEAD"], cwd, env);
    const tree = runGit(execGit, ["rev-parse", "HEAD^{tree}"], cwd, env);
    return {
      repositoryPath: sanitizeField(repositoryPath),
      branch: sanitizeField(branch),
      commitSha: sanitizeField(commitSha),
      tree: sanitizeField(tree),
    };
  } catch {
    return empty;
  }
}

/**
 * @param {(args: string[], opts: { cwd: string, env: NodeJS.ProcessEnv }) => { status: number, stdout: string }} execGit
 * @param {string[]} args
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} env
 * @returns {string}
 */
function runGit(execGit, args, cwd, env) {
  const result = execGit(args, { cwd, env });
  if (!result || result.status !== 0) return "";
  return String(result.stdout ?? "").trim();
}

/**
 * @param {string} value
 * @returns {string}
 */
function sanitizeField(value) {
  if (typeof value !== "string") return "";
  return redactText(value).trim();
}
