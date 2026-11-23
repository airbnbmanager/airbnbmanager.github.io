import type { Booking, BookingFilters, PaginatedResponse } from '@/types';
import { mockBookings } from '@/mocks/data';

let bookingsData = [...mockBookings];

export async function getBookings(filters?: BookingFilters): Promise<PaginatedResponse<Booking>> {
  await new Promise(r => setTimeout(r, 100));
  let data = [...bookingsData];

  if (filters?.status) data = data.filter(b => b.status === filters.status);
  if (filters?.source) data = data.filter(b => b.source === filters.source);
  if (filters?.room_id && filters.room_id !== 'all') data = data.filter(b => b.room_id === filters.room_id);
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    data = data.filter(b =>
      b.guest_name.toLowerCase().includes(q) ||
      b.phone.includes(q) ||
      b.booking_id.toLowerCase().includes(q) ||
      b.room_id.toLowerCase().includes(q)
    );
  }
  if (filters?.date_from) data = data.filter(b => b.check_in >= filters.date_from!);
  if (filters?.date_to) data = data.filter(b => b.check_out <= filters.date_to!);

  const page = filters?.page || 1;
  const per_page = filters?.per_page || 50;

  // If calendar or bulk request asks for all or high limit
  if (per_page >= 1000) {
    return { data, total: data.length, page: 1, per_page: data.length, total_pages: 1 };
  }

  const total = data.length;
  const start = (page - 1) * per_page;
  const paged = data.slice(start, start + per_page);

  return { data: paged, total, page, per_page, total_pages: Math.ceil(total / per_page) };
}

export async function getBookingById(id: string): Promise<Booking | null> {
  await new Promise(r => setTimeout(r, 100));
  return bookingsData.find(b => b.booking_id === id) || null;
}

export async function createBooking(payload: Omit<Booking, 'booking_id' | 'created_at'>): Promise<Booking> {
  await new Promise(r => setTimeout(r, 200));
  const newBooking: Booking = {
    ...payload,
    booking_id: `BK-${new Date().getFullYear()}-${String(bookingsData.length + 1).padStart(4, '0')}`,
    created_at: new Date().toISOString().slice(0, 10),
  };
  bookingsData.unshift(newBooking);
  return newBooking;
}

export async function updateBooking(id: string, payload: Partial<Booking>): Promise<Booking> {
  await new Promise(r => setTimeout(r, 150));
  const idx = bookingsData.findIndex(b => b.booking_id === id);
  if (idx === -1) throw new Error('Booking not found');
  bookingsData[idx] = { ...bookingsData[idx], ...payload, updated_at: new Date().toISOString() };
  return bookingsData[idx];
}

export async function deleteBooking(id: string): Promise<void> {
  await new Promise(r => setTimeout(r, 150));
  bookingsData = bookingsData.filter(b => b.booking_id !== id);
}
