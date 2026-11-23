export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'checked_in' | 'checked_out';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type PaymentMode = 'Cash' | 'UPI' | 'Card' | 'Bank Transfer' | 'Airbnb';
export type BookingSource = 'Airbnb' | 'Direct' | 'MakeMyTrip' | 'Booking.com' | 'Walk-in' | 'OYO' | 'Referral';
export type RoomStatus = 'active' | 'off' | 'maintenance';
export type SecurityDepositStatus = 'none' | 'pending' | 'collected' | 'refunded' | 'partially_refunded' | 'retained';
export type LoyaltyTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
export type GuestRating = 'good' | 'normal' | 'bad';

export interface Room {
  room_id: string;
  nickname: string;
  unit_no: string;
  property_name: string;
  type: '1BHK' | '2BHK' | '3BHK' | 'Villa' | 'Bungalow' | 'Studio';
  status: RoomStatus;
  base_price: number;
  airbnb_price?: number;
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  beds?: string;
  amenities: string[];
  cover_image: string;
  photos?: { bedrooms?: string[]; bathrooms?: string[]; living_hall?: string[]; all?: string[] };
  area_name: string;
  address: string;
  rating?: number;
  reviews?: number;
  map_link?: string;
  description?: string;
  created_at?: string;
}

export interface Booking {
  booking_id: string;
  room_id: string;
  room?: Room;
  guest_name: string;
  phone: string;
  email?: string;
  check_in: string;       // YYYY-MM-DD
  check_out: string;      // YYYY-MM-DD
  check_in_time?: string;
  check_out_time?: string;
  num_guests: number;
  total_amount: number;
  amount_paid: number;
  source: BookingSource;
  status: BookingStatus;
  verification_status: VerificationStatus;
  is_cancelled: boolean;
  airbnb_code?: string;
  notes?: string;
  security_deposit_amount?: number;
  security_deposit_status?: SecurityDepositStatus;
  security_deposit_refund_amount?: number;
  security_deposit_deducted_amount?: number;
  created_at: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  guest_name?: string;
  booking?: Booking;
  amount: number;
  payment_mode: PaymentMode;
  payment_date: string;
  status: 'collected' | 'pending' | 'refunded';
  notes?: string;
  created_at: string;
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  email?: string;
  total_stays: number;
  total_spent: number;
  loyalty_tier: LoyaltyTier;
  rating: GuestRating;
  tags: string[];
  notes?: string;
  last_stay?: string;
  first_stay?: string;
  bookings?: Booking[];
  created_at: string;
}

// ─── HRMS & EMPLOYEE ──────────────────────────────────────────────────────────
export type EmployeeRole =
  | 'Property Manager'
  | 'Caretaker'
  | 'Housekeeper'
  | 'Cleaner / Maid'
  | 'Maintenance Technician'
  | 'Cook'
  | 'Driver';

export interface Employee {
  emp_id: string;
  name: string;
  role: EmployeeRole;
  phone: string;
  email?: string;
  pay_type: 'monthly' | 'per_flat';
  salary: number;               // Monthly salary OR flat rate per turnover
  per_flat_rate?: number;       // e.g. ₹250 per clean flat
  status: 'active' | 'inactive';
  join_date: string;
  advances_balance: number;     // Active advances taken
  completed_turns_this_month?: number;
  notes?: string;
}

// ─── EXPENSES & P&L ───────────────────────────────────────────────────────────
export type ExpenseChannel =
  | 'Laundry'
  | 'Maintenance'
  | 'Housekeeping & Supplies'
  | 'Society & Utilities'
  | 'Wi-Fi & Broadband'
  | 'Employee Advance'
  | 'Owner Lease / Rent'
  | 'Miscellaneous';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseChannel;
  amount: number;
  date: string;
  property_id?: string;        // Optional specific property unit
  payment_source: 'COMPANY' | 'UHHS-OD' | 'CASH' | 'FIROZ';
  notes?: string;
  receipt_url?: string;
  created_by?: string;
  created_at: string;
}

// ─── INVESTORS & PROPERTY PARTNERS ───────────────────────────────────────────
export interface InvestorPropertyLink {
  room_id: string;
  property_name: string;
  share_percent: number;      // e.g. 50%, 100%
  base_rent_guarantee?: number;
}

export interface Investor {
  investor_id: string;
  name: string;
  phone: string;
  email?: string;
  properties: InvestorPropertyLink[];
  total_payout_mtd: number;
  total_payout_ytd: number;
  payout_frequency: 'monthly' | 'quarterly';
  payout_status: 'paid' | 'pending';
  bank_details?: string;
  notes?: string;
}

// ─── LAUNDRY & LINEN TRACKER ──────────────────────────────────────────────────
export interface LaundryRecord {
  id: string;
  vendor_name: string;
  room_id: string;
  record_date: string;
  bedsheets_count: number;
  pillow_covers_count: number;
  towels_count: number;
  duvets_count: number;
  total_pieces: number;
  cost: number;
  status: 'dispatched' | 'washing' | 'delivered';
  payment_status: 'paid' | 'pending';
  notes?: string;
}

// ─── MAINTENANCE LOG & TICKETS ────────────────────────────────────────────────
export type MaintenancePriority = 'Urgent' | 'High' | 'Normal' | 'Low';
export type MaintenanceStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Verified';

export interface MaintenanceTicket {
  id: string;
  room_id: string;
  title: string;
  category: 'AC/Heater' | 'Plumbing' | 'Electrical' | 'WiFi/Internet' | 'Furniture' | 'Appliances' | 'Locks/Keys' | 'Painting' | 'Other';
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  reported_date: string;
  resolved_date?: string;
  assigned_to?: string;
  cost: number;
  notes?: string;
}

// ─── STORE / INVENTORY ────────────────────────────────────────────────────────
export interface StoreItem {
  item_id: string;
  item_name: string;
  category: 'Linen' | 'Toiletries' | 'Cleaning' | 'Kitchen' | 'Electronics' | 'Other';
  current_stock: number;
  unit: string;               // 'pcs', 'liters', 'bottles', 'kg'
  reorder_level: number;
  cost_per_unit: number;
  status: 'ok' | 'low';
}

export interface StockTransaction {
  id: string;
  item_id: string;
  item_name: string;
  txn_type: 'In' | 'Out';
  quantity: number;
  txn_date: string;
  purpose: string;
  received_by: string;
  cost?: number;
}

export interface DashboardStats {
  today_checkins: number;
  today_checkouts: number;
  occupancy_rate: number;
  total_properties: number;
  occupied_rooms: number;
  available_rooms: number;
  revenue_today: number;
  revenue_this_month: number;
  revenue_last_month: number;
  pending_payments: number;
  upcoming_bookings: Booking[];
  recent_bookings: Booking[];
  revenue_chart: Array<{ date: string; revenue: number; bookings: number }>;
  source_breakdown: Array<{ source: string; count: number; revenue: number }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface BookingFilters {
  status?: BookingStatus;
  source?: BookingSource;
  room_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'staff' | 'developer';
  avatar?: string;
}
