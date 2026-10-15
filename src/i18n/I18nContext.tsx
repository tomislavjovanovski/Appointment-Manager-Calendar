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
import type { AppointmentSettings } from '@/types/appointment';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
import type { AppLocale } from './types';
import { translate } from './dictionary';
import { rememberLocale } from './storedLocale';

type I18nContextValue = {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
  dateFnsLocale: Locale;
  initialSettings: AppointmentSettings | null;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('en');
  const [initialSettings, setInitialSettings] = useState<AppointmentSettings | null>(null);
  const [settingsError, setSettingsError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let isMounted = true;
    setSettingsError(false);
    settingsStorage
      .get()
      .then((s) => {
        if (!isMounted) return;
        setLocaleState(s.locale === 'mk' ? 'mk' : 'en');
        document.title = s.practiceName?.trim() || 'ClinicCalendar';
        setInitialSettings(s);
      })
      .catch(() => {
        if (isMounted) setSettingsError(true);
      });
    return () => { isMounted = false; };
  }, [retry]);

  useEffect(() => {
    document.documentElement.lang = locale === 'mk' ? 'mk' : 'en';
    // Remembered so the login page can use the clinic's language before settings are readable.
    rememberLocale(locale);
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
    () => ({ locale, setLocale, t, dateFnsLocale, initialSettings }),
    [locale, setLocale, t, dateFnsLocale, initialSettings]
  );

  if (!initialSettings) return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="flex flex-col items-center gap-3" role={settingsError ? 'alert' : 'status'}>
        {settingsError ? (
          <>
            <p className="text-sm text-destructive">{t('settings.startupFailed')}</p>
            <Button variant="outline" onClick={() => {
              setSettingsError(false);
              setRetry((current) => current + 1);
            }}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('settings.retry')}
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{t('settings.startupLoading')}</p>
          </>
        )}
      </div>
    </main>
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
