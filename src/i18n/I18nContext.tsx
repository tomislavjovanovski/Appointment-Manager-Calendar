import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Locale } from 'date-fns';
import { enUS, mk } from 'date-fns/locale';
import { settingsStorage } from '@/lib/storage';
import type { AppLocale } from './types';
import { translate } from './dictionary';

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dateFnsLocale: Locale;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('en');

  useEffect(() => {
    settingsStorage
      .get()
      .then((s) => {
        setLocaleState(s.locale === 'mk' ? 'mk' : 'en');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === 'mk' ? 'mk' : 'en';
  }, [locale]);

  const setLocale = useCallback((l: AppLocale) => {
    setLocaleState(l === 'mk' ? 'mk' : 'en');
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars),
    [locale]
  );

  const dateFnsLocale = useMemo<Locale>(() => (locale === 'mk' ? mk : enUS), [locale]);

  const value = useMemo(
    () => ({ locale, setLocale, t, dateFnsLocale }),
    [locale, setLocale, t, dateFnsLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
