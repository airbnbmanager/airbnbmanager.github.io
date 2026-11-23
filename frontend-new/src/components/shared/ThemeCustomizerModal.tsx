import React from 'react';
import { Palette, Check, Sparkles, Smartphone, Download, Moon, Sun, Monitor } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import {
  useTheme,
  COLOR_THEMES_META,
  UI_VERSIONS_META,
  UIVersion,
  ColorTheme,
} from '@/hooks/useTheme';
import { usePWA } from '@/hooks/usePWA';

interface ThemeCustomizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ThemeCustomizerModal({ isOpen, onClose }: ThemeCustomizerModalProps) {
  const {
    version,
    setVersion,
    colorTheme,
    setColorTheme,
    theme,
    setTheme,
  } = useTheme();

  const { isInstallable, isInstalled, installApp } = usePWA();

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 pb-3 border-b border-border">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Palette size={20} />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">Theme & Interface Studio</h3>
            <p className="text-xs text-muted-foreground">
              Switch between Classic CRM & Luxury Haven, customize colors & install PWA
            </p>
          </div>
        </div>

        {/* 1. UI Version Switcher */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
            <Sparkles size={14} className="text-primary" />
            1. Select Interface Version / Layout Style
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(UI_VERSIONS_META) as UIVersion[]).map((vKey) => {
              const meta = UI_VERSIONS_META[vKey];
              const isSelected = version === vKey;
              return (
                <button
                  key={vKey}
                  type="button"
                  onClick={() => setVersion(vKey)}
                  className={`relative p-3.5 rounded-xl border-2 text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary shadow-sm'
                      : 'border-border hover:border-foreground/25 bg-card'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-lg">{meta.icon}</span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {meta.badge}
                      </span>
                    </div>
                    <div className="font-bold text-sm text-foreground mb-1">{meta.title}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed">
                      {meta.subtitle}
                    </div>
                  </div>
                  {isSelected && (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-semibold mt-3 pt-2 border-t border-border">
                      <Check size={14} /> Active Workspace
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Color Palettes */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
            2. Accent Color Palette
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {(Object.keys(COLOR_THEMES_META) as ColorTheme[]).map((cKey) => {
              const color = COLOR_THEMES_META[cKey];
              const isSelected = colorTheme === cKey;
              return (
                <button
                  key={cKey}
                  type="button"
                  onClick={() => setColorTheme(cKey)}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'border-primary bg-primary/10 ring-1 ring-primary font-semibold text-foreground'
                      : 'border-border hover:border-foreground/30 bg-card text-muted-foreground'
                  }`}
                >
                  <span
                    className="w-4 h-4 rounded-full flex-shrink-0 shadow-sm border border-black/10"
                    style={{ backgroundColor: color.hex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-foreground truncate">{color.name}</div>
                  </div>
                  {isSelected && <Check size={13} className="text-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Dark / Light Mode */}
        <div className="space-y-3">
          <label className="text-xs font-bold text-foreground uppercase tracking-wider block">
            3. Appearance Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                theme === 'light'
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <Sun size={16} /> Light Mode
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border text-sm font-semibold transition-all ${
                theme === 'dark'
                  ? 'border-primary bg-primary/10 text-primary ring-1 ring-primary'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              }`}
            >
              <Moon size={16} /> Dark Mode
            </button>
          </div>
        </div>

        {/* 4. PWA Installation Section */}
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Smartphone size={18} className="text-primary" />
              <div>
                <div className="text-xs font-bold text-foreground">Progressive Web App (PWA)</div>
                <div className="text-[11px] text-muted-foreground">
                  {isInstalled
                    ? 'Installed as a native standalone app on this device'
                    : 'Install Haven CRM to your home screen or desktop taskbar'}
                </div>
              </div>
            </div>
            {isInstalled ? (
              <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-emerald-500/15 text-emerald-600 flex items-center gap-1">
                <Check size={12} /> Installed
              </span>
            ) : isInstallable ? (
              <Button size="sm" onClick={installApp} className="gap-1.5 text-xs h-8">
                <Download size={13} /> Install App
              </Button>
            ) : (
              <span className="text-[10px] font-semibold text-muted-foreground bg-muted px-2 py-1 rounded">
                PWA Ready
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-border">
          <Button onClick={onClose} size="sm">
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
