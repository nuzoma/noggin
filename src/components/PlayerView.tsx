import { useCallback, useRef, useState } from 'react';
import { ArrowRight, Check, Clock, Lock, PauseCircle, X } from 'lucide-react';
import type { PlayerRoomView, RoomStatus, WSServerMessage } from '../shared/types';
import { joinRoom } from '../lib/api';
import { clearPlayerSession, getPlayerSession, savePlayerSession } from '../lib/storage';
import { playFanfare, playLockIn, playReveal } from '../lib/sound';
import { useCountdown } from '../lib/useCountdown';
import { useRoomSocket } from '../lib/useRoomSocket';
import { ConfettiBurst } from './ConfettiBurst';
import { LobbyCanvas } from './LobbyCanvas';
import {
  CountdownTimer,
  MascotIllustration,
  PodiumDisplay,
} from './QuizGraphics';

interface PlayerViewProps {
  code: string;
  onExitHome: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function ordinal(n: number): string {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function formatNameList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function getPlayerStateClasses(status: RoomStatus): string {
  switch (status) {
    case 'setup':
    case 'lobby':
      return 'state-lobby bg-bg';
    case 'question':
      return 'state-question bg-bg';
    case 'reveal':
      return 'state-reveal bg-bg';
    case 'finished':
      return 'state-podium bg-podium';
  }
}

export function PlayerView({ code, onExitHome }: PlayerViewProps) {
  const normalizedCode = code.toUpperCase();
  const [session, setSession] = useState(() => getPlayerSession(normalizedCode));
  const [nameInput, setNameInput] = useState('');
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const [view, setView] = useState<PlayerRoomView | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [terminatedMsg, setTerminatedMsg] = useState<string | null>(null);
  const [showFullScoreboard, setShowFullScoreboard] = useState(false);
  const prevStatusRef = useRef<string | null>(null);

  const handleWSMessage = useCallback(
    (msg: WSServerMessage) => {
      if (msg.type === 'player:state') {
        setView(msg.payload);
        setErrorBanner(null);

        if (prevStatusRef.current !== msg.payload.status) {
          if (msg.payload.status === 'reveal') {
            playReveal(msg.payload.myAnswer?.isCorrect ?? null);
          } else if (msg.payload.status === 'finished') {
            playFanfare();
          }
          prevStatusRef.current = msg.payload.status;
        }
      } else if (msg.type === 'error') {
        setErrorBanner(msg.message);
      } else if (msg.type === 'kicked' || msg.type === 'room:closed') {
        clearPlayerSession(normalizedCode);
        setTerminatedMsg(msg.message);
      }
    },
    [normalizedCode],
  );

  const { status: wsStatus, send } = useRoomSocket({
    authMessage: session
      ? { type: 'auth:player', code: session.code, playerId: session.playerId }
      : null,
    onMessage: handleWSMessage,
  });

  const countdown = useCountdown({
    questionStartedAt: view?.questionStartedAt ?? null,
    timeLimitSec: view?.currentQuestion?.timeLimitSec ?? 20,
    serverNow: view?.serverNow ?? Date.now(),
    isPaused: view?.isPaused ?? false,
    pausedRemainingMs: view?.pausedRemainingMs ?? null,
    active: view?.status === 'question',
  });

  const handleQuickJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = nameInput.trim();
    if (!cleanName) {
      setJoinError('We need your name to get you in.');
      return;
    }
    setJoining(true);
    setJoinError(null);
    try {
      const data = await joinRoom(normalizedCode, {
        name: cleanName.slice(0, 16),
      });
      const nextSession = { code: data.code, playerId: data.playerId, name: data.name };
      savePlayerSession(nextSession);
      setSession(nextSession);
    } catch (err) {
      setJoinError(
        err instanceof Error
          ? err.message
          : "That didn't go through. Check your connection and try again.",
      );
      setJoining(false);
    }
  };

  if (terminatedMsg) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-5">
        <div className="bg-surface rounded-3xl border border-border max-w-sm w-full p-7 text-center space-y-4">
          <MascotIllustration className="w-24 h-24 mx-auto" />
          <h1 className="font-display font-extrabold text-xl text-text">
            This room&apos;s closed.
          </h1>
          <p className="text-sm text-muted">{terminatedMsg}</p>
          <button
            type="button"
            onClick={onExitHome}
            className="btn-primary w-full h-12 text-sm cursor-pointer"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  // Direct link name entry when player hasn't joined this room yet
  if (!session) {
    return (
      <div className="min-h-screen bg-bg text-text flex flex-col">
        <header className="border-b border-border bg-surface pt-8 pb-6 px-5 text-center">
          <p className="font-mono font-bold text-xs text-accent">Room {normalizedCode}</p>
          <h1 className="font-display font-extrabold text-3xl text-text mt-1">Join the round</h1>
        </header>

        <div className="flex-1 max-w-md w-full mx-auto px-5 py-8 flex flex-col justify-between">
          <form onSubmit={handleQuickJoin} className="space-y-4 bg-surface rounded-3xl border border-border p-6">
            <div>
              <label htmlFor="quick-name" className="block text-sm font-bold text-text mb-1.5">
                Your name
              </label>
              <input
                id="quick-name"
                type="text"
                maxLength={16}
                autoFocus
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Sam"
                className="w-full h-12 rounded-[14px] border border-border bg-surface-2 px-4 text-base font-medium text-text placeholder:text-faint"
              />
              <p className="text-xs text-faint mt-1.5">
                How you&apos;ll show up on the leaderboard.
              </p>
            </div>

            {joinError && (
              <p className="text-sm font-semibold text-danger" role="alert">
                {joinError}
              </p>
            )}

            <button
              type="submit"
              disabled={joining}
              className="btn-primary w-full h-14 text-base flex items-center justify-center gap-2 cursor-pointer"
            >
              {joining ? 'Setting things up…' : 'Let me in'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <button
            type="button"
            onClick={onExitHome}
            className="btn-ghost text-sm py-4 cursor-pointer"
          >
            Back to home
          </button>
        </div>
      </div>
    );
  }

  if (!view) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <MascotIllustration className="w-24 h-24 mx-auto" />
          <p className="font-display font-bold text-lg text-text">Setting things up…</p>
        </div>
      </div>
    );
  }

