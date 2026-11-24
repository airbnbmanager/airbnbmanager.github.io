import type {
  Employee,
  AttendanceRecord,
  AttendanceStatus,
  StaffAdvance,
  TurnaroundTask,
} from '@/types';
import { mockEmployees } from '@/mocks/data';

let emps = [...mockEmployees];

// Initial Attendance Records (for today)
const todayStr = new Date().toISOString().slice(0, 10);
let attendanceLog: AttendanceRecord[] = [
  {
    id: 'ATT-101',
    emp_id: 'EMP-001',
    emp_name: 'Praveen Singh',
    role: 'Property Manager',
    date: todayStr,
    status: 'Present',
    check_in_time: '09:00 AM',
    notes: 'Managing operations & bookings',
  },
  {
    id: 'ATT-102',
    emp_id: 'EMP-002',
    emp_name: 'Kanchan Devi',
    role: 'Cleaner / Maid',
    date: todayStr,
    status: 'Present',
    check_in_time: '09:30 AM',
    notes: 'Cleaning Gomti Nagar flats',
  },
  {
    id: 'ATT-103',
    emp_id: 'EMP-003',
    emp_name: 'Shalu',
    role: 'Cleaner / Maid',
    date: todayStr,
    status: 'Present',
    check_in_time: '10:00 AM',
    notes: 'Turnaround at Eldeco villa',
  },
  {
    id: 'ATT-104',
    emp_id: 'EMP-004',
    emp_name: 'Arman Ali',
    role: 'Caretaker',
    date: todayStr,
    status: 'Half Day',
    check_in_time: '02:00 PM',
    notes: 'Late shift check-in handover',
  },
  {
    id: 'ATT-105',
    emp_id: 'EMP-005',
    emp_name: 'Rameshwar Verma',
    role: 'Maintenance Technician',
    date: todayStr,
    status: 'Present',
    check_in_time: '09:15 AM',
    notes: 'On-site AC inspection',
  },
];

// Initial Staff Advances
let staffAdvances: StaffAdvance[] = [
  {
    id: 'ADV-001',
    emp_id: 'EMP-002',
    emp_name: 'Kanchan Devi',
    amount: 1500,
    date_given: '2026-11-15',
    reason: 'Family medical expense advance',
    repaid_amount: 0,
    remaining_balance: 1500,
    is_deducted: false,
    payment_mode: 'Cash',
  },
  {
    id: 'ADV-002',
    emp_id: 'EMP-003',
    emp_name: 'Shalu',
    amount: 500,
    date_given: '2026-11-18',
    reason: 'Emergency travel advance',
    repaid_amount: 0,
    remaining_balance: 500,
    is_deducted: false,
    payment_mode: 'Cash',
  },
  {
    id: 'ADV-003',
    emp_id: 'EMP-004',
    emp_name: 'Arman Ali',
    amount: 2000,
    date_given: '2026-11-10',
    reason: 'Festival advance; to adjust in monthly pay',
    repaid_amount: 0,
    remaining_balance: 2000,
    is_deducted: false,
    payment_mode: 'UPI',
  },
];

