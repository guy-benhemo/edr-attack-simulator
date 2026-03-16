import { ScenarioStatus } from "../types";

const STATUS_CONFIG: Record<
  ScenarioStatus,
  { label: string; bg: string; text: string; pulse?: boolean }
> = {
  ready: { label: "Ready", bg: "bg-white/10", text: "text-white/70" },
  executing: {
    label: "Executing",
    bg: "bg-guardz-purple/20",
    text: "text-guardz-light-purple",
    pulse: true,
  },
  blocked: {
    label: "Blocked",
    bg: "bg-guardz-green/20",
    text: "text-guardz-green",
  },
  mitigated: {
    label: "Mitigated",
    bg: "bg-guardz-amber/20",
    text: "text-guardz-amber",
  },
  completed: {
    label: "Completed",
    bg: "bg-guardz-teal-green/20",
    text: "text-guardz-bright-green",
  },
  failed: {
    label: "Failed",
    bg: "bg-guardz-dark-red/20",
    text: "text-guardz-pink",
  },
};

export default function StatusBadge({ status }: { status: ScenarioStatus }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${config.bg} ${config.text} ${config.pulse ? "animate-pulse" : ""}`}
    >
      {config.label}
    </span>
  );
}
