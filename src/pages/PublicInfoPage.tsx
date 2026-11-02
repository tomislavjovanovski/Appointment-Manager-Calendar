import { Mail, Menu, ShieldCheck, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import BrandLogo from '@/components/brand/BrandLogo';
import AboutFeatures from '@/components/brand/AboutFeatures';
import brand from '@/config/brand.json';
import { readRememberedLocale } from '@/i18n/storedLocale';
import { translate } from '@/i18n/dictionary';
import { cn } from '@/lib/utils';

const publicPaths = ['/about', '/faq', '/privacy', '/terms', '/contact'] as const;
const navigationPaths = ['/about', '/faq', '/contact'] as const;
const footerPaths = ['/privacy', '/terms'] as const;
const detailIds = {
  faq: ['features', 'mobile', 'reminders', 'import', 'accounts'],
  privacy: ['account', 'practice', 'purpose', 'storage', 'retention', 'rights', 'contact'],
  terms: ['access', 'permittedUse', 'responsibility', 'limits', 'changes'],
  contact: ['email', 'account', 'privacy', 'patientData'],
} as const;
type PublicPath = (typeof publicPaths)[number];

function getPath(pathname: string): PublicPath {
  const path = pathname.replace(/\/$/, '') || '/';
  return publicPaths.includes(path as PublicPath) ? path as PublicPath : '/faq';
}

export default function PublicInfoPage() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const locale = readRememberedLocale();
  const t = (key: string) => translate(locale, key);
  const path = getPath(location.pathname);
  const contentKey = path.slice(1);
  const title = path === '/about' ? brand.name : t(`public.${contentKey}.title`);
  const description = path === '/about'
    ? t('public.about.intro')
    : t(`public.${contentKey}.metaDescription`);
  const sections = detailIds[contentKey as keyof typeof detailIds];

  useEffect(() => {
    const pageTitle = path === '/about' ? brand.name : `${title} | ${brand.name}`;
    const setMetaContent = (selector: string, content: string) => {
      document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
    };

    document.title = pageTitle;
    document.documentElement.lang = locale;
    setMetaContent('meta[name="description"]', description);
    setMetaContent('meta[property="og:title"]', pageTitle);
    setMetaContent('meta[property="og:description"]', description);
    setMetaContent('meta[name="twitter:title"]', pageTitle);
    setMetaContent('meta[name="twitter:description"]', description);
    setMobileMenuOpen(false);
    return () => {
      document.title = brand.name;
      document.documentElement.lang = locale;
      setMetaContent('meta[name="description"]', brand.metaDescription);
      setMetaContent('meta[property="og:title"]', brand.name);
      setMetaContent('meta[property="og:description"]', brand.extendedDescription);
      setMetaContent('meta[name="twitter:title"]', brand.name);
      setMetaContent('meta[name="twitter:description"]', brand.extendedDescription);
    };
  }, [description, locale, path, title]);

  const navLinks = navigationPaths.map((page) => {
    const pageName = page.slice(1);
    return (
      <Link
        key={page}
        to={page}
        aria-current={path === page ? 'page' : undefined}
        className={cn(
          'inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors hover:bg-primary/5 hover:text-primary',
          path === page ? 'text-primary' : 'text-muted-foreground',
        )}
        onClick={() => setMobileMenuOpen(false)}
      >
        {t(`public.${pageName}.link`)}
      </Link>
    );
  });

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50/70 text-foreground dark:bg-background">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link to="/about" aria-label={brand.name} className="min-w-0">
            <BrandLogo variant="horizontal" size={40} wordmarkClassName="text-foreground" />
          </Link>

          <nav aria-label={t('public.navigationLabel')} className="hidden items-center gap-1 lg:flex">
            {navLinks}
          </nav>

          <Link
            to="/"
            className="hidden min-h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover lg:inline-flex"
          >
            {t('public.backToLogin')}
          </Link>

          <button
            type="button"
            aria-label={mobileMenuOpen ? t('public.closeMenu') : t('public.openMenu')}
            aria-expanded={mobileMenuOpen}
            aria-controls="public-mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-muted lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        <nav
          id="public-mobile-navigation"
          aria-label={t('public.navigationLabel')}
          className={cn(
            'border-t border-border bg-background px-4 py-3 lg:hidden',
            mobileMenuOpen ? 'block' : 'hidden',
          )}
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {navLinks}
            <Link
              to="/"
              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
              onClick={() => setMobileMenuOpen(false)}
            >
              {t('public.backToLogin')}
            </Link>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <section className={cn('mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-soft', path === '/about' && 'max-w-6xl')}>
          {path === '/about' ? (
            <AboutFeatures locale={locale} />
          ) : (
            <article className="p-5 sm:p-8 lg:p-10">
              <header className="flex items-start gap-4 border-b border-border pb-6 sm:pb-8">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {path === '/contact' ? <Mail className="h-5 w-5" aria-hidden="true" /> : <ShieldCheck className="h-5 w-5" aria-hidden="true" />}
                </div>
                <div className="min-w-0">
                  <p lang={locale} className="text-sm font-semibold text-primary">{t('auth.workspace')}</p>
                  <h1 className="mt-1 text-2xl font-semibold leading-tight tracking-tight text-heading sm:text-3xl">{title}</h1>
                </div>
              </header>

              <div className="mt-6 max-w-3xl space-y-5 text-sm leading-7 text-muted-foreground sm:mt-8 sm:text-base">
                <p>{t(`public.${contentKey}.intro`)}</p>
                <section aria-labelledby="public-section-heading" className="pt-2">
                  <h2 id="public-section-heading" className="text-lg font-semibold text-heading sm:text-xl">{t(`public.${contentKey}.sectionTitle`)}</h2>
                  <p className="mt-2">{t(`public.${contentKey}.sectionText`)}</p>
                </section>
                <div className="divide-y divide-border border-y border-border">
                  {sections.map((section) => (
                    <section key={section} className="py-5">
                      <h3 className="text-base font-semibold leading-6 text-heading">
                        {t(`public.${contentKey}.${section}.title`)}
                      </h3>
                      {section === 'email' ? (
                        <>
                          <p className="mt-2 text-sm leading-6 sm:text-[15px]">{t('public.contact.email.text')}</p>
                          <a
                            href={`mailto:${t('public.contact.email')}`}
                            className="inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline sm:text-[15px]"
                          >
                            {t('public.contact.email')}
                          </a>
                        </>
                      ) : (
                        <p className="mt-2 text-sm leading-6 sm:text-[15px]">
                          {t(`public.${contentKey}.${section}.text`)}
                        </p>
                      )}
                      {(section === 'contact' || section === 'email') && (
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          {t('public.contact.contactPerson')}
                        </p>
                      )}
                      {contentKey === 'privacy' && section === 'contact' && (
                        <a
                          href={`mailto:${t('public.contact.email')}`}
                          className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-primary underline-offset-4 hover:underline sm:text-[15px]"
                        >
                          {t('public.contact.email')}
                        </a>
                      )}
                    </section>
                  ))}
                </div>
              </div>
            </article>
          )}
        </section>
      </main>

      <footer className="border-t border-border bg-background">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-6 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <Link to="/about" aria-label={brand.name} className="w-fit">
            <BrandLogo variant="horizontal" size={32} wordmarkClassName="text-base text-foreground" />
          </Link>
          <nav aria-label={t('public.footerLabel')} className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
            {footerPaths.map((page) => {
              const pageName = page.slice(1);
              return (
                <Link
                  key={page}
                  to={page}
                  aria-current={path === page ? 'page' : undefined}
                  className="inline-flex min-h-9 items-center transition-colors hover:text-primary hover:underline"
                >
                  {t(`public.${pageName}.link`)}
                </Link>
              );
            })}
          </nav>
        </div>
      </footer>
    </div>
  );
}
