export type RoomStatus = 'setup' | 'lobby' | 'question' | 'reveal' | 'finished';

export interface Question {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  timeLimitSec: number;
}

export interface QuestionInput {
  prompt: string;
  options: string[];
  correctIndex: number;
  timeLimitSec?: number;
}

export interface PlayerPublic {
  id: string;
  name: string;
  score: number;
  connected: boolean;
  lastPoints: number;
  lastCorrect: boolean | null;
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  rank: number;
  lastPoints: number;
  lastCorrect: boolean | null;
}

export interface HostRoomView {
  code: string;
  hostToken: string;
  title: string;
  roundNumber: number;
  status: RoomStatus;
  questions: Question[];
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  serverNow: number;
  isPaused: boolean;
  pausedRemainingMs: number | null;
  players: PlayerPublic[];
  answeredPlayerIds: string[];
  answerDistribution: number[];
  leaderboard: LeaderboardEntry[];
  createdAt: number;
  expiresAt: number;
}

export interface ScreenRoomView {
  code: string;
  title: string;
  roundNumber: number;
  status: RoomStatus;
  totalQuestions: number;
  currentQuestionIndex: number;
  currentQuestion: {
    id: string;
    prompt: string;
    options: string[];
    timeLimitSec: number;
    correctIndex?: number;
  } | null;
  questionStartedAt: number | null;
  serverNow: number;
  isPaused: boolean;
  pausedRemainingMs: number | null;
  players: { id: string; name: string; score: number; connected: boolean }[];
  answeredCount: number;
  answerDistribution: number[];
  leaderboard: LeaderboardEntry[];
}

export interface PlayerQuestionPublic {
  id: string;
  prompt: string;
  options: string[];
  timeLimitSec: number;
  correctIndex?: number;
}

export interface PlayerAnswerPublic {
  choiceIndex: number;
  isCorrect: boolean | null;
  points: number;
  speedBonus: number;
  isFastest: boolean;
}

export interface PlayerRoomView {
  code: string;
  title: string;
  roundNumber: number;
  status: RoomStatus;
  me: PlayerPublic & { rank: number };
  currentQuestionIndex: number;
  currentQuestion: PlayerQuestionPublic | null;
  questionStartedAt: number | null;
  serverNow: number;
  isPaused: boolean;
  pausedRemainingMs: number | null;
  myAnswer: PlayerAnswerPublic | null;
  playersCount: number;
  answeredCount: number;
  players: { id: string; name: string; score: number; connected: boolean }[];
  topLeaderboard: LeaderboardEntry[];
  fullLeaderboard: LeaderboardEntry[];
}

export type WSServerMessage =
  | { type: 'host:state'; payload: HostRoomView }
  | { type: 'screen:state'; payload: ScreenRoomView }
  | { type: 'player:state'; payload: PlayerRoomView }
  | { type: 'error'; message: string }
  | { type: 'kicked'; message: string }
  | { type: 'room:closed'; message: string }
  | { type: 'pong' };

export type WSClientMessage =
  | { type: 'auth:host'; hostToken: string }
  | { type: 'auth:screen'; code: string }
  | { type: 'auth:player'; code: string; playerId: string }
  | { type: 'host:set_title'; title: string }
  | { type: 'host:set_questions'; questions: QuestionInput[] }
  | { type: 'host:open_lobby' }
  | { type: 'host:edit_questions' }
  | { type: 'host:start_game' }
  | { type: 'host:reveal_now' }
  | { type: 'host:skip_question' }
  | { type: 'host:next_question' }
  | { type: 'host:end_game' }
  | { type: 'host:play_again' }
  | { type: 'host:kick_player'; playerId: string }
  | { type: 'host:cancel_room' }
  | { type: 'player:submit_answer'; questionIndex: number; choiceIndex: number }
  | { type: 'ping' };
