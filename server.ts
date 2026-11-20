import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { WebSocketServer, type WebSocket } from 'ws';
import { RoomManager } from './server/roomManager.ts';
import type { WSClientMessage } from './src/shared/types.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;

interface SocketMeta {
  role: 'host' | 'screen' | 'player';
  code: string;
  hostToken?: string;
  playerId?: string;
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use((err: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && typeof err === 'object' && 'status' in err && (err as { status: number }).status === 400) {
      res.status(400).json({ ok: false, error: 'Invalid JSON request body.' });
      return;
    }
    next(err);
  });

  const roomManager = new RoomManager();

  // REST API
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/rooms', (_req, res) => {
    const { code, hostToken } = roomManager.createRoom();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({ code, hostToken });
  });

  app.get('/api/rooms/create', (_req, res) => {
    const { code, hostToken } = roomManager.createRoom();
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.json({ code, hostToken });
  });

  app.get('/api/rooms/:code/check', (req, res) => {
    const room = roomManager.getRoomByCode(req.params.code);
    if (!room) {
      res.status(404).json({ ok: false, error: 'Room not found or expired.' });
      return;
    }
    res.json({ ok: true, code: room.code, status: room.status, playersCount: room.players.size });
  });

  app.post('/api/rooms/:code/join', (req, res) => {
    const name = typeof req.body?.name === 'string' ? req.body.name : '';
    const existingPlayerId =
      typeof req.body?.existingPlayerId === 'string' ? req.body.existingPlayerId : undefined;

    const result = roomManager.joinPlayer(req.params.code, name, existingPlayerId);
    if (!result.ok) {
      res.status(404).json({ ok: false, error: 'error' in result ? result.error : 'Unable to join room.' });
      return;
    }
    res.json({
      ok: true,
      code: result.code,
      playerId: result.playerId,
      name: result.name,
    });
  });

  app.get('/api/host/:hostToken', (req, res) => {
    const room = roomManager.getRoomByHostToken(req.params.hostToken);
    if (!room) {
      res.status(404).json({ ok: false, error: 'Host room not found or expired.' });
      return;
    }
    res.json({ ok: true, room: roomManager.getHostView(room) });
  });

  // Vite dev middleware or static dist serving
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const socketMeta = new WeakMap<WebSocket, SocketMeta>();

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      let msg: WSClientMessage;
      try {
        msg = JSON.parse(raw.toString()) as WSClientMessage;
      } catch {
        ws.send(JSON.stringify({ type: 'error', message: 'Malformed message.' }));
        return;
      }

      if (msg.type === 'ping') {
        ws.send(JSON.stringify({ type: 'pong' }));
        return;
      }

      if (msg.type === 'host:create_room') {
        const { code, hostToken } = roomManager.createRoom();
        ws.send(JSON.stringify({ type: 'host:created', payload: { code, hostToken } }));
        return;
      }

      if (msg.type === 'auth:host') {
        const room = roomManager.registerHostSocket(msg.hostToken, ws);
        if (!room) {
          ws.send(JSON.stringify({ type: 'room:closed', message: 'Host room not found or expired.' }));
          return;
        }
        socketMeta.set(ws, { role: 'host', code: room.code, hostToken: msg.hostToken });
        return;
      }

      if (msg.type === 'auth:screen') {
        const room = roomManager.registerScreenSocket(msg.code, ws);
        if (!room) {
          ws.send(JSON.stringify({ type: 'room:closed', message: 'Room not found or expired.' }));
          return;
        }
        socketMeta.set(ws, { role: 'screen', code: room.code });
        return;
      }

      if (msg.type === 'auth:player') {
        const room = roomManager.registerPlayerSocket(msg.code, msg.playerId, ws);
        if (!room) {
          ws.send(JSON.stringify({ type: 'kicked', message: 'Session expired or room closed.' }));
          return;
        }
        socketMeta.set(ws, { role: 'player', code: room.code, playerId: msg.playerId });
        const view = roomManager.getPlayerView(room, msg.playerId);
        if (view) {
          ws.send(JSON.stringify({ type: 'player:state', payload: view }));
        }
        return;
      }

      const meta = socketMeta.get(ws);
      if (!meta) {
        ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated.' }));
        return;
      }

      if (meta.role === 'host' && meta.hostToken) {
        let result: { ok: boolean; error?: string } = { ok: false, error: 'Unknown action.' };
        switch (msg.type) {
          case 'host:set_title':
            result = roomManager.setTitle(meta.hostToken, msg.title);
            break;
          case 'host:set_questions':
            result = roomManager.setQuestions(meta.hostToken, msg.questions);
            break;
          case 'host:open_lobby':
            result = roomManager.openLobby(meta.hostToken);
            break;
          case 'host:edit_questions':
            result = roomManager.editQuestions(meta.hostToken);
            break;
          case 'host:start_game':
            result = roomManager.startGame(meta.hostToken);
            break;
          case 'host:reveal_now':
            result = roomManager.revealNow(meta.hostToken);
            break;
          case 'host:skip_question':
            result = roomManager.skipQuestion(meta.hostToken);
            break;
          case 'host:next_question':
            result = roomManager.nextQuestion(meta.hostToken);
            break;
          case 'host:end_game':
            result = roomManager.endGame(meta.hostToken);
            break;
          case 'host:play_again':
            result = roomManager.playAgain(meta.hostToken);
            break;
          case 'host:kick_player':
            result = roomManager.kickPlayer(meta.hostToken, msg.playerId);
            break;
          case 'host:cancel_room':
            result = roomManager.cancelRoom(meta.hostToken);
            break;
        }
        if (!result.ok && result.error) {
          ws.send(JSON.stringify({ type: 'error', message: result.error }));
        }
        return;
      }

      if (meta.role === 'player' && meta.playerId) {
        if (msg.type === 'player:submit_answer') {
          const result = roomManager.submitAnswer(
            meta.code,
            meta.playerId,
            msg.questionIndex,
            msg.choiceIndex,
          );
          if (!result.ok && result.error) {
            ws.send(JSON.stringify({ type: 'error', message: result.error }));
          }
        }
      }
    });

    ws.on('close', () => {
      const meta = socketMeta.get(ws);
      if (!meta) return;
      if (meta.role === 'host') {
        roomManager.unregisterHostSocket(meta.code, ws);
      } else if (meta.role === 'screen') {
        roomManager.unregisterScreenSocket(meta.code, ws);
      } else if (meta.role === 'player' && meta.playerId) {
        roomManager.unregisterPlayerSocket(meta.code, meta.playerId, ws);
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`noggin server listening on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start noggin server:', err);
  process.exit(1);
});
