import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark';
type Language = 'en' | 'de';

interface SettingsState {
  theme: Theme;
  language: Language;
}

interface SettingsActions {
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
}

// Exported so tests can verify migration logic independently
export function getInitialTheme(): Theme {
  try {
    const v = localStorage.getItem('theme');
    if (v === 'light' || v === 'dark') return v;
    const sys = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return sys ? 'dark' : 'light';
  } catch {
    return 'dark';
  }
}

export function getInitialLanguage(): Language {
  try {
    const v = localStorage.getItem('vg_lang');
    if (v === 'en' || v === 'de') return v;
  } catch {
    return 'en';
  }
  return 'en';
}

export const useSettingsStore = create<SettingsState & SettingsActions>()(
  persist(
    (set) => ({
      theme: getInitialTheme(),
      language: getInitialLanguage(),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'vg-settings',
    }
  )
);
