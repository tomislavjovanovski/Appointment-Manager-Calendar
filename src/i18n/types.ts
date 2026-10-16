export type AppLocale = 'en' | 'mk';

export const DEFAULT_LOCALE: AppLocale = 'mk';

export function normalizeLocale(locale: unknown): AppLocale {
	return locale === 'en' ? 'en' : DEFAULT_LOCALE;
}
