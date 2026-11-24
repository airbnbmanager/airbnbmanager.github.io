import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

export type ColorTheme = 'sky' | 'indigo' | 'emerald' | 'terracotta' | 'rose';
export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  colorTheme: ColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
  // Backward compatibility stubs (no-op since user requested single locked layout)
  version: 'modern';
  setVersion: (v: any) => void;
  toggleVersion: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const COLOR_THEMES_META: Record<
  ColorTheme,
  { name: string; hex: string; desc: string }
> = {
  sky: {
    name: 'Classic Sky Blue',
    hex: '#0284C7',
    desc: 'Signature enterprise blue palette',
  },
  indigo: {
    name: 'Royal Indigo',
    hex: '#4F46E5',
    desc: 'Executive suites & corporate navy',
  },
  emerald: {
    name: 'Forest Emerald',
    hex: '#059669',
    desc: 'Serene resort & private villa aesthetics',
  },
  terracotta: {
    name: 'Luxury Terracotta',
    hex: '#C2673B',
    desc: 'Warm Lucknow boutique hospitality',
  },
  rose: {
    name: 'Rose Blossom',
    hex: '#E11D48',
    desc: 'Vibrant boutique & celebratory luxury',
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Color Theme: Default to 'sky' (#0284C7) as requested!
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('haven_color_theme');
    if (saved === 'terracotta') {
      localStorage.setItem('haven_color_theme', 'sky');
      return 'sky';
    }
    if (saved && saved in COLOR_THEMES_META) return saved as ColorTheme;
    return 'sky';
  });

  // Dark/Light Mode
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('haven_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply to DOM
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-color', colorTheme);

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Update meta theme-color to active blue/accent
    const activeHex = COLOR_THEMES_META[colorTheme]?.hex || '#0284C7';
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', activeHex);
    }

    localStorage.setItem('haven_color_theme', colorTheme);
    localStorage.setItem('haven_theme', theme);
  }, [colorTheme, theme]);

  const setColorTheme = (newColor: ColorTheme) => {
    setColorThemeState(newColor);
    toast.success(`Theme color updated to ${COLOR_THEMES_META[newColor]?.name || newColor}`);
  };

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((t) => (t === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider
      value={{
        colorTheme,
        setColorTheme,
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
        version: 'modern',
        setVersion: () => {},
        toggleVersion: () => {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}
