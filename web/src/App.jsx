import { useState, useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { TeamProvider } from "./contexts/TeamContext";
import AuthWrapper from "./components/auth/AuthWrapper";
import TeamLayout from "./components/layout/TeamLayout";

// Lazy load the main components
const PlayerRoster = lazy(() => import("./components/players/PlayerRoster"));
const AttendanceTracker = lazy(() =>
  import("./components/attendance/AttendanceTracker")
);
const PracticePlanner = lazy(() =>
  import("./components/practice/PracticePlanner")
);
const DrillLibrary = lazy(() => import("./components/drills/DrillLibrary"));
const TeamSetup = lazy(() => import("./components/teams/TeamSetup"));
const Settings = lazy(() => import("./components/settings/Settings"));
const Coaches = lazy(() => import("./components/coaches/Coaches"));
const CoachInvitation = lazy(() =>
  import("./components/coaches/CoachInvitation")
);

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

// Debug redirect components
function TeamsRedirect() {
  console.log('🍕 Redirect triggered: /teams → /teams/setup');
  return <Navigate to="/teams/setup" replace />;
}

function RootRedirect() {
  console.log('🍕 Redirect triggered: / → /teams/setup');
  return <Navigate to="/teams/setup" replace />;
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
                  <div className="text-gray-500 dark:text-gray-400">
                    Loading...
                  </div>
                </div>
              );
            }

            return (
              <Routes>
                {/* Public routes - no authentication required */}
                <Route path="/coaches/join/:invitationCode" element={<CoachInvitation />} />
                
                {/* Authenticated routes */}
                <Route path="*" element={
                  !user ? <AuthWrapper /> : (
                    <AuthProvider user={user}>
                      <TeamProvider>
                        <AppContent user={user} />
                      </TeamProvider>
                    </AuthProvider>
                  )
                } />
              </Routes>
            );
          }}
        </AuthStateProvider>
      </Router>
    </ThemeProvider>
  );
}

function AppContent({ user }) {
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
          <div className="text-gray-500 dark:text-gray-400">Loading...</div>
        </div>
      }
    >
      <Routes>
        {/* Non-team routes */}
        <Route path="/teams/setup" element={<TeamSetup />} />
        <Route path="/teams/join/:invitationCode" element={<TeamSetup />} />
        
        {/* Team layout with nested routes */}
        <Route
          path="/teams/:teamId"
          element={<TeamLayout user={user} onSignOut={handleSignOut} />}
        >
          {/* Nested team routes - these will render inside TeamLayout's <Outlet /> */}
          <Route path="players" element={<PlayerRoster />} />
          <Route path="players/:playerId" element={<PlayerRoster />} />
          <Route path="coaches" element={<Coaches />} />
          <Route path="attendance" element={<AttendanceTracker />} />
          <Route path="practice" element={<PracticePlanner />} />
          <Route path="practice/new" element={<PracticePlanner />} />
          <Route path="practice/:planId" element={<PracticePlanner />} />
          <Route path="practice/:planId/edit" element={<PracticePlanner />} />
          <Route path="drills" element={<DrillLibrary />} />
          <Route path="drills/:drillId" element={<DrillLibrary />} />
          <Route path="settings" element={<Settings />} />
          {/* Default redirect to players for /teams/:teamId */}
          <Route index element={<Navigate to="players" replace />} />
        </Route>

        {/* Default redirects */}
        <Route path="/teams" element={<TeamsRedirect />} />
        <Route path="/" element={<RootRedirect />} />
      </Routes>
    </Suspense>
  );
}

export default App;
