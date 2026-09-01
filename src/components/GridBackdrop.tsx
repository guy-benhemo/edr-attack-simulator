interface GridBackdropProps {
  /** Hero screens carry a touch more ambient light; inner canvases stay flat. */
  intensity?: "hero" | "canvas";
}

/**
 * guardz.com is close to flat near-black with only a faint lift toward the
 * top of the page — no blooming glows. This keeps that restraint.
 */
export default function GridBackdrop({
  intensity = "canvas",
}: GridBackdropProps) {
  const hero = intensity === "hero";

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="bg-grid absolute inset-0" />

      <div
        className={`absolute -top-40 left-1/2 h-[520px] w-[900px] -translate-x-1/2 rounded-full blur-[160px] ${
          hero ? "bg-guardz-purple/12" : "bg-guardz-purple/8"
        }`}
      />
      <div
        className={`absolute -top-32 -left-24 h-[300px] w-[360px] rounded-full blur-[150px] ${
          hero ? "bg-guardz-dark-purple/25" : "bg-guardz-dark-purple/15"
        }`}
      />
    </div>
  );
}
