import { DEFAULT_LOCALE, normalizeLocale, type AppLocale } from './types';

const STORAGE_KEY = 'medical.locale';

export function readRememberedLocale(): AppLocale {
  try {
    return normalizeLocale(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function rememberLocale(locale: AppLocale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable (private mode); the login page then uses the default locale.
  }
}
