import { ThreatCategory } from "../types";

const CATEGORY_COLORS: Record<ThreatCategory, string> = {
  "Static Detection": "bg-guardz-purple/20 text-guardz-light-purple",
  Behavioral: "bg-guardz-dark-purple/30 text-guardz-light-purple",
  Reconnaissance: "bg-guardz-medium-gray/30 text-guardz-light-gray",
  Persistence: "bg-guardz-dark-red/20 text-guardz-pink",
  Exfiltration: "bg-guardz-pink/20 text-guardz-pink",
  LOLBin: "bg-guardz-teal-green/20 text-guardz-bright-green",
  "Credential Access": "bg-amber-500/20 text-amber-400",
};

export default function CategoryBadge({
  category,
}: {
  category: ThreatCategory;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${CATEGORY_COLORS[category]}`}
    >
      {category}
    </span>
  );
}
