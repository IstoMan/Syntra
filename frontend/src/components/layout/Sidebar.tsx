import { 
  PlayCircle,
  History,
  Shield,
  Radio,
  Database
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { PageId } from '../../types';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

interface NavItem {
  id: PageId;
  label: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'cyber' | 'high';
  icon: React.ComponentType<{ className?: string }>;
}

export const Sidebar: React.FC = () => {
  const { currentPage, setCurrentPage, alerts, isPlaying, activeDataset } = useSimulation();
  const unreadAlerts = alerts.filter(a => a.status === 'NEW').length;

  const navItems: NavItem[] = [
    { 
      id: 'simulation', 
      label: 'Attack Simulation', 
      badge: isPlaying ? 'LIVE' : undefined,
      badgeVariant: 'cyber',
      icon: PlayCircle 
    },
    { 
      id: 'history', 
      label: 'Threat History', 
      badge: unreadAlerts > 0 ? `${unreadAlerts} New` : undefined, 
      badgeVariant: 'high', 
      icon: History 
    },
    {
      id: 'datasource',
      label: 'Dataset Manager',
      badge: '5 Data',
      badgeVariant: 'outline',
      icon: Database
    }
  ];

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col justify-between shrink-0 select-none min-h-screen">
      <div>
        {/* Brand Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-sm">
              <Shield className="w-5 h-5 text-zinc-950 dark:text-zinc-950" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-base font-extrabold tracking-tight text-foreground">SYNTRA</span>
                <Badge variant="cyber" className="text-[9px] px-1.5 py-0 uppercase">
                  SOC
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground font-medium">Attack Forecasting Engine</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Minimal Navigation List */}
        <div className="p-3">
          <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground px-3 py-2 font-mono">
            Platform Consoles
          </div>
          <nav className="space-y-1 mt-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id || (currentPage === 'dashboard' && item.id === 'simulation');
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-secondary text-foreground font-bold shadow-sm'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <span className="text-xs font-semibold">{item.label}</span>
                  </div>

                  {item.badge && (
                    <Badge variant={item.badgeVariant || 'default'} className="text-[10px] px-1.5 py-0">
                      {item.badge}
                    </Badge>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Bottom Environment Status */}
      <div className="p-3 border-t border-border">
        <div className="bg-muted/50 p-3 rounded-lg border border-border/80 space-y-2 text-[11px] font-mono">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
              Telemetry Pipeline
            </span>
            <span className="font-bold text-emerald-400">Online</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Monitored Assets</span>
            <span className="text-foreground font-bold">6 Nodes</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Timezone</span>
            <span className="text-indigo-300 font-semibold">IST (UTC+05:30)</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
