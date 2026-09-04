import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Footer } from './components/layout/Footer';
import { LoginPage } from './pages/LoginPage';
import { SimulationPage } from './pages/SimulationPage';
import { HistoryPage } from './pages/HistoryPage';
import { DatasetsPage } from './pages/DatasetsPage';

const AuthenticatedApp: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { currentPage } = useSimulation();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'history':
      case 'alerts':
        return <HistoryPage />;
      case 'datasource':
        return <DatasetsPage />;
      case 'simulation':
      default:
        return <SimulationPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground font-sans antialiased selection:bg-zinc-800 selection:text-zinc-100 transition-colors duration-200">
      {/* Fixed Left Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        {/* Dynamic Page Body */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
          {renderPage()}
        </main>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <SimulationProvider>
        <AuthenticatedApp />
      </SimulationProvider>
    </AuthProvider>
  );
}

export default App;
