import type { BookingSource, BookingStatus } from '@/types';

export const BOOKING_SOURCES: BookingSource[] = [
  'Airbnb', 'Direct', 'MakeMyTrip', 'Booking.com', 'Walk-in', 'OYO', 'Referral'
];

export const BOOKING_STATUSES: BookingStatus[] = [
  'confirmed', 'pending', 'cancelled', 'checked_in', 'checked_out'
];

export const SOURCE_COLORS: Record<string, string> = {
  Airbnb: '#FF5A5F',
  Direct: '#10b981',
  MakeMyTrip: '#e74c3c',
  'Booking.com': '#003580',
  'Walk-in': '#8b5cf6',
  OYO: '#ef4444',
  Referral: '#f59e0b',
};

export const QUERY_KEYS = {
  bookings: 'bookings',
  booking: 'booking',
  rooms: 'rooms',
  room: 'room',
  guests: 'guests',
  guest: 'guest',
  payments: 'payments',
  dashboard: 'dashboard',
};

export const APP_NAME = 'Haven CRM';
export const COMPANY_NAME = 'The Unique Haven Homes Pvt. Ltd.';
