import type { LeaderboardEntry } from '../shared/types';

export function MascotIllustration({ className = 'w-32 h-32' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 180 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top curly tuft */}
      <path
        d="M84 36C80 28 89 22 93 29C96 34 102 25 106 31C109 36 105 42 100 43"
        stroke="var(--text)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left arm on hip */}
      <path
        d="M36 68C22 72 19 88 30 96C38 102 49 97 53 93"
        stroke="var(--text)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right arm on hip */}
      <path
        d="M144 68C158 72 161 88 150 96C142 102 131 97 127 93"
        stroke="var(--text)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Legs */}
      <path
        d="M72 114V142M72 142H62M108 114V142M108 142H118"
        stroke="var(--text)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Semi-circle body using state accent soft fill */}
      <path
        d="M34 56H146C146 89.1371 120.928 116 90 116C59.0721 116 34 89.1371 34 56Z"
        fill="var(--accent-soft)"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Closed happy eyes + smile */}
      <path
        d="M66 74C68 79 74 79 76 74"
        stroke="var(--text)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M104 74C106 79 112 79 114 74"
        stroke="var(--text)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M84 86C86.5 91 93.5 91 96 86"
        stroke="var(--text)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SegmentedProgress({
  total,
  currentIndex,
}: {
  total: number;
  currentIndex: number;
}) {
  const safeTotal = Math.max(1, Math.min(total, 20));
  return (
    <div
      className="flex items-center justify-center gap-1.5 w-full max-w-md mx-auto"
      aria-label={`Question ${currentIndex + 1} of ${total}`}
    >
      {Array.from({ length: safeTotal }).map((_, i) => {
        const filled = i <= currentIndex;
        return (
          <span
            key={i}
            className={`h-2 flex-1 rounded-full transition-colors duration-200 ${
              filled ? 'bg-accent' : 'bg-surface-2 border border-border'
            }`}
          />
        );
      })}
    </div>
  );
}

export function CountdownTimer({
  remainingSec,
  label,
  size = 'md',
}: {
  remainingSec: number;
  label: string;
  size?: 'md' | 'lg';
}) {
  const stateClass =
    remainingSec < 5 ? 'timer--critical' : remainingSec < 10 ? 'timer--low' : '';
  return (
    <div
      className={`timer font-mono tabular-nums inline-flex items-center justify-center rounded-2xl border border-border bg-surface px-4 py-2 shrink-0 ${stateClass} ${
        size === 'lg' ? 'text-3xl sm:text-[40px] leading-none px-4 sm:px-6 py-2.5 sm:py-3' : 'text-2xl sm:text-3xl leading-none'
      }`}
    >
      {label}
    </div>
  );
}

export function PodiumDisplay({
  entries,
  large = false,
}: {
  entries: LeaderboardEntry[];
  large?: boolean;
}) {
  const first = entries[0];
  const second = entries[1];
  const third = entries[2];

  const slots = [
    { entry: second, rankLabel: '2nd', medalClass: 'medal--silver', height: large ? 'h-40' : 'h-28' },
    { entry: first, rankLabel: '1st', medalClass: 'medal--gold', height: large ? 'h-52' : 'h-36' },
    { entry: third, rankLabel: '3rd', medalClass: 'medal--bronze', height: large ? 'h-32' : 'h-24' },
  ];

  return (
    <div className="grid grid-cols-3 items-end gap-2.5 sm:gap-5 max-w-3xl w-full mx-auto pt-4">
      {slots.map(({ entry, rankLabel, medalClass, height }) => (
        <div key={rankLabel} className="flex flex-col items-center text-center min-w-0 w-full">
          {entry ? (
            <>
              <div className="mb-2 px-1 w-full min-w-0">
                <p
                  className={`font-display font-bold text-text truncate ${
                    large ? 'text-xl sm:text-2xl' : 'text-sm sm:text-base'
                  }`}
                >
                  {entry.name}
                </p>
                <p
                  className={`font-mono font-bold tabular-nums text-muted ${
                    large ? 'text-base sm:text-lg' : 'text-xs sm:text-sm'
                  }`}
                >
                  {entry.score} pts
                </p>
              </div>
              <div
                className={`w-full ${height} ${medalClass} rounded-t-2xl border border-border flex flex-col items-center justify-center p-3`}
              >
                <span
                  className={`font-display font-extrabold tabular-nums ${
                    large ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'
                  }`}
                >
                  {rankLabel}
                </span>
              </div>
            </>
          ) : (
            <div
              className={`w-full ${height} bg-surface-2 rounded-t-2xl border border-dashed border-border flex items-center justify-center`}
            >
              <span className="font-display font-bold text-faint text-lg">{rankLabel}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
