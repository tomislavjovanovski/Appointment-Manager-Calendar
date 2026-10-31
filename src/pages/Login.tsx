import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarDays,
  Clock3,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import BrandLogo from '@/components/brand/BrandLogo';
import brand from '@/config/brand.json';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/auth/AuthProvider';
import { LoginError } from '@/lib/auth';
import { translate } from '@/i18n/dictionary';
import { readRememberedLocale } from '@/i18n/storedLocale';
import { cn } from '@/lib/utils';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FieldErrors = { email?: string; password?: string };

export default function Login() {
  const { login, retry, sessionExpired, status } = useAuth();
  // Settings (and the clinic's language) are protected, so use the language remembered on this device.
  const [locale] = useState(readRememberedLocale);
  const t = (key: string, vars?: Record<string, string | number>) => translate(locale, key, vars);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    document.title = brand.name;
    document.documentElement.lang = locale;
  }, [locale]);

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {};
    const trimmed = email.trim();
    if (!trimmed) errors.email = t('auth.emailRequired');
    else if (!EMAIL_PATTERN.test(trimmed)) errors.email = t('auth.emailInvalid');
    if (!password) errors.password = t('auth.passwordRequired');
    return errors;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;

    const errors = validate();
    setFieldErrors(errors);
    setFormError(null);
    if (errors.email) {
      emailRef.current?.focus();
      return;
    }
    if (errors.password) {
      passwordRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (error) {
      const status = error instanceof LoginError ? error.status : 500;
      if (status === 401 || status === 400) {
        setFormError(t('auth.invalidCredentials'));
        setPassword('');
        passwordRef.current?.focus();
      } else if (status === 429) {
        const seconds = error instanceof LoginError ? error.retryAfterSeconds ?? 900 : 900;
        setFormError(t('auth.rateLimited', { minutes: Math.max(1, Math.ceil(seconds / 60)) }));
      } else if (status === 0) {
        setFormError(t('auth.networkError'));
      } else {
        setFormError(t('auth.serverError'));
      }
      setSubmitting(false);
    }
  };

  const sessionError = status === 'error';
  const notice = formError ?? (sessionExpired ? t('auth.sessionExpired') : sessionError ? t('auth.networkError') : null);

  return (
    <main className="login-page relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-50 px-3 py-3 sm:px-6 sm:py-4 dark:bg-background">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 -top-44 h-96 w-96 rounded-full bg-blue-100/70 blur-3xl dark:bg-blue-950/30" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-48 -right-40 h-[30rem] w-[30rem] rounded-full bg-violet-100/60 blur-3xl dark:bg-violet-950/20" />

      <section className="login-card relative grid w-full max-w-5xl overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_24px_80px_-32px_rgba(15,23,42,0.24)] dark:border-border dark:bg-card lg:h-[650px] lg:grid-cols-[1.03fr_0.97fr]">
        <aside className="login-preview relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-blue-700 via-blue-700 to-indigo-800 p-6 text-white lg:flex xl:p-8">
          <div aria-hidden="true" className="login-calendar-pattern pointer-events-none absolute -right-14 -top-10 h-60 w-[21rem] rotate-12 rounded-2xl border border-white/15">
            <div className="absolute inset-x-0 top-0 h-12 rounded-t-2xl border-b border-white/15 bg-white/5" />
            <span className="absolute left-24 top-24 h-12 w-12 rounded-lg border border-white/20 bg-white/10" />
            <span className="absolute left-48 top-36 h-12 w-24 rounded-lg border border-white/15 bg-white/5" />
            <span className="absolute left-72 top-12 h-12 w-12 rounded-lg border border-white/20 bg-white/10" />
          </div>
          <div aria-hidden="true" className="login-calendar-pattern pointer-events-none absolute -bottom-12 -left-20 h-48 w-[21rem] -rotate-12 rounded-2xl border border-white/10 opacity-50">
            <span className="absolute left-24 top-12 h-12 w-24 rounded-lg border border-white/20 bg-white/10" />
            <span className="absolute left-60 top-24 h-12 w-12 rounded-lg border border-white/15 bg-white/5" />
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-40 -left-36 h-96 w-96 rounded-full bg-indigo-500/30 blur-3xl" />

          <div className="relative">
            <BrandLogo variant="horizontal" tone="inverse" size={52} className="gap-3 text-white" wordmarkClassName="text-2xl" />

            <div className="mt-6 max-w-md" lang={locale}>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium tracking-wide text-blue-50">
                {t('auth.workspace')}
              </p>
              <h2 className="text-3xl font-semibold leading-[1.15] tracking-tight">
                {t('auth.workspaceHeadline')}
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-5 text-blue-100/90">
                {t('auth.workspaceDescription')}
              </p>
            </div>
          </div>

          <div className="relative mt-5 rounded-2xl border border-white/20 bg-white p-4 text-slate-900 shadow-2xl shadow-indigo-950/20 dark:bg-card dark:text-card-foreground">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">{t('auth.schedulePreview')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('auth.appointmentsToday')}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
            <div className="space-y-2">
              {[
                { time: '09:00', label: t('auth.schedulePatientOne'), tone: 'bg-blue-500' },
                { time: '10:30', label: t('auth.schedulePatientTwo'), tone: 'bg-violet-500' },
                { time: '12:00', label: t('auth.schedulePatientThree'), tone: 'bg-teal-500' },
              ].map((item) => (
                <div key={item.time} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-2 dark:bg-muted/50">
                  <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{item.time}</span>
                  <span className={`h-6 w-1 shrink-0 rounded-full ${item.tone}`} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700 dark:text-foreground">{item.label}</span>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-4 border-t border-border pt-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {t('dashboard.weeklySchedule')}</span>
              <span className="inline-flex items-center gap-1.5"><UsersRound className="h-3.5 w-3.5" aria-hidden="true" /> {t('sidebar.patients')}</span>
            </div>
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 text-xs text-blue-100/90">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
              {t('auth.secureAccess')}
            </div>
            <nav aria-label={t('public.footerLabel')} className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-xs text-blue-100/90">
              {[
                ['faq', t('public.faq.link')],
                ['privacy', t('public.privacy.link')],
                ['terms', t('public.terms.link')],
                ['contact', t('public.contact.link')],
              ].map(([path, label]) => (
                <Link key={path} to={`/${path}`} className="transition-colors hover:text-white hover:underline">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </aside>

        <div className="login-form-panel flex min-w-0 flex-col justify-center px-5 py-5 sm:px-10 sm:py-7 lg:px-10 xl:px-14">
          <div className="login-mobile-brand mb-4 flex flex-col items-start gap-2 lg:hidden" lang={locale}>
            <BrandLogo variant="horizontal" size={44} className="gap-3" wordmarkClassName="text-[clamp(1rem,4.5vw,1.5rem)] text-foreground" />
            <p className="text-sm font-medium text-primary">{t('auth.workspace')}</p>
          </div>

          <div className="mb-5">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('auth.title')}</h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{t('auth.signInPrompt')}</p>
          </div>

          <form
            noValidate
            onSubmit={handleSubmit}
            className="space-y-4"
            aria-busy={submitting}
            data-testid="login-form"
          >
            {notice && (
              <div
                role="alert"
                data-testid="login-error"
                className={cn(
                  'rounded-xl border px-3.5 py-3 text-sm',
                  formError || sessionError
                    ? 'border-destructive/30 bg-destructive/10 text-destructive'
                    : 'border-primary/25 bg-primary/5 text-foreground',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span>{notice}</span>
                  {sessionError && !formError && (
                    <Button type="button" variant="outline" size="sm" onClick={retry}>
                      <RefreshCw className="mr-2 h-3.5 w-3.5" />
                      {t('settings.retry')}
                    </Button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="login-email">{t('auth.email')}</Label>
              <Input
                ref={emailRef}
                id="login-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoFocus
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                disabled={submitting}
                className="h-11 rounded-xl bg-white px-3.5 text-base shadow-sm transition-shadow focus-visible:shadow-md dark:bg-background sm:h-12 md:text-sm"
              />
              {fieldErrors.email && (
                <p id="login-email-error" className="text-xs text-destructive">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">{t('auth.password')}</Label>
              <div className="relative">
                <Input
                  ref={passwordRef}
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                  disabled={submitting}
                  className="h-11 rounded-xl bg-white px-3.5 pr-12 text-base shadow-sm transition-shadow focus-visible:shadow-md dark:bg-background sm:h-12 md:text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  aria-pressed={showPassword}
                  aria-controls="login-password"
                  disabled={submitting}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p id="login-password-error" className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            <Button type="submit" className="h-11 w-full rounded-xl text-sm font-semibold shadow-md shadow-primary/20 transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25 sm:h-12" disabled={submitting} data-testid="login-submit">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  {t('auth.submitting')}
                </>
              ) : (
                t('auth.submit')
              )}
            </Button>
          </form>

          <div className="login-footer mt-4 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground lg:justify-start">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t('auth.secureAccess')}
          </div>
        </div>
      </section>
    </main>
  );
}
