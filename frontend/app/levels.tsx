import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/src/game/theme';
import { loadProgress, Progress, getLevelRecord } from '@/src/game/progress';
import { LEVELS } from '@/src/game/levels';
import { sfx } from '@/src/game/sfx';

export default function LevelSelect() {
  const router = useRouter();
  const [progress, setProgress] = useState<Progress | null>(null);

  useFocusEffect(useCallback(() => {
    loadProgress().then(setProgress);
  }, []));

  const maxUnlocked = progress?.maxUnlocked ?? 1;

  return (
    <View style={styles.root} testID="level-select-screen">
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} testID="back-button">
          <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerLabel}>WORLD 1</Text>
          <Text style={styles.headerTitle}>CONSTRUCTION SITE</Text>
        </View>
        <View style={styles.starPill}>
          <Ionicons name="star" size={14} color={theme.color.star} />
          <Text style={styles.starPillText}>
            {progress ? Object.values(progress.levels).reduce((s, l) => s + l.stars, 0) : 0} / {LEVELS.length * 3}
          </Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.grid}>
        {LEVELS.map((lv) => {
          const rec = progress ? getLevelRecord(progress, lv.id) : { stars: 0, bestScore: 0, bestShots: 0 };
          const locked = lv.id > maxUnlocked;
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
                !completed && !locked && styles.tileCurrent,
                pressed && !locked && styles.tilePressed,
              ]}
            >
              <View style={styles.tileTop}>
                <Text style={[styles.tileNum, locked && styles.tileNumLocked]}>{lv.id}</Text>
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
  headerTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
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
  tileCompleted: { backgroundColor: theme.color.brandSecondary, borderColor: '#B88900' },
  tileLocked: { backgroundColor: '#374151', borderColor: '#111827' },
  tilePressed: { transform: [{ translateY: 3 }], borderBottomWidth: 3 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileNum: { fontSize: 34, fontWeight: '900', color: '#FFFFFF' },
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
