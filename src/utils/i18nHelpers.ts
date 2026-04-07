import i18next from 'i18next';
import { useSettingsStore } from '../store/settings';

export const changeLanguage = (lang: 'en' | 'de') => {
  useSettingsStore.getState().setLanguage(lang);
  i18next.changeLanguage(lang);
};

export const getSavedLanguage = (): 'en' | 'de' | null =>
  useSettingsStore.getState().language ?? null;
