import { useThemeContext, ColorTheme, ThemeMode, COLOR_THEMES_META } from '@/store/ThemeContext';

export function useTheme() {
  const {
    colorTheme,
    setColorTheme,
    theme,
    setTheme,
    toggleTheme,
    isDark,
    version,
    setVersion,
    toggleVersion,
  } = useThemeContext();

  return {
    colorTheme,
    setColorTheme,
    theme,
    setTheme,
    toggle: toggleTheme,
    isDark,
    version,
    setVersion,
    toggleVersion,
  };
}

export { useThemeContext, COLOR_THEMES_META };
export type { ColorTheme, ThemeMode };
