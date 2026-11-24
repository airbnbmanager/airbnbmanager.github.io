import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, BedDouble, Bath, Users, Star, MapPin, Plus, CheckCircle2, AlertTriangle, ShieldAlert } from 'lucide-react';
import { getRooms } from '@/api/rooms';
import { QUERY_KEYS } from '@/lib/constants';
import { formatCurrency } from '@/lib/utils';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import type { Room, RoomStatus } from '@/types';
import { toast } from 'sonner';

const STATUS_CONFIG: Record<RoomStatus, { label: string; badge: string }> = {
  active: { label: 'Ready for Guests', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' },
  maintenance: { label: 'Maintenance / Deep Clean', badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' },
  off: { label: 'Off Market', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
};

export function RoomsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'all'>('all');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const { data: rooms, isLoading } = useQuery({
    queryKey: [QUERY_KEYS.rooms],
    queryFn: getRooms,
  });

  const filteredRooms = (rooms || []).filter(room => {
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      room.nickname.toLowerCase().includes(q) ||
      room.area_name.toLowerCase().includes(q) ||
      room.type.toLowerCase().includes(q) ||
      room.room_id.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'all' || room.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="page-container">
      <PageHeader
        title="Properties & Units"
        subtitle={`${rooms?.length ?? 0} luxury apartments, villas, and bungalows across Lucknow`}
        action={
          <Button onClick={() => toast.info('Add new property form - coming soon')} className="gap-1.5 bg-[#0284C7] hover:bg-[#0369A1] text-white shadow-xs font-bold text-xs h-9">
            <Plus size={15} /> Add Property
          </Button>
        }
      />

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by nickname, unit ID, locality..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'maintenance', 'off'] as (RoomStatus | 'all')[]).map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {st === 'all' ? 'All Properties' : STATUS_CONFIG[st].label.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Rooms Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="h-48 rounded-b-none" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredRooms.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="No properties matched your query"
          description="Try broadening your search term or view all properties."
          action={<Button onClick={() => { setSearch(''); setStatusFilter('all'); }}>Clear Filters</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredRooms.map((room, idx) => (
            <motion.div
              key={room.room_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              whileHover={{ y: -4 }}
            >
              <Card
                className="overflow-hidden cursor-pointer group h-full flex flex-col justify-between"
                onClick={() => setSelectedRoom(room)}
              >
                <div>
                  <div className="relative h-48 overflow-hidden bg-muted">
                    <img
                      src={room.cover_image}
                      alt={room.nickname}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={e => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=600&q=80';
                      }}
                    />
                    <div className="absolute top-3 left-3">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${STATUS_CONFIG[room.status].badge}`}>
                        {STATUS_CONFIG[room.status].label}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-lg">
                      {room.type}
                    </div>
                    {room.rating && (
                      <div className="absolute bottom-3 right-3 bg-white/95 dark:bg-black/80 backdrop-blur-md text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                        <Star size={11} className="text-haven-500 fill-haven-500" />
                        <span>{room.rating}</span>
                        <span className="text-muted-foreground text-[10px]">({room.reviews})</span>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-2.5">
                    <div>
                      <h3 className="font-display text-lg font-bold text-foreground leading-tight">
                        {room.nickname}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin size={12} className="flex-shrink-0" />
                        <span className="truncate">{room.area_name}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <BedDouble size={13} /> {room.bedrooms} BR
                      </span>
                      <span className="flex items-center gap-1">
                        <Bath size={13} /> {room.bathrooms} BA
                      </span>
                      <span className="flex items-center gap-1">
                        <Users size={13} /> {room.max_guests} Guests
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {room.amenities.slice(0, 3).map(am => (
                        <span key={am} className="text-[10px] bg-muted/70 px-2 py-0.5 rounded-md text-muted-foreground font-medium">
                          {am}
                        </span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="text-[10px] text-muted-foreground self-center">
                          +{room.amenities.length - 3}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </div>

                <div className="p-4 pt-0 border-t border-border mt-3 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-foreground text-base">
                      {formatCurrency(room.base_price)}
                      <span className="text-xs font-normal text-muted-foreground"> /night</span>
                    </div>
                    {room.airbnb_price && (
                      <div className="text-[10px] text-muted-foreground">
                        Airbnb rate: {formatCurrency(room.airbnb_price)}
                      </div>
                    )}
                  </div>
                  <span className="font-mono text-xs font-semibold px-2 py-1 rounded bg-muted">
                    {room.room_id}
                  </span>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Property Details Modal */}
      {selectedRoom && (
        <Modal
          isOpen={!!selectedRoom}
          onClose={() => setSelectedRoom(null)}
          title={selectedRoom.nickname}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="h-60 rounded-xl overflow-hidden bg-muted">
              <img
                src={selectedRoom.cover_image}
                alt={selectedRoom.nickname}
                className="w-full h-full object-cover"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-mono text-muted-foreground">{selectedRoom.room_id} · Unit {selectedRoom.unit_no}</span>
                <p className="text-sm font-medium text-foreground">{selectedRoom.address}</p>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold font-display text-primary">{formatCurrency(selectedRoom.base_price)}/night</div>
                <div className="text-xs text-muted-foreground">Direct Booking Rate</div>
              </div>
            </div>

            <p className="text-sm text-foreground/80 leading-relaxed">
              {selectedRoom.description}
            </p>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                All Included Amenities:
              </h4>
              <div className="flex flex-wrap gap-2">
                {selectedRoom.amenities.map(a => (
                  <span key={a} className="px-2.5 py-1 rounded-lg bg-muted text-xs font-medium text-foreground">
                    ✓ {a}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-border flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSelectedRoom(null)}>
                Close
              </Button>
              <Button onClick={() => { setSelectedRoom(null); toast.success('Room marked for edits'); }}>
                Edit Pricing & Availability
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
