import { useState, useEffect, Suspense, lazy } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useParams,
} from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";
import { TeamProvider } from "./contexts/TeamContext";
import AuthWrapper from "./components/auth/AuthWrapper";
import Navigation from "./components/layout/Navigation";
import Sidebar from "./components/layout/Sidebar";

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

// Component to handle team-level redirects
function TeamRedirect() {
  const { teamId } = useParams();
  return <Navigate to={`/teams/${teamId}/players`} replace />;
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

            if (!user) {
              // Check if this is a coach invitation route
              if (window.location.pathname.startsWith("/coaches/join/")) {
                return (
                  <Suspense
                    fallback={
                      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-slate-900">
                        <div className="text-gray-500 dark:text-gray-400">
                          Loading...
                        </div>
                      </div>
                    }
                  >
                    <CoachInvitation />
                  </Suspense>
                );
              }
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900 transition-colors duration-200 overflow-hidden">
      <Navigation onToggleSidebar={handleToggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={handleCloseSidebar}
          user={user}
          onSignOut={handleSignOut}
        />

        <main className="flex-1 overflow-auto">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full">
                <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-200/50 dark:border-gray-700/50">
                  <div className="text-gray-600 dark:text-gray-400 text-center">
                    Loading...
                  </div>
                </div>
              </div>
            }
          >
            <Routes>
              <Route path="/teams/setup" element={<TeamSetup />} />
              <Route
                path="/teams/join/:invitationCode"
                element={<TeamSetup />}
              />
              {/* Team-specific routes */}
              <Route path="/teams/:teamId/players" element={<PlayerRoster />} />
              <Route
                path="/teams/:teamId/players/:playerId"
                element={<PlayerRoster />}
              />
              <Route path="/teams/:teamId/coaches" element={<Coaches />} />
              <Route
                path="/teams/:teamId/attendance"
                element={<AttendanceTracker />}
              />
              <Route
                path="/teams/:teamId/practice"
                element={<PracticePlanner />}
              />
              <Route
                path="/teams/:teamId/practice/new"
                element={<PracticePlanner />}
              />
              <Route
                path="/teams/:teamId/practice/:planId"
                element={<PracticePlanner />}
              />
              <Route
                path="/teams/:teamId/practice/:planId/edit"
                element={<PracticePlanner />}
              />
              <Route path="/teams/:teamId/drills" element={<DrillLibrary />} />
              <Route
                path="/teams/:teamId/drills/:drillId"
                element={<DrillLibrary />}
              />
              <Route path="/teams/:teamId/settings" element={<Settings />} />
              {/* Default redirects */}
              {/* <Route path="/teams/:teamId" element={<TeamRedirect />} /> */}
              <Route
                path="/teams"
                element={<Navigate to="/teams/setup" replace />}
              />
              <Route
                path="/"
                element={<Navigate to="/teams/setup" replace />}
              />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

export default App;
