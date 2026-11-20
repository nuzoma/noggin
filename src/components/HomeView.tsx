import { useState } from 'react';
import { ArrowRight, Play, Ticket } from 'lucide-react';
import { ApiRequestError, createRoom } from '../lib/api';
import { getHouseRecord } from '../lib/houseRecord';
import {
  clearHostSession,
  getRecentHostSession,
  getRecentPlayerSession,
  saveHostSession,
} from '../lib/storage';
import { MascotIllustration } from './QuizGraphics';

interface HomeViewProps {
  onNavigateHost: (hostToken: string) => void;
  onNavigateJoin: () => void;
  onNavigatePlay: (code: string) => void;
}

export function HomeView({ onNavigateHost, onNavigateJoin, onNavigatePlay }: HomeViewProps) {
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);
  const [recentHost, setRecentHost] = useState(() => getRecentHostSession());
  const recentPlayer = getRecentPlayerSession();
  const houseRecord = getHouseRecord();

  const handleHostCreate = async () => {
    setCreatingRoom(true);
    setNetworkError(null);
    setNeedsRefresh(false);
    try {
      const data = await createRoom();
      saveHostSession({ code: data.code, hostToken: data.hostToken });
      onNavigateHost(data.hostToken);
    } catch (err) {
      console.error('[noggin] handleHostCreate failed:', err);
      setNeedsRefresh(err instanceof ApiRequestError && err.kind === 'auth');
      setNetworkError(
        err instanceof Error
          ? err.message
          : "Couldn't reach the game server. Reload the page and try again.",
      );
      setCreatingRoom(false);
    }
  };

  const handleDiscardRecentHost = () => {
    clearHostSession();
    setRecentHost(null);
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      {/* Signature Hero Gradient Header Zone (.bg-hero used ONLY on Home) */}
      <div className="bg-hero border-b border-border">
        <header className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3 sm:gap-8 border-b border-border/70">
          <a
            href="/"
            className="font-display font-extrabold text-xl tracking-tight text-text whitespace-nowrap shrink-0"
          >
            noggin
          </a>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted">
            <button
              type="button"
              onClick={onNavigateJoin}
              className="hover:text-text transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Join a round
            </button>
            <a
              href="#how-it-works"
              className="hover:text-text transition-colors whitespace-nowrap shrink-0"
            >
              How it works
            </a>
          </nav>
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleHostCreate}
              disabled={creatingRoom}
              className="btn-primary h-10 sm:h-12 px-5 text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer"
            >
              {creatingRoom ? 'Setting things up…' : 'Host a round'}
            </button>
          </div>
        </header>

        <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
          {recentHost && (
            <div className="bg-surface rounded-2xl border border-border px-4 sm:px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 min-w-0">
              <p className="text-sm font-semibold text-text min-w-0 break-words">
                You&apos;ve got a round in progress ({recentHost.code}) — resume?
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onNavigateHost(recentHost.hostToken)}
                  className="btn-primary px-4 py-1.5 text-xs cursor-pointer whitespace-nowrap"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={handleDiscardRecentHost}
                  className="btn-secondary px-3.5 py-1.5 text-xs cursor-pointer whitespace-nowrap"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Main Hero */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div>
                <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight text-text leading-[1.08] text-balance">
                  Finally, a game that counts.
                </h1>
                <p className="text-base sm:text-lg text-muted mt-3 max-w-xl leading-relaxed">
                  No sign-ups. No apps. Just your people and a score nobody lets you forget.
                </p>
              </div>

              {networkError && (
                <div className="flex flex-wrap items-center gap-3" role="alert">
                  <p className="text-sm font-semibold text-danger">{networkError}</p>
                  {needsRefresh && (
                    <button
                      type="button"
                      onClick={() => window.location.reload()}
                      className="btn-secondary px-3 py-1.5 text-xs cursor-pointer"
                    >
                      Refresh page
                    </button>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={handleHostCreate}
                  disabled={creatingRoom}
                  className="btn-primary p-5 text-left active:scale-[0.99] cursor-pointer flex flex-col justify-between gap-3 min-h-[112px]"
                >
                  <div className="flex items-center justify-between w-full">
                    <Play className="w-5 h-5 fill-current" />
                    <ArrowRight className="w-4 h-4 opacity-85" />
                  </div>
                  <div>
                    <p className="font-display font-extrabold text-lg">
                      {creatingRoom ? 'Setting things up…' : 'Host a round'}
                    </p>
                    <p className="text-xs opacity-90 font-medium mt-0.5">
                      You pick the questions. You run it.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={onNavigateJoin}
                  className="btn-secondary p-5 text-left active:scale-[0.99] cursor-pointer flex flex-col justify-between gap-3 min-h-[112px]"
                >
                  <div className="flex items-center justify-between w-full">
                    <Ticket className="w-5 h-5" />
                    <ArrowRight className="w-4 h-4 opacity-70" />
                  </div>
                  <div>
                    <p className="font-display font-extrabold text-lg">Join a round</p>
                    <p className="text-xs text-muted font-medium mt-0.5">
                      Got a room code? Jump in.
                    </p>
                  </div>
                </button>
              </div>

              {recentPlayer && (
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => onNavigatePlay(recentPlayer.code)}
                    className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-xs cursor-pointer max-w-full"
                  >
                    <span className="truncate">
                      Rejoin {recentPlayer.code} as {recentPlayer.name}
                    </span>
                  </button>
                </div>
              )}
            </div>

            <div className="lg:col-span-5 bg-surface rounded-3xl border border-border p-8 flex flex-col items-center justify-center text-center">
              <MascotIllustration className="w-44 h-40 sm:w-52 sm:h-44" />
              <p className="font-display font-bold text-base text-text mt-2">
                Whenever the house feels like it.
              </p>
            </div>
          </section>
        </div>
      </div>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-10">
        {/* House Record (FR-31: only shows after first completed round) */}
        {houseRecord.length > 0 && (
          <section className="bg-surface rounded-3xl border border-border p-6 sm:p-8 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
              <h2 className="font-display font-extrabold text-xl text-text">House record</h2>
              <p className="text-xs text-muted">Resets on the 1st. Purely for bragging rights.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {houseRecord.slice(0, 6).map((entry) => (
                <div
                  key={entry.name}
                  className="bg-surface-2 rounded-2xl border border-border px-4 py-3 flex items-center justify-between gap-3"
                >
                  <span className="font-display font-bold text-base text-text truncate">
                    {entry.name}
                  </span>
                  <span className="font-mono font-bold text-xs text-muted tabular-nums whitespace-nowrap shrink-0">
                    {entry.wins} {entry.wins === 1 ? 'win' : 'wins'} this month
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* How it works */}
        <section id="how-it-works" className="pt-2">
          <h2 className="font-display font-extrabold text-lg text-text mb-5">How it works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-1.5">
              <p className="font-display font-bold text-base text-text">
                1. Pick your questions
              </p>
              <p className="text-sm text-muted leading-relaxed">
                Write your own or paste a list. 10 to 50 — a short round is 10.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-1.5">
              <p className="font-display font-bold text-base text-text">
                2. Share the room code
              </p>
              <p className="text-sm text-muted leading-relaxed">
                Everyone joins from their phone in seconds.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-surface p-5 space-y-1.5">
              <p className="font-display font-bold text-base text-text">
                3. Play. Argue. Repeat.
              </p>
              <p className="text-sm text-muted leading-relaxed">
                Scores add up. Bragging rights are cumulative.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 border-t border-border text-xs text-faint">
        Built with ❤️ for REM house.
      </footer>
    </div>
  );
}