  const handleSelectChoice = (choiceIdx: number) => {
    if (view.status !== 'question' || view.isPaused || view.myAnswer !== null) return;
    playLockIn();
    send({
      type: 'player:submit_answer',
      questionIndex: view.currentQuestionIndex,
      choiceIndex: choiceIdx,
    });
  };

  const leaveRoom = () => {
    clearPlayerSession(normalizedCode);
    onExitHome();
  };

  const correctIndex = view.currentQuestion?.correctIndex;
  const correctOptionText =
    correctIndex !== undefined && view.currentQuestion
      ? `${OPTION_LETTERS[correctIndex]}. ${view.currentQuestion.options[correctIndex]}`
      : '';

  const finishedSubtext = (() => {
    const lb = view.fullLeaderboard;
    if (view.playersCount <= 1 || lb.length <= 1) {
      return `Solo round. You scored ${view.me.score} — now get some housemates in here.`;
    }
    const topScore = lb[0].score;
    const winners = lb.filter((e) => e.score === topScore);
    if (winners.length > 1) {
      return `It's a tie! ${formatNameList(winners.map((w) => w.name))} finished on ${topScore}.`;
    }
    if (view.me.rank === 1) {
      return 'Solid work. You take this one.';
    }
    if (view.me.rank === view.playersCount) {
      return "Somebody had to bring up the rear. Next round's yours.";
    }
    return `Solid work. ${winners[0].name} takes this one.`;
  })();

