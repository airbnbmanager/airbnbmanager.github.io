import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Phone,
  Mail,
  Calendar,
  IndianRupee,
  Plus,
  Search,
  Sparkles,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  MessageCircle,
  FileText,
  BadgeCheck,
  Sparkle,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';
import {
  getEmployees,
  createEmployee,
  getAttendance,
  markAttendance,
  getStaffAdvances,
  createStaffAdvance,
  deductStaffAdvance,
  getTurnaroundTasks,
  updateTurnaroundStatus,
  createTurnaroundTask,
} from '@/api/employees';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatCard } from '@/components/shared/StatCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { formatCurrency, formatDate, getInitials } from '@/lib/utils';
import type { Employee, EmployeeRole, AttendanceStatus } from '@/types';
import { mockRooms } from '@/mocks/data';
import { toast } from 'sonner';

const ROLE_BADGES: Record<string, { label: string; badge: string; icon: string }> = {
  'Property Manager': { label: 'Manager', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300', icon: '👑' },
  'Caretaker': { label: 'Caretaker', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300', icon: '🛡️' },
  'Housekeeper': { label: 'Housekeeper', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300', icon: '🧹' },
  'Cleaner / Maid': { label: 'Cleaner (Piece-rate)', badge: 'bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300', icon: '🌸' },
  'Maintenance Technician': { label: 'Technician', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', icon: '🔧' },
};

type HRMSTab = 'directory' | 'attendance' | 'advances' | 'tasks';

export function EmployeesPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<HRMSTab>('directory');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  // Modals State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [isTurnaroundModalOpen, setIsTurnaroundModalOpen] = useState(false);

  // New Employee Form
  const [name, setName] = useState('');
  const [role, setRole] = useState<EmployeeRole>('Caretaker');
  const [phone, setPhone] = useState('');
  const [payType, setPayType] = useState<'monthly' | 'per_flat'>('monthly');
  const [salary, setSalary] = useState(18000);
  const [perFlatRate, setPerFlatRate] = useState(250);

  // New Advance Form
  const [advEmpId, setAdvEmpId] = useState('');
  const [advAmount, setAdvAmount] = useState<number>(1000);
  const [advReason, setAdvReason] = useState('');

  // New Turnaround Form
  const [turnRoomId, setTurnRoomId] = useState('');
  const [turnCleanerId, setTurnCleanerId] = useState('');

  // Queries
  const { data: employees = [] } = useQuery({
    queryKey: ['employees'],
    queryFn: getEmployees,
  });

  const { data: attendanceList = [] } = useQuery({
    queryKey: ['attendance', selectedDate],
    queryFn: () => getAttendance(selectedDate),
  });

  const { data: advancesList = [] } = useQuery({
    queryKey: ['staff_advances'],
    queryFn: getStaffAdvances,
  });

  const { data: turnaroundList = [] } = useQuery({
    queryKey: ['turnaround_tasks'],
    queryFn: getTurnaroundTasks,
  });

  // KPI Calculations
  const totalMonthlyPayroll = employees
    .filter(e => e.status === 'active')
    .reduce((sum, e) => {
      if (e.pay_type === 'monthly') return sum + e.salary;
      return sum + ((e.completed_turns_this_month || 0) * (e.per_flat_rate || 250));
    }, 0);

  const totalAdvancesBalance = advancesList
    .filter(a => !a.is_deducted)
    .reduce((s, a) => s + a.remaining_balance, 0);

  const presentToday = attendanceList.filter(a => a.status === 'Present').length;
  const halfDayToday = attendanceList.filter(a => a.status === 'Half Day').length;
  const absentToday = attendanceList.filter(a => a.status === 'Absent').length;

  const turnsCleaned = turnaroundList.filter(t => t.status === 'Clean & Inspected').length;

  // Filtered employees
  const filteredEmployees = employees.filter(e => {
    const q = search.toLowerCase();
    const matchSearch = !q || e.name.toLowerCase().includes(q) || e.phone.includes(q) || e.role.toLowerCase().includes(q);
    const matchRole = roleFilter === 'all' || e.role === roleFilter;
    return matchSearch && matchRole;
  });

  // Handlers
  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error('Please enter name and phone number');
      return;
    }

    await createEmployee({
      name,
      role,
      phone,
      pay_type: payType,
      salary: payType === 'monthly' ? Number(salary) : 0,
      per_flat_rate: payType === 'per_flat' ? Number(perFlatRate) : undefined,
      status: 'active',
      join_date: new Date().toISOString().slice(0, 10),
      advances_balance: 0,
      completed_turns_this_month: 0,
    });

    queryClient.invalidateQueries({ queryKey: ['employees'] });
    toast.success(`Staff member ${name} registered successfully!`);
    setIsAddModalOpen(false);
    setName('');
    setPhone('');
  };

  const handleMarkAttendance = async (empId: string, status: AttendanceStatus) => {
    await markAttendance(empId, status, selectedDate);
    queryClient.invalidateQueries({ queryKey: ['attendance', selectedDate] });
    toast.success(`Attendance updated to ${status}`);
  };

  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advEmpId || !advAmount) {
      toast.error('Select employee and enter advance amount');
      return;
    }

    await createStaffAdvance({
      emp_id: advEmpId,
      amount: Number(advAmount),
      reason: advReason || 'Salary advance',
    });

    queryClient.invalidateQueries({ queryKey: ['staff_advances'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    toast.success('Advance recorded & linked to employee ledger!');
    setIsAdvanceModalOpen(false);
    setAdvAmount(1000);
    setAdvReason('');
  };

  const handleDeductAdvance = async (advanceId: string, amount: number) => {
    await deductStaffAdvance(advanceId, amount);
    queryClient.invalidateQueries({ queryKey: ['staff_advances'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    toast.success(`Deducted ₹${amount.toLocaleString('en-IN')} against salary`);
  };

  const handleUpdateTurnStatus = async (taskId: string, status: 'Dirty' | 'Cleaning' | 'Clean & Inspected') => {
    await updateTurnaroundStatus(taskId, status);
    queryClient.invalidateQueries({ queryKey: ['turnaround_tasks'] });
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    toast.success(`Room status updated to ${status}`);
  };

  const handleCreateTurnaround = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!turnRoomId || !turnCleanerId) {
      toast.error('Please select both room and cleaner');
      return;
    }
    const room = mockRooms.find(r => r.room_id === turnRoomId);
    await createTurnaroundTask({
      room_id: turnRoomId,
      property_name: room?.nickname || room?.property_name || 'Unit',
      cleaner_id: turnCleanerId,
    });

    queryClient.invalidateQueries({ queryKey: ['turnaround_tasks'] });
    toast.success('Room turnaround task logged!');
    setIsTurnaroundModalOpen(false);
  };

  return (
    <div className="page-container pb-24 lg:pb-12">
      {/* Page Header with Responsive Actions */}
      <PageHeader
        title="Staff & HRMS Management"
        subtitle="Manage care staff, daily attendance, advance tracking, and room turnaround tasks"
        action={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                if (activeTab === 'advances') setIsAdvanceModalOpen(true);
                else if (activeTab === 'tasks') setIsTurnaroundModalOpen(true);
                else setIsAddModalOpen(true);
              }}
              className="gap-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-xs font-bold text-xs h-9 px-3.5"
            >
              <Plus size={15} />
              {activeTab === 'advances'
                ? 'Give Advance'
                : activeTab === 'tasks'
                ? 'Log Turnaround'
                : 'Add Staff'}
            </Button>
          </div>
        }
      />

      {/* 4 Interactive Operational KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard
          title="Today's Attendance"
          value={`${presentToday} Present`}
          subtitle={`${halfDayToday} Half Day · ${absentToday} Absent`}
          icon={CheckCircle2}
          iconColor="text-emerald-600"
        />
        <StatCard
          title="Active Staff"
          value={employees.filter(e => e.status === 'active').length}
          subtitle="On-duty across 20 units"
          icon={Users}
          iconColor="text-[#0284C7]"
        />
        <StatCard
          title="Outstanding Advances"
          value={formatCurrency(totalAdvancesBalance)}
          subtitle="Linked to monthly pay deductions"
          icon={Wallet}
          iconColor="text-amber-600"
        />
        <StatCard
          title="Est. Month Payroll"
          value={formatCurrency(totalMonthlyPayroll)}
          subtitle={`${turnsCleaned} Turnarounds completed`}
          icon={IndianRupee}
          iconColor="text-purple-600"
        />
      </div>

      {/* ─── MOBILE & IPAD RESPONSIVE TABS ─────────────────────────────────── */}
      <div className="border-b border-border bg-card/60 backdrop-blur-xs rounded-xl p-1.5 shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: 'directory', label: '👥 Staff Directory', count: employees.length },
            { id: 'attendance', label: '📅 Daily Attendance', count: `${presentToday}/${employees.length}` },
            { id: 'advances', label: '💰 Advance Ledger', count: advancesList.filter(a => !a.is_deducted).length },
            { id: 'tasks', label: '🧹 Tasks & Cleaning Turns', count: turnaroundList.length },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as HRMSTab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-extrabold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#0284C7] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/25 text-white' : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── TAB 1: STAFF DIRECTORY ────────────────────────────────────────── */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Search & Role Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search staff by name, phone, role..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 h-9 text-xs"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
              {['all', 'Property Manager', 'Caretaker', 'Cleaner / Maid', 'Maintenance Technician'].map(r => (
                <button
                  key={r}
                  onClick={() => setRoleFilter(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                    roleFilter === r
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-2xs'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {r === 'all' ? 'All Roles' : r}
                </button>
              ))}
            </div>
          </div>

          {/* Staff Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5 md:gap-4">
            {filteredEmployees.map((emp, idx) => {
              const roleConfig = ROLE_BADGES[emp.role] || {
                label: emp.role,
                badge: 'bg-slate-100 text-slate-700',
                icon: '👤',
              };
              const estimatedEarnings =
                emp.pay_type === 'monthly'
                  ? emp.salary
                  : (emp.completed_turns_this_month || 0) * (emp.per_flat_rate || 250);

              const cleanPhone = emp.phone.replace(/[^0-9]/g, '');

              return (
                <Card key={emp.emp_id} className="h-full flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all">
                  <CardContent className="p-4 space-y-3.5">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar fallback={getInitials(emp.name)} className="w-11 h-11 border border-border" />
                        <div className="min-w-0">
                          <h3 className="font-extrabold text-foreground text-sm truncate">{emp.name}</h3>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
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

                    {/* Quick Contact Actions (Mobile Thumb Friendly) */}
                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`tel:${cleanPhone}`}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-xs font-bold text-foreground transition-all"
                      >
                        <Phone size={13} className="text-muted-foreground" /> Call
                      </a>
                      <a
                        href={`https://wa.me/91${cleanPhone.slice(-10)}?text=${encodeURIComponent(`Hello ${emp.name}, regarding TUHH operations:`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-xs font-bold text-emerald-600 border border-emerald-500/20 transition-all"
                      >
                        <MessageCircle size={13} /> WhatsApp
                      </a>
                    </div>

                    {/* Pay & Turns Summary */}
                    <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground font-medium">Structure:</span>
                        <span className="font-bold text-foreground">
                          {emp.pay_type === 'monthly' ? `Fixed ₹${emp.salary.toLocaleString('en-IN')}/mo` : `₹${emp.per_flat_rate}/flat clean`}
                        </span>
                      </div>
                      {emp.pay_type === 'per_flat' && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground font-medium">Turnovers Cleaned:</span>
                          <span className="font-extrabold text-[#0284C7]">
                            {emp.completed_turns_this_month} flats
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-border">
                        <span className="text-muted-foreground font-medium">Current Payable:</span>
                        <span className="font-black text-emerald-600">{formatCurrency(estimatedEarnings)}</span>
                      </div>
                    </div>
                  </CardContent>

                  {/* Card Footer: Advances & Pay Slip */}
                  <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-muted-foreground text-[11px]">Advance Balance:</span>
                      <span className={`font-black ml-1 text-xs ${emp.advances_balance > 0 ? 'text-amber-600' : 'text-foreground'}`}>
                        {formatCurrency(emp.advances_balance)}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs font-bold text-[#0284C7] hover:bg-sky-50 dark:hover:bg-sky-950"
                      onClick={() => toast.success(`Monthly Pay Slip generated for ${emp.name}`)}
                    >
                      <FileText size={12} className="mr-1" /> Slip
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 2: DAILY ATTENDANCE (1-TAP MARKING FOR MOBILE & IPAD) ────────── */}
      {activeTab === 'attendance' && (
        <div className="space-y-4">
          {/* Date Selector Bar */}
          <div className="bg-card border border-border rounded-xl p-3 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-[#0284C7]" />
              <span className="text-xs font-bold text-foreground">Select Attendance Date:</span>
              <Input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="h-8 text-xs font-bold w-auto"
              />
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                ✓ {presentToday} Present
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold">
                ½ {halfDayToday} Half Day
              </span>
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                ✗ {absentToday} Absent
              </span>
            </div>
          </div>

          {/* Attendance Cards List */}
          <div className="space-y-2.5">
            {attendanceList.map(rec => {
              return (
                <div
                  key={rec.id}
                  className="bg-card border border-border rounded-xl p-3.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <Avatar fallback={getInitials(rec.emp_name)} className="w-10 h-10 border border-border" />
                    <div>
                      <div className="font-extrabold text-sm text-foreground">{rec.emp_name}</div>
                      <div className="text-[11px] text-muted-foreground">{rec.role} · {rec.check_in_time || '09:00 AM'}</div>
                    </div>
                  </div>

                  {/* 1-Tap Touch Buttons for Mobile */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {(['Present', 'Half Day', 'Absent', 'Paid Leave'] as AttendanceStatus[]).map(st => {
                      const isSelected = rec.status === st;
                      const colorMap = {
                        'Present': isSelected ? 'bg-emerald-600 text-white' : 'hover:bg-emerald-50 text-emerald-700 dark:text-emerald-300',
                        'Half Day': isSelected ? 'bg-amber-500 text-white' : 'hover:bg-amber-50 text-amber-700 dark:text-amber-300',
                        'Absent': isSelected ? 'bg-rose-600 text-white' : 'hover:bg-rose-50 text-rose-700 dark:text-rose-300',
                        'Paid Leave': isSelected ? 'bg-sky-600 text-white' : 'hover:bg-sky-50 text-sky-700 dark:text-sky-300',
                      };

                      return (
                        <button
                          key={st}
                          type="button"
                          onClick={() => handleMarkAttendance(rec.emp_id, st)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-extrabold border transition-all ${colorMap[st]} ${
                            isSelected ? 'border-transparent shadow-xs scale-102' : 'border-border bg-card'
                          }`}
                        >
                          {st === 'Present' && '✓ '}
                          {st === 'Half Day' && '½ '}
                          {st === 'Absent' && '✗ '}
                          {st === 'Paid Leave' && '🌴 '}
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 3: STAFF ADVANCES LEDGER & DEDUCTIONS ─────────────────────── */}
      {activeTab === 'advances' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border border-border">
            <div>
              <h3 className="font-extrabold text-sm text-foreground">Staff Advances & Deductions Register</h3>
              <p className="text-xs text-muted-foreground">
                Total Outstanding Advances: <strong className="text-amber-600">{formatCurrency(totalAdvancesBalance)}</strong>
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsAdvanceModalOpen(true)}
              className="gap-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs h-8"
            >
              <Plus size={14} /> Record New Advance
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {advancesList.map(adv => (
              <Card key={adv.id} className="shadow-2xs">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-sm text-foreground">{adv.emp_name}</h4>
                      <p className="text-[11px] text-muted-foreground">{formatDate(adv.date_given)} · Via {adv.payment_mode}</p>
                    </div>
                    <Badge variant={adv.is_deducted ? 'outline' : 'default'} className={adv.is_deducted ? 'text-muted-foreground' : 'bg-amber-600 text-white'}>
                      {adv.is_deducted ? '✓ Settled' : 'Active Balance'}
                    </Badge>
                  </div>

                  <p className="text-xs bg-muted/50 p-2 rounded-lg italic text-foreground/80">
                    "{adv.reason}"
                  </p>

                  <div className="p-2.5 rounded-xl bg-card border border-border space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Original Advance:</span>
                      <span className="font-bold">{formatCurrency(adv.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Repaid / Deducted:</span>
                      <span className="font-bold text-emerald-600">{formatCurrency(adv.repaid_amount)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border">
                      <span className="text-muted-foreground font-bold">Remaining Due:</span>
                      <span className="font-black text-amber-600">{formatCurrency(adv.remaining_balance)}</span>
                    </div>
                  </div>

                  {!adv.is_deducted && adv.remaining_balance > 0 && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs h-7 font-bold border-emerald-500/30 text-emerald-600 hover:bg-emerald-50"
                        onClick={() => handleDeductAdvance(adv.id, Math.min(500, adv.remaining_balance))}
                      >
                        Deduct ₹500
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs h-7 font-bold bg-[#0284C7] hover:bg-[#0369A1] text-white"
                        onClick={() => handleDeductAdvance(adv.id, adv.remaining_balance)}
                      >
                        Full Clear
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* ─── TAB 4: TASKS & HOUSEKEEPING TURNAROUNDS ────────────────────────── */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-muted/30 p-3 rounded-xl border border-border">
            <div>
              <h3 className="font-extrabold text-sm text-foreground">Room Turnarounds & Cleaner Log</h3>
              <p className="text-xs text-muted-foreground">
                Piece-rate turnarounds automatically feed into cleaner payroll (₹250/clean).
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setIsTurnaroundModalOpen(true)}
              className="gap-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold text-xs h-8"
            >
              <Plus size={14} /> Assign Turnaround
            </Button>
          </div>

          <div className="space-y-2.5">
            {turnaroundList.map(task => {
              const statusColors = {
                'Dirty': 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300',
                'Cleaning': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
                'Clean & Inspected': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
              };

              return (
                <div
                  key={task.id}
                  className="bg-card border border-border rounded-xl p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 font-extrabold flex items-center justify-center text-xs">
                      {task.room_id.slice(0, 4)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-foreground">{task.property_name}</span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${statusColors[task.status]}`}>
                          {task.status}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Cleaner: <strong>{task.cleaner_name}</strong> · Rate: ₹{task.rate_per_flat} · {task.notes}
                      </div>
                    </div>
                  </div>

                  {/* 1-Tap Status Switcher */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={task.status === 'Dirty' ? 'default' : 'outline'}
                      className={`h-7 text-xs font-bold ${task.status === 'Dirty' ? 'bg-rose-600 text-white' : ''}`}
                      onClick={() => handleUpdateTurnStatus(task.id, 'Dirty')}
                    >
                      Dirty
                    </Button>
                    <Button
                      size="sm"
                      variant={task.status === 'Cleaning' ? 'default' : 'outline'}
                      className={`h-7 text-xs font-bold ${task.status === 'Cleaning' ? 'bg-amber-600 text-white' : ''}`}
                      onClick={() => handleUpdateTurnStatus(task.id, 'Cleaning')}
                    >
                      In Cleaning
                    </Button>
                    <Button
                      size="sm"
                      variant={task.status === 'Clean & Inspected' ? 'default' : 'outline'}
                      className={`h-7 text-xs font-bold ${task.status === 'Clean & Inspected' ? 'bg-emerald-600 text-white' : ''}`}
                      onClick={() => handleUpdateTurnStatus(task.id, 'Clean & Inspected')}
                    >
                      ✓ Inspected & Ready
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── MODAL 1: ADD EMPLOYEE ─────────────────────────────────────────── */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register Staff Member">
        <form onSubmit={handleCreateEmployee} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1">Full Name *</label>
            <Input placeholder="e.g. Laxmi Devi" value={name} onChange={e => setName(e.target.value)} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1">Role *</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value as any)}
                className="w-full h-9 rounded-lg border border-input bg-card px-2.5 text-xs font-bold"
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
              <label className="text-xs font-bold uppercase tracking-wider block mb-1">Phone *</label>
              <Input placeholder="9876543210" value={phone} onChange={e => setPhone(e.target.value)} required />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1">Pay Structure</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPayType('monthly')}
                className={`p-2.5 rounded-lg border text-xs font-bold text-left ${
                  payType === 'monthly' ? 'border-[#0284C7] bg-[#0284C7]/10 text-[#0284C7]' : 'border-border bg-card'
                }`}
              >
                Fixed Monthly Salary
              </button>
              <button
                type="button"
                onClick={() => setPayType('per_flat')}
                className={`p-2.5 rounded-lg border text-xs font-bold text-left ${
                  payType === 'per_flat' ? 'border-[#0284C7] bg-[#0284C7]/10 text-[#0284C7]' : 'border-border bg-card'
                }`}
              >
                Per-Flat Clean Piece Rate
              </button>
            </div>
          </div>

          {payType === 'monthly' ? (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1">Monthly Salary (₹)</label>
              <Input type="number" value={salary} onChange={e => setSalary(Number(e.target.value))} />
            </div>
          ) : (
            <div>
              <label className="text-xs font-bold uppercase tracking-wider block mb-1">Rate Per Clean Flat (₹)</label>
              <Input type="number" value={perFlatRate} onChange={e => setPerFlatRate(Number(e.target.value))} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold">
              Register Staff
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 2: GIVE ADVANCE ─────────────────────────────────────────── */}
      <Modal isOpen={isAdvanceModalOpen} onClose={() => setIsAdvanceModalOpen(false)} title="Record Staff Advance">
        <form onSubmit={handleCreateAdvance} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1">Select Employee *</label>
            <select
              value={advEmpId}
              onChange={e => setAdvEmpId(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-card px-2.5 text-xs font-bold"
              required
            >
              <option value="">-- Choose Staff Member --</option>
              {employees.map(e => (
                <option key={e.emp_id} value={e.emp_id}>
                  {e.name} ({e.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1">Advance Amount (₹) *</label>
            <Input
              type="number"
              value={advAmount}
              onChange={e => setAdvAmount(Number(e.target.value))}
              placeholder="e.g. 1500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1">Reason / Purpose</label>
            <Input
              value={advReason}
              onChange={e => setAdvReason(e.target.value)}
              placeholder="e.g. Medical emergency, festival advance"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsAdvanceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold">
              Record Advance
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL 3: LOG ROOM TURNAROUND ──────────────────────────────────── */}
      <Modal isOpen={isTurnaroundModalOpen} onClose={() => setIsTurnaroundModalOpen(false)} title="Assign Room Turnaround">
        <form onSubmit={handleCreateTurnaround} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1">Select Property Unit *</label>
            <select
              value={turnRoomId}
              onChange={e => setTurnRoomId(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-card px-2.5 text-xs font-bold"
              required
            >
              <option value="">-- Select Room / Unit --</option>
              {mockRooms.map(r => (
                <option key={r.room_id} value={r.room_id}>
                  {r.unit_no} — {r.nickname || r.property_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider block mb-1">Assigned Cleaner *</label>
            <select
              value={turnCleanerId}
              onChange={e => setTurnCleanerId(e.target.value)}
              className="w-full h-9 rounded-lg border border-input bg-card px-2.5 text-xs font-bold"
              required
            >
              <option value="">-- Select Cleaner --</option>
              {employees.filter(e => e.role === 'Cleaner / Maid' || e.role === 'Caretaker' || e.role === 'Housekeeper').map(e => (
                <option key={e.emp_id} value={e.emp_id}>
                  {e.name} ({e.role})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border">
            <Button variant="outline" type="button" onClick={() => setIsTurnaroundModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold">
              Assign Turnaround
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
