import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'wreckworks.progress.v1';

export interface LevelRecord {
  stars: number; // 0..3 (0 = not completed)
  bestScore: number;
  bestShots: number; // fewest shots used to clear (0 if never)
}

export interface Progress {
  levels: Record<number, LevelRecord>;
  maxUnlocked: number; // 1..10
}

const DEFAULT: Progress = { levels: {}, maxUnlocked: 1 };

let cache: Progress | null = null;

export async function loadProgress(): Promise<Progress> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Progress;
      cache = { ...DEFAULT, ...parsed };
    } else {
      cache = { ...DEFAULT };
    }
  } catch (e) {
    cache = { ...DEFAULT };
  }
  return cache;
}

export async function saveProgress(p: Progress): Promise<void> {
  cache = p;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(p));
  } catch {}
}

export function getLevelRecord(p: Progress, id: number): LevelRecord {
  return p.levels[id] || { stars: 0, bestScore: 0, bestShots: 0 };
}

export async function completeLevel(id: number, stars: number, score: number, shotsUsed: number): Promise<Progress> {
  const p = await loadProgress();
  const cur = getLevelRecord(p, id);
  const next: LevelRecord = {
    stars: Math.max(cur.stars, stars),
    bestScore: Math.max(cur.bestScore, score),
    bestShots: cur.bestShots === 0 ? shotsUsed : Math.min(cur.bestShots, shotsUsed),
  };
  const newP: Progress = {
    ...p,
    levels: { ...p.levels, [id]: next },
    maxUnlocked: Math.max(p.maxUnlocked, Math.min(10, id + 1)),
  };
  await saveProgress(newP);
  return newP;
}

export async function resetProgress(): Promise<Progress> {
  cache = { ...DEFAULT };
  try { await AsyncStorage.removeItem(KEY); } catch {}
  return cache;
}
