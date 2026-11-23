import { Badge } from '@/components/ui/badge';
import type { BookingStatus } from '@/types';

interface StatusBadgeProps {
  status: BookingStatus;
  className?: string;
}

const STATUS_CONFIG: Record<BookingStatus, { label: string; dot: string; variant: any }> = {
  confirmed: { label: 'Confirmed', dot: 'bg-emerald-500', variant: 'confirmed' },
  pending: { label: 'Pending', dot: 'bg-amber-500', variant: 'pending' },
  cancelled: { label: 'Cancelled', dot: 'bg-red-500', variant: 'cancelled' },
  checked_in: { label: 'Checked In', dot: 'bg-blue-500', variant: 'checked_in' },
  checked_out: { label: 'Checked Out', dot: 'bg-slate-400', variant: 'checked_out' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || { label: status, dot: 'bg-gray-400', variant: 'default' };
  return (
    <Badge variant={config.variant} className={className}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </Badge>
  );
}
