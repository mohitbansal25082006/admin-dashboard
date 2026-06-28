// Admin-Dashboard/src/components/admin/ThemeToggle.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Part 55.13 — Admin Dashboard Theme Toggle Button
// Floating action button that opens the theme picker modal.
// ─────────────────────────────────────────────────────────────────────────────

'use client';

import React, { useState } from 'react';
import { Palette, X } from 'lucide-react';
import { ThemePickerModal } from './ThemePickerModal';
import { useTheme } from '../../context/ThemeContext';

export function ThemeToggle() {
  const [isOpen, setIsOpen] = useState(false);
  const { resolvedMode, themeId } = useTheme();

  // Get the current theme's swatch colour
  const swatch = resolvedMode === 'light' ? '#6C63FF' : '#6C63FF';

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
        style={{
          background: `linear-gradient(135deg, ${swatch}, ${swatch}CC)`,
          border: 'none',
        }}
        aria-label="Open theme settings"
      >
        <Palette className="w-5 h-5 text-white" />
      </button>

      <ThemePickerModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}