import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, Calendar, BedDouble, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const MOBILE_NAV = [
  { icon: LayoutDashboard, label: 'Home', path: '/dashboard' },
  { icon: BookOpen, label: 'Bookings', path: '/bookings' },
  { icon: Calendar, label: 'Calendar', path: '/calendar' },
  { icon: BedDouble, label: 'Rooms', path: '/rooms' },
  { icon: Users, label: 'Guests', path: '/guests' },
];

export function MobileNav() {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur-md border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {MOBILE_NAV.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all min-w-[54px]',
                isActive ? 'text-primary font-bold' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
