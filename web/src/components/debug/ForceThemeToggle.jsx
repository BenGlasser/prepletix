import { useState, useEffect } from 'react';

export default function ForceThemeToggle() {
  const [currentTheme, setCurrentTheme] = useState('');

  useEffect(() => {
    // Check initial state
    checkTheme();
  }, []);

  const checkTheme = () => {
    const html = document.documentElement;
    const classes = html.className;
    const hasDark = classes.includes('dark');
    const hasLight = classes.includes('light');
    
    console.log('HTML classes:', classes);
    console.log('Has dark:', hasDark, 'Has light:', hasLight);
    
    setCurrentTheme(hasDark ? 'dark' : (hasLight ? 'light' : 'unknown'));
  };

  const forceDark = () => {
    const html = document.documentElement;
    
    // Clear all classes first
    html.className = '';
    
    // Add only dark class
    html.classList.add('dark');
    
    // Save to localStorage
    localStorage.setItem('theme', 'dark');
    
    console.log('Forced dark mode. New classes:', html.className);
    checkTheme();
  };

  const forceLight = () => {
    const html = document.documentElement;
    
    // Clear all classes first
    html.className = '';
    
    // Add only light class (optional, but explicit)
    html.classList.add('light');
    
    // Save to localStorage
    localStorage.setItem('theme', 'light');
    
    console.log('Forced light mode. New classes:', html.className);
    checkTheme();
  };

  const clearClasses = () => {
    const html = document.documentElement;
    html.className = '';
    localStorage.removeItem('theme');
    console.log('Cleared all classes');
    checkTheme();
  };

  return (
    <div className="p-6 m-4 bg-red-100 dark:bg-red-900 border-2 border-red-500 rounded">
      <h2 className="text-xl font-bold mb-4 text-red-800 dark:text-red-200">
        Force Theme Toggle (Current: {currentTheme})
      </h2>
      
      <div className="space-x-2 mb-4">
        <button 
          onClick={forceDark}
          className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900"
        >
          Force Dark
        </button>
        
        <button 
          onClick={forceLight}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
        >
          Force Light
        </button>
        
        <button 
          onClick={clearClasses}
          className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
        >
          Clear All Classes
        </button>
        
        <button 
          onClick={checkTheme}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Refresh Status
        </button>
      </div>
      
      <div className="text-sm bg-white dark:bg-gray-800 p-3 rounded border">
        <p className="text-gray-800 dark:text-white mb-2">
          <strong>Test Elements:</strong>
        </p>
        <div className="w-full h-8 bg-blue-500 dark:bg-blue-700 mb-2 rounded flex items-center justify-center text-white text-sm">
          Blue Bar (should be darker in dark mode)
        </div>
        <div className="w-full h-8 bg-primary-600 dark:bg-primary-400 mb-2 rounded flex items-center justify-center text-white text-sm">
          Primary Color Bar
        </div>
        <p className="text-gray-600 dark:text-gray-300">
          This paragraph should have different colors in light vs dark mode.
        </p>
      </div>
    </div>
  );
}