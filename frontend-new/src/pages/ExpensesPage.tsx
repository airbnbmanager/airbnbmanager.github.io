import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Download,
  IndianRupee,
  Layers,
  Wrench,
  Shirt,
  Wifi,
  Trash2,
} from 'lucide-react';
import { getExpenses, createExpense, deleteExpense } from '@/api/expenses';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { mockRooms } from '@/mocks/data';
import type { Expense, ExpenseChannel } from '@/types';
import { toast } from 'sonner';

const CATEGORY_COLORS: Record<string, string> = {
  'Laundry': 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300',
  'Maintenance': 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  'Housekeeping & Supplies': 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  'Society & Utilities': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  'Wi-Fi & Broadband': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300',
  'Employee Advance': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  'Owner Lease / Rent': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  'Miscellaneous': 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function ExpensesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [propertyFilter, setPropertyFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Expense Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ExpenseChannel>('Maintenance');
  const [amount, setAmount] = useState<number>(1000);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [propertyId, setPropertyId] = useState('');
  const [paymentSource, setPaymentSource] = useState<'COMPANY' | 'UHHS-OD' | 'CASH' | 'FIROZ'>('COMPANY');
  const [notes, setNotes] = useState('');

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: getExpenses,
  });

  const filtered = expenses.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.title.toLowerCase().includes(q) || (e.notes || '').toLowerCase().includes(q);
    const matchCategory = categoryFilter === 'all' || e.category === categoryFilter;
    const matchProp = propertyFilter === 'all' || e.property_id === propertyFilter;
    return matchSearch && matchCategory && matchProp;
  });

  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const laundryExpense = expenses.filter(e => e.category === 'Laundry').reduce((s, e) => s + e.amount, 0);
  const maintExpense = expenses.filter(e => e.category === 'Maintenance').reduce((s, e) => s + e.amount, 0);
  const utilitiesExpense = expenses.filter(e => e.category === 'Society & Utilities' || e.category === 'Wi-Fi & Broadband').reduce((s, e) => s + e.amount, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) {
      toast.error('Please fill in title and amount');
      return;
    }

    await createExpense({
      title,
      category,
      amount: Number(amount),
      date,
      property_id: propertyId || undefined,
      payment_source: paymentSource,
      notes: notes || undefined,
    });

    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    toast.success('Expense recorded successfully!');
    setIsAddModalOpen(false);
    setTitle('');
    setAmount(1000);
    setNotes('');
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    toast.success('Expense removed');
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Expenses & Outflows"
        subtitle="Track laundry bills, property maintenance, society dues, Wi-Fi, and employee advances"
        action={
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-xs font-bold text-xs h-9">
            <Plus size={15} /> Add Expense
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Outflows"
          value={formatCurrency(totalExpense)}
          subtitle="All categories this month"
          icon={IndianRupee}
          iconColor="text-red-500"
        />
        <StatCard
          title="Maintenance & Repairs"
          value={formatCurrency(maintExpense)}
          subtitle="AC, plumbing, electrical"
          icon={Wrench}
          iconColor="text-amber-600"
        />
        <StatCard
          title="Laundry & Linen"
          value={formatCurrency(laundryExpense)}
          subtitle="Vendor wash & press"
          icon={Shirt}
          iconColor="text-pink-600"
        />
        <StatCard
          title="Utilities & Wi-Fi"
          value={formatCurrency(utilitiesExpense)}
          subtitle="Electricity & Fiber bills"
          icon={Wifi}
          iconColor="text-blue-600"
        />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, invoice note..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Pills */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {['all', 'Laundry', 'Maintenance', 'Housekeeping & Supplies', 'Society & Utilities', 'Wi-Fi & Broadband', 'Employee Advance'].map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                categoryFilter === c
                  ? 'bg-[#0284C7] text-white shadow-xs'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {c === 'all' ? 'All Channels' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Company Expense Log</CardTitle>
          <p className="text-xs text-muted-foreground">Every outgoing transaction recorded for CA audit</p>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Desktop Table View */}
          <div className="overflow-x-auto hidden md:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Expense Details</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Property</th>
                  <th className="pb-3 font-semibold">Source Account</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Amount</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((exp, idx) => (
                  <motion.tr
                    key={exp.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-foreground">{exp.title}</div>
                      {exp.notes && <div className="text-xs text-muted-foreground">{exp.notes}</div>}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[exp.category] || 'bg-muted'}`}>
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-xs font-semibold text-foreground">
                      {exp.property_id || 'General Portfolio'}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted font-bold">
                        {exp.payment_source}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-muted-foreground">
                      {formatDate(exp.date)}
                    </td>
                    <td className="py-3.5 pr-4 font-black text-foreground">
                      {formatCurrency(exp.amount)}
                    </td>
                    <td className="py-3.5 text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-red-500"
                        onClick={() => handleDelete(exp.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile & Tablet Card View (Touch Friendly) */}
          <div className="space-y-2.5 md:hidden">
            {filtered.map(exp => (
              <div
                key={exp.id}
                className="p-3.5 rounded-xl border border-border bg-card/70 space-y-2 shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-sm text-foreground truncate">{exp.title}</h4>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[exp.category] || 'bg-muted'}`}>
                        {exp.category}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                        {exp.property_id || 'Portfolio'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-sm text-foreground">{formatCurrency(exp.amount)}</div>
                    <div className="text-[10px] text-muted-foreground">{formatDate(exp.date)}</div>
                  </div>
                </div>

                {exp.notes && (
                  <p className="text-xs text-muted-foreground italic bg-muted/40 p-2 rounded-lg">
                    "{exp.notes}"
                  </p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px]">
                  <span className="text-muted-foreground font-mono">Paid via {exp.payment_source}</span>
                  <button
                    onClick={() => handleDelete(exp.id)}
                    className="text-red-500 hover:text-red-600 font-bold flex items-center gap-1 py-1 px-2 rounded hover:bg-red-50 dark:hover:bg-red-950"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Add Expense Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Record New Expense">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
              Expense Description *
            </label>
            <Input
              placeholder="e.g. Living room AC gas recharge"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Category *
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                <option value="Maintenance">Maintenance & Repairs</option>
                <option value="Laundry">Laundry & Linen</option>
                <option value="Housekeeping & Supplies">Housekeeping & Supplies</option>
                <option value="Society & Utilities">Society & Utilities</option>
                <option value="Wi-Fi & Broadband">Wi-Fi & Broadband</option>
                <option value="Employee Advance">Employee Advance</option>
                <option value="Owner Lease / Rent">Owner Lease / Rent</option>
                <option value="Miscellaneous">Miscellaneous</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Amount (₹) *
              </label>
              <Input
                type="number"
                value={amount}
                onChange={e => setAmount(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Property Unit
              </label>
              <select
                value={propertyId}
                onChange={e => setPropertyId(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                <option value="">General Portfolio</option>
                {mockRooms.map(r => (
                  <option key={r.room_id} value={r.room_id}>
                    {r.nickname} ({r.room_id})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Payment Source
              </label>
              <select
                value={paymentSource}
                onChange={e => setPaymentSource(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                <option value="COMPANY">Company Bank Account</option>
                <option value="UHHS-OD">UHHS Overdraft (OD)</option>
                <option value="CASH">Petty Cash</option>
                <option value="FIROZ">Firoz / Partner Direct</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
              Date
            </label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
              Invoice / Note Details
            </label>
            <Input
              placeholder="Vendor name, bill number, work done"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Save Expense
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
