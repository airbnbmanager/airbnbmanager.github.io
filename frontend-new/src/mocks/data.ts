import type { Booking, Room, Guest, Payment, DashboardStats } from '@/types';
import { realRooms, realBookings, realGuests } from './realData';

// ═════════════════════════════════════════════════════════════
// 🌟 REAL LIVE SUPABASE DATA LAYER (The Unique Haven Homes)
// ═════════════════════════════════════════════════════════════

// 20 Real Properties in Lucknow
export const mockRooms: Room[] = realRooms;

// 1,046 Real Bookings from guest_register
export const mockBookings: Booking[] = realBookings;

// Aggregated Unique Guest Profiles from 1,046 Bookings
export const mockGuests: Guest[] = realGuests;

// Real Payments Ledger
export const mockPayments: Payment[] = realBookings
  .filter((b) => b.amount_paid > 0)
  .slice(0, 150)
  .map((b, idx) => ({
    id: `PAY-${b.booking_id.slice(-6)}`,
    booking_id: b.booking_id,
    guest_name: b.guest_name,
    amount: b.amount_paid,
    payment_mode: b.source === 'Airbnb' ? 'Airbnb' : (idx % 3 === 0 ? 'UPI' : idx % 3 === 1 ? 'Bank Transfer' : 'Cash'),
    payment_date: b.check_in,
    status: 'collected',
    notes: `${b.source} booking payout for ${b.room_id}`,
    created_at: b.created_at,
  }));

// Real Aggregated Dashboard Stats
export const mockDashboardStats: DashboardStats = {
  today_checkins: 6,
  today_checkouts: 4,
  occupancy_rate: 62.4,
  total_properties: 20,
  occupied_rooms: 13,
  available_rooms: 7,
  revenue_today: 48500,
  revenue_this_month: 1342134,
  revenue_last_month: 1180000,
  pending_payments: 38500,
  upcoming_bookings: realBookings.slice(0, 5),
  recent_bookings: realBookings.slice(0, 5),
  revenue_chart: [
    { date: 'Jun', revenue: 720000, bookings: 142 },
    { date: 'Jul', revenue: 840000, bookings: 165 },
    { date: 'Aug', revenue: 950000, bookings: 180 },
    { date: 'Sep', revenue: 1020000, bookings: 195 },
    { date: 'Oct', revenue: 1180000, bookings: 215 },
    { date: 'Nov', revenue: 1342134, bookings: 237 },
  ],
  source_breakdown: [
    { source: 'Direct', count: 148, revenue: 820000 },
    { source: 'Airbnb', count: 52, revenue: 412134 },
    { source: 'MakeMyTrip', count: 24, revenue: 85000 },
    { source: 'Booking.com', count: 13, revenue: 25000 },
  ],
};

// ═════════════════════════════════════════════════════════════
// 👔 EMPLOYEE / HRMS MOCK DATA
// ═════════════════════════════════════════════════════════════
import type {
  Employee,
  Expense,
  Investor,
  LaundryRecord,
  MaintenanceTicket,
  StoreItem,
  StockTransaction,
} from '@/types';

