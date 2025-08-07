import { useEffect, useState } from 'react';
import { ThemeContext } from './ThemeContextDefinition';

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // Check localStorage first
        const saved = localStorage.getItem('theme');
        if (saved !== null) {
          setIsDark(saved === 'dark');
          return;
        }
        // Fall back to system preference
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setIsDark(systemDark);
      } catch (error) {
        console.error('Error initializing theme:', error);
        setIsDark(false); // Default to light mode
      }
    };

    initializeTheme();
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove both classes first to avoid conflicts
    root.classList.remove('light', 'dark');
    
    if (isDark) {
      root.classList.add('dark');
      console.log('Theme switched to dark mode');
    } else {
      root.classList.add('light');
      console.log('Theme switched to light mode');
    }
    
    // Save preference
    try {
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      console.log('Theme preference saved:', isDark ? 'dark' : 'light');
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }, [isDark]);

  const toggleTheme = () => {
    console.log('Toggle theme clicked. Current isDark:', isDark, '-> New isDark:', !isDark);
    setIsDark(!isDark);
  };

  const value = {
    isDark,
    toggleTheme,
    theme: isDark ? 'dark' : 'light'
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};