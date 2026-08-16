import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/game/theme';
import { loadProgress, Progress, getLevelRecord } from '@/src/game/progress';
import { WORLDS, getWorldById, LevelDef } from '@/src/game/levels';
import { sfx } from '@/src/game/sfx';

export default function LevelSelect() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ worldId?: string }>();
  const [selectedWorldId, setSelectedWorldId] = useState<number>(params.worldId ? parseInt(params.worldId, 10) : 1);
  const [progress, setProgress] = useState<Progress | null>(null);

  useFocusEffect(useCallback(() => {
    loadProgress().then(setProgress);
  }, []));

  const currentWorld = getWorldById(selectedWorldId);
  const maxUnlocked = progress?.maxUnlocked ?? 1;

  // Total stars in selected world
  const worldStars = progress
    ? currentWorld.levels.reduce((s, l) => s + (getLevelRecord(progress, l.id).stars), 0)
    : 0;

  return (
    <View style={styles.root} testID="level-select-screen">
      {/* Header */}
      <View style={[styles.header, { paddingLeft: Math.max(20, insets.left + 12), paddingRight: Math.max(20, insets.right + 12), paddingTop: Math.max(14, insets.top + 6) }]}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back-button">
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>{currentWorld.subtitle.toUpperCase()}</Text>
          <Text style={styles.headerTitle}>{currentWorld.name.toUpperCase()}</Text>
        </View>

        {/* World Tabs Switcher */}
        <View style={styles.worldTabs}>
          {WORLDS.map((w) => {
            const isActive = w.id === selectedWorldId;
            const isUnlocked = w.id === 1 || maxUnlocked >= 11 || true; // accessible for development testing
            return (
              <Pressable
                key={w.id}
                testID={`world-tab-${w.id}`}
                onPress={() => {
                  sfx.play('click');
                  setSelectedWorldId(w.id);
                }}
                style={[
                  styles.worldTab,
                  isActive && styles.worldTabActive,
                  !isUnlocked && styles.worldTabLocked,
                ]}
              >
                <Ionicons
                  name={w.id === 1 ? 'construct' : 'boat'}
                  size={14}
                  color={isActive ? '#FFFFFF' : '#9CA3AF'}
                />
                <Text style={[styles.worldTabText, isActive && styles.worldTabTextActive]}>
                  W{w.id}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.starPill}>
          <Ionicons name="star" size={14} color={theme.color.star} />
          <Text style={styles.starPillText}>
            {worldStars} / {currentWorld.levels.length * 3}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {currentWorld.levels.map((lv, index) => {
          const rec = progress ? getLevelRecord(progress, lv.id) : { stars: 0, bestScore: 0, bestShots: 0 };
          // Sequential unlocking: W1 (1..10), W2 (11..20). Level 11 accessible for testing.
          const locked = lv.worldId === 1
            ? lv.id > maxUnlocked
            : (lv.id > maxUnlocked && lv.id !== 11);
          const completed = rec.stars > 0;
          return (
            <Pressable
              key={lv.id}
              testID={`level-tile-${lv.id}`}
              disabled={locked}
              onPress={() => { sfx.play('click'); router.push({ pathname: '/game', params: { levelId: String(lv.id) } }); }}
              style={({ pressed }) => [
                styles.tile,
                locked && styles.tileLocked,
                completed && !locked && styles.tileCompleted,
                !completed && !locked && (lv.worldId === 2 ? styles.tileWorld2 : styles.tileCurrent),
                pressed && !locked && styles.tilePressed,
              ]}
            >
              <View style={styles.tileTop}>
                <Text style={[styles.tileNum, locked && styles.tileNumLocked]}>
                  {lv.worldId === 2 ? `2-${index + 1}` : lv.id}
                </Text>
                {locked ? (
                  <Ionicons name="lock-closed" size={18} color="#9CA3AF" />
                ) : (
                  <View style={styles.starsRow}>
                    {[1, 2, 3].map(i => (
                      <Ionicons
                        key={i}
                        name={rec.stars >= i ? 'star' : 'star-outline'}
                        size={14}
                        color={rec.stars >= i ? theme.color.star : 'rgba(0,0,0,0.25)'}
                      />
                    ))}
                  </View>
                )}
              </View>
              <Text style={[styles.tileName, locked && styles.tileNameLocked]} numberOfLines={2}>{lv.name}</Text>
              <View style={styles.tileFooter}>
                <View style={styles.shotsPill}>
                  <Ionicons name="ellipse" size={10} color={locked ? '#9CA3AF' : '#FFFFFF'} />
                  <Text style={[styles.shotsPillText, locked && { color: '#9CA3AF' }]}>{lv.shots} SHOTS</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#111827' },
  header: {
    paddingTop: 14, paddingHorizontal: 20, paddingBottom: 8,
    flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 999,
    backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center',
    borderBottomWidth: 3, borderColor: '#000',
  },
  headerLabel: { color: theme.color.brandSecondary, fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  headerTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  worldTabs: {
    flexDirection: 'row',
    backgroundColor: '#1F2937',
    borderRadius: 999,
    padding: 3,
    gap: 4,
    borderBottomWidth: 2,
    borderColor: '#000',
  },
  worldTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  worldTabActive: {
    backgroundColor: theme.color.brand,
  },
  worldTabLocked: {
    opacity: 0.6,
  },
  worldTabText: {
    color: '#9CA3AF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  worldTabTextActive: {
    color: '#FFFFFF',
  },
  starPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1F2937', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999,
    borderBottomWidth: 3, borderColor: '#000',
  },
  starPillText: { color: '#FFFFFF', fontWeight: '900', fontSize: 13 },
  grid: {
    paddingHorizontal: 20, paddingVertical: 16, gap: 14, alignItems: 'center',
  },
  tile: {
    width: 128, height: 148, borderRadius: 20, padding: 12,
    justifyContent: 'space-between',
    borderBottomWidth: 6,
  },
  tileCurrent: { backgroundColor: theme.color.brand, borderColor: theme.color.brandDark },
  tileWorld2: { backgroundColor: '#0284c7', borderColor: '#0369a1' },
  tileCompleted: { backgroundColor: theme.color.brandSecondary, borderColor: '#B88900' },
  tileLocked: { backgroundColor: '#374151', borderColor: '#111827' },
  tilePressed: { transform: [{ translateY: 3 }], borderBottomWidth: 3 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileNum: { fontSize: 30, fontWeight: '900', color: '#FFFFFF' },
  tileNumLocked: { color: '#9CA3AF' },
  starsRow: { flexDirection: 'row', gap: 2 },
  tileName: { fontSize: 13, fontWeight: '900', color: '#FFFFFF', letterSpacing: 0.5 },
  tileNameLocked: { color: '#9CA3AF' },
  tileFooter: {},
  shotsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(0,0,0,0.25)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999,
    alignSelf: 'flex-start',
  },
  shotsPillText: { color: '#FFFFFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
});
