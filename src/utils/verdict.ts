import { ScenarioStatus } from "../types";

/**
 * `errored` is deliberately distinct from `protected`. A scenario the runner
 * could not start tells us nothing about the endpoint's defences, and folding
 * it into "blocked" would overstate coverage.
 */
export type RunOutcome = "executed" | "protected" | "errored";

export function getOutcome(status: ScenarioStatus): RunOutcome {
  if (status === "completed") return "executed";
  if (status === "failed") return "errored";
  return "protected";
}

/** A scenario the runner has finished with, whatever the verdict. */
export function isSettled(status: ScenarioStatus): boolean {
  return (
    status === "completed" ||
    status === "blocked" ||
    status === "mitigated" ||
    status === "failed"
  );
}