// Initial Turnaround Tasks
let turnaroundTasks: TurnaroundTask[] = [
  {
    id: 'TRN-101',
    room_id: 'FLAT101',
    property_name: 'RedRose Palace',
    cleaner_id: 'EMP-002',
    cleaner_name: 'Kanchan Devi',
    date: todayStr,
    rate_per_flat: 250,
    status: 'Clean & Inspected',
    linen_changed: true,
    toiletries_restocked: true,
    is_paid: false,
    notes: 'Checkout clean done. All linen replaced and sprayed.',
  },
  {
    id: 'TRN-102',
    room_id: 'FLAT102',
    property_name: 'Black Beauty',
    cleaner_id: 'EMP-002',
    cleaner_name: 'Kanchan Devi',
    date: todayStr,
    rate_per_flat: 250,
    status: 'Cleaning',
    linen_changed: true,
    toiletries_restocked: false,
    is_paid: false,
    notes: 'Guest checking in at 3 PM today.',
  },
  {
    id: 'TRN-103',
    room_id: 'GOM-201',
    property_name: 'Gomti Grand Villa',
    cleaner_id: 'EMP-003',
    cleaner_name: 'Shalu',
    date: todayStr,
    rate_per_flat: 250,
    status: 'Dirty',
    linen_changed: false,
    toiletries_restocked: false,
    is_paid: false,
    notes: 'Airbnb guest checkout at 11:00 AM.',
  },
  {
    id: 'TRN-104',
    room_id: 'VIL-101',
    property_name: 'Celebrity Garden',
    cleaner_id: 'EMP-003',
    cleaner_name: 'Shalu',
    date: todayStr,
    rate_per_flat: 250,
    status: 'Clean & Inspected',
    linen_changed: true,
    toiletries_restocked: true,
    is_paid: true,
    notes: 'VIP check-in ready.',
  },
];

// ─── EMPLOYEES CRUD ──────────────────────────────────────────────────────────
export async function getEmployees(): Promise<Employee[]> {
  await new Promise(r => setTimeout(r, 100));
  return [...emps];
}

export async function createEmployee(payload: Omit<Employee, 'emp_id'>): Promise<Employee> {
  await new Promise(r => setTimeout(r, 150));
  const newEmp: Employee = {
    ...payload,
    emp_id: `EMP-${String(emps.length + 1).padStart(3, '0')}`,
  };
  emps.unshift(newEmp);
  return newEmp;
}

export async function updateEmployee(id: string, payload: Partial<Employee>): Promise<Employee> {
  await new Promise(r => setTimeout(r, 100));
  const idx = emps.findIndex(e => e.emp_id === id);
  if (idx === -1) throw new Error('Employee not found');
  emps[idx] = { ...emps[idx], ...payload };
  return emps[idx];
}

// ─── ATTENDANCE TRACKER ──────────────────────────────────────────────────────
export async function getAttendance(date?: string): Promise<AttendanceRecord[]> {
  await new Promise(r => setTimeout(r, 80));
  const targetDate = date || todayStr;
  
  // Ensure every active employee has an attendance record for the date
  emps.forEach(emp => {
    const existing = attendanceLog.find(a => a.emp_id === emp.emp_id && a.date === targetDate);
    if (!existing) {
      attendanceLog.push({
        id: `ATT-${Date.now()}-${emp.emp_id}`,
        emp_id: emp.emp_id,
        emp_name: emp.name,
        role: emp.role,
        date: targetDate,
        status: 'Present',
        check_in_time: '09:00 AM',
      });
    }
  });

  return attendanceLog.filter(a => a.date === targetDate);
}

export async function markAttendance(
  emp_id: string,
  status: AttendanceStatus,
  date?: string,
  notes?: string
): Promise<AttendanceRecord> {
  await new Promise(r => setTimeout(r, 80));
  const targetDate = date || todayStr;
  const idx = attendanceLog.findIndex(a => a.emp_id === emp_id && a.date === targetDate);
  const emp = emps.find(e => e.emp_id === emp_id);
  
  if (idx !== -1) {
    attendanceLog[idx] = {
      ...attendanceLog[idx],
      status,
      notes: notes !== undefined ? notes : attendanceLog[idx].notes,
    };
    return attendanceLog[idx];
  } else {
    const newRecord: AttendanceRecord = {
      id: `ATT-${Date.now()}-${emp_id}`,
      emp_id,
      emp_name: emp?.name || 'Staff',
      role: emp?.role || 'Staff',
      date: targetDate,
      status,
      notes,
    };
    attendanceLog.push(newRecord);
    return newRecord;
  }
}

// ─── STAFF ADVANCES & DEDUCTIONS ─────────────────────────────────────────────
export async function getStaffAdvances(): Promise<StaffAdvance[]> {
  await new Promise(r => setTimeout(r, 80));
  return [...staffAdvances];
}

