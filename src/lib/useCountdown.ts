import { useEffect, useState } from 'react';

interface UseCountdownParams {
  questionStartedAt: number | null;
  timeLimitSec: number;
  serverNow: number;
  isPaused: boolean;
  pausedRemainingMs: number | null;
  active: boolean;
}

export function useCountdown({
  questionStartedAt,
  timeLimitSec,
  serverNow,
  isPaused,
  pausedRemainingMs,
  active,
}: UseCountdownParams) {
  const [clockOffset] = useState(() => serverNow - Date.now());
  const totalMs = Math.max(1000, timeLimitSec * 1000);

  const computeRemaining = () => {
    if (isPaused && pausedRemainingMs !== null) {
      return Math.max(0, pausedRemainingMs);
    }
    if (!active || !questionStartedAt) {
      return totalMs;
    }
    const serverCurrent = Date.now() + clockOffset;
    const elapsed = serverCurrent - questionStartedAt;
    return Math.max(0, totalMs - elapsed);
  };

  const [remainingMs, setRemainingMs] = useState<number>(computeRemaining);

  useEffect(() => {
    setRemainingMs(computeRemaining());
    if (!active || isPaused || !questionStartedAt) return;

    const interval = window.setInterval(() => {
      const next = computeRemaining();
      setRemainingMs(next);
    }, 100);

    return () => window.clearInterval(interval);
  }, [questionStartedAt, timeLimitSec, isPaused, pausedRemainingMs, active, serverNow]);

  const remainingSec = Math.ceil(remainingMs / 1000);
  const progress = Math.max(0, Math.min(1, remainingMs / totalMs));
  const formatted = `00:${String(Math.max(0, remainingSec)).padStart(2, '0')}`;

  return { remainingMs, remainingSec, progress, formatted };
}
