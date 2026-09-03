import { useEffect, useReducer, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AppPhase, ExecutionResult, Scenario } from "../types";
import { DEFAULT_SELECTED_IDS, INITIAL_SCENARIOS } from "../data/scenarios";
import { executeScenario } from "../lib/executor";
import { stepTransition } from "../lib/motion";
import WelcomeScreen from "./WelcomeScreen";
import SelectionScreen from "./SelectionScreen";
import ExecutionView from "./ExecutionView";
import ResultsScreen from "./ResultsScreen";
import CompareScreen from "./CompareScreen";

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
  | { type: "TOGGLE_ALL" }
  | { type: "START_SELECTED" }
  | { type: "SCENARIO_EXECUTING"; id: string }
  | { type: "SCENARIO_COMPLETE"; id: string; result: ExecutionResult }
  | { type: "ADVANCE_NEXT" }
  | { type: "SHOW_RESULTS" }
  | { type: "SHOW_COMPARE" }
  | { type: "RERUN" }
  | { type: "RESET" };

const initialState: AppState = {
  phase: "welcome",
  scenarios: INITIAL_SCENARIOS,
  selectedIds: DEFAULT_SELECTED_IDS,
  currentIndex: 0,
  runQueue: [],
};

/** Every run starts from a clean set of statuses. */
function freshScenarios(): Scenario[] {
  return INITIAL_SCENARIOS.map((s) => ({ ...s, status: "ready" as const }));
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "START_FULL_SCAN":
      return {
        ...state,
        phase: "executing",
        scenarios: freshScenarios(),
        currentIndex: 0,
        runQueue: INITIAL_SCENARIOS.map((s) => s.id),
      };

    case "GO_TO_SELECT":
      return { ...state, phase: "selecting" };

    case "TOGGLE_SELECTION": {
      const exists = state.selectedIds.includes(action.id);
      return {
        ...state,
        selectedIds: exists
          ? state.selectedIds.filter((id) => id !== action.id)
          : [...state.selectedIds, action.id],
      };
    }

    case "TOGGLE_ALL":
      return {
        ...state,
        selectedIds:
          state.selectedIds.length === state.scenarios.length
            ? []
            : state.scenarios.map((s) => s.id),
      };

    case "START_SELECTED":
      return {
        ...state,
        phase: "executing",
        scenarios: freshScenarios(),
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

    case "SHOW_COMPARE":
      return { ...state, phase: "compare" };

    case "RERUN":
      return {
        ...state,
        phase: "executing",
        scenarios: freshScenarios(),
        currentIndex: 0,
      };

    case "RESET":
      return { ...initialState, selectedIds: state.selectedIds };

    default:
      return state;
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** How long a verdict stays on screen before advancing. */
const VERDICT_DWELL_MS = 1400;

export default function AppShell() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const runIdRef = useRef(0);

  useEffect(() => {
    if (state.phase !== "executing" || state.runQueue.length === 0) return;

    const runId = ++runIdRef.current;
    let cancelled = false;
    const alive = () => !cancelled && runIdRef.current === runId;

    (async () => {
      for (let i = 0; i < state.runQueue.length; i++) {
        if (!alive()) return;

        const scenarioId = state.runQueue[i];
        dispatch({ type: "SCENARIO_EXECUTING", id: scenarioId });

        const result = await executeScenario(scenarioId);
        if (!alive()) return;

        dispatch({ type: "SCENARIO_COMPLETE", id: scenarioId, result });

        await sleep(VERDICT_DWELL_MS);
        if (!alive()) return;

        if (i < state.runQueue.length - 1) {
          dispatch({ type: "ADVANCE_NEXT" });
        }
      }

      if (alive()) dispatch({ type: "SHOW_RESULTS" });
    })();

    return () => {
      cancelled = true;
    };
  }, [state.phase, state.runQueue]);

  function renderPhase() {
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
            onCancel={() => dispatch({ type: "RESET" })}
          />
        );

      case "results":
        return (
          <ResultsScreen
            scenarios={state.scenarios}
            runQueue={state.runQueue}
            onRunAgain={() => dispatch({ type: "RERUN" })}
            onCompare={() => dispatch({ type: "SHOW_COMPARE" })}
          />
        );

      case "compare":
        return (
          <CompareScreen
            scenarios={state.scenarios}
            runQueue={state.runQueue}
            onBack={() => dispatch({ type: "SHOW_RESULTS" })}
          />
        );
    }
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state.phase}
        variants={stepTransition}
        initial="initial"
        animate="animate"
        exit="exit"
        className="h-full"
      >
        {renderPhase()}
      </motion.div>
    </AnimatePresence>
  );
}
