import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Shirt,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Truck,
  IndianRupee,
  Layers,
} from 'lucide-react';
import { getLaundryRecords, createLaundryRecord, updateLaundryStatus } from '@/api/laundry';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { mockRooms } from '@/mocks/data';
import type { LaundryRecord } from '@/types';
import { toast } from 'sonner';

export function LaundryPage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Laundry Batch Form State
  const [vendorName, setVendorName] = useState('Express Cleaners Hazratganj');
  const [roomId, setRoomId] = useState('GOM-201');
  const [bedsheets, setBedsheets] = useState(6);
  const [pillowCovers, setPillowCovers] = useState(12);
  const [towels, setTowels] = useState(8);
  const [duvets, setDuvets] = useState(2);
  const [cost, setCost] = useState(1200);

  const { data: records = [] } = useQuery({
    queryKey: ['laundry'],
    queryFn: getLaundryRecords,
  });

  const totalPieces = records.reduce((s, r) => s + r.total_pieces, 0);
  const totalCost = records.reduce((s, r) => s + r.cost, 0);
  const pendingWash = records.filter(r => r.status !== 'delivered').length;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const totalPcs = Number(bedsheets) + Number(pillowCovers) + Number(towels) + Number(duvets);

    await createLaundryRecord({
      vendor_name: vendorName,
      room_id: roomId,
      record_date: new Date().toISOString().slice(0, 10),
      bedsheets_count: Number(bedsheets),
      pillow_covers_count: Number(pillowCovers),
      towels_count: Number(towels),
      duvets_count: Number(duvets),
      total_pieces: totalPcs,
      cost: Number(cost),
      status: 'dispatched',
      payment_status: 'pending',
    });

    queryClient.invalidateQueries({ queryKey: ['laundry'] });
    toast.success(`Laundry batch of ${totalPcs} pieces dispatched to ${vendorName}!`);
    setIsAddModalOpen(false);
  };

  const handleStatusUpdate = async (id: string, newStatus: LaundryRecord['status']) => {
    await updateLaundryStatus(id, newStatus);
    queryClient.invalidateQueries({ queryKey: ['laundry'] });
    toast.success(`Batch marked as ${newStatus}`);
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Linen & Laundry Tracker"
        subtitle="Manage dhobi dispatches, bedsheet counts, pressing quality, and vendor expenses"
        action={
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-xs font-bold text-xs h-9">
            <Plus size={15} /> Dispatch Laundry Batch
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pieces Washed"
          value={totalPieces}
          subtitle="Sheets, towels, duvets"
          icon={Shirt}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Laundry Expense"
          value={formatCurrency(totalCost)}
          subtitle="Monthly vendor billing"
          icon={IndianRupee}
          iconColor="text-pink-600"
        />
        <StatCard
          title="Pending at Dhobi"
          value={pendingWash}
          subtitle="Batches in-wash"
          icon={Clock}
          iconColor="text-amber-600"
        />
        <StatCard
          title="Delivered & Ironed"
          value={records.filter(r => r.status === 'delivered').length}
          subtitle="Ready in store"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
        />
      </div>

      {/* Laundry Batches Table */}
      <Card>
        <CardHeader>
          <CardTitle>Laundry Dispatches</CardTitle>
          <p className="text-xs text-muted-foreground">Turnover linen dispatched from properties to vendors</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Batch ID</th>
                  <th className="pb-3 font-semibold">Property Unit</th>
                  <th className="pb-3 font-semibold">Vendor</th>
                  <th className="pb-3 font-semibold">Linen Breakdown</th>
                  <th className="pb-3 font-semibold">Date</th>
                  <th className="pb-3 font-semibold">Cost</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {records.map((r, idx) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3.5 font-mono text-xs font-semibold text-foreground">
                      {r.id}
                    </td>
                    <td className="py-3.5 text-xs font-semibold text-foreground">
                      {r.room_id}
                    </td>
                    <td className="py-3.5 font-medium text-foreground">
                      {r.vendor_name}
                    </td>
                    <td className="py-3.5 text-xs text-muted-foreground">
                      <span>{r.bedsheets_count} Sheets</span> · <span>{r.towels_count} Towels</span> · <span>{r.pillow_covers_count} Pillows</span> · <span>{r.duvets_count} Duvets</span>
                      <div className="font-semibold text-foreground mt-0.5">({r.total_pieces} Total Pieces)</div>
                    </td>
                    <td className="py-3.5 text-xs text-muted-foreground">
                      {formatDate(r.record_date)}
                    </td>
                    <td className="py-3.5 font-bold text-foreground">
                      {formatCurrency(r.cost)}
                    </td>
                    <td className="py-3.5">
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize ${
                        r.status === 'delivered' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        r.status === 'washing' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {r.status === 'delivered' ? '✓ Delivered' : r.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      {r.status !== 'delivered' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleStatusUpdate(r.id, 'delivered')}
                        >
                          Mark Received
                        </Button>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dispatch Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Dispatch Linen Batch">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Vendor / Dhobi Name
              </label>
              <Input value={vendorName} onChange={e => setVendorName(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Source Property Unit
              </label>
              <select
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                {mockRooms.map(r => (
                  <option key={r.room_id} value={r.room_id}>
                    {r.nickname} ({r.room_id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Bedsheets
              </label>
              <Input type="number" min={0} value={bedsheets} onChange={e => setBedsheets(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Pillows
              </label>
              <Input type="number" min={0} value={pillowCovers} onChange={e => setPillowCovers(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Towels
              </label>
              <Input type="number" min={0} value={towels} onChange={e => setTowels(Number(e.target.value))} />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Duvets
              </label>
              <Input type="number" min={0} value={duvets} onChange={e => setDuvets(Number(e.target.value))} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
              Estimated Washing & Ironing Cost (₹)
            </label>
            <Input type="number" value={cost} onChange={e => setCost(Number(e.target.value))} />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Confirm Dispatch
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
