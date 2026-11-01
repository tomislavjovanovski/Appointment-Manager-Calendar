import { ArrowRight, BarChart3, CalendarDays, CalendarPlus, Check, Clock3, History, Laptop, SlidersHorizontal, Upload, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonVariants } from '@/components/ui/button';
import brand from '@/config/brand.json';
import { translate } from '@/i18n/dictionary';
import type { AppLocale } from '@/i18n/types';
import { cn } from '@/lib/utils';

const features = [
  { key: 'calendar', icon: CalendarDays },
  { key: 'patients', icon: UsersRound },
  { key: 'booking', icon: CalendarPlus },
  { key: 'history', icon: History },
  { key: 'statistics', icon: BarChart3 },
  { key: 'devices', icon: Laptop },
  { key: 'import', icon: Upload },
  { key: 'settings', icon: SlidersHorizontal },
  { key: 'simplicity', icon: Check },
] as const;

export default function AboutFeatures({ locale }: Readonly<{ locale: AppLocale }>) {
  const t = (key: string) => translate(locale, key);

  return (
    <article className="px-5 pb-6 sm:px-8 sm:pb-8 xl:px-10" data-testid="about-features">
      <header className="border-t border-border pt-8 sm:pt-10">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#244DDE] dark:text-blue-400">{t('public.about.eyebrow')}</p>
        <h1 className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight text-[#183153] dark:text-foreground sm:text-4xl lg:text-5xl">
          <span lang="mk" className="mb-2 block text-[#244DDE] dark:text-blue-400">{brand.name}</span>
          {t('public.about.headline')}
        </h1>
        <p className="mt-5 text-lg font-medium text-[#183153] dark:text-foreground sm:text-xl">{t('public.about.tagline')}</p>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{t('public.about.intro')}</p>
        <a href="#features" className={cn(buttonVariants({ variant: 'outline' }), 'mt-5 gap-2 border-[#244DDE]/25 text-[#244DDE] dark:text-blue-400')}>
          {t('public.about.explore')}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </a>
      </header>

      <figure className="mt-8 overflow-hidden rounded-xl border border-border bg-muted/30 shadow-soft sm:mt-10">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3 text-sm font-medium text-[#183153] dark:text-foreground">
          <CalendarDays className="h-4 w-4 text-[#244DDE] dark:text-blue-400" aria-hidden="true" />
          {t('public.about.previewTitle')}
        </div>
        <img
          src={`${import.meta.env.BASE_URL}about-calendar.png`}
          alt={t('public.about.previewAlt')}
          width={1262}
          height={628}
          className="block h-auto w-full"
          decoding="async"
        />
        <figcaption className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground">{t('public.about.previewCaption')}</figcaption>
      </figure>

      <section id="features" aria-labelledby="features-heading" className="scroll-mt-6 pt-10 sm:pt-12">
        <h2 id="features-heading" className="text-2xl font-semibold tracking-tight text-[#183153] dark:text-foreground">{t('public.about.featuresTitle')}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('public.about.featuresIntro')}</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3" data-testid="about-feature-grid">
          {features.map(({ key, icon: Icon }) => (
            <li key={key} className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[#244DDE]/[0.07] text-[#244DDE] dark:bg-blue-400/10 dark:text-blue-400">
                <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <h3 className="text-base font-semibold leading-6 text-[#183153] dark:text-foreground">{t(`public.about.${key}.title`)}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t(`public.about.${key}.description`)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 flex flex-col items-start gap-5 rounded-xl border border-[#244DDE]/15 bg-[#244DDE]/[0.04] p-5 sm:mt-10 sm:flex-row sm:items-center sm:justify-between sm:p-6" aria-labelledby="about-closing-heading">
        <div className="max-w-2xl">
          <h2 id="about-closing-heading" className="flex items-start gap-2 text-lg font-semibold text-[#183153] dark:text-foreground">
            <Clock3 className="mt-1 h-5 w-5 shrink-0 text-[#244DDE] dark:text-blue-400" aria-hidden="true" />
            {t('public.about.closingTitle')}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('public.about.closingText')}</p>
        </div>
        <Link to="/" className={cn(buttonVariants(), 'shrink-0 gap-2 bg-[#244DDE] text-white hover:bg-[#183153]')}>
          {t('auth.submit')}<ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </article>
  );
}
