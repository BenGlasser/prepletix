import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { TeamProvider } from './contexts/TeamContext';
import AuthWrapper from './components/auth/AuthWrapper';
import Navigation from './components/layout/Navigation';

// Lazy load the main components
const PlayerRoster = lazy(() => import('./components/players/PlayerRoster'));
const AttendanceTracker = lazy(() => import('./components/attendance/AttendanceTracker'));
const PracticePlanner = lazy(() => import('./components/practice/PracticePlanner'));
const DrillLibrary = lazy(() => import('./components/drills/DrillLibrary'));
const TeamSetup = lazy(() => import('./components/teams/TeamSetup'));

// Auth state provider component
function AuthStateProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return children({ user, loading });
}

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AuthStateProvider>
          {({ user, loading }) => {
            if (loading) {
              return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
                  <div className="text-gray-500 dark:text-gray-400">Loading...</div>
                </div>
              );
            }

            if (!user) {
              return <AuthWrapper />;
            }

            return (
              <AuthProvider user={user}>
                <TeamProvider>
                  <AppContent user={user} />
                </TeamProvider>
              </AuthProvider>
            );
          }}
        </AuthStateProvider>
      </Router>
    </ThemeProvider>
  );
}

function AppContent({ user }) {
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-200 overflow-hidden">
      <Navigation user={user} />
      <main className="flex-1 overflow-auto">
        <Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50">
              <div className="text-gray-600 dark:text-gray-400 text-center">Loading...</div>
            </div>
          </div>
        }>
          <Routes>
            <Route path="/teams/setup" element={<TeamSetup />} />
            <Route path="/teams/join/:invitationCode" element={<TeamSetup />} />
            <Route path="/players" element={<PlayerRoster />} />
            <Route path="/players/:playerId" element={<PlayerRoster />} />
            <Route path="/players/:playerId/edit" element={<PlayerRoster />} />
            <Route path="/attendance" element={<AttendanceTracker />} />
            <Route path="/practice" element={<PracticePlanner />} />
            <Route path="/practice/new" element={<PracticePlanner />} />
            <Route path="/practice/:planId" element={<PracticePlanner />} />
            <Route path="/practice/:planId/edit" element={<PracticePlanner />} />
            <Route path="/drills" element={<DrillLibrary />} />
            <Route path="/drills/:drillId" element={<DrillLibrary />} />
            <Route path="/" element={<Navigate to="/players" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}

export default App;