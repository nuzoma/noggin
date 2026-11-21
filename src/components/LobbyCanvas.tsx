import { useEffect, useRef, useState } from 'react';
import { Maximize2, Minus, Plus, Trash2, X } from 'lucide-react';

export interface LobbyAvatarPlayer {
  id: string;
  name: string;
  connected: boolean;
}

interface LobbyCanvasProps {
  players: LobbyAvatarPlayer[];
  myPlayerId?: string;
  canKick?: boolean;
  onKickPlayer?: (playerId: string) => void;
  heightClassName?: string;
  subtitle?: string;
}

interface AvatarNode {
  id: string;
  name: string;
  connected: boolean;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  phase: number;
  bobSpeed: number;
  scale: number;
  hopOffset: number;
  hopVel: number;
  seed: number;
}

interface CameraState {
  x: number;
  y: number;
  zoom: number;
  targetX: number;
  targetY: number;
  targetZoom: number;
  userMoved: boolean;
}

interface SparkleParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  colorIndex: number;
  shape: number;
}

interface TapRipple {
  x: number;
  y: number;
  life: number;
  maxLife: number;
}

interface ThemeColors {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  onAccent: string;
  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  lobby: string;
  lobbySoft: string;
  question: string;
  questionSoft: string;
}

function hashString(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function readThemeColors(el: HTMLElement): ThemeColors {
  const styles = getComputedStyle(el);
  const get = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return {
    bg: get('--bg', 'rgb(246 243 236)'),
    surface: get('--surface', 'rgb(255 253 249)'),
    surface2: get('--surface-2', 'rgb(236 230 218)'),
    border: get('--border', 'rgb(222 214 198)'),
    text: get('--text', 'rgb(29 32 30)'),
    textMuted: get('--text-muted', 'rgb(95 98 91)'),
    accent: get('--accent', 'rgb(61 90 128)'),
    accentSoft: get('--accent-soft', 'rgb(229 236 244)'),
    onAccent: get('--btn-primary-text', 'rgb(255 253 249)'),
    success: get('--success', 'rgb(40 125 92)'),
    successSoft: get('--success-soft', 'rgb(224 240 232)'),
    warning: get('--warning', 'rgb(184 125 20)'),
    warningSoft: get('--warning-soft', 'rgb(247 236 212)'),
    lobby: get('--state-lobby', 'rgb(61 90 128)'),
    lobbySoft: get('--state-lobby-soft', 'rgb(229 236 244)'),
    question: get('--state-question', 'rgb(209 87 59)'),
    questionSoft: get('--state-question-soft', 'rgb(247 228 221)'),
  };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let clipped = text;
  while (clipped.length > 1 && ctx.measureText(`${clipped}…`).width > maxWidth) {
    clipped = clipped.slice(0, -1);
  }
  return `${clipped}…`;
}

function computeWorldLayout(count: number, viewW: number, viewH: number) {
  if (count <= 12) {
    return { worldW: viewW, worldH: viewH, cols: Math.max(1, Math.ceil(Math.sqrt(Math.max(1, count) * (viewW / Math.max(1, viewH))))) };
  }
  const aspect = Math.max(1.15, viewW / Math.max(200, viewH));
  const cols = Math.max(4, Math.ceil(Math.sqrt(count * aspect)));
  const rows = Math.max(3, Math.ceil(count / cols));
  const cellW = 104;
  const cellH = 88;
  const worldW = Math.max(viewW, cols * cellW + 96);
  const worldH = Math.max(viewH, rows * cellH + 84);
  return { worldW, worldH, cols };
}

function drawCharacterToken(
  ctx: CanvasRenderingContext2D,
  node: AvatarNode,
  colors: ThemeColors,
  isMe: boolean,
  isSelected: boolean,
  isHovered: boolean,
  showLabel: boolean,
  timeSec: number,
) {
  const paletteSlots = [
    { fill: colors.lobbySoft, stroke: colors.lobby, sweater: colors.lobby },
    { fill: colors.questionSoft, stroke: colors.question, sweater: colors.question },
    { fill: colors.successSoft, stroke: colors.success, sweater: colors.success },
    { fill: colors.warningSoft, stroke: colors.warning, sweater: colors.warning },
    { fill: colors.surface2, stroke: colors.textMuted, sweater: colors.textMuted },
  ];
  const slot = isMe ? paletteSlots[0] : paletteSlots[node.seed % paletteSlots.length];
  const topper = (node.seed >> 3) % 6;
  const expression = (node.seed >> 6) % 4;
  const hairTone = (node.seed >> 9) % 2 === 0 ? colors.text : slot.stroke;

  const r = node.radius;
  // Gentle calm neighborhood sway (no chaotic collisions)
  const driftX = Math.sin(timeSec * 0.72 + node.phase) * 4.5;
  const driftY = Math.cos(timeSec * 0.92 + node.phase * 1.3) * 3.5;
  const bob = Math.sin(timeSec * node.bobSpeed + node.phase) * 2.2;
  const tilt =
    Math.sin(timeSec * 1.15 + node.phase) * 0.04 +
    (node.hopOffset < -1 ? Math.sin(node.phase) * 0.14 : 0);

  const cx = node.x + driftX;
  const cy = node.y + driftY + bob + node.hopOffset;
  const inkWidth = Math.max(1.2, r * 0.085);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(tilt);
  ctx.scale(node.scale, node.scale);
  if (!node.connected) {
    ctx.globalAlpha = 0.52;
  }

  // Soft ground shadow
  ctx.save();
  ctx.globalAlpha = node.connected ? 0.1 : 0.04;
  ctx.fillStyle = colors.text;
  ctx.beginPath();
  ctx.ellipse(0, r * 1.08 - bob * 0.35, r * 0.68, r * 0.16, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Selection, hover, or (You) halo ring
  if (isMe || isSelected || isHovered) {
    ctx.save();
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.setLineDash(isSelected || isHovered ? [] : [3.5, 3]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Circular medallion backdrop
  ctx.fillStyle = slot.fill;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();

  // Clip portrait internals neatly inside medallion
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.96, 0, Math.PI * 2);
  ctx.clip();

  // Cozy sweater / shoulders arc at bottom of medallion
  ctx.fillStyle = slot.sweater;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.88, r * 0.72, r * 0.46, 0, 0, Math.PI * 2);
  ctx.fill();

  // Subtle collar detail
  ctx.fillStyle = colors.surface;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.48, r * 0.22, r * 0.1, 0, 0, Math.PI);
  ctx.fill();

  // Character head
  const headR = r * 0.51;
  const headY = -r * 0.06;
  ctx.fillStyle = colors.surface;
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = inkWidth;
  ctx.beginPath();
  ctx.arc(0, headY, headR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Subtle rosy cheeks
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.fillStyle = colors.question;
  ctx.beginPath();
  ctx.ellipse(-headR * 0.5, headY + headR * 0.22, headR * 0.16, headR * 0.1, 0, 0, Math.PI * 2);
  ctx.ellipse(headR * 0.5, headY + headR * 0.22, headR * 0.16, headR * 0.1, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Facial expressions
  ctx.strokeStyle = colors.text;
  ctx.fillStyle = colors.text;
  ctx.lineWidth = Math.max(1.1, r * 0.07);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const eyeY = headY - headR * 0.04;
  const eyeX = headR * 0.34;

  if (expression === 0) {
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY, Math.max(1.1, headR * 0.1), 0, Math.PI * 2);
    ctx.arc(eyeX, eyeY, Math.max(1.1, headR * 0.1), 0, Math.PI * 2);
    ctx.fill();
  } else if (expression === 1) {
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY + headR * 0.06, headR * 0.14, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(eyeX, eyeY + headR * 0.06, headR * 0.14, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else if (expression === 2) {
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY, Math.max(1.1, headR * 0.1), 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeX, eyeY + headR * 0.06, headR * 0.14, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY, headR * 0.21, 0, Math.PI * 2);
    ctx.moveTo(-eyeX + headR * 0.21, eyeY);
    ctx.lineTo(eyeX - headR * 0.21, eyeY);
    ctx.moveTo(eyeX + headR * 0.21, eyeY);
    ctx.arc(eyeX, eyeY, headR * 0.21, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY, Math.max(0.9, headR * 0.07), 0, Math.PI * 2);
    ctx.arc(eyeX, eyeY, Math.max(0.9, headR * 0.07), 0, Math.PI * 2);
    ctx.fill();
  }

  // Gentle smile
  ctx.beginPath();
  ctx.arc(0, headY + headR * 0.22, headR * 0.19, 0.18 * Math.PI, 0.82 * Math.PI, false);
  ctx.stroke();

  // Inner hairlines / fringe
  ctx.fillStyle = hairTone;
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = Math.max(1.1, r * 0.065);
  if (topper === 0) {
    ctx.beginPath();
    ctx.arc(-headR * 0.45, headY - headR * 0.72, headR * 0.36, 0, Math.PI * 2);
    ctx.arc(0, headY - headR * 0.88, headR * 0.4, 0, Math.PI * 2);
    ctx.arc(headR * 0.45, headY - headR * 0.72, headR * 0.36, 0, Math.PI * 2);
    ctx.fill();
  } else if (topper === 1) {
    ctx.beginPath();
    ctx.arc(0, headY - headR * 0.18, headR * 1.02, Math.PI * 1.05, Math.PI * 1.95);
    ctx.quadraticCurveTo(headR * 0.1, headY - headR * 0.35, -headR * 0.88, headY - headR * 0.15);
    ctx.closePath();
    ctx.fill();
  } else if (topper === 4) {
    ctx.beginPath();
    ctx.arc(0, headY - headR * 0.15, headR * 1.0, Math.PI * 1.08, Math.PI * 1.92);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore(); // end inner clip

  // Crisp outer medallion ring
  ctx.strokeStyle = isMe || isSelected ? colors.accent : slot.stroke;
  ctx.lineWidth = Math.max(1.4, r * 0.095);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.stroke();

  // Accessories peeking neatly above rim
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = Math.max(1.1, r * 0.075);
  if (topper === 2) {
    ctx.fillStyle = slot.sweater;
    ctx.beginPath();
    ctx.arc(0, -r * 0.56, r * 0.42, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.surface;
    ctx.beginPath();
    ctx.arc(0, -r * 1.03, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (topper === 3) {
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.82);
    ctx.lineTo(0, -r * 1.12);
    ctx.stroke();
    ctx.fillStyle = colors.success;
    ctx.beginPath();
    ctx.ellipse(r * 0.16, -r * 1.12, r * 0.17, r * 0.09, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (topper === 5) {
    ctx.fillStyle = slot.fill;
    ctx.beginPath();
    ctx.moveTo(-r * 0.58, -r * 0.72);
    ctx.lineTo(-r * 0.42, -r * 1.08);
    ctx.lineTo(-r * 0.18, -r * 0.86);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.58, -r * 0.72);
    ctx.lineTo(r * 0.42, -r * 1.08);
    ctx.lineTo(r * 0.18, -r * 0.86);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Nameplate below token (semantic zoom: full labels when readable, or on highlight)
  if (showLabel || isMe || isSelected || isHovered) {
    const label = isMe ? `${node.name} (You)` : node.name;
    const isHighlighted = isMe || isSelected || isHovered;
    const fontSize = isHighlighted ? 11 : 10;
    ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`;
    const displayLabel = fitText(ctx, label, isHighlighted ? 110 : 78);
    const textWidth = ctx.measureText(displayLabel).width;
    const plateW = textWidth + 12;
    const plateH = fontSize + 6;
    const plateX = -plateW / 2;
    const plateY = r * 1.12;

    ctx.fillStyle = isMe || isSelected ? colors.accent : colors.surface;
    ctx.strokeStyle = isMe || isSelected || isHovered ? colors.accent : colors.border;
    ctx.lineWidth = isHighlighted ? 1.4 : 1.1;
    roundRectPath(ctx, plateX, plateY, plateW, plateH, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isMe || isSelected ? colors.onAccent : colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(displayLabel, 0, plateY + plateH / 2 + 0.5);
  }

  ctx.restore();
}

export function LobbyCanvas({
  players,
  myPlayerId,
  canKick = false,
  onKickPlayer,
  heightClassName = 'h-[240px] sm:h-[310px]',
  subtitle,
}: LobbyCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<Map<string, AvatarNode>>(new Map());
  const sizeRef = useRef<{ w: number; h: number }>({ w: 640, h: 300 });
  const worldRef = useRef<{ w: number; h: number }>({ w: 640, h: 300 });
  const cameraRef = useRef<CameraState>({
    x: 320,
    y: 150,
    zoom: 1,
    targetX: 320,
    targetY: 150,
    targetZoom: 1,
    userMoved: false,
  });
  const playersRef = useRef<LobbyAvatarPlayer[]>(players);
  const prevCountTierRef = useRef<number>(0);
  const selectedIdRef = useRef<string | null>(null);
  const hoveredIdRef = useRef<string | null>(null);
  const myPlayerIdRef = useRef<string | undefined>(myPlayerId);
  const sparklesRef = useRef<SparkleParticle[]>([]);
  const ripplesRef = useRef<TapRipple[]>([]);

  // Active pointer tracking for 1-finger pan, tap vs drag, and 2-finger pinch zoom
  const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const dragStateRef = useRef<{
    isDragging: boolean;
    hasDragged: boolean;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    pinchDist: number | null;
  }>({
    isDragging: false,
    hasDragged: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    pinchDist: null,
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmKick, setConfirmKick] = useState(false);
  const [zoomPct, setZoomPct] = useState(100);

  playersRef.current = players;
  selectedIdRef.current = selectedId;
  myPlayerIdRef.current = myPlayerId;

  useEffect(() => {
    if (selectedId && !players.some((p) => p.id === selectedId)) {
      setSelectedId(null);
      setConfirmKick(false);
    }
  }, [players, selectedId]);

  const getFitZoom = (viewW: number, viewH: number, worldW: number, worldH: number) => {
    const raw = Math.min(1, (viewW - 24) / Math.max(1, worldW), (viewH - 24) / Math.max(1, worldH));
    return Math.max(0.28, Math.min(1, raw));
  };

  const clampCamera = (cam: CameraState, worldW: number, worldH: number, viewW: number, viewH: number) => {
    const minZ = Math.min(0.25, getFitZoom(viewW, viewH, worldW, worldH) * 0.85);
    cam.targetZoom = Math.max(minZ, Math.min(2.4, cam.targetZoom));
    const marginX = Math.max(120, worldW * 0.55);
    const marginY = Math.max(90, worldH * 0.55);
    cam.targetX = Math.max(worldW / 2 - marginX, Math.min(worldW / 2 + marginX, cam.targetX));
    cam.targetY = Math.max(worldH / 2 - marginY, Math.min(worldH / 2 + marginY, cam.targetY));
  };

  const applyZoom = (factor: number, anchorScreenX?: number, anchorScreenY?: number) => {
    const { w, h } = sizeRef.current;
    const { w: worldW, h: worldH } = worldRef.current;
    const cam = cameraRef.current;
    const oldZoom = cam.targetZoom;
    const minZ = Math.min(0.25, getFitZoom(w, h, worldW, worldH) * 0.85);
    const nextZoom = Math.max(minZ, Math.min(2.4, oldZoom * factor));

    if (anchorScreenX !== undefined && anchorScreenY !== undefined) {
      const worldUnderX = cam.targetX + (anchorScreenX - w / 2) / oldZoom;
      const worldUnderY = cam.targetY + (anchorScreenY - h / 2) / oldZoom;
      cam.targetX = worldUnderX - (anchorScreenX - w / 2) / nextZoom;
      cam.targetY = worldUnderY - (anchorScreenY - h / 2) / nextZoom;
    }

    cam.targetZoom = nextZoom;
    cam.userMoved = true;
    clampCamera(cam, worldW, worldH, w, h);
    setZoomPct(Math.round(cam.targetZoom * 100));
  };

  const handleFitView = () => {
    const { w, h } = sizeRef.current;
    const { w: worldW, h: worldH } = worldRef.current;
    const cam = cameraRef.current;
    const fitZ = getFitZoom(w, h, worldW, worldH);
    cam.targetX = worldW / 2;
    cam.targetY = worldH / 2;
    cam.targetZoom = fitZ;
    cam.userMoved = false;
    setZoomPct(Math.round(fitZ * 100));
  };

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let animId = 0;
    let lastTime = performance.now();
    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');

    let colors = readThemeColors(container);
    const refreshColors = () => {
      colors = readThemeColors(container);
    };

    const syncNodes = (viewW: number, viewH: number) => {
      const list = playersRef.current;
      const count = list.length;
      const { worldW, worldH, cols } = computeWorldLayout(count, viewW, viewH);
      const prevWorld = worldRef.current;
      worldRef.current = { w: worldW, h: worldH };

      // Consistent comfortable avatar size in world space (larger rooms expand world instead of shrinking tokens)
      const baseRadius = count <= 6 ? 18 : 16;

      // Auto-fit camera cleanly when crossing between small room and large crowd
      const tier = count <= 12 ? 0 : 1;
      const tierChanged = prevCountTierRef.current !== tier;
      if (
        tierChanged ||
        (!cameraRef.current.userMoved &&
          (Math.abs(prevWorld.w - worldW) > 8 || Math.abs(prevWorld.h - worldH) > 8))
      ) {
        prevCountTierRef.current = tier;
        const fitZ = getFitZoom(viewW, viewH, worldW, worldH);
        const cam = cameraRef.current;
        if (tierChanged) {
          cam.userMoved = false;
        }
        cam.targetX = worldW / 2;
        cam.targetY = worldH / 2;
        cam.targetZoom = fitZ;
        if (Math.abs(prevWorld.w - worldW) > 150) {
          cam.x = worldW / 2;
          cam.y = worldH / 2;
        }
        setZoomPct(Math.round(fitZ * 100));
      }

      const padX = count <= 12 ? 56 : 64;
      const padTop = 44;
      const padBottom = 56;
      const usableW = Math.max(80, worldW - padX * 2);
      const usableH = Math.max(80, worldH - padTop - padBottom);
      const rows = Math.max(1, Math.ceil(Math.max(1, count) / cols));

      const nextMap = new Map<string, AvatarNode>();
      list.forEach((p, idx) => {
        const existing = nodesRef.current.get(p.id);
        const seed = hashString(`${p.id}:${p.name}`);

        const col = idx % cols;
        const row = Math.floor(idx / cols);
        // Subtle honeycomb stagger + deterministic organic offset so crowd feels warm & natural without overlapping
        const stagger = count > 12 && row % 2 === 1 ? (usableW / cols) * 0.22 : 0;
        const jitterX = (((seed % 100) / 100) - 0.5) * Math.min(20, (usableW / cols) * 0.3);
        const jitterY = ((((seed >> 8) % 100) / 100) - 0.5) * Math.min(14, (usableH / rows) * 0.28);

        const targetX =
          count === 1
            ? worldW / 2
            : Math.max(padX, Math.min(worldW - padX, padX + ((col + 0.5) / cols) * usableW + stagger + jitterX));
        const targetY =
          count === 1
            ? worldH / 2 - 6
            : Math.max(padTop, Math.min(worldH - padBottom, padTop + ((row + 0.5) / rows) * usableH + jitterY));

        if (existing) {
          existing.name = p.name;
          existing.connected = p.connected;
          existing.radius = baseRadius;
          existing.targetX = targetX;
          existing.targetY = targetY;
          nextMap.set(p.id, existing);
        } else {
          nextMap.set(p.id, {
            id: p.id,
            name: p.name,
            connected: p.connected,
            x: targetX,
            y: targetY,
            targetX,
            targetY,
            radius: baseRadius,
            phase: ((seed % 628) / 100),
            bobSpeed: 1.2 + ((seed % 10) / 16),
            scale: reduceMotionQuery.matches ? 1 : 0.2,
            hopOffset: 0,
            hopVel: 0,
            seed,
          });
        }
      });
      nodesRef.current = nextMap;
    };

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(240, Math.floor(rect.width));
      const h = Math.max(180, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sizeRef.current = { w, h };
      syncNodes(w, h);
      if (!cameraRef.current.userMoved) {
        const { w: worldW, h: worldH } = worldRef.current;
        const fitZ = getFitZoom(w, h, worldW, worldH);
        cameraRef.current.x = worldW / 2;
        cameraRef.current.y = worldH / 2;
        cameraRef.current.zoom = fitZ;
        cameraRef.current.targetX = worldW / 2;
        cameraRef.current.targetY = worldH / 2;
        cameraRef.current.targetZoom = fitZ;
        setZoomPct(Math.round(fitZ * 100));
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const count = playersRef.current.length;
      const cam = cameraRef.current;
      const isZoomedOrCrowded = count > 12 || Math.abs(cam.targetZoom - 1) > 0.03;
      if (!isZoomedOrCrowded && !e.ctrlKey) return;

      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const ax = e.clientX - rect.left;
      const ay = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      applyZoom(factor, ax, ay);
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    darkModeQuery.addEventListener?.('change', refreshColors);
    resize();

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const { w, h } = sizeRef.current;
      syncNodes(w, h);
      const nodes = Array.from(nodesRef.current.values());
      const reducedMotion = reduceMotionQuery.matches;
      const cam = cameraRef.current;

      // Smooth camera interpolation
      const camLerp = reducedMotion ? 1 : Math.min(1, dt * 12);
      cam.x += (cam.targetX - cam.x) * camLerp;
      cam.y += (cam.targetY - cam.y) * camLerp;
      cam.zoom += (cam.targetZoom - cam.zoom) * camLerp;

      for (const n of nodes) {
        if (n.scale < 1) {
          n.scale = reducedMotion ? 1 : Math.min(1, n.scale + dt * 4.5);
        } else if (n.scale > 1) {
          n.scale = reducedMotion ? 1 : Math.max(1, n.scale - dt * 1.6);
        }
        // Calm glide to assigned seat when layout adapts
        const posLerp = reducedMotion ? 1 : Math.min(1, dt * 7);
        n.x += (n.targetX - n.x) * posLerp;
        n.y += (n.targetY - n.y) * posLerp;

        if (n.hopOffset !== 0 || n.hopVel !== 0) {
          n.hopVel += 640 * dt;
          n.hopOffset += n.hopVel * dt;
          if (n.hopOffset >= 0) {
            n.hopOffset = 0;
            n.hopVel = 0;
          }
        }
      }

      // Advance playful tap sparkles & empty-space ripples
      sparklesRef.current = sparklesRef.current.filter((s) => {
        s.life += dt;
        s.vy += 120 * dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        return s.life < s.maxLife;
      });

      ripplesRef.current = ripplesRef.current.filter((rp) => {
        rp.life += dt;
        return rp.life < rp.maxLife;
      });

      // Render frame
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        // Warm matured canvas backdrop
        const baseGrad = ctx.createLinearGradient(0, 0, w, h);
        baseGrad.addColorStop(0, colors.surface);
        baseGrad.addColorStop(1, colors.bg);
        ctx.fillStyle = baseGrad;
        ctx.fillRect(0, 0, w, h);

        // Ambient corner washes
        ctx.save();
        ctx.globalAlpha = 0.5;
        const leftGlow = ctx.createRadialGradient(w * 0.14, h * 0.18, 10, w * 0.14, h * 0.18, Math.max(w, h) * 0.55);
        leftGlow.addColorStop(0, colors.lobbySoft);
        leftGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = leftGlow;
        ctx.fillRect(0, 0, w, h);

        ctx.globalAlpha = 0.38;
        const rightGlow = ctx.createRadialGradient(w * 0.88, h * 0.85, 10, w * 0.88, h * 0.85, Math.max(w, h) * 0.5);
        rightGlow.addColorStop(0, colors.questionSoft);
        rightGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = rightGlow;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();

        // Infinite panning & zooming tabletop dot grid
        ctx.save();
        const gridStep = 28 * cam.zoom;
        if (gridStep >= 8) {
          ctx.globalAlpha = 0.5;
          ctx.fillStyle = colors.border;
          const originScreenX = w / 2 - cam.x * cam.zoom;
          const originScreenY = h / 2 - cam.y * cam.zoom;
          const startX = ((originScreenX % gridStep) + gridStep) % gridStep;
          const startY = ((originScreenY % gridStep) + gridStep) % gridStep;
          const dotR = Math.max(0.75, 1.05 * Math.min(1.2, cam.zoom));
          for (let gx = startX; gx < w; gx += gridStep) {
            for (let gy = startY; gy < h; gy += gridStep) {
              ctx.beginPath();
              ctx.arc(gx, gy, dotR, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
        ctx.restore();

        // World-space camera transform for tokens
        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.scale(cam.zoom, cam.zoom);
        ctx.translate(-cam.x, -cam.y);

        const timeSec = reducedMotion ? 0 : now / 1000;
        const { w: worldW, h: worldH } = worldRef.current;

        // Playful low-opacity floating tabletop motifs across world space
        const motifColors = [colors.lobby, colors.question, colors.warning, colors.success];
        const motifCount = Math.min(28, Math.max(9, Math.round((worldW * worldH) / 28000)));
        for (let i = 0; i < motifCount; i++) {
          const mx = ((i * 197 + 64) % Math.max(120, worldW - 80)) + 40;
          const myBase = ((i * 131 + 52) % Math.max(120, worldH - 80)) + 40;
          const my = myBase + Math.sin(timeSec * 0.55 + i * 1.4) * 5;
          ctx.save();
          ctx.globalAlpha = 0.24;
          ctx.strokeStyle = motifColors[i % motifColors.length];
          ctx.fillStyle = motifColors[i % motifColors.length];
          ctx.lineWidth = 1.4;
          if (i % 4 === 0) {
            // Soft ring
            ctx.beginPath();
            ctx.arc(mx, my, 4.5, 0, Math.PI * 2);
            ctx.stroke();
          } else if (i % 4 === 1) {
            // Tiny 4-point sparkle
            ctx.translate(mx, my);
            ctx.rotate(timeSec * 0.25 + i);
            ctx.beginPath();
            ctx.moveTo(-4, 0);
            ctx.lineTo(4, 0);
            ctx.moveTo(0, -4);
            ctx.lineTo(0, 4);
            ctx.stroke();
          } else if (i % 4 === 2) {
            // Playful tilted pill dash
            ctx.translate(mx, my);
            ctx.rotate(0.6 + i);
            roundRectPath(ctx, -4.5, -1.5, 9, 3, 2);
            ctx.fill();
          } else {
            // Tiny solid confetti dot
            ctx.beginPath();
            ctx.arc(mx, my, 2.3, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Empty-space tap ripples
        for (const rp of ripplesRef.current) {
          const t = rp.life / rp.maxLife;
          ctx.save();
          ctx.globalAlpha = (1 - t) * 0.35;
          ctx.strokeStyle = colors.accent;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(rp.x, rp.y, 6 + t * 24, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Semantic zoom for labels: show all names when zoomed in enough (or small room), otherwise highlight on hover/tap
        const showAllLabels = nodes.length <= 18 || cam.zoom >= 0.65;

        nodes.sort((a, b) => {
          const aPin = a.id === selectedIdRef.current || a.id === hoveredIdRef.current ? 1 : 0;
          const bPin = b.id === selectedIdRef.current || b.id === hoveredIdRef.current ? 1 : 0;
          if (aPin !== bPin) return aPin - bPin;
          return a.y - b.y;
        });

        for (const node of nodes) {
          drawCharacterToken(
            ctx,
            node,
            colors,
            node.id === myPlayerIdRef.current,
            node.id === selectedIdRef.current,
            node.id === hoveredIdRef.current,
            showAllLabels,
            timeSec,
          );
        }

        // Cheerful tap sparkles
        for (const s of sparklesRef.current) {
          const t = s.life / s.maxLife;
          ctx.save();
          ctx.globalAlpha = (1 - t) * 0.9;
          ctx.fillStyle = motifColors[s.colorIndex % motifColors.length];
          ctx.translate(s.x, s.y);
          if (s.shape % 2 === 0) {
            ctx.beginPath();
            ctx.arc(0, 0, s.size * (1 - t * 0.4), 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.rotate(t * 4);
            const half = s.size * (1 - t * 0.3);
            ctx.fillRect(-half, -half, half * 2, half * 2);
          }
          ctx.restore();
        }

        ctx.restore(); // end camera transform
        ctx.restore();
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener('wheel', handleWheel);
      ro.disconnect();
      darkModeQuery.removeEventListener?.('change', refreshColors);
    };
  }, []);

  const screenToWorld = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { wx: 0, wy: 0, sx: 0, sy: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const { w, h } = sizeRef.current;
    const cam = cameraRef.current;
    return {
      wx: cam.x + (sx - w / 2) / cam.zoom,
      wy: cam.y + (sy - h / 2) / cam.zoom,
      sx,
      sy,
    };
  };

  const findHitNode = (clientX: number, clientY: number): AvatarNode | null => {
    const { wx, wy } = screenToWorld(clientX, clientY);
    const cam = cameraRef.current;
    const hitPad = Math.max(18 / cam.zoom, 0);

    let hit: AvatarNode | null = null;
    let bestDist = Infinity;
    for (const node of nodesRef.current.values()) {
      const dist = Math.hypot(wx - node.x, wy - node.y);
      if (dist <= Math.max(node.radius * 1.45, hitPad) && dist < bestDist) {
        bestDist = dist;
        hit = node;
      }
    }
    return hit;
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const ds = dragStateRef.current;
    if (pointersRef.current.size === 1) {
      ds.isDragging = true;
      ds.hasDragged = false;
      ds.startX = e.clientX;
      ds.startY = e.clientY;
      ds.lastX = e.clientX;
      ds.lastY = e.clientY;
      ds.pinchDist = null;
    } else if (pointersRef.current.size === 2) {
      const pts = Array.from(pointersRef.current.values());
      ds.pinchDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      ds.hasDragged = true;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (pointersRef.current.has(e.pointerId)) {
      pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    const ds = dragStateRef.current;
    if (pointersRef.current.size === 2 && ds.pinchDist !== null) {
      const pts = Array.from(pointersRef.current.values());
      const nextDist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      if (nextDist > 4 && ds.pinchDist > 4) {
        const midClientX = (pts[0].x + pts[1].x) / 2;
        const midClientY = (pts[0].y + pts[1].y) / 2;
        const canvas = canvasRef.current;
        const rect = canvas?.getBoundingClientRect();
        if (rect) {
          applyZoom(nextDist / ds.pinchDist, midClientX - rect.left, midClientY - rect.top);
        }
      }
      ds.pinchDist = nextDist;
      return;
    }

    if (ds.isDragging && pointersRef.current.size === 1) {
      const dx = e.clientX - ds.lastX;
      const dy = e.clientY - ds.lastY;
      ds.lastX = e.clientX;
      ds.lastY = e.clientY;

      if (!ds.hasDragged && Math.hypot(e.clientX - ds.startX, e.clientY - ds.startY) > 6) {
        ds.hasDragged = true;
      }

      if (ds.hasDragged) {
        const cam = cameraRef.current;
        cam.targetX -= dx / cam.targetZoom;
        cam.targetY -= dy / cam.targetZoom;
        cam.x = cam.targetX;
        cam.y = cam.targetY;
        cam.userMoved = true;
        clampCamera(cam, worldRef.current.w, worldRef.current.h, sizeRef.current.w, sizeRef.current.h);
        return;
      }
    }

    const hit = findHitNode(e.clientX, e.clientY);
    hoveredIdRef.current = hit ? hit.id : null;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    pointersRef.current.delete(e.pointerId);
    const ds = dragStateRef.current;

    if (pointersRef.current.size === 0) {
      if (ds.isDragging && !ds.hasDragged) {
        const hit = findHitNode(e.clientX, e.clientY);
        if (hit) {
          hit.hopVel = -195;
          hit.hopOffset = -2;
          hit.scale = 1.16;

          // Friendly empathetic mini-hop on nearby avatars
          for (const other of nodesRef.current.values()) {
            if (other.id === hit.id) continue;
            const d = Math.hypot(other.x - hit.x, other.y - hit.y);
            if (d < 130 && other.hopOffset === 0) {
              other.hopVel = -68;
              other.hopOffset = -1;
            }
          }

          // Pop cheerful sparkles around tapped avatar
          for (let i = 0; i < 7; i++) {
            const angle = (Math.PI * 2 * i) / 7 + (Math.random() - 0.5) * 0.4;
            const speed = 36 + Math.random() * 44;
            sparklesRef.current.push({
              x: hit.x + Math.cos(angle) * hit.radius * 0.5,
              y: hit.y + Math.sin(angle) * hit.radius * 0.5,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 30,
              size: 2.2 + Math.random() * 1.4,
              life: 0,
              maxLife: 0.48 + Math.random() * 0.22,
              colorIndex: i,
              shape: i,
            });
          }

          if (canKick) {
            setSelectedId((prev) => (prev === hit.id ? null : hit.id));
            setConfirmKick(false);
          }
        } else {
          const { wx, wy } = screenToWorld(e.clientX, e.clientY);
          ripplesRef.current.push({ x: wx, y: wy, life: 0, maxLife: 0.45 });
          if (canKick && selectedId) {
            setSelectedId(null);
            setConfirmKick(false);
          }
        }
      }
      ds.isDragging = false;
      ds.hasDragged = false;
      ds.pinchDist = null;
    } else if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0];
      ds.lastX = remaining.x;
      ds.lastY = remaining.y;
      ds.pinchDist = null;
    }
  };

  const handlePointerLeave = () => {
    hoveredIdRef.current = null;
  };

  const selectedPlayer = selectedId ? players.find((p) => p.id === selectedId) ?? null : null;
  const showZoomHud = players.length > 0;

  return (
    <div className="space-y-3 min-w-0">
      <div
        ref={containerRef}
        className={`relative w-full ${heightClassName} rounded-3xl border border-border bg-surface overflow-hidden select-none`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          className="block w-full h-full cursor-grab active:cursor-grabbing touch-none"
          aria-label={
            players.length === 0
              ? 'Waiting room canvas — no players yet'
              : `Waiting room canvas with ${players.length} ${players.length === 1 ? 'player' : 'players'}`
          }
        />

        {players.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-surface/90 backdrop-blur-xs rounded-2xl border border-border px-6 py-5 max-w-sm space-y-1.5">
              <h2 className="font-display font-extrabold text-xl sm:text-2xl text-text">
                Waiting for the house
              </h2>
              <p className="text-sm text-muted">
                {subtitle ?? 'Avatars pop in and settle here as everyone hops in.'}
              </p>
            </div>
          </div>
        )}

        {/* Pan & Zoom Controls */}
        {showZoomHud && (
          <div className="absolute top-3 right-3 flex items-center gap-0.5 rounded-xl bg-surface/92 backdrop-blur-xs border border-border p-1 shadow-xs">
            <button
              type="button"
              onClick={() => applyZoom(1 / 1.25)}
              aria-label="Zoom out"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-surface-2 cursor-pointer transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleFitView}
              title="Fit all players in view"
              className="px-2 h-7 rounded-lg font-mono text-[11px] font-bold text-muted hover:text-text hover:bg-surface-2 tabular-nums inline-flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Maximize2 className="w-3 h-3" />
              <span>{zoomPct}%</span>
            </button>
            <button
              type="button"
              onClick={() => applyZoom(1.25)}
              aria-label="Zoom in"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:text-text hover:bg-surface-2 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {players.length > 0 && !selectedPlayer && (
          <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2 text-[11px] font-medium text-faint">
            <span className="truncate">
              {players.length > 12
                ? 'Drag to pan · Scroll or pinch to zoom · Tap any avatar'
                : canKick
                  ? 'Tap any avatar to bounce — or select to remove'
                  : 'Tap any avatar to give them a bounce'}
            </span>
          </div>
        )}

        {canKick && selectedPlayer && onKickPlayer && (
          <div className="absolute bottom-3 left-3 right-3 sm:left-auto sm:right-3 bg-surface/95 backdrop-blur-xs rounded-2xl border border-border px-4 py-2.5 flex items-center justify-between gap-3 shadow-sm">
            <span className="font-display font-bold text-sm text-text truncate min-w-0">
              {selectedPlayer.name}
            </span>
            <div className="flex items-center gap-2 shrink-0">
              {confirmKick ? (
                <button
                  type="button"
                  onClick={() => {
                    onKickPlayer(selectedPlayer.id);
                    setSelectedId(null);
                    setConfirmKick(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-danger text-white text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  Confirm remove
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmKick(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-danger-soft text-danger text-xs font-bold cursor-pointer whitespace-nowrap"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setConfirmKick(false);
                }}
                aria-label="Close player selection"
                className="w-7 h-7 rounded-lg flex items-center justify-center text-muted hover:bg-surface-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
