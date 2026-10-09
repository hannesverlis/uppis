export type Clip =
  | "kutse-saadetud"
  | "abi-teel-5"
  | "abi-teel-10"
  | "abi-teel-20"
  | "abi-teel-40"
  | "abistaja-hilineb"
  | "abistaja-kohal";

const CLIPS: Clip[] = [
  "kutse-saadetud",
  "abi-teel-5",
  "abi-teel-10",
  "abi-teel-20",
  "abi-teel-40",
  "abistaja-hilineb",
  "abistaja-kohal",
];

const ENABLED_KEY = "uppis_voice_enabled";
const VOLUME_KEY = "uppis_voice_volume";

let context: AudioContext | null = null;
let master: GainNode | null = null;
let chime: GainNode | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let liveNodes: OscillatorNode[] = [];
const buffers = new Map<Clip, AudioBuffer>();
let loading: Promise<void> | null = null;
let repeatTimer: number | null = null;
let waitResolve: (() => void) | null = null;
let generation = 0;

export function voiceEnabled(): boolean {
  try {
    return localStorage.getItem(ENABLED_KEY) !== "0";
  } catch {
    return true;
  }
}

export function voiceVolume(): number {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    if (raw == null) return 70;
    const value = Number(raw);
    if (!Number.isFinite(value)) return 70;
    return Math.min(100, Math.max(0, Math.round(value)));
  } catch {
    return 70;
  }
}

export function setVoiceEnabled(on: boolean) {
  try {
    localStorage.setItem(ENABLED_KEY, on ? "1" : "0");
  } catch {
    // Private mode can block storage. The button still changes this tab.
  }
  applyMaster();
}

export function setVoiceVolume(percent: number) {
  const next = Math.min(100, Math.max(0, Math.round(percent)));
  try {
    localStorage.setItem(VOLUME_KEY, String(next));
  } catch {
    // Ignore storage failures. The slider still updates the live gain.
  }
  applyMaster();
}

export function unlockAudio() {
  try {
    const ctx = ensureContext();
    void ctx.resume();
  } catch {
    // Autoplay policies vary. A missing context must not break the call button.
  }
}

export function preload(): Promise<void> {
  if (loading) return loading;
  loading = (async () => {
    try {
      const ctx = ensureContext();
      await Promise.all(
        CLIPS.map(async (clip) => {
          if (buffers.has(clip)) return;
          const response = await fetch(`/audio/${clip}.wav`);
          if (!response.ok) return;
          const bytes = await response.arrayBuffer();
          const audio = await ctx.decodeAudioData(bytes.slice(0));
          buffers.set(clip, audio);
        }),
      );
    } catch {
      loading = null;
    }
  })();
  return loading;
}

export function say(clip: Clip) {
  try {
    cancelRepeat();
    const token = generation;
    void playOnce(clip, token);
  } catch {
    // Sound is optional.
  }
}

export function sayRepeated(clip: Clip, times = 2, gapMs = 4000) {
  try {
    cancelRepeat();
    const token = generation;
    void repeatClip(clip, times, gapMs, token);
  } catch {
    // Sound is optional.
  }
}

async function repeatClip(clip: Clip, times: number, gapMs: number, token: number) {
  for (let played = 0; played < times; played += 1) {
    if (token !== generation) return;
    await playOnce(clip, token);
    if (token !== generation || played + 1 >= times) return;
    await wait(clipLengthMs(clip) + gapMs);
  }
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    waitResolve = resolve;
    repeatTimer = window.setTimeout(() => {
      repeatTimer = null;
      waitResolve = null;
      resolve();
    }, ms);
  });
}

function cancelRepeat() {
  generation += 1;
  if (repeatTimer != null) {
    window.clearTimeout(repeatTimer);
    repeatTimer = null;
  }
  const resolve = waitResolve;
  waitResolve = null;
  resolve?.();
  stopPlayback();
}

async function playOnce(clip: Clip, token: number) {
  try {
    stopPlayback();
    const ctx = ensureContext();
    void ctx.resume();
    if (!buffers.has(clip)) await preload();
    if (token !== generation || !master) return;
    const buffer = buffers.get(clip);
    const clipAt = playChime(ctx, ctx.currentTime);
    if (token !== generation || !buffer) return;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(master);
    source.start(clipAt);
    currentSource = source;
    source.onended = () => {
      if (currentSource === source) currentSource = null;
    };
  } catch {
    // A failed clip must not break the screen.
  }
}

function playChime(ctx: AudioContext, when: number) {
  if (!chime) return when;
  [660, 880].forEach((frequency, index) => {
    const start = when + index * 0.15;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(1, start + 0.02);
    envelope.gain.setValueAtTime(1, start + 0.13);
    envelope.gain.linearRampToValueAtTime(0, start + 0.15);
    oscillator.connect(envelope);
    envelope.connect(chime as GainNode);
    oscillator.start(start);
    oscillator.stop(start + 0.16);
    liveNodes.push(oscillator);
  });
  return when + 0.3;
}

function stopPlayback() {
  try {
    currentSource?.stop();
  } catch {
    // The source may already have ended.
  }
  currentSource = null;
  for (const node of liveNodes) {
    try {
      node.stop();
    } catch {
      // Already stopped.
    }
  }
  liveNodes = [];
}

function clipLengthMs(clip: Clip) {
  const buffer = buffers.get(clip);
  return 300 + (buffer ? buffer.duration * 1000 : 8000);
}

function ensureContext() {
  if (context && master && chime) return context;
  context = new AudioContext();
  master = context.createGain();
  master.connect(context.destination);
  chime = context.createGain();
  chime.gain.value = 0.15;
  chime.connect(master);
  applyMaster();
  return context;
}

function applyMaster() {
  if (!master) return;
  try {
    master.gain.value = voiceEnabled() ? voiceVolume() / 100 : 0;
  } catch {
    // Ignore a closed audio context.
  }
}
