import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@practica02_theme';

// ─── Colores semánticos (invariantes) ───────────────────────────────────────
const shared = {
  primary:      '#1d4ed8',
  accent:       '#7c3aed',
  accentMid:    '#8b5cf6',
  accentLight:  '#ede9fe',
  success:      '#22c55e',
  successLight: '#dcfce7',
  danger:       '#ef4444',
  dangerLight:  '#fee2e2',
  warning:      '#f59e0b',
  warningLight: '#fef3c7',
};

// ─── Tema oscuro ─────────────────────────────────────────────────────────────
const darkColors = {
  bg:        '#0f172a',
  bgCard:    '#1e293b',
  bgInput:   '#0f172a',
  bgSubtle:  '#1e293b',
  text:      '#f1f5f9',
  textSub:   '#94a3b8',
  textMuted: '#64748b',
  border:    '#334155',
  statusBar: 'light',
  ...shared,
};

// ─── Tema claro ───────────────────────────────────────────────────────────────
const lightColors = {
  bg:        '#f8fafc',
  bgCard:    '#ffffff',
  bgInput:   '#f1f5f9',
  bgSubtle:  '#f1f5f9',
  text:      '#0f172a',
  textSub:   '#475569',
  textMuted: '#94a3b8',
  border:    '#e2e8f0',
  statusBar: 'dark',
  ...shared,
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const system = useColorScheme();                         // 'light' | 'dark' | null
  const [mode, setMode] = useState('dark');                // 'light' | 'dark' | 'system'

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((v) => {
      if (v === 'light' || v === 'dark' || v === 'system') setMode(v);
    });
  }, []);

  const changeMode = (m) => {
    setMode(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  };

  const isDark = mode === 'dark' || (mode === 'system' && system === 'dark');
  const colors = isDark ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ mode, setMode: changeMode, isDark, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme debe usarse dentro de ThemeProvider');
  return ctx;
}
