import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns';
import type { BookingStatus, LoyaltyTier } from '@/types';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string, fmt = 'dd MMM yyyy'): string {
  try {
    return format(parseISO(dateStr), fmt);
  } catch {
    return dateStr;
  }
}

export function formatRelative(dateStr: string): string {
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
  } catch {
    return dateStr;
  }
}

export function getNights(checkIn: string, checkOut: string): number {
  try {
    const d = differenceInDays(parseISO(checkOut), parseISO(checkIn));
    return d > 0 ? d : 1;
  } catch {
    return 1;
  }
}

export function getStatusLabel(status: BookingStatus): string {
  const map: Record<BookingStatus, string> = {
    confirmed: 'Confirmed',
    pending: 'Pending',
    cancelled: 'Cancelled',
    checked_in: 'Checked In',
    checked_out: 'Checked Out',
  };
  return map[status] || status;
}

export function getLoyaltyColor(tier: LoyaltyTier): string {
  const map: Record<LoyaltyTier, string> = {
    Bronze: 'text-amber-800 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    Silver: 'text-slate-700 bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
    Gold: 'text-yellow-800 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400',
    Platinum: 'text-purple-800 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
  };
  return map[tier] || '';
}

export function getInitials(name: string): string {
  return (name || 'Guest')
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}
