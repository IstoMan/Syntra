import React, { useState, useRef, useEffect } from 'react';
import { 
  Clock, 
  Bell, 
  Radio, 
  ChevronRight, 
  User, 
  ShieldCheck, 
  Key, 
  LogOut, 
  ChevronDown, 
  Shield 
} from 'lucide-react';
import { useSimulation } from '../../context/SimulationContext';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { ProfileModal } from '../auth/ProfileModal';
import { SessionModal } from '../auth/SessionModal';

export const TopBar: React.FC = () => {
  const { 
    currentPage, 
    timeIST, 
    alerts, 
    setCurrentPage, 
    isPlaying,
    isAutoTourActive,
    currentStage
  } = useSimulation();

  const { user, sessionInfo, logout } = useAuth();

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);

  const newAlertsCount = alerts.filter(a => a.status === 'NEW').length;
  const isSim = currentPage === 'simulation' || currentPage === 'dashboard';

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getStatusBadge = () => {
    if (currentStage === 7) {
      return (
        <Badge variant="low" className="px-2.5 py-1 text-emerald-400 border-emerald-500/30 bg-emerald-950/20 font-mono hidden md:inline-flex">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>● Incident Mitigated</span>
        </Badge>
      );
    }
    if (currentStage >= 5) {
      return (
        <Badge variant="high" className="px-2.5 py-1 animate-pulse font-mono hidden md:inline-flex">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
          <span>● Early Warning Active</span>
        </Badge>
      );
    }
    if (isPlaying || isAutoTourActive) {
      return (
        <Badge variant="cyber" className="px-2.5 py-1 font-mono hidden md:inline-flex">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
          <span>● Simulation (t+{currentStage - 1})</span>
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="px-2.5 py-1 border-border/80 text-foreground font-mono hidden md:inline-flex">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>● Simulation Ready</span>
      </Badge>
    );
  };

  return (
    <header className="bg-card/95 border-b border-border sticky top-0 z-30 backdrop-blur-md px-4 sm:px-6 py-2.5 transition-colors duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 max-w-7xl mx-auto w-full">
        
        {/* Title and Breadcrumbs */}
        <div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-mono font-bold text-foreground">SYNTRA</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {isSim ? 'Live Attack Forecast Simulation' : 'Incident Forensics & Threat History'}
            </span>
          </div>
          <h1 className="text-base font-extrabold text-foreground tracking-tight mt-0.5">
            {isSim ? 'Live Attack Forecast Simulation' : 'Incident Forensics & Threat Audit History'}
          </h1>
        </div>

        {/* Right Status Badges & Profile Menu */}
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs flex-wrap">
          
          {/* Authenticated Status Indicator */}
          <Badge variant="low" className="text-[10.5px] px-2 py-0.5 text-emerald-400 border-emerald-500/30 bg-emerald-950/20 font-mono hidden lg:inline-flex">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>● Authenticated</span>
          </Badge>

          {/* Role Indicator */}
          <Badge variant="secondary" className="text-[10.5px] px-2 py-0.5 border-border/70 font-mono hidden xl:inline-flex text-zinc-300">
            <span>Role: {user?.role || 'Security Analyst'}</span>
          </Badge>

          {/* Simulation Stage Badge */}
          {getStatusBadge()}

          {/* IST Clock */}
          <div className="flex items-center gap-1.5 bg-secondary border border-border text-foreground px-2.5 py-1 rounded-md font-mono text-[11px] font-semibold select-none">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>{timeIST}</span>
          </div>

          {/* Alerts Counter Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentPage('history')}
            className="relative h-8 w-8"
            title="View Threat History"
          >
            <Bell className="w-4 h-4 text-foreground" />
            {newAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[9.5px] font-bold flex items-center justify-center">
                {newAlertsCount}
              </span>
            )}
          </Button>

          {/* User Profile Menu Trigger */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsProfileMenuOpen(prev => !prev)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px]">
                {user?.avatarInitials || 'SA'}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-foreground block leading-tight">
                  {user?.name || 'Security Analyst'}
                </span>
                <span className="text-[9.5px] font-mono text-muted-foreground block leading-tight">
                  {user?.environment || 'Demo Environment'}
                </span>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-card border border-border rounded-xl shadow-2xl z-50 p-1.5 space-y-1 font-mono text-xs animate-entrance">
                
                <div className="px-3 py-2 border-b border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Signed In As</span>
                  <p className="font-bold text-foreground truncate mt-0.5">{user?.email || 'analyst@syntra.soc'}</p>
                  <p className="text-[10.5px] text-indigo-300 font-sans">{user?.environment || 'Demo Environment'}</p>
                </div>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setShowProfileModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-foreground text-left cursor-pointer transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>My Profile</span>
                </button>

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setShowSessionModal(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-foreground text-left cursor-pointer transition-colors"
                >
                  <Key className="w-3.5 h-3.5 text-sky-400" />
                  <span>Session Information</span>
                </button>

                <div className="border-t border-border/60 my-1" />

                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-destructive/10 text-rose-400 hover:text-rose-300 text-left cursor-pointer transition-colors font-bold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>

              </div>
            )}
          </div>

        </div>

      </div>

      {/* Modals */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />

      <SessionModal
        isOpen={showSessionModal}
        onClose={() => setShowSessionModal(false)}
      />

    </header>
  );
};
