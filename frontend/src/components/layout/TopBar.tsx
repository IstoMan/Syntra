import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Key, LogOut, Shield, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { HealthStatus } from '../../types';
import { Badge } from '../ui/badge';
import { ProfileModal } from '../auth/ProfileModal';
import { SessionModal } from '../auth/SessionModal';

export const TopBar: React.FC = () => {
  const { user, logout } = useAuth();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSession, setShowSession] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => setHealth(null));
  }, []);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const modelLive = Boolean(health?.model_loaded);

  return (
    <header className="bg-card/95 border-b border-border sticky top-0 z-30 backdrop-blur-md px-4 sm:px-6 py-2.5">
      <div className="flex items-center justify-between gap-3 max-w-[1600px] mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Shield className="w-4 h-4 text-zinc-950" />
          </div>
          <div>
            <span className="text-sm font-extrabold tracking-tight block leading-tight">SYNTRA</span>
            <span className="text-[10px] text-muted-foreground font-mono block leading-tight">
              Network Attack Forecasting
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={modelLive ? 'cyber' : 'outline'}
            className={`text-[10px] font-mono hidden sm:inline-flex ${modelLive ? '' : 'text-muted-foreground'}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${modelLive ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
            {modelLive ? health?.model_architecture ?? 'World model loaded' : 'World model not loaded'}
          </Badge>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2 rounded-lg bg-secondary hover:bg-secondary/80 border border-border transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 rounded-md bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px]">
                {user?.avatarInitials || 'SA'}
              </div>
              <span className="text-xs font-bold hidden sm:block">{user?.name || 'Security Analyst'}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-1.5 w-56 bg-card border border-border rounded-xl shadow-2xl z-50 p-1.5 space-y-1 font-mono text-xs">
                <div className="px-3 py-2 border-b border-border/60">
                  <span className="text-[10px] text-muted-foreground uppercase font-bold block">Signed in as</span>
                  <p className="font-bold text-foreground truncate mt-0.5">{user?.email || 'analyst@syntra.soc'}</p>
                </div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setShowProfile(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-left cursor-pointer transition-colors"
                >
                  <User className="w-3.5 h-3.5 text-primary" />
                  <span>My Profile</span>
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setShowSession(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-secondary text-left cursor-pointer transition-colors"
                >
                  <Key className="w-3.5 h-3.5 text-sky-400" />
                  <span>Session Information</span>
                </button>
                <div className="border-t border-border/60 my-1" />
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-destructive/10 text-rose-400 text-left cursor-pointer transition-colors font-bold"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileModal isOpen={showProfile} onClose={() => setShowProfile(false)} />
      <SessionModal isOpen={showSession} onClose={() => setShowSession(false)} />
    </header>
  );
};
