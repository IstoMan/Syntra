import React from 'react';
import { Separator } from '../ui/separator';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border bg-card/60 py-2.5 px-4 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-2 transition-colors duration-200">
      <div className="flex items-center gap-2">
        <span className="font-bold text-foreground">SYNTRA</span>
        <Separator orientation="vertical" className="h-3" />
        <span>AI-Based Network Attack Forecasting</span>
        <Separator orientation="vertical" className="h-3" />
        <span className="text-sky-400 font-mono font-bold">SIH26153</span>
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground font-mono">
        <span>Region: India</span>
        <Separator orientation="vertical" className="h-3" />
        <span>Protected Infrastructure</span>
        <Separator orientation="vertical" className="h-3" />
        <span className="text-foreground font-semibold">IST (UTC+05:30)</span>
      </div>
    </footer>
  );
};
