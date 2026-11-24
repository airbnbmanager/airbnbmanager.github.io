import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Package,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { getStoreItems, getStockTransactions, recordStockTransaction } from '@/api/store';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { StoreItem } from '@/types';
import { toast } from 'sonner';

export function StorePage() {
  const queryClient = useQueryClient();
  const [isTxnModalOpen, setIsTxnModalOpen] = useState(false);
  const [txnType, setTxnType] = useState<'In' | 'Out'>('In');
  const [selectedItemId, setSelectedItemId] = useState('ITM-01');
  const [quantity, setQuantity] = useState(10);
  const [purpose, setPurpose] = useState('');
  const [receivedBy, setReceivedBy] = useState('Praveen Singh');

  const { data: items = [] } = useQuery({
    queryKey: ['store_items'],
    queryFn: getStoreItems,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ['stock_transactions'],
    queryFn: getStockTransactions,
  });

  const lowStockItems = items.filter(i => i.status === 'low');

  const handleRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    const itm = items.find(i => i.item_id === selectedItemId);
    if (!itm) return;

    await recordStockTransaction({
      item_id: selectedItemId,
      item_name: itm.item_name,
      txn_type: txnType,
      quantity: Number(quantity),
      txn_date: new Date().toISOString().slice(0, 10),
      purpose: purpose || (txnType === 'In' ? 'Warehouse Stock Replenishment' : 'Dispatched to property'),
      received_by: receivedBy,
      cost: txnType === 'In' ? itm.cost_per_unit * Number(quantity) : undefined,
    });

    queryClient.invalidateQueries({ queryKey: ['store_items'] });
    queryClient.invalidateQueries({ queryKey: ['stock_transactions'] });
    toast.success(`Stock ${txnType === 'In' ? 'Restocked' : 'Issued'} successfully!`);
    setIsTxnModalOpen(false);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Store & Inventory Management"
        subtitle="Bedding linens, toiletries, cleaning detergents, and tea/coffee guest kits"
        action={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setTxnType('Out'); setIsTxnModalOpen(true); }}
              className="gap-1"
            >
              <ArrowUpRight size={14} className="text-amber-500" /> Stock Out
            </Button>
            <Button
              size="sm"
              onClick={() => { setTxnType('In'); setIsTxnModalOpen(true); }}
              className="gap-1 bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-xs font-bold text-xs"
            >
              <ArrowDownLeft size={14} className="text-white" /> Stock In
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Catalog Items"
          value={items.length}
          subtitle="Managed SKU items"
          icon={Package}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Low Stock Alerts"
          value={lowStockItems.length}
          subtitle="Below reorder threshold"
          icon={AlertTriangle}
          iconColor="text-amber-600"
        />
        <StatCard
          title="Stock In Movements"
          value={transactions.filter(t => t.txn_type === 'In').length}
          subtitle="Batches added"
          icon={ArrowDownLeft}
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Stock Out Movements"
          value={transactions.filter(t => t.txn_type === 'Out').length}
          subtitle="Dispatched to units"
          icon={ArrowUpRight}
          iconColor="text-purple-600"
        />
      </div>

      {/* Stock Items Table */}
      <Card>
        <CardHeader>
          <CardTitle>Current Inventory Stock</CardTitle>
          <p className="text-xs text-muted-foreground">Real-time levels across central warehouse</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Item Name</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Stock In Hand</th>
                  <th className="pb-3 font-semibold">Reorder Level</th>
                  <th className="pb-3 font-semibold">Unit Price</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Quick Dispatch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {items.map((itm, idx) => (
                  <tr key={itm.item_id} className="hover:bg-muted/30">
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-foreground">{itm.item_name}</div>
                      <div className="text-xs font-mono text-muted-foreground">{itm.item_id}</div>
                    </td>
                    <td className="py-3.5 pr-4 text-xs font-medium text-foreground">
                      {itm.category}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`font-bold text-sm ${itm.status === 'low' ? 'text-amber-600' : 'text-foreground'}`}>
                        {itm.current_stock} {itm.unit}
                      </span>
                    </td>
                    <td className="py-3.5 pr-4 text-xs text-muted-foreground">
                      {itm.reorder_level} {itm.unit}
                    </td>
                    <td className="py-3.5 pr-4 font-mono text-xs text-foreground">
                      {formatCurrency(itm.cost_per_unit)}/{itm.unit}
                    </td>
                    <td className="py-3.5 pr-4">
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        itm.status === 'low' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {itm.status === 'low' ? '⚠️ Low Stock' : '✓ Sufficient'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => {
                          setSelectedItemId(itm.item_id);
                          setTxnType('Out');
                          setIsTxnModalOpen(true);
                        }}
                      >
                        Issue Stock
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Transaction Modal */}
      <Modal
        isOpen={isTxnModalOpen}
        onClose={() => setIsTxnModalOpen(false)}
        title={txnType === 'In' ? 'Stock In (Replenishment)' : 'Stock Out (Issue to Unit)'}
      >
        <form onSubmit={handleRecord} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
              Select Item
            </label>
            <select
              value={selectedItemId}
              onChange={e => setSelectedItemId(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              {items.map(i => (
                <option key={i.item_id} value={i.item_id}>
                  {i.item_name} (Current: {i.current_stock} {i.unit})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Quantity
              </label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Received / Dispatched By
              </label>
              <Input value={receivedBy} onChange={e => setReceivedBy(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
              Purpose / Destination Unit
            </label>
            <Input
              placeholder="e.g. Dispatched to GOM-201 for turnover"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsTxnModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Confirm Transaction
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
