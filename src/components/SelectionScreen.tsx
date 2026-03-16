import { Scenario } from "../types";

interface SelectionScreenProps {
  scenarios: Scenario[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onRunSelected: () => void;
  onBack: () => void;
}

export default function SelectionScreen({
  scenarios,
  selectedIds,
  onToggle,
  onRunSelected,
  onBack,
}: SelectionScreenProps) {
  const allSelected = selectedIds.length === scenarios.length;

  function handleSelectAll() {
    if (allSelected) {
      scenarios.forEach((s) => {
        if (selectedIds.includes(s.id)) onToggle(s.id);
      });
    } else {
      scenarios.forEach((s) => {
        if (!selectedIds.includes(s.id)) onToggle(s.id);
      });
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex shrink-0 items-center gap-4 border-b border-white/10 px-6 py-4">
        <button
          onClick={onBack}
          className="cursor-pointer text-guardz-light-gray transition-colors hover:text-white"
        >
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path
              fillRule="evenodd"
              d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        <h2 className="text-headline-07 flex-1 text-white">Select Scenarios</h2>
        <button
          onClick={handleSelectAll}
          className="cursor-pointer text-sm text-guardz-green transition-colors hover:text-guardz-lavender"
        >
          {allSelected ? "Clear All" : "Select All"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {scenarios.map((scenario) => {
          const isSelected = selectedIds.includes(scenario.id);
          return (
            <button
              key={scenario.id}
              onClick={() => onToggle(scenario.id)}
              className={`flex w-full cursor-pointer items-center gap-4 border-b border-white/5 px-6 py-4 text-left transition-colors hover:bg-white/[0.02] ${
                isSelected ? "bg-guardz-purple/5" : ""
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                  isSelected
                    ? "border-guardz-green bg-guardz-green"
                    : "border-white/20 bg-transparent"
                }`}
              >
                {isSelected && (
                  <svg
                    className="h-3 w-3 text-black"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold text-white">
                  {scenario.name}
                </span>
                <span className="text-xs text-guardz-medium-gray">
                  {scenario.question}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-white/10 px-6 py-4">
        <span className="text-sm text-guardz-medium-gray">
          {selectedIds.length} of {scenarios.length} selected
        </span>
        <button
          onClick={onRunSelected}
          disabled={selectedIds.length === 0}
          className="cursor-pointer rounded-lg bg-guardz-green px-6 py-2.5 text-sm font-bold text-black transition-all hover:bg-guardz-green/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Run {selectedIds.length > 0 ? `${selectedIds.length} ` : ""}Selected
        </button>
      </div>
    </div>
  );
}
