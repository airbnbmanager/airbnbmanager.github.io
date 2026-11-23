import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Phone, Mail, Calendar, BedDouble, Users, FileText, CheckCircle2, ShieldCheck, Printer } from 'lucide-react';
import type { Booking } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from './StatusBadge';
import { formatCurrency, formatDate, getNights } from '@/lib/utils';
import { toast } from 'sonner';

interface BookingDrawerProps {
  booking: Booking | null;
  onClose: () => void;
  onViewInvoice?: (booking: Booking) => void;
  onStatusChange?: (status: Booking['status']) => void;
}

export function BookingDrawer({ booking, onClose, onViewInvoice, onStatusChange }: BookingDrawerProps) {
  if (!booking) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
        />
        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-screen max-w-md bg-background shadow-2xl flex flex-col border-l border-border"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-border bg-card">
              <div>
                <h2 className="font-display text-xl font-semibold text-foreground">{booking.guest_name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground font-mono">{booking.booking_id}</span>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">{booking.source}</Badge>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={booking.status} />
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                  <X size={18} />
                </Button>
              </div>
            </div>

            {/* Scrollable details */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* Checkin / Checkout Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-muted/60 border border-border">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Check In
                  </p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{formatDate(booking.check_in)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{booking.check_in_time || '14:00 hrs'}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-muted/60 border border-border">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Check Out
                  </p>
                  <p className="font-semibold text-foreground text-sm mt-0.5">{formatDate(booking.check_out)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{booking.check_out_time || '11:00 hrs'}</p>
                </div>
              </div>

              {/* Room & Stay Metrics */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-card border border-border text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar size={15} className="text-primary" />
                  <strong className="text-foreground">{getNights(booking.check_in, booking.check_out)}</strong> nights
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <Users size={15} className="text-primary" />
                  <strong className="text-foreground">{booking.num_guests}</strong> guests
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <BedDouble size={15} className="text-primary" />
                  <strong className="text-foreground">{booking.room_id}</strong>
                </span>
              </div>

              {/* Contact Information */}
              <div className="space-y-3">
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Guest Contact
                </h3>
                <div className="space-y-2">
                  <a
                    href={`tel:${booking.phone}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <span className="flex items-center gap-2 text-sm text-foreground">
                      <Phone size={15} className="text-muted-foreground" /> {booking.phone}
                    </span>
                    <span className="text-xs text-primary font-semibold">Call</span>
                  </a>
                  {booking.email && (
                    <a
                      href={`mailto:${booking.email}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <span className="flex items-center gap-2 text-sm text-foreground truncate">
                        <Mail size={15} className="text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{booking.email}</span>
                      </span>
                      <span className="text-xs text-primary font-semibold flex-shrink-0 ml-2">Email</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Payment Summary */}
              <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                    Financials
                  </h3>
                  {booking.amount_paid >= booking.total_amount ? (
                    <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                      <CheckCircle2 size={13} /> Fully Paid
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-semibold">
                      Due: {formatCurrency(booking.total_amount - booking.amount_paid)}
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Stay Tariff</span>
                    <span className="font-semibold text-foreground">{formatCurrency(booking.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Collected</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(booking.amount_paid)}</span>
                  </div>
                  {booking.amount_paid < booking.total_amount && (
                    <div className="flex justify-between text-muted-foreground pt-1 border-t border-border">
                      <span className="font-medium text-foreground">Balance Due</span>
                      <span className="font-bold text-red-500">{formatCurrency(booking.total_amount - booking.amount_paid)}</span>
                    </div>
                  )}
                </div>
                {/* Progress bar */}
                <div className="w-full bg-border rounded-full h-1.5 mt-2 overflow-hidden">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (booking.amount_paid / booking.total_amount) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Security Deposit Badge & Status */}
              {booking.security_deposit_amount ? (
                <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={18} className="text-blue-600 dark:text-blue-400" />
                    <div>
                      <div className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                        Security Deposit: {formatCurrency(booking.security_deposit_amount)}
                      </div>
                      <div className="text-[11px] text-blue-700/80 dark:text-blue-400 capitalize">
                        Status: {booking.security_deposit_status || 'held'}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-blue-300 dark:border-blue-800"
                    onClick={() => toast.success(`Security deposit of ${formatCurrency(booking.security_deposit_amount || 0)} updated.`)}
                  >
                    Manage
                  </Button>
                </div>
              ) : null}

              {/* Special Requests / Notes */}
              {booking.notes && (
                <div className="p-3.5 rounded-xl bg-card border border-border">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <FileText size={13} /> Notes & Instructions
                  </p>
                  <p className="text-sm text-foreground">{booking.notes}</p>
                </div>
              )}
            </div>

            {/* Footer Quick Actions */}
            <div className="p-4 border-t border-border bg-card flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="gap-1.5 text-xs"
                  onClick={() => onViewInvoice?.(booking)}
                >
                  <Printer size={14} /> View Invoice
                </Button>
                <Button
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    const nextStatus = booking.status === 'confirmed' ? 'checked_in' : 'checked_out';
                    onStatusChange?.(nextStatus);
                    toast.success(`Booking status updated to ${nextStatus.replace('_', ' ')}`);
                  }}
                >
                  {booking.status === 'confirmed' ? 'Mark Checked In' : 'Update Status'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
