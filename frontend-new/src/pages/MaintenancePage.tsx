import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Wrench,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  IndianRupee,
} from 'lucide-react';
import { getMaintenanceTickets, createMaintenanceTicket, updateMaintenanceTicket } from '@/api/maintenance';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate } from '@/lib/utils';
import { mockRooms } from '@/mocks/data';
import type { MaintenanceTicket, MaintenancePriority, MaintenanceStatus } from '@/types';
import { toast } from 'sonner';

const PRIORITY_BADGES: Record<MaintenancePriority, string> = {
  Urgent: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-bold',
  High: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold',
  Normal: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  Low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export function MaintenancePage() {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Ticket State
  const [roomId, setRoomId] = useState('GOM-201');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MaintenanceTicket['category']>('AC/Heater');
  const [priority, setPriority] = useState<MaintenancePriority>('Urgent');
  const [assignedTo, setAssignedTo] = useState('Shuaib Khan');
  const [cost, setCost] = useState(0);
  const [notes, setNotes] = useState('');

  const { data: tickets = [] } = useQuery({
    queryKey: ['maintenance'],
    queryFn: getMaintenanceTickets,
  });

  const urgentCount = tickets.filter(t => t.priority === 'Urgent' && t.status !== 'Resolved').length;
  const inProgressCount = tickets.filter(t => t.status === 'In Progress').length;
  const resolvedCount = tickets.filter(t => t.status === 'Resolved' || t.status === 'Verified').length;
  const totalCost = tickets.reduce((s, t) => s + t.cost, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      toast.error('Please enter issue title');
      return;
    }

    await createMaintenanceTicket({
      room_id: roomId,
      title,
      category,
      priority,
      status: 'Pending',
      reported_date: new Date().toISOString().slice(0, 10),
      assigned_to: assignedTo,
      cost: Number(cost),
      notes: notes || undefined,
    });

    queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    toast.success('Maintenance ticket logged!');
    setIsAddModalOpen(false);
    setTitle('');
  };

  const handleResolve = async (id: string) => {
    await updateMaintenanceTicket(id, {
      status: 'Resolved',
      resolved_date: new Date().toISOString().slice(0, 10),
    });
    queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    toast.success('Ticket marked as Resolved!');
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Maintenance & Work Orders"
        subtitle="AC repairs, plumbing leaks, fiber connectivity, appliances, and handyman tickets"
        action={
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-xs font-bold text-xs h-9">
            <Plus size={15} /> Log Issue
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Urgent Repairs"
          value={urgentCount}
          subtitle="Requiring immediate fix"
          icon={AlertTriangle}
          iconColor="text-red-500"
        />
        <StatCard
          title="In Progress"
          value={inProgressCount}
          subtitle="Technician dispatched"
          icon={Clock}
          iconColor="text-amber-600"
        />
        <StatCard
          title="Resolved"
          value={resolvedCount}
          subtitle="Restored this month"
          icon={CheckCircle2}
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Repair Incurred"
          value={formatCurrency(totalCost)}
          subtitle="Parts & technician fees"
          icon={IndianRupee}
          iconColor="text-purple-600"
        />
      </div>

      {/* Tickets List */}
      <Card>
        <CardHeader>
          <CardTitle>Open & Recent Maintenance Tickets</CardTitle>
          <p className="text-xs text-muted-foreground">Property-tagged issues tracked until verified</p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="pb-3 font-semibold">Ticket ID</th>
                  <th className="pb-3 font-semibold">Unit</th>
                  <th className="pb-3 font-semibold">Issue Description</th>
                  <th className="pb-3 font-semibold">Priority</th>
                  <th className="pb-3 font-semibold">Assigned Tech</th>
                  <th className="pb-3 font-semibold">Reported</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {tickets.map((t, idx) => (
                  <motion.tr
                    key={t.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="py-3.5 font-mono text-xs font-semibold text-foreground">
                      {t.id}
                    </td>
                    <td className="py-3.5 text-xs font-bold text-foreground">
                      {t.room_id}
                    </td>
                    <td className="py-3.5 pr-4">
                      <div className="font-semibold text-foreground">{t.title}</div>
                      <div className="text-xs text-muted-foreground">
                        Category: {t.category} {t.cost > 0 && `· Cost: ${formatCurrency(t.cost)}`}
                      </div>
                    </td>
                    <td className="py-3.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${PRIORITY_BADGES[t.priority]}`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3.5 text-xs font-medium text-foreground">
                      {t.assigned_to || 'Unassigned'}
                    </td>
                    <td className="py-3.5 text-xs text-muted-foreground">
                      {formatDate(t.reported_date)}
                    </td>
                    <td className="py-3.5">
                      <span className={`text-xs font-semibold capitalize ${
                        t.status === 'Resolved' ? 'text-emerald-600' :
                        t.status === 'In Progress' ? 'text-blue-600' : 'text-amber-600'
                      }`}>
                        {t.status === 'Resolved' ? '✓ Resolved' : t.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-right">
                      {t.status !== 'Resolved' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => handleResolve(t.id)}
                        >
                          Mark Fixed
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

      {/* Log Issue Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Log Maintenance Issue">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Property Unit *
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
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                <option value="AC/Heater">🌡️ AC / Heater</option>
                <option value="Plumbing">🚿 Plumbing & Taps</option>
                <option value="Electrical">🔌 Electrical & Lighting</option>
                <option value="WiFi/Internet">📶 Wi-Fi & Internet</option>
                <option value="Appliances">📱 Smart TV / Microwave</option>
                <option value="Furniture">🪑 Furniture & Bed</option>
                <option value="Locks/Keys">🔑 Smart Locks / Keys</option>
                <option value="Other">📦 Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
              Issue Title *
            </label>
            <Input
              placeholder="e.g. Master bathroom geyser water heating slow"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={e => setPriority(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                <option value="Urgent">🔴 Urgent (Guest checked-in)</option>
                <option value="High">🟡 High</option>
                <option value="Normal">🟢 Normal</option>
                <option value="Low">🔵 Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Assigned Technician
              </label>
              <Input
                placeholder="e.g. Shuaib Khan"
                value={assignedTo}
                onChange={e => setAssignedTo(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
              Estimated Repair Cost (₹)
            </label>
            <Input
              type="number"
              value={cost}
              onChange={e => setCost(Number(e.target.value))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Log Ticket
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
