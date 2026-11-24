import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Filter, Calendar, Phone, ChevronDown, Download, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { getBookings } from '@/api/bookings';
import { QUERY_KEYS, BOOKING_SOURCES, BOOKING_STATUSES } from '@/lib/constants';
import { formatCurrency, formatDate, getNights } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BookingDrawer } from '@/components/shared/BookingDrawer';
import { NewBookingModal } from '@/components/shared/NewBookingModal';
import { InvoiceModal } from '@/components/shared/InvoiceModal';
import type { Booking, BookingFilters, BookingSource, BookingStatus } from '@/types';

export function BookingsPage() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<BookingFilters>({ page: 1, per_page: 25 });
  const [search, setSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEYS.bookings, filters, search],
    queryFn: () => getBookings({ ...filters, search: search || undefined }),
  });

  const statusOptions: (BookingStatus | 'all')[] = ['all', ...BOOKING_STATUSES];
  const activeStatus = filters.status || 'all';

  const handleExportCSV = () => {
    if (!data?.data) return;
    const headers = ['Booking ID', 'Guest Name', 'Phone', 'Room ID', 'Check In', 'Check Out', 'Total', 'Paid', 'Status', 'Source'];
    const rows = data.data.map(b => [
      b.booking_id,
      `"${b.guest_name}"`,
      b.phone,
      b.room_id,
      b.check_in,
      b.check_out,
      b.total_amount,
      b.amount_paid,
      b.status,
      b.source,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Haven_Bookings_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Bookings exported to CSV');
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Bookings Register"
        subtitle={`Managing ${data?.total ?? 0} confirmed and active homestay reservations`}
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-1.5 hidden sm:inline-flex">
              <Download size={15} /> Export
            </Button>
            <Button size="sm" onClick={() => setIsNewBookingOpen(true)} className="gap-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-xs font-bold text-xs h-9">
              <Plus size={15} /> New Booking
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search guest name, phone, unit ID, booking code..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setShowFilters(o => !o)}
            className={`gap-1.5 h-10 ${showFilters ? 'bg-accent' : ''}`}
          >
            <Filter size={15} /> Filters
            <ChevronDown
              size={14}
              className={showFilters ? 'rotate-180 transition-transform' : 'transition-transform'}
            />
          </Button>
        </div>

        {/* Status Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statusOptions.map(s => (
            <button
              key={s}
              onClick={() =>
                setFilters(f => ({ ...f, status: s === 'all' ? undefined : s, page: 1 }))
              }
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold capitalize whitespace-nowrap transition-all ${
                activeStatus === s
                  ? 'bg-[#0284C7] text-white shadow-xs'
                  : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {s === 'all' ? 'All Bookings' : s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Expandable Source Filter */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <Card>
                <CardContent className="p-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider mr-2">
                    Booking Channel:
                  </span>
                  {(['all', ...BOOKING_SOURCES] as (BookingSource | 'all')[]).map(src => (
                    <button
                      key={src}
                      onClick={() =>
                        setFilters(f => ({
                          ...f,
                          source: src === 'all' ? undefined : src,
                          page: 1,
                        }))
                      }
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                        src === 'all'
                          ? !filters.source
                            ? 'bg-primary text-white'
                            : 'bg-muted text-muted-foreground hover:bg-accent'
                          : filters.source === src
                          ? 'bg-primary text-white'
                          : 'bg-muted text-muted-foreground hover:bg-accent'
                      }`}
                    >
                      {src === 'all' ? 'All Channels' : src}
                    </button>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bookings List Cards */}
      <Card>
        {isLoading ? (
          <div className="p-4 space-y-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
            ))}
          </div>
        ) : !data?.data.length ? (
          <EmptyState
            icon={Calendar}
            title="No matching bookings found"
            description="Try clearing your search query or reset your status filters."
            action={
              <Button onClick={() => { setSearch(''); setFilters({ page: 1, per_page: 25 }); }}>
                Reset Filters
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-border">
            {data.data.map((booking, idx) => (
              <motion.div
                key={booking.booking_id}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className="p-4 md:p-5 hover:bg-muted/30 cursor-pointer transition-colors flex items-start sm:items-center justify-between gap-4"
                onClick={() => setSelectedBooking(booking)}
              >
                <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-haven-500/10 text-haven-700 dark:text-haven-300 font-bold flex items-center justify-center flex-shrink-0 text-sm">
                    {booking.guest_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground text-sm sm:text-base">
                        {booking.guest_name}
                      </span>
                      <span className="text-xs font-mono text-muted-foreground">{booking.booking_id}</span>
                      <Badge variant="outline" className="text-[10px] uppercase font-bold">
                        {booking.source}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={13} className="text-primary" />
                        {formatDate(booking.check_in)} → {formatDate(booking.check_out)}
                        <span className="font-semibold text-foreground">
                          ({getNights(booking.check_in, booking.check_out)}N)
                        </span>
                      </span>
                      <span className="font-medium text-foreground">Unit: {booking.room_id}</span>
                      <span className="flex items-center gap-1">
                        <Phone size={12} /> {booking.phone}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <StatusBadge status={booking.status} />
                  <span className="font-bold text-sm text-foreground">
                    {formatCurrency(booking.total_amount)}
                  </span>
                  {booking.amount_paid < booking.total_amount ? (
                    <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      Due: {formatCurrency(booking.total_amount - booking.amount_paid)}
                    </span>
                  ) : (
                    <span className="text-[11px] text-emerald-600 font-medium">Paid in Full</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Card>

      {/* Booking Detail Drawer */}
      <BookingDrawer
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onViewInvoice={b => setInvoiceBooking(b)}
        onStatusChange={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
        }}
      />

      {/* Printable Tax Invoice Modal */}
      <InvoiceModal
        booking={invoiceBooking}
        isOpen={!!invoiceBooking}
        onClose={() => setInvoiceBooking(null)}
      />

      {/* New Booking Modal */}
      <NewBookingModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        onCreated={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: [QUERY_KEYS.dashboard] });
        }}
      />
    </div>
  );
}
