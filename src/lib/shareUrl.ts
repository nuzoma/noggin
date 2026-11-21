const CUSTOM_ORIGIN_KEY = 'noggin_public_origin';

export interface ShareUrlInfo {
  currentOrigin: string;
  currentHost: string;
  effectiveOrigin: string;
  effectiveHost: string;
  suggestedPublicOrigin: string;
  customOrigin: string | null;
  isDevPreview: boolean;
  isLocalhost: boolean;
}

export function normalizePublicOrigin(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(withProtocol);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

export function getSavedCustomOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CUSTOM_ORIGIN_KEY);
    return raw ? normalizePublicOrigin(raw) : null;
  } catch {
    return null;
  }
}

export function saveCustomOrigin(raw: string): string | null {
  if (typeof window === 'undefined') return null;
  const normalized = normalizePublicOrigin(raw);
  try {
    if (normalized) {
      window.localStorage.setItem(CUSTOM_ORIGIN_KEY, normalized);
    } else {
      window.localStorage.removeItem(CUSTOM_ORIGIN_KEY);
    }
  } catch {
    // Ignore storage errors in restricted contexts
  }
  return normalized;
}

export function clearCustomOrigin(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(CUSTOM_ORIGIN_KEY);
  } catch {
    // Ignore
  }
}

export function getShareUrlInfo(): ShareUrlInfo {
  if (typeof window === 'undefined') {
    return {
      currentOrigin: '',
      currentHost: '',
      effectiveOrigin: '',
      effectiveHost: '',
      suggestedPublicOrigin: '',
      customOrigin: null,
      isDevPreview: false,
      isLocalhost: false,
    };
  }

  const { origin, host, hostname } = window.location;
  const isDevPreview = hostname.startsWith('ais-dev-');
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

  // In AI Studio, `ais-dev-*` is the private developer preview URL; `ais-pre-*` is the public Shared App URL.
  const suggestedPublicOrigin = isDevPreview
    ? origin.replace(/^(https?:\/\/)ais-dev-/i, '$1ais-pre-')
    : origin;

  const customOrigin = getSavedCustomOrigin();
  const effectiveOrigin = customOrigin || suggestedPublicOrigin;

  let effectiveHost = host;
  try {
    effectiveHost = new URL(effectiveOrigin).host;
  } catch {
    effectiveHost = host;
  }

  return {
    currentOrigin: origin,
    currentHost: host,
    effectiveOrigin,
    effectiveHost,
    suggestedPublicOrigin,
    customOrigin,
    isDevPreview,
    isLocalhost,
  };
}

export function buildJoinUrl(code: string): string {
  const { effectiveOrigin } = getShareUrlInfo();
  if (!effectiveOrigin) return '';
  return `${effectiveOrigin}/?code=${encodeURIComponent(code)}`;
}
