import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  Play,
  RotateCcw,
  SkipForward,
  Trash2,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { HostRoomView, QuestionInput, RoomStatus, WSServerMessage } from '../shared/types';
import { createRoom, fetchHostRoom } from '../lib/api';
import {
  getHouseRecord,
  recordRoundWinners,
  type HouseRecordEntry,
} from '../lib/houseRecord';
import { clearHostSession, saveHostSession } from '../lib/storage';
import { isSoundMuted, playFanfare, playReveal, playTap, setSoundMuted } from '../lib/sound';
import { useCountdown } from '../lib/useCountdown';
import { useRoomSocket } from '../lib/useRoomSocket';
import { LobbyCanvas } from './LobbyCanvas';
import { QuestionEditor } from './QuestionEditor';
import {
  CountdownTimer,
  MascotIllustration,
  PodiumDisplay,
  SegmentedProgress,
} from './QuizGraphics';

interface HostViewProps {
  hostToken: string;
  onExitHome: () => void;
  onNewGame: (newHostToken: string) => void;
}

const OPTION_LETTERS = ['A', 'B', 'C', 'D'];

function formatNameList(names: string[]): string {
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function getHostStateClasses(status: RoomStatus): string {
  switch (status) {
    case 'setup':
    case 'lobby':
      return 'state-lobby bg-bg';
    case 'question':
      return 'state-question bg-question';
    case 'reveal':
      return 'state-reveal bg-bg';
    case 'finished':
      return 'state-podium bg-podium';
  }
}

export function HostView({ hostToken, onExitHome, onNewGame }: HostViewProps) {
  const [room, setRoom] = useState<HostRoomView | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [closedMsg, setClosedMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmKickId, setConfirmKickId] = useState<string | null>(null);
  const [muted, setMuted] = useState(() => isSoundMuted());
  const [houseRecord, setHouseRecord] = useState<HouseRecordEntry[]>(() => getHouseRecord());
  const [newlyAddedWinners, setNewlyAddedWinners] = useState<string[]>([]);
  const prevStatusRef = useRef<string | null>(null);

  const handleWSMessage = useCallback((msg: WSServerMessage) => {
    if (msg.type === 'host:state') {
      setRoom(msg.payload);
      setErrorMsg(null);
      saveHostSession({ code: msg.payload.code, hostToken: msg.payload.hostToken });

      if (prevStatusRef.current !== msg.payload.status) {
        if (msg.payload.status === 'reveal') playReveal(true);
        if (msg.payload.status === 'finished') playFanfare();
        prevStatusRef.current = msg.payload.status;
      }
    } else if (msg.type === 'error') {
      setErrorMsg(msg.message);
    } else if (msg.type === 'room:closed') {
      clearHostSession();
      setClosedMsg(msg.message);
    }
  }, []);

  const { status: wsStatus, send } = useRoomSocket({
    authMessage: { type: 'auth:host', hostToken },
    onMessage: handleWSMessage,
  });

  const currentQuestion = room?.questions[room.currentQuestionIndex] ?? null;

  const countdown = useCountdown({
    questionStartedAt: room?.questionStartedAt ?? null,
    timeLimitSec: currentQuestion?.timeLimitSec ?? 20,
    serverNow: room?.serverNow ?? Date.now(),
    isPaused: room?.isPaused ?? false,
    pausedRemainingMs: room?.pausedRemainingMs ?? null,
    active: room?.status === 'question',
  });

  useEffect(() => {
    let cancelled = false;
    fetchHostRoom(hostToken).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setRoom((prev) => prev ?? result.room);
      } else if (result.notFound) {
        clearHostSession();
        setClosedMsg(result.error || 'Host room not found or expired.');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hostToken]);

  useEffect(() => {
    setConfirmKickId(null);
    setConfirmCancel(false);
    if (room?.status !== 'finished') {
      setNewlyAddedWinners([]);
    }
  }, [room?.status]);

  // Record finished round winners into monthly House Record (FR-31)
  useEffect(() => {
    if (!room || room.status !== 'finished') return;
    if (room.leaderboard.length < 2) {
      setHouseRecord(getHouseRecord());
      return;
    }
    const topScore = room.leaderboard[0].score;
    const winners = room.leaderboard
      .filter((entry) => entry.score === topScore)
      .map((entry) => entry.name);
    const roundKey = `${room.code}-${room.roundNumber}`;
    const result = recordRoundWinners(roundKey, winners);
    setHouseRecord(result.entries);
    if (result.newlyAddedNames.length > 0) {
      setNewlyAddedWinners(result.newlyAddedNames);
    }
  }, [room]);

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    setSoundMuted(next);
  };

  const joinUrl = room ? `${window.location.origin}/?code=${room.code}` : '';

  const copyCode = () => {
    if (!room) return;
    navigator.clipboard.writeText(room.code).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  const copyJoinLink = () => {
    if (!joinUrl) return;
    navigator.clipboard.writeText(joinUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const handleCreateAnother = async () => {
    setErrorMsg(null);
    try {
      const data = await createRoom();
      saveHostSession({ code: data.code, hostToken: data.hostToken });
      onNewGame(data.hostToken);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "That didn't go through. Check your connection and try again.",
      );
    }
  };

  if (closedMsg) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
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

  if (!room) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <MascotIllustration className="w-28 h-28 mx-auto" />
          <p className="font-display font-bold text-lg text-text">Setting things up…</p>
        </div>
      </div>
    );
  }

  const totalQuestions = room.questions.length;
  const isLastQuestion = room.currentQuestionIndex >= totalQuestions - 1;
  const totalAnswersCurrent = room.answeredPlayerIds.length;
  const totalPlayers = room.players.length;

  const lobbyCountMessage =
    totalPlayers === 0
      ? 'Nobody yet. Share the code.'
      : totalPlayers <= 2
        ? 'A couple in. More coming?'
        : 'Good crowd. Start whenever.';

  const topScore = room.leaderboard[0]?.score ?? 0;
  const topWinners =
    room.leaderboard.length > 0
      ? room.leaderboard.filter((entry) => entry.score === topScore)
      : [];

  const finishedSubtitle = (() => {
    if (room.leaderboard.length === 0) return 'No players finished this round.';
    if (room.leaderboard.length === 1) {
      return `Solo round. You scored ${room.leaderboard[0].score} — now get some housemates in here.`;
    }
    if (topWinners.length > 1) {
      const names = formatNameList(topWinners.map((w) => w.name));
      return `It's a tie! ${names} ${topWinners.length === 2 ? 'both' : 'all'} finished on ${topScore}.`;
    }
    return `Here's how this round finished. ${topWinners[0].name} takes it with ${topScore} pts.`;
  })();

  return (
    <div className={`min-h-screen text-text flex flex-col ${getHostStateClasses(room.status)}`}>
      {/* Compact Host Top Bar */}
      <header className="w-full border-b border-border bg-surface">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={onExitHome}
              className="font-display font-extrabold text-base sm:text-lg text-text hover:text-accent transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              noggin
            </button>
            <span className="text-xs font-mono font-bold text-muted whitespace-nowrap shrink-0">
              Room {room.code}
            </span>
            {room.title && room.status !== 'setup' && (
              <span className="hidden md:inline text-xs font-semibold text-muted truncate min-w-0">
                · {room.title}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute game sounds' : 'Mute game sounds'}
              className="btn-secondary w-9 h-9 flex items-center justify-center cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onExitHome}
              className="btn-ghost px-2.5 sm:px-3 py-1.5 text-xs whitespace-nowrap shrink-0 cursor-pointer"
            >
              Home
            </button>
          </div>
        </div>
      </header>

      {(wsStatus === 'reconnecting' || wsStatus === 'closed') && (
        <div className="bg-warning-soft border-b border-warning px-4 py-2 text-center text-xs font-bold text-warning">
          Hold on — reconnecting… Your spot&apos;s saved.
        </div>
      )}

      {errorMsg && (
        <div className="bg-danger-soft border-b border-danger px-4 py-2 text-center text-xs font-bold text-danger break-words">
          {errorMsg}
        </div>
      )}

      {/* STATE 1: SETUP (.state-lobby) */}
      {room.status === 'setup' && (
        <main className="flex-1">
          <QuestionEditor
            title={room.title}
            questions={room.questions}
            onTitleChange={(nextTitle: string) =>
              send({ type: 'host:set_title', title: nextTitle })
            }
            onChange={(next: QuestionInput[]) =>
              send({ type: 'host:set_questions', questions: next })
            }
            onOpenLobby={() => {
              playTap();
              send({ type: 'host:open_lobby' });
            }}
          />
        </main>
      )}

      {/* STATE 2: LOBBY (.state-lobby, cool blue, no gradient) */}
      {room.status === 'lobby' && (
        <main className="flex-1 flex flex-col min-w-0">
          <section className="border-b border-border bg-surface py-6 sm:py-8 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto text-center space-y-5 min-w-0">
              <div className="space-y-1 min-w-0">
                <p className="text-xs font-bold tracking-wide text-muted">Room code</p>
                <p className="text-sm font-medium text-muted break-words">
                  Share this with the house. Join on phones at{' '}
                  <span className="font-mono text-text break-all">{window.location.host}</span>
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-5 max-w-full">
                <button
                  type="button"
                  onClick={copyCode}
                  title="Tap to copy room code"
                  className="room-code text-4xl sm:text-[56px] px-5 sm:px-8 py-4 sm:py-6 leading-none tabular-nums select-all cursor-pointer hover:border-accent transition-colors"
                >
                  {room.code}
                </button>
                <div className="flex flex-wrap justify-center sm:flex-col gap-2">
                  <button
                    type="button"
                    onClick={copyCode}
                    className="btn-secondary inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs cursor-pointer whitespace-nowrap"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode ? 'Copied code' : 'Copy code'}
                  </button>
                  <button
                    type="button"
                    onClick={copyJoinLink}
                    className="btn-primary inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs cursor-pointer whitespace-nowrap"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                    {copiedLink ? 'Copied join link' : 'Copy join link'}
                  </button>
                </div>
              </div>

              <p className="text-sm font-medium text-muted tabular-nums break-words">
                {room.title} · {totalQuestions} questions · {lobbyCountMessage}
              </p>
            </div>
          </section>

          <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col justify-between gap-6 min-w-0">
            <div className="space-y-5 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display font-extrabold text-xl text-text flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent shrink-0" />
                  <span>Players · {totalPlayers}</span>
                </h2>
                <span className="text-xs font-semibold text-muted">{lobbyCountMessage}</span>
              </div>

              <LobbyCanvas
                players={room.players}
                canKick
                onKickPlayer={(playerId) => send({ type: 'host:kick_player', playerId })}
                heightClassName="h-[270px] sm:h-[360px]"
                subtitle={`Pass around ${room.code} or tap Copy join link above. Avatars float in as housemates join.`}
              />

              {totalPlayers > 0 && (
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {room.players.map((p) => {
                    const isConfirming = confirmKickId === p.id;
                    return (
                      <div
                        key={p.id}
                        className="bg-surface rounded-2xl border border-border px-4 py-3 flex items-center justify-between gap-2 min-w-0"
                      >
                        <div className="min-w-0">
                          <p className="font-display font-bold text-base text-text truncate">
                            {p.name}
                          </p>
                          <p className="text-xs text-muted">
                            {p.connected ? 'In room' : 'Reconnecting'}
                          </p>
                        </div>
                        {isConfirming ? (
                          <button
                            type="button"
                            onClick={() => {
                              send({ type: 'host:kick_player', playerId: p.id });
                              setConfirmKickId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-danger text-white text-[11px] font-bold shrink-0 cursor-pointer"
                          >
                            Remove
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmKickId(p.id)}
                            aria-label={`Remove ${p.name}`}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:bg-danger-soft hover:text-danger shrink-0 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Lobby Footer Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-border">
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => send({ type: 'host:edit_questions' })}
                  className="btn-secondary px-5 h-11 sm:h-12 text-sm cursor-pointer whitespace-nowrap"
                >
                  Edit questions
                </button>
                {confirmCancel ? (
                  <button
                    type="button"
                    onClick={() => send({ type: 'host:cancel_room' })}
                    className="px-5 h-11 sm:h-12 rounded-[14px] bg-danger text-white text-sm font-bold cursor-pointer whitespace-nowrap"
                  >
                    Confirm close room
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmCancel(true)}
                    className="btn-ghost px-4 h-11 sm:h-12 text-sm cursor-pointer whitespace-nowrap"
                  >
                    Close room
                  </button>
                )}
              </div>

              <div className="flex flex-col items-stretch sm:items-end gap-1">
                <button
                  type="button"
                  disabled={totalQuestions < 10 || totalPlayers === 0}
                  onClick={() => {
                    playTap();
                    send({ type: 'host:start_game' });
                  }}
                  className="btn-primary inline-flex items-center justify-center gap-2.5 px-6 sm:px-8 h-12 text-base cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Play className="w-5 h-5 fill-current shrink-0" />
                  {totalPlayers === 0 ? 'Needs 1+ player' : 'Start round'}
                </button>
                {totalPlayers > 0 && totalQuestions >= 10 && (
                  <span className="text-xs text-muted sm:text-right">Ready when you are.</span>
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* STATE 3: QUESTION (.state-question .bg-question, terracotta + subtle top glow) */}
      {room.status === 'question' && currentQuestion && (
        <main className="flex-1 flex flex-col min-w-0">
          <section className="border-b border-border pt-6 pb-6 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto space-y-5 min-w-0">
              <SegmentedProgress total={totalQuestions} currentIndex={room.currentQuestionIndex} />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 min-w-0">
                <div className="text-center sm:text-left min-w-0 w-full">
                  <p className="font-mono font-bold text-sm text-accent tabular-nums">
                    Question {room.currentQuestionIndex + 1} of {totalQuestions}
                  </p>
                  <h1 className="font-display font-extrabold text-2xl sm:text-4xl lg:text-5xl text-text mt-2 leading-tight text-balance break-words">
                    {currentQuestion.prompt}
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

          <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col justify-between gap-8 min-w-0">
            <div className="space-y-6 min-w-0">
              {/* Live answer count meter */}
              <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4 bg-surface rounded-2xl border border-border px-5 py-3.5">
                <span className="font-display font-bold text-base sm:text-lg text-text tabular-nums">
                  Answered · {totalAnswersCurrent} of {totalPlayers}
                </span>
                <div className="flex-1 min-w-[120px] max-w-xs h-3 rounded-full bg-surface-2 border border-border overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-200"
                    style={{
                      width: `${totalPlayers > 0 ? Math.round((totalAnswersCurrent / totalPlayers) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>

              {/* Answer Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentQuestion.options.map((opt, idx) => (
                  <div
                    key={idx}
                    className="bg-surface rounded-2xl border-2 border-border px-5 sm:px-6 py-4 sm:py-5 flex items-center gap-4 min-w-0"
                  >
                    <span className="w-11 h-11 rounded-full bg-accent-soft border border-accent text-accent flex items-center justify-center font-display font-extrabold text-lg shrink-0">
                      {OPTION_LETTERS[idx]}
                    </span>
                    <span className="font-display font-bold text-lg sm:text-2xl text-text leading-snug min-w-0 flex-1 break-words">
                      {opt}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Host Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
              <button
                type="button"
                onClick={() => send({ type: 'host:end_game' })}
                className="btn-ghost px-4 h-11 text-sm cursor-pointer whitespace-nowrap"
              >
                End round
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => send({ type: 'host:skip_question' })}
                  className="btn-ghost inline-flex items-center gap-2 px-4 h-11 text-sm cursor-pointer whitespace-nowrap"
                >
                  <SkipForward className="w-4 h-4" />
                  Skip question
                </button>
                <div className="flex flex-col items-end gap-1">
                  <button
                    type="button"
                    onClick={() => send({ type: 'host:reveal_now' })}
                    className="btn-primary px-6 sm:px-7 h-12 text-sm sm:text-base cursor-pointer whitespace-nowrap"
                  >
                    Lock answers
                  </button>
                  <span className="text-[11px] text-faint">
                    Skip the wait — lock it and reveal.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* STATE 4: REVEAL (.state-reveal, bright green payoff, no gradient) */}
      {room.status === 'reveal' && currentQuestion && (
        <main className="flex-1 flex flex-col min-w-0">
          <section className="border-b border-border bg-surface pt-6 pb-6 px-4 sm:px-6">
            <div className="max-w-5xl mx-auto space-y-3 min-w-0">
              <SegmentedProgress total={totalQuestions} currentIndex={room.currentQuestionIndex} />
              <p className="font-mono font-bold text-sm text-accent tabular-nums">
                Question {room.currentQuestionIndex + 1} of {totalQuestions}
              </p>
              <h1 className="font-display font-extrabold text-2xl sm:text-4xl text-text leading-tight text-balance break-words">
                {currentQuestion.prompt}
              </h1>
              <div className="inline-flex max-w-full items-start sm:items-center gap-2 rounded-[14px] bg-success-soft border border-success px-4 py-2 text-sm sm:text-base font-bold text-success">
                <Check className="w-4 h-4 stroke-[2.5] shrink-0 mt-0.5 sm:mt-0" />
                <span className="min-w-0 break-words">
                  The answer was: {OPTION_LETTERS[currentQuestion.correctIndex]}.{' '}
                  {currentQuestion.options[currentQuestion.correctIndex]}
                </span>
              </div>
            </div>
          </section>

          <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 flex flex-col justify-between gap-8 min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Distribution & Correct Answer */}
              <div className="lg:col-span-6 space-y-3.5 min-w-0">
                <h2 className="font-display font-bold text-lg text-text">Answer breakdown</h2>
                {currentQuestion.options.map((opt, idx) => {
                  const isCorrect = idx === currentQuestion.correctIndex;
                  const count = room.answerDistribution[idx] ?? 0;
                  const pct =
                    totalAnswersCurrent > 0
                      ? Math.round((count / totalAnswersCurrent) * 100)
                      : 0;
                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl border-2 p-4 min-w-0 ${
                        isCorrect
                          ? 'bg-success-soft border-success'
                          : 'bg-surface border-border'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 min-w-0">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span
                            className={`w-9 h-9 rounded-full border flex items-center justify-center font-display font-bold text-sm shrink-0 ${
                              isCorrect
                                ? 'bg-success border-success text-on-accent'
                                : 'bg-surface-2 border-border text-muted'
                            }`}
                          >
                            {isCorrect ? <Check className="w-4 h-4 stroke-[2.5]" /> : OPTION_LETTERS[idx]}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-display font-bold text-base sm:text-lg text-text break-words">
                              {opt}
                            </p>
                            {isCorrect && (
                              <p className="text-xs font-bold text-success">Correct answer</p>
                            )}
                          </div>
                        </div>
                        <span className="font-mono font-bold text-sm text-text tabular-nums shrink-0">
                          {count} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-2.5 h-2 rounded-full bg-surface border border-border overflow-hidden">
                        <div
                          className={`h-full ${isCorrect ? 'bg-success' : 'bg-surface-2'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Leaderboard — bold & clear for casting to a larger screen */}
              <div className="lg:col-span-6 bg-surface rounded-2xl border border-border overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-baseline justify-between gap-2">
                  <h2 className="font-display font-extrabold text-xl sm:text-2xl text-text">
                    Leaderboard
                  </h2>
                  {room.leaderboard.length > 0 && (
                    <span className="text-xs font-mono font-bold text-muted tabular-nums">
                      Top {Math.min(room.leaderboard.length, 6)}
                    </span>
                  )}
                </div>
                {room.leaderboard.length === 0 ? (
                  <p className="p-6 text-sm text-muted">No players in this room yet.</p>
                ) : (
                  <div>
                    {room.leaderboard.slice(0, 6).map((entry) => {
                      const rowTone =
                        entry.rank === 1
                          ? 'lb-row--1st'
                          : entry.rank === 2
                            ? 'lb-row--2nd'
                            : 'lb-row';
                      return (
                        <div
                          key={entry.id}
                          className={`${rowTone} px-6 py-3.5 flex items-center justify-between gap-4`}
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <span className="w-9 h-9 rounded-full border border-border bg-surface font-mono font-extrabold text-sm text-text flex items-center justify-center tabular-nums shrink-0">
                              {entry.rank}
                            </span>
                            <span className="font-display font-extrabold text-lg sm:text-xl text-text truncate">
                              {entry.name}
                            </span>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-mono font-extrabold text-xl sm:text-2xl text-text tabular-nums leading-none">
                              {entry.score}
                            </p>
                            {entry.lastPoints > 0 && (
                              <p className="font-mono text-xs sm:text-sm font-bold text-success tabular-nums mt-1">
                                +{entry.lastPoints}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Host Reveal Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
              {!isLastQuestion ? (
                <button
                  type="button"
                  onClick={() => send({ type: 'host:end_game' })}
                  className="btn-ghost px-4 h-11 text-sm cursor-pointer whitespace-nowrap"
                >
                  End round early
                </button>
              ) : (
                <span className="text-sm font-semibold text-muted">Final question revealed</span>
              )}

              <button
                type="button"
                onClick={() => {
                  playTap();
                  send({ type: isLastQuestion ? 'host:end_game' : 'host:next_question' });
                }}
                className="btn-primary px-8 h-12 text-base cursor-pointer whitespace-nowrap"
              >
                {isLastQuestion ? 'See results' : 'Next question'}
              </button>
            </div>
          </div>
        </main>
      )}

      {/* STATE 5: FINISHED / PODIUM (.state-podium .bg-podium, gold celebration) */}
      {room.status === 'finished' && (
        <main className="flex-1 flex flex-col min-w-0">
          <section className="pt-8 pb-4 px-4 sm:px-6 text-center">
            <div className="max-w-4xl mx-auto space-y-1.5 min-w-0">
              <p className="text-xs font-bold text-accent break-words">
                {room.title} · Room {room.code}
              </p>
              <h1 className="font-display font-extrabold text-3xl sm:text-5xl text-text">
                That&apos;s a wrap.
              </h1>
              <p className="text-sm sm:text-base font-semibold text-muted max-w-2xl mx-auto break-words">
                {finishedSubtitle}
              </p>
            </div>
          </section>

          <div className="max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8 flex-1 min-w-0">
            <PodiumDisplay entries={room.leaderboard} large />

            {/* House Record (FR-31) */}
            {houseRecord.length > 0 && (
              <div className="bg-surface rounded-3xl border border-border p-5 sm:p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1">
                  <h2 className="font-display font-extrabold text-lg text-text">House record</h2>
                  <p className="text-xs text-muted">
                    Resets on the 1st. Purely for bragging rights.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {houseRecord.slice(0, 6).map((entry) => {
                    const isNew = newlyAddedWinners.includes(entry.name);
                    return (
                      <div
                        key={entry.name}
                        className="bg-surface-2 rounded-2xl border border-border px-4 py-3 flex items-center justify-between gap-3 min-w-0"
                      >
                        <span className="font-display font-bold text-base text-text truncate">
                          {entry.name}
                        </span>
                        <span className="font-mono font-bold text-xs text-muted tabular-nums whitespace-nowrap shrink-0">
                          {entry.wins} {entry.wins === 1 ? 'win' : 'wins'} this month
                          {isNew ? ' (+1)' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {room.leaderboard.length > 0 && (
              <div className="bg-surface rounded-3xl border border-border overflow-hidden">
                <div className="px-5 sm:px-6 py-4 border-b border-border">
                  <h2 className="font-display font-extrabold text-xl text-text">Full scoreboard</h2>
                </div>
                <div>
                  {room.leaderboard.map((entry) => {
                    const rowTone =
                      entry.rank === 1
                        ? 'lb-row--1st'
                        : entry.rank === 2
                          ? 'lb-row--2nd'
                          : 'lb-row';
                    return (
                      <div
                        key={entry.id}
                        className={`${rowTone} px-5 sm:px-6 py-4 flex items-center justify-between gap-4`}
                      >
                        <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                          <span className="font-mono font-extrabold text-base text-muted w-8 sm:w-9 tabular-nums shrink-0">
                            #{entry.rank}
                          </span>
                          <span className="font-display font-extrabold text-lg sm:text-xl text-text truncate">
                            {entry.name}
                          </span>
                        </div>
                        <span className="font-mono font-extrabold text-lg sm:text-xl text-text tabular-nums shrink-0">
                          {entry.score} pts
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  playTap();
                  send({ type: 'host:play_again' });
                }}
                className="btn-primary inline-flex items-center justify-center gap-2 px-5 sm:px-7 h-12 text-sm sm:text-base cursor-pointer max-w-full"
              >
                <RotateCcw className="w-4 h-4 shrink-0" />
                <span>Play again — same questions</span>
              </button>
              <button
                type="button"
                onClick={() => send({ type: 'host:edit_questions' })}
                className="btn-secondary px-5 sm:px-6 h-12 text-sm sm:text-base cursor-pointer max-w-full"
              >
                Edit questions &amp; replay
              </button>
              <button
                type="button"
                onClick={handleCreateAnother}
                className="btn-ghost px-5 h-12 text-sm cursor-pointer whitespace-nowrap"
              >
                New round
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}
