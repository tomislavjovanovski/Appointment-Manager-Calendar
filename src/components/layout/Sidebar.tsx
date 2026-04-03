import { Calendar, Users, Settings, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/i18n';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigation = [
  { id: 'dashboard', nameKey: 'sidebar.dashboard' as const, icon: Calendar },
  { id: 'patients', nameKey: 'sidebar.patients' as const, icon: Users },
  { id: 'settings', nameKey: 'sidebar.settings' as const, icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
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