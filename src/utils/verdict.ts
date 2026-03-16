import { ScenarioStatus, DetectionVerdict } from "../types";

export function getVerdict(status: ScenarioStatus): DetectionVerdict {
  if (status === "blocked" || status === "mitigated") return "detected";
  if (status === "completed" || status === "failed") return "not_detected";
  return "pending";
}
