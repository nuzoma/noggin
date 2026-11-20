import { useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { joinRoom } from '../lib/api';
import { getPlayerSession, savePlayerSession } from '../lib/storage';

interface JoinViewProps {
  initialCode?: string;
  onBack: () => void;
  onNavigatePlay: (code: string) => void;
}

export function JoinView({
  initialCode = '',
  onBack,
  onNavigatePlay,
}: JoinViewProps) {
  const [roomCode, setRoomCode] = useState(initialCode.toUpperCase());
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = roomCode.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const cleanName = displayName.trim();

    if (!cleanCode || !cleanName) {
      setErrorMsg('We need both a code and a name to get you in.');
      return;
    }

    if (cleanCode.length < 5 || cleanCode.length > 6) {
      setErrorMsg("That code didn't work. Double-check with the host — codes are 5–6 letters.");
      return;
    }

    setJoining(true);
    setErrorMsg(null);
    try {
      const existing = getPlayerSession(cleanCode);
      const data = await joinRoom(cleanCode, {
        name: cleanName.slice(0, 16),
        existingPlayerId:
          existing && existing.name.toLowerCase() === cleanName.toLowerCase()
            ? existing.playerId
            : undefined,
      });
      savePlayerSession({ code: data.code, playerId: data.playerId, name: data.name });
      onNavigatePlay(data.code);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "That didn't go through. Check your connection and try again.",
      );
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <header className="max-w-lg w-full mx-auto px-5 py-5">
        <button
          type="button"
          onClick={onBack}
          className="btn-ghost inline-flex items-center gap-1.5 text-sm px-2 py-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </header>

      <main className="flex-1 max-w-lg w-full mx-auto px-5 pb-12 pt-2 flex flex-col justify-between">
        <div className="bg-surface rounded-3xl border border-border p-6 sm:p-8 space-y-6">
          <div>
            <h1 className="font-display font-extrabold text-3xl text-text">Got a room code?</h1>
            <p className="text-sm text-muted mt-1.5">
              Ask the host — they&apos;ve got it on their screen.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="join-code" className="block text-sm font-bold text-text mb-1.5">
                Room code
              </label>
              <input
                id="join-code"
                type="text"
                maxLength={6}
                autoFocus
                autoComplete="off"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                className="w-full h-12 rounded-[14px] border border-border bg-surface-2 px-4 font-mono font-bold text-lg tracking-widest uppercase text-text placeholder:text-faint"
              />
              <p className="text-xs text-faint mt-1.5">5 or 6 characters, no spaces.</p>
            </div>

            <div>
              <label htmlFor="join-name" className="block text-sm font-bold text-text mb-1.5">
                Your name
              </label>
              <input
                id="join-name"
                type="text"
                maxLength={16}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Sam"
                className="w-full h-12 rounded-[14px] border border-border bg-surface-2 px-4 text-base font-medium text-text placeholder:text-faint"
              />
              <p className="text-xs text-faint mt-1.5">
                How you&apos;ll show up on the leaderboard.
              </p>
            </div>

            {errorMsg && (
              <p className="text-sm font-semibold text-danger" role="alert">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={joining}
              className="btn-primary w-full h-14 sm:h-12 text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {joining ? 'Setting things up…' : 'Let me in'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
