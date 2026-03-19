// File: src/setupTests.ts
import { TextEncoder, TextDecoder } from 'util';

(global as any).TextEncoder = TextEncoder;
(global as any).TextDecoder = TextDecoder;

import '@testing-library/jest-dom';

// Mock i18next globally — return fallback string (2nd argument) or key
jest.mock('i18next', () => ({
  t: (key: string, fallbackOrOpts?: string | Record<string, any>, opts?: Record<string, any>) => {
    if (typeof fallbackOrOpts === 'string') return fallbackOrOpts;
    if (fallbackOrOpts && typeof fallbackOrOpts === 'object' && 'defaultValue' in fallbackOrOpts)
      return fallbackOrOpts.defaultValue as string;
    return key;
  },
  language: 'en',
  changeLanguage: jest.fn(),
  use: jest.fn().mockReturnThis(),
  init: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallbackOrOpts?: string | Record<string, any>) => {
      if (typeof fallbackOrOpts === 'string') return fallbackOrOpts;
      if (fallbackOrOpts && typeof fallbackOrOpts === 'object' && 'defaultValue' in fallbackOrOpts)
        return fallbackOrOpts.defaultValue as string;
      return key;
    },
    i18n: { language: 'en', changeLanguage: jest.fn() },
  }),
  Trans: ({ children }: any) => children,
}));

// Silence noisy console output in tests
const originalWarn = console.warn;
const originalError = console.error;
console.warn = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('zustand') || msg.includes('deprecated') || msg.includes('act(')) return;
  originalWarn(...args);
};
console.error = (...args: any[]) => {
  const msg = typeof args[0] === 'string' ? args[0] : '';
  if (msg.includes('act(') || msg.includes('Not implemented') || msg.includes('Error: Could not parse CSS')) return;
  originalError(...args);
};
