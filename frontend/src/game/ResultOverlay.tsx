import React, { useEffect, useRef, useState } from 'react';
import { Animated, View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from './theme';
import { sfx } from './sfx';

export interface ResultData {
  score: number;
  shotsUsed: number;
  destroyed: number;
  totalTargets: number;
  cleared: boolean;
  stars: number;
  bestScore: number;
  isNewBest: boolean;
}

// Fast, celebratory result sequence: card pops, score counts up,
// stars appear one by one, NEW BEST badge, dominant NEXT button.
export function ResultOverlay({
  result,
  levelShots,
  isLastLevel,
  onRetry,
  onNext,
  onMenu,
}: {
  result: ResultData;
  levelShots: number;
  isLastLevel: boolean;
  onRetry: () => void;
  onNext: () => void;
  onMenu: () => void;
}) {
  const cardScale = useRef(new Animated.Value(0.7)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const starScale = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;
  const bestBadge = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // 1) Card pop-in
    Animated.parallel([
      Animated.spring(cardScale, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();

    // 2) Count score up (~600ms)
    const target = result.score;
    const duration = 600;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayScore(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    let raf = requestAnimationFrame(tick);

    // 3) Stars pop one-by-one after a short beat
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (result.cleared) {
      for (let i = 0; i < result.stars; i++) {
        timers.push(setTimeout(() => {
          sfx.play('click');
          Animated.spring(starScale[i], { toValue: 1, friction: 4, tension: 160, useNativeDriver: true }).start();
        }, 350 + i * 260));
      }
      // 4) NEW BEST badge
      if (result.isNewBest) {
        timers.push(setTimeout(() => {
          Animated.spring(bestBadge, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }).start();
        }, 350 + result.stars * 260 + 150));
      }
    }

    return () => { cancelAnimationFrame(raf); timers.forEach(clearTimeout); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.overlay} testID="result-overlay">
      <Animated.View style={[styles.card, { opacity: cardOpacity, transform: [{ scale: cardScale }] }]}>
        <View style={[styles.titleWrap, { backgroundColor: result.cleared ? theme.color.brand : theme.color.error }]}>
          <Ionicons name={result.cleared ? 'trophy' : 'close-circle'} size={20} color="#FFFFFF" />
          <Text style={styles.title}>{result.cleared ? 'LEVEL COMPLETE' : 'LEVEL FAILED'}</Text>
        </View>

        {/* Stars */}
        <View style={styles.starsBig}>
          {[0, 1, 2].map(i => (
            <Animated.View key={i} style={{ transform: [{ scale: result.cleared ? starScale[i] : 0 }, { translateY: i === 1 ? -10 : 0 }] }}>
              <Ionicons name="star" size={46} color={theme.color.star} />
            </Animated.View>
          ))}
          {/* faded placeholders behind */}
          <View style={styles.starGhostRow} pointerEvents="none">
            {[0, 1, 2].map(i => (
              <Ionicons key={i} name="star" size={46} color="rgba(0,0,0,0.10)" style={{ transform: [{ translateY: i === 1 ? -10 : 0 }] }} />
            ))}
          </View>
        </View>

        {/* Score (counts up) */}
        <View style={styles.scoreWrap}>
          <Text style={styles.scoreLabel}>SCORE</Text>
          <Text style={styles.scoreValue} testID="result-score">{displayScore.toLocaleString()}</Text>
          <Animated.View
            style={[styles.bestBadge, { opacity: bestBadge, transform: [{ scale: bestBadge }] }]}
            pointerEvents="none"
          >
            <Ionicons name="ribbon" size={12} color="#452900" />
            <Text style={styles.bestBadgeText}>NEW BEST!</Text>
          </Animated.View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <Stat label="DESTROYED" value={`${result.destroyed}/${result.totalTargets}`} />
          <Stat label="SHOTS" value={`${result.shotsUsed}/${levelShots}`} />
          <Stat label="BEST" value={result.bestScore.toLocaleString()} />
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <Pressable style={[styles.btn, styles.btnGhost]} onPress={onRetry} testID="retry-button">
            <Ionicons name="refresh" size={18} color="#FFFFFF" />
            <Text style={styles.btnText}>RETRY</Text>
          </Pressable>
          {result.cleared ? (
            <Pressable style={[styles.btn, styles.btnPrimary, styles.btnDominant]} onPress={onNext} testID="next-button">
              <Text style={styles.btnTextBig}>{isLastLevel ? 'FINISH' : 'NEXT LEVEL'}</Text>
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </Pressable>
          ) : (
            <Pressable style={[styles.btn, styles.btnPrimary, styles.btnDominant]} onPress={onMenu} testID="menu-button">
              <Ionicons name="list" size={18} color="#FFFFFF" />
              <Text style={styles.btnTextBig}>LEVELS</Text>
            </Pressable>
          )}
        </View>
      </Animated.View>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17,24,39,0.78)', alignItems: 'center', justifyContent: 'center', padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 24, paddingBottom: 18, alignItems: 'center',
    borderBottomWidth: 6, borderColor: '#111827', minWidth: 460, overflow: 'hidden',
  },
  titleWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    alignSelf: 'stretch', paddingVertical: 12,
  },
  title: { fontSize: 22, fontWeight: '900', color: '#FFFFFF', letterSpacing: 1.5 },
  starsBig: { flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'center', height: 64, marginTop: 14 },
  starGhostRow: { position: 'absolute', flexDirection: 'row', gap: 16, alignItems: 'center', justifyContent: 'center', zIndex: -1 },
  scoreWrap: { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  scoreLabel: { color: '#6B7280', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  scoreValue: { color: '#111827', fontSize: 40, fontWeight: '900', letterSpacing: 0.5 },
  bestBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4,
    backgroundColor: theme.color.brandSecondary, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999,
  },
  bestBadgeText: { color: '#452900', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  statsRow: { flexDirection: 'row', gap: 10, justifyContent: 'center', marginBottom: 14 },
  statBox: { alignItems: 'center', backgroundColor: '#F3F4F6', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12, minWidth: 96 },
  statLabel: { color: '#6B7280', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  statValue: { color: '#111827', fontSize: 18, fontWeight: '900' },
  btnRow: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingHorizontal: 18 },
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 13, borderRadius: 999, borderBottomWidth: 5,
  },
  btnGhost: { backgroundColor: '#374151', borderColor: '#111827' },
  btnPrimary: { backgroundColor: theme.color.brand, borderColor: theme.color.brandDark },
  btnDominant: { paddingHorizontal: 30, paddingVertical: 15, transform: [{ scale: 1.04 }] },
  btnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  btnTextBig: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
});
