import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { mockRooms } from '@/mocks/data';
import { BOOKING_SOURCES } from '@/lib/constants';
import { formatCurrency, getNights } from '@/lib/utils';
import type { Booking } from '@/types';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

const bookingSchema = z.object({
  guest_name: z.string().min(2, 'Guest name is required'),
  phone: z.string().min(10, 'Valid 10-digit phone number is required'),
  email: z.string().email('Valid email').optional().or(z.literal('')),
  room_id: z.string().min(1, 'Please select a room'),
  check_in: z.string().min(1, 'Check-in date is required'),
  check_out: z.string().min(1, 'Check-out date is required'),
  num_guests: z.number().min(1, 'At least 1 guest'),
  source: z.string().min(1, 'Source is required'),
  amount_paid: z.number().min(0),
  security_deposit: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

interface NewBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (booking: Booking) => void;
  defaultRoomId?: string;
  defaultCheckIn?: string;
  defaultCheckOut?: string;
}

export function NewBookingModal({
  isOpen,
  onClose,
  onCreated,
  defaultRoomId,
  defaultCheckIn,
  defaultCheckOut,
}: NewBookingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const todayStr = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const tomorrowStr = tomorrow.toISOString().slice(0, 10);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      room_id: defaultRoomId || mockRooms[0].room_id,
      check_in: defaultCheckIn || todayStr,
      check_out: defaultCheckOut || tomorrowStr,
      num_guests: 2,
      source: 'Direct',
      amount_paid: 0,
      security_deposit: 2000,
      notes: '',
    },
  });

  const selectedRoomId = watch('room_id');
  const checkIn = watch('check_in');
  const checkOut = watch('check_out');
  const selectedRoom = mockRooms.find(r => r.room_id === selectedRoomId) || mockRooms[0];
  const nights = getNights(checkIn || todayStr, checkOut || tomorrowStr);
  const computedTotal = (selectedRoom?.base_price || 3000) * nights;

  const onSubmit = (values: BookingFormValues) => {
    const newBooking: Booking = {
      booking_id: `BK-${Date.now().toString().slice(-6)}`,
      room_id: values.room_id,
      guest_name: values.guest_name,
      phone: values.phone,
      email: values.email || undefined,
      check_in: values.check_in,
      check_out: values.check_out,
      num_guests: Number(values.num_guests),
      total_amount: computedTotal,
      amount_paid: Number(values.amount_paid) || 0,
      source: values.source as any,
      status: Number(values.amount_paid) >= computedTotal ? 'confirmed' : 'pending',
      verification_status: 'verified',
      is_cancelled: false,
      notes: values.notes,
      security_deposit_amount: Number(values.security_deposit) || 0,
      security_deposit_status: Number(values.security_deposit) > 0 ? 'collected' : 'none',
      created_at: new Date().toISOString().slice(0, 10),
    };

    onCreated(newBooking);
    toast.success(`Booking ${newBooking.booking_id} created for ${values.guest_name}!`);
    reset();
    setStep(1);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Reservation" maxWidth="max-w-xl">
      {/* Step Indicator */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
        {[
          { num: 1, label: 'Guest Details' },
          { num: 2, label: 'Room & Dates' },
          { num: 3, label: 'Payment & Review' },
        ].map((s, idx) => (
          <div key={s.num} className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s.num
                  ? 'bg-primary text-primary-foreground'
                  : step > s.num
                  ? 'bg-emerald-600 text-white'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {step > s.num ? <Check size={14} /> : s.num}
            </div>
            <span
              className={`text-xs font-semibold hidden sm:inline ${
                step === s.num ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {s.label}
            </span>
            {idx < 2 && <div className="w-8 h-px bg-border hidden sm:block mx-1" />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {step === 1 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Guest Full Name *
              </label>
              <Input placeholder="e.g. Vikram Malhotra" {...register('guest_name')} />
              {errors.guest_name && (
                <p className="text-destructive text-xs mt-1">{errors.guest_name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Phone Number *
                </label>
                <Input placeholder="9876543210" {...register('phone')} />
                {errors.phone && (
                  <p className="text-destructive text-xs mt-1">{errors.phone.message}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <Input placeholder="guest@example.com" type="email" {...register('email')} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Booking Source
              </label>
              <select
                {...register('source')}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {BOOKING_SOURCES.map(src => (
                  <option key={src} value={src}>
                    {src}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="button" onClick={() => setStep(2)}>
                Next: Stay Details <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fade-in">
            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Select Property / Room *
              </label>
              <select
                {...register('room_id')}
                className="w-full h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {mockRooms.map(r => (
                  <option key={r.room_id} value={r.room_id}>
                    {r.nickname} ({r.room_id}) — {r.type} · {formatCurrency(r.base_price)}/nt
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Check-in Date *
                </label>
                <Input type="date" {...register('check_in')} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Check-out Date *
                </label>
                <Input type="date" {...register('check_out')} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Number of Guests
              </label>
              <Input
                type="number"
                min={1}
                max={20}
                {...register('num_guests', { valueAsNumber: true })}
              />
            </div>

            <div className="p-3 bg-muted rounded-xl text-xs space-y-1">
              <div className="flex justify-between">
                <span>Total Duration:</span>
                <span className="font-semibold text-foreground">{nights} Nights</span>
              </div>
              <div className="flex justify-between">
                <span>Calculated Tariff:</span>
                <span className="font-semibold text-primary">{formatCurrency(computedTotal)}</span>
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft size={15} /> Back
              </Button>
              <Button type="button" onClick={() => setStep(3)}>
                Next: Payment <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fade-in">
            <div className="p-4 rounded-xl bg-card border border-border space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Property:</span>
                <span className="font-semibold text-foreground">{selectedRoom.nickname}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Stay Dates:</span>
                <span className="font-semibold text-foreground">{checkIn} → {checkOut} ({nights}N)</span>
              </div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-border">
                <span>Total Amount:</span>
                <span className="text-primary">{formatCurrency(computedTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Advance Paid (₹)
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  {...register('amount_paid', { valueAsNumber: true })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                  Security Deposit (₹)
                </label>
                <Input
                  type="number"
                  placeholder="2000"
                  {...register('security_deposit', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground uppercase tracking-wider mb-1.5">
                Special Requests / Notes
              </label>
              <Input placeholder="Extra bedding, late check-in, etc." {...register('notes')} />
            </div>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft size={15} /> Back
              </Button>
              <Button type="submit">
                Confirm & Create Booking
              </Button>
            </div>
          </div>
        )}
      </form>
    </Modal>
  );
}
