import BrandLogo from '@/components/brand/BrandLogo';
import brand from '@/config/brand.json';
import { Calendar, CalendarDays, CalendarRange, Users, Settings, RefreshCw, LogOut, PanelLeftClose, PanelLeftOpen, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';
import { useAuth } from '@/auth/AuthProvider';
import { APPOINTMENT_TYPES, APPOINTMENT_TYPE_VALUES } from '@/lib/appointmentTypes';
import { useToast } from '@/hooks/use-toast';

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
  showNavigation?: boolean;
}

export const APP_NAVIGATION = [
  { id: 'dashboard', nameKey: 'sidebar.dashboard' as const, icon: Calendar, testId: 'nav-scheduler' },
  { id: 'patients', nameKey: 'sidebar.patients' as const, icon: Users, testId: 'nav-patients' },
  { id: 'statistics', nameKey: 'sidebar.statistics' as const, icon: BarChart3, testId: 'nav-statistics' },
  { id: 'settings', nameKey: 'sidebar.settings' as const, icon: Settings, testId: 'nav-settings' },
];

export function SidebarToggle({ collapsed, className, showLabel = false }: Readonly<{
  collapsed: boolean;
  className?: string;
  showLabel?: boolean;
}>) {
  const { t } = useI18n();
  const { saveSidebarCollapsed, savingSidebarPreference } = useAuth();
  const { toast } = useToast();
  const toggleSidebar = async () => {
    try {
      await saveSidebarCollapsed(!collapsed);
    } catch {
      toast({ title: t('settings.saveErrorTitle'), description: t('settings.sidebarSaveError'), variant: 'destructive' });
    }
  };
  return (
    <Button type="button" variant="ghost" size="sm"
      className={cn('h-8 gap-2 text-xs hover:bg-primary/10', className)}
      onClick={() => { void toggleSidebar(); }} disabled={savingSidebarPreference}
      aria-label={t(collapsed ? 'sidebar.expand' : 'sidebar.collapse')}
      title={t(collapsed ? 'sidebar.expand' : 'sidebar.collapse')}
      aria-expanded={!collapsed} data-testid="sidebar-toggle">
      {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
      {showLabel && t('sidebar.collapse')}
    </Button>
  );
}

export function Sidebar({ activeTab, onTabChange, stats = [], className, brandName, logoDataUrl,
  overviewLoading, overviewError, onOverviewRetry, patientStats = [], patientStatsError, showNavigation = true }: Readonly<SidebarProps>) {
  const { t } = useI18n();
  const { user, logout } = useAuth();
  const collapsed = !showNavigation && user?.preferences?.desktopSidebarCollapsed === true;
  const compact = !showNavigation;
  const practiceName = brandName?.trim();
  const hasCustomBrand = Boolean(practiceName && practiceName !== brand.name);
  if (compact && collapsed) {
    return <div data-testid="desktop-sidebar" data-collapsed="true" className={cn('w-0 shrink-0 overflow-hidden', className)} />;
  }
  return (
    <div data-testid={showNavigation ? 'mobile-sidebar' : 'desktop-sidebar'} data-collapsed={collapsed} className={cn('flex shrink-0 flex-col border-r border-sidebar-border/80 bg-sidebar text-sidebar-foreground shadow-soft', collapsed ? 'w-14' : 'w-[200px]', compact && 'border-border/60 bg-background shadow-none', compact && !collapsed && 'w-[80px]', className)}>
      {/* Header */}
      <div className={cn('border-b border-sidebar-border/60 bg-sidebar-accent/30 py-4', collapsed ? 'px-2' : 'px-3', compact && 'flex flex-col items-center bg-background px-2 py-3')}>
        {!compact && (hasCustomBrand ? (
          <div className="flex items-center gap-2" data-testid="sidebar-practice-brand">
            {logoDataUrl ? (
              <img src={logoDataUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
            ) : (
              <BrandLogo variant="icon" size={collapsed ? 36 : 32} title={practiceName} />
            )}
            {!collapsed && !compact && (
              <div className="min-w-0">
                <span className="break-words text-xl font-semibold tracking-tight text-sidebar-foreground">{practiceName}</span>
                <p lang="mk" className="mt-1 break-words text-xs text-sidebar-foreground/80">{brand.name}</p>
              </div>
            )}
          </div>
        ) : (
          <div data-testid="sidebar-product-brand">
            <BrandLogo
              variant={collapsed || compact ? 'icon' : 'horizontal'}
              size={collapsed ? 36 : 32}
              title={brand.name}
              className="gap-2"
              wordmarkClassName="text-base text-sidebar-foreground"
            />
            {!collapsed && !compact && <p className="mt-2 text-[11px] font-medium leading-snug text-sidebar-foreground/80">{t('sidebar.appSubtitle')}</p>}
          </div>
        ))}
        {!showNavigation && (
          <SidebarToggle collapsed={collapsed} showLabel={!collapsed && !compact}
            className={cn(compact ? 'mt-0' : 'mt-3', collapsed || compact ? 'w-9 px-0' : 'w-full')} />
        )}
      </div>

      <div className={cn('min-h-0 flex-1 overflow-y-auto px-2.5 py-4', compact && 'px-2 py-3', collapsed && 'hidden')}>
        {showNavigation && (
          <nav aria-label={t('sidebar.menu')}>
            <p className="mb-2.5 px-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground">
              {t('sidebar.menu')}
            </p>
            <div className="space-y-1">
              {APP_NAVIGATION.map((item) => {
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
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                    onClick={() => onTabChange(item.id)}
                  >
                    <Icon className={cn('mr-3 h-[18px] w-[18px] shrink-0', isActive ? 'opacity-100' : 'opacity-90')} />
                    {t(item.nameKey)}
                  </Button>
                );
              })}
            </div>
          </nav>
        )}

        {stats.length > 0 && (
          <section className={cn(showNavigation && 'mt-5 border-t border-sidebar-border/60 pt-4')} aria-label={t('sidebar.appointmentStats')} data-testid="appointment-stats">
            <h2 className={cn('mb-2 px-2 text-sm font-semibold', compact && 'sr-only')}>{t('sidebar.appointmentStats')}</h2>
            <dl className={cn('grid grid-cols-2 gap-2', compact && 'grid-cols-1 gap-3')}>
              {stats.map((stat, index) => {
                const StatIcon = [Calendar, CalendarRange, CalendarDays, BarChart3][index % 4];
                return (
                  <div key={stat.label} className={cn('min-w-0 rounded-xl border border-sidebar-border/80 bg-primary/5 px-3 py-2.5', compact && 'rounded-lg border-primary/10 px-1.5 py-3 text-center')}>
                    {compact && <StatIcon className="mx-auto mb-1.5 h-3.5 w-3.5 text-primary/80" aria-hidden="true" />}
                    <dt className={cn('min-h-8 text-[11px] font-medium leading-4 text-sidebar-foreground', compact && 'min-h-0')}>{stat.label}</dt>
                    <dd className={cn('mt-1 text-2xl font-semibold leading-none tabular-nums text-primary', compact && 'mt-2')}>
                      {overviewLoading || overviewError ? '--' : stat.value}
                    </dd>
                  </div>
                );
              })}
            </dl>
            {!overviewLoading && overviewError && onOverviewRetry && (
              <div className="mt-3 space-y-2 px-2">
                <p role="alert" className="text-xs text-destructive">{t('sidebar.overviewFailed')}</p>
                <Button type="button" variant="outline" size="sm" onClick={onOverviewRetry} aria-label={t('settings.retry')} title={t('settings.retry')}>
                  <RefreshCw className={cn('h-3.5 w-3.5', !compact && 'mr-2')} />
                  {!compact && t('settings.retry')}
                </Button>
              </div>
            )}
          </section>
        )}
        {!compact && patientStats.length > 0 && (
          <section className="mt-4 border-t border-sidebar-border/60 px-2 pt-3" aria-label={t('sidebar.patientStats')}>
            <h2 className="mb-2 text-sm font-semibold">{t('sidebar.patientStats')}</h2>
            <dl className="space-y-2">
              {patientStats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between gap-2 text-xs">
                  <dt className="text-sidebar-foreground">{stat.label}</dt>
                  <dd className="font-semibold tabular-nums">{overviewLoading || patientStatsError ? '--' : stat.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {!compact && <section className="mt-4 border-t border-sidebar-border/60 pt-3" aria-label={t('dashboard.appointmentTypes')} data-testid="appointment-type-legend">
          <h2 className="mb-2 px-2 text-sm font-semibold">{t('dashboard.appointmentTypes')}</h2>
          <dl className="space-y-1.5">
            {APPOINTMENT_TYPE_VALUES.map((type) => (
              <div key={type} className="flex items-start gap-2 rounded-lg border border-sidebar-border/80 bg-sidebar-accent/20 px-2 py-1.5">
                <span
                  className="mt-0.5 h-4 w-4 shrink-0 rounded-md border border-white/70 shadow-sm"
                  style={{ backgroundColor: APPOINTMENT_TYPES[type].color, boxShadow: `0 0 0 2px ${APPOINTMENT_TYPES[type].color}33` }}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <dt className="text-xs font-semibold leading-snug">{t(APPOINTMENT_TYPES[type].labelKey)}</dt>
                  <dd className="mt-0.5 text-[11px] leading-relaxed text-sidebar-foreground">{t(APPOINTMENT_TYPES[type].descriptionKey)}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>}
      </div>
      {user ? (
        <section className={cn('shrink-0 border-t border-sidebar-border/60 bg-sidebar-accent/30 py-3', collapsed ? 'mt-auto px-2' : 'px-3')} aria-label={t('sidebar.signedInAs')}>
          <div className="flex flex-col gap-2">
            {!collapsed && !compact && <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground">{t('sidebar.signedInAs')}</p>
              <p className="truncate text-xs font-medium text-sidebar-foreground" title={user.email}>{user.email}</p>
            </div>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-full shrink-0 rounded-lg bg-background/70 text-xs"
              onClick={() => { void logout(); }}
              data-testid="logout-button"
              aria-label={t('sidebar.logout')}
              title={t('sidebar.logout')}
            >
              <LogOut className={cn('h-3.5 w-3.5', !collapsed && !compact && 'mr-1.5')} />
              {!collapsed && !compact && t('sidebar.logout')}
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
