import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { getDashboardStats } from '@/api/dashboard';
import { QUERY_KEYS, SOURCE_COLORS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, BedDouble } from 'lucide-react';

const MONTHLY_HISTORICAL = [
  { month: 'Jun', revenue: 210000, bookings: 36, occupancy: 68 },
  { month: 'Jul', revenue: 245000, bookings: 42, occupancy: 72 },
  { month: 'Aug', revenue: 290000, bookings: 48, occupancy: 75 },
  { month: 'Sep', revenue: 260000, bookings: 41, occupancy: 70 },
  { month: 'Oct', revenue: 318000, bookings: 50, occupancy: 79 },
  { month: 'Nov', revenue: 382400, bookings: 58, occupancy: 84 },
];

const PROPERTY_REVENUE_RANK = [
  { name: 'Celebrity Garden (CEL-501)', revenue: 114000, bookings: 8 },
  { name: 'The Pink House (PKH-301)', revenue: 82500, bookings: 11 },
  { name: 'Royal White House (RWH-601)', revenue: 66500, bookings: 7 },
  { name: 'The Dark Blue (GOM-201)', revenue: 52000, bookings: 10 },
  { name: 'The Velvet House (VLV-401)', revenue: 38000, bookings: 10 },
  { name: 'The Luxe Haven (LUL-101)', revenue: 29400, bookings: 12 },
];

export function ReportsPage() {
  const { data: stats } = useQuery({
    queryKey: [QUERY_KEYS.dashboard],
    queryFn: getDashboardStats,
  });

  return (
    <div className="page-container">
      <PageHeader
        title="Business Reports & Analytics"
        subtitle="Financial performance, channel distributions, and asset profitability"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Nov 2024 Revenue"
          value={formatCurrency(stats?.revenue_this_month || 382400)}
          subtitle="Top historical month"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          trend={{ value: 20, label: 'vs Oct' }}
        />
        <StatCard
          title="Portfolio Occupancy"
          value={`${stats?.occupancy_rate || 76}%`}
          subtitle="Target: 80%"
          icon={BedDouble}
          iconColor="text-primary"
        />
        <StatCard
          title="Total Reservations"
          value={stats?.source_breakdown.reduce((s, x) => s + x.count, 0) || 116}
          subtitle="Across all OTAs"
          icon={BarChart3}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Avg Booking Value"
          value={formatCurrency(6850)}
          subtitle="Per stay confirmation"
          icon={PieChartIcon}
          iconColor="text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Monthly Revenue Growth</CardTitle>
            <p className="text-xs text-muted-foreground">Historical 6-month earnings in INR</p>
          </CardHeader>
          <CardContent className="pt-2">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={MONTHLY_HISTORICAL} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: number) => [formatCurrency(val), 'Revenue']}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="revenue" fill="#0284C7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Channel Share</CardTitle>
            <p className="text-xs text-muted-foreground">Revenue share by platform</p>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={stats?.source_breakdown || []}
                  dataKey="revenue"
                  nameKey="source"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {(stats?.source_breakdown || []).map(entry => (
                    <Cell key={entry.source} fill={SOURCE_COLORS[entry.source] || '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '10px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1 mt-2">
              {(stats?.source_breakdown || []).map(s => (
                <div key={s.source} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: SOURCE_COLORS[s.source] || '#94a3b8' }} />
                    <span className="font-medium text-foreground">{s.source}</span>
                  </div>
                  <span className="font-semibold text-foreground">{formatCurrency(s.revenue)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Property Revenue Ranking */}
      <Card>
        <CardHeader>
          <CardTitle>Top Revenue Units</CardTitle>
          <p className="text-xs text-muted-foreground">Individual flat/villa contribution to total monthly collection</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Property</th>
                  <th className="pb-3 font-semibold">Completed Stays</th>
                  <th className="pb-3 font-semibold text-right">Revenue Generated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {PROPERTY_REVENUE_RANK.map(p => (
                  <tr key={p.name} className="hover:bg-muted/30">
                    <td className="py-3 font-semibold text-foreground">{p.name}</td>
                    <td className="py-3 text-muted-foreground">{p.bookings} Bookings</td>
                    <td className="py-3 text-right font-bold text-primary">{formatCurrency(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
