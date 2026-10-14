import { Calendar, Users, Settings, Stethoscope, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

interface SidebarStat {
  label: string;
  value: number;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  stats?: SidebarStat[];
  patientStats?: SidebarStat[];
  patientStatsError?: boolean;
  className?: string;
  brandName?: string;
  logoDataUrl?: string;
  overviewLoading?: boolean;
  overviewError?: boolean;
  onOverviewRetry?: () => void;
}

const navigation = [
  { id: 'dashboard', nameKey: 'sidebar.dashboard' as const, icon: Calendar, testId: 'nav-scheduler' },
  { id: 'patients', nameKey: 'sidebar.patients' as const, icon: Users, testId: 'nav-patients' },
  { id: 'settings', nameKey: 'sidebar.settings' as const, icon: Settings, testId: 'nav-settings' },
];

export function Sidebar({ activeTab, onTabChange, stats = [], className, brandName, logoDataUrl,
  overviewLoading, overviewError, onOverviewRetry, patientStats = [], patientStatsError }: Readonly<SidebarProps>) {
  const { t } = useI18n();
  return (
    <div className={cn('flex w-64 flex-col border-r border-sidebar-border/80 bg-sidebar shadow-soft', className)}>
      {/* Header */}
      <div className="border-b border-sidebar-border/60 px-5 py-6">
        <div className="flex items-center gap-3.5">
          {logoDataUrl ? (
            <img src={logoDataUrl} alt="" className="h-11 w-11 shrink-0 object-contain" />
          ) : (
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-medical-purple shadow-sm ring-1 ring-white/25">
              <Stethoscope className="h-5 w-5 text-primary-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="break-words text-lg font-semibold text-sidebar-foreground">
              {brandName || t('sidebar.appName')}
            </h1>
            <p className="truncate text-xs font-medium text-muted-foreground">{t('sidebar.appSubtitle')}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5">
        <p className="mb-2.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
          {t('sidebar.menu')}
        </p>
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <Button
                key={item.id}
                variant="ghost"
                data-testid={item.testId}
                className={cn(
                  'h-11 w-full justify-start rounded-xl text-left text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/15 hover:bg-primary hover:text-primary-foreground'
                    : 'text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className={cn('mr-3 h-[18px] w-[18px] shrink-0', isActive ? 'opacity-100' : 'opacity-90')} />
                {t(item.nameKey)}
              </Button>
            );
          })}
        </div>

        {stats.length > 0 && (
          <section className="mt-5 border-t border-sidebar-border/60 pt-4" aria-label={t('sidebar.appointmentStats')} data-testid="appointment-stats">
            <h2 className="mb-2 px-2 text-sm font-semibold">{t('sidebar.appointmentStats')}</h2>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 px-2">
              {stats.map((stat) => (
                <div key={stat.label} className="min-w-0">
                  <dt className="text-[11px] text-muted-foreground">{stat.label}</dt>
                  <dd className="mt-1 text-lg font-semibold tabular-nums text-sidebar-foreground">
                    {overviewLoading || overviewError ? '--' : stat.value}
                  </dd>
                </div>
              ))}
            </dl>
            {!overviewLoading && overviewError && onOverviewRetry && (
              <div className="mt-3 space-y-2 px-2">
                <p role="alert" className="text-xs text-destructive">{t('sidebar.overviewFailed')}</p>
                <Button type="button" variant="outline" size="sm" onClick={onOverviewRetry}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  {t('settings.retry')}
                </Button>
              </div>
            )}
          </section>
        )}
        {patientStats.length > 0 && (
          <section className="mt-4 border-t border-sidebar-border/60 px-2 pt-3" aria-label={t('sidebar.patientStats')}>
            <h2 className="mb-2 text-sm font-semibold">{t('sidebar.patientStats')}</h2>
            <dl className="space-y-2">
              {patientStats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between gap-2 text-xs">
                  <dt className="text-muted-foreground">{stat.label}</dt>
                  <dd className="font-semibold tabular-nums">{overviewLoading || patientStatsError ? '--' : stat.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border/60 px-4 py-4">
        <div className="rounded-xl border border-sidebar-border/50 bg-sidebar-accent/30 px-3 py-2.5 text-center text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-medium">{t('sidebar.footer1')}</p>
          <p className="mt-0.5 opacity-90">{t('sidebar.footer2')}</p>
        </div>
      </div>
    </div>
  );
}
