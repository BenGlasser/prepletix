import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import { 
  UserGroupIcon, 
  CheckCircleIcon, 
  ClipboardDocumentListIcon,
  AcademicCapIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  ChevronUpIcon,
  UsersIcon
} from "@heroicons/react/24/outline";

const navigationItems = [
  {
    path: "players",
    label: "Players",
    icon: UserGroupIcon,
    description: "Manage team roster"
  },
  {
    path: "coaches",
    label: "Coaches",
    icon: UsersIcon,
    description: "Manage coaches & chat"
  },
  {
    path: "attendance",
    label: "Attendance",
    icon: CheckCircleIcon,
    description: "Track player attendance"
  },
  {
    path: "practice",
    label: "Practice Plans",
    icon: ClipboardDocumentListIcon,
    description: "Plan your practices"
  },
  {
    path: "drills",
    label: "Drill Library",
    icon: AcademicCapIcon,
    description: "Browse and manage drills"
  },
];

export default function Sidebar({ isOpen, onClose, user, onSignOut }) {
  const navigate = useNavigate();
  const { teamId } = useParams();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  
  // Debug to see if teamId is now available
  console.log('🍕 Sidebar with Outlet pattern:', { 
    teamId,
    currentPath: window.location.pathname 
  });

  // Handle clicks outside the user menu
  useEffect(() => {
    function handleClickOutside(event) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [userMenuOpen]);
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-300 dark:border-gray-700 shadow-lg
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto lg:h-full lg:top-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Mobile close button header */}
          <div className="flex items-center justify-end p-4 border-b border-gray-300 dark:border-gray-700 lg:hidden">
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={onClose} // Close mobile menu when item is clicked
                  className={({ isActive }) =>
                    `group flex items-center p-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary-600 text-white shadow-lg shadow-primary-600/25"
                        : "text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-white dark:hover:bg-gray-800/50 border border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <IconComponent className="w-5 h-5 mr-3 flex-shrink-0" />
                      <div className="flex flex-col">
                        <span className="font-medium">{item.label}</span>
                        <span className={`text-xs mt-0.5 ${
                          isActive
                            ? "text-white/80"
                            : "text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
                        }`}>
                          {item.description}
                        </span>
                      </div>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* User Profile Section */}
          <div className="p-4 border-t border-gray-300 dark:border-gray-700">
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-800 border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all"
              >
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-full h-full object-cover rounded-full"
                      onError={(e) => {
                        console.log('Profile image failed to load:', user.photoURL);
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                    />
                  ) : null}
                  <UserCircleIcon 
                    className="w-5 h-5 text-white" 
                    style={{ display: user?.photoURL ? 'none' : 'block' }}
                  />
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.displayName || user?.email?.split('@')[0] || 'User'}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user?.email}
                  </div>
                </div>
                <ChevronUpIcon 
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    userMenuOpen ? 'rotate-180' : ''
                  }`} 
                />
              </button>

              {/* User Menu Dropdown */}
              <div
                className={`absolute bottom-full left-0 right-0 mb-2 z-50 transition-all duration-300 ease-out origin-bottom ${
                  userMenuOpen
                    ? "opacity-100 scale-y-100 scale-x-100 translate-y-0"
                    : "opacity-0 scale-y-0 scale-x-100 translate-y-2 pointer-events-none"
                }`}
              >
                <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl py-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onClose(); // Close sidebar on mobile
                      navigate('settings');
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-900/30 dark:hover:text-blue-300 transition-colors duration-200 flex items-center space-x-3"
                  >
                    <Cog6ToothIcon className="w-4 h-4" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-900/30 dark:hover:text-red-300 transition-colors duration-200 flex items-center space-x-3"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 text-center">
              Youth Sports Coaching App
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}