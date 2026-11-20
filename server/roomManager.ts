import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { WebSocket } from 'ws';
import type {
  HostRoomView,
  LeaderboardEntry,
  PlayerPublic,
  PlayerRoomView,
  Question,
  QuestionInput,
  RoomStatus,
  ScreenRoomView,
} from '../src/shared/types';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 5;
const ROOM_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours inactivity
const MAX_QUESTIONS = 50;
const MIN_QUESTIONS = 10;
const SNAPSHOT_PATH = path.join('/tmp', 'housequiz-rooms-v1.json');

interface AnswerEntry {
  playerId: string;
  questionIndex: number;
  choiceIndex: number;
  answeredAt: number;
  isCorrect: boolean;
  points: number;
  speedBonus: number;
}

interface InternalPlayer {
  id: string;
  name: string;
  score: number;
  lastSeen: number;
  lastPoints: number;
  lastCorrect: boolean | null;
}

interface InternalRoom {
  id: string;
  code: string;
  hostToken: string;
  title: string;
  roundNumber: number;
  status: RoomStatus;
  questions: Question[];
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  isPaused: boolean;
  pausedRemainingMs: number | null;
  players: Map<string, InternalPlayer>;
  answers: AnswerEntry[];
  createdAt: number;
  updatedAt: number;
}

interface SerializedRoom {
  id: string;
  code: string;
  hostToken: string;
  title?: string;
  roundNumber?: number;
  status: RoomStatus;
  questions: Question[];
  currentQuestionIndex: number;
  questionStartedAt: number | null;
  isPaused: boolean;
  pausedRemainingMs: number | null;
  players: InternalPlayer[];
  answers: AnswerEntry[];
  createdAt: number;
  updatedAt: number;
}

function generateRoomCode(existingCodes: Set<string>): string {
  for (let attempt = 0; attempt < 200; attempt++) {
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      const idx = crypto.randomInt(0, CODE_ALPHABET.length);
      code += CODE_ALPHABET[idx];
    }
    if (!existingCodes.has(code)) {
      return code;
    }
  }
  throw new Error('Could not allocate unique room code');
}

function sanitizeQuestions(inputs: QuestionInput[]): Question[] {
  const valid: Question[] = [];
  for (const item of inputs.slice(0, MAX_QUESTIONS)) {
    const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
    const options = Array.isArray(item.options)
      ? item.options.map((o) => String(o ?? '').trim()).filter((o) => o.length > 0).slice(0, 4)
      : [];
    if (!prompt || options.length < 2) continue;
    const correctIndex =
      Number.isInteger(item.correctIndex) && item.correctIndex >= 0 && item.correctIndex < options.length
        ? item.correctIndex
        : 0;
    const rawTime = Number(item.timeLimitSec);
    const timeLimitSec = Number.isFinite(rawTime)
      ? Math.max(5, Math.min(120, Math.round(rawTime)))
      : 20;
    valid.push({
      id: crypto.randomUUID(),
      prompt,
      options,
      correctIndex,
      timeLimitSec,
    });
  }
  return valid;
}

function sanitizeDisplayName(raw: string): string {
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Player';
  return cleaned.slice(0, 16);
}

function dedupeName(desired: string, existingNames: Set<string>): string {
  const lowerExisting = new Set(Array.from(existingNames).map((n) => n.toLowerCase()));
  if (!lowerExisting.has(desired.toLowerCase())) {
    return desired;
  }
  let counter = 2;
  while (counter < 100) {
    const suffix = ` (${counter})`;
    const maxBase = Math.max(1, 16 - suffix.length);
    const candidate = `${desired.slice(0, maxBase).trimEnd()}${suffix}`;
    if (!lowerExisting.has(candidate.toLowerCase())) {
      return candidate;
    }
    counter++;
  }
  return `Player ${crypto.randomInt(100, 999)}`;
}

