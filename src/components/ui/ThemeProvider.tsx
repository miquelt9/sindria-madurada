import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { ThemeMode, ResolvedTheme, getStoredTheme, applyTheme, resolveTheme, THEME_STORAGE_KEY } from '../../lib/theme';

interface ThemeContextValue {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => getStoredTheme());
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(theme));

  const setTheme = (next: ThemeMode) => {
    setThemeState(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    const resolved = applyTheme(next);
    setResolvedTheme(resolved);
  };

  const cycleTheme = () => {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    const nextIdx = (order.indexOf(theme) + 1) % order.length;
    setTheme(order[nextIdx]);
  };

  useEffect(() => {
    const resolved = applyTheme(theme);
    setResolvedTheme(resolved);

    // If on system mode, listen for OS color-scheme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (getStoredTheme() === 'system') {
        const nextResolved = applyTheme('system');
        setResolvedTheme(nextResolved);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const value = useMemo(
    () => ({
      theme,
      resolvedTheme,
      setTheme,
      cycleTheme,
    }),
    [theme, resolvedTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
