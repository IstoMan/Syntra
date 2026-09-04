import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  Key, 
  Shield, 
  Clock, 
  Radio, 
  Server, 
  X, 
  Lock, 
  CheckCircle2, 
  Copy, 
  RefreshCw 
} from 'lucide-react';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SessionModal: React.FC<SessionModalProps> = ({ isOpen, onClose }) => {
  const { user, sessionInfo, logout } = useAuth();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !sessionInfo) return null;

  const handleCopyToken = () => {
    navigator.clipboard.writeText(sessionInfo.tokenHash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-entrance">
      <Card className="w-full max-w-lg border-border/80 shadow-2xl p-6 relative space-y-5 bg-card">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-foreground">Session Information</h3>
                <Badge variant="low" className="text-[9.5px] px-1.5 py-0 text-emerald-400 bg-emerald-950/30 border-emerald-500/30">
                  SECURE TLS 1.3
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono">Cryptographic Authentication Details</p>
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

        {/* Session Key-Value Pairs */}
        <div className="space-y-2.5 font-mono text-xs">
          
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
            <span className="text-muted-foreground">Session Identifier:</span>
            <span className="font-bold text-foreground">{sessionInfo.sessionId}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
            <span className="text-muted-foreground">Client Endpoint IP:</span>
            <span className="font-bold text-sky-400">{sessionInfo.clientIp}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
            <span className="text-muted-foreground">Authenticated Time (IST):</span>
            <span className="font-bold text-foreground">{sessionInfo.loginTimeIST}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
            <span className="text-muted-foreground">Session Lifetime:</span>
            <span className="font-bold text-emerald-400">{sessionInfo.sessionExpiry}</span>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border">
            <span className="text-muted-foreground">Cipher Suite:</span>
            <span className="font-semibold text-indigo-300">{sessionInfo.encryption}</span>
          </div>

          {/* Token Hash Box */}
          <div className="p-3 rounded-lg bg-zinc-950 border border-border space-y-1.5">
            <div className="flex items-center justify-between text-[10.5px]">
              <span className="text-zinc-400 font-bold uppercase">Active Bearer JWT Hash</span>
              <button
                onClick={handleCopyToken}
                className="text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-300 truncate font-mono select-all">
              {sessionInfo.tokenHash}
            </p>
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
            <span>End Session (Logout)</span>
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
