import React, { useEffect, useRef } from 'react';
import { Animated, View, Text, StyleSheet, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Level 1 no-words tutorial: a hand drags back while a dashed arc + arrow
// hints the fire direction. Loops until the first shot is fired.
export function TutorialHint() {
  const drag = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(drag, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(drag, { toValue: 0, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        Animated.delay(300),
      ]),
    );
    const p = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    p.start();
    return () => { loop.stop(); p.stop(); };
  }, [drag, pulse]);

  const handTranslate = drag.interpolate({ inputRange: [0, 1], outputRange: [0, 46] });
  const handTranslateY = drag.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
  const arrowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] });

  return (
    <View style={styles.wrap} pointerEvents="none" testID="tutorial-hint">
      <View style={styles.row}>
        <Animated.View style={{ transform: [{ translateX: handTranslate }, { translateY: handTranslateY }] }}>
          <Ionicons name="hand-left" size={40} color="#FFFFFF" />
        </Animated.View>
      </View>
      <View style={styles.badge}>
        <Text style={styles.badgeStrong}>DRAG TO AIM</Text>
        <Animated.View style={{ opacity: arrowOpacity }}>
          <Ionicons name="arrow-forward-circle" size={18} color="#FFC107" />
        </Animated.View>
        <Text style={styles.badgeStrong}>RELEASE TO FIRE</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: 20, left: 0, right: 0, alignItems: 'center', gap: 10 },
  row: { height: 44, justifyContent: 'center' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(17,24,39,0.85)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 999,
    borderBottomWidth: 3, borderColor: '#000',
  },
  badgeStrong: { color: '#FFFFFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
});