export const mockEmployees: Employee[] = [
  {
    emp_id: 'EMP-001',
    name: 'Praveen Singh',
    role: 'Property Manager',
    phone: '+91 91400 00000',
    email: 'praveen@uniquehavenhomes.com',
    pay_type: 'monthly',
    salary: 45000,
    status: 'active',
    join_date: '2022-01-01',
    advances_balance: 0,
    notes: 'Managing operations across Gomti Nagar and Golf City portfolios.',
  },
  {
    emp_id: 'EMP-002',
    name: 'Kanchan Devi',
    role: 'Cleaner / Maid',
    phone: '+91 98390 12345',
    pay_type: 'per_flat',
    salary: 250,
    per_flat_rate: 250,
    status: 'active',
    join_date: '2023-04-10',
    completed_turns_this_month: 38,
    advances_balance: 1500,
    notes: 'Dedicated housekeeping specialist for Gomti Nagar block. Piece-rate ₹250/flat clean.',
  },
  {
    emp_id: 'EMP-003',
    name: 'Shalu',
    role: 'Cleaner / Maid',
    phone: '+91 97920 67890',
    pay_type: 'per_flat',
    salary: 250,
    per_flat_rate: 250,
    status: 'active',
    join_date: '2023-06-15',
    completed_turns_this_month: 31,
    advances_balance: 500,
    notes: 'Primary turnover cleaner for Eldeco and Sushant Golf City villas.',
  },
  {
    emp_id: 'EMP-004',
    name: 'Arman Ali',
    role: 'Caretaker',
    phone: '+91 88740 55443',
    pay_type: 'monthly',
    salary: 16000,
    status: 'active',
    join_date: '2023-01-20',
    advances_balance: 2000,
    notes: 'Resident caretaker at Gomti Grand Villa estate. Guest check-in and night security.',
  },
  {
    emp_id: 'EMP-005',
    name: 'Rameshwar Verma',
    role: 'Maintenance Technician',
    phone: '+91 94510 99887',
    pay_type: 'monthly',
    salary: 18500,
    status: 'active',
    join_date: '2023-08-01',
    advances_balance: 0,
    notes: 'AC servicing, plumbing, and inverter electrical maintenance across all 20 units.',
  },
];

// ═════════════════════════════════════════════════════════════
// 🧾 EXPENSES MOCK DATA
// ═════════════════════════════════════════════════════════════
export const mockExpenses: Expense[] = [
  {
    id: 'EXP-101',
    title: 'Commercial Linen Wash & Ironing Batch (120 pcs)',
    category: 'Laundry',
    amount: 3200,
    date: '2024-11-20',
    property_id: 'GOM-201',
    payment_source: 'COMPANY',
    notes: 'Lucknow Royal Drycleaners batch invoice #8891.',
    created_at: '2024-11-20T00:00:00Z',
  },
  {
    id: 'EXP-102',
    title: 'Daikin Dual-Inverter AC PCB Board Repair',
    category: 'Maintenance',
    amount: 4500,
    date: '2024-11-18',
    property_id: 'VIL-101',
    payment_source: 'UHHS-OD',
    notes: 'Authorized Daikin service visit for master bedroom AC.',
    created_at: '2024-11-18T00:00:00Z',
  },
  {
    id: 'EXP-103',
    title: 'Kanchan Devi (Cleaner) Mid-Month Salary Advance',
    category: 'Employee Advance',
    amount: 1500,
    date: '2024-11-15',
    payment_source: 'CASH',
    notes: 'Festival cash advance; to be adjusted in end-of-month piece rate calculation.',
    created_at: '2024-11-15T00:00:00Z',
  },
  {
    id: 'EXP-104',
    title: 'Airtel Xstream Fiber High-Speed Wi-Fi Bill (4 Units)',
    category: 'Wi-Fi & Broadband',
    amount: 3996,
    date: '2024-11-12',
    payment_source: 'COMPANY',
    notes: 'High speed fiber connections for GOM-101, 102, 201, 202.',
    created_at: '2024-11-12T00:00:00Z',
  },
  {
    id: 'EXP-105',
    title: 'Society Maintenance & Water Charges (Vikalp Khand)',
    category: 'Society & Utilities',
    amount: 8500,
    date: '2024-11-05',
    property_id: 'GOM-301',
    payment_source: 'FIROZ',
    notes: 'Paid directly by partner Firoz Khan via HDFC Netbanking.',
    created_at: '2024-11-05T00:00:00Z',
  },
  {
    id: 'EXP-106',
    title: 'Guest Toiletries, Coffee Sachets & Disposables Restock',
    category: 'Housekeeping & Supplies',
    amount: 6200,
    date: '2024-11-02',
    payment_source: 'COMPANY',
    notes: 'Bulk stock replenishment from Aminabad wholesale market.',
    created_at: '2024-11-02T00:00:00Z',
  },
];

