import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Plus,
  Search,
  Sparkles,
  Award,
  Wallet,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { getEmployees, createEmployee } from '@/api/employees';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import type { Employee, EmployeeRole } from '@/types';
import { toast } from 'sonner';

const ROLE_BADGES: Record<string, { label: string; badge: string; icon: string }> = {
  'Property Manager': { label: 'Manager', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300', icon: '👑' },
  'Caretaker': { label: 'Caretaker', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300', icon: '🛡️' },
  'Housekeeper': { label: 'Housekeeper', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300', icon: '🧹' },
  'Cleaner / Maid': { label: 'Cleaner (Piece-rate)', badge: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300', icon: '🌸' },
  'Maintenance Technician': { label: 'Technician', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', icon: '🔧' },
};

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Employee Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<EmployeeRole>('Caretaker');
  const [phone, setPhone] = useState('');
  const [payType, setPayType] = useState<'monthly' | 'per_flat'>('monthly');
  const [salary, setSalary] = useState(18000);
  const [perFlatRate, setPerFlatRate] = useState(250);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  });

  const filtered = employees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.name.toLowerCase().includes(q) || e.phone.includes(q) || e.role.toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || e.role === roleFilter;
    return matchSearch && matchRole;
  });

  const totalMonthlyPayroll = employees
    .filter(e => e.status === 'active')
    .reduce((sum, e) => {
      if (e.pay_type === 'monthly') return sum + e.salary;
      return sum + ((e.completed_turns_this_month || 0) * (e.per_flat_rate || 250));
    }, 0);

  const totalAdvances = employees.reduce((s, e) => s + e.advances_balance, 0);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error('Please enter name and phone number');
      return;
    }

    await createEmployee({
      name,
      role,
      phone,
      payType: payType,
      salary: payType === 'monthly' ? Number(salary) : 0,
      per_flat_rate: payType === 'per_flat' ? Number(perFlatRate) : undefined,
      status: 'active',
      join_date: new Date().toISOString().slice(0, 10),
      advances_balance: 0,
      completed_turns_this_month: 0,
    } as any);

    queryClient.invalidateQueries({ queryKey: ['employees'] });
    toast.success(`Staff member ${name} added to HRMS!`);
    setIsAddModalOpen(false);
    setName('');
    setPhone('');
  };

  return (
    <div className="page-container">
      <PageHeader
        title="Employee Directory & HRMS"
        subtitle="Manage care staff, housekeepers, turnaround clean logs, and payroll"
        action={
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-1.5">
            <Plus size={15} /> Add Staff Member
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Staff"
          value={employees.filter(e => e.status === 'active').length}
          subtitle="On-duty across units"
          icon={Users}
          iconColor="text-blue-600"
        />
        <StatCard
          title="Est. Month Payroll"
          value={formatCurrency(totalMonthlyPayroll)}
          subtitle="Salaries + Clean Turn fees"
          icon={IndianRupee}
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Staff Advances"
          value={formatCurrency(totalAdvances)}
          subtitle="Outstanding advance ledger"
          icon={Wallet}
          iconColor="text-amber-600"
        />
        <StatCard
          title="Clean Turnarounds"
          value={employees.reduce((s, e) => s + (e.completed_turns_this_month || 0), 0)}
          subtitle="Completed this month"
          icon={Sparkles}
          iconColor="text-purple-600"
        />
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, role..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'Property Manager', 'Caretaker', 'Cleaner / Maid', 'Maintenance Technician'].map(r => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === r
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {r === 'all' ? 'All Staff' : r}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((emp, idx) => {
          const roleConfig = ROLE_BADGES[emp.role] || {
            label: emp.role,
            badge: 'bg-slate-100 text-slate-700',
            icon: '👤',
          };
          const estimatedEarnings =
            emp.pay_type === 'monthly'
              ? emp.salary
              : (emp.completed_turns_this_month || 0) * (emp.per_flat_rate || 250);

          return (
            <motion.div
              key={emp.emp_id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <Card className="h-full flex flex-col justify-between">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar fallback={getInitials(emp.name)} className="w-12 h-12" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-semibold text-foreground text-base leading-tight">
                            {emp.name}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${roleConfig.badge}`}>
                            {roleConfig.icon} {roleConfig.label}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {emp.emp_id}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground">
                    <a href={`tel:${emp.phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                      <Phone size={13} className="text-muted-foreground" /> +91 {emp.phone}
                    </a>
                    {emp.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail size={13} className="text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{emp.email}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-muted-foreground" /> Joined: {formatDate(emp.join_date)}
                    </div>
                  </div>

                  {emp.notes && (
                    <p className="text-xs bg-muted/60 p-2.5 rounded-lg text-foreground/80 italic border border-border">
                      "{emp.notes}"
                    </p>
                  )}

                  {/* Compensation Breakdown */}
                  <div className="p-3 rounded-xl bg-card border border-border space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pay Structure:</span>
                      <span className="font-bold text-foreground capitalize">
                        {emp.pay_type === 'monthly' ? 'Fixed Monthly' : `₹${emp.per_flat_rate}/flat clean`}
                      </span>
                    </div>
                    {emp.pay_type === 'per_flat' && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Turnovers Logged:</span>
                        <span className="font-bold text-primary">
                          {emp.completed_turns_this_month} flats cleaned
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-border">
                      <span className="text-muted-foreground">Month Payable:</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(estimatedEarnings)}</span>
                    </div>
                  </div>
                </CardContent>

                {/* Footer Advance Tracker & Actions */}
                <div className="p-4 pt-3 border-t border-border bg-muted/20 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground">Advances Taken:</span>
                    <span className={`font-bold ml-1.5 ${emp.advances_balance > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                      {formatCurrency(emp.advances_balance)}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => toast.success(`Salary slip sent via WhatsApp to ${emp.name}`)}
                  >
                    Pay Slip
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Add Employee Modal */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add Staff Member">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
              Full Name *
            </label>
            <Input placeholder="e.g. Laxmi Devi" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Role *
              </label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm"
              >
                <option value="Property Manager">Property Manager</option>
                <option value="Caretaker">Caretaker</option>
                <option value="Cleaner / Maid">Cleaner / Maid</option>
                <option value="Maintenance Technician">Maintenance Technician</option>
                <option value="Cook">Cook</option>
                <option value="Driver">Driver</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Phone Number *
              </label>
              <Input placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
              Payment Model
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayType('monthly')}
                className={`p-2.5 rounded-lg border text-xs font-semibold text-left ${
                  payType === 'monthly' ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                }`}
              >
                Fixed Monthly Salary
              </button>
              <button
                type="button"
                onClick={() => setPayType('per_flat')}
                className={`p-2.5 rounded-lg border text-xs font-semibold text-left ${
                  payType === 'per_flat' ? 'border-primary bg-primary/10 text-primary' : 'border-border'
                }`}
              >
                Per-Flat Piece Rate (Cleaners)
              </button>
            </div>
          </div>

          {payType === 'monthly' ? (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Monthly Salary (₹)
              </label>
              <Input
                type="number"
                value={salary}
                onChange={e => setSalary(Number(e.target.value))}
              />
            </div>
          ) : (
            <div>
              <label className="text-xs font-semibold uppercase tracking-wider block mb-1">
                Rate Per Clean Flat Turnaround (₹)
              </label>
              <Input
                type="number"
                value={perFlatRate}
                onChange={e => setPerFlatRate(Number(e.target.value))}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Register Employee
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
