import React, { useState } from 'react';
import {
  Search,
  Moon,
  Sun,
  Bell,
  Menu,
  Plus,
  Palette,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { usePWA } from '@/hooks/usePWA';
import { useAuth } from '@/store/AuthContext';
import { ThemeCustomizerModal } from '@/components/shared/ThemeCustomizerModal';

interface TopBarProps {
  onMenuToggle: () => void;
  onOpenSearch: () => void;
  onNewBookingClick: () => void;
  title?: string;
}

export function TopBar({ onMenuToggle, onOpenSearch, onNewBookingClick, title }: TopBarProps) {
  const { toggle, isDark } = useTheme();
  const { isInstallable, installApp } = usePWA();
  const { user } = useAuth();
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border shadow-2xs">
        <div className="flex items-center gap-2 md:gap-3 h-16 px-3 md:px-5">
          {/* Mobile menu toggle */}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
            <Menu size={20} />
          </Button>

          {/* Dynamic Page Title */}
          {title && (
            <h1 className="font-display text-base md:text-lg font-semibold hidden sm:block text-foreground truncate max-w-[200px] md:max-w-none">
              {title}
            </h1>
          )}

          {/* Global Search input */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 ml-auto sm:ml-2 flex-1 max-w-[220px] md:max-w-sm bg-muted/70 hover:bg-muted rounded-lg px-3 py-1.5 md:py-2 text-xs md:text-sm text-muted-foreground transition-all border border-border/60 hover:border-border"
          >
            <Search size={14} />
            <span className="flex-1 text-left hidden sm:inline">
              Search customers, bookings, units...
            </span>
            <span className="flex-1 text-left sm:hidden">Search...</span>
            <kbd className="hidden md:inline-flex h-4 items-center gap-0.5 rounded border border-border bg-background px-1 font-mono text-[9px] text-muted-foreground">
              Ctrl+K
            </kbd>
          </button>

          {/* + New Booking (Primary Sky Blue Button #0284C7) */}
          <Button
            size="sm"
            onClick={onNewBookingClick}
            className="gap-1.5 hidden md:inline-flex text-xs font-bold h-8 shadow-xs bg-[#0284C7] hover:bg-[#0369A1] text-white"
          >
            <Plus size={14} /> New Booking
          </Button>

          {/* Right Tools & User Profile */}
          <div className="flex items-center gap-1">
            {/* PWA Install Button */}
            {isInstallable && (
              <Button
                size="sm"
                variant="outline"
                onClick={installApp}
                className="gap-1.5 hidden xl:inline-flex text-xs h-8 border-primary/30 text-primary"
              >
                <Download size={13} /> Install App
              </Button>
            )}

            {/* Theme Palette Modal */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsThemeModalOpen(true)}
              title="Open Theme & Accent Colors"
              className="rounded-full text-foreground hover:bg-muted h-8 w-8"
            >
              <Palette size={16} />
            </Button>

            {/* Dark Mode Toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggle}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="rounded-full h-8 w-8"
            >
              {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
            </Button>

            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              title="Notifications"
              className="rounded-full relative h-8 w-8"
            >
              <Bell size={16} />
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500" />
            </Button>

            {/* User Profile Capsule */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border/80">
              <div className="w-7 h-7 rounded-full bg-[#0284C7] text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                P
              </div>
              <div className="min-w-0 text-left">
                <div className="text-[11px] font-extrabold text-foreground tracking-tight leading-none uppercase">
                  {user?.name || 'Praveen Singh'}
                </div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase leading-none mt-0.5">
                  Manager
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Theme Studio Modal */}
      <ThemeCustomizerModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </>
  );
}
