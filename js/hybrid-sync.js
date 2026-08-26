// ═══════════════════════════════════════════════════════════
// 🔄 HYBRID SYNC — Celebrity Garden (LUL-402) Real-Time Sync
// ═══════════════════════════════════════════════════════════

window.HYBRID_SYNC = {
  properties: {
    'LUL-402': {
      name: 'Celebrity Garden',
      ical_url: 'https://www.airbnb.co.in/calendar/ical/1606514664948608755.ics?s=e9df8a7bf2bec706ecda3cccb71d4e90'
    }
  },
  mergedBookings: [],
  timerId: null,

  // Parse iCal Feed
  parseICS: function(icsText, roomId) {
    const events = [];
    const blocks = icsText.split('BEGIN:VEVENT');

    for (let i = 1; i < blocks.length; i++) {
      const b = blocks[i];
      const getVal = key => {
        const match = b.match(new RegExp(key + ':(.*)'));
        return match ? match[1].trim() : '';
      };

      const dtStart = getVal('DTSTART;VALUE=DATE') || getVal('DTSTART');
      const dtEnd = getVal('DTEND;VALUE=DATE') || getVal('DTEND');
      const summary = getVal('SUMMARY');
      const description = getVal('DESCRIPTION');
      const uid = getVal('UID');

      if (dtStart && dtEnd) {
        const formatDate = dStr => {
          const s = dStr.replace(/[^0-9]/g, '');
          if (s.length >= 8) return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`;
          return dStr;
        };

        const cleanName = summary
          .replace('Reserved', 'Airbnb Guest')
          .replace('Airbnb (Not available)', 'Airbnb Blocked')
          .replace('Not available', 'Blocked')
          .trim();

        events.push({
          booking_id: uid ? 'ICAL_' + uid : 'ICAL_' + Date.now() + '_' + i,
          guest_name: cleanName || 'Airbnb Guest',
          check_in: formatDate(dtStart),
          check_out: formatDate(dtEnd),
          room_id: roomId,
          booking_mode: 'Online-Airbnb',
          payment_status: 'Paid',
          notes: description || 'Real-time iCal sync for Celebrity Garden',
          source: 'iCal Real-Time'
        });
      }
    }
    return events;
  },

  // Full Real-Time Sync
  syncProperty: async function(roomId) {
    const prop = this.properties[roomId];
    if (!prop || !prop.ical_url) return [];

    const proxies = [
      'https://vxxmigdzimnrbbmkjzoa.supabase.co/functions/v1/ical-proxy?url=',
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://api.allorigins.win/raw?url='
    ];

    let icsText = '';
    for (const p of proxies) {
      try {
        const res = await fetch(p + encodeURIComponent(prop.ical_url));
        if (res.ok) {
          const text = await res.text();
          if (text && text.includes('BEGIN:VCALENDAR')) {
            icsText = text;
            break;
          }
        }
      } catch (e) {}
    }

    if (!icsText) {
      console.warn(`⚠️ Could not fetch iCal for ${prop.name}`);
      return [];
    }

    const icalEvents = this.parseICS(icsText, roomId);

    // Merge with DB
    const { data: dbBookings } = await sb.from('guest_register').select('*').eq('room_id', roomId);
    const existingMap = new Set((dbBookings || []).map(b => `${b.room_id}_${b.check_in}`));

    const newToInsert = [];
    icalEvents.forEach(ev => {
      if (!existingMap.has(`${ev.room_id}_${ev.check_in}`)) {
        newToInsert.push({
          booking_id: 'BK_' + Date.now() + '_' + Math.floor(Math.random()*1000),
          guest_name: ev.guest_name,
          check_in: ev.check_in,
          check_out: ev.check_out,
          room_id: roomId,
          booking_mode: 'Online-Airbnb',
          payment_status: 'Paid',
          total_amount: 0,
          notes: 'Auto-synced from Celebrity Garden iCal'
        });
      }
    });

    if (newToInsert.length > 0) {
      await sb.from('guest_register').upsert(newToInsert, { onConflict: 'booking_id', ignoreDuplicates: true });
      console.log(`✅ Celebrity Garden (${roomId}): Synced ${newToInsert.length} new bookings to DB!`);
    } else {
      console.log(`✅ Celebrity Garden (${roomId}): Up to date (No new bookings)`);
    }

    this.mergedBookings = icalEvents;
    return icalEvents;
  },

  startAutoSync: function() {
    this.syncProperty('LUL-402');
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.syncProperty('LUL-402');
    }, 5 * 60 * 1000); // Every 5 minutes
  },

  getStatus: function() {
    return {
      property: 'Celebrity Garden (LUL-402)',
      auto_sync: !!this.timerId,
      total_ical_events: this.mergedBookings.length
    };
  }
};

// Auto-run on page load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (window.HYBRID_SYNC) window.HYBRID_SYNC.startAutoSync();
    }, 2000);
  });
}
