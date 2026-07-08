import { useCallback, useEffect, useState } from 'react';

export type ThemeChoice = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'expense-tracker-theme';

function resolvedTheme(choice: ThemeChoice): 'light' | 'dark' {
  if (choice === 'system') {
    if (typeof window === 'undefined') return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return choice;
}

function applyTheme(choice: ThemeChoice) {
  const t = resolvedTheme(choice);
  const root = document.documentElement;
  root.classList.toggle('dark', t === 'dark');
}

function loadInitial(): ThemeChoice {
  if (typeof window === 'undefined') return 'system';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return 'system';
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(loadInitial);

  useEffect(() => {
    applyTheme(choice);
    window.localStorage.setItem(STORAGE_KEY, choice);
  }, [choice]);

  useEffect(() => {
    if (choice !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyTheme('system');
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, [choice]);

  const cycle = useCallback(() => {
    setChoice((prev) => (prev === 'light' ? 'dark' : prev === 'dark' ? 'system' : 'light'));
  }, []);

  return { choice, setChoice, cycle, resolved: resolvedTheme(choice) };
}
