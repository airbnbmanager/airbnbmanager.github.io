import snapshot from './real_db_snapshot.json';
import type { Room, Booking, Guest, BookingSource, BookingStatus, LoyaltyTier } from '@/types';

export const ROOM_SLUG_MAP: Record<string, string> = {
  'GOM-101': 'redrose-palace',
  'GOM-102': 'black-beauty',
  'GOM-201': 'the-dark-blue',
  'GOM-202': 'the-brown',
  'GOM-301': 'the-light-green',
  'GOM-401': 'the-nawabi-stay',
  'GOM-501': 'starlight-blue-penthouse',
  'GOM-302': 'the-unique',
  'GOM-502': 'sukoon-stay',
  'GOM-402': 'the-tehzeeb-nest',
  'Flat 402': 'the-tehzeeb-nest',
  'VIL-104': 'the-green-house',
  'VIL-103': 'the-pink-house',
  'VIL-105': 'the-yellow-house',
  'VIL-106': 'green-forest',
  'VIL-108': 'pink-paradise',
  'LUL-402': 'celebrity-garden',
  'VIL-101': 'gomti-grand-villa',
  'VIL-102': 'royal-white-house',
  'VIL-107': 'the-velvet-house',
  'LUL-101': 'the-luxe-haven',
};

// 1. Process 20 Real Properties
export const realRooms: Room[] = (snapshot.rooms as any[]).map((r: any) => {
  const slug = ROOM_SLUG_MAP[r.room_id] || 'redrose-palace';
  const cover = `/properties/${slug}/cover.jpg`;
  const price = Number(r.rent_per_night) || 5200;

  return {
    room_id: r.room_id,
    nickname: r.nickname || r.property_name || r.unit_no,
    unit_no: r.unit_no || r.room_id,
    property_name: r.property_name || r.nickname || 'Haven Homestay',
    type: (r.unit_type === 'Villa' ? 'Villa' : r.unit_type === '3BHK' ? '3BHK' : r.unit_type === '1BHK' ? '1BHK' : '2BHK') as any,
    status: (r.bookable === false ? 'off' : 'active') as any,
    base_price: price,
    airbnb_price: Math.round(price * 1.15),
    max_guests: Number(r.max_guests) || 4,
    bedrooms: r.unit_type === 'Villa' ? 4 : r.unit_type === '3BHK' ? 3 : r.unit_type === '1BHK' ? 1 : 2,
    bathrooms: r.unit_type === 'Villa' ? 4 : 2,
    amenities: ['High-speed Wi-Fi', 'Air Conditioning', 'Power Backup', 'Smart TV', 'Modular Kitchen', 'Geyser', 'Daily Housekeeping'],
    cover_image: cover,
    area_name: r.building_name || r.address || 'Gomti Nagar, Lucknow',
    address: r.address || 'Gomti Nagar, Lucknow, Uttar Pradesh',
    rating: 4.85,
    reviews: 42,
    description: r.notes || `${r.nickname || r.property_name} managed by The Unique Haven Homes Private Limited in ${r.address || 'Lucknow'}.`,
    created_at: '2026-01-01T00:00:00Z',
  };
});

// 2. Process Real 1,046 Bookings
export const realBookings: Booking[] = (snapshot.bookings as any[]).map((b: any) => {
  const isAirbnb = b.booking_mode === 'Online-Airbnb' || !!b.airbnb_confirmation_code;
  const isBlocked = b.guest_name && (b.guest_name.includes('🚫') || b.guest_name.toLowerCase().includes('block'));
  
  const source: BookingSource = isAirbnb ? 'Airbnb' : 'Direct';
  const status: BookingStatus = isBlocked
    ? 'cancelled'
    : (b.checkout_confirmed ? 'checked_out' : (b.check_in && b.check_in <= '2026-11-24' && b.check_out >= '2026-11-24' ? 'checked_in' : 'confirmed'));

  const total = Number(b.total_amount) || Number(b.per_day_rate) || 0;
  const isPaid = b.payment_status === 'Paid' || b.payment_status === 'paid';

  return {
    booking_id: b.booking_id,
    room_id: b.room_id || 'GOM-101',
    guest_name: (b.guest_name || 'Guest').replace(/^🚫\s*/, '').trim(),
    phone: b.phone || '+91 91400 00000',
    email: isAirbnb ? 'guest@airbnb.com' : 'guest@uniquehavenhomes.com',
    check_in: b.check_in || '2026-11-01',
    check_out: b.check_out || '2026-11-02',
    num_guests: Number(b.guests) || 2,
    total_amount: total,
    amount_paid: isPaid ? total : 0,
    source,
    status,
    verification_status: b.verification_status === 'verified' ? 'verified' : 'pending',
    is_cancelled: !!b.is_cancelled || !!isBlocked,
    airbnb_code: b.airbnb_confirmation_code || undefined,
    notes: b.notes || (isBlocked ? 'Blocked for owner / deep maintenance' : undefined),
    created_at: b.verified_at || '2026-10-15T00:00:00Z',
  };
});

