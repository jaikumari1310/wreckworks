// WreckWorks SFX — bundled short WAVs via expo-audio.
// Lazy, resilient init (safer on native Expo Go); looping ambient bed with
// ducking; persisted mute toggle exposed to the UI via subscribe().

import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type SfxName = 'fire' | 'impact' | 'break' | 'collapse' | 'combo' | 'star' | 'click';

const SOURCES: Record<SfxName, any> = {
  fire: require('../../assets/sfx/fire.wav'),
  impact: require('../../assets/sfx/impact.wav'),
  break: require('../../assets/sfx/break.wav'),
  collapse: require('../../assets/sfx/collapse.wav'),
  combo: require('../../assets/sfx/combo.wav'),
  star: require('../../assets/sfx/star.wav'),
  click: require('../../assets/sfx/click.wav'),
};
const AMBIENT_SOURCE = require('../../assets/sfx/ambient.wav');

const POOL_SIZE: Record<SfxName, number> = {
  fire: 2, impact: 4, break: 3, collapse: 2, combo: 1, star: 1, click: 2,
};
const VOLUME: Record<SfxName, number> = {
  fire: 0.9, impact: 0.65, break: 0.7, collapse: 0.85, combo: 0.8, star: 0.9, click: 0.6,
};

const AMBIENT_VOLUME = 0.35;
const AMBIENT_DUCKED = 0.08;
const STORAGE_KEY = 'wreckworks.sound.enabled';

interface Pool { players: AudioPlayer[]; idx: number; }

const pools: Partial<Record<SfxName, Pool>> = {};
let ambient: AudioPlayer | null = null;
let ambientActive = false;
let audioModeSet = false;
let enabled = true;
const lastPlayed: Record<string, number> = {};
let duckTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<(v: boolean) => void>();

// Load persisted preference once (best-effort).
(async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw != null) enabled = raw === '1';
  } catch {}
  notify();
})();

function notify() { listeners.forEach(l => l(enabled)); }

function ensureAudioMode() {
  if (audioModeSet) return;
  audioModeSet = true;
  setAudioModeAsync({
    playsInSilentMode: true,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
  }).catch(() => {});
}

// Lazily build a pool for a sound the first time it is used.
function getPool(name: SfxName): Pool | null {
  if (pools[name]) return pools[name]!;
  ensureAudioMode();
  try {
    const players: AudioPlayer[] = [];
    for (let i = 0; i < POOL_SIZE[name]; i++) {
      const p = createAudioPlayer(SOURCES[name]);
      try { p.volume = VOLUME[name]; } catch {}
      players.push(p);
    }
    pools[name] = { players, idx: 0 };
    return pools[name]!;
  } catch {
    return null;
  }
}

function getAmbient(): AudioPlayer | null {
  if (ambient) return ambient;
  ensureAudioMode();
  try {
    ambient = createAudioPlayer(AMBIENT_SOURCE);
    ambient.loop = true;
    ambient.volume = AMBIENT_VOLUME;
  } catch {
    ambient = null;
  }
  return ambient;
}

export const sfx = {
  play(name: SfxName) {
    if (!enabled) return;
    const now = Date.now();
    if (now - (lastPlayed[name] || 0) < 25) return;
    lastPlayed[name] = now;
    const pool = getPool(name);
    if (!pool) return;
    try {
      const p = pool.players[pool.idx];
      pool.idx = (pool.idx + 1) % pool.players.length;
      try { p.seekTo(0); } catch {}
      p.play();
    } catch {}
  },

  // Collapse + briefly duck the ambient bed underneath it.
  collapse() {
    this.play('collapse');
    this.duckAmbient(1100);
  },

  startAmbient() {
    ambientActive = true;
    if (!enabled) return;
    const a = getAmbient();
    if (!a) return;
    try { a.volume = AMBIENT_VOLUME; a.play(); } catch {}
  },

  stopAmbient() {
    ambientActive = false;
    if (!ambient) return;
    try { ambient.pause(); ambient.seekTo(0); } catch {}
  },

  duckAmbient(ms = 900) {
    if (!enabled || !ambient || !ambientActive) return;
    try {
      ambient.volume = AMBIENT_DUCKED;
      if (duckTimer) clearTimeout(duckTimer);
      duckTimer = setTimeout(() => {
        try { if (ambient && ambientActive) ambient.volume = AMBIENT_VOLUME; } catch {}
      }, ms);
    } catch {}
  },

  async setEnabled(v: boolean) {
    enabled = v;
    try { await AsyncStorage.setItem(STORAGE_KEY, v ? '1' : '0'); } catch {}
    if (!v) {
      try { ambient?.pause(); } catch {}
    } else if (ambientActive) {
      const a = getAmbient();
      try { if (a) { a.volume = AMBIENT_VOLUME; a.play(); } } catch {}
    }
    notify();
  },

  toggle() { return this.setEnabled(!enabled); },
  isEnabled() { return enabled; },
  subscribe(fn: (v: boolean) => void) {
    listeners.add(fn);
    fn(enabled);
    return () => listeners.delete(fn);
  },
};