export async function createStaffAdvance(payload: {
  emp_id: string;
  amount: number;
  reason: string;
  date_given?: string;
  payment_mode?: 'Cash' | 'UPI' | 'Company Account';
}): Promise<StaffAdvance> {
  await new Promise(r => setTimeout(r, 100));
  const emp = emps.find(e => e.emp_id === payload.emp_id);
  const newAdv: StaffAdvance = {
    id: `ADV-${String(staffAdvances.length + 1).padStart(3, '0')}`,
    emp_id: payload.emp_id,
    emp_name: emp?.name || 'Staff',
    amount: payload.amount,
    date_given: payload.date_given || todayStr,
    reason: payload.reason,
    repaid_amount: 0,
    remaining_balance: payload.amount,
    is_deducted: false,
    payment_mode: payload.payment_mode || 'Cash',
  };
  staffAdvances.unshift(newAdv);

  // Update employee advance balance
  if (emp) {
    emp.advances_balance = (emp.advances_balance || 0) + payload.amount;
  }

  return newAdv;
}

export async function deductStaffAdvance(advance_id: string, deductAmount: number): Promise<StaffAdvance> {
  await new Promise(r => setTimeout(r, 100));
  const adv = staffAdvances.find(a => a.id === advance_id);
  if (!adv) throw new Error('Advance not found');

  adv.repaid_amount += deductAmount;
  adv.remaining_balance = Math.max(0, adv.amount - adv.repaid_amount);
  if (adv.remaining_balance === 0) {
    adv.is_deducted = true;
  }

  // Update employee balance
  const emp = emps.find(e => e.emp_id === adv.emp_id);
  if (emp) {
    emp.advances_balance = Math.max(0, (emp.advances_balance || 0) - deductAmount);
  }

  return adv;
}

// ─── TURNAROUND TASKS & HOUSEKEEPING ─────────────────────────────────────────
export async function getTurnaroundTasks(): Promise<TurnaroundTask[]> {
  await new Promise(r => setTimeout(r, 80));
  return [...turnaroundTasks];
}

export async function updateTurnaroundStatus(
  taskId: string,
  status: 'Dirty' | 'Cleaning' | 'Clean & Inspected'
): Promise<TurnaroundTask> {
  await new Promise(r => setTimeout(r, 80));
  const idx = turnaroundTasks.findIndex(t => t.id === taskId);
  if (idx === -1) throw new Error('Task not found');

  turnaroundTasks[idx].status = status;
  if (status === 'Clean & Inspected') {
    turnaroundTasks[idx].linen_changed = true;
    turnaroundTasks[idx].toiletries_restocked = true;
    
    // Increment completed turns this month for the cleaner
    const emp = emps.find(e => e.emp_id === turnaroundTasks[idx].cleaner_id);
    if (emp) {
      emp.completed_turns_this_month = (emp.completed_turns_this_month || 0) + 1;
    }
  }

  return turnaroundTasks[idx];
}

export async function createTurnaroundTask(payload: {
  room_id: string;
  property_name: string;
  cleaner_id: string;
  rate_per_flat?: number;
  notes?: string;
}): Promise<TurnaroundTask> {
  await new Promise(r => setTimeout(r, 100));
  const emp = emps.find(e => e.emp_id === payload.cleaner_id);
  const newTask: TurnaroundTask = {
    id: `TRN-${100 + turnaroundTasks.length + 1}`,
    room_id: payload.room_id,
    property_name: payload.property_name,
    cleaner_id: payload.cleaner_id,
    cleaner_name: emp?.name || 'Housekeeping',
    date: todayStr,
    rate_per_flat: payload.rate_per_flat || emp?.per_flat_rate || 250,
    status: 'Dirty',
    linen_changed: false,
    toiletries_restocked: false,
    is_paid: false,
    notes: payload.notes || 'Room turnover assigned.',
  };
  turnaroundTasks.unshift(newTask);
  return newTask;
}