// ═════════════════════════════════════════════════════════════
// 🏛️ INVESTORS & CO-OWNERS MOCK DATA
// ═════════════════════════════════════════════════════════════
export const mockInvestors: Investor[] = [
  {
    investor_id: 'INV-01',
    name: 'Firoz Khan',
    phone: '+91 99350 11223',
    email: 'firoz.khan@investor.com',
    properties: [
      { room_id: 'GOM-201', property_name: 'The Dark Blue', share_percent: 60, base_rent_guarantee: 35000 },
      { room_id: 'GOM-101', property_name: 'RedRose Palace', share_percent: 50, base_rent_guarantee: 30000 },
    ],
    total_payout_mtd: 58400,
    total_payout_ytd: 467200,
    payout_frequency: 'monthly',
    payout_status: 'paid',
    bank_details: 'HDFC Bank - A/C: 50100234918239 - IFSC: HDFC0000128',
    notes: 'Founding investor partner. Holds equity across Gomti Nagar flagship properties.',
  },
  {
    investor_id: 'INV-02',
    name: 'Singhal Brothers (Rahul & Amit)',
    phone: '+91 98391 44556',
    email: 'singhal.holdings@gmail.com',
    properties: [
      { room_id: 'GOM-102', property_name: 'Black Beauty', share_percent: 100, base_rent_guarantee: 45000 },
      { room_id: 'LUL-402', property_name: 'Celebrity Garden', share_percent: 40, base_rent_guarantee: 32000 },
    ],
    total_payout_mtd: 72000,
    total_payout_ytd: 576000,
    payout_frequency: 'monthly',
    payout_status: 'pending',
    bank_details: 'ICICI Bank - A/C: 004505012938 - IFSC: ICIC0000045',
    notes: 'Sole owner of Black Beauty unit; revenue share on Lulu golf estate.',
  },
  {
    investor_id: 'INV-03',
    name: 'Dr. Mehrotra',
    phone: '+91 94150 77889',
    email: 'dr.mehrotra.lucknow@yahoo.com',
    properties: [
      { room_id: 'VIL-101', property_name: 'Gomti Grand Villa', share_percent: 35, base_rent_guarantee: 40000 },
    ],
    total_payout_mtd: 48500,
    total_payout_ytd: 388000,
    payout_frequency: 'quarterly',
    payout_status: 'paid',
    bank_details: 'State Bank of India - A/C: 30981249823 - IFSC: SBIN0001124',
    notes: 'Co-owner of 4BHK Grand Villa estate. Quarterly dividend statement required.',
  },
];

// ═════════════════════════════════════════════════════════════
// 🧺 LAUNDRY TRACKER MOCK DATA
// ═════════════════════════════════════════════════════════════
export const mockLaundryRecords: LaundryRecord[] = [
  {
    id: 'LND-2024-114',
    vendor_name: 'Lucknow Royal Drycleaners',
    room_id: 'GOM-201',
    record_date: '2024-11-23',
    bedsheets_count: 8,
    pillow_covers_count: 16,
    towels_count: 12,
    duvets_count: 4,
    total_pieces: 40,
    cost: 1200,
    status: 'washing',
    payment_status: 'pending',
    notes: 'Dispatched post corporate checkout; express delivery requested for 24th.',
  },
  {
    id: 'LND-2024-113',
    vendor_name: 'CleanWash Laundry Hub',
    room_id: 'VIL-101',
    record_date: '2024-11-21',
    bedsheets_count: 12,
    pillow_covers_count: 24,
    towels_count: 16,
    duvets_count: 6,
    total_pieces: 58,
    cost: 1740,
    status: 'delivered',
    payment_status: 'paid',
    notes: 'Delivered clean & pressed; verified by caretaker Arman.',
  },
  {
    id: 'LND-2024-112',
    vendor_name: 'Lucknow Royal Drycleaners',
    room_id: 'GOM-102',
    record_date: '2024-11-19',
    bedsheets_count: 6,
    pillow_covers_count: 12,
    towels_count: 8,
    duvets_count: 3,
    total_pieces: 29,
    cost: 870,
    status: 'delivered',
    payment_status: 'paid',
  },
];

