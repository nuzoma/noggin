import type { HostRoomView, WSServerMessage } from '../shared/types';

export type ApiErrorKind = 'auth' | 'http' | 'network' | 'validation';

export class ApiRequestError extends Error {
  public readonly kind: ApiErrorKind;
  public readonly status?: number;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ApiRequestError';
    this.kind = kind;
    this.status = status;
  }
}

const AUTH_REFRESH_MSG =
  'Your preview session needs a quick refresh — reload the page and try again.';
const CONNECTION_MSG = "That didn't go through. Check your connection and try again.";
const WARMUP_MSG = 'Server is waking up — try again in a second.';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function isRetriableError(err: unknown): boolean {
  if (err instanceof ApiRequestError) {
    if (err.kind === 'network') return true;
    if (err.kind === 'http') {
      return (
        err.status === undefined ||
        err.status === 200 ||
        err.status === 408 ||
        err.status === 429 ||
        err.status >= 500
      );
    }
    return false;
  }
  return true;
}

async function parseApiJson<T>(res: Response): Promise<T> {
  if (res.type === 'opaqueredirect' || res.status === 401 || res.status === 403) {
    throw new ApiRequestError('auth', AUTH_REFRESH_MSG, res.status || 302);
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    if (res.status >= 500 || res.status === 200) {
      throw new ApiRequestError('http', WARMUP_MSG, res.status);
    }
    throw new ApiRequestError('http', CONNECTION_MSG, res.status);
  }

  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    throw new ApiRequestError('http', CONNECTION_MSG, res.status);
  }

  return data;
}

function createRoomViaWebSocket(timeoutMs = 4500): Promise<{ code: string; hostToken: string }> {
  return new Promise((resolve, reject) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/ws`;
    let settled = false;
    let ws: WebSocket;

    try {
      ws = new WebSocket(url);
    } catch {
      reject(new ApiRequestError('network', CONNECTION_MSG));
      return;
    }

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {
        // Ignore close error
      }
      reject(new ApiRequestError('network', CONNECTION_MSG));
    }, timeoutMs);

    ws.onopen = () => {
      try {
        ws.send(JSON.stringify({ type: 'host:create_room' }));
      } catch {
        if (!settled) {
          settled = true;
          window.clearTimeout(timer);
          reject(new ApiRequestError('network', CONNECTION_MSG));
        }
      }
    };

    ws.onmessage = (event) => {
      if (settled) return;
      try {
        const msg = JSON.parse(event.data as string) as WSServerMessage;
        if (msg.type === 'host:created' && msg.payload?.code && msg.payload?.hostToken) {
          settled = true;
          window.clearTimeout(timer);
          ws.close();
          resolve(msg.payload);
        }
      } catch {
        // Ignore invalid messages
      }
    };

    ws.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(new ApiRequestError('network', CONNECTION_MSG));
    };

    ws.onclose = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      reject(new ApiRequestError('network', CONNECTION_MSG));
    };
  });
}

export async function createRoom(): Promise<{ code: string; hostToken: string }> {
  let lastError: ApiRequestError | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'manual',
      });

      const data = await parseApiJson<{ code?: string; hostToken?: string; error?: string }>(res);
      if (!res.ok || !data.code || !data.hostToken) {
        throw new ApiRequestError('http', data.error || CONNECTION_MSG, res.status);
      }
      return { code: data.code, hostToken: data.hostToken };
    } catch (err) {
      const apiErr =
        err instanceof ApiRequestError
          ? err
          : new ApiRequestError('network', CONNECTION_MSG);
      lastError = apiErr;
      if (!isRetriableError(apiErr) || attempt === 1) break;
      await delay(350);
    }
  }

  // Fallback to WebSocket transport in case HTTP POST was blocked/intercepted
  try {
    return await createRoomViaWebSocket();
  } catch {
    if (lastError) {
      throw lastError;
    }
    throw new ApiRequestError('network', CONNECTION_MSG);
  }
}

export async function joinRoom(
  code: string,
  payload: { name: string; existingPlayerId?: string },
): Promise<{ code: string; playerId: string; name: string }> {
  let lastError: ApiRequestError | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`/api/rooms/${encodeURIComponent(code)}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'manual',
      });

      const data = await parseApiJson<{
        ok: boolean;
        code?: string;
        playerId?: string;
        name?: string;
        error?: string;
      }>(res);

      if (!res.ok || !data.ok || !data.code || !data.playerId || !data.name) {
        const isClientRejection = res.status >= 400 && res.status < 500;
        throw new ApiRequestError(
          isClientRejection ? 'validation' : 'http',
          data.error ||
            "That code didn't work. Double-check with the host — codes are 5–6 letters.",
          res.status,
        );
      }

      return { code: data.code, playerId: data.playerId, name: data.name };
    } catch (err) {
      const apiErr =
        err instanceof ApiRequestError
          ? err
          : new ApiRequestError('network', CONNECTION_MSG);
      lastError = apiErr;
      if (!isRetriableError(apiErr) || attempt === 1) break;
      await delay(350);
    }
  }

  throw lastError ?? new ApiRequestError('network', CONNECTION_MSG);
}

export async function fetchHostRoom(
  hostToken: string,
): Promise<{ ok: true; room: HostRoomView } | { ok: false; notFound: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/host/${encodeURIComponent(hostToken)}`, {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      redirect: 'manual',
    });
    if (res.status === 404) {
      return { ok: false, notFound: true, error: 'Host room not found or expired.' };
    }
    const data = await parseApiJson<{ ok: boolean; room?: HostRoomView; error?: string }>(res);
    if (res.ok && data.ok && data.room) {
      return { ok: true, room: data.room };
    }
    return { ok: false, notFound: false, error: data.error };
  } catch (err) {
    return {
      ok: false,
      notFound: false,
      error: err instanceof Error ? err.message : CONNECTION_MSG,
    };
  }
}
