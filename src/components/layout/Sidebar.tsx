import { Calendar, Users, Settings, Stethoscope } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NotificationManager } from '@/components/notifications/NotificationManager';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navigation = [
  { id: 'dashboard', name: 'Dashboard', icon: Calendar },
  { id: 'patients', name: 'Patients', icon: Users },
  { id: 'settings', name: 'Settings', icon: Settings },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-medical-purple rounded-xl flex items-center justify-center">
            <Stethoscope className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-foreground">MediCal</h1>
            <p className="text-sm text-muted-foreground">Appointment Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? 'default' : 'ghost'}
                className={cn(
                  'w-full justify-start h-12 text-left transition-all duration-200',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Notification Manager */}
      <div className="p-4 border-t border-border">
        <NotificationManager />
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          <p>Standalone • Flexible</p>
          <p className="mt-1">Data stored locally</p>
        </div>
      </div>
    </div>
  );
}