import { useCallback, useEffect, useState } from 'react';
import { setSoundMuted } from '../engine/sound';

type Theme = 'dark' | 'light';

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage blocked: preference just won't persist */
  }
};

/** Theme and mute, persisted. index.html's inline script sets the first-paint `dark` class. */
export function usePreferences() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );
  const [muted, setMuted] = useState(() => read('deadwood_muted') === '1');

  useEffect(() => {
    write('deadwood_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    setSoundMuted(muted);
    write('deadwood_muted', muted ? '1' : '0');
  }, [muted]);

  const toggleTheme = useCallback(() => setTheme((t) => (t === 'dark' ? 'light' : 'dark')), []);
  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  return { theme, muted, toggleTheme, toggleMute };
}
