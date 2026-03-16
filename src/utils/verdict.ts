import { ScenarioStatus } from "../types";

export type RunOutcome = "executed" | "stopped" | "error" | "pending";

export function getOutcome(status: ScenarioStatus): RunOutcome {
  if (status === "completed") return "executed";
  if (status === "blocked" || status === "mitigated") return "stopped";
  if (status === "failed") return "error";
  return "pending";
}
