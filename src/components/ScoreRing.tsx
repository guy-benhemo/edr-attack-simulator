interface ScoreRingProps {
  executed: number;
  total: number;
}

export default function ScoreRing({ executed, total }: ScoreRingProps) {
  const radius = 70;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const ratio = total > 0 ? executed / total : 0;
  const offset = circumference * (1 - ratio);
  const size = (radius + stroke) * 2;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg
        width={size}
        height={size}
        className="animate-ring -rotate-90"
        style={
          {
            "--ring-circumference": circumference,
            "--ring-offset": offset,
          } as React.CSSProperties
        }
      >
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        <circle
          cx={radius + stroke}
          cy={radius + stroke}
          r={radius}
          fill="none"
          stroke="var(--color-guardz-green)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-headline-03 text-white">
          {executed}/{total}
        </span>
      </div>
    </div>
  );
}
