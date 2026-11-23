import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = 'text-primary',
  trend,
  className,
}: StatCardProps) {
  const isPositive = (trend?.value ?? 0) >= 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card className={cn('h-full', className)}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              {title}
            </p>
            <div className="p-2 rounded-lg bg-muted">
              <Icon size={18} className={iconColor} />
            </div>
          </div>
          <div className="font-display text-2xl md:text-3xl font-semibold text-foreground mb-1">
            {value}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {trend && (
              <span
                className={cn(
                  'font-semibold',
                  isPositive
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-500'
                )}
              >
                {isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
            )}
            {subtitle && <span>{subtitle}</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
