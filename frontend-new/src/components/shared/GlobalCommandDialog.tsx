import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  BedDouble,
  Calendar,
  User,
  FileText,
  ArrowRight,
  Shirt,
  Wrench,
  Package,
  Receipt,
  Briefcase,
  Landmark,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import {
  mockBookings,
  mockRooms,
  mockGuests,
  mockEmployees,
  mockInvestors,
  mockExpenses,
} from '@/mocks/data';

interface GlobalCommandDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalCommandDialog({ isOpen, onClose }: GlobalCommandDialogProps) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  const q = query.toLowerCase().trim();

  const matchedBookings = q
    ? mockBookings.filter(
        b =>
          b.guest_name.toLowerCase().includes(q) ||
          b.booking_id.toLowerCase().includes(q)
      )
    : [];

  const matchedRooms = q
    ? mockRooms.filter(
        r =>
          r.nickname.toLowerCase().includes(q) ||
          r.room_id.toLowerCase().includes(q)
      )
    : [];

  const matchedGuests = q
    ? mockGuests.filter(
        g => g.name.toLowerCase().includes(q) || g.phone.includes(q)
      )
    : [];

  const matchedEmployees = q
    ? mockEmployees.filter(
        e =>
          e.name.toLowerCase().includes(q) ||
          e.role.toLowerCase().includes(q) ||
          e.phone.includes(q)
      )
    : [];

  const matchedInvestors = q
    ? mockInvestors.filter(
        i =>
          i.name.toLowerCase().includes(q) ||
          (i.email && i.email.toLowerCase().includes(q)) ||
          i.phone.includes(q)
      )
    : [];

  const matchedExpenses = q
    ? mockExpenses.filter(
        ex =>
          ex.title.toLowerCase().includes(q) ||
          ex.category.toLowerCase().includes(q) ||
          (ex.property_id && ex.property_id.toLowerCase().includes(q))
      )
    : [];

  const handleSelect = (path: string) => {
    navigate(path);
    onClose();
    setQuery('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            autoFocus
            type="text"
            placeholder="Search bookings, guests, staff, expenses, or jump to page..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full h-11 pl-10 pr-4 rounded-xl border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
          />
        </div>

        <div className="max-h-80 overflow-y-auto space-y-3">
          {q.length === 0 ? (
            <div className="space-y-1 py-1">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-2">
                Quick Navigation
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: 'Dashboard', path: '/dashboard', icon: FileText },
                  { label: 'Bookings Register', path: '/bookings', icon: Calendar },
                  { label: 'Room Calendar', path: '/calendar', icon: Calendar },
                  { label: 'Properties & Units', path: '/rooms', icon: BedDouble },
                  { label: 'Guests (CRM)', path: '/guests', icon: User },
                  { label: 'Staff (HRMS)', path: '/employees', icon: Briefcase },
                  { label: 'Expenses Ledger', path: '/expenses', icon: Receipt },
                  { label: 'Laundry Tracker', path: '/laundry', icon: Shirt },
                  { label: 'Maintenance Tickets', path: '/maintenance', icon: Wrench },
                  { label: 'Store & Linen', path: '/store', icon: Package },
                  { label: 'Investors & P&L', path: '/investors', icon: Landmark },
                  { label: 'Monthly Reports', path: '/reports', icon: FileText },
                ].map(item => (
                  <button
                    key={item.path}
                    onClick={() => handleSelect(item.path)}
                    className="flex items-center justify-between p-2.5 rounded-lg text-xs font-medium text-foreground hover:bg-muted transition-colors text-left"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <item.icon size={14} className="text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <ArrowRight size={12} className="text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {matchedBookings.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                    Bookings
                  </p>
                  {matchedBookings.map(b => (
                    <button
                      key={b.booking_id}
                      onClick={() => handleSelect('/bookings')}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg text-sm hover:bg-muted text-left"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{b.guest_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {b.booking_id} · Unit {b.room_id} · ₹{b.total_amount.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <span className="text-xs text-primary font-medium">View</span>
                    </button>
                  ))}
                </div>
              )}

              {matchedEmployees.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                    Staff & HRMS
                  </p>
                  {matchedEmployees.map(e => (
                    <button
                      key={e.emp_id}
                      onClick={() => handleSelect('/employees')}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg text-sm hover:bg-muted text-left"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{e.name}</div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {e.role} · {e.pay_type} · {e.phone}
                        </div>
                      </div>
                      <span className="text-xs text-primary font-medium">View</span>
                    </button>
                  ))}
                </div>
              )}

              {matchedExpenses.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                    Expenses
                  </p>
                  {matchedExpenses.map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => handleSelect('/expenses')}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg text-sm hover:bg-muted text-left"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{ex.title}</div>
                        <div className="text-xs text-muted-foreground">
                          ₹{ex.amount.toLocaleString('en-IN')} · {ex.category} · {ex.payment_source}
                        </div>
                      </div>
                      <span className="text-xs text-primary font-medium">View</span>
                    </button>
                  ))}
                </div>
              )}

              {matchedInvestors.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                    Investors
                  </p>
                  {matchedInvestors.map(inv => (
                    <button
                      key={inv.investor_id}
                      onClick={() => handleSelect('/investors')}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg text-sm hover:bg-muted text-left"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{inv.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {inv.properties.map(p => `${p.room_id} (${p.share_percent}%)`).join(', ')}
                        </div>
                      </div>
                      <span className="text-xs text-primary font-medium">View</span>
                    </button>
                  ))}
                </div>
              )}

              {matchedRooms.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                    Properties
                  </p>
                  {matchedRooms.map(r => (
                    <button
                      key={r.room_id}
                      onClick={() => handleSelect('/rooms')}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg text-sm hover:bg-muted text-left"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{r.nickname}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.room_id} · {r.area_name} · ₹{r.base_price}/night
                        </div>
                      </div>
                      <span className="text-xs text-primary font-medium">View</span>
                    </button>
                  ))}
                </div>
              )}

              {matchedGuests.length > 0 && (
                <div>
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-2 mb-1">
                    Guests
                  </p>
                  {matchedGuests.map(g => (
                    <button
                      key={g.id}
                      onClick={() => handleSelect('/guests')}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg text-sm hover:bg-muted text-left"
                    >
                      <div>
                        <div className="font-semibold text-foreground">{g.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {g.phone} · {g.total_stays} stays · ₹{g.total_spent.toLocaleString('en-IN')}
                        </div>
                      </div>
                      <span className="text-xs text-primary font-medium">View</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
