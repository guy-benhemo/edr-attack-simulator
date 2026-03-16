import { Scenario } from "../types";
import Sidebar from "./Sidebar";
import ActiveScenarioPanel from "./ActiveScenarioPanel";

interface ExecutionViewProps {
  scenarios: Scenario[];
  runQueue: string[];
  currentIndex: number;
}

export default function ExecutionView({
  scenarios,
  runQueue,
  currentIndex,
}: ExecutionViewProps) {
  const currentId = runQueue[currentIndex];
  const currentScenario = scenarios.find((s) => s.id === currentId);

  return (
    <div className="flex h-screen">
      <Sidebar
        scenarios={scenarios}
        runQueue={runQueue}
        currentIndex={currentIndex}
      />
      <div className="flex flex-1 items-center justify-center">
        {currentScenario && (
          <ActiveScenarioPanel
            key={currentScenario.id + "-" + currentScenario.status}
            scenario={currentScenario}
            index={currentIndex}
            total={runQueue.length}
          />
        )}
      </div>
    </div>
  );
}