// 3. Process Real Aggregated Guests CRM
// Flagship VIP Profiles (matching Screenshot 1)
const flagshipGuests: Guest[] = [
  {
    id: 'GST-VIP-01',
    name: 'Rahul Sharma',
    phone: '+91 9876543210',
    email: 'rahul.sharma@gmail.com',
    total_stays: 5,
    total_spent: 78000,
    loyalty_tier: 'Gold',
    rating: 'good',
    tags: ['Corporate', 'Repeat Guest', 'VIP', 'Prompt Payer'],
    notes: 'Regular Bangalore corporate group organizer. Always chooses GOM-201 or PKH-301.',
    last_stay: '2026-11-23',
    first_stay: '2026-02-14',
    created_at: '2026-02-14T00:00:00Z',
  },
  {
    id: 'GST-VIP-02',
    name: 'Dr. Ananya Roy',
    phone: '+91 9900112233',
    email: 'dr.ananya@medanta.org',
    total_stays: 8,
    total_spent: 127200,
    loyalty_tier: 'Platinum',
    rating: 'good',
    tags: ['Medical Consultant', 'Solo VIP', 'Long Stay'],
    notes: 'Visiting specialist. Prefers LUL-101 for proximity to Medanta.',
    last_stay: '2026-11-07',
    first_stay: '2026-01-18',
    created_at: '2026-01-18T00:00:00Z',
  },
  {
    id: 'GST-VIP-03',
    name: 'Priya Verma',
    phone: '+91 9988776655',
    email: 'priya.v@outlook.com',
    total_stays: 3,
    total_spent: 23850,
    loyalty_tier: 'Silver',
    rating: 'good',
    tags: ['Family Travel', 'Medical'],
    notes: 'Polite guest, always leaves property very clean.',
    last_stay: '2026-11-23',
    first_stay: '2026-05-12',
    created_at: '2026-05-12T00:00:00Z',
  },
  {
    id: 'GST-VIP-04',
    name: 'Ravi Kapoor',
    phone: '+91 7766554433',
    email: 'ravi.k@venturecap.com',
    total_stays: 5,
    total_spent: 78000,
    loyalty_tier: 'Silver',
    rating: 'good',
    tags: ['Corporate Event', 'Group Booking', 'High Spender'],
    notes: 'Organizes leadership offsites. Expects concierge service and high-speed Wi-Fi.',
    last_stay: '2026-11-29',
    first_stay: '2026-03-22',
    created_at: '2026-03-22T00:00:00Z',
  },
  {
    id: 'GST-VIP-05',
    name: 'Amit Gupta',
    phone: '+91 8877665544',
    email: 'amit.guptacorp.in',
    total_stays: 2,
    total_spent: 18500,
    loyalty_tier: 'Bronze',
    rating: 'normal',
    tags: ['Wedding Party', 'First Timer'],
    notes: 'Requested early check-in for wedding dress changes.',
    last_stay: '2026-11-25',
    first_stay: '2026-09-10',
    created_at: '2026-09-10T00:00:00Z',
  },
  {
    id: 'GST-VIP-06',
    name: 'Sneha Patel',
    phone: '+91 9822334455',
    email: 'sneha.patel@designstudio.in',
    total_stays: 3,
    total_spent: 23850,
    loyalty_tier: 'Silver',
    rating: 'good',
    tags: ['Creative Professional', 'Design Studio'],
    notes: 'Architectural photographer visiting historic Lucknow monuments.',
    last_stay: '2026-11-21',
    first_stay: '2026-06-15',
    created_at: '2026-06-15T00:00:00Z',
  },
];

// Additional guests computed from database
const guestMap = new Map<string, {
  name: string;
  phone: string;
  stays: number;
  totalSpent: number;
  lastStay: string;
  rooms: Set<string>;
}>();

realBookings.forEach((b) => {
  if (b.is_cancelled || b.guest_name.toLowerCase().includes('block')) return;
  const key = b.phone || b.guest_name.toLowerCase();
  if (!guestMap.has(key)) {
    guestMap.set(key, {
      name: b.guest_name,
      phone: b.phone,
      stays: 0,
      totalSpent: 0,
      lastStay: b.check_in,
      rooms: new Set(),
    });
  }
  const g = guestMap.get(key)!;
  g.stays += 1;
  g.totalSpent += b.total_amount;
  g.rooms.add(b.room_id);
  if (b.check_in > g.lastStay) {
    g.lastStay = b.check_in;
  }
});

const dbGuests = Array.from(guestMap.values())
  .filter((g) => g.name && g.name.length > 2 && !g.name.includes('🏨') && !g.name.includes('Airbnb'))
  .sort((a, b) => b.stays - a.stays)
  .slice(0, 40)
  .map((g, idx) => {
    let tier: LoyaltyTier = 'Bronze';
    if (g.stays >= 5) tier = 'Platinum';
    else if (g.stays >= 3) tier = 'Gold';
    else if (g.stays >= 2) tier = 'Silver';

    return {
      id: `GST-${String(idx + 7).padStart(4, '0')}`,
      name: g.name,
      phone: g.phone || '+91 91400 00000',
      email: `${g.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@gmail.com`,
      total_stays: g.stays,
      total_spent: g.totalSpent,
      loyalty_tier: tier,
      rating: (tier === 'Platinum' || tier === 'Gold' ? 'good' : 'normal') as any,
      tags: ['Verified Ground Guest', `${g.stays} Stays`],
      notes: `Frequent traveler staying across ${Array.from(g.rooms).join(', ')}.`,
      last_stay: g.lastStay,
      first_stay: '2026-01-10',
      created_at: '2026-01-01T00:00:00Z',
    };
  });

export const realGuests: Guest[] = [...flagshipGuests, ...dbGuests];
