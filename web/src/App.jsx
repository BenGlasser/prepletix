import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <Navigation user={user} />
          <main>
            <Suspense fallback={
              <div className="flex items-center justify-center min-h-[50vh]">
                <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="text-gray-600 dark:text-gray-400 text-center">Loading...</div>
                </div>
              </div>
            }>
              <Routes>
                <Route path="/players" element={<PlayerRoster />} />
                <Route path="/players/:playerId" element={<PlayerRoster />} />
                <Route path="/attendance" element={<AttendanceTracker />} />
                <Route path="/practice" element={<PracticePlanner />} />
                <Route path="/" element={<Navigate to="/players" replace />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;