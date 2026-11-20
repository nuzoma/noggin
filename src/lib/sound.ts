let audioCtx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined' || muted) return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setSoundMuted(next: boolean) {
  muted = next;
}

export function isSoundMuted(): boolean {
  return muted;
}

function playTone(freq: number, durationSec: number, type: OscillatorType = 'sine', delaySec = 0, gainVal = 0.08) {
  const ctx = getCtx();
  if (!ctx) return;

  const start = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  gain.gain.setValueAtTime(0.001, start);
  gain.gain.exponentialRampToValueAtTime(gainVal, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.001, start + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + durationSec + 0.02);
}

export function playTap() {
  playTone(520, 0.07, 'triangle', 0, 0.06);
}

export function playLockIn() {
  playTone(587.33, 0.09, 'sine', 0, 0.07);
  playTone(880, 0.14, 'sine', 0.06, 0.07);
}

export function playReveal(isCorrect: boolean | null) {
  if (isCorrect === true) {
    playTone(523.25, 0.11, 'triangle', 0, 0.08);
    playTone(659.25, 0.11, 'triangle', 0.08, 0.08);
    playTone(783.99, 0.22, 'triangle', 0.16, 0.09);
  } else if (isCorrect === false) {
    playTone(311.13, 0.14, 'sine', 0, 0.07);
    playTone(261.63, 0.22, 'sine', 0.11, 0.07);
  } else {
    playTone(440, 0.14, 'sine', 0, 0.06);
  }
}

export function playFanfare() {
  playTone(523.25, 0.12, 'triangle', 0, 0.08);
  playTone(659.25, 0.12, 'triangle', 0.1, 0.08);
  playTone(783.99, 0.14, 'triangle', 0.2, 0.09);
  playTone(1046.5, 0.35, 'triangle', 0.32, 0.1);
}
