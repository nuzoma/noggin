import { useEffect, useRef } from 'react';

interface ConfettiBurstProps {
  /** Incrementing or unique string/number key that triggers a fresh burst when changed */
  triggerKey: string | number;
  /** Set false to suppress bursting (e.g. if player got a question wrong) */
  active?: boolean;
  /** Number of pieces per burst (defaults to 76) */
  count?: number;
}

interface ConfettiPiece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rotation: number;
  rotSpeed: number;
  tilt: number;
  tiltSpeed: number;
  wobblePhase: number;
  color: string;
  shape: 'rect' | 'circle' | 'ribbon';
  life: number;
  maxLife: number;
}

function readConfettiPalette(): string[] {
  const styles = getComputedStyle(document.documentElement);
  const get = (name: string, fallback: string) => styles.getPropertyValue(name).trim() || fallback;
  return [
    get('--state-reveal', 'rgb(39 125 91)'),
    get('--state-podium', 'rgb(196 132 24)'),
    get('--state-question', 'rgb(217 95 67)'),
    get('--state-lobby', 'rgb(46 111 120)'),
    get('--accent', 'rgb(39 125 91)'),
    get('--accent-soft', 'rgb(225 241 233)'),
  ];
}

export function ConfettiBurst({
  triggerKey,
  active = true,
  count = 76,
}: ConfettiBurstProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!active) return;
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    };
    window.addEventListener('resize', handleResize);

    const palette = readConfettiPalette();
    const shapes: ConfettiPiece['shape'][] = ['rect', 'rect', 'ribbon', 'circle'];
    const pieces: ConfettiPiece[] = [];

    // Launch from two side-top celebratory cannons + a gentle top center shower
    for (let i = 0; i < count; i++) {
      const originGroup = i % 3;
      let x: number;
      let y: number;
      let vx: number;
      let vy: number;

      if (originGroup === 0) {
        // Left cannon
        x = width * (0.1 + Math.random() * 0.14);
        y = height * (0.28 + Math.random() * 0.12);
        const angle = -Math.PI / 3 + (Math.random() - 0.5) * 0.65;
        const speed = 340 + Math.random() * 340;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed - 60;
      } else if (originGroup === 1) {
        // Right cannon
        x = width * (0.76 + Math.random() * 0.14);
        y = height * (0.28 + Math.random() * 0.12);
        const angle = (-Math.PI * 2) / 3 + (Math.random() - 0.5) * 0.65;
        const speed = 340 + Math.random() * 340;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed - 60;
      } else {
        // Center-top celebratory pop
        x = width * (0.3 + Math.random() * 0.4);
        y = height * (0.14 + Math.random() * 0.1);
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
        const speed = 220 + Math.random() * 280;
        vx = Math.cos(angle) * speed;
        vy = Math.sin(angle) * speed;
      }

      const shape = shapes[i % shapes.length];
      pieces.push({
        x,
        y,
        vx,
        vy,
        w: shape === 'ribbon' ? 4 + Math.random() * 3 : 6 + Math.random() * 5,
        h: shape === 'ribbon' ? 12 + Math.random() * 8 : 5 + Math.random() * 4,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 7,
        tilt: Math.random() * Math.PI * 2,
        tiltSpeed: 4 + Math.random() * 6,
        wobblePhase: Math.random() * Math.PI * 2,
        color: palette[i % palette.length],
        shape,
        life: 0,
        maxLife: 1.9 + Math.random() * 0.8,
      });
    }

    let rafId = 0;
    let lastTs = performance.now();

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      let anyAlive = false;

      for (const p of pieces) {
        p.life += dt;
        if (p.life >= p.maxLife || p.y > height + 40) continue;
        anyAlive = true;

        // Gravity & air drag
        p.vy += 560 * dt;
        const drag = Math.pow(0.985, dt * 60);
        p.vx *= drag;
        p.vy *= drag;

        // Flutter wobble
        p.wobblePhase += dt * 5;
        p.x += (p.vx + Math.sin(p.wobblePhase) * 28) * dt;
        p.y += p.vy * dt;
        p.rotation += p.rotSpeed * dt;
        p.tilt += p.tiltSpeed * dt;

        const progress = p.life / p.maxLife;
        const alpha = progress < 0.7 ? 0.92 : Math.max(0, (1 - progress) / 0.3) * 0.92;
        const scaleY = 0.25 + 0.75 * Math.abs(Math.cos(p.tilt));

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.scale(1, scaleY);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(0, 0, p.w * 0.45, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.roundRect(-p.w / 2, -p.h / 2, p.w, p.h, 1.5);
          ctx.fill();
        }
        ctx.restore();
      }

      if (anyAlive) {
        rafId = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    };

    rafId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [triggerKey, active, count]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-50"
      aria-hidden="true"
    />
  );
}
