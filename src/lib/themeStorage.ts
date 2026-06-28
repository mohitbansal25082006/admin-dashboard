// Admin-Dashboard/src/lib/themeStorage.ts
// ─────────────────────────────────────────────────────────────────────────────
// Part 55.13 — Admin Dashboard Theme Preference Storage
// Uses localStorage for persistence (client-side only).
// ─────────────────────────────────────────────────────────────────────────────

import { DEFAULT_THEME_ID, DEFAULT_THEME_MODE, type ThemeModePreference } from '../constants/themes';

const STORAGE_KEY = 'deepdive-admin-theme';

export interface ThemePreference {
  themeId: string;
  mode: ThemeModePreference;
}

// ─── Load preference from localStorage ──────────────────────────────────────

export function loadThemePreference(): ThemePreference {
  if (typeof window === 'undefined') {
    return { themeId: DEFAULT_THEME_ID, mode: DEFAULT_THEME_MODE };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { themeId: DEFAULT_THEME_ID, mode: DEFAULT_THEME_MODE };

    const parsed = JSON.parse(stored) as ThemePreference;
    return {
      themeId: parsed.themeId || DEFAULT_THEME_ID,
      mode: parsed.mode || DEFAULT_THEME_MODE,
    };
  } catch {
    return { themeId: DEFAULT_THEME_ID, mode: DEFAULT_THEME_MODE };
  }
}

// ─── Save preference to localStorage ────────────────────────────────────────

export function saveThemePreference(pref: ThemePreference): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pref));
  } catch {
    // Silently fail — not critical
  }
}