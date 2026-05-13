import { Calendar, Users, Settings, Stethoscope, Activity, CalendarRange } from 'lucide-react';
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
}

const navigation = [
  { id: 'dashboard', nameKey: 'sidebar.dashboard' as const, icon: Calendar, testId: 'nav-scheduler' },
  { id: 'patients', nameKey: 'sidebar.patients' as const, icon: Users, testId: 'nav-patients' },
  { id: 'settings', nameKey: 'sidebar.settings' as const, icon: Settings, testId: 'nav-settings' },
];

export function Sidebar({ activeTab, onTabChange, stats = [] }: SidebarProps) {
  const { t } = useI18n();
  return (
    <div className="flex w-64 flex-col border-r border-sidebar-border/80 bg-sidebar shadow-soft">
      {/* Header */}
      <div className="border-b border-sidebar-border/60 px-5 py-6">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-medical-purple shadow-sm ring-1 ring-white/25">
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight text-sidebar-foreground">
              {t('sidebar.appName')}
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
          <div className="mt-6 space-y-2.5 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              {t('sidebar.snapshot')}
            </p>
            <div className="space-y-2">
              {stats.map((stat, index) => {
                const Icon = index === 0 ? Users : index === 1 ? Activity : CalendarRange;
                return (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-sidebar-border/60 bg-sidebar-accent/35 px-3 py-3 shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[11px] font-medium text-muted-foreground">{stat.label}</p>
                        <p className="mt-1 text-xl font-semibold tracking-tight text-sidebar-foreground">
                          {stat.value}
                        </p>
                      </div>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background/80 text-primary shadow-sm">
                        <Icon className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
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
