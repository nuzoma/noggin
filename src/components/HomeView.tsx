import { useState } from 'react';
import { ArrowRight, Play, Ticket } from 'lucide-react';
import { createRoom } from '../lib/api';
import {
  clearHostSession,
  getRecentHostSession,
  getRecentPlayerSession,
  saveHostSession,
} from '../lib/storage';

interface HomeViewProps {
  onNavigateHost: (hostToken: string) => void;
  onNavigateJoin: () => void;
  onNavigatePlay: (code: string) => void;
}

export function HomeView({ onNavigateHost, onNavigateJoin, onNavigatePlay }: HomeViewProps) {
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);
  const [recentHost, setRecentHost] = useState(() => getRecentHostSession());
  const recentPlayer = getRecentPlayerSession();

  const handleHostCreate = async () => {
    setCreatingRoom(true);
    setNetworkError(null);
    try {
      const data = await createRoom();
      saveHostSession({ code: data.code, hostToken: data.hostToken });
      onNavigateHost(data.hostToken);
    } catch (err) {
      console.error('[noggin] handleHostCreate failed:', err);
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
      {/* Top Bar + Signature Hero */}
      <div className="bg-hero border-b border-border/80">
        <header className="max-w-4xl w-full mx-auto px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
          <a
            href="/"
            className="font-display font-extrabold text-xl tracking-tight text-text whitespace-nowrap shrink-0"
          >
            noggin
          </a>
          <nav className="flex items-center gap-5 text-sm font-medium text-muted">
            <button
              type="button"
              onClick={onNavigateJoin}
              className="hover:text-text transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Join a round
            </button>
            <a
              href="#how-it-works"
              className="hidden sm:inline hover:text-text transition-colors whitespace-nowrap shrink-0"
            >
              How it works
            </a>
          </nav>
        </header>

        <div className="max-w-4xl w-full mx-auto px-5 sm:px-6 pt-6 pb-12 sm:pt-10 sm:pb-16 space-y-8">
          {recentHost && (
            <div className="rounded-xl border border-border bg-surface/85 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-muted min-w-0 break-words">
                Round in progress <span className="font-mono font-bold text-text">({recentHost.code})</span>
              </p>
              <div className="flex items-center gap-3 shrink-0 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => onNavigateHost(recentHost.hostToken)}
                  className="text-accent hover:underline underline-offset-4 cursor-pointer whitespace-nowrap"
                >
                  Resume
                </button>
                <button
                  type="button"
                  onClick={handleDiscardRecentHost}
                  className="text-muted hover:text-text cursor-pointer whitespace-nowrap"
                >
                  Discard
                </button>
              </div>
            </div>
          )}

          {/* Clean Focused Hero */}
          <section className="max-w-2xl space-y-7">
            <div className="space-y-3">
              <h1 className="font-display font-extrabold text-4xl sm:text-5xl tracking-tight text-text leading-[1.08] text-balance">
                Finally, a game that counts.
              </h1>
              <p className="text-base sm:text-lg text-muted max-w-xl leading-relaxed">
                No sign-ups. No apps. Just your people and a score nobody lets you forget.
              </p>
            </div>

            {networkError && (
              <div className="flex flex-wrap items-center gap-3" role="alert">
                <p className="text-sm font-semibold text-danger">{networkError}</p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="btn-secondary px-3 py-1.5 text-xs cursor-pointer"
                >
                  Refresh page
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={handleHostCreate}
                disabled={creatingRoom}
                className="btn-primary p-5 text-left active:scale-[0.99] cursor-pointer flex flex-col justify-between gap-4 min-h-[108px]"
              >
                <div className="flex items-center justify-between w-full">
                  <Play className="w-4 h-4 fill-current" />
                  <ArrowRight className="w-4 h-4 opacity-80" />
                </div>
                <div>
                  <p className="font-display font-extrabold text-lg leading-tight">
                    {creatingRoom ? 'Setting things up…' : 'Host a round'}
                  </p>
                  <p className="text-xs opacity-90 font-medium mt-1">
                    You pick the questions. You run it.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={onNavigateJoin}
                className="btn-secondary p-5 text-left active:scale-[0.99] cursor-pointer flex flex-col justify-between gap-4 min-h-[108px]"
              >
                <div className="flex items-center justify-between w-full">
                  <Ticket className="w-4 h-4 text-accent" />
                  <ArrowRight className="w-4 h-4 opacity-65" />
                </div>
                <div>
                  <p className="font-display font-extrabold text-lg leading-tight">Join a round</p>
                  <p className="text-xs text-muted font-medium mt-1">
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
                  className="btn-ghost inline-flex items-center gap-1.5 text-xs underline underline-offset-4 cursor-pointer max-w-full"
                >
                  <span className="truncate">
                    Rejoin {recentPlayer.code} as {recentPlayer.name}
                  </span>
                </button>
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Editorial How It Works (whitespace & clean numbering instead of heavy card boxes) */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-5 sm:px-6 py-10 sm:py-14">
        <section id="how-it-works" className="space-y-6">
          <h2 className="font-display font-bold text-sm tracking-wide text-muted">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-2 border-t border-border/80">
            <div className="space-y-1.5 pt-2">
              <span className="font-mono text-xs font-bold text-accent">01</span>
              <p className="font-display font-bold text-base text-text">Pick your questions</p>
              <p className="text-sm text-muted leading-relaxed">
                Write your own, load a preset, or paste a list. 10 to 50 questions per round.
              </p>
            </div>
            <div className="space-y-1.5 pt-2">
              <span className="font-mono text-xs font-bold text-accent">02</span>
              <p className="font-display font-bold text-base text-text">Share the room code</p>
              <p className="text-sm text-muted leading-relaxed">
                Everyone hops in from their phone browser in seconds.
              </p>
            </div>
            <div className="space-y-1.5 pt-2">
              <span className="font-mono text-xs font-bold text-accent">03</span>
              <p className="font-display font-bold text-base text-text">Play. Argue. Repeat.</p>
              <p className="text-sm text-muted leading-relaxed">
                Fast answers score higher. Bragging rights carry on.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="max-w-4xl w-full mx-auto px-5 sm:px-6 py-6 border-t border-border/70 text-xs text-faint">
        Built with ❤️ for REM house.
      </footer>
    </div>
  );
}