  return (
    <div className={`min-h-screen text-text flex flex-col ${getPlayerStateClasses(view.status)}`}>
      {/* SETUP / LOBBY (.state-lobby, blue accent) */}
      {(view.status === 'setup' || view.status === 'lobby') && (
        <>
          <header className="border-b border-border bg-surface pt-5 pb-5 px-5">
            <div className="max-w-lg mx-auto min-w-0">
              <div className="flex items-center justify-between text-xs font-bold text-muted">
                <span className="font-mono text-accent">Room {view.code}</span>
                <button
                  type="button"
                  onClick={leaveRoom}
                  className="btn-ghost text-xs underline underline-offset-4 px-2 py-1 cursor-pointer"
                >
                  Leave
                </button>
              </div>
              <div className="mt-4 text-center min-w-0">
                <p className="text-sm font-semibold text-muted truncate">Hey {view.me.name}</p>
                <h1 className="font-display font-extrabold text-3xl text-text mt-0.5">
                  You&apos;re in
                </h1>
                <p className="text-xs sm:text-sm font-medium text-muted mt-1">
                  {view.status === 'setup'
                    ? 'Host is finishing the questions — hang tight.'
                    : 'Waiting for the host to start the round.'}
                </p>
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-5 py-6 flex flex-col justify-between gap-5 min-w-0">
            <div className="space-y-4 min-w-0">
              <div className="flex items-baseline justify-between gap-3 px-1">
                <p className="font-display font-bold text-base text-text truncate">
                  {view.title || 'House round'}
                </p>
                <p className="text-xs font-semibold text-muted tabular-nums whitespace-nowrap shrink-0">
                  {view.playersCount} {view.playersCount === 1 ? 'housemate' : 'housemates'} in
                </p>
              </div>

              <LobbyCanvas
                players={view.players}
                myPlayerId={view.me.id}
                heightClassName="h-[260px] sm:h-[320px]"
                subtitle="Sit tight — everyone's avatars float around here until the round starts."
              />
            </div>

            <p className="text-center text-xs text-muted">
              Keep this screen open — the first question will pop right up.
            </p>
          </main>
        </>
      )}

      {/* QUESTION (.state-question, terracotta accent, no background gradient on player) */}
      {view.status === 'question' && view.currentQuestion && (
        <>
          <header className="border-b border-border bg-surface pt-4 pb-4 px-4 sm:px-5">
            <div className="max-w-lg mx-auto space-y-2.5 min-w-0">
              <div className="flex items-center justify-between gap-3 text-xs font-bold min-w-0">
                <span className="truncate text-text">{view.me.name}</span>
                <span className="font-mono tabular-nums text-muted shrink-0">{view.me.score} pts</span>
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <p className="text-xs font-bold text-accent">
                  Question {view.currentQuestionIndex + 1}
                </p>
                <CountdownTimer
                  remainingSec={countdown.remainingSec}
                  label={countdown.formatted}
                />
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-lg w-full mx-auto px-4 sm:px-5 py-6 flex flex-col justify-between gap-6 min-w-0">
            <div className="space-y-4">
              {wsStatus === 'reconnecting' && (
                <div className="rounded-2xl bg-warning-soft border border-warning px-4 py-2.5 text-xs font-bold text-warning text-center">
                  Hold on — reconnecting… Your spot&apos;s saved.
                </div>
              )}

              {view.isPaused && (
                <div className="rounded-2xl bg-surface-2 border border-border px-4 py-3 flex items-center justify-center gap-2 text-sm font-bold text-text">
                  <PauseCircle className="w-4 h-4 shrink-0 text-accent" />
                  Round paused — waiting for host
                </div>
              )}

              {!view.isPaused &&
                view.myAnswer === null &&
                countdown.remainingSec > 0 &&
                countdown.remainingSec <= 5 && (
                  <div className="rounded-2xl bg-danger-soft border border-danger px-4 py-2 text-xs font-bold text-center text-danger">
                    5 seconds — lock it in!
                  </div>
                )}

              {errorBanner && (
                <div className="rounded-2xl bg-danger-soft border border-danger px-4 py-2.5 text-xs font-bold text-center text-danger">
                  {errorBanner}
                </div>
              )}

              <h1 className="font-display font-bold text-xl sm:text-2xl text-center text-text leading-snug text-balance break-words">
                {view.currentQuestion.prompt}
              </h1>
            </div>

            {/* Bottom Thumb Zone: Option Buttons OR Locked-In State OR Timed-Out State */}
            {view.myAnswer !== null ? (
              <div className="space-y-4 my-auto min-w-0">
                <div className="answer-btn answer-btn--locked flex items-center justify-between gap-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="w-8 h-8 rounded-full bg-accent text-on-accent flex items-center justify-center font-display font-bold text-sm shrink-0">
                      <Lock className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1 break-words">
                      {OPTION_LETTERS[view.myAnswer.choiceIndex]}.{' '}
                      {view.currentQuestion.options[view.myAnswer.choiceIndex]}
                    </span>
                  </div>
                  <span className="text-xs font-bold shrink-0">Locked</span>
                </div>
                <div className="bg-surface rounded-2xl border border-border p-5 text-center space-y-1.5">
                  <h2 className="font-display font-extrabold text-lg text-text">
                    Locked in. Sit tight — reveal coming up.
                  </h2>
                  <p className="text-xs text-muted tabular-nums">
                    Answered · {view.answeredCount} of {view.playersCount}
                  </p>
                </div>
              </div>
            ) : countdown.remainingMs <= 0 && !view.isPaused ? (
              <div className="bg-surface rounded-3xl border border-border p-6 text-center space-y-2 my-auto">
                <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto">
                  <Clock className="w-5 h-5 text-danger" />
                </div>
                <h2 className="font-display font-extrabold text-xl text-text">Time&apos;s up.</h2>
                <p className="text-sm text-muted">
                  No answer this round. You&apos;ll get &apos;em next question.
                </p>
              </div>
            ) : (
              <div className="space-y-3 pb-4 min-w-0">
                {view.currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    disabled={view.isPaused || countdown.remainingMs <= 0}
                    onClick={() => handleSelectChoice(idx)}
                    className="answer-btn w-full min-h-[58px] flex items-center gap-3.5 text-left active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    <span className="w-8 h-8 rounded-full border border-border bg-surface-2 flex items-center justify-center font-display font-bold text-sm text-text shrink-0">
                      {OPTION_LETTERS[idx]}
                    </span>
                    <span className="leading-snug min-w-0 flex-1 break-words">{opt}</span>
                  </button>
                ))}
              </div>
            )}
          </main>
        </>
      )}

      {/* REVEAL (.state-reveal, green payoff) */}
      {view.status === 'reveal' && view.currentQuestion && (
        <>
          <header className="border-b border-border bg-surface pt-5 pb-4 px-4 sm:px-5">
            <div className="max-w-lg mx-auto text-center space-y-1.5">
              <p className="font-mono text-xs font-bold text-accent tabular-nums">
                Question {view.currentQuestionIndex + 1}
              </p>
              <h1 className="font-display font-extrabold text-2xl text-text">How you did</h1>
            </div>
          </header>

          <main className="flex-1 max-w-lg w-full mx-auto px-4 sm:px-5 py-6 space-y-5 min-w-0">
            {view.myAnswer?.isCorrect === true && view.myAnswer.isFastest && (
              <div className="bg-success-soft rounded-3xl border-2 border-success p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-success text-on-accent flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h2 className="font-display font-extrabold text-2xl text-success">
                  Nailed it — and fastest.
                </h2>
                <p className="text-sm font-semibold text-text tabular-nums">
                  +{view.myAnswer.points} points · Speed bonus: +{view.myAnswer.speedBonus}. Show-off.
                </p>
              </div>
            )}

            {view.myAnswer?.isCorrect === true && !view.myAnswer.isFastest && (
              <div className="bg-success-soft rounded-3xl border-2 border-success p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-success text-on-accent flex items-center justify-center mx-auto">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h2 className="font-display font-extrabold text-2xl text-success">Nailed it.</h2>
                <p className="text-sm font-semibold text-text tabular-nums">
                  +{view.myAnswer.points} points · You&apos;re at {view.me.score}. Keep it up.
                </p>
              </div>
            )}

            {view.myAnswer?.isCorrect === false && (
              <div className="bg-danger-soft rounded-3xl border-2 border-danger p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-danger text-white flex items-center justify-center mx-auto">
                  <X className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h2 className="font-display font-extrabold text-2xl text-danger">
                  Not this time.
                </h2>
                <p className="text-sm font-semibold text-text break-words">
                  The answer was {correctOptionText}. You&apos;re at {view.me.score} pts.
                </p>
              </div>
            )}

            {view.myAnswer === null && (
              <div className="bg-surface rounded-3xl border border-border p-6 text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-surface-2 border border-border flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6 text-muted" />
                </div>
                <h2 className="font-display font-extrabold text-2xl text-text">
                  No answer this round.
                </h2>
                <p className="text-sm font-medium text-muted break-words">
                  The answer was {correctOptionText}. Next one&apos;s yours.
                </p>
              </div>
            )}

            {/* Answer choice breakdown with semantic right/wrong states */}
            <div className="space-y-2 min-w-0">
              {view.currentQuestion.options.map((opt, idx) => {
                const isCorrect = idx === view.currentQuestion?.correctIndex;
                const isMyChoice = view.myAnswer?.choiceIndex === idx;
                const stateClass = isCorrect
                  ? 'answer-btn--correct'
                  : isMyChoice
                    ? 'answer-btn--wrong'
                    : '';
                return (
                  <div
                    key={idx}
                    className={`answer-btn py-3 px-4 text-sm flex items-center justify-between gap-3 min-w-0 ${stateClass}`}
                  >
                    <span className="min-w-0 flex-1 break-words">
                      {OPTION_LETTERS[idx]}. {opt}
                    </span>
                    {isCorrect && <Check className="w-4 h-4 shrink-0" />}
                    {!isCorrect && isMyChoice && <X className="w-4 h-4 shrink-0" />}
                  </div>
                );
              })}
            </div>

            {/* Player Rank & Score */}
            <div className="bg-surface rounded-2xl border border-border p-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-muted">Your score</p>
                <p className="font-mono font-extrabold text-2xl text-text tabular-nums">
                  {view.me.score} pts
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-muted">Current rank</p>
                <p className="font-display font-extrabold text-2xl text-text tabular-nums">
                  #{view.me.rank} of {view.playersCount}
                </p>
              </div>
            </div>
          </main>
        </>
      )}

      {/* FINISHED (.state-podium .bg-podium, gold celebration) */}
      {view.status === 'finished' && (
        <>
          <ConfettiBurst triggerKey={`player-finished-${view.roundNumber}`} count={80} />
          <header className="pt-7 pb-3 px-5 text-center">
            <p className="font-mono text-xs font-bold text-accent">That&apos;s a wrap.</p>
            <h1 className="font-display font-extrabold text-3xl text-text mt-1">
              You finished {ordinal(view.me.rank)}
            </h1>
            <p className="text-sm font-semibold text-muted mt-1 max-w-sm mx-auto">
              {finishedSubtext}
            </p>
            <p className="font-mono font-bold text-base text-text mt-1 tabular-nums">
              {view.me.score} pts
            </p>
          </header>

          <main className="flex-1 max-w-lg w-full mx-auto px-4 sm:px-5 py-6 flex flex-col justify-between gap-6 min-w-0">
            <div className="space-y-5 min-w-0">
              <PodiumDisplay entries={view.topLeaderboard} />

              {view.fullLeaderboard.length > 0 && (
                <div className="space-y-3">
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setShowFullScoreboard((prev) => !prev)}
                      className="btn-ghost text-xs font-bold text-accent underline underline-offset-4 px-3 py-1.5 cursor-pointer"
                    >
                      {showFullScoreboard ? 'Hide full scoreboard' : 'See full scoreboard'}
                    </button>
                  </div>

                  {showFullScoreboard && (
                    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
                      {view.fullLeaderboard.map((entry) => {
                        const rowTone =
                          entry.rank === 1
                            ? 'lb-row--1st'
                            : entry.rank === 2
                              ? 'lb-row--2nd'
                              : 'lb-row';
                        const meOutline = entry.id === view.me.id ? 'lb-row--me' : '';
                        return (
                          <div
                            key={entry.id}
                            className={`${rowTone} ${meOutline} px-4 sm:px-5 py-3 flex items-center justify-between gap-3`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="font-mono font-bold text-xs text-muted w-6 tabular-nums shrink-0">
                                #{entry.rank}
                              </span>
                              <span className="font-display font-bold text-sm text-text truncate">
                                {entry.name}
                                {entry.id === view.me.id ? ' (You)' : ''}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-sm text-text tabular-nums shrink-0">
                              {entry.score} pts
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <p className="text-center text-sm text-muted">
                Stay right here if the host starts another round.
              </p>
            </div>

            <button
              type="button"
              onClick={leaveRoom}
              className="btn-secondary w-full h-12 text-sm cursor-pointer"
            >
              Leave room
            </button>
          </main>
        </>
      )}
    </div>
  );
}
