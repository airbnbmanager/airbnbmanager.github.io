import React from 'react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Printer, Download, CheckCircle2 } from 'lucide-react';
import type { Booking } from '@/types';
import { formatCurrency, formatDate, getNights } from '@/lib/utils';
import { COMPANY_NAME } from '@/lib/constants';

interface InvoiceModalProps {
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
}

export function InvoiceModal({ booking, isOpen, onClose }: InvoiceModalProps) {
  if (!booking) return null;

  const nights = getNights(booking.check_in, booking.check_out);
  const baseRate = Math.round(booking.total_amount / (nights || 1));
  const gstRate = 0.12; // 12% GST
  const taxableAmount = Math.round(booking.total_amount / (1 + gstRate));
  const gstAmount = booking.total_amount - taxableAmount;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tax Invoice" maxWidth="max-w-2xl">
      <div id="print-invoice" className="p-2 space-y-6 text-foreground print:p-0">
        {/* Invoice Top Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="font-display text-2xl font-bold text-foreground tracking-tight">
              {COMPANY_NAME}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Luxury Serviced Apartments & Homestays
            </p>
            <p className="text-xs text-muted-foreground">
              Lucknow, Uttar Pradesh, India
            </p>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              GSTIN: 09AAACT2819R1Z8
            </p>
          </div>
          <div className="sm:text-right">
            <span className="text-xs uppercase font-bold text-primary tracking-widest">
              Original Tax Invoice
            </span>
            <div className="font-mono text-sm font-bold text-foreground mt-1">
              INV-{booking.booking_id.replace('BK-', '')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Date: {formatDate(new Date().toISOString().slice(0, 10))}
            </p>
          </div>
        </div>

        {/* Guest & Stay Details */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Billed To:
            </span>
            <p className="font-bold text-sm text-foreground">{booking.guest_name}</p>
            <p className="text-muted-foreground mt-0.5">Phone: +91 {booking.phone}</p>
            {booking.email && <p className="text-muted-foreground">Email: {booking.email}</p>}
          </div>
          <div className="sm:text-right">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
              Stay Details:
            </span>
            <p className="font-semibold text-foreground">Unit: {booking.room_id}</p>
            <p className="text-muted-foreground mt-0.5">
              {formatDate(booking.check_in)} to {formatDate(booking.check_out)}
            </p>
            <p className="text-muted-foreground">
              {nights} Night(s) · {booking.num_guests} Guests
            </p>
          </div>
        </div>

        {/* Itemized Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted text-muted-foreground uppercase tracking-wider font-semibold">
              <tr>
                <th className="p-3">Description</th>
                <th className="p-3 text-center">Nights</th>
                <th className="p-3 text-right">Rate / Nt</th>
                <th className="p-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="p-3">
                  <div className="font-semibold text-foreground">Accommodation Charges</div>
                  <div className="text-[11px] text-muted-foreground">Unit {booking.room_id}</div>
                </td>
                <td className="p-3 text-center">{nights}</td>
                <td className="p-3 text-right">{formatCurrency(baseRate)}</td>
                <td className="p-3 text-right font-medium">{formatCurrency(taxableAmount)}</td>
              </tr>
              <tr>
                <td className="p-3" colSpan={3}>
                  <div className="font-medium text-muted-foreground">GST (CGST 6% + SGST 6%)</div>
                </td>
                <td className="p-3 text-right font-medium">{formatCurrency(gstAmount)}</td>
              </tr>
              <tr className="bg-muted/40 font-bold text-sm">
                <td className="p-3" colSpan={3}>Grand Total</td>
                <td className="p-3 text-right text-primary">{formatCurrency(booking.total_amount)}</td>
              </tr>
              <tr className="text-xs text-muted-foreground">
                <td className="p-3" colSpan={3}>Amount Paid</td>
                <td className="p-3 text-right font-semibold text-emerald-600">
                  {formatCurrency(booking.amount_paid)}
                </td>
              </tr>
              {booking.amount_paid < booking.total_amount && (
                <tr className="text-xs text-red-500 font-semibold">
                  <td className="p-3" colSpan={3}>Balance Payable</td>
                  <td className="p-3 text-right">
                    {formatCurrency(booking.total_amount - booking.amount_paid)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Security deposit note if held */}
        {booking.security_deposit_amount ? (
          <p className="text-[11px] text-muted-foreground italic">
            * Security Deposit of {formatCurrency(booking.security_deposit_amount)} was collected separately and will be refunded upon checkout inspection.
          </p>
        ) : null}

        {/* Print & Action Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border print:hidden">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handlePrint} className="gap-2">
            <Printer size={15} /> Print / Save PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
}
