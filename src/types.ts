export type ScenarioStatus =
  | "ready"
  | "executing"
  | "blocked"
  | "mitigated"
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

export type AppPhase = "welcome" | "selecting" | "executing" | "results";

export type DetectionVerdict = "detected" | "not_detected" | "pending";

export interface Scenario {
  id: string;
  name: string;
  shortName: string;
  question: string;
  description: string;
  category: ThreatCategory;
  status: ScenarioStatus;
  message?: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  durationMs?: number;
  lastRunAt?: string;
}

export interface ExecutionResult {
  scenarioId: string;
  status: "blocked" | "mitigated" | "completed" | "failed";
  message: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}
