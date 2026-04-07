import { useSettingsStore, getInitialTheme, getInitialLanguage } from '../../store/settings';

beforeEach(() => {
  localStorage.clear();
  // Reset store to defaults between tests
  useSettingsStore.setState({ theme: 'dark', language: 'en' });
});

describe('useSettingsStore', () => {
  it('has default theme of dark', () => {
    expect(useSettingsStore.getState().theme).toBe('dark');
  });

  it('has default language of en', () => {
    expect(useSettingsStore.getState().language).toBe('en');
  });

  it('setTheme updates theme state', () => {
    useSettingsStore.getState().setTheme('light');
    expect(useSettingsStore.getState().theme).toBe('light');
  });

  it('setLanguage updates language state', () => {
    useSettingsStore.getState().setLanguage('de');
    expect(useSettingsStore.getState().language).toBe('de');
  });

  it('theme persists to localStorage under vg-settings', () => {
    useSettingsStore.getState().setTheme('light');
    const raw = localStorage.getItem('vg-settings');
    expect(raw).not.toBeNull();
    const stored = JSON.parse(raw!);
    expect(stored.state.theme).toBe('light');
  });

  it('language persists to localStorage under vg-settings', () => {
    useSettingsStore.getState().setLanguage('de');
    const raw = localStorage.getItem('vg-settings');
    const stored = JSON.parse(raw!);
    expect(stored.state.language).toBe('de');
  });

  it('migrates old theme key from localStorage on first load', () => {
    localStorage.setItem('theme', 'light');
    localStorage.removeItem('vg-settings');
    expect(getInitialTheme()).toBe('light');
  });

  it('migrates old vg_lang key from localStorage on first load', () => {
    localStorage.setItem('vg_lang', 'de');
    localStorage.removeItem('vg-settings');
    expect(getInitialLanguage()).toBe('de');
  });
});
