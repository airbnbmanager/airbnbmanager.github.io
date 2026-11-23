import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Building2,
  Users,
  PieChart,
  IndianRupee,
  Plus,
  Search,
  Download,
  FileCheck2,
  ExternalLink,
} from 'lucide-react';
import { getInvestors } from '@/api/investors';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatCurrency } from '@/lib/utils';
import type { Investor } from '@/types';
import { toast } from 'sonner';

export function InvestorsPage() {
  const [selectedInvestor, setSelectedInvestor] = useState<Investor | null>(null);

  const { data: investors = [], isLoading } = useQuery({
    queryKey: ['investors'],
    queryFn: getInvestors,
  });

  const totalPayoutMTD = investors.reduce((s, i) => s + i.total_payout_mtd, 0);
  const totalPayoutYTD = investors.reduce((s, i) => s + i.total_payout_ytd, 0);

  return (
    <div className="page-container">
      <PageHeader
        title="Investors & Co-Owners"
        subtitle="Manage property syndicates, equity share percentages, and monthly P&L statements"
        action={
          <Button onClick={() => toast.info('Link property form - coming soon')} className="gap-1.5">
            <Plus size={15} /> Add Investor
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Investors"
          value={investors.length}
          subtitle="Co-owners & landlords"
          icon={Users}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Month Payout"
          value={formatCurrency(totalPayoutMTD)}
          subtitle="Net revenue shared"
          icon={IndianRupee}
          iconColor="text-emerald-600"
        />
        <StatCard
          title="YTD Disbursements"
          value={formatCurrency(totalPayoutYTD)}
          subtitle="Fiscal year payouts"
          icon={PieChart}
          iconColor="text-purple-600"
        />
        <StatCard
          title="Co-Owned Units"
          value={investors.reduce((s, i) => s + i.properties.length, 0)}
          subtitle="Under revenue share model"
          icon={Building2}
          iconColor="text-primary"
        />
      </div>

      {/* Investor Profiles Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {investors.map((inv, idx) => (
          <motion.div
            key={inv.investor_id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <Card className="h-full flex flex-col justify-between">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-foreground text-lg leading-tight">{inv.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{inv.phone} · {inv.email}</p>
                  </div>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted font-bold">
                    {inv.investor_id}
                  </span>
                </div>

                {/* Linked Properties and Shares */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                    Property Ownership Shares:
                  </h4>
                  <div className="space-y-2">
                    {inv.properties.map(p => (
                      <div
                        key={p.room_id}
                        className="p-2.5 rounded-xl border border-border bg-card flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-foreground">{p.property_name}</div>
                          <div className="text-[11px] text-muted-foreground font-mono">{p.room_id}</div>
                        </div>
                        <Badge variant="outline" className="font-bold text-primary border-primary/30">
                          {p.share_percent}% Equity
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payout Stats */}
                <div className="p-3 rounded-xl bg-muted/60 border border-border text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Month-to-Date Share:</span>
                    <span className="font-bold text-emerald-600">{formatCurrency(inv.total_payout_mtd)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <span className={`font-semibold capitalize ${inv.payout_status === 'paid' ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {inv.payout_status === 'paid' ? '✓ Disbursed' : '⏳ Pending Payout'}
                    </span>
                  </div>
                </div>

                {inv.bank_details && (
                  <p className="text-[11px] font-mono text-muted-foreground bg-muted p-2 rounded-lg">
                    Bank: {inv.bank_details}
                  </p>
                )}
              </CardContent>

              <div className="p-4 pt-3 border-t border-border bg-muted/20 flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs gap-1"
                  onClick={() => {
                    setSelectedInvestor(inv);
                  }}
                >
                  <FileCheck2 size={13} /> View Statement
                </Button>
                <Button
                  size="sm"
                  className="text-xs"
                  onClick={() => toast.success(`Statement sent via WhatsApp to ${inv.name}`)}
                >
                  Disburse
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Statement Modal */}
      {selectedInvestor && (
        <Modal
          isOpen={!!selectedInvestor}
          onClose={() => setSelectedInvestor(null)}
          title={`Investor Statement — ${selectedInvestor.name}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-sm">
            <div className="p-4 rounded-xl bg-muted space-y-2 text-xs">
              <div className="flex justify-between">
                <span>Investor ID:</span>
                <span className="font-bold">{selectedInvestor.investor_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Settlement Frequency:</span>
                <span className="font-bold uppercase">{selectedInvestor.payout_frequency}</span>
              </div>
              <div className="flex justify-between font-bold text-sm pt-2 border-t border-border">
                <span>Calculated Net Payout:</span>
                <span className="text-primary">{formatCurrency(selectedInvestor.total_payout_mtd)}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Co-Owned Assets Breakdown:
              </h4>
              <div className="divide-y divide-border border border-border rounded-xl">
                {selectedInvestor.properties.map(p => (
                  <div key={p.room_id} className="p-3 flex justify-between items-center text-xs">
                    <div>
                      <div className="font-bold text-foreground">{p.property_name} ({p.room_id})</div>
                      <div className="text-muted-foreground">Share: {p.share_percent}%</div>
                    </div>
                    <span className="font-semibold text-emerald-600">
                      {formatCurrency(Math.round((selectedInvestor.total_payout_mtd * p.share_percent) / 100))}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => setSelectedInvestor(null)}>
                Close
              </Button>
              <Button onClick={() => { setSelectedInvestor(null); toast.success('Statement PDF generated'); }}>
                <Download size={14} className="mr-1" /> Download PDF
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
