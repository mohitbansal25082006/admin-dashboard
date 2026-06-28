// Admin-Dashboard/src/context/ThemeContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Part 55.13 — Admin Dashboard Theme Provider
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useTheme as useNextTheme } from 'next-themes';
import {
  applyThemeFromPreference,
  initTheme,
  resolveMode,
  getActiveThemeId,
  getActiveThemeMode,
  getActivePreference,
  setActivePreference,
} from '../constants/theme';
import {
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '../lib/themeStorage';
import {
  DEFAULT_THEME_ID,
  type ThemeMode,
  type ThemeModePreference,
} from '../constants/themes';

// ─── Context shape ─────────────────────────────────────────────────────────────

interface ThemeContextValue {
  themeId: string;
  mode: ThemeModePreference;
  resolvedMode: ThemeMode;
  isLight: boolean;
  isReady: boolean;
  setThemeId: (id: string) => void;
  setMode: (mode: ThemeModePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeId: DEFAULT_THEME_ID,
  mode: 'dark',
  resolvedMode: 'dark',
  isLight: false,
  isReady: false,
  setThemeId: () => {},
  setMode: () => {},
});

// ─── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme: nextResolvedTheme, theme: nextTheme, setTheme: setNextTheme } = useNextTheme();
  
  const [themeId, setThemeIdState] = useState<string>(DEFAULT_THEME_ID);
  const [mode, setModeState] = useState<ThemeModePreference>('dark');
  const [isReady, setIsReady] = useState(false);

  // ── Resolve system mode from next-themes ──────────────────────────────────
  const systemMode: 'light' | 'dark' = (nextResolvedTheme === 'light' ? 'light' : 'dark') as 'light' | 'dark';
  const resolvedMode = resolveMode(mode, systemMode);
  const isLight = resolvedMode === 'light';

  // ── Load saved preference on mount ────────────────────────────────────────
  useEffect(() => {
    const pref = loadThemePreference();
    setThemeIdState(pref.themeId);
    setModeState(pref.mode);
    
    // Apply the theme
    initTheme(pref.themeId, pref.mode, systemMode);
    setIsReady(true);
  }, []);

  // ── Apply theme when mode/themeId changes ────────────────────────────────
  useEffect(() => {
    if (!isReady) return;
    
    // Apply to CSS variables
    applyThemeFromPreference(themeId, mode, systemMode);
    
    // Update next-themes for system mode detection
    if (mode === 'system') {
      setNextTheme('system');
    } else {
      setNextTheme(mode);
    }
    
    // Save preference
    saveThemePreference({ themeId, mode });
  }, [themeId, mode, systemMode, isReady, setNextTheme]);

  // ── Sync with next-themes when system mode changes ──────────────────────
  useEffect(() => {
    if (!isReady) return;
    // Re-apply current theme with updated system mode
    applyThemeFromPreference(themeId, mode, systemMode);
  }, [systemMode, themeId, mode, isReady]);

  // ── Public setters ────────────────────────────────────────────────────────
  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
  }, []);

  const setMode = useCallback((m: ThemeModePreference) => {
    setModeState(m);
    setActivePreference(m);
  }, []);

  const value: ThemeContextValue = {
    themeId,
    mode,
    resolvedMode,
    isLight,
    isReady,
    setThemeId,
    setMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}