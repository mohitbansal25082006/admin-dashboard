// Admin-Dashboard/src/constants/theme.ts
// ─────────────────────────────────────────────────────────────────────────────
// Part 55.13 — Admin Dashboard Theme System (runtime engine)
// Uses CSS custom properties (CSS variables) for theme switching — different
// from the React Native app's mutable object approach, but compatible with
// Tailwind and Next.js.
// ─────────────────────────────────────────────────────────────────────────────

import {
  THEME_DEFINITIONS,
  DEFAULT_THEME_ID,
  DEFAULT_THEME_MODE,
  getPalette,
  getThemeDefinition,
  type ThemePalette,
  type ThemeMode,
  type ThemeModePreference,
} from './themes';

// Re-export
export {
  THEME_DEFINITIONS,
  DEFAULT_THEME_ID,
  DEFAULT_THEME_MODE,
  getThemeDefinition,
  getPalette,
};
export type { ThemePalette, ThemeMode, ThemeModePreference, ThemeDefinition } from './themes';

// ─── Current state ─────────────────────────────────────────────────────────────

let activeThemeId: string = DEFAULT_THEME_ID;
let activeThemeMode: ThemeMode = 'dark';
let activePreference: ThemeModePreference = DEFAULT_THEME_MODE;

// ─── CSS variable name helpers ────────────────────────────────────────────────

function cssVarName(key: string): string {
  // Convert camelCase to kebab-case
  const kebab = key.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
  return `--${kebab}`;
}

// ─── Apply theme to CSS custom properties ────────────────────────────────────

export function applyThemeToCSS(id: string, mode: ThemeMode): void {
  const palette = getPalette(id, mode);
  const root = document.documentElement;

  // Map each palette key to a CSS custom property
  const mappings: [string, string][] = [
    ['primary', palette.primary],
    ['primaryLight', palette.primaryLight],
    ['primaryDark', palette.primaryDark],
    ['secondary', palette.secondary],
    ['accent', palette.accent],
    ['background', palette.background],
    ['backgroundCard', palette.backgroundCard],
    ['backgroundElevated', palette.backgroundElevated],
    ['textPrimary', palette.textPrimary],
    ['textSecondary', palette.textSecondary],
    ['textMuted', palette.textMuted],
    ['border', palette.border],
    ['borderFocus', palette.borderFocus],
    ['success', palette.success],
    ['error', palette.error],
    ['warning', palette.warning],
    ['info', palette.info],
    ['pro', palette.pro],
    ['enterprise', palette.enterprise],
    ['notification', palette.notification],
  ];

  // Gradients as comma-separated strings
  const gradientMappings: [string, string][] = [
    ['gradientPrimary', palette.gradientPrimary.join(', ')],
    ['gradientSecondary', palette.gradientSecondary.join(', ')],
    ['gradientDark', palette.gradientDark.join(', ')],
    ['gradientCard', palette.gradientCard.join(', ')],
    ['gradientSuccess', palette.gradientSuccess.join(', ')],
    ['gradientPro', palette.gradientPro.join(', ')],
  ];

  // Set all colour variables
  for (const [key, value] of mappings) {
    root.style.setProperty(cssVarName(key), value);
  }

  // Set gradient variables (used in Tailwind custom properties)
  for (const [key, value] of gradientMappings) {
    root.style.setProperty(cssVarName(key), value);
  }

  // Also set the shadcn-compatible variables
  root.style.setProperty('--color-primary', palette.primary);
  root.style.setProperty('--color-primary-foreground', mode === 'dark' ? '#FFFFFF' : '#FFFFFF');
  root.style.setProperty('--color-background', palette.background);
  root.style.setProperty('--color-foreground', palette.textPrimary);
  root.style.setProperty('--color-card', palette.backgroundCard);
  root.style.setProperty('--color-card-foreground', palette.textPrimary);
  root.style.setProperty('--color-border', palette.border);
  root.style.setProperty('--color-muted', palette.backgroundElevated);
  root.style.setProperty('--color-muted-foreground', palette.textMuted);
  root.style.setProperty('--color-accent', palette.accent);
  root.style.setProperty('--color-accent-foreground', palette.textPrimary);

  // Update state
  activeThemeId = id;
  activeThemeMode = mode;
}

// ─── Resolve preference to effective mode ────────────────────────────────────

export function resolveMode(pref: ThemeModePreference, systemMode: 'light' | 'dark'): ThemeMode {
  if (pref === 'system') return systemMode;
  return pref;
}

// ─── Get current state ────────────────────────────────────────────────────────

export function getActiveThemeId(): string {
  return activeThemeId;
}

export function getActiveThemeMode(): ThemeMode {
  return activeThemeMode;
}

export function getActivePreference(): ThemeModePreference {
  return activePreference;
}

export function setActivePreference(pref: ThemeModePreference): void {
  activePreference = pref;
}

// ─── Apply theme from preference + system mode ──────────────────────────────

export function applyThemeFromPreference(
  themeId: string,
  preference: ThemeModePreference,
  systemMode: 'light' | 'dark'
): void {
  const mode = resolveMode(preference, systemMode);
  applyThemeToCSS(themeId, mode);
  activePreference = preference;
}

// ─── Initialise theme (call once on app load) ──────────────────────────────

let isInitialised = false;

export function initTheme(
  themeId: string = DEFAULT_THEME_ID,
  preference: ThemeModePreference = DEFAULT_THEME_MODE,
  systemMode: 'light' | 'dark' = 'dark'
): void {
  if (isInitialised) return;
  applyThemeFromPreference(themeId, preference, systemMode);
  isInitialised = true;
}

// ─── Get CSS variable values for inline styles ──────────────────────────────

export function getCSSVar(key: string): string {
  const name = cssVarName(key);
  return `var(${name})`;
}

// ─── Helper to get the current palette (for components that need it) ────────

export function getCurrentPalette(): ThemePalette {
  return getPalette(activeThemeId, activeThemeMode);
}