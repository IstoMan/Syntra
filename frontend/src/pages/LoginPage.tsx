import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { 
  Shield, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Radio, 
  Server, 
  ShieldAlert, 
  Clock, 
  KeyRound, 
  HelpCircle,
  X
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login, loginAsDemo, isLoading, authError, clearAuthError } = useAuth();
  
  const [email, setEmail] = useState('analyst@syntra.soc');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isSuccessRedirecting, setIsSuccessRedirecting] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(email, password, rememberMe);
    if (success) {
      setIsSuccessRedirecting(true);
    }
  };

  const handleDemoLogin = async () => {
    const success = await loginAsDemo();
    if (success) {
      setIsSuccessRedirecting(true);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotEmail) {
      setForgotSent(true);
      setTimeout(() => {
        setForgotSent(false);
        setShowForgotModal(false);
        setForgotEmail('');
      }, 2500);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative overflow-hidden select-none">
      
      {/* Background radial ambiance */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-10 w-[500px] h-[300px] bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="p-4 sm:p-6 flex items-center justify-between max-w-6xl w-full mx-auto relative z-10">
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
            <p className="text-[11px] text-muted-foreground font-medium">AI Cyber Defence Platform</p>
          </div>
        </div>

        {/* Secure Environment Tag */}
        <div className="flex items-center gap-2">
          <Badge variant="low" className="text-[10.5px] px-2.5 py-1 text-emerald-400 border-emerald-500/30 bg-emerald-950/20 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>● Secure Authentication</span>
          </Badge>
        </div>
      </header>

      {/* Center Authentication Container */}
      <main className="flex-1 flex items-center justify-center p-4 relative z-10 my-4">
        <div className="w-full max-w-md space-y-4">
          
          {/* Main Authentication Card */}
          <Card className="border-border/80 shadow-2xl p-6 sm:p-8 space-y-5 bg-card/95 backdrop-blur">
            
            {/* Header Title */}
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground mx-auto flex items-center justify-center shadow-md mb-2">
                <Shield className="w-6 h-6 text-zinc-950 dark:text-zinc-950" />
              </div>
              <h2 className="text-xl font-extrabold tracking-tight text-foreground">
                Welcome back
              </h2>
              <p className="text-xs text-muted-foreground">
                Sign in to access the security monitoring dashboard.
              </p>
            </div>

            {/* Error Banner */}
            {authError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/50 text-xs text-rose-300 font-mono flex items-start gap-2.5 animate-entrance">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold block">Authentication Failed</span>
                  <span>{authError}</span>
                </div>
              </div>
            )}

            {/* Success State Banner */}
            {isSuccessRedirecting && (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-500/50 text-xs text-emerald-300 font-mono flex items-center gap-2.5 animate-entrance">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 animate-spin" />
                <div>
                  <span className="font-bold block">Authentication successful</span>
                  <span>Redirecting to SOC Dashboard...</span>
                </div>
              </div>
            )}

            {/* Standard Login Form */}
            <form onSubmit={handleStandardLogin} className="space-y-4">
              
              {/* Work Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono font-bold text-muted-foreground uppercase flex items-center justify-between">
                  <span>Work Email</span>
                  <span className="text-[10px] text-zinc-500 font-normal">analyst@syntra.soc</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (authError) clearAuthError();
                    }}
                    disabled={isLoading || isSuccessRedirecting}
                    className="pl-9 pr-3 py-2 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono font-bold text-muted-foreground uppercase">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(true)}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-mono transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (authError) clearAuthError();
                    }}
                    disabled={isLoading || isSuccessRedirecting}
                    className="pl-9 pr-10 py-2 text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-ring h-3.5 w-3.5 cursor-pointer"
                />
                <label htmlFor="rememberMe" className="text-xs text-muted-foreground font-mono cursor-pointer select-none">
                  Remember this device for 8 hours
                </label>
              </div>

              {/* SIGN IN Primary Button */}
              <Button
                type="submit"
                variant="cyber"
                disabled={isLoading || isSuccessRedirecting}
                className="w-full py-2.5 h-auto text-xs font-bold tracking-tight shadow-sm"
              >
                {isLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>SIGN IN</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="relative my-2">
              <Separator />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-[10px] font-mono text-muted-foreground uppercase font-bold">
                OR
              </span>
            </div>

            {/* DEMO ACCESS Box */}
            <div className="p-3.5 rounded-xl bg-secondary/70 border border-border/80 space-y-2.5 text-center">
              <div className="flex items-center justify-center gap-1.5 text-xs font-mono font-bold text-foreground">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>DEMO ACCESS — SIH EVALUATION</span>
              </div>
              <p className="text-[11px] text-muted-foreground font-sans leading-tight">
                No real credentials required. Instantly activate a verified <strong>Security Analyst</strong> session.
              </p>

              <Button
                type="button"
                variant="outline"
                onClick={handleDemoLogin}
                disabled={isLoading || isSuccessRedirecting}
                className="w-full text-xs font-bold font-mono text-foreground border-border hover:bg-secondary transition-all"
              >
                <span>Continue with Demo Account</span>
                <ArrowRight className="w-3 h-3 ml-1.5 text-primary" />
              </Button>
            </div>

          </Card>

          {/* Bottom Security Notice */}
          <div className="text-center text-[10.5px] font-mono text-muted-foreground space-y-0.5">
            <p className="flex items-center justify-center gap-1.5">
              <Lock className="w-3 h-3 text-emerald-400" />
              <span>TLS 1.3 • AES-256-GCM Cryptographic Session Protection</span>
            </p>
            <p className="text-zinc-500">Defensive Cybersecurity Prototype for SIH</p>
          </div>

        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm animate-entrance">
          <Card className="w-full max-w-md border-border/80 shadow-2xl p-6 relative space-y-4 bg-card">
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary" />
                <CardTitle className="text-sm font-bold text-foreground">Password Recovery</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowForgotModal(false)}
                className="h-7 w-7"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {forgotSent ? (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/40 text-xs text-emerald-300 font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Password reset token dispatched to SOC Identity Provider!</span>
              </div>
            ) : (
              <form onSubmit={handleForgotSubmit} className="space-y-3">
                <p className="text-xs text-muted-foreground font-sans">
                  Enter your verified SOC email address. A one-time temporary recovery authorization code will be routed to your administrator.
                </p>
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase text-muted-foreground font-bold">
                    Registered SOC Email
                  </label>
                  <Input
                    type="email"
                    required
                    placeholder="analyst@syntra.soc"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="text-xs font-mono"
                  />
                </div>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowForgotModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="cyber"
                    size="sm"
                    className="text-xs font-bold"
                  >
                    Request Reset Token
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-muted-foreground font-mono border-t border-border/50 relative z-10">
        <span>SYNTRA AI Cyber Defence • Version 2.4.0-SOC (IST 10:30:15)</span>
      </footer>

    </div>
  );
};
