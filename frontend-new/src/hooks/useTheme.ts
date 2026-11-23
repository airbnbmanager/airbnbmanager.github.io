import { useThemeContext, UIVersion, ColorTheme, ThemeMode, COLOR_THEMES_META, UI_VERSIONS_META } from '@/store/ThemeContext';

export function useTheme() {
  const {
    version,
    setVersion,
    toggleVersion,
    colorTheme,
    setColorTheme,
    theme,
    setTheme,
    toggleTheme,
    isDark,
  } = useThemeContext();

  return {
    version,
    setVersion,
    toggleVersion,
    colorTheme,
    setColorTheme,
    theme,
    setTheme,
    toggle: toggleTheme,
    isDark,
  };
}

export { useThemeContext, COLOR_THEMES_META, UI_VERSIONS_META };
export type { UIVersion, ColorTheme, ThemeMode };
