import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';
import { GlobalCommandDialog } from '@/components/shared/GlobalCommandDialog';
import { NewBookingModal } from '@/components/shared/NewBookingModal';
import { useGlobalSearch } from '@/hooks/useSearch';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@/lib/constants';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/bookings': 'Bookings Management',
  '/calendar': 'Availability Calendar',
  '/rooms': 'Properties & Units Directory',
  '/guests': 'Guests & CRM',
  '/laundry': 'Linen & Laundry Tracking',
  '/maintenance': 'Maintenance & Work Orders',
  '/store': 'Linen & Amenities Inventory',
  '/expenses': 'Operational Expenses & Ledger',
  '/payments': 'Payments & Invoices',
  '/employees': 'Staff Management & HRMS',
  '/investors': 'Investor Portfolio & Dividends',
  '/reports': 'Performance & Reports',
  '/settings': 'System Settings',
};

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const { open: isSearchOpen, setOpen: setIsSearchOpen, openSearch } = useGlobalSearch();
  const location = useLocation();
  const queryClient = useQueryClient();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const title = PAGE_TITLES[location.pathname] || 'Haven CRM';

  const handleBookingCreated = () => {
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.bookings] });
    queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
  };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isMobile={isMobile}
      />
      <div className="lg:pl-56 flex flex-col min-h-screen">
        <TopBar
          onMenuToggle={() => setSidebarOpen(o => !o)}
          onOpenSearch={openSearch}
          onNewBookingClick={() => setIsNewBookingOpen(true)}
          title={title}
        />
        <main className="flex-1 pb-24 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Quick Action Floating Button (90% Mobile / iPad usage) */}
      <div className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-4 z-20 lg:hidden">
        <button
          type="button"
          onClick={() => setIsNewBookingOpen(true)}
          title="Create New Booking"
          className="w-12 h-12 rounded-full bg-[#0284C7] hover:bg-[#0369A1] text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
        >
          <Plus size={24} />
        </button>
      </div>

      <MobileNav />

      {/* Global Cmd+K Search Modal */}
      <GlobalCommandDialog
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      {/* Quick New Booking Modal */}
      <NewBookingModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        onCreated={handleBookingCreated}
      />
    </div>
  );
}
