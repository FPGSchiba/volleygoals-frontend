import i18next from 'i18next';

const LANG_KEY = 'vg_lang';

export const changeLanguage = (lang: 'en' | 'de') => {
  localStorage.setItem(LANG_KEY, lang);
  i18next.changeLanguage(lang);
};

export const getSavedLanguage = (): 'en' | 'de' | null =>
  localStorage.getItem(LANG_KEY) as 'en' | 'de' | null;
