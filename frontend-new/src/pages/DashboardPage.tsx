import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  BedDouble,
  IndianRupee,
  CalendarCheck,
  CalendarX,
  ArrowUpRight,
  Plus,
  AlertCircle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { getDashboardStats } from '@/api/dashboard';
import { QUERY_KEYS, SOURCE_COLORS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/store/AuthContext';
import { BookingDrawer } from '@/components/shared/BookingDrawer';
import { InvoiceModal } from '@/components/shared/InvoiceModal';
import { NewBookingModal } from '@/components/shared/NewBookingModal';
import type { Booking } from '@/types';

function DashboardSkeleton() {
  return (
    <div className="page-container">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <Skeleton className="h-20" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <Skeleton className="h-64" />
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardContent className="p-5">
            <Skeleton className="h-64" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [invoiceBooking, setInvoiceBooking] = useState<Booking | null>(null);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);

  const { data: stats, isLoading, refetch } = useQuery({
    queryKey: [QUERY_KEYS.dashboard],
    queryFn: getDashboardStats,
  });

  if (isLoading) return <DashboardSkeleton />;
  if (!stats) return null;

  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'morning' : currentHour < 17 ? 'afternoon' : 'evening';

  const revenueGrowth =
    stats.revenue_last_month > 0
      ? Math.round(
          ((stats.revenue_this_month - stats.revenue_last_month) / stats.revenue_last_month) * 100
        )
      : 0;

  return (
    <div className="page-container">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            Good {greeting}, {user?.name?.split(' ')[0] || 'Partner'} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {format(new Date(), 'EEEE, dd MMMM yyyy')} · Here is today's real-time property overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsNewBookingOpen(true)} className="gap-1.5 shadow-sm">
            <Plus size={16} /> New Booking
          </Button>
        </div>
      </div>

      {/* Immediate Attention Strip */}
      <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-haven-500/10 border border-haven-500/20 text-sm">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <CalendarCheck size={16} className="text-emerald-600" />
          <span>{stats.today_checkins} Check-in scheduled today</span>
        </div>
        <span className="text-border hidden sm:inline">|</span>
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <CalendarX size={16} className="text-orange-500" />
          <span>{stats.today_checkouts} Check-out today</span>
        </div>
        <span className="text-border hidden sm:inline">|</span>
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle size={15} className="text-amber-500" />
          <span>Pending Payments: <strong className="text-foreground">{formatCurrency(stats.pending_payments)}</strong></span>
        </div>
      </div>

      {/* High-level KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Revenue"
          value={formatCurrency(stats.revenue_today)}
          subtitle="Realized revenue today"
          icon={IndianRupee}
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Month-to-Date"
          value={formatCurrency(stats.revenue_this_month)}
          subtitle="vs last month"
          icon={TrendingUp}
          iconColor="text-primary"
          trend={{ value: revenueGrowth, label: 'vs last month' }}
        />
        <StatCard
          title="Occupancy"
          value={`${stats.occupancy_rate}%`}
          subtitle={`${stats.occupied_rooms} of ${stats.total_properties} active units`}
          icon={BedDouble}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Active Stays"
          value={stats.occupied_rooms}
          subtitle={`${stats.available_rooms} units ready to book`}
          icon={Users}
          iconColor="text-purple-600"
        />
      </div>

      {/* Analytical Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 30-day Revenue Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue Trend</CardTitle>
              <p className="text-xs text-muted-foreground">Daily realized tariff over the last 30 days</p>
            </div>
            <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Avg ₹12,700/day
            </div>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={230}>
              <AreaChart data={stats.revenue_chart} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(32 73% 47%)" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(32 73% 47%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={d => {
                    try { return format(parseISO(d), 'dd'); } catch { return d; }
                  }}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val), 'Revenue']}
                  labelFormatter={lbl => {
                    try { return format(parseISO(lbl as string), 'dd MMM yyyy'); } catch { return lbl; }
                  }}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(32 73% 47%)"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Breakdown Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Sources</CardTitle>
            <p className="text-xs text-muted-foreground">Bookings by reservation channel</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={stats.source_breakdown}
                  dataKey="count"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                >
                  {stats.source_breakdown.map(entry => (
                    <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, n: string) => [`${v} Bookings`, n]}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-2">
              {stats.source_breakdown.map(s => (
                <div key={s.source} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: SOURCE_COLORS[s.source] || '#94a3b8' }} />
                    <span className="font-medium text-foreground">{s.source}</span>
                  </div>
                  <span className="text-muted-foreground font-mono">{formatCurrency(s.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming & Recent Bookings Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Upcoming & Active Stays</CardTitle>
            <p className="text-xs text-muted-foreground">Guest register entries requiring team attention</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => navigate('/bookings')} className="text-primary gap-1">
            All Bookings <ArrowUpRight size={14} />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Guest</th>
                  <th className="pb-3 font-semibold hidden sm:table-cell">Property Unit</th>
                  <th className="pb-3 font-semibold">Check In</th>
                  <th className="pb-3 font-semibold hidden md:table-cell">Amount</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {stats.upcoming_bookings.map((booking, idx) => (
                  <motion.tr
                    key={booking.booking_id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    className="hover:bg-muted/40 transition-colors cursor-pointer group"
                    onClick={() => setSelectedBooking(booking)}
                  >
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-foreground">{booking.guest_name}</div>
                      <div className="text-xs text-muted-foreground">{booking.phone}</div>
                    </td>
                    <td className="py-3.5 pr-4 hidden sm:table-cell">
                      <div className="font-medium text-foreground">{booking.room_id}</div>
                      <div className="text-xs text-muted-foreground">{booking.source}</div>
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="font-medium text-foreground">{formatDate(booking.check_in)}</div>
                      <div className="text-xs text-muted-foreground">{booking.check_in_time || '14:00'}</div>
                    </td>
                    <td className="py-3.5 pr-4 hidden md:table-cell font-bold text-foreground">
                      {formatCurrency(booking.total_amount)}
                    </td>
                    <td className="py-3.5 pr-4">
                      <StatusBadge status={booking.status} />
                    </td>
                    <td className="py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs opacity-80 group-hover:opacity-100"
                        onClick={e => {
                          e.stopPropagation();
                          setInvoiceBooking(booking);
                        }}
                      >
                        Invoice
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Booking Details Drawer */}
      <BookingDrawer
        booking={selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onViewInvoice={b => setInvoiceBooking(b)}
      />

      {/* Tax Invoice Modal */}
      <InvoiceModal
        booking={invoiceBooking}
        isOpen={!!invoiceBooking}
        onClose={() => setInvoiceBooking(null)}
      />

      {/* New Booking Form Modal */}
      <NewBookingModal
        isOpen={isNewBookingOpen}
        onClose={() => setIsNewBookingOpen(false)}
        onCreated={() => refetch()}
      />
    </div>
  );
}
