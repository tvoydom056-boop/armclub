import { useSettings } from '../store/settings';

/**
 * Звук синтезируется в коде через Web Audio: без файлов и лицензий.
 * Контекст создаётся по первому жесту пользователя (политика автоплея браузеров).
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let voices = 0;

const MAX_VOICES = 32;

const masterLevel = () => {
  const s = useSettings.getState();
  return s.muted ? 0 : s.volume * s.volume * 0.9;
};

function create(): void {
  if (ctx || typeof AudioContext === 'undefined') return;
  ctx = new AudioContext();
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 4;
  master = ctx.createGain();
  master.gain.value = masterLevel();
  master.connect(comp).connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

/** Подписывается на первый жест пользователя и на настройки громкости. Возвращает отписку. */
export function initAudio(): () => void {
  const unlock = () => {
    create();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  };
  const events = ['pointerdown', 'keydown', 'touchstart', 'click'] as const;
  for (const e of events) window.addEventListener(e, unlock, { capture: true });
  const off = useSettings.subscribe(() => {
    if (ctx && master) master.gain.setTargetAtTime(masterLevel(), ctx.currentTime, 0.03);
  });
  return () => {
    for (const e of events) window.removeEventListener(e, unlock, { capture: true });
    off();
  };
}

function live(): { c: AudioContext; out: GainNode } | null {
  return ctx && master && ctx.state !== 'closed' ? { c: ctx, out: master } : null;
}

/** Частота ноты в полутонах от ля первой октавы (440 Гц). */
export const hz = (semi: number) => 440 * 2 ** (semi / 12);

interface ToneOpts {
  f: number;
  /** конечная частота (экспоненциальный сдвиг) */
  to?: number;
  dur: number;
  type?: OscillatorType;
  vol?: number;
  /** задержка старта, с */
  at?: number;
  attack?: number;
}

export function tone(o: ToneOpts): void {
  const a = live();
  if (!a || voices >= MAX_VOICES) return;
  const { c, out } = a;
  const t0 = c.currentTime + (o.at ?? 0);
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.f, t0);
  if (o.to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.to), t0 + o.dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.3, t0 + (o.attack ?? 0.005));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  osc.connect(g).connect(out);
  osc.start(t0);
  osc.stop(t0 + o.dur + 0.03);
  voices++;
  osc.onended = () => {
    voices--;
    g.disconnect();
  };
}

interface NoiseOpts {
  dur: number;
  type?: BiquadFilterType;
  f: number;
  to?: number;
  q?: number;
  vol?: number;
  at?: number;
  attack?: number;
}

export function noise(o: NoiseOpts): void {
  const a = live();
  if (!a || !noiseBuf || voices >= MAX_VOICES) return;
  const { c, out } = a;
  const t0 = c.currentTime + (o.at ?? 0);
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const filt = c.createBiquadFilter();
  filt.type = o.type ?? 'bandpass';
  filt.Q.value = o.q ?? 1;
  filt.frequency.setValueAtTime(o.f, t0);
  if (o.to) filt.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + o.dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + (o.attack ?? 0.004));
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.dur);
  src.connect(filt).connect(g).connect(out);
  src.start(t0, Math.random() * 1.5);
  src.stop(t0 + o.dur + 0.03);
  voices++;
  src.onended = () => {
    voices--;
    g.disconnect();
  };
}

/* ---------- гул толпы ---------- */

interface CrowdNodes {
  src: AudioBufferSourceNode;
  gain: GainNode;
  lfo: OscillatorNode;
}
let crowdNodes: CrowdNodes | null = null;

export const crowd = {
  start(): void {
    const a = live();
    if (!a || !noiseBuf || crowdNodes) return;
    const { c, out } = a;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 650;
    band.Q.value = 0.5;
    const gain = c.createGain();
    gain.gain.value = 0;
    // медленное «дыхание» толпы
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.35;
    const depth = c.createGain();
    depth.gain.value = 0.012;
    lfo.connect(depth).connect(gain.gain);
    src.connect(band).connect(gain).connect(out);
    src.start();
    lfo.start();
    crowdNodes = { src, gain, lfo };
  },

  /** 0..1 — насколько толпа разошлась. */
  level(v: number): void {
    if (!crowdNodes || !ctx) return;
    crowdNodes.gain.gain.setTargetAtTime(0.02 + v * 0.09, ctx.currentTime, 0.3);
  },

  stop(): void {
    const n = crowdNodes;
    if (!n || !ctx) return;
    crowdNodes = null;
    n.gain.gain.setTargetAtTime(0, ctx.currentTime, 0.15);
    window.setTimeout(() => {
      n.src.stop();
      n.lfo.stop();
      n.gain.disconnect();
    }, 800);
  },

  /** Волна голосов: ликование (высокая) или разочарованное «у-у-у» (низкая). */
  swell(kind: 'cheer' | 'boo', at = 0): void {
    if (kind === 'cheer') {
      noise({ dur: 1.8, type: 'bandpass', f: 700, to: 1300, q: 0.7, vol: 0.2, at, attack: 0.25 });
      noise({ dur: 1.5, type: 'bandpass', f: 1800, to: 2600, q: 1.2, vol: 0.07, at: at + 0.1, attack: 0.2 });
    } else {
      noise({ dur: 1.6, type: 'bandpass', f: 380, to: 220, q: 0.8, vol: 0.2, at, attack: 0.3 });
      tone({ f: 150, to: 95, dur: 1.4, type: 'sawtooth', vol: 0.04, at, attack: 0.3 });
    }
  },
};
