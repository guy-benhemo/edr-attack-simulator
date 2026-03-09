export type ScenarioStatus =
  | "ready"
  | "executing"
  | "blocked"
  | "completed"
  | "failed";

export type ThreatCategory =
  | "Static Detection"
  | "Behavioral"
  | "Reconnaissance"
  | "Persistence"
  | "Exfiltration"
  | "LOLBin"
  | "Credential Access";

export interface Scenario {
  id: string;
  name: string;
  description: string;
  category: ThreatCategory;
  status: ScenarioStatus;
  message?: string;
  lastRunAt?: string;
}

export interface ExecutionResult {
  scenarioId: string;
  status: "blocked" | "completed" | "failed";
  message: string;
  durationMs: number;
}
