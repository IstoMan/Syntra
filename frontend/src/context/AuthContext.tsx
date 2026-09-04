import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Security Analyst' | 'SOC Lead' | 'Incident Responder';
  clearance: string;
  unit: string;
  environment: string;
  avatarInitials: string;
}

export interface SessionInfo {
  sessionId: string;
  loginTimeIST: string;
  clientIp: string;
  sessionExpiry: string;
  tokenHash: string;
  encryption: string;
}

interface AuthContextType {
  user: UserProfile | null;
  sessionInfo: SessionInfo | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authError: string | null;
  login: (email: string, pass: string, rememberMe?: boolean) => Promise<boolean>;
  loginAsDemo: () => Promise<boolean>;
  logout: () => void;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER: UserProfile = {
  id: 'USR-SOC-942',
  name: 'Security Analyst',
  email: 'analyst@syntra.soc',
  role: 'Security Analyst',
  clearance: 'Level 4 — Tactical SOC Operations',
  unit: 'Threat Hunting & Autonomous Defense Unit',
  environment: 'Demo Environment',
  avatarInitials: 'SA'
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Helper to generate realistic session metadata
  const createSession = useCallback((): SessionInfo => {
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} IST`;
    return {
      sessionId: `SES-SYNTRA-${Math.floor(100000 + Math.random() * 900000)}`,
      loginTimeIST: timeStr,
      clientIp: '10.10.30.42 (Internal SOC LAN)',
      sessionExpiry: '8 hours active token',
      tokenHash: `eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.${Math.random().toString(36).substring(2, 15)}`,
      encryption: 'AES-256-GCM / TLS 1.3'
    };
  }, []);

  // Restore session from localStorage or sessionStorage on mount
  useEffect(() => {
    try {
      const storedAuth = localStorage.getItem('syntra_auth_session') || sessionStorage.getItem('syntra_auth_session');
      if (storedAuth) {
        const parsed = JSON.parse(storedAuth);
        if (parsed.user && parsed.sessionInfo) {
          setUser(parsed.user);
          setSessionInfo(parsed.sessionInfo);
        }
      }
    } catch (e) {
      console.warn('Failed to restore auth session:', e);
    }
  }, []);

  const login = async (email: string, pass: string, rememberMe = false): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);

    // Simulate authenticating against secure backend
    await new Promise((res) => setTimeout(res, 850));

    // Demo authentication logic (accepts analyst@syntra.soc / any non-empty password, or standard valid format)
    if (!email || !pass) {
      setAuthError('Please provide both work email and password.');
      setIsLoading(false);
      return false;
    }

    if (email.toLowerCase() !== 'analyst@syntra.soc' && !email.includes('@')) {
      setAuthError('Invalid work email address format.');
      setIsLoading(false);
      return false;
    }

    if (pass.length < 4) {
      setAuthError('Invalid email or password. Please check your credentials.');
      setIsLoading(false);
      return false;
    }

    const authenticatedUser: UserProfile = {
      ...DEMO_USER,
      email: email.toLowerCase(),
      name: email.split('@')[0].replace('.', ' ').replace(/(^\w|\s\w)/g, m => m.toUpperCase()),
      avatarInitials: email.substring(0, 2).toUpperCase()
    };

    const newSession = createSession();
    setUser(authenticatedUser);
    setSessionInfo(newSession);
    setIsLoading(false);

    const sessionPayload = JSON.stringify({ user: authenticatedUser, sessionInfo: newSession });
    if (rememberMe) {
      localStorage.setItem('syntra_auth_session', sessionPayload);
    } else {
      sessionStorage.setItem('syntra_auth_session', sessionPayload);
    }

    return true;
  };

  const loginAsDemo = async (): Promise<boolean> => {
    setIsLoading(true);
    setAuthError(null);

    // Simulate instant demo authorization
    await new Promise((res) => setTimeout(res, 450));

    const newSession = createSession();
    setUser(DEMO_USER);
    setSessionInfo(newSession);
    setIsLoading(false);

    sessionStorage.setItem('syntra_auth_session', JSON.stringify({ user: DEMO_USER, sessionInfo: newSession }));
    return true;
  };

  const logout = () => {
    setUser(null);
    setSessionInfo(null);
    localStorage.removeItem('syntra_auth_session');
    sessionStorage.removeItem('syntra_auth_session');
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        sessionInfo,
        isAuthenticated: !!user,
        isLoading,
        authError,
        login,
        loginAsDemo,
        logout,
        clearAuthError
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
