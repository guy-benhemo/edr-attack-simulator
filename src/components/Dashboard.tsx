import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Scenario, ExecutionResult } from "../types";
import { INITIAL_SCENARIOS } from "../data/scenarios";
import ScenarioCard from "./ScenarioCard";
import SummaryBar from "./SummaryBar";

export default function Dashboard() {
  const [scenarios, setScenarios] = useState<Scenario[]>(INITIAL_SCENARIOS);

  async function handleSimulate(id: string) {
    setScenarios((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "executing" as const } : s)),
    );

    try {
      const result = await invoke<ExecutionResult>("execute_scenario", {
        scenarioId: id,
      });

      setScenarios((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: result.status,
                message: result.message,
                stdout: result.stdout,
                stderr: result.stderr,
                exitCode: result.exitCode,
                lastRunAt: new Date().toISOString(),
              }
            : s,
        ),
      );
    } catch (err) {
      setScenarios((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: "failed" as const,
                message: String(err),
              }
            : s,
        ),
      );
    }
  }

  async function handleResetAll() {
    try {
      await invoke("reset_scenarios");
    } catch {
      // noop
    }
    setScenarios(INITIAL_SCENARIOS);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/icon.svg" alt="Guardz" className="h-10 w-10" />
          <h1 className="text-headline-04 text-white">
            S1 Detection Demo
          </h1>
        </div>
        <button
          onClick={handleResetAll}
          className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white transition-all hover:border-white/30 hover:bg-white/5"
        >
          Reset All
        </button>
      </div>

      <SummaryBar scenarios={scenarios} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            onSimulate={handleSimulate}
          />
        ))}
      </div>
    </div>
  );
}
