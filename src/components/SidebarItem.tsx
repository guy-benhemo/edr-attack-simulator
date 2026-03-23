import { Scenario } from "../types";
import { getOutcome } from "../utils/verdict";

interface SidebarItemProps {
  scenario: Scenario;
  index: number;
  isActive: boolean;
  isPast: boolean;
}

export default function SidebarItem({
  scenario,
  index,
  isActive,
  isPast,
}: SidebarItemProps) {
  const outcome = isPast ? getOutcome(scenario.status) : "pending";

  return (
    <div
      className={`flex items-center gap-3 px-5 py-2.5 transition-colors ${
        isActive
          ? "border-l-2 border-guardz-purple bg-guardz-purple/10"
          : "border-l-2 border-transparent"
      }`}
    >
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          isPast
            ? outcome === "executed"
              ? "bg-guardz-pink/20 text-guardz-pink"
              : outcome === "stopped"
                ? "bg-guardz-green/20 text-guardz-green"
                : "bg-guardz-pink/20 text-guardz-pink"
            : isActive
              ? "bg-guardz-purple/20 text-guardz-light-purple"
              : "bg-white/5 text-guardz-medium-gray"
        }`}
      >
        {isPast
          ? outcome === "executed"
            ? "⚠"
            : outcome === "stopped"
              ? "✓"
              : "✕"
          : index + 1}
      </div>

      <span
        className={`flex-1 truncate text-sm ${
          isActive
            ? "font-semibold text-white"
            : isPast
              ? "text-guardz-light-gray"
              : "text-guardz-medium-gray"
        }`}
      >
        {scenario.shortName}
      </span>

      {isActive && (
        <div className="h-2 w-2 rounded-full bg-guardz-purple animate-dot-pulse" />
      )}
      {isPast && (
        <span
          className={`text-xs font-medium ${
            outcome === "executed"
              ? "text-guardz-pink"
              : outcome === "stopped"
                ? "text-guardz-green"
                : "text-guardz-pink"
          }`}
        >
          {outcome === "executed"
            ? "Danger"
            : outcome === "stopped"
              ? "Blocked"
              : "Error"}
        </span>
      )}
    </div>
  );
}
