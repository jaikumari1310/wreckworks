// WreckWorks SFX — bundled short WAVs via expo-audio.
// Uses a small pool per sound so rapid-fire triggers don't get cut off.

import { createAudioPlayer, setAudioModeAsync, AudioPlayer } from 'expo-audio';

export type SfxName = 'fire' | 'impact' | 'break' | 'collapse' | 'star' | 'click';

const SOURCES: Record<SfxName, any> = {
  fire: require('../../assets/sfx/fire.wav'),
  impact: require('../../assets/sfx/impact.wav'),
  break: require('../../assets/sfx/break.wav'),
  collapse: require('../../assets/sfx/collapse.wav'),
  star: require('../../assets/sfx/star.wav'),
  click: require('../../assets/sfx/click.wav'),
};

const POOL_SIZE: Record<SfxName, number> = {
  fire: 2, impact: 4, break: 3, collapse: 2, star: 1, click: 2,
};

const VOLUME: Record<SfxName, number> = {
  fire: 0.9, impact: 0.65, break: 0.7, collapse: 0.85, star: 0.9, click: 0.6,
};

interface Pool {
  players: AudioPlayer[];
  idx: number;
}

let pools: Partial<Record<SfxName, Pool>> = {};
let initialized = false;
let enabled = true;
let lastPlayed: Record<string, number> = {};

async function init() {
  if (initialized) return;
  initialized = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    });
  } catch {}

  (Object.keys(SOURCES) as SfxName[]).forEach((name) => {
    try {
      const players: AudioPlayer[] = [];
      for (let i = 0; i < POOL_SIZE[name]; i++) {
        const p = createAudioPlayer(SOURCES[name]);
        try { p.volume = VOLUME[name]; } catch {}
        players.push(p);
      }
      pools[name] = { players, idx: 0 };
    } catch (e) {
      // silently ignore load failures — game must remain playable
    }
  });
}

// fire-and-forget init
init();

export const sfx = {
  play(name: SfxName) {
    if (!enabled) return;
    // debounce to avoid spamming same sound within a few ms
    const now = Date.now();
    if (now - (lastPlayed[name] || 0) < 25) return;
    lastPlayed[name] = now;
    const pool = pools[name];
    if (!pool) return;
    try {
      const p = pool.players[pool.idx];
      pool.idx = (pool.idx + 1) % pool.players.length;
      p.seekTo(0);
      p.play();
    } catch {}
  },
  setEnabled(v: boolean) { enabled = v; },
  isEnabled() { return enabled; },
};
