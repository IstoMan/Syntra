import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { 
  User, 
  ShieldCheck, 
  Key, 
  Mail, 
  Building, 
  Lock, 
  X, 
  Clock, 
  Radio, 
  CheckCircle2 
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, sessionInfo, logout } = useAuth();

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-entrance">
      <Card className="w-full max-w-lg border-border/80 shadow-2xl p-6 relative space-y-5 bg-card">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
              {user.avatarInitials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-foreground">{user.name}</h3>
                <Badge variant="cyber" className="text-[10px] px-1.5 py-0 uppercase">
                  ACTIVE
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">{user.email}</p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Clearance & Role Details */}
        <div className="grid grid-cols-2 gap-3 bg-muted/40 p-3.5 rounded-lg border border-border text-xs font-mono">
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Assigned Role</span>
            <p className="font-bold text-foreground mt-0.5">{user.role}</p>
          </div>
          <div>
            <span className="text-[10px] text-muted-foreground uppercase font-bold">Clearance Level</span>
            <p className="font-bold text-indigo-300 mt-0.5">{user.clearance}</p>
          </div>
          <div className="col-span-2 pt-1 border-t border-border/60">
            <span className="text-[10px] text-muted-foreground uppercase font-bold">SOC Unit</span>
            <p className="text-foreground font-medium mt-0.5">{user.unit}</p>
          </div>
        </div>

        {/* Security Permissions Matrix */}
        <div className="space-y-2">
          <span className="text-[10.5px] font-mono uppercase text-muted-foreground font-bold block">
            Granted SOC Permissions:
          </span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="flex items-center gap-2 p-2 rounded bg-muted/30 border border-border/60 text-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Attack Simulation Control</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/30 border border-border/60 text-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>5-Step Lookahead Forecast</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/30 border border-border/60 text-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Firewall Host Containment</span>
            </div>
            <div className="flex items-center gap-2 p-2 rounded bg-muted/30 border border-border/60 text-foreground">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Forensic Audit Log Access</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border gap-3">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              onClose();
              logout();
            }}
            className="text-xs font-bold"
          >
            <Lock className="w-3.5 h-3.5 mr-1.5" />
            <span>Terminate Session (Logout)</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Close
          </Button>
        </div>

      </Card>
    </div>
  );
};
