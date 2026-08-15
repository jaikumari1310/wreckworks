import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, useWindowDimensions, Easing } from 'react-native';

export interface ChainData { count: number; x: number; y: number; id: number; }

// A temporary "CHAIN xN!" popup that pops in near the destruction and fades out.
export function ChainPopup({ data, onDone }: { data: ChainData; onDone: () => void }) {
  const { width, height } = useWindowDimensions();
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(0)).current;

  // Bigger chains → hotter color + larger text
  const big = data.count >= 7;
  const mid = data.count >= 4;
  const color = big ? '#FF3B30' : mid ? '#FF7A00' : '#FFC107';
  const fontSize = Math.min(46, 24 + data.count * 2.2);

  useEffect(() => {
    scale.setValue(0);
    opacity.setValue(0);
    rise.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, friction: 5, tension: 140, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]),
      Animated.delay(500),
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(rise, { toValue: -40, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start(() => onDone());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);

  const left = Math.min(width - 150, Math.max(20, data.x * width - 70));
  const top = Math.min(height - 120, Math.max(40, data.y * height - 30));

  return (
    <Animated.View
      pointerEvents="none"
      testID="chain-popup"
      style={[
        styles.wrap,
        { left, top, opacity, transform: [{ scale }, { translateY: rise }] },
      ]}
    >
      <Text style={[styles.chainLabel, { color }]}>CHAIN</Text>
      <Text style={[styles.chainCount, { color, fontSize }]}>x{data.count}!</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', alignItems: 'center', width: 140 },
  chainLabel: {
    fontSize: 14, fontWeight: '900', letterSpacing: 3,
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 2,
  },
  chainCount: {
    fontWeight: '900', letterSpacing: 1, marginTop: -2,
    textShadowColor: 'rgba(0,0,0,0.7)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 3,
  },
});
