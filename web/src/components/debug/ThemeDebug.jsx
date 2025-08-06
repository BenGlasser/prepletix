import { useEffect, useState } from 'react';

export default function ThemeDebug() {
  const [htmlClasses, setHtmlClasses] = useState('');
  const [currentTheme, setCurrentTheme] = useState('');

  useEffect(() => {
    const updateDebugInfo = () => {
      const classes = document.documentElement.className;
      const isDark = classes.includes('dark');
      setHtmlClasses(classes);
      setCurrentTheme(isDark ? 'dark' : 'light');
    };

    updateDebugInfo();
    
    // Update debug info every second
    const interval = setInterval(updateDebugInfo, 1000);
    return () => clearInterval(interval);
  }, []);

  const manualToggle = () => {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    
    if (isDark) {
      html.classList.remove('dark');
      html.classList.add('light');
    } else {
      html.classList.remove('light');
      html.classList.add('dark');
    }
    
    console.log('Manual toggle - new classes:', html.className);
  };

  return (
    <div className="p-4 mb-4 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Theme Debug Info</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>HTML Classes:</strong> <code className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">{htmlClasses}</code>
        </div>
        <div>
          <strong>Detected Theme:</strong> <span className="font-semibold">{currentTheme}</span>
        </div>
        <div>
          <strong>localStorage:</strong> <code className="bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded">{localStorage.getItem('theme') || 'null'}</code>
        </div>
      </div>
      
      <div className="mt-4 space-x-2">
        <button 
          onClick={manualToggle}
          className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
        >
          Manual Toggle
        </button>
        <button 
          onClick={() => {
            document.documentElement.classList.add('dark');
            console.log('Force dark mode');
          }}
          className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded text-sm"
        >
          Force Dark
        </button>
        <button 
          onClick={() => {
            document.documentElement.classList.remove('dark');
            console.log('Force light mode');
          }}
          className="px-3 py-1 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded text-sm"
        >
          Force Light
        </button>
      </div>
      
      {/* Visual test elements */}
      <div className="mt-4 p-3 bg-gray-100 dark:bg-slate-700 rounded">
        <p className="text-gray-800 dark:text-white">
          This text should change color in dark mode
        </p>
        <div className="mt-2 w-full h-4 bg-primary-500 rounded"></div>
        <div className="mt-2 w-full h-4 bg-secondary-400 rounded"></div>
      </div>
    </div>
  );
}