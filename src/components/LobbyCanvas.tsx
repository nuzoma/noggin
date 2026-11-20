import { useEffect, useRef, useState } from 'react';
import { Trash2, X } from 'lucide-react';

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
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  bobSpeed: number;
  scale: number;
  hopOffset: number;
  hopVel: number;
  seed: number;
}

interface ThemeColors {
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
    surface: get('--surface', 'rgb(255 255 255)'),
    surface2: get('--surface-2', 'rgb(243 239 234)'),
    border: get('--border', 'rgb(231 225 216)'),
    text: get('--text', 'rgb(31 27 22)'),
    textMuted: get('--text-muted', 'rgb(107 98 89)'),
    accent: get('--accent', 'rgb(59 123 228)'),
    accentSoft: get('--accent-soft', 'rgb(232 240 253)'),
    onAccent: get('--btn-primary-text', 'rgb(255 255 255)'),
    success: get('--success', 'rgb(31 157 107)'),
    successSoft: get('--success-soft', 'rgb(227 246 237)'),
    warning: get('--warning', 'rgb(201 138 0)'),
    warningSoft: get('--warning-soft', 'rgb(251 241 214)'),
    lobby: get('--state-lobby', 'rgb(59 123 228)'),
    lobbySoft: get('--state-lobby-soft', 'rgb(232 240 253)'),
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

function drawHousemateAvatar(
  ctx: CanvasRenderingContext2D,
  node: AvatarNode,
  colors: ThemeColors,
  isMe: boolean,
  isSelected: boolean,
  timeSec: number,
) {
  const paletteSlots = [
    { fill: colors.lobbySoft, stroke: colors.lobby },
    { fill: colors.successSoft, stroke: colors.success },
    { fill: colors.warningSoft, stroke: colors.warning },
    { fill: colors.accentSoft, stroke: colors.accent },
    { fill: colors.surface2, stroke: colors.textMuted },
  ];
  const slot = isMe ? paletteSlots[0] : paletteSlots[node.seed % paletteSlots.length];
  const accessory = (node.seed >> 3) % 5;
  const expression = (node.seed >> 6) % 4;

  const r = node.radius;
  const bob = Math.sin(timeSec * node.bobSpeed + node.phase) * 3.5;
  const cx = node.x;
  const cy = node.y + bob + node.hopOffset;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(node.scale, node.scale);
  if (!node.connected) {
    ctx.globalAlpha = 0.55;
  }

  // Soft ground shadow beneath avatar
  ctx.save();
  ctx.globalAlpha = node.connected ? 0.14 : 0.06;
  ctx.fillStyle = colors.text;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.92 - bob * 0.4, r * 0.72, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Selection or (You) outer halo ring
  if (isMe || isSelected) {
    ctx.save();
    ctx.strokeStyle = colors.accent;
    ctx.lineWidth = isSelected ? 2.5 : 2;
    ctx.setLineDash(isSelected ? [] : [4, 4]);
    ctx.beginPath();
    ctx.arc(0, -r * 0.05, r * 1.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Little legs (like the HouseQuiz mascot)
  ctx.strokeStyle = colors.text;
  ctx.lineWidth = Math.max(1.8, r * 0.085);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-r * 0.28, r * 0.48);
  ctx.lineTo(-r * 0.28, r * 0.78);
  ctx.lineTo(-r * 0.42, r * 0.78);
  ctx.moveTo(r * 0.28, r * 0.48);
  ctx.lineTo(r * 0.28, r * 0.78);
  ctx.lineTo(r * 0.42, r * 0.78);
  ctx.stroke();

  // Little arms
  const wave = Math.sin(timeSec * 2.1 + node.phase) * r * 0.06;
  ctx.beginPath();
  ctx.moveTo(-r * 0.85, -r * 0.08);
  ctx.quadraticCurveTo(-r * 1.15, r * 0.1 + wave, -r * 0.82, r * 0.28);
  ctx.moveTo(r * 0.85, -r * 0.08);
  ctx.quadraticCurveTo(r * 1.15, r * 0.1 - wave, r * 0.82, r * 0.28);
  ctx.stroke();

  // Semi-circle mascot dome body
  ctx.fillStyle = slot.fill;
  ctx.strokeStyle = slot.stroke;
  ctx.lineWidth = Math.max(2.2, r * 0.1);
  ctx.beginPath();
  ctx.moveTo(-r * 0.88, -r * 0.26);
  ctx.lineTo(r * 0.88, -r * 0.26);
  ctx.arc(0, -r * 0.26, r * 0.88, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Accessories on top
  ctx.strokeStyle = colors.text;
  ctx.fillStyle = slot.stroke;
  ctx.lineWidth = Math.max(1.8, r * 0.08);
  if (accessory === 0) {
    // Curly tuft
    ctx.beginPath();
    ctx.moveTo(-r * 0.1, -r * 0.28);
    ctx.quadraticCurveTo(-r * 0.18, -r * 0.54, 0, -r * 0.48);
    ctx.quadraticCurveTo(r * 0.14, -r * 0.62, r * 0.2, -r * 0.34);
    ctx.stroke();
  } else if (accessory === 1) {
    // Tiny party/house beanie
    ctx.beginPath();
    ctx.arc(0, -r * 0.26, r * 0.36, Math.PI, 0, false);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, -r * 0.65, r * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = colors.surface;
    ctx.fill();
    ctx.stroke();
  } else if (accessory === 2) {
    // Sprout leaf
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.26);
    ctx.lineTo(0, -r * 0.56);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(r * 0.14, -r * 0.56, r * 0.16, r * 0.09, -0.45, 0, Math.PI * 2);
    ctx.fillStyle = colors.success;
    ctx.fill();
    ctx.stroke();
  } else if (accessory === 3) {
    // Tiny headband / crown points
    ctx.beginPath();
    ctx.moveTo(-r * 0.32, -r * 0.27);
    ctx.lineTo(-r * 0.22, -r * 0.54);
    ctx.lineTo(0, -r * 0.36);
    ctx.lineTo(r * 0.22, -r * 0.54);
    ctx.lineTo(r * 0.32, -r * 0.27);
    ctx.closePath();
    ctx.fillStyle = colors.warningSoft;
    ctx.fill();
    ctx.stroke();
  } else {
    // Cat/critter ears
    ctx.beginPath();
    ctx.moveTo(-r * 0.62, -r * 0.26);
    ctx.lineTo(-r * 0.45, -r * 0.56);
    ctx.lineTo(-r * 0.22, -r * 0.26);
    ctx.moveTo(r * 0.22, -r * 0.26);
    ctx.lineTo(r * 0.45, -r * 0.56);
    ctx.lineTo(r * 0.62, -r * 0.26);
    ctx.fillStyle = slot.fill;
    ctx.fill();
    ctx.stroke();
  }

  // Eyes & smile
  ctx.strokeStyle = colors.text;
  ctx.fillStyle = colors.text;
  ctx.lineWidth = Math.max(1.8, r * 0.08);
  const eyeY = -r * 0.02;
  const eyeX = r * 0.3;

  if (expression === 0) {
    // Closed happy arcs
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY, r * 0.1, 0, Math.PI, false);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, r * 0.1, 0, Math.PI, false);
    ctx.stroke();
  } else if (expression === 1) {
    // Bright dot eyes
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY, r * 0.075, 0, Math.PI * 2);
    ctx.arc(eyeX, eyeY, r * 0.075, 0, Math.PI * 2);
    ctx.fill();
  } else if (expression === 2) {
    // Wink
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY, r * 0.075, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, r * 0.1, 0, Math.PI, false);
    ctx.stroke();
  } else {
    // Glasses!
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY, r * 0.16, 0, Math.PI * 2);
    ctx.moveTo(-eyeX + r * 0.16, eyeY);
    ctx.lineTo(eyeX - r * 0.16, eyeY);
    ctx.moveTo(eyeX + r * 0.16, eyeY);
    ctx.arc(eyeX, eyeY, r * 0.16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-eyeX, eyeY, r * 0.055, 0, Math.PI * 2);
    ctx.arc(eyeX, eyeY, r * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }

  // Smile
  ctx.beginPath();
  ctx.arc(0, r * 0.14, r * 0.14, 0.15 * Math.PI, 0.85 * Math.PI, false);
  ctx.stroke();

  // Nameplate below avatar
  const label = isMe ? `${node.name} (You)` : node.name;
  const fontSize = Math.max(11, Math.min(13, Math.round(r * 0.42)));
  ctx.font = `700 ${fontSize}px "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif`;
  const displayLabel = fitText(ctx, label, Math.max(76, r * 3.8));
  const textWidth = ctx.measureText(displayLabel).width;
  const plateW = textWidth + 18;
  const plateH = fontSize + 10;
  const plateX = -plateW / 2;
  const plateY = r * 0.94;

  ctx.fillStyle = isMe || isSelected ? colors.accent : colors.surface;
  ctx.strokeStyle = isMe || isSelected ? colors.accent : colors.border;
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, plateX, plateY, plateW, plateH, 999);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isMe || isSelected ? colors.onAccent : colors.text;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayLabel, 0, plateY + plateH / 2 + 0.5);

  ctx.restore();
}

export function LobbyCanvas({
  players,
  myPlayerId,
  canKick = false,
  onKickPlayer,
  heightClassName = 'h-[280px] sm:h-[360px]',
  subtitle,
}: LobbyCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nodesRef = useRef<Map<string, AvatarNode>>(new Map());
  const sizeRef = useRef<{ w: number; h: number }>({ w: 640, h: 320 });
  const playersRef = useRef<LobbyAvatarPlayer[]>(players);
  const selectedIdRef = useRef<string | null>(null);
  const myPlayerIdRef = useRef<string | undefined>(myPlayerId);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmKick, setConfirmKick] = useState(false);

  playersRef.current = players;
  selectedIdRef.current = selectedId;
  myPlayerIdRef.current = myPlayerId;

  useEffect(() => {
    if (selectedId && !players.some((p) => p.id === selectedId)) {
      setSelectedId(null);
      setConfirmKick(false);
    }
  }, [players, selectedId]);

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

    const syncNodes = (width: number, height: number) => {
      const list = playersRef.current;
      const count = list.length;
      const baseRadius =
        count <= 4
          ? Math.min(34, Math.max(24, width * 0.055))
          : count <= 10
            ? Math.min(30, Math.max(21, width * 0.046))
            : Math.min(24, Math.max(18, width * 0.038));

      const padX = Math.max(62, baseRadius * 2.1);
      const padTop = baseRadius * 1.4 + 14;
      const padBottom = baseRadius * 1.9 + 20;
      const usableW = Math.max(80, width - padX * 2);
      const usableH = Math.max(80, height - padTop - padBottom);

      const nextMap = new Map<string, AvatarNode>();
      list.forEach((p, idx) => {
        const existing = nodesRef.current.get(p.id);
        const seed = hashString(`${p.id}:${p.name}`);
        if (existing) {
          existing.name = p.name;
          existing.connected = p.connected;
          existing.radius = baseRadius;
          existing.x = Math.max(padX, Math.min(width - padX, existing.x));
          existing.y = Math.max(padTop, Math.min(height - padBottom, existing.y));
          nextMap.set(p.id, existing);
        } else {
          const cols = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, count) * (usableW / usableH))));
          const rows = Math.max(1, Math.ceil(Math.max(1, count) / cols));
          const col = idx % cols;
          const row = Math.floor(idx / cols);
          const jitterX = (((seed % 100) / 100) - 0.5) * Math.min(36, usableW / (cols + 1));
          const jitterY = ((((seed >> 8) % 100) / 100) - 0.5) * Math.min(28, usableH / (rows + 1));
          const x =
            count === 1
              ? width / 2
              : padX + ((col + 0.5) / cols) * usableW + jitterX;
          const y =
            count === 1
              ? height / 2 - 8
              : padTop + ((row + 0.5) / rows) * usableH + jitterY;
          const angle = ((seed % 360) * Math.PI) / 180;
          const speed = 16 + (seed % 14);
          nextMap.set(p.id, {
            id: p.id,
            name: p.name,
            connected: p.connected,
            x: Math.max(padX, Math.min(width - padX, x)),
            y: Math.max(padTop, Math.min(height - padBottom, y)),
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: baseRadius,
            phase: ((seed % 628) / 100),
            bobSpeed: 1.5 + ((seed % 10) / 12),
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
      const h = Math.max(200, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      sizeRef.current = { w, h };
      syncNodes(w, h);
    };

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

      if (!reducedMotion && nodes.length > 0) {
        const baseR = nodes[0].radius;
        const padX = Math.max(62, baseR * 2.1);
        const padTop = baseR * 1.4 + 14;
        const padBottom = baseR * 1.9 + 20;

        // Pairwise gentle repulsion so names and avatars never overlap
        const minDist = baseR * 2.95;
        for (let i = 0; i < nodes.length; i++) {
          for (let j = i + 1; j < nodes.length; j++) {
            const a = nodes[i];
            const b = nodes[j];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let dist = Math.hypot(dx, dy);
            if (dist < 0.01) {
              dx = 1;
              dy = 0.4;
              dist = 1.07;
            }
            if (dist < minDist) {
              const push = ((minDist - dist) / minDist) * 140 * dt;
              const nx = dx / dist;
              const ny = dy / dist;
              a.vx -= nx * push;
              a.vy -= ny * push;
              b.vx += nx * push;
              b.vy += ny * push;
            }
          }
        }

        // Update positions, gentle drift speed cap, wall bounce, entrance scale, hop spring
        for (const n of nodes) {
          if (n.scale < 1) {
            n.scale = Math.min(1, n.scale + dt * 4.5);
          }

          if (n.hopOffset !== 0 || n.hopVel !== 0) {
            n.hopVel += 640 * dt;
            n.hopOffset += n.hopVel * dt;
            if (n.hopOffset >= 0) {
              n.hopOffset = 0;
              n.hopVel = 0;
            }
          }

          // Keep gentle steady drift velocity
          const speed = Math.hypot(n.vx, n.vy);
          const maxSpeed = 34;
          const minSpeed = 12;
          if (speed > maxSpeed) {
            n.vx = (n.vx / speed) * maxSpeed;
            n.vy = (n.vy / speed) * maxSpeed;
          } else if (speed < minSpeed && speed > 0.01) {
            n.vx = (n.vx / speed) * minSpeed;
            n.vy = (n.vy / speed) * minSpeed;
          }

          n.x += n.vx * dt;
          n.y += n.vy * dt;

          if (n.x < padX) {
            n.x = padX;
            n.vx = Math.abs(n.vx);
          } else if (n.x > w - padX) {
            n.x = w - padX;
            n.vx = -Math.abs(n.vx);
          }

          if (n.y < padTop) {
            n.y = padTop;
            n.vy = Math.abs(n.vy);
          } else if (n.y > h - padBottom) {
            n.y = h - padBottom;
            n.vy = -Math.abs(n.vy);
          }
        }
      }

      // Render frame
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, w, h);

        // Background surface fill + subtle living-room dot grid
        ctx.fillStyle = colors.surface;
        ctx.fillRect(0, 0, w, h);

        ctx.fillStyle = colors.border;
        const gridStep = 28;
        for (let gx = 18; gx < w - 10; gx += gridStep) {
          for (let gy = 18; gy < h - 10; gy += gridStep) {
            ctx.beginPath();
            ctx.arc(gx, gy, 1.15, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        // Subtle ambient floating geometric shapes (warm living-room vibe)
        const timeSec = reducedMotion ? 0 : now / 1000;
        const decorCount = 8;
        for (let i = 0; i < decorCount; i++) {
          const dx = ((i * 137 + 45) % Math.max(80, w - 60)) + 30;
          const dyBase = ((i * 89 + 30) % Math.max(80, h - 60)) + 30;
          const dy = dyBase + Math.sin(timeSec * 0.6 + i * 1.3) * 6;
          ctx.save();
          ctx.globalAlpha = 0.28;
          ctx.strokeStyle = i % 2 === 0 ? colors.lobby : colors.warning;
          ctx.lineWidth = 1.6;
          if (i % 3 === 0) {
            ctx.beginPath();
            ctx.arc(dx, dy, 5, 0, Math.PI * 2);
            ctx.stroke();
          } else if (i % 3 === 1) {
            ctx.translate(dx, dy);
            ctx.rotate(timeSec * 0.25 + i);
            ctx.strokeRect(-4, -4, 8, 8);
          } else {
            ctx.beginPath();
            ctx.moveTo(dx - 4, dy);
            ctx.lineTo(dx + 4, dy);
            ctx.moveTo(dx, dy - 4);
            ctx.lineTo(dx, dy + 4);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Sort nodes slightly by Y so lower ones sit cleanly in front
        nodes.sort((a, b) => a.y - b.y);
        for (const node of nodes) {
          drawHousemateAvatar(
            ctx,
            node,
            colors,
            node.id === myPlayerIdRef.current,
            node.id === selectedIdRef.current,
            timeSec,
          );
        }

        ctx.restore();
      }

      animId = requestAnimationFrame(step);
    };

    animId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animId);
      ro.disconnect();
      darkModeQuery.removeEventListener?.('change', refreshColors);
    };
  }, []);

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    let hit: AvatarNode | null = null;
    let bestDist = Infinity;
    for (const node of nodesRef.current.values()) {
      const dist = Math.hypot(px - node.x, py - node.y);
      if (dist <= node.radius * 1.45 && dist < bestDist) {
        bestDist = dist;
        hit = node;
      }
    }

    if (hit) {
      // Hop & nudge on tap!
      hit.hopVel = -180;
      hit.hopOffset = -2;
      hit.vx += (Math.random() - 0.5) * 28;
      hit.vy -= 14;
      if (canKick) {
        setSelectedId((prev) => (prev === hit!.id ? null : hit!.id));
        setConfirmKick(false);
      }
    } else if (canKick && selectedId) {
      setSelectedId(null);
      setConfirmKick(false);
    }
  };

  const selectedPlayer = selectedId ? players.find((p) => p.id === selectedId) ?? null : null;

  return (
    <div className="space-y-3 min-w-0">
      <div
        ref={containerRef}
        className={`relative w-full ${heightClassName} rounded-3xl border border-border bg-surface overflow-hidden select-none`}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handleCanvasPointerDown}
          className="block w-full h-full cursor-pointer touch-manipulation"
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
                {subtitle ?? 'Avatars pop in and float around here as everyone hops in.'}
              </p>
            </div>
          </div>
        )}

        {players.length > 0 && !selectedPlayer && (
          <div className="pointer-events-none absolute bottom-3 left-4 right-4 flex items-center justify-between gap-2 text-[11px] font-medium text-faint">
            <span className="truncate">
              {canKick
                ? 'Tap any housemate to bounce — or select to remove'
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
