/**
 * Zero-dependency Web Audio synthesizer for Deadwood Dice.
 * Provides crisp wooden dice rattles, piece taps, gavel knocks,
 * and a faint metallic clink used ONLY when `subtle_tells` fires.
 */

let audioCtx: AudioContext | null = null;
let muted = false;

function getContext(): AudioContext | null {
  if (muted || typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) {
    audioCtx = new Ctx();
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume();
  }
  return audioCtx;
}

export function setSoundMuted(nextMuted: boolean): void {
  muted = nextMuted;
}

export function isSoundMuted(): boolean {
  return muted;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType,
  gainPeak: number,
  delay = 0,
  endFreq?: number,
): void {
  const ctx = getContext();
  if (!ctx) return;

  const now = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
  }

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(gainPeak, now + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + duration + 0.02);
}

/** Wooden dice cup rattle */
export function playDiceRoll(): void {
  const clicks = [0, 0.06, 0.13, 0.21, 0.3];
  clicks.forEach((delay, idx) => {
    const baseFreq = 260 + ((idx * 97) % 180);
    playTone(baseFreq, 0.045, 'triangle', 0.07, delay, baseFreq * 0.55);
  });
}

/** Faint weighted-lead/brass clink ONLY on subtle_tells rigged rolls */
export function playLoadedTell(): void {
  playTone(2340, 0.18, 'sine', 0.032, 0.05, 2290);
  playTone(3510, 0.14, 'sine', 0.018, 0.07, 3440);
}

/** Wooden rider tap on the board */
export function playMove(): void {
  playTone(190, 0.07, 'triangle', 0.09, 0, 110);
}

/** Heavy knockback thud */
export function playCapture(): void {
  playTone(140, 0.16, 'sawtooth', 0.11, 0, 48);
  playTone(95, 0.2, 'sine', 0.13, 0.03, 40);
}

/** Saloon gavel double-knock on Call Out */
export function playGavel(): void {
  playTone(165, 0.09, 'square', 0.08, 0, 75);
  playTone(155, 0.12, 'square', 0.1, 0.13, 65);
}

/** Verdict sting */
export function playVerdict(won: boolean): void {
  if (won) {
    playTone(392, 0.22, 'triangle', 0.08, 0.05);
    playTone(493.88, 0.24, 'triangle', 0.08, 0.16);
    playTone(587.33, 0.38, 'triangle', 0.09, 0.28);
  } else {
    playTone(293.66, 0.25, 'triangle', 0.08, 0.05);
    playTone(246.94, 0.28, 'triangle', 0.08, 0.18);
    playTone(196, 0.42, 'sine', 0.09, 0.32);
  }
}