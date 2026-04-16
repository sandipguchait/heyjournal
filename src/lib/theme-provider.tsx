'use client';

import { useEffect, useCallback, useSyncExternalStore, createContext, useContext, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = localStorage.getItem('heyjournal-theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // localStorage unavailable
  }
  return 'system';
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(t: Theme): 'light' | 'dark' {
  if (t === 'system') return getSystemTheme();
  return t;
}

function applyTheme(resolved: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  if (resolved === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

// Listen for storage events (cross-tab sync) and system theme changes
let listeners: Array<() => void> = [];

function subscribeToTheme(callback: () => void): () => void {
  listeners.push(callback);

  // System theme changes
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', callback);

  // Storage events (cross-tab sync)
  const handleStorage = (e: StorageEvent) => {
    if (e.key === 'heyjournal-theme') callback();
  };
  window.addEventListener('storage', handleStorage);

  return () => {
    listeners = listeners.filter((l) => l !== callback);
    mql.removeEventListener('change', callback);
    window.removeEventListener('storage', handleStorage);
  };
}

function getThemeSnapshot(): Theme {
  return getStoredTheme();
}

function getServerThemeSnapshot(): Theme {
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, getServerThemeSnapshot);
  const systemTheme = useSyncExternalStore(
    subscribeToSystemThemeOnly,
    getSystemTheme,
    () => 'light' as const
  );

  const resolvedTheme = resolveTheme(theme);

  // Apply theme to DOM
  useEffect(() => {
    applyTheme(resolvedTheme);
  }, [resolvedTheme]);

  const setTheme = useCallback((t: Theme) => {
    localStorage.setItem('heyjournal-theme', t);
    // Trigger re-render via listeners
    listeners.forEach((l) => l());
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

function subscribeToSystemThemeOnly(callback: () => void): () => void {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

function getSystemThemeSnapshot(): 'light' | 'dark' {
  return getSystemTheme();
}
