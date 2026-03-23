import { useReducer, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Scenario, AppPhase, ExecutionResult } from "../types";
import { INITIAL_SCENARIOS } from "../data/scenarios";
import WelcomeScreen from "./WelcomeScreen";
import SelectionScreen from "./SelectionScreen";
import ExecutionView from "./ExecutionView";
import ResultsScreen from "./ResultsScreen";

interface AppState {
  phase: AppPhase;
  scenarios: Scenario[];
  selectedIds: string[];
  currentIndex: number;
  runQueue: string[];
}

type Action =
  | { type: "START_FULL_SCAN" }
  | { type: "GO_TO_SELECT" }
  | { type: "TOGGLE_SELECTION"; id: string }
  | { type: "START_SELECTED" }
  | { type: "SCENARIO_EXECUTING"; id: string }
  | { type: "SCENARIO_COMPLETE"; id: string; result: ExecutionResult }
  | { type: "ADVANCE_NEXT" }
  | { type: "SHOW_RESULTS" }
  | { type: "RERUN"; queue: string[] }
  | { type: "RESET" };

const initialState: AppState = {
  phase: "welcome",
  scenarios: INITIAL_SCENARIOS,
  selectedIds: [],
  currentIndex: 0,
  runQueue: [],
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "START_FULL_SCAN":
      return {
        ...state,
        phase: "executing",
        scenarios: INITIAL_SCENARIOS,
        currentIndex: 0,
        runQueue: INITIAL_SCENARIOS.map((s) => s.id),
      };
    case "GO_TO_SELECT":
      return { ...state, phase: "selecting", selectedIds: [] };
    case "TOGGLE_SELECTION": {
      const exists = state.selectedIds.includes(action.id);
      return {
        ...state,
        selectedIds: exists
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
      };
    }
    case "START_SELECTED":
      return {
        ...state,
        phase: "executing",
        scenarios: INITIAL_SCENARIOS,
        currentIndex: 0,
        runQueue: INITIAL_SCENARIOS.filter((s) =>
          state.selectedIds.includes(s.id),
        ).map((s) => s.id),
      };
    case "SCENARIO_EXECUTING":
      return {
        ...state,
        scenarios: state.scenarios.map((s) =>
          s.id === action.id ? { ...s, status: "executing" as const } : s,
        ),
      };
    case "SCENARIO_COMPLETE":
      return {
        ...state,
        scenarios: state.scenarios.map((s) =>
          s.id === action.id
            ? {
                ...s,
                status: action.result.status as Scenario["status"],
                message: action.result.message,
                stdout: action.result.stdout,
                stderr: action.result.stderr,
                exitCode: action.result.exitCode,
                durationMs: action.result.durationMs,
              }
            : s,
        ),
      };
    case "ADVANCE_NEXT":
      return { ...state, currentIndex: state.currentIndex + 1 };
    case "SHOW_RESULTS":
      return { ...state, phase: "results" };
    case "RERUN":
      return {
        ...state,
        phase: "executing" as const,
        scenarios: INITIAL_SCENARIOS,
        currentIndex: 0,
        runQueue: action.queue,
      };
    case "RESET":
      return initialState;
    default:
      return state;
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export default function AppShell() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const abortRef = useRef(false);

  useEffect(() => {
    abortRef.current = false;
    return () => {
      abortRef.current = true;
    };
  }, [state.phase]);

  const runScenarios = useCallback(async () => {
    if (state.phase !== "executing" || state.runQueue.length === 0) return;
    if (state.currentIndex !== 0) return;

    for (let i = 0; i < state.runQueue.length; i++) {
      if (abortRef.current) return;

      const scenarioId = state.runQueue[i];
      dispatch({ type: "SCENARIO_EXECUTING", id: scenarioId });

      const startTime = Date.now();
      let result: ExecutionResult;

      try {
        result = await invoke<ExecutionResult>("execute_scenario", {
          scenarioId,
        });
      } catch (err) {
        result = {
          scenarioId,
          status: "failed",
          message: String(err),
          stdout: "",
          stderr: "",
          exitCode: -1,
          durationMs: Date.now() - startTime,
        };
      }

      const elapsed = Date.now() - startTime;
      if (elapsed < 800) {
        await sleep(800 - elapsed);
      }

      if (abortRef.current) return;
      dispatch({ type: "SCENARIO_COMPLETE", id: scenarioId, result });

      await sleep(1500);
      if (abortRef.current) return;
      dispatch({ type: "ADVANCE_NEXT" });
    }

    if (!abortRef.current) {
      dispatch({ type: "SHOW_RESULTS" });
    }
  }, [state.phase, state.runQueue, state.currentIndex]);

  useEffect(() => {
    runScenarios();
  }, [runScenarios]);

  switch (state.phase) {
    case "welcome":
      return (
        <WelcomeScreen
          onRunAll={() => dispatch({ type: "START_FULL_SCAN" })}
          onSelectIndividual={() => dispatch({ type: "GO_TO_SELECT" })}
        />
      );
    case "selecting":
      return (
        <SelectionScreen
          scenarios={state.scenarios}
          selectedIds={state.selectedIds}
          onToggle={(id) => dispatch({ type: "TOGGLE_SELECTION", id })}
          onRunSelected={() => dispatch({ type: "START_SELECTED" })}
          onBack={() => dispatch({ type: "RESET" })}
        />
      );
    case "executing":
      return (
        <ExecutionView
          scenarios={state.scenarios}
          runQueue={state.runQueue}
          currentIndex={state.currentIndex}
        />
      );
    case "results":
      return (
        <ResultsScreen
          scenarios={state.scenarios}
          runQueue={state.runQueue}
          onRunAgain={() => dispatch({ type: "RERUN", queue: state.runQueue })}
          onBackToWelcome={() => dispatch({ type: "RESET" })}
        />
      );
  }
}
