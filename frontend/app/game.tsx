import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { theme } from '@/src/game/theme';
import { LEVELS } from '@/src/game/levels';
import { GameScene } from '@/src/game/GameScene';
import { completeLevel, loadProgress, getLevelRecord } from '@/src/game/progress';
import { sfx } from '@/src/game/sfx';
import { useSound } from '@/src/game/useSound';

interface Result {
  score: number;
  shotsUsed: number;
  destroyed: number;
  totalTargets: number;
  cleared: boolean;
  stars: number;
  bestScore: number;
}

export default function GameScreen() {
  const params = useLocalSearchParams<{ levelId?: string }>();
  const router = useRouter();
  const initialId = Math.max(1, Math.min(LEVELS.length, parseInt((params.levelId as string) || '1', 10)));
  const [levelId, setLevelId] = useState<number>(initialId);
  const level = useMemo(() => LEVELS.find(l => l.id === levelId) || LEVELS[0], [levelId]);

  const [score, setScore] = useState(0);
  const [shots, setShots] = useState(0);
  const [paused, setPaused] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [hintVisible, setHintVisible] = useState(levelId === 1);
  const [levelKey, setLevelKey] = useState(0); // remount to reset scene
  const { enabled: soundOn, toggle: toggleSound } = useSound();

  const finalizeResult = useCallback(async (data: { score: number; shotsUsed: number; destroyed: number; totalTargets: number }, cleared: boolean) => {
    // Compute stars
    let stars = 0;
    if (cleared) {
      const t = level.starThresholds;
      if (data.shotsUsed <= t.three) stars = 3;
      else if (data.shotsUsed <= t.two) stars = 2;
      else stars = 1;
    }
    let bestScore = 0;
    if (cleared) {
      const p = await completeLevel(level.id, stars, data.score, data.shotsUsed);
      bestScore = getLevelRecord(p, level.id).bestScore;
    } else {
      const p = await loadProgress();
      bestScore = getLevelRecord(p, level.id).bestScore;
    }
    setResult({ ...data, cleared, stars, bestScore });
    if (cleared) {
      sfx.play('star');
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    } else {
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch {}
    }
  }, [level]);

  const events = useMemo(() => ({
    onScoreChange: (s: number) => setScore(s),
    onShotFired: (n: number) => {
      setShots(n);
      setHintVisible(false);
      try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch {}
    },
    onLevelComplete: (r: any) => finalizeResult(r, true),
    onFail: (r: any) => finalizeResult(r, false),
  }), [finalizeResult]);

  const restart = () => {
    sfx.play('click');
    setResult(null);
    setScore(0);
    setShots(0);
    setLevelKey(k => k + 1);
    setHintVisible(levelId === 1);
  };

  const goNext = () => {
    sfx.play('click');
    if (levelId >= LEVELS.length) {
      router.replace('/levels');
      return;
    }
    setLevelId(levelId + 1);
    setResult(null);
    setScore(0);
    setShots(0);
    setLevelKey(k => k + 1);
    setHintVisible(false);
  };

  return (
    <View style={styles.root} testID="game-screen">
      <GameScene key={levelKey} level={level} events={events} paused={paused || !!result} />

      {/* HUD */}
      <View style={styles.hudTop} pointerEvents="box-none">
        <View style={styles.hudLeft}>
          <Pressable
            testID="pause-button"
            onPress={() => { sfx.play('click'); setPaused(p => !p); }}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
          >
            <Ionicons name={paused ? 'play' : 'pause'} size={18} color="#FFFFFF" />
          </Pressable>
          <View style={styles.levelPill}>
            <Text style={styles.levelPillLabel}>LVL</Text>
            <Text style={styles.levelPillNum}>{level.id}</Text>
          </View>
        </View>

        <View style={styles.hudCenter}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue} testID="score-value">{score.toLocaleString()}</Text>
        </View>

        <View style={styles.hudRight}>
          <View style={styles.shotsBox}>
            <Text style={styles.shotsLabel}>SHOTS</Text>
            <View style={styles.shotsRow}>
              {Array.from({ length: level.shots }).map((_, i) => (
                <View
                  key={i}
                  style={[styles.shotDot, i < level.shots - shots ? styles.shotDotFull : styles.shotDotEmpty]}
                />
              ))}
            </View>
          </View>
        </View>
      </View>

      {/* Hint */}
      {hintVisible && (
        <View style={styles.hint} pointerEvents="none">
          <Ionicons name="hand-left" size={26} color="#FFFFFF" />
          <Text style={styles.hintText}>DRAG TO AIM   •   RELEASE TO FIRE</Text>
        </View>
      )}

      {/* Pause overlay */}
      {paused && !result && (
        <View style={styles.overlay} testID="pause-overlay">
          <View style={styles.pauseCard}>
            <Text style={styles.pauseTitle}>PAUSED</Text>
            <Pressable
              testID="sound-toggle-pause"
              onPress={() => { sfx.play('click'); toggleSound(); }}
              style={({ pressed }) => [styles.pauseSoundRow, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name={soundOn ? 'volume-high' : 'volume-mute'} size={20} color="#111827" />
              <Text style={styles.pauseSoundText}>SOUND: {soundOn ? 'ON' : 'OFF'}</Text>
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable style={[styles.overlayBtn, styles.overlayBtnSecondary]} onPress={() => setPaused(false)} testID="resume-button">
                <Ionicons name="play" size={18} color="#FFFFFF" />
                <Text style={styles.overlayBtnText}>RESUME</Text>
              </Pressable>
              <Pressable style={[styles.overlayBtn, styles.overlayBtnTertiary]} onPress={restart} testID="restart-button">
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.overlayBtnText}>RETRY</Text>
              </Pressable>
              <Pressable style={[styles.overlayBtn, styles.overlayBtnDanger]} onPress={() => router.replace('/levels')} testID="quit-button">
                <Ionicons name="exit" size={18} color="#FFFFFF" />
                <Text style={styles.overlayBtnText}>QUIT</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* Result overlay */}
      {result && (
        <View style={styles.overlay} testID="result-overlay">
          <View style={styles.resultCard}>
            <Text style={[styles.resultTitle, !result.cleared && { color: theme.color.error }]}>
              {result.cleared ? 'LEVEL COMPLETE' : 'LEVEL FAILED'}
            </Text>
            <View style={styles.starsBig}>
              {[1, 2, 3].map(i => (
                <Ionicons
                  key={i}
                  name="star"
                  size={44}
                  color={result.stars >= i ? theme.color.star : 'rgba(0,0,0,0.15)'}
                  style={i === 2 ? { transform: [{ translateY: -8 }] } : undefined}
                />
              ))}
            </View>
            <View style={styles.statsRow}>
              <Stat label="SCORE" value={result.score.toLocaleString()} />
              <Stat label="DESTROYED" value={`${result.destroyed}/${result.totalTargets}`} />
              <Stat label="SHOTS" value={`${result.shotsUsed}/${level.shots}`} />
              <Stat label="BEST" value={result.bestScore.toLocaleString()} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 6 }}>
              <Pressable style={[styles.overlayBtn, styles.overlayBtnTertiary]} onPress={restart} testID="retry-button">
                <Ionicons name="refresh" size={18} color="#FFFFFF" />
                <Text style={styles.overlayBtnText}>RETRY</Text>
              </Pressable>
              {result.cleared ? (
                <Pressable style={[styles.overlayBtn, styles.overlayBtnPrimary]} onPress={goNext} testID="next-button">
                  <Text style={styles.overlayBtnText}>NEXT</Text>
                  <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
                </Pressable>
              ) : (
                <Pressable style={[styles.overlayBtn, styles.overlayBtnPrimary]} onPress={() => router.replace('/levels')} testID="menu-button">
                  <Ionicons name="list" size={18} color="#FFFFFF" />
                  <Text style={styles.overlayBtnText}>LEVELS</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.color.sky },
  hudTop: {
    position: 'absolute', top: 12, left: 12, right: 12,
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  hudLeft: { flexDirection: 'row', gap: 8, flex: 1 },
  hudCenter: { alignItems: 'center' },
  hudRight: { flex: 1, alignItems: 'flex-end' },
  iconBtn: {
    width: 40, height: 40, borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.85)', alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 3, borderColor: '#000',
  },
  iconBtnPressed: { transform: [{ translateY: 2 }], borderBottomWidth: 1 },
  levelPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(17,24,39,0.85)', paddingHorizontal: 12, height: 40, borderRadius: 999,
    borderBottomWidth: 3, borderColor: '#000',
  },
  levelPillLabel: { color: theme.color.brandSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  levelPillNum: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  scoreLabel: { color: '#111827', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, backgroundColor: theme.color.brandSecondary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  scoreValue: { fontSize: 26, fontWeight: '900', color: '#111827', textShadowColor: 'rgba(255,255,255,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  shotsBox: {
    backgroundColor: 'rgba(17,24,39,0.85)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16,
    borderBottomWidth: 3, borderColor: '#000', alignItems: 'flex-end',
  },
  shotsLabel: { color: theme.color.brandSecondary, fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  shotsRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  shotDot: { width: 12, height: 12, borderRadius: 6 },
  shotDotFull: { backgroundColor: theme.color.brand },
  shotDotEmpty: { backgroundColor: 'rgba(255,255,255,0.2)' },
  hint: {
    position: 'absolute', bottom: 24, left: 0, right: 0,
    alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    marginHorizontal: 40,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.85)',
    borderBottomWidth: 3, borderColor: '#000',
  },
  hintText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.75)', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  },
  pauseCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center', gap: 16,
    borderBottomWidth: 6, borderColor: '#111827',
  },
  pauseTitle: { fontSize: 28, fontWeight: '900', color: '#111827', letterSpacing: 2 },
  pauseSoundRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F3F4F6', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999,
  },
  pauseSoundText: { color: '#111827', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  resultCard: {
    backgroundColor: '#FFFFFF', borderRadius: 22, padding: 20, alignItems: 'center', gap: 14,
    borderBottomWidth: 6, borderColor: '#111827', minWidth: 460,
  },
  resultTitle: { fontSize: 26, fontWeight: '900', color: theme.color.brand, letterSpacing: 2 },
  starsBig: { flexDirection: 'row', gap: 14, alignItems: 'center', justifyContent: 'center', height: 56 },
  statsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  statBox: { alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, minWidth: 88 },
  statLabel: { color: '#6B7280', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  statValue: { color: '#111827', fontSize: 18, fontWeight: '900' },
  overlayBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 22, paddingVertical: 12, borderRadius: 999,
    borderBottomWidth: 5,
  },
  overlayBtnPrimary: { backgroundColor: theme.color.brand, borderColor: theme.color.brandDark },
  overlayBtnSecondary: { backgroundColor: theme.color.brandTertiary, borderColor: theme.color.brandTertiaryDark },
  overlayBtnTertiary: { backgroundColor: '#374151', borderColor: '#111827' },
  overlayBtnDanger: { backgroundColor: theme.color.error, borderColor: '#991B1B' },
  overlayBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});
