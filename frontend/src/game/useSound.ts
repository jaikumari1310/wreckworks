import { useEffect, useState } from 'react';
import { sfx } from './sfx';

// React hook exposing the current sound-enabled state + a toggle.
export function useSound() {
  const [enabled, setEnabled] = useState(sfx.isEnabled());
  useEffect(() => sfx.subscribe(setEnabled), []);
  return {
    enabled,
    toggle: () => sfx.toggle(),
    setEnabled: (v: boolean) => sfx.setEnabled(v),
  };
}
