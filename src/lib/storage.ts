export interface PlayerSession {
  code: string;
  playerId: string;
  name: string;
}

export interface HostSession {
  code: string;
  hostToken: string;
}

const PLAYER_KEY_PREFIX = 'housequiz_player_';
const RECENT_PLAYER_KEY = 'housequiz_recent_player';
const RECENT_HOST_KEY = 'housequiz_recent_host';

export function savePlayerSession(session: PlayerSession) {
  try {
    const code = session.code.toUpperCase();
    localStorage.setItem(`${PLAYER_KEY_PREFIX}${code}`, JSON.stringify({ ...session, code }));
    localStorage.setItem(RECENT_PLAYER_KEY, JSON.stringify({ ...session, code }));
  } catch {
    // Ignore storage quota errors
  }
}

export function getPlayerSession(code: string): PlayerSession | null {
  try {
    const raw = localStorage.getItem(`${PLAYER_KEY_PREFIX}${code.toUpperCase()}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerSession;
    if (!parsed?.playerId || !parsed?.code) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPlayerSession(code: string) {
  try {
    localStorage.removeItem(`${PLAYER_KEY_PREFIX}${code.toUpperCase()}`);
    const recent = getRecentPlayerSession();
    if (recent && recent.code.toUpperCase() === code.toUpperCase()) {
      localStorage.removeItem(RECENT_PLAYER_KEY);
    }
  } catch {
    // Ignore
  }
}

export function getRecentPlayerSession(): PlayerSession | null {
  try {
    const raw = localStorage.getItem(RECENT_PLAYER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerSession;
    return parsed?.playerId && parsed?.code ? parsed : null;
  } catch {
    return null;
  }
}

export function saveHostSession(session: HostSession) {
  try {
    localStorage.setItem(RECENT_HOST_KEY, JSON.stringify(session));
  } catch {
    // Ignore
  }
}

export function getRecentHostSession(): HostSession | null {
  try {
    const raw = localStorage.getItem(RECENT_HOST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HostSession;
    return parsed?.hostToken && parsed?.code ? parsed : null;
  } catch {
    return null;
  }
}

export function clearHostSession() {
  try {
    localStorage.removeItem(RECENT_HOST_KEY);
  } catch {
    // Ignore
  }
}
