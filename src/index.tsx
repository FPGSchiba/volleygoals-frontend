import React, {useState, useMemo, createContext, useContext, useEffect} from 'react';
import ReactDOM from 'react-dom/client';
import './i18n/config';
import App from './App';
import { createTheme, ThemeProvider } from "@mui/material/styles";
import { GlobalStyles } from "@mui/material";
import amplifyConfig from '../amplify_outputs.json';
import {Amplify} from "aws-amplify";

// Configure Amplify
Amplify.configure(amplifyConfig);

// Create a context for theme toggling
export const ThemeToggleContext = createContext({
  toggleTheme: () => {},
  mode: 'dark' as 'dark' | 'light'
});

// Custom hook to use the theme toggle
export const useThemeToggle = () => useContext(ThemeToggleContext);

const Root = () => {
  const [mode, setMode] = useState<'dark' | 'light'>(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') return stored;
    } catch {}
    const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  useEffect(() => {
    try {
      if (localStorage.getItem('theme')) return;
    } catch {}

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
          primary: {
            main: '#C41E3A', // Red from logo
          },
          secondary: {
            main: '#000000', // Black from logo
          },
          ...(mode === 'dark' ? {
            text: {
              primary: '#ffffff',
              secondary: '#b0b0b0'
            },
            background: {
              default: '#0a0a0a',
              paper: '#1a1a1a'
            },
            divider: '#333333',
          } : {
            text: {
              primary: '#000000',
              secondary: '#666666'
            },
            background: {
              default: '#ffffff',
              paper: '#f8f8f8'
            },
            divider: '#e0e0e0',
          }),
          success: {
            main: '#4caf50',
          },
          error: {
            main: '#C41E3A', // Using logo red for errors
          },
          warning: {
            main: '#ff9800',
          },
          info: {
            main: '#2196f3',
          },
        },
      }),
    [mode]
  );

  const toggleTheme = () => {
    setMode((prevMode) => {
      const next = prevMode === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem('theme', next); } catch {}
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
