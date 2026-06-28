// Admin-Dashboard/src/components/admin/ThemePickerModal.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Part 55.13 — Admin Dashboard Theme Picker Modal
// Full-screen modal with theme cards and mode selector.
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import React from 'react';
import { X, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import {
  THEME_DEFINITIONS,
  getPalette,
  type ThemeDefinition,
  type ThemeModePreference,
} from '../../constants/themes';

interface ThemePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODE_OPTIONS: { key: ThemeModePreference; label: string; icon: React.ReactNode }[] = [
  { key: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
  { key: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
  { key: 'system', label: 'System', icon: <Monitor className="w-4 h-4" /> },
];

function ThemeCard({
  def,
  previewMode,
  selected,
  onPress,
}: {
  def: ThemeDefinition;
  previewMode: 'light' | 'dark';
  selected: boolean;
  onPress: () => void;
}) {
  const p = getPalette(def.id, previewMode);

  // Build inline styles to avoid TypeScript errors with ringColor
  const cardStyles: React.CSSProperties = {
    flex: 1,
    borderRadius: '12px',
    overflow: 'hidden',
    transition: 'all 0.2s ease',
    border: `1px solid ${selected ? p.primary : 'rgba(255,255,255,0.06)'}`,
    boxShadow: selected ? `0 0 0 2px ${p.primary}40, 0 0 0 4px ${p.primary}20` : 'none',
  };

  const footerStyles: React.CSSProperties = {
    padding: '8px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: selected ? p.primary : 'transparent',
    transition: 'background-color 0.2s ease',
  };

  return (
    <button
      onClick={onPress}
      className="flex-1 rounded-xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98]"
      style={cardStyles}
    >
      {/* Mini preview */}
      <div className="p-3 space-y-2" style={{ backgroundColor: p.background }}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-6 rounded-md flex items-center justify-center text-xs"
            style={{
              background: `linear-gradient(135deg, ${p.primary}, ${p.primaryDark})`,
            }}
          >
            <span className="text-white">{def.icon}</span>
          </div>
          <div className="flex-1 space-y-1">
            <div 
              className="h-1.5 w-3/4 rounded" 
              style={{ backgroundColor: p.textPrimary, opacity: 0.85 }} 
            />
            <div 
              className="h-1 w-1/2 rounded" 
              style={{ backgroundColor: p.textMuted, opacity: 0.6 }} 
            />
          </div>
        </div>

        {/* Card */}
        <div
          className="rounded-md p-2 space-y-1"
          style={{
            backgroundColor: p.backgroundCard,
            border: `1px solid ${p.border}`,
          }}
        >
          <div 
            className="h-1 w-full rounded" 
            style={{ backgroundColor: p.textSecondary, opacity: 0.5 }} 
          />
          <div 
            className="h-1 w-2/3 rounded" 
            style={{ backgroundColor: p.textMuted, opacity: 0.4 }} 
          />
          <div className="flex gap-1 mt-1">
            <div 
              className="w-3 h-1.5 rounded" 
              style={{ backgroundColor: p.primary }} 
            />
            <div 
              className="w-2 h-1.5 rounded" 
              style={{ backgroundColor: p.secondary }} 
            />
            <div 
              className="w-2 h-1.5 rounded" 
              style={{ backgroundColor: p.accent }} 
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={footerStyles}>
        <span
          className="text-xs font-medium flex-1 text-left"
          style={{ color: selected ? '#FFFFFF' : 'var(--text-secondary)' }}
        >
          {def.name}
        </span>
        {selected && (
          <span className="text-xs font-bold text-white">✓</span>
        )}
      </div>
    </button>
  );
}

export function ThemePickerModal({ isOpen, onClose }: ThemePickerModalProps) {
  const { themeId, mode, resolvedMode, setThemeId, setMode } = useTheme();

  if (!isOpen) return null;

  // Pair themes into rows of two
  const rows: ThemeDefinition[][] = [];
  for (let i = 0; i < THEME_DEFINITIONS.length; i += 2) {
    rows.push(THEME_DEFINITIONS.slice(i, i + 2));
  }

  // Modal backdrop styles
  const backdropStyles: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 60,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    backgroundColor: 'rgba(0,0,0,0.7)',
    animation: 'fadeIn 0.2s ease-out',
  };

  const modalStyles: React.CSSProperties = {
    width: '100%',
    maxWidth: '420px',
    maxHeight: '90vh',
    borderRadius: '16px',
    overflowY: 'auto',
    backgroundColor: 'var(--background-card)',
    border: '1px solid var(--border)',
    animation: 'slideUp 0.25s ease-out',
  };

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border)',
  };

  const contentStyles: React.CSSProperties = {
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  };

  const labelStyles: React.CSSProperties = {
    fontSize: '10px',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: '8px',
    color: 'var(--text-muted)',
  };

  const modeContainerStyles: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    padding: '4px',
    borderRadius: '12px',
    backgroundColor: 'var(--background-elevated)',
  };

  const modeButtonBaseStyles: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    border: 'none',
    cursor: 'pointer',
  };

  const themeGridStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  };

  const themeRowStyles: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
  };

  const hintStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '12px',
    backgroundColor: 'rgba(41, 182, 246, 0.08)',
    border: '1px solid rgba(41, 182, 246, 0.15)',
    color: 'var(--text-muted)',
    lineHeight: 1.6,
  };

  return (
    <div style={backdropStyles} onClick={onClose}>
      <div style={modalStyles} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={headerStyles}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'var(--text-primary)' }}>
            Appearance
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/5 transition-colors"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <X className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div style={contentStyles}>
          {/* Mode selector */}
          <div>
            <p style={labelStyles}>Mode</p>
            <div style={modeContainerStyles}>
              {MODE_OPTIONS.map((opt) => {
                const isActive = mode === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => setMode(opt.key)}
                    style={{
                      ...modeButtonBaseStyles,
                      backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                      color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                    }}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme grid */}
          <div>
            <p style={labelStyles}>Theme</p>
            <div style={themeGridStyles}>
              {rows.map((row, ri) => (
                <div key={ri} style={themeRowStyles}>
                  {row.map((def) => (
                    <ThemeCard
                      key={def.id}
                      def={def}
                      previewMode={resolvedMode}
                      selected={themeId === def.id}
                      onPress={() => setThemeId(def.id)}
                    />
                  ))}
                  {row.length === 1 && <div style={{ flex: 1 }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Hint */}
          <div style={hintStyles}>
            <span style={{ fontSize: '16px', color: 'var(--info)' }}>✨</span>
            <p>
              Your selection applies instantly across the entire admin dashboard and is remembered next time you log in.
            </p>
          </div>
        </div>
      </div>

      {/* Add keyframe animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { 
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}