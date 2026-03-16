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
                status: action.result.status,
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
    case "RESET":
      return initialState;
    default:
      return state;
  }
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

  const runCurrentScenario = useCallback(async () => {
    if (state.phase !== "executing") return;
    if (state.currentIndex >= state.runQueue.length) {
      dispatch({ type: "SHOW_RESULTS" });
      return;
    }

    const scenarioId = state.runQueue[state.currentIndex];
    dispatch({ type: "SCENARIO_EXECUTING", id: scenarioId });

    const minDelay = new Promise((r) => setTimeout(r, 800));

    try {
      const [result] = await Promise.all([
        invoke<ExecutionResult>("execute_scenario", { scenarioId }),
        minDelay,
      ]);

      if (abortRef.current) return;
      dispatch({ type: "SCENARIO_COMPLETE", id: scenarioId, result });

      await new Promise((r) => setTimeout(r, 1500));
      if (abortRef.current) return;
      dispatch({ type: "ADVANCE_NEXT" });
    } catch (err) {
      if (abortRef.current) return;
      dispatch({
        type: "SCENARIO_COMPLETE",
        id: scenarioId,
        result: {
          scenarioId,
          status: "failed",
          message: String(err),
          stdout: "",
          stderr: "",
          exitCode: -1,
          durationMs: 0,
        },
      });
      await new Promise((r) => setTimeout(r, 1500));
      if (abortRef.current) return;
      dispatch({ type: "ADVANCE_NEXT" });
    }
  }, [state.phase, state.currentIndex, state.runQueue]);

  useEffect(() => {
    runCurrentScenario();
  }, [runCurrentScenario]);

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
          onRunAgain={() => dispatch({ type: "START_FULL_SCAN" })}
          onBackToWelcome={() => dispatch({ type: "RESET" })}
        />
      );
  }
}
