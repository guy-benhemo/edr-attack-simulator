export type ScenarioStatus =
  | "ready"
  | "executing"
  | "blocked"
  | "mitigated"
  | "completed"
  | "failed";

export type ThreatCategory =
  | "Credential Access"
  | "Persistence"
  | "Defense Evasion"
  | "Command & Control"
  | "Execution"
  | "LOLBin"
  | "Discovery";

export type AppPhase =
  | "welcome"
  | "selecting"
  | "executing"
  | "results"
  | "compare";

export type Severity = "High" | "Medium" | "Low";

export interface Scenario {
  id: string;
  name: string;
  shortName: string;
  question: string;
  description: string;
  category: ThreatCategory;
  mitreId: string;
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

export interface Recommendation {
  scenarioId: string;
  severity: Severity;
  impact: Severity;
  action: string;
}
