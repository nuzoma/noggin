import { useCallback, useRef, useState } from 'react';
import { Check, PauseCircle, Users } from 'lucide-react';
import type { RoomStatus, ScreenRoomView, WSServerMessage } from '../shared/types';
import { playFanfare, playReveal } from '../lib/sound';
import { useCountdown } from '../lib/useCountdown';
import { useRoomSocket } from '../lib/useRoomSocket';
import {
  CountdownTimer,
  MascotIllustration,
  PodiumDisplay,
  SegmentedProgress,
} from './QuizGraphics';

interface ScreenViewProps {
  code: string;
  onExitHome: () => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function formatNameList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function getScreenStateClass(status: RoomStatus): string {
  switch (status) {
    case 'setup':
    case 'lobby':
      return 'state-lobby';
    case 'question':
      return 'state-question';
    case 'reveal':
      return 'state-reveal';
    case 'finished':
      return 'state-podium';
  }
}

export function ScreenView({ code, onExitHome }: ScreenViewProps) {
  const normalizedCode = code.toUpperCase();
  const [view, setView] = useState<ScreenRoomView | null>(null);
  const [closedMsg, setClosedMsg] = useState<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  const handleWSMessage = useCallback((msg: WSServerMessage) => {
    if (msg.type === 'screen:state') {
      setView(msg.payload);
      if (prevStatusRef.current !== msg.payload.status) {
        if (msg.payload.status === 'reveal') playReveal(true);
        if (msg.payload.status === 'finished') playFanfare();
        prevStatusRef.current = msg.payload.status;
      }
    } else if (msg.type === 'room:closed') {
      setClosedMsg(msg.message);
    }
  }, []);

  const { status: wsStatus } = useRoomSocket({
    authMessage: { type: 'auth:screen', code: normalizedCode },
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

  if (closedMsg) {
    return (
      <div className="min-h-screen cast-mode flex items-center justify-center p-6">
        <div className="bg-surface rounded-3xl border border-border max-w-md w-full p-8 text-center space-y-5">
          <MascotIllustration className="w-28 h-28 mx-auto" />
          <h1 className="font-display font-extrabold text-2xl text-text">
            This room&apos;s closed.
          </h1>
          <p className="text-sm text-muted">{closedMsg}</p>
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

  if (!view) {
    return (
      <div className="min-h-screen cast-mode flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <MascotIllustration className="w-28 h-28 mx-auto" />
          <p className="font-display font-bold text-xl text-text">
            Connecting TV screen for Room {normalizedCode}…
          </p>
        </div>
      </div>
    );
  }

  const topScore = view.leaderboard[0]?.score ?? 0;
  const topWinners =
    view.leaderboard.length > 0
      ? view.leaderboard.filter((entry) => entry.score === topScore)
      : [];

  const finishedSubtitle = (() => {
    if (view.leaderboard.length === 0) return 'No players finished this round.';
    if (view.leaderboard.length === 1) {
      return `Solo round. ${view.leaderboard[0].name} scored ${view.leaderboard[0].score} — now get some housemates in here.`;
    }
    if (topWinners.length > 1) {
      const names = formatNameList(topWinners.map((w) => w.name));
      return `It's a tie! ${names} ${topWinners.length === 2 ? 'both' : 'all'} finished on ${topScore}.`;
    }
    return `Here's how this round finished. ${topWinners[0].name} takes it with ${topScore} pts.`;
  })();

  return (
    <div className={`min-h-screen cast-mode flex flex-col ${getScreenStateClass(view.status)}`}>
      {/* Quiet TV Screen Header (solid --bg, high-contrast --cast-text, zero gradients) */}
      <header className="w-full border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <span className="font-display font-extrabold text-lg text-text whitespace-nowrap shrink-0">
              noggin
            </span>
            <span className="font-mono text-sm font-bold text-accent whitespace-nowrap shrink-0">
              TV Screen · Room {view.code}
            </span>
            {view.title && (
              <span className="text-sm font-semibold text-text truncate">· {view.title}</span>
            )}
          </div>
          {wsStatus === 'reconnecting' && (
            <span className="text-xs font-semibold text-danger">Hold on — reconnecting…</span>
          )}
        </div>
      </header>

      {/* SETUP / LOBBY (.state-lobby) */}
      {(view.status === 'setup' || view.status === 'lobby') && (
        <main className="flex-1 flex flex-col">
          <section className="border-b border-border bg-surface pt-10 pb-8 px-6">
            <div className="max-w-5xl mx-auto text-center space-y-5">
              <p className="text-base font-bold text-text">
                Share this with the house · Join on your phone at {window.location.host}
              </p>
              <div className="inline-block">
                <span className="room-code inline-block text-6xl sm:text-8xl px-12 py-6 leading-none tabular-nums">
                  {view.code}
                </span>
              </div>
              <p className="text-base font-semibold text-text tabular-nums">
                {view.status === 'setup'
                  ? 'Host is setting up the round…'
                  : view.players.length === 0
                    ? 'Nobody yet. Share the code.'
                    : `${view.players.length} ${view.players.length === 1 ? 'player' : 'players'} in`}
              </p>
            </div>
          </section>

          <div className="max-w-5xl w-full mx-auto px-6 py-10 flex-1">
            {view.players.length === 0 ? (
              <div className="bg-surface rounded-3xl border border-border p-12 text-center space-y-3">
                <MascotIllustration className="w-36 h-36 mx-auto" />
                <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-text">
                  Nobody yet. Share the code.
                </h1>
                <p className="text-base text-muted">
                  Enter code <span className="font-mono font-bold text-accent">{view.code}</span> on your phone to hop in.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="font-display font-extrabold text-2xl text-text flex items-center gap-2">
                  <Users className="w-6 h-6 text-accent" />
                  Players · {view.players.length}
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {view.players.map((p) => (
                    <div
                      key={p.id}
                      className="bg-surface rounded-2xl border border-border px-5 py-4"
                    >
                      <p className="font-display font-bold text-xl text-text truncate">{p.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      {/* QUESTION (.state-question) */}
      {view.status === 'question' && view.currentQuestion && (
        <main className="flex-1 flex flex-col">
          <section className="border-b border-border bg-surface pt-8 pb-6 px-6">
            <div className="max-w-5xl mx-auto space-y-5">
              <SegmentedProgress
                total={view.totalQuestions}
                currentIndex={view.currentQuestionIndex}
              />
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <p className="font-mono font-bold text-base text-accent tabular-nums">
                    Question {view.currentQuestionIndex + 1} of {view.totalQuestions}
                  </p>
                  <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-text mt-2 leading-tight text-balance">
                    {view.currentQuestion.prompt}
                  </h1>
                </div>
                <CountdownTimer
                  remainingSec={countdown.remainingSec}
                  label={countdown.formatted}
                  size="lg"
                />
              </div>
            </div>
          </section>

          <div className="max-w-5xl w-full mx-auto px-6 py-8 space-y-6 flex-1">
            {view.isPaused && (
              <div className="rounded-2xl bg-surface border border-border px-5 py-3 flex items-center justify-center gap-2 font-bold text-base text-text">
                <PauseCircle className="w-5 h-5 text-accent" />
                Round paused — waiting for host
              </div>
            )}

            <div className="flex items-center justify-between gap-4 bg-surface rounded-2xl border border-border px-6 py-4">
              <span className="font-display font-bold text-xl text-text tabular-nums">
                Answered · {view.answeredCount} of {view.players.length}
              </span>
              <div className="flex-1 max-w-sm h-3.5 rounded-full bg-surface-2 border border-border overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-200"
                  style={{
                    width: `${view.players.length > 0 ? Math.round((view.answeredCount / view.players.length) * 100) : 0}%`,
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {view.currentQuestion.options.map((opt, idx) => (
                <div
                  key={idx}
                  className="bg-surface rounded-2xl border-2 border-border px-7 py-6 flex items-center gap-5"
                >
                  <span className="w-12 h-12 rounded-full bg-accent-soft border border-accent text-accent flex items-center justify-center font-display font-extrabold text-xl shrink-0">
                    {OPTION_LETTERS[idx]}
                  </span>
                  <span className="font-display font-bold text-2xl sm:text-3xl text-text leading-snug">
                    {opt}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* REVEAL (.state-reveal) */}
      {view.status === 'reveal' && view.currentQuestion && (
        <main className="flex-1 flex flex-col">
          <section className="border-b border-border bg-surface pt-8 pb-6 px-6">
            <div className="max-w-5xl mx-auto space-y-3">
              <SegmentedProgress
                total={view.totalQuestions}
                currentIndex={view.currentQuestionIndex}
              />
              <p className="font-mono font-bold text-sm text-accent tabular-nums">
                Question {view.currentQuestionIndex + 1} of {view.totalQuestions}
              </p>
              <h1 className="font-display font-extrabold text-3xl sm:text-4xl text-text leading-tight text-balance">
                {view.currentQuestion.prompt}
              </h1>
              {view.currentQuestion.correctIndex !== undefined && (
                <div className="inline-flex items-center gap-2 rounded-[14px] bg-success-soft border border-success px-4 py-2 text-base sm:text-lg font-bold text-success">
                  <Check className="w-5 h-5 stroke-[2.5] shrink-0" />
                  <span>
                    The answer was: {OPTION_LETTERS[view.currentQuestion.correctIndex]}.{' '}
                    {view.currentQuestion.options[view.currentQuestion.correctIndex]}
                  </span>
                </div>
              )}
            </div>
          </section>

          <div className="max-w-5xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start flex-1">
            <div className="lg:col-span-7 space-y-4">
              {view.currentQuestion.options.map((opt, idx) => {
                const isCorrect = idx === view.currentQuestion?.correctIndex;
                const count = view.answerDistribution[idx] ?? 0;
                const pct =
                  view.answeredCount > 0 ? Math.round((count / view.answeredCount) * 100) : 0;
                return (
                  <div
                    key={idx}
                    className={`rounded-2xl border-2 p-5 ${
                      isCorrect ? 'bg-success-soft border-success' : 'bg-surface border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-10 h-10 rounded-full border flex items-center justify-center font-display font-bold text-base shrink-0 ${
                            isCorrect
                              ? 'bg-success border-success text-on-accent'
                              : 'bg-surface-2 border-border text-muted'
                          }`}
                        >
                          {isCorrect ? <Check className="w-5 h-5 stroke-[2.5]" /> : OPTION_LETTERS[idx]}
                        </span>
                        <span className="font-display font-bold text-xl text-text truncate">
                          {opt}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-base text-text tabular-nums shrink-0">
                        {count} ({pct}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="lg:col-span-5 bg-surface rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-display font-extrabold text-xl text-text">Leaderboard</h2>
              </div>
              <div>
                {view.leaderboard.slice(0, 5).map((entry) => {
                  const rowTone =
                    entry.rank === 1
                      ? 'lb-row--1st'
                      : entry.rank === 2
                        ? 'lb-row--2nd'
                        : 'lb-row';
                  return (
                    <div
                      key={entry.id}
                      className={`${rowTone} px-6 py-3 flex items-center justify-between gap-3`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-8 h-8 rounded-full border border-border bg-surface font-mono font-bold text-xs text-text flex items-center justify-center tabular-nums shrink-0">
                          {entry.rank}
                        </span>
                        <span className="font-display font-bold text-lg text-text truncate">
                          {entry.name}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-lg text-text tabular-nums shrink-0">
                        {entry.score}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* FINISHED (.state-podium, flat --bg in cast-mode) */}
      {view.status === 'finished' && (
        <main className="flex-1 flex flex-col">
          <section className="pt-8 pb-4 px-6 text-center">
            <p className="text-sm font-bold text-accent">
              {view.title} · Room {view.code}
            </p>
            <h1 className="font-display font-extrabold text-4xl sm:text-6xl text-text mt-1">
              That&apos;s a wrap.
            </h1>
            <p className="text-base sm:text-lg font-semibold text-text mt-2 max-w-2xl mx-auto">
              {finishedSubtitle}
            </p>
          </section>

          <div className="max-w-4xl w-full mx-auto px-6 py-10 flex-1">
            <PodiumDisplay entries={view.leaderboard} large />
          </div>
        </main>
      )}
    </div>
  );
}
