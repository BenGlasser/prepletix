import { useEffect, useState } from 'react';
import { ThemeContext } from './ThemeContextDefinition';

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('system'); // 'light', 'dark', 'system'
  const [isDark, setIsDark] = useState(false);

  // Initialize theme on mount
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // Check localStorage first
        const saved = localStorage.getItem('theme');
        if (saved && ['light', 'dark', 'system'].includes(saved)) {
          setTheme(saved);
        } else {
          setTheme('system');
        }
      } catch (error) {
        console.error('Error initializing theme:', error);
        setTheme('system');
      }
    };

    initializeTheme();
  }, []);

  // Listen to system theme changes and apply theme
  useEffect(() => {
    const applyTheme = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');

      let shouldBeDark = false;
      
      if (theme === 'dark') {
        shouldBeDark = true;
      } else if (theme === 'light') {
        shouldBeDark = false;
      } else if (theme === 'system') {
        shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      }

      setIsDark(shouldBeDark);
      
      if (shouldBeDark) {
        root.classList.add('dark');
        console.log('Theme applied: dark mode');
      } else {
        root.classList.add('light');
        console.log('Theme applied: light mode');
      }
    };

    applyTheme();

    // Listen for system theme changes when in system mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);

    // Save theme preference
    try {
      localStorage.setItem('theme', theme);
      console.log('Theme preference saved:', theme);
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, [theme]);

  const setThemeMode = (newTheme) => {
    console.log('Theme changed from', theme, 'to', newTheme);
    setTheme(newTheme);
  };

  const value = {
    theme,
    isDark,
    setTheme: setThemeMode
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};