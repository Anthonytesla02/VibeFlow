import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Library } from './pages/Library';
import { Player } from './components/Player';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { AudioProvider } from './contexts/AudioContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Loader2 } from 'lucide-react';

const AppContent: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const { user, isLoading, login, signup, logout } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleLogin = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await login(email, password);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleSignup = async (email: string, password: string, displayName: string) => {
    setAuthError(null);
    try {
      await signup(email, password, displayName);
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0f0f11]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="animate-spin text-green-400" size={48} />
          <p className="text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (authMode === 'login') {
      return (
        <Login 
          onLogin={handleLogin} 
          onSwitchToSignup={() => { setAuthMode('signup'); setAuthError(null); }}
          error={authError}
        />
      );
    }
    return (
      <Signup 
        onSignup={handleSignup} 
        onSwitchToLogin={() => { setAuthMode('login'); setAuthError(null); }}
        error={authError}
      />
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home': return <Home />;
      case 'library': return <Library />;
      case 'player': return <Player />;
      default: return <Home />;
    }
  };

  return (
    <AudioProvider>
      <Layout currentPage={currentPage} onNavigate={setCurrentPage} onLogout={logout} userName={user.displayName}>
        {renderPage()}
      </Layout>
    </AudioProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};
