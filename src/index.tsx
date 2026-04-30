import React, {useState, useMemo, createContext, useContext, useEffect} from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/config';
import App from './App';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { GlobalStyles } from "@mui/material";
import {Amplify} from "aws-amplify";
import { useSettingsStore } from './store/settings';

// Configure Amplify from environment variables
Amplify.configure({
  auth: {
    user_pool_id: process.env.COGNITO_USER_POOL_ID!,
    aws_region: process.env.COGNITO_REGION || 'eu-central-1',
    user_pool_client_id: process.env.COGNITO_USER_POOL_CLIENT_ID!,
    identity_pool_id: process.env.COGNITO_IDENTITY_POOL_ID!,
    mfa_methods: [],
    standard_required_attributes: ['email'],
    username_attributes: ['email'],
    user_verification_types: ['email'],
    groups: [],
    mfa_configuration: 'NONE',
    password_policy: {
      min_length: 8,
      require_lowercase: true,
      require_numbers: true,
      require_symbols: true,
      require_uppercase: true,
    },
    unauthenticated_identities_enabled: true,
  },
  version: '1.4',
});

// Create a context for theme toggling
export const ThemeToggleContext = createContext({
  toggleTheme: () => {},
  mode: 'dark' as 'dark' | 'light'
});

// Custom hook to use the theme toggle
export const useThemeToggle = () => useContext(ThemeToggleContext);

const Root = () => {
  const storedTheme = useSettingsStore.getState().theme;
  const [mode, setMode] = useState<'dark' | 'light'>(storedTheme);

  useEffect(() => {
    const persisted = localStorage.getItem('vg-settings');
    if (persisted) return;

    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent | MediaQueryList) => {
      const matches = 'matches' in e ? e.matches : (e as MediaQueryList).matches;
      setMode(matches ? 'dark' : 'light');
    };
    if ('addEventListener' in mql) {
      (mql as MediaQueryList).addEventListener('change', onChange as EventListener);
    } else {
      (mql as MediaQueryList).addListener(onChange as any);
    }
    return () => {
      if ('removeEventListener' in mql) {
        (mql as MediaQueryList).removeEventListener('change', onChange as EventListener);
      } else {
        (mql as MediaQueryList).removeListener(onChange as any);
      }
    };
  }, []);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: mode,
          primary: { main: '#C41E3A' },
          secondary: { main: '#000000' },
          ...(mode === 'dark' ? {
            text: { primary: '#ffffff', secondary: '#aaaaaa' },
            background: { default: '#0d0d0d', paper: '#1a1a1a' },
            divider: '#252525',
          } : {
            text: { primary: '#111111', secondary: '#555555' },
            background: { default: '#f2f2f2', paper: '#ffffff' },
            divider: '#e4e4e4',
          }),
          success: { main: '#4caf50' },
          error: { main: '#C41E3A' },
          warning: { main: '#ff9800' },
          info: { main: '#2196f3' },
        },
      }),
    [mode]
  );

  const toggleTheme = () => {
    setMode((prevMode) => {
      const next = prevMode === 'dark' ? 'light' : 'dark';
      useSettingsStore.getState().setTheme(next);
      return next;
    });
  };

  return (
    <ThemeToggleContext.Provider value={{ toggleTheme, mode }}>
      <ThemeProvider theme={theme}>
        <GlobalStyles styles={(t) => ({
          ':root': {
            '--palette-mode': t.palette.mode,
            '--palette-primary-main': t.palette.primary.main,
            '--palette-secondary-main': t.palette.secondary.main,
            '--palette-text-primary': t.palette.text.primary,
            '--palette-text-secondary': t.palette.text.secondary,
            '--palette-background-default': t.palette.background.default,
            '--palette-background-paper': t.palette.background.paper,
            '--palette-divider': (t.palette.divider as string) || '',
            '--palette-success-main': t.palette.success.main,
            '--palette-error-main': t.palette.error.main,
            '--palette-warning-main': t.palette.warning.main,
            '--palette-info-main': t.palette.info.main,
            '--vg-bg-subtle': t.palette.mode === 'dark' ? '#141414' : '#fafafa',
            '--vg-border': t.palette.mode === 'dark' ? '#252525' : '#e4e4e4',
            '--vg-border-strong': t.palette.mode === 'dark' ? '#2a2a2a' : '#dddddd',
            '--vg-text-muted': t.palette.mode === 'dark' ? '#555555' : '#aaaaaa',
            '--vg-text-disabled': t.palette.mode === 'dark' ? '#333333' : '#cccccc',
            '--vg-rail-bg': t.palette.mode === 'dark' ? '#161616' : '#e8e8e8',
            '--vg-rail-border': t.palette.mode === 'dark' ? '#222222' : '#dddddd',
            '--vg-accent': '#C41E3A',
            '--vg-chip-active-bg': 'rgba(196,30,58,0.15)',
            '--vg-chip-active-border': 'rgba(196,30,58,0.30)',
            '--vg-row-hover-border': 'rgba(196,30,58,0.25)',
            '--vg-season-pill-bg': 'rgba(196,30,58,0.10)',
            '--vg-season-pill-border': 'rgba(196,30,58,0.25)',
            '--vg-trainer-badge-bg': 'rgba(196,30,58,0.12)',
            '--vg-status-open-bg': 'rgba(255,152,0,0.12)',
            '--vg-status-open-text': '#f09800',
            '--vg-status-progress-bg': 'rgba(33,150,243,0.12)',
            '--vg-status-progress-text': '#2196f3',
            '--vg-status-done-bg': 'rgba(76,175,80,0.12)',
            '--vg-status-done-text': '#4caf50',
            '--vg-status-muted-bg': 'rgba(128,128,128,0.10)',
            '--vg-r1-bg': '#fce4e9', '--vg-r1-text': '#6b1323',
            '--vg-r2-bg': '#f4a0b0', '--vg-r2-text': '#5a0e1c',
            '--vg-r3-bg': '#e05575', '--vg-r3-text': '#ffffff',
            '--vg-r4-bg': '#c4283e', '--vg-r4-text': '#ffffff',
            '--vg-r5-bg': '#8b0000', '--vg-r5-text': '#ffffff',
          },
        })} />
        <App />
      </ThemeProvider>
    </ThemeToggleContext.Provider>
  );
};

const rootEl = document.getElementById('root');

if (rootEl) {
  const root = ReactDOM.createRoot(rootEl as HTMLElement);

  root.render(
    <React.StrictMode>
      <Root />
    </React.StrictMode>
  );
}
