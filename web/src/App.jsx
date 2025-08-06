import { useState, useEffect, Suspense, lazy } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { ThemeProvider } from './contexts/ThemeContext';
import AuthWrapper from './components/auth/AuthWrapper';
import Navigation from './components/layout/Navigation';

// Lazy load the main components
const PlayerRoster = lazy(() => import('./components/players/PlayerRoster'));
const AttendanceTracker = lazy(() => import('./components/attendance/AttendanceTracker'));
const PracticePlanner = lazy(() => import('./components/practice/PracticePlanner'));

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('players');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <ThemeProvider>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      </ThemeProvider>
    );
  }

  if (!user) {
    return (
      <ThemeProvider>
        <AuthWrapper />
      </ThemeProvider>
    );
  }

  const renderActiveComponent = () => {
    switch (activeTab) {
      case 'players':
        return <PlayerRoster />;
      case 'attendance':
        return <AttendanceTracker />;
      case 'practice':
        return <PracticePlanner />;
      default:
        return <PlayerRoster />;
    }
  };

  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <Navigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
          user={user}
        />
        <main>
          <Suspense fallback={
            <div className="flex items-center justify-center p-8">
              <div className="text-gray-500 dark:text-gray-400">Loading...</div>
            </div>
          }>
            {renderActiveComponent()}
          </Suspense>
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;