import { Scenario } from "../types";
import SidebarItem from "./SidebarItem";

interface SidebarProps {
  scenarios: Scenario[];
  runQueue: string[];
  currentIndex: number;
}

export default function Sidebar({
  scenarios,
  runQueue,
  currentIndex,
}: SidebarProps) {
  return (
    <div className="flex w-[280px] shrink-0 flex-col border-r border-white/10 bg-[#12131a]">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <img src="/icon.svg" alt="Guardz" className="h-7 w-7" />
        <span className="text-headline-08 text-white">Detection Scan</span>
      </div>
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto py-2">
        {runQueue.map((id, idx) => {
          const scenario = scenarios.find((s) => s.id === id)!;
          return (
            <SidebarItem
              key={id}
              scenario={scenario}
              index={idx}
              isActive={idx === currentIndex}
              isPast={idx < currentIndex}
            />
          );
        })}
      </div>
    </div>
  );
}
