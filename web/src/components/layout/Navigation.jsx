import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTeam } from "../../contexts/TeamContext";
import ThemeDropdown from "../ui/ThemeDropdown";
import TeamSelector from "../teams/TeamSelector";
import { Bars3Icon } from "@heroicons/react/24/outline";

export default function Navigation({ onToggleSidebar }) {
  const navigate = useNavigate();
  const { currentTeam, loading } = useTeam();

  // Use useEffect to navigate to avoid infinite loops
  useEffect(() => {
    if (!loading && !currentTeam) {
      navigate("/teams/setup");
    }
  }, [loading, currentTeam, navigate]);

  // Don't render navigation if no team
  if (!loading && !currentTeam) {
    return null;
  }

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
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary-600 to-secondary-400 bg-clip-text text-transparent">
                Prepletix
              </h1>
            </div>

            {/* Team Selector */}
            <div className="ml-40">
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
