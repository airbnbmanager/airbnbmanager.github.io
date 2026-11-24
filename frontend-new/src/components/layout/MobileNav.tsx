import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Building2,
  Users,
  Receipt,
  Menu,
  X,
  LayoutDashboard,
  BookOpen,
  Shirt,
  Wrench,
  Package,
  Landmark,
  CreditCard,
  BarChart3,
  Settings,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { Avatar } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

export function MobileNav() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { toggle, isDark } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path: string) => {
    setIsMenuOpen(false);
    navigate(path);
  };

  const MENU_SECTIONS = [
    {
      title: 'Operations & Guests',
      items: [
        { icon: LayoutDashboard, label: 'Dashboard Overview', path: '/dashboard' },
        { icon: BookOpen, label: 'Bookings Management', path: '/bookings' },
        { icon: Calendar, label: 'Availability Calendar', path: '/calendar' },
        { icon: Building2, label: '20 Properties Directory', path: '/rooms' },
        { icon: Users, label: 'Guest Directory & CRM', path: '/guests' },
      ],
    },
    {
      title: 'Hospitality & Field Ops',
      items: [
        { icon: Shirt, label: 'Laundry & Linen Tracker', path: '/laundry' },
        { icon: Wrench, label: 'Maintenance & Work Orders', path: '/maintenance' },
        { icon: Package, label: 'Amenities & Linen Store', path: '/store' },
      ],
    },
    {
      title: 'Finance & HRMS',
      items: [
        { icon: Users, label: 'Staff HRMS & Attendance', path: '/employees' },
        { icon: Receipt, label: 'Operational Expenses', path: '/expenses' },
        { icon: CreditCard, label: 'Payments & Invoices', path: '/payments' },
        { icon: Landmark, label: 'Investor Portfolio & P&L', path: '/investors' },
      ],
    },
    {
      title: 'Reports & Setup',
      items: [
        { icon: BarChart3, label: 'Performance Reports', path: '/reports' },
        { icon: Settings, label: 'System Settings', path: '/settings' },
      ],
    },
  ];

  return (
    <>
      {/* ─── 📱 EXECUTIVE MOBILE & IPAD BOTTOM NAVIGATION BAR ──────────────── */}
      <nav
        className="fixed bottom-0 inset-x-0 z-30 bg-card/95 backdrop-blur-md border-t border-border lg:hidden shadow-lg select-none"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2px)' }}
      >
        <div className="flex items-center justify-around h-16 px-1">
          {/* 1. Bookings / Calendar */}
          <NavLink
            to="/calendar"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[46px]',
                isActive || location.pathname === '/bookings'
                  ? 'text-[#0284C7] font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Calendar size={20} strokeWidth={isActive || location.pathname === '/bookings' ? 2.5 : 1.8} />
                <span className="text-[10px] tracking-tight">Bookings</span>
              </>
            )}
          </NavLink>

          {/* 2. Properties (20 Units) */}
          <NavLink
            to="/rooms"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[46px]',
                isActive
                  ? 'text-[#0284C7] font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Building2 size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] tracking-tight">Properties</span>
              </>
            )}
          </NavLink>

          {/* 3. Employees / HRMS & Attendance */}
          <NavLink
            to="/employees"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[46px]',
                isActive
                  ? 'text-[#0284C7] font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Users size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] tracking-tight">Staff HRMS</span>
              </>
            )}
          </NavLink>

          {/* 4. Expenses & Bills */}
          <NavLink
            to="/expenses"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[46px]',
                isActive
                  ? 'text-[#0284C7] font-black'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Receipt size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="text-[10px] tracking-tight">Expenses</span>
              </>
            )}
          </NavLink>

          {/* 5. Executive Menu Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(true)}
            className={cn(
              'flex flex-col items-center justify-center gap-1 py-1 px-2.5 rounded-xl transition-all min-w-[56px] min-h-[46px]',
              isMenuOpen
                ? 'text-[#0284C7] font-black'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Menu size={20} strokeWidth={isMenuOpen ? 2.5 : 1.8} />
            <span className="text-[10px] tracking-tight">Menu</span>
          </button>
        </div>
      </nav>

      {/* ─── 📲 EXECUTIVE SLIDE-UP DRAWER (iOS / IPAD BOTTOM SHEET) ────────── */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Bottom Sheet Sheet Container */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative w-full max-h-[85vh] bg-card rounded-t-3xl border-t border-border shadow-2xl flex flex-col overflow-hidden z-10"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
            >
              {/* Grab Handle */}
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mt-3 mb-2 flex-shrink-0" />

              {/* Header: User Profile & Actions */}
              <div className="px-5 py-3 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#0284C7] text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                    P
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-foreground leading-tight uppercase">
                      {user?.name || 'Praveen Singh'}
                    </div>
                    <div className="text-[11px] font-bold text-muted-foreground uppercase leading-tight">
                      Owner · Manager
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={toggle}
                    className="p-2 rounded-xl bg-muted text-foreground hover:bg-accent transition-all"
                    title="Toggle Dark Mode"
                  >
                    {isDark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
                  </button>
                  <button
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 rounded-xl bg-muted text-muted-foreground hover:text-foreground transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Scrollable Navigation Body */}
              <div className="overflow-y-auto px-4 py-3 space-y-4 flex-1">
                {MENU_SECTIONS.map((sec, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="text-[10px] font-extrabold text-muted-foreground/80 uppercase tracking-wider px-2">
                      {sec.title}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {sec.items.map(item => {
                        const isCurrent = location.pathname === item.path;
                        return (
                          <button
                            key={item.path}
                            type="button"
                            onClick={() => handleNavClick(item.path)}
                            className={cn(
                              'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all text-left',
                              isCurrent
                                ? 'bg-[#0284C7] text-white shadow-xs'
                                : 'bg-muted/40 hover:bg-muted text-foreground'
                            )}
                          >
                            <span className="flex items-center gap-2.5">
                              <item.icon size={16} className={isCurrent ? 'text-white' : 'text-[#0284C7]'} />
                              <span>{item.label}</span>
                            </span>
                            <ChevronRight size={14} className={isCurrent ? 'text-white/60' : 'text-muted-foreground/40'} />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer: Sign Out */}
              <div className="p-4 pt-3 border-t border-border flex items-center justify-between bg-muted/20">
                <span className="text-xs font-bold text-muted-foreground">
                  The Unique Haven Homes CRM v2
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold text-rose-600 bg-rose-500/10 hover:bg-rose-500/20 transition-all"
                >
                  <LogOut size={14} /> Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
