interface WelcomeScreenProps {
  onRunAll: () => void;
  onSelectIndividual: () => void;
}

export default function WelcomeScreen({
  onRunAll,
  onSelectIndividual,
}: WelcomeScreenProps) {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-8 px-8">
      <div className="flex flex-col items-center gap-4">
        <img src="/logo.svg" alt="Guardz" className="h-16 w-48" />
        <h1 className="text-headline-03 text-white">S1 Detection Validation</h1>
        <p className="max-w-lg text-center text-body-03 font-normal text-guardz-light-gray">
          Validate your SentinelOne endpoint protection by running safe,
          simulated attack scenarios.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={onRunAll}
          className="cursor-pointer rounded-xl bg-guardz-green px-10 py-4 text-lg font-bold text-black transition-all hover:scale-[1.02] hover:bg-guardz-green/90 active:scale-[0.98]"
        >
          Run Full Scan
        </button>
        <button
          onClick={onSelectIndividual}
          className="cursor-pointer text-sm text-guardz-green transition-colors hover:text-guardz-lavender hover:underline"
        >
          Or select individual tests
        </button>
      </div>
    </div>
  );
}
