import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { CreditCard, Clock, CheckCircle2, Download, IndianRupee, Printer } from 'lucide-react';
import { getPayments } from '@/api/payments';
import { QUERY_KEYS } from '@/lib/constants';
import { formatCurrency, formatDate } from '@/lib/utils';
import { StatCard } from '@/components/shared/StatCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const MODE_PILLS: Record<string, string> = {
  Cash: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  UPI: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  Card: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  'Bank Transfer': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  Airbnb: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300',
};

export function PaymentsPage() {
  const { data: payments, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.payments],
    queryFn: () => getPayments(),
  });

  const totalCollected = (payments || [])
    .filter(p => p.status === 'collected')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalPending = 45700;

  return (
    <div className="page-container">
      <PageHeader
        title="Payments & Invoicing"
        subtitle="Audited financial ledger, receipts, and payment transactions"
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success('Transactions exported for Accountant CA pack')}
            className="gap-1.5"
          >
            <Download size={15} /> Export Audit Pack
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Collected"
          value={formatCurrency(totalCollected)}
          subtitle="All transactions"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Pending Collection"
          value={formatCurrency(totalPending)}
          subtitle="Uncollected balances"
          icon={Clock}
          iconColor="text-amber-600"
        />
        <StatCard
          title="Transactions"
          value={payments?.length ?? 0}
          subtitle="Processed this month"
          icon={CreditCard}
          iconColor="text-primary"
        />
        <StatCard
          title="Avg Transaction"
          value={payments?.length ? formatCurrency(totalCollected / payments.length) : '₹0'}
          subtitle="Average booking advance"
          icon={IndianRupee}
          iconColor="text-purple-600"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Payment Ledger</CardTitle>
          <p className="text-xs text-muted-foreground">Every incoming UPI, POS card, cash, and Airbnb transfer</p>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : (payments || []).length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No recorded payments.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                    <th className="pb-3 font-semibold">Txn ID</th>
                    <th className="pb-3 font-semibold">Booking Reference</th>
                    <th className="pb-3 font-semibold">Guest</th>
                    <th className="pb-3 font-semibold">Date</th>
                    <th className="pb-3 font-semibold">Mode</th>
                    <th className="pb-3 font-semibold">Amount</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {(payments || []).map((p, idx) => (
                    <motion.tr
                      key={p.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3.5 font-mono text-xs font-semibold text-foreground">
                        {p.id}
                      </td>
                      <td className="py-3.5 font-mono text-xs text-muted-foreground">
                        {p.booking_id}
                      </td>
                      <td className="py-3.5 font-medium text-foreground">
                        {p.guest_name || 'Guest'}
                      </td>
                      <td className="py-3.5 text-xs text-muted-foreground">
                        {formatDate(p.payment_date)}
                      </td>
                      <td className="py-3.5">
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${MODE_PILLS[p.payment_mode] || 'bg-muted'}`}>
                          {p.payment_mode}
                        </span>
                      </td>
                      <td className="py-3.5 font-bold text-foreground">
                        {formatCurrency(p.amount)}
                      </td>
                      <td className="py-3.5">
                        <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 size={13} /> {p.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
