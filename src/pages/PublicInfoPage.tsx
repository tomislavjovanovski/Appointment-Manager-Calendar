import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import BrandLogo from '@/components/brand/BrandLogo';
import brand from '@/config/brand.json';
import { readRememberedLocale } from '@/i18n/storedLocale';
import { translate } from '@/i18n/dictionary';

const publicPaths = ['/faq', '/privacy', '/terms', '/contact'] as const;
type PublicPath = (typeof publicPaths)[number];

function getPath(pathname: string): PublicPath {
  const path = pathname.replace(/\/$/, '') || '/';
  return publicPaths.includes(path as PublicPath) ? path as PublicPath : '/faq';
}

export default function PublicInfoPage() {
  const location = useLocation();
  const locale = readRememberedLocale();
  const t = (key: string) => translate(locale, key);
  const path = getPath(location.pathname);
  const contentKey = path.slice(1);

  useEffect(() => {
    document.title = brand.name;
    document.documentElement.lang = locale;
  }, [locale]);

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center bg-muted/40 px-3 py-3 sm:px-6 sm:py-4">
      <section className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft lg:min-h-[650px]">
        <div className="flex flex-wrap items-center justify-between gap-4 p-6 xl:p-8">
          <Link to="/" aria-label={t('public.backToLogin')} className="min-w-0">
            <BrandLogo variant="horizontal" size={44} wordmarkClassName="text-foreground" />
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('public.backToLogin')}
          </Link>
        </div>

        <article className="flex-1 p-6 xl:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              {path === '/contact' ? <Mail className="h-5 w-5" aria-hidden="true" /> : <ShieldCheck className="h-5 w-5" aria-hidden="true" />}
            </div>
            <div>
              <p lang={locale} className="text-sm font-medium text-primary">{t('auth.workspace')}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">{t(`public.${contentKey}.title`)}</h1>
            </div>
          </div>

          <div className="mt-8 space-y-5 text-[15px] leading-7 text-muted-foreground">
            <p>{t(`public.${contentKey}.intro`)}</p>
            <div className="rounded-2xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm leading-6 text-foreground">
              {t('public.placeholder')}
            </div>
            <h2 className="pt-2 text-lg font-semibold text-foreground">{t(`public.${contentKey}.sectionTitle`)}</h2>
            <p>{t(`public.${contentKey}.sectionText`)}</p>
          </div>
        </article>

        <footer className="border-t border-border p-6 xl:p-8">
          <nav aria-label={t('public.footerLabel')} className="flex flex-wrap justify-start gap-x-4 gap-y-2 text-xs text-muted-foreground">
            {[
              ['faq', t('public.faq.link')],
              ['privacy', t('public.privacy.link')],
              ['terms', t('public.terms.link')],
              ['contact', t('public.contact.link')],
            ].map(([page, label]) => (
              <Link key={page} to={`/${page}`} className="transition-colors hover:text-primary hover:underline">
                {label}
              </Link>
            ))}
          </nav>
        </footer>
      </section>
    </main>
  );
}
