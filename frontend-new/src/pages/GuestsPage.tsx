import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, Users, Phone, Mail, Calendar, Plus, MessageSquare, Star } from 'lucide-react';
import { getGuests } from '@/api/guests';
import { QUERY_KEYS } from '@/lib/constants';
import { formatCurrency, formatDate, getLoyaltyColor, getInitials } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const TIER_ICONS: Record<string, string> = {
  Platinum: '💎',
  Gold: '🥇',
  Silver: '🥈',
  Bronze: '🥉',
};

const RATING_CONFIG = {
  good: { label: 'Trusted Guest ⭐', color: 'text-emerald-700 bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300' },
  normal: { label: 'Standard', color: 'text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300' },
  bad: { label: 'Flagged ⚠️', color: 'text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-300' },
};

export function GuestsPage() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<string>('all');

  const { data: guests, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.guests],
    queryFn: getGuests,
  });

  const filteredGuests = (guests || []).filter(g => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      g.name.toLowerCase().includes(q) ||
      g.phone.includes(q) ||
      (g.email || '').toLowerCase().includes(q) ||
      g.tags.some(t => t.toLowerCase().includes(q));
    const matchTier = tierFilter === 'all' || g.loyalty_tier === tierFilter;
    return matchSearch && matchTier;
  });

  return (
    <div className="page-container">
      <PageHeader
        title="Guest Directory & CRM"
        subtitle={`${guests?.length ?? 0} repeat travelers and VIP profiles`}
        action={
          <Button onClick={() => toast.info('Guest creation form - coming soon')} className="gap-1.5">
            <Plus size={15} /> Add Guest
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, phone, VIP tag..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'Platinum', 'Gold', 'Silver', 'Bronze'].map(t => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                tierFilter === t
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {t === 'all' ? 'All Tiers' : `${TIER_ICONS[t]} ${t}`}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-5">
                <Skeleton className="h-36" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredGuests.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No guest profiles found"
          description="Try clearing your search query or tier filters."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredGuests.map((guest, idx) => {
            const ratingStyle = RATING_CONFIG[guest.rating] || RATING_CONFIG.normal;
            return (
              <motion.div
                key={guest.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                whileHover={{ y: -3 }}
              >
                <Card className="h-full flex flex-col justify-between">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <Avatar fallback={getInitials(guest.name)} className="w-12 h-12" />
                        <div>
                          <h3 className="font-semibold text-foreground text-base leading-tight">
                            {guest.name}
                          </h3>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getLoyaltyColor(guest.loyalty_tier)}`}>
                              {TIER_ICONS[guest.loyalty_tier]} {guest.loyalty_tier}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ratingStyle.color}`}>
                              {ratingStyle.label}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <a href={`tel:${guest.phone}`} className="flex items-center gap-2 hover:text-primary transition-colors">
                        <Phone size={13} className="text-muted-foreground" /> +91 {guest.phone}
                      </a>
                      {guest.email && (
                        <a href={`mailto:${guest.email}`} className="flex items-center gap-2 hover:text-primary transition-colors truncate">
                          <Mail size={13} className="text-muted-foreground flex-shrink-0" />
                          <span className="truncate">{guest.email}</span>
                        </a>
                      )}
                      {guest.last_stay && (
                        <div className="flex items-center gap-2">
                          <Calendar size={13} className="text-muted-foreground" /> Last stay: {formatDate(guest.last_stay)}
                        </div>
                      )}
                    </div>

                    {guest.notes && (
                      <p className="text-xs bg-muted/60 p-2.5 rounded-lg text-foreground/80 italic border border-border">
                        "{guest.notes}"
                      </p>
                    )}

                    {guest.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {guest.tags.map(t => (
                          <span key={t} className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-primary/10 text-primary">
                            #{t}
                          </span>
                        ))}
                      </div>
                    )}
                  </CardContent>

                  <div className="p-4 pt-3 border-t border-border bg-muted/20 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] text-muted-foreground">Total Stays</div>
                      <div className="font-bold text-sm text-foreground">{guest.total_stays} Stays</div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-muted-foreground">Lifetime Spent</div>
                      <div className="font-bold text-sm text-primary">{formatCurrency(guest.total_spent)}</div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
