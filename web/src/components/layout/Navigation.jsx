import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTeam } from "../../contexts/TeamContext";
import ThemeDropdown from "../ui/ThemeDropdown";
import TeamSelector from "../teams/TeamSelector";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function Navigation({ onToggleSidebar }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentTeam, loading } = useTeam();

  // Use useEffect to navigate to avoid infinite loops
  useEffect(() => {
    const currentPath = location.pathname;
    const isOnTeamRoute =
      currentPath.startsWith("/teams/") &&
      !currentPath.startsWith("/teams/setup") &&
      !currentPath.startsWith("/teams/join");

    if (!loading && !currentTeam && !isOnTeamRoute) {
      console.log(
        "🍕 Navigation component triggering redirect to /teams/setup!",
        {
          loading,
          currentTeam,
          currentPath,
          isOnTeamRoute,
        }
      );
      navigate("/teams/setup");
    } else if (!loading && !currentTeam && isOnTeamRoute) {
      console.log(
        "🍕 Navigation: NOT redirecting because user is on team route",
        {
          loading,
          currentTeam,
          currentPath,
          isOnTeamRoute,
        }
      );
    }
  }, [loading, currentTeam, navigate, location.pathname]);

  // Show navigation even without a team to prevent UI issues for invited coaches
  // The team selector will handle the no-team state appropriately

  return (
    <nav className="sticky top-0 z-40 bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-300 dark:border-gray-700/50 shadow-sm">
      <div className="px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            {/* Mobile menu button */}
            <button
              onClick={onToggleSidebar}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <Bars3Icon className="w-6 h-6" />
            </button>

            {/* Logo/Brand */}
            <div className="flex-shrink-0">
              {/* Logo for small screens */}
              <img
                src="/logo.png"
                alt="Prepletix"
                className="h-8 w-auto sm:hidden ml-6"
              />
              {/* Text for larger screens */}
              <h1 className="hidden sm:block text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-400 bg-clip-text text-transparent">
                Prepletix
              </h1>
            </div>

            {/* Team Selector */}
            <div className="ml-12 sm:ml-8 md:ml-12 lg:ml-40">
              <TeamSelector />
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <ThemeDropdown />
          </div>
        </div>
      </div>
    </nav>
  );
}
