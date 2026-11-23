import type { Payment } from '@/types';
import { mockPayments } from '@/mocks/data';

let paymentsData = [...mockPayments];

export async function getPayments(bookingId?: string): Promise<Payment[]> {
  await new Promise(r => setTimeout(r, 200));
  if (bookingId) return paymentsData.filter(p => p.booking_id === bookingId);
  return [...paymentsData];
}

export async function createPayment(payload: Omit<Payment, 'id' | 'created_at'>): Promise<Payment> {
  await new Promise(r => setTimeout(r, 350));
  const newPayment: Payment = {
    ...payload,
    id: `PAY-${1000 + paymentsData.length + 1}`,
    created_at: new Date().toISOString().slice(0, 10),
  };
  paymentsData.unshift(newPayment);
  return newPayment;
}
