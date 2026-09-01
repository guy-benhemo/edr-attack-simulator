import { invoke } from "@tauri-apps/api/core";
import { ExecutionResult } from "../types";
import { SIMULATED_UNDETECTED_IDS } from "../data/scenarios";

/** True when running inside the Tauri shell rather than a plain browser. */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

function isWindows(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Windows/i.test(navigator.userAgent);
}

/**
 * Real PowerShell execution only happens in the Tauri shell on Windows. Every
 * other context — macOS dev, and the browser build shared over a tunnel — runs
 * the scripted outcome so the flow stays demonstrable end to end.
 */
export function usesLiveExecution(): boolean {
  return isTauri() && isWindows();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function simulate(scenarioId: string): Promise<ExecutionResult> {
  const undetected = SIMULATED_UNDETECTED_IDS.includes(scenarioId);
  const durationMs = 700 + Math.round(Math.random() * 500);
  await sleep(durationMs);

  return {
    scenarioId,
    status: undetected ? "completed" : "blocked",
    message: undetected
      ? "Attack ran to completion without interference."
      : "Execution was interrupted by endpoint protection.",
    stdout: undetected
      ? `${scenarioId}: payload executed, no intervention observed`
      : "",
    stderr: undetected ? "" : `${scenarioId}: process terminated by security policy`,
    exitCode: undetected ? 0 : 1,
    durationMs,
  };
}

export async function executeScenario(
  scenarioId: string,
): Promise<ExecutionResult> {
  if (!usesLiveExecution()) {
    return simulate(scenarioId);
  }

  const startedAt = Date.now();
  try {
    return await invoke<ExecutionResult>("execute_scenario", { scenarioId });
  } catch (err) {
    return {
      scenarioId,
      status: "failed",
      message: String(err),
      stdout: "",
      stderr: "",
      exitCode: -1,
      durationMs: Date.now() - startedAt,
    };
  }
}
