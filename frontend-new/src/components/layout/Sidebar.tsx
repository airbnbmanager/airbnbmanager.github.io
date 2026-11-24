import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Calendar,
  BedDouble,
  Users,
  CreditCard,
  BarChart3,
  Settings,
  LogOut,
  X,
  Home,
  BookOpen,
  Shirt,
  Wrench,
  Package,
  Receipt,
  Briefcase,
  Landmark,
  LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/store/AuthContext';
import { Avatar } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';

interface NavSection {
  title: string;
  items: {
    icon: LucideIcon;
    label: string;
    path: string;
    badge?: string;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Core Operations',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
      { icon: BookOpen, label: 'Bookings', path: '/bookings' },
      { icon: Calendar, label: 'Calendar', path: '/calendar' },
      { icon: BedDouble, label: 'Properties', path: '/rooms' },
      { icon: Users, label: 'Guests (CRM)', path: '/guests' },
    ],
  },
  {
    title: 'Hospitality Ops',
    items: [
      { icon: Shirt, label: 'Laundry Tracker', path: '/laundry' },
      { icon: Wrench, label: 'Maintenance', path: '/maintenance' },
      { icon: Package, label: 'Store & Linen', path: '/store' },
    ],
  },
  {
    title: 'Finance & HRMS',
    items: [
      { icon: Receipt, label: 'Expenses', path: '/expenses' },
      { icon: CreditCard, label: 'Payments & Bills', path: '/payments' },
      { icon: Briefcase, label: 'Staff (HRMS)', path: '/employees' },
      { icon: Landmark, label: 'Investors', path: '/investors' },
    ],
  },
  {
    title: 'Analytics & Setup',
    items: [
      { icon: BarChart3, label: 'Reports', path: '/reports' },
      { icon: Settings, label: 'Settings', path: '/settings' },
    ],
  },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  isMobile: boolean;
}

function SidebarContent({ onClose, isMobile }: { onClose: () => void; isMobile: boolean }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border select-none">
      {/* Brand Header */}
      <div className="px-4 py-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md bg-[#0284C7] text-white">
            <Home size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sidebar-foreground font-extrabold text-sm tracking-tight leading-tight uppercase">
              HAVEN CRM
            </div>
            <div className="text-sidebar-foreground/60 text-[10px] leading-tight truncate">
              Boutique Homestays
            </div>
          </div>
          {isMobile && (
            <button
              onClick={onClose}
              className="text-sidebar-foreground/60 hover:text-sidebar-foreground p-1 rounded-lg"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {NAV_SECTIONS.map((section, idx) => (
          <div key={idx} className="space-y-1 mb-3">
            <div className="px-3 text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider">
              {section.title}
            </div>
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={isMobile ? onClose : undefined}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-[#0284C7] text-white font-semibold shadow-xs'
                      : 'text-sidebar-foreground/75 hover:text-sidebar-foreground hover:bg-sidebar-accent'
                  )
                }
              >
                <item.icon size={16} className="flex-shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-rose-500/20 text-rose-500">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User Session Footer */}
      <div className="p-3 border-t border-sidebar-border space-y-2">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-sidebar-accent transition-colors">
          <Avatar fallback={getInitials(user?.name || 'Praveen Singh')} className="w-8 h-8" />
          <div className="flex-1 min-w-0">
            <div className="text-sidebar-foreground text-xs font-semibold truncate">
              {user?.name || 'Praveen Singh'}
            </div>
            <div className="text-sidebar-foreground/50 text-[10px] capitalize">
              {user?.role || 'owner'} · Manager
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 rounded-lg text-sidebar-foreground/40 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function Sidebar({ open, onClose, isMobile }: SidebarProps) {
  if (isMobile) {
    if (!open) return null;
    return (
      <div className="fixed inset-0 z-40 flex">
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
        <div className="relative w-64 max-w-[85vw] h-full shadow-2xl z-50">
          <SidebarContent onClose={onClose} isMobile={isMobile} />
        </div>
      </div>
    );
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-30 w-56 hidden lg:block">
      <SidebarContent onClose={onClose} isMobile={isMobile} />
    </aside>
  );
}
