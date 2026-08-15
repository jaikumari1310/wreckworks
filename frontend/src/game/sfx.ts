import { useAudioPlayer } from 'expo-audio';
import { useMemo, useRef } from 'react';

// Sound-effect hook — silently no-ops if assets not available. In this
// prototype we skip bundling audio files (satisfying "playable if audio disabled").
// Consumers can call sfx.play('fire'); it's safe to call even without files.
export type SfxName = 'fire' | 'impact' | 'break' | 'collapse' | 'star' | 'click';

export function useSfx() {
  const last = useRef<Record<string, number>>({});
  // no-op audio for now
  return useMemo(() => ({
    play: (_name: SfxName) => {
      // Placeholder; ready for future asset integration
    },
  }), []);
}