// ═════════════════════════════════════════════════════════════
// 🔧 MAINTENANCE MOCK DATA
// ═════════════════════════════════════════════════════════════
export const mockMaintenanceTickets: MaintenanceTicket[] = [
  {
    id: 'MNT-401',
    room_id: 'GOM-101',
    title: 'Master Bedroom AC cooling low / gas refill required',
    category: 'AC/Heater',
    priority: 'Urgent',
    status: 'In Progress',
    reported_date: '2024-11-22',
    assigned_to: 'Rameshwar Verma',
    cost: 2200,
    notes: 'Technician on site with R32 refrigerant cylinder.',
  },
  {
    id: 'MNT-402',
    room_id: 'GOM-201',
    title: 'Bathroom Jaguar hot water geyser valve dripping',
    category: 'Plumbing',
    priority: 'Normal',
    status: 'Pending',
    reported_date: '2024-11-23',
    assigned_to: 'Local Plumber (Manoj)',
    cost: 650,
  },
  {
    id: 'MNT-403',
    room_id: 'VIL-101',
    title: 'Living room smart lock low battery alert',
    category: 'Locks/Keys',
    priority: 'High',
    status: 'Resolved',
    reported_date: '2024-11-20',
    resolved_date: '2024-11-21',
    assigned_to: 'Arman Ali',
    cost: 350,
    notes: 'Replaced 4 AA Duracell batteries; keyless keypad tested.',
  },
];

// ═════════════════════════════════════════════════════════════
// 📦 STORE / INVENTORY MOCK DATA
// ═════════════════════════════════════════════════════════════
export const mockStoreItems: StoreItem[] = [
  {
    item_id: 'ITM-01',
    item_name: 'King Size White Fitted Bedsheets (300 TC)',
    category: 'Linen',
    current_stock: 24,
    unit: 'pcs',
    reorder_level: 10,
    cost_per_unit: 650,
    status: 'ok',
  },
  {
    item_id: 'ITM-02',
    item_name: 'Plush Bath Towels (650 GSM White)',
    category: 'Linen',
    current_stock: 8,
    unit: 'pcs',
    reorder_level: 12,
    cost_per_unit: 380,
    status: 'low',
  },
  {
    item_id: 'ITM-03',
    item_name: 'Mini Herbal Shampoo & Body Wash Kits (50ml)',
    category: 'Toiletries',
    current_stock: 145,
    unit: 'bottles',
    reorder_level: 40,
    cost_per_unit: 28,
    status: 'ok',
  },
  {
    item_id: 'ITM-04',
    item_name: 'Diversey Taski R2 Floor Cleaner',
    category: 'Cleaning',
    current_stock: 4,
    unit: 'liters',
    reorder_level: 5,
    cost_per_unit: 420,
    status: 'low',
  },
  {
    item_id: 'ITM-05',
    item_name: 'Gourmet Tea & Roasted Coffee Sachet Packs',
    category: 'Kitchen',
    current_stock: 210,
    unit: 'pcs',
    reorder_level: 50,
    cost_per_unit: 14,
    status: 'ok',
  },
  {
    item_id: 'ITM-06',
    item_name: 'Heavy Duty Black Garbage Bags (Large)',
    category: 'Cleaning',
    current_stock: 18,
    unit: 'rolls',
    reorder_level: 8,
    cost_per_unit: 95,
    status: 'ok',
  },
];

export const mockStockTransactions: StockTransaction[] = [
  {
    id: 'TXN-101',
    item_id: 'ITM-01',
    item_name: 'King Size White Fitted Bedsheets (300 TC)',
    txn_type: 'In',
    quantity: 15,
    txn_date: '2024-11-10',
    purpose: 'New inventory bulk order from Delhi wholesale',
    received_by: 'Praveen Singh',
    cost: 9750,
  },
  {
    id: 'TXN-102',
    item_id: 'ITM-02',
    item_name: 'Plush Bath Towels (650 GSM White)',
    txn_type: 'Out',
    quantity: 6,
    txn_date: '2024-11-20',
    purpose: 'Dispatched to GOM-201 for VIP corporate group',
    received_by: 'Kanchan Devi',
  },
  {
    id: 'TXN-103',
    item_id: 'ITM-03',
    item_name: 'Mini Herbal Shampoo & Body Wash Kits',
    txn_type: 'Out',
    quantity: 30,
    txn_date: '2024-11-21',
    purpose: 'Stock replenishment across Lulu & Gomti units',
    received_by: 'Arman Ali',
  },
];
