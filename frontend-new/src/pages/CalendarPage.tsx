import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Layers, LayoutGrid } from 'lucide-react';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { getBookings } from '@/api/bookings';
import { getRooms } from '@/api/rooms';
import { QUERY_KEYS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BookingDrawer } from '@/components/shared/BookingDrawer';
import { NewBookingModal } from '@/components/shared/NewBookingModal';
import { PageHeader } from '@/components/shared/PageHeader';
import { ClassicCalendarView } from '@/components/shared/ClassicCalendarView';
import { useTheme } from '@/hooks/useTheme';
import type { Booking } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';

export function CalendarPage() {
  const { version } = useTheme();
  // By default, Month Grid view is active as in Screenshot 2!
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [currentMonth, setCurrentMonth] = useState(new Date(2026, 10, 1)); // November 2026
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 10, 23));
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);

  const { data: bookingsData, refetch } = useQuery({
    queryKey: [QUERY_KEYS.bookings, 'calendar'],
    queryFn: () => getBookings({ per_page: 2000 }),
  });

  const { data: roomsData } = useQuery({
    queryKey: [QUERY_KEYS.rooms],
    queryFn: getRooms,
  });

  const bookings = bookingsData?.data || [];
  const rooms = roomsData || [];

  return (
    <div className="page-container">
      {/* If in Month Grid mode, render the exact Classic Month Grid from Screenshot 2 */}
      {viewMode === 'grid' ? (
        <ClassicCalendarView
          rooms={rooms}
          bookings={bookings}
          onSelectBooking={(bk) => setSelectedBooking(bk)}
          onNewBookingClick={() => setIsNewBookingOpen(true)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />
      ) : (
        /* Unified Timeline Gantt View */
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 shadow-xs flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-foreground flex items-center gap-2">
                <CalendarIcon size={20} className="text-sky-500" />
                Unified Timeline (Gantt Multi-Unit View)
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Multi-property horizontal availability across all 20 homestays
              </p>
            </div>
            <div className="inline-flex items-center bg-muted/80 p-0.5 rounded-lg border border-border">
              <button
                type="button"
                onClick={() => setViewMode('timeline')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-card text-sky-600 shadow-xs"
              >
                <Layers size={14} /> Unified Timeline
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                <LayoutGrid size={14} /> Month Grid
              </button>
            </div>
          </div>

          {/* Timeline Cards for all rooms */}
          <div className="space-y-3">
            {rooms.map((room) => {
              const roomBookings = bookings.filter((b) => b.room_id === room.room_id && !b.is_cancelled);
              return (
                <Card key={room.room_id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="bg-sky-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                        {room.unit_no}
                      </span>
                      <span className="font-bold text-sm text-foreground">{room.nickname}</span>
                      <span className="text-xs text-muted-foreground">· ₹{room.base_price}/night</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {roomBookings.length} bookings this period
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto py-2">
                    {roomBookings.slice(0, 10).map((b) => (
                      <div
                        key={b.booking_id}
                        onClick={() => setSelectedBooking(b)}
                        className={`p-2.5 rounded-lg text-white text-xs cursor-pointer flex-shrink-0 min-w-[140px] shadow-xs hover:brightness-110 transition-all ${
                          b.source === 'Airbnb' ? 'bg-[#FF385C]' : 'bg-[#0284C7]'
                        }`}
                      >
                        <div className="font-bold truncate">{b.guest_name}</div>
                        <div className="text-[10px] opacity-90">
                          {b.check_in.slice(5)} to {b.check_out.slice(5)}
                        </div>
                        <div className="text-[10px] font-mono mt-1">₹{b.total_amount}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Booking Detail Drawer */}
      <BookingDrawer
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
      />

      {/* New Booking Modal */}
      <NewBookingModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        onCreated={() => refetch()}
      />
    </div>
  );
}
