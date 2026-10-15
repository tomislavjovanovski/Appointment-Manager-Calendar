import type { AppLocale } from './types';

const STORAGE_KEY = 'medical.locale';

export function readRememberedLocale(): AppLocale {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'mk' ? 'mk' : 'en';
  } catch {
    return 'en';
  }
}

export function rememberLocale(locale: AppLocale) {
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Storage can be unavailable (private mode); the login page then falls back to English.
  }
}
