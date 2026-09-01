interface GridBackdropProps {
  /** Hero screens carry a touch more ambient light; inner canvases stay flat. */
  intensity?: "hero" | "canvas";
}

/**
 * The ambient purple wash is painted with radial gradients rather than blurred
 * divs. A `filter: blur()` layer this large has to be re-rasterised by the
 * compositor, which crawls on a VM with no GPU; a gradient costs nothing.
 */
export default function GridBackdrop({
  intensity = "canvas",
}: GridBackdropProps) {
  const hero = intensity === "hero";
  const top = hero ? 0.14 : 0.09;
  const corner = hero ? 0.16 : 0.1;

  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden"
      style={{
        backgroundImage: [
          `radial-gradient(900px 520px at 50% -8%, rgba(101,79,232,${top}), rgba(101,79,232,0) 70%)`,
          `radial-gradient(420px 340px at 0% 0%, rgba(47,36,114,${corner}), rgba(47,36,114,0) 72%)`,
        ].join(", "),
      }}
    >
      <div className="bg-grid absolute inset-0" />
    </div>
  );
}
