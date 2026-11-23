import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Search,
  Moon,
  Sun,
  Bell,
  Menu,
  Plus,
  Palette,
  Download,
  Check,
  Building2,
  FileText,
  HelpCircle,
  Calendar,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { usePWA } from '@/hooks/usePWA';
import { useAuth } from '@/store/AuthContext';
import { ThemeCustomizerModal } from '@/components/shared/ThemeCustomizerModal';
import { mockRooms } from '@/mocks/data';
import { toast } from 'sonner';

interface TopBarProps {
  onMenuToggle: () => void;
  onOpenSearch: () => void;
  onNewBookingClick: () => void;
  title?: string;
}

export function TopBar({ onMenuToggle, onOpenSearch, onNewBookingClick, title }: TopBarProps) {
  const { toggle, isDark, version, toggleVersion } = useTheme();
  const { isInstallable, isInstalled, installApp } = usePWA();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [selectedPropFilter, setSelectedPropFilter] = useState('all');

  const isClassic = version === 'classic';

  return (
    <>
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border shadow-2xs">
        {/* ─── MAIN HEADER BAR ────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 md:gap-3 h-16 px-3 md:px-5">
          {/* Mobile menu toggle */}
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuToggle}>
            <Menu size={20} />
          </Button>

          {/* Classic Logo / Brand in TopBar (as seen in Screenshot 2) */}
          {isClassic && (
            <div className="hidden lg:flex items-center gap-2.5 mr-2 flex-shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[#0284C7] flex items-center justify-center text-white font-extrabold shadow-xs text-xs">
                UH
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black tracking-tight leading-none text-foreground uppercase">
                  The Unique Haven Homes
                </div>
                <div className="text-[9.5px] font-bold text-muted-foreground/80 leading-tight">
                  Pvt. Ltd. • CRM
                </div>
              </div>
            </div>
          )}

          {/* Dynamic Page Title in Luxury Mode */}
          {!isClassic && title && (
            <h1 className="font-display text-base md:text-lg font-semibold hidden sm:block text-foreground truncate max-w-[200px] md:max-w-none">
              {title}
            </h1>
          )}

          {/* Global Search input (Screenshot 2: "Search customers, bookings, units... Ctrl+K") */}
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

          {/* Classic Quick Action: All Properties (20) Dropdown */}
          {isClassic && (
            <div className="hidden xl:block">
              <select
                value={selectedPropFilter}
                onChange={(e) => {
                  setSelectedPropFilter(e.target.value);
                  toast.info(e.target.value === 'all' ? 'Filtering all 20 properties' : `Filtered to ${e.target.value}`);
                }}
                className="h-8 px-2.5 rounded-lg border border-border bg-card text-xs font-bold text-foreground shadow-2xs cursor-pointer focus:outline-none"
              >
                <option value="all">🏢 All Properties ({mockRooms.length})</option>
                {mockRooms.map((r) => (
                  <option key={r.room_id} value={r.room_id}>
                    {r.unit_no} — {r.nickname}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Classic Quick Action: WhatsApp Status Pill */}
          {isClassic && (
            <button
              onClick={() => toast.success('WhatsApp Gateway is Online & Syncing')}
              className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 hover:bg-emerald-500/20 transition-all shadow-2xs"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              WA Status
            </button>
          )}

          {/* Classic Quick Action: Combined Receipt */}
          {isClassic && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/payments')}
              className="gap-1.5 hidden 2xl:inline-flex text-xs h-8 border-border text-foreground font-bold shadow-2xs"
            >
              <FileText size={13} /> Combined Receipt
            </Button>
          )}

          {/* Instant UI Version Switcher Pill */}
          <button
            onClick={toggleVersion}
            title={`Currently on ${isClassic ? 'Classic Enterprise CRM' : 'Luxury Haven'}. Click to switch version!`}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-extrabold transition-all hover:scale-105 active:scale-95 bg-card hover:bg-muted text-foreground border-border shadow-xs"
          >
            {isClassic ? (
              <>
                <span className="text-sky-500">⚡</span>
                <span className="hidden sm:inline">Classic CRM</span>
                <span className="text-[10px] text-sky-600 font-bold bg-sky-100 dark:bg-sky-950 px-1 rounded">
                  Switch 🏰
                </span>
              </>
            ) : (
              <>
                <span className="text-amber-600">🏰</span>
                <span className="hidden sm:inline">Luxury Haven</span>
                <span className="text-[10px] text-amber-600 font-bold bg-amber-100 dark:bg-amber-950 px-1 rounded">
                  Switch ⚡
                </span>
              </>
            )}
          </button>

          {/* + New Booking (Primary Button) */}
          <Button
            size="sm"
            onClick={onNewBookingClick}
            className={`gap-1.5 hidden md:inline-flex text-xs font-bold h-8 shadow-xs ${
              isClassic ? 'bg-[#0284C7] hover:bg-[#0369A1] text-white' : ''
            }`}
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
              title="Open Theme & Interface Studio"
              className="rounded-full text-foreground hover:bg-muted h-8 w-8"
            >
              <Palette size={16} />
            </Button>

            {/* Dark Mode */}
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

            {/* User Profile Capsule (Screenshot 2: [P] PRAVEEN MANAGER ▾) */}
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-border/80">
              <div className="w-7 h-7 rounded-full bg-[#0284C7] text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                P
              </div>
              <div className="min-w-0 text-left">
                <div className="text-[11px] font-extrabold text-foreground tracking-tight leading-none uppercase">
                  {user?.name || 'Praveen'}
                </div>
                <div className="text-[9px] font-bold text-muted-foreground uppercase leading-none mt-0.5">
                  Manager
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─── CLASSIC SUBHEADER TABS (Screenshot 2: [📅 Today] [📅 Calendar] [🟡 Approvals]) ─── */}
        {isClassic && (
          <div className="flex items-center gap-1 px-4 py-1.5 border-t border-border/60 bg-muted/30 overflow-x-auto">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-card text-sky-600 shadow-2xs border border-border/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`
              }
            >
              <Clock size={13} /> Today
            </NavLink>
            <NavLink
              to="/calendar"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#0284C7] text-white shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`
              }
            >
              <Calendar size={13} /> Calendar
            </NavLink>
            <NavLink
              to="/bookings"
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-card text-amber-600 shadow-2xs border border-border/50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
                }`
              }
            >
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Approvals
            </NavLink>
          </div>
        )}
      </header>

      {/* Theme Studio Modal */}
      <ThemeCustomizerModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </>
  );
}
