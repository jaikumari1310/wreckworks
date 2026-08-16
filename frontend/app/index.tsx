import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ImageBackground } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/game/theme';
import { loadProgress, Progress } from '@/src/game/progress';
import { WORLDS, WorldDef } from '@/src/game/levels';
import { sfx } from '@/src/game/sfx';
import { useSound } from '@/src/game/useSound';

export default function MainMenu() {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);
  const [selectedWorldIdx, setSelectedWorldIdx] = useState(0);
  const { enabled: soundOn, toggle: toggleSound } = useSound();

  useFocusEffect(useCallback(() => {
    loadProgress().then(setProgress);
  }, []));

  const activeWorld: WorldDef = WORLDS[selectedWorldIdx] || WORLDS[0];
  const maxUnlocked = progress?.maxUnlocked ?? 1;

  // Level counts for current world
  const worldLevels = activeWorld.levels;
  const worldCompleted = progress
    ? worldLevels.filter(l => (progress.levels[l.id]?.stars ?? 0) > 0).length
    : 0;

  const isWorldUnlocked = activeWorld.id === 1 || maxUnlocked >= 11 || true; // testable in dev

  const nextWorld = () => {
    sfx.play('click');
    setSelectedWorldIdx((selectedWorldIdx + 1) % WORLDS.length);
  };

  const prevWorld = () => {
    sfx.play('click');
    setSelectedWorldIdx((selectedWorldIdx - 1 + WORLDS.length) % WORLDS.length);
  };

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1664983208786-d2c5920783b1?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzd8MHwxfHNlYXJjaHwyfHxjbGVhciUyMHNreSUyMGNsb3VkcyUyMGNhcnRvb24lMjBiYWNrZ3JvdW5kfGVufDB8fHx8MTc4NjgwNjMyMHww&ixlib=rb-4.1.0&q=85' }}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.overlay} />

      {/* Sound toggle (top-right) */}
      <Pressable
        testID="sound-toggle-menu"
        onPress={() => { sfx.play('click'); toggleSound(); }}
        style={({ pressed }) => [styles.soundBtn, pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 2 }]}
      >
        <Ionicons name={soundOn ? 'volume-high' : 'volume-mute'} size={20} color="#FFFFFF" />
      </Pressable>

      {/* Warning stripe strip */}
      <View style={styles.stripeStrip}>
        {Array.from({ length: 40 }).map((_, i) => (
          <View key={i} style={[styles.stripe, { backgroundColor: i % 2 === 0 ? '#111827' : theme.color.brandSecondary }]} />
        ))}
      </View>

      <View style={styles.content} testID="main-menu">
        {/* LEFT: Title */}
        <View style={styles.left}>
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Ionicons name="hammer" size={14} color={theme.color.onBrandSecondary || '#452900'} />
              <Text style={styles.badgeText}>{activeWorld.badgeLabel}</Text>
            </View>
          </View>
          <Text style={styles.title} testID="game-title">WRECK{"\n"}WORKS</Text>
          <Text style={styles.tagline}>One shot. Total destruction.</Text>

          <Pressable
            testID="play-button"
            onPress={() => {
              sfx.play('click');
              router.push({ pathname: '/levels', params: { worldId: String(activeWorld.id) } });
            }}
            style={({ pressed }) => [styles.playBtn, pressed && styles.playBtnPressed]}
          >
            <Ionicons name="play" size={26} color="#FFFFFF" />
            <Text style={styles.playBtnText}>PLAY</Text>
          </Pressable>
        </View>

        {/* RIGHT: World Selector Card */}
        <View style={styles.right}>
          <View style={styles.worldSelectorRow}>
            <Pressable onPress={prevWorld} style={styles.arrowBtn} testID="prev-world-btn">
              <Ionicons name="chevron-back" size={20} color="#FFFFFF" />
            </Pressable>

            <Pressable
              onPress={() => {
                sfx.play('click');
                router.push({ pathname: '/levels', params: { worldId: String(activeWorld.id) } });
              }}
              style={({ pressed }) => [
                styles.worldCard,
                activeWorld.id === 2 && styles.worldCardPirate,
                pressed && { transform: [{ translateY: 2 }], borderBottomWidth: 4 },
              ]}
              testID={`world-${activeWorld.id}-card`}
            >
              <View style={styles.worldHeader}>
                <View style={[styles.worldNum, activeWorld.id === 2 && { backgroundColor: '#0284c7' }]}>
                  <Text style={styles.worldNumText}>{activeWorld.id}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.worldLabel}>{activeWorld.subtitle.toUpperCase()}</Text>
                  <Text style={styles.worldName} numberOfLines={1}>{activeWorld.name.toUpperCase()}</Text>
                </View>
                {!isWorldUnlocked && (
                  <Ionicons name="lock-closed" size={20} color="#9CA3AF" />
                )}
              </View>

              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFg, { width: `${(worldCompleted / worldLevels.length) * 100}%` }]} />
              </View>

              <View style={styles.worldFooter}>
                <Text style={styles.progressText}>
                  {worldCompleted} / {worldLevels.length} {worldLevels.length === 1 ? 'LEVEL' : 'LEVELS'} COMPLETE
                </Text>
                <Ionicons name="star" size={16} color={theme.color.star} />
              </View>
            </Pressable>

            <Pressable onPress={nextWorld} style={styles.arrowBtn} testID="next-world-btn">
              <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: theme.color.sky },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(126, 200, 240, 0.35)' },
  soundBtn: {
    position: 'absolute', top: 16, right: 20, zIndex: 10,
    width: 44, height: 44, borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.85)', alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 4, borderColor: '#000',
  },
  stripeStrip: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 18, flexDirection: 'row' },
  stripe: { flex: 1, transform: [{ skewX: '-30deg' }] },
  content: { flex: 1, flexDirection: 'row', paddingHorizontal: 32, paddingVertical: 24, alignItems: 'center' },
  left: { flex: 1.2, justifyContent: 'center' },
  right: { flex: 1.1, alignItems: 'flex-end', justifyContent: 'center' },
  badgeRow: { flexDirection: 'row', marginBottom: 12 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.color.brandSecondary,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999,
    borderBottomWidth: 3, borderColor: '#B88900',
  },
  badgeText: { fontWeight: '900', fontSize: 11, color: '#452900', letterSpacing: 1 },
  title: {
    fontSize: 76, fontWeight: '900', color: '#111827', lineHeight: 76, letterSpacing: -2,
    textShadowColor: 'rgba(255, 90, 0, 0.25)', textShadowOffset: { width: 0, height: 6 }, textShadowRadius: 0,
  },
  tagline: { marginTop: 8, fontSize: 16, fontWeight: '700', color: '#374151', letterSpacing: 0.5 },
  playBtn: {
    marginTop: 24, alignSelf: 'flex-start',
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.color.brand,
    paddingHorizontal: 34, paddingVertical: 16,
    borderRadius: 999,
    borderBottomWidth: 6, borderColor: theme.color.brandDark,
    minWidth: 220, justifyContent: 'center',
  },
  playBtnPressed: { transform: [{ translateY: 3 }], borderBottomWidth: 3 },
  playBtnText: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', letterSpacing: 2 },
  worldSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  arrowBtn: {
    width: 36, height: 36, borderRadius: 999,
    backgroundColor: 'rgba(17,24,39,0.85)',
    alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 3, borderColor: '#000',
  },
  worldCard: {
    width: 290,
    backgroundColor: theme.color.brandSecondary,
    borderRadius: 20, padding: 16,
    borderBottomWidth: 6, borderColor: '#B88900',
  },
  worldCardPirate: {
    backgroundColor: '#38bdf8',
    borderColor: '#0284c7',
  },
  worldHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  worldNum: {
    width: 42, height: 42, borderRadius: 12,
    backgroundColor: '#111827', alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 3, borderColor: '#000',
  },
  worldNumText: { color: '#FFFFFF', fontWeight: '900', fontSize: 20 },
  worldLabel: { color: '#5A3B00', fontSize: 11, fontWeight: '800', letterSpacing: 1.2 },
  worldName: { color: '#111827', fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
  progressBarBg: { height: 10, backgroundColor: 'rgba(0,0,0,0.15)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 },
  progressBarFg: { height: '100%', backgroundColor: theme.color.brand, borderRadius: 999 },
  worldFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  progressText: { color: '#452900', fontSize: 12, fontWeight: '900', letterSpacing: 0.8 },
});