export class RoomManager {
  private roomsByCode = new Map<string, InternalRoom>();
  private roomsByHostToken = new Map<string, InternalRoom>();
  private questionTimers = new Map<string, NodeJS.Timeout>();
  private hostSockets = new Map<string, Set<WebSocket>>();
  private screenSockets = new Map<string, Set<WebSocket>>();
  private playerSockets = new Map<string, Map<string, Set<WebSocket>>>(); // code -> playerId -> sockets
  private saveTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.loadSnapshot();
    setInterval(() => this.sweepExpiredRooms(), 60 * 1000).unref();
  }

  private scheduleSave() {
    if (this.saveTimeout) return;
    this.saveTimeout = setTimeout(() => {
      this.saveTimeout = null;
      this.writeSnapshot();
    }, 400);
  }

  private writeSnapshot() {
    try {
      const data: SerializedRoom[] = [];
      for (const room of this.roomsByCode.values()) {
        data.push({
          id: room.id,
          code: room.code,
          hostToken: room.hostToken,
          title: room.title,
          roundNumber: room.roundNumber,
          status: room.status,
          questions: room.questions,
          currentQuestionIndex: room.currentQuestionIndex,
          questionStartedAt: room.questionStartedAt,
          isPaused: room.isPaused,
          pausedRemainingMs: room.pausedRemainingMs,
          players: Array.from(room.players.values()),
          answers: room.answers,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        });
      }
      fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(data), 'utf8');
    } catch {
      // Ignore transient disk write errors
    }
  }

  private loadSnapshot() {
    try {
      if (!fs.existsSync(SNAPSHOT_PATH)) return;
      const raw = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
      const list = JSON.parse(raw) as SerializedRoom[];
      if (!Array.isArray(list)) return;
      const now = Date.now();
      for (const item of list) {
        if (now - item.updatedAt > ROOM_TTL_MS) continue;
        const room: InternalRoom = {
          id: item.id,
          code: item.code,
          hostToken: item.hostToken,
          title: item.title || 'Untitled house round',
          roundNumber: item.roundNumber || 1,
          status: item.status,
          questions: item.questions,
          currentQuestionIndex: item.currentQuestionIndex,
          questionStartedAt: item.questionStartedAt,
          isPaused: item.status === 'question' ? true : item.isPaused,
          pausedRemainingMs:
            item.status === 'question' && !item.isPaused && item.questionStartedAt
              ? Math.max(
                  1000,
                  (item.questions[item.currentQuestionIndex]?.timeLimitSec ?? 20) * 1000 -
                    (now - item.questionStartedAt),
                )
              : item.pausedRemainingMs,
          players: new Map(item.players.map((p) => [p.id, p])),
          answers: item.answers ?? [],
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        };
        this.roomsByCode.set(room.code, room);
        this.roomsByHostToken.set(room.hostToken, room);
      }
    } catch {
      // Start fresh if snapshot unreadable
    }
  }

  private sweepExpiredRooms() {
    const now = Date.now();
    for (const room of Array.from(this.roomsByCode.values())) {
      if (now - room.updatedAt > ROOM_TTL_MS) {
        this.destroyRoom(room, 'Room expired after 4 hours of inactivity.');
      }
    }
  }

  private destroyRoom(room: InternalRoom, reason: string) {
    this.clearQuestionTimer(room.code);
    this.roomsByCode.delete(room.code);
    this.roomsByHostToken.delete(room.hostToken);

    const payload = JSON.stringify({ type: 'room:closed', message: reason });
    const hSockets = this.hostSockets.get(room.code);
    if (hSockets) {
      for (const ws of hSockets) {
        if (ws.readyState === 1) ws.send(payload);
      }
      this.hostSockets.delete(room.code);
    }

    const sSockets = this.screenSockets.get(room.code);
    if (sSockets) {
      for (const ws of sSockets) {
        if (ws.readyState === 1) ws.send(payload);
      }
      this.screenSockets.delete(room.code);
    }

    const pMap = this.playerSockets.get(room.code);
    if (pMap) {
      for (const sockets of pMap.values()) {
        for (const ws of sockets) {
          if (ws.readyState === 1) ws.send(payload);
        }
      }
      this.playerSockets.delete(room.code);
    }
    this.scheduleSave();
  }

  private touch(room: InternalRoom) {
    room.updatedAt = Date.now();
    this.scheduleSave();
  }

  private clearQuestionTimer(code: string) {
    const existing = this.questionTimers.get(code);
    if (existing) {
      clearTimeout(existing);
      this.questionTimers.delete(code);
    }
  }

  private scheduleQuestionTimeout(room: InternalRoom, delayMs: number) {
    this.clearQuestionTimer(room.code);
    const expectedIndex = room.currentQuestionIndex;
    const timer = setTimeout(() => {
      this.questionTimers.delete(room.code);
      if (
        room.status === 'question' &&
        !room.isPaused &&
        room.currentQuestionIndex === expectedIndex
      ) {
        this.revealCurrentQuestion(room);
      }
    }, Math.max(50, delayMs));
    this.questionTimers.set(room.code, timer);
  }

  public createRoom(): { code: string; hostToken: string } {
    this.sweepExpiredRooms();
    const existingCodes = new Set(this.roomsByCode.keys());
    const code = generateRoomCode(existingCodes);
    const hostToken = crypto.randomBytes(16).toString('hex');
    const now = Date.now();

    const room: InternalRoom = {
      id: crypto.randomUUID(),
      code,
      hostToken,
      title: 'Untitled house round',
      roundNumber: 1,
      status: 'setup',
      questions: [],
      currentQuestionIndex: 0,
      questionStartedAt: null,
      isPaused: false,
      pausedRemainingMs: null,
      players: new Map(),
      answers: [],
      createdAt: now,
      updatedAt: now,
    };

    this.roomsByCode.set(code, room);
    this.roomsByHostToken.set(hostToken, room);
    this.scheduleSave();
    return { code, hostToken };
  }

  public getRoomByCode(code: string): InternalRoom | null {
    const normalized = code.trim().toUpperCase();
    const room = this.roomsByCode.get(normalized);
    if (!room) return null;
    if (Date.now() - room.updatedAt > ROOM_TTL_MS) {
      this.destroyRoom(
        room,
        "That round's already wrapped up. Ask the host to start a new one.",
      );
      return null;
    }
    return room;
  }

  public getRoomByHostToken(hostToken: string): InternalRoom | null {
    const room = this.roomsByHostToken.get(hostToken.trim());
    if (!room) return null;
    if (Date.now() - room.updatedAt > ROOM_TTL_MS) {
      this.destroyRoom(
        room,
        "That round's already wrapped up. Ask the host to start a new one.",
      );
      return null;
    }
    return room;
  }

  public joinPlayer(
    code: string,
    rawName: string,
    existingPlayerId?: string,
  ): { ok: true; playerId: string; name: string; code: string } | { ok: false; error: string } {
    const room = this.getRoomByCode(code);
    if (!room) {
      return {
        ok: false,
        error: "That code didn't work. Double-check with the host — codes are 5–6 letters.",
      };
    }

    if (existingPlayerId) {
      const existing = room.players.get(existingPlayerId);
      if (existing) {
        existing.lastSeen = Date.now();
        this.touch(room);
        this.broadcastRoomState(room);
        return { ok: true, playerId: existing.id, name: existing.name, code: room.code };
      }
    }

    const desired = sanitizeDisplayName(rawName);
    const existingNames = new Set(Array.from(room.players.values()).map((p) => p.name));
    const finalName = dedupeName(desired, existingNames);
    const player: InternalPlayer = {
      id: crypto.randomUUID(),
      name: finalName,
      score: 0,
      lastSeen: Date.now(),
      lastPoints: 0,
      lastCorrect: null,
    };

    room.players.set(player.id, player);
    this.touch(room);
    this.broadcastRoomState(room);
    return { ok: true, playerId: player.id, name: player.name, code: room.code };
  }

  public registerHostSocket(hostToken: string, ws: WebSocket): InternalRoom | null {
    const room = this.getRoomByHostToken(hostToken);
    if (!room) return null;

    let set = this.hostSockets.get(room.code);
    if (!set) {
      set = new Set();
      this.hostSockets.set(room.code, set);
    }
    set.add(ws);

    // If game was paused because host disconnected, resume smoothly
    if (room.status === 'question' && room.isPaused && room.pausedRemainingMs !== null) {
      const q = room.questions[room.currentQuestionIndex];
      if (q) {
        const totalMs = q.timeLimitSec * 1000;
        const remaining = Math.max(500, room.pausedRemainingMs);
        room.isPaused = false;
        room.questionStartedAt = Date.now() - (totalMs - remaining);
        room.pausedRemainingMs = null;
        this.scheduleQuestionTimeout(room, remaining);
        this.touch(room);
        this.broadcastRoomState(room);
      }
    } else {
      this.sendHostState(room, ws);
    }

    return room;
  }

  public unregisterHostSocket(code: string, ws: WebSocket) {
    const set = this.hostSockets.get(code);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) {
      this.hostSockets.delete(code);
      const room = this.roomsByCode.get(code);
      // FR-28: Host closes tab -> game pauses; room persists until expiry
      if (room && room.status === 'question' && !room.isPaused && room.questionStartedAt) {
        const q = room.questions[room.currentQuestionIndex];
        if (q) {
          const elapsed = Date.now() - room.questionStartedAt;
          const remaining = Math.max(0, q.timeLimitSec * 1000 - elapsed);
          this.clearQuestionTimer(room.code);
          room.isPaused = true;
          room.pausedRemainingMs = remaining;
          this.touch(room);
          this.broadcastRoomState(room);
        }
      }
    }
  }

  public registerPlayerSocket(code: string, playerId: string, ws: WebSocket): InternalRoom | null {
    const room = this.getRoomByCode(code);
    if (!room) return null;
    const player = room.players.get(playerId);
    if (!player) return null;

    player.lastSeen = Date.now();
    let codeMap = this.playerSockets.get(room.code);
    if (!codeMap) {
      codeMap = new Map();
      this.playerSockets.set(room.code, codeMap);
    }
    let set = codeMap.get(playerId);
    if (!set) {
      set = new Set();
      codeMap.set(playerId, set);
    }
    set.add(ws);

    this.broadcastRoomState(room);
    return room;
  }

  public unregisterPlayerSocket(code: string, playerId: string, ws: WebSocket) {
    const codeMap = this.playerSockets.get(code);
    if (!codeMap) return;
    const set = codeMap.get(playerId);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) {
      codeMap.delete(playerId);
    }
    const room = this.roomsByCode.get(code);
    if (room) {
      this.broadcastRoomState(room);
    }
  }

  private isPlayerConnected(code: string, playerId: string): boolean {
    const codeMap = this.playerSockets.get(code);
    if (!codeMap) return false;
    const set = codeMap.get(playerId);
    if (!set) return false;
    for (const ws of set) {
      if (ws.readyState === 1) return true;
    }
    return false;
  }

  public setTitle(hostToken: string, rawTitle: string): { ok: boolean; error?: string } {
    const room = this.getRoomByHostToken(hostToken);
    if (!room) return { ok: false, error: 'Room not found.' };
    const clean = rawTitle.trim().slice(0, 60);
    room.title = clean || 'Untitled house round';
    this.touch(room);
    this.broadcastRoomState(room);
    return { ok: true };
  }

  public setQuestions(hostToken: string, inputs: QuestionInput[]): { ok: boolean; error?: string } {
    const room = this.getRoomByHostToken(hostToken);
    if (!room) return { ok: false, error: 'Room not found.' };
    if (room.status !== 'setup' && room.status !== 'lobby' && room.status !== 'finished') {
      return { ok: false, error: 'Cannot edit questions while a question is active.' };
    }
    if (inputs.length > MAX_QUESTIONS) {
      return {
        ok: false,
        error: `That's the max — ${MAX_QUESTIONS} questions per round. Trim one to add another.`,
      };
    }
    room.questions = sanitizeQuestions(inputs);
    this.touch(room);
    this.broadcastRoomState(room);
    return { ok: true };
  }

  public openLobby(hostToken: string): { ok: boolean; error?: string } {
    const room = this.getRoomByHostToken(hostToken);
    if (!room) return { ok: false, error: 'Room not found.' };
    if (room.questions.length < MIN_QUESTIONS) {
      return {
        ok: false,
        error: `Almost there — you need at least ${MIN_QUESTIONS} questions to start. You've got ${room.questions.length}.`,
      };
    }
    room.status = 'lobby';
    this.touch(room);
    this.broadcastRoomState(room);
    return { ok: true };
  }

  public editQuestions(hostToken: string): { ok: boolean; error?: string } {
    const room = this.getRoomByHostToken(hostToken);
    if (!room) return { ok: false, error: 'Room not found.' };
    this.clearQuestionTimer(room.code);
    room.status = 'setup';
    room.isPaused = false;
    room.pausedRemainingMs = null;
    this.touch(room);
    this.broadcastRoomState(room);
    return { ok: true };
  }

  public startGame(hostToken: string): { ok: boolean; error?: string } {
    const room = this.getRoomByHostToken(hostToken);
    if (!room) return { ok: false, error: 'Room not found.' };
    if (room.questions.length < MIN_QUESTIONS) {
      return {
        ok: false,
        error: `Almost there — you need at least ${MIN_QUESTIONS} questions to start. You've got ${room.questions.length}.`,
      };
    }

    // Reset scores & answers for a clean run
    room.answers = [];
    for (const player of room.players.values()) {
      player.score = 0;
      player.lastPoints = 0;
      player.lastCorrect = null;
    }

    room.currentQuestionIndex = 0;
    this.beginQuestion(room);
    return { ok: true };
  }

  private beginQuestion(room: InternalRoom) {
    const q = room.questions[room.currentQuestionIndex];
    if (!q) {
      this.finishGame(room);
      return;
    }
    for (const player of room.players.values()) {
      player.lastPoints = 0;
      player.lastCorrect = null;
    }
    room.status = 'question';
    room.questionStartedAt = Date.now();
    room.isPaused = false;
    room.pausedRemainingMs = null;
    this.scheduleQuestionTimeout(room, q.timeLimitSec * 1000);
    this.touch(room);
    this.broadcastRoomState(room);
  }

  private revealCurrentQuestion(room: InternalRoom) {
    this.clearQuestionTimer(room.code);
    room.status = 'reveal';
    room.isPaused = false;
    room.pausedRemainingMs = null;
    this.touch(room);
    this.broadcastRoomState(room);
  }

  public revealNow(hostToken: string): { ok: boolean; error?: string } {
    const room = this.getRoomByHostToken(hostToken);
    if (!room) return { ok: false, error: 'Room not found.' };
    if (room.status !== 'question') return { ok: false, error: 'No active question.' };
    this.revealCurrentQuestion(room);
    return { ok: true };
  }

  public skipQuestion(hostToken: string): { ok: boolean; error?: string } {
    const room = this.getRoomByHostToken(hostToken);
    if (!room) return { ok: false, error: 'Room not found.' };
    if (room.status !== 'question') return { ok: false, error: 'No active question.' };
    this.clearQuestionTimer(room.code);
    if (room.currentQuestionIndex + 1 < room.questions.length) {
      room.currentQuestionIndex += 1;
      this.beginQuestion(room);
    } else {
      this.finishGame(room);
    }
    return { ok: true };
  }

  public nextQuestion(hostToken: string): { ok: boolean; error?: string } {
    const room = this.getRoomByHostToken(hostToken);
    if (!room) return { ok: false, error: 'Room not found.' };
    if (room.status !== 'reveal') return { ok: false, error: 'Not in reveal state.' };

    if (room.currentQuestionIndex + 1 < room.questions.length) {
      room.currentQuestionIndex += 1;
      this.beginQuestion(room);
    } else {
      this.finishGame(room);
    }
    return { ok: true };
  }

  private finishGame(room: InternalRoom) {
    this.clearQuestionTimer(room.code);
    room.status = 'finished';
    room.isPaused = false;
    room.pausedRemainingMs = null;
    this.touch(room);
    this.broadcastRoomState(room);
  }

  public endGame(hostToken: string): { ok: boolean; error?: string } {
    const room = this.getRoomByHostToken(hostToken);
    if (!room) return { ok: false, error: 'Room not found.' };
    this.finishGame(room);
    return { ok: true };
  }

  public playAgain(hostToken: string): { ok: boolean; error?: string } {
    const room = this.getRoomByHostToken(hostToken);
    if (!room) return { ok: false, error: 'Room not found.' };
    this.clearQuestionTimer(room.code);
    room.roundNumber += 1;
    room.answers = [];
    for (const player of room.players.values()) {
      player.score = 0;
      player.lastPoints = 0;
      player.lastCorrect = null;
    }
    room.currentQuestionIndex = 0;
    room.questionStartedAt = null;
    room.isPaused = false;
    room.pausedRemainingMs = null;
    room.status = 'lobby';
    this.touch(room);
    this.broadcastRoomState(room);
    return { ok: true };
  }

  public kickPlayer(hostToken: string, playerId: string): { ok: boolean; error?: string } {
    const room = this.getRoomByHostToken(hostToken);
    if (!room) return { ok: false, error: 'Room not found.' };
    if (!room.players.has(playerId)) return { ok: false, error: 'Player not found.' };

    room.players.delete(playerId);
    room.answers = room.answers.filter((a) => a.playerId !== playerId);

    const codeMap = this.playerSockets.get(room.code);
    if (codeMap) {
      const sockets = codeMap.get(playerId);
      if (sockets) {
        const msg = JSON.stringify({
          type: 'kicked',
          message: 'The host removed you from the lobby. No hard feelings. Ask them to let you back in.',
        });
        for (const ws of sockets) {
          if (ws.readyState === 1) ws.send(msg);
        }
        codeMap.delete(playerId);
      }
    }

    this.touch(room);
    this.broadcastRoomState(room);
    return { ok: true };
  }

  public cancelRoom(hostToken: string): { ok: boolean; error?: string } {
    const room = this.getRoomByHostToken(hostToken);
    if (!room) return { ok: false, error: 'Room not found.' };
    this.destroyRoom(
      room,
      "This room's closed. The host wrapped it up. Ask them for a new code.",
    );
    return { ok: true };
  }

  public submitAnswer(
    code: string,
    playerId: string,
    questionIndex: number,
    choiceIndex: number,
  ): { ok: boolean; error?: string } {
    const room = this.getRoomByCode(code);
    if (!room) return { ok: false, error: 'Room not found.' };
    const player = room.players.get(playerId);
    if (!player) return { ok: false, error: 'Player not in room.' };
    if (room.status !== 'question') {
      return { ok: false, error: 'Answers are currently locked.' };
    }
    if (room.isPaused) {
      return { ok: false, error: 'Game is paused while waiting for the host.' };
    }
    if (questionIndex !== room.currentQuestionIndex) {
      return { ok: false, error: 'This question is no longer active.' };
    }

    const q = room.questions[room.currentQuestionIndex];
    if (!q || !room.questionStartedAt) {
      return { ok: false, error: 'Question not initialized.' };
    }
    if (choiceIndex < 0 || choiceIndex >= q.options.length) {
      return { ok: false, error: 'Invalid option selected.' };
    }

    const alreadyAnswered = room.answers.some(
      (a) => a.playerId === playerId && a.questionIndex === questionIndex,
    );
    if (alreadyAnswered) {
      return { ok: false, error: 'Answer already locked in.' };
    }

    const now = Date.now();
    const totalMs = q.timeLimitSec * 1000;
    const elapsedMs = now - room.questionStartedAt;
    if (elapsedMs > totalMs) {
      return { ok: false, error: 'Time is up for this question.' };
    }

    const remainingMs = Math.max(0, totalMs - elapsedMs);
    const isCorrect = choiceIndex === q.correctIndex;
    const speedBonus = isCorrect ? Math.round(50 * (remainingMs / totalMs)) : 0;
    const points = isCorrect ? 100 + speedBonus : 0;

    const record: AnswerEntry = {
      playerId,
      questionIndex,
      choiceIndex,
      answeredAt: now,
      isCorrect,
      points,
      speedBonus,
    };

    room.answers.push(record);
    player.score += points;
    player.lastPoints = points;
    player.lastCorrect = isCorrect;
    player.lastSeen = now;

    this.touch(room);
    this.broadcastRoomState(room);
    return { ok: true };
  }

  private buildLeaderboard(room: InternalRoom): LeaderboardEntry[] {
    const sorted = Array.from(room.players.values()).sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name);
    });
    return sorted.map((p, idx) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      rank: idx + 1,
      lastPoints: p.lastPoints,
      lastCorrect: p.lastCorrect,
    }));
  }

  public getHostView(room: InternalRoom): HostRoomView {
    const players: PlayerPublic[] = Array.from(room.players.values()).map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      connected: this.isPlayerConnected(room.code, p.id),
      lastPoints: p.lastPoints,
      lastCorrect: p.lastCorrect,
    }));

    const currentQ = room.questions[room.currentQuestionIndex];
    const currentAnswers = room.answers.filter(
      (a) => a.questionIndex === room.currentQuestionIndex,
    );
    const distribution = currentQ
      ? new Array<number>(currentQ.options.length).fill(0)
      : [];
    for (const ans of currentAnswers) {
      if (ans.choiceIndex >= 0 && ans.choiceIndex < distribution.length) {
        distribution[ans.choiceIndex] += 1;
      }
    }

    return {
      code: room.code,
      hostToken: room.hostToken,
      title: room.title,
      roundNumber: room.roundNumber,
      status: room.status,
      questions: room.questions,
      currentQuestionIndex: room.currentQuestionIndex,
      questionStartedAt: room.questionStartedAt,
      serverNow: Date.now(),
      isPaused: room.isPaused,
      pausedRemainingMs: room.pausedRemainingMs,
      players,
      answeredPlayerIds: currentAnswers.map((a) => a.playerId),
      answerDistribution: distribution,
      leaderboard: this.buildLeaderboard(room),
      createdAt: room.createdAt,
      expiresAt: room.updatedAt + ROOM_TTL_MS,
    };
  }

  public getPlayerView(room: InternalRoom, playerId: string): PlayerRoomView | null {
    const player = room.players.get(playerId);
    if (!player) return null;

    const leaderboard = this.buildLeaderboard(room);
    const myRank = leaderboard.find((l) => l.id === playerId)?.rank ?? leaderboard.length;

    const q = room.questions[room.currentQuestionIndex] ?? null;
    const showCorrect = room.status === 'reveal' || room.status === 'finished';

    const currentCorrectAnswers = room.answers.filter(
      (a) => a.questionIndex === room.currentQuestionIndex && a.isCorrect,
    );
    const earliestCorrectTime =
      currentCorrectAnswers.length > 0
        ? Math.min(...currentCorrectAnswers.map((a) => a.answeredAt))
        : null;

    const myAns = room.answers.find(
      (a) => a.playerId === playerId && a.questionIndex === room.currentQuestionIndex,
    );

    const answeredCount = room.answers.filter(
      (a) => a.questionIndex === room.currentQuestionIndex,
    ).length;

    return {
      code: room.code,
      title: room.title,
      roundNumber: room.roundNumber,
      status: room.status,
      me: {
        id: player.id,
        name: player.name,
        score: player.score,
        connected: this.isPlayerConnected(room.code, player.id),
        lastPoints: player.lastPoints,
        lastCorrect: player.lastCorrect,
        rank: myRank,
      },
      currentQuestionIndex: room.currentQuestionIndex,
      currentQuestion: q
        ? {
            id: q.id,
            prompt: q.prompt,
            options: q.options,
            timeLimitSec: q.timeLimitSec,
            ...(showCorrect ? { correctIndex: q.correctIndex } : {}),
          }
        : null,
      questionStartedAt: room.questionStartedAt,
      serverNow: Date.now(),
      isPaused: room.isPaused,
      pausedRemainingMs: room.pausedRemainingMs,
      myAnswer: myAns
        ? {
            choiceIndex: myAns.choiceIndex,
            isCorrect: showCorrect ? myAns.isCorrect : null,
            points: showCorrect ? myAns.points : 0,
            speedBonus: showCorrect ? myAns.speedBonus ?? Math.max(0, myAns.points - 100) : 0,
            isFastest:
              showCorrect &&
              myAns.isCorrect &&
              earliestCorrectTime !== null &&
              myAns.answeredAt === earliestCorrectTime &&
              currentCorrectAnswers.length > 1,
          }
        : null,
      playersCount: room.players.size,
      answeredCount,
      players: Array.from(room.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        connected: this.isPlayerConnected(room.code, p.id),
      })),
      topLeaderboard: leaderboard.slice(0, 5),
      fullLeaderboard: leaderboard,
    };
  }

  public registerScreenSocket(code: string, ws: WebSocket): InternalRoom | null {
    const room = this.getRoomByCode(code);
    if (!room) return null;

    let set = this.screenSockets.get(room.code);
    if (!set) {
      set = new Set();
      this.screenSockets.set(room.code, set);
    }
    set.add(ws);
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'screen:state', payload: this.getScreenView(room) }));
    }
    return room;
  }

  public unregisterScreenSocket(code: string, ws: WebSocket) {
    const set = this.screenSockets.get(code);
    if (!set) return;
    set.delete(ws);
    if (set.size === 0) {
      this.screenSockets.delete(code);
    }
  }

  public getScreenView(room: InternalRoom): ScreenRoomView {
    const q = room.questions[room.currentQuestionIndex] ?? null;
    const showCorrect = room.status === 'reveal' || room.status === 'finished';
    const currentAnswers = room.answers.filter(
      (a) => a.questionIndex === room.currentQuestionIndex,
    );
    const distribution = q ? new Array<number>(q.options.length).fill(0) : [];
    for (const ans of currentAnswers) {
      if (ans.choiceIndex >= 0 && ans.choiceIndex < distribution.length) {
        distribution[ans.choiceIndex] += 1;
      }
    }

    return {
      code: room.code,
      title: room.title,
      roundNumber: room.roundNumber,
      status: room.status,
      totalQuestions: room.questions.length,
      currentQuestionIndex: room.currentQuestionIndex,
      currentQuestion: q
        ? {
            id: q.id,
            prompt: q.prompt,
            options: q.options,
            timeLimitSec: q.timeLimitSec,
            ...(showCorrect ? { correctIndex: q.correctIndex } : {}),
          }
        : null,
      questionStartedAt: room.questionStartedAt,
      serverNow: Date.now(),
      isPaused: room.isPaused,
      pausedRemainingMs: room.pausedRemainingMs,
      players: Array.from(room.players.values()).map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
        connected: this.isPlayerConnected(room.code, p.id),
      })),
      answeredCount: currentAnswers.length,
      answerDistribution: distribution,
      leaderboard: this.buildLeaderboard(room),
    };
  }

  private sendHostState(room: InternalRoom, ws: WebSocket) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify({ type: 'host:state', payload: this.getHostView(room) }));
    }
  }

  private broadcastRoomState(room: InternalRoom) {
    const hSockets = this.hostSockets.get(room.code);
    if (hSockets && hSockets.size > 0) {
      const payload = JSON.stringify({ type: 'host:state', payload: this.getHostView(room) });
      for (const ws of hSockets) {
        if (ws.readyState === 1) ws.send(payload);
      }
    }

    const sSockets = this.screenSockets.get(room.code);
    if (sSockets && sSockets.size > 0) {
      const payload = JSON.stringify({ type: 'screen:state', payload: this.getScreenView(room) });
      for (const ws of sSockets) {
        if (ws.readyState === 1) ws.send(payload);
      }
    }

    const pMap = this.playerSockets.get(room.code);
    if (pMap) {
      for (const [playerId, sockets] of pMap.entries()) {
        const view = this.getPlayerView(room, playerId);
        if (!view) continue;
        const payload = JSON.stringify({ type: 'player:state', payload: view });
        for (const ws of sockets) {
          if (ws.readyState === 1) ws.send(payload);
        }
      }
    }
  }
}
