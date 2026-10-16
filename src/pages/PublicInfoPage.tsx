import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import ITerminLogo from '@/components/brand/ITerminLogo';
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

  return (
    <main className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-50 px-3 py-3 sm:px-6 sm:py-4">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-44 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -right-40 h-[30rem] w-[30rem] rounded-full bg-violet-100/60 blur-3xl" />

      <section className="relative flex w-full max-w-5xl flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] lg:h-[650px]">
        <div className="flex items-center justify-between p-6 xl:p-8">
          <Link to="/" aria-label={t('public.backToLogin')} className="shrink-0">
            <ITerminLogo variant="horizontal" size={44} wordmarkClassName="text-slate-900" />
          </Link>
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-primary">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            {t('public.backToLogin')}
          </Link>
        </div>

        <article className="flex-1 p-6 xl:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-primary">
              {path === '/contact' ? <Mail className="h-5 w-5" aria-hidden="true" /> : <ShieldCheck className="h-5 w-5" aria-hidden="true" />}
            </div>
            <div>
              <p className="text-sm font-medium text-primary">iTermin</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{t(`public.${contentKey}.title`)}</h1>
            </div>
          </div>

          <div className="mt-8 space-y-5 text-[15px] leading-7 text-slate-600">
            <p>{t(`public.${contentKey}.intro`)}</p>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              {t('public.placeholder')}
            </div>
            <h2 className="pt-2 text-lg font-semibold text-slate-900">{t(`public.${contentKey}.sectionTitle`)}</h2>
            <p>{t(`public.${contentKey}.sectionText`)}</p>
          </div>
        </article>

        <footer className="border-t border-slate-100 p-6 xl:p-8">
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
