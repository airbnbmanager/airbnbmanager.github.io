import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';

export type UIVersion = 'classic' | 'luxury';
export type ColorTheme = 'sky' | 'terracotta' | 'emerald' | 'indigo' | 'rose';
export type ThemeMode = 'light' | 'dark';

export interface ThemeConfig {
  version: UIVersion;
  colorTheme: ColorTheme;
  theme: ThemeMode;
}

interface ThemeContextType {
  version: UIVersion;
  setVersion: (version: UIVersion) => void;
  toggleVersion: () => void;
  colorTheme: ColorTheme;
  setColorTheme: (colorTheme: ColorTheme) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const COLOR_THEMES_META: Record<
  ColorTheme,
  { name: string; hex: string; desc: string; classicVibe?: boolean }
> = {
  sky: {
    name: 'Classic Sky Blue',
    hex: '#0284C7',
    desc: 'Original HomeyIndia CRM enterprise blue',
    classicVibe: true,
  },
  terracotta: {
    name: 'Luxury Terracotta',
    hex: '#C2673B',
    desc: 'Warm Lucknow heritage & boutique hospitality',
  },
  emerald: {
    name: 'Forest Emerald',
    hex: '#059669',
    desc: 'Serene resort & private villa aesthetics',
  },
  indigo: {
    name: 'Royal Indigo',
    hex: '#4F46E5',
    desc: 'Executive suites & corporate hospitality',
  },
  rose: {
    name: 'Rose Blossom',
    hex: '#E11D48',
    desc: 'Vibrant boutique & celebratory luxury',
  },
};

export const UI_VERSIONS_META: Record<
  UIVersion,
  { title: string; subtitle: string; icon: string; badge: string; defaultColor: ColorTheme }
> = {
  classic: {
    title: 'Classic Enterprise CRM',
    subtitle: 'Familiar high-density operational layout, crisp slate borders & HomeyIndia sky-blue styling',
    icon: '⚡',
    badge: 'Previous Version Style',
    defaultColor: 'sky',
  },
  luxury: {
    title: 'Modern Luxury Haven',
    subtitle: 'Boutique hospitality aesthetics, Cormorant serif typography, warm stone cream palette & relaxed cards',
    icon: '🏰',
    badge: 'New Luxury Style',
    defaultColor: 'terracotta',
  },
};

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // 1. UI Version
  const [version, setVersionState] = useState<UIVersion>(() => {
    const saved = localStorage.getItem('haven_version');
    return saved === 'classic' || saved === 'luxury' ? saved : 'classic';
  });

  // 2. Color Theme
  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    const saved = localStorage.getItem('haven_color_theme');
    if (saved && saved in COLOR_THEMES_META) return saved as ColorTheme;
    return version === 'classic' ? 'sky' : 'terracotta';
  });

  // 3. Dark/Light Mode
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('haven_theme');
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Apply to DOM
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-version', version);
    root.setAttribute('data-color', colorTheme);

    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Update meta theme-color
    const activeHex = COLOR_THEMES_META[colorTheme]?.hex || '#0284C7';
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', activeHex);
    }

    localStorage.setItem('haven_version', version);
    localStorage.setItem('haven_color_theme', colorTheme);
    localStorage.setItem('haven_theme', theme);
  }, [version, colorTheme, theme]);

  const setVersion = (newVersion: UIVersion) => {
    setVersionState(newVersion);
    // If switching to classic, optionally set color to sky for that classic feel
    if (newVersion === 'classic' && colorTheme === 'terracotta') {
      setColorThemeState('sky');
    } else if (newVersion === 'luxury' && colorTheme === 'sky') {
      setColorThemeState('terracotta');
    }
    toast.success(
      newVersion === 'classic'
        ? 'Switched to ⚡ Classic Enterprise CRM (HomeyIndia Blue)'
        : 'Switched to 🏰 Modern Luxury Haven (Warm Boutique)'
    );
  };

  const toggleVersion = () => {
    setVersion(version === 'classic' ? 'luxury' : 'classic');
  };

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
        version,
        setVersion,
        toggleVersion,
        colorTheme,
        setColorTheme,
        theme,
        setTheme,
        toggleTheme,
        isDark: theme === 'dark',
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
