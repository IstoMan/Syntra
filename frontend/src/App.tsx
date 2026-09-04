import React, { useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TopBar } from './components/layout/TopBar';
import { LoginPage } from './pages/LoginPage';
import { ForecastReplayPage } from './pages/ForecastReplayPage';

const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-sans antialiased">
      <TopBar />
      <main className="p-4 md:p-6 max-w-[1600px] w-full mx-auto">
        <ForecastReplayPage />
      </main>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}

export default App;
