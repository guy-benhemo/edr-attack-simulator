import { ScenarioStatus } from "../types";

export type RunOutcome = "executed" | "protected";

export function getOutcome(status: ScenarioStatus): RunOutcome {
  if (status === "completed") return "executed";
  return "protected";
}
