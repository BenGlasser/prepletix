import { useState, Suspense } from "react";
import { Outlet } from "react-router-dom";
import Navigation from "./Navigation";
import Sidebar from "./Sidebar";

export default function TeamLayout({ user, onSignOut }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  console.log("🍕 TeamLayout rendering");

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-200 overflow-hidden">
      <Navigation onToggleSidebar={handleToggleSidebar} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={sidebarOpen}
          onClose={handleCloseSidebar}
          user={user}
          onSignOut={onSignOut}
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
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
