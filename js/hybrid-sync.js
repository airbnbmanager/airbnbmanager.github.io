// ═══════════════════════════════════════════════════════════
// 🔄 HYBRID SYNC — All 17 Properties Real-Time iCal + Calendar Lock
// ═══════════════════════════════════════════════════════════

window.HYBRID_SYNC = {
  properties: {
    'VIL-108': { name: 'Pink Paradise Villa', ical_url: 'https://www.airbnb.co.in/calendar/ical/1756799939825259443.ics?s=0ae34e2ae136b52e9626bd0e8d5f77e2' },
    'VIL-105': { name: 'The Yellow House', ical_url: 'https://www.airbnb.co.in/calendar/ical/1592729918855637425.ics?s=efdbca3abd6eb75e26d2d8ae0c4fc6a0' },
    'VIL-106': { name: 'Green forest View', ical_url: 'https://www.airbnb.co.in/calendar/ical/1739254108962193705.ics?s=0df31e977e39a4929116e1b84473d6ff' },
    'LUL-402': { name: 'Celebrity Garden', ical_url: 'https://www.airbnb.co.in/calendar/ical/1606514664948608755.ics?s=e9df8a7bf2bec706ecda3cccb71d4e90' },
    'GOM-302': { name: 'The Unique', ical_url: 'https://www.airbnb.co.in/calendar/ical/1679190202218939181.ics?s=bfffccbbc6678da8ba895cd3bdd9711b' },
    'GOM-301': { name: 'The Light Green', ical_url: 'https://www.airbnb.co.in/calendar/ical/1679155811558485410.ics?s=2bf43a9a1a56e088ac3062552abd36c8' },
    'GOM-501': { name: 'Starlight Blue PentHouse', ical_url: 'https://www.airbnb.co.in/calendar/ical/1718385679817913835.ics?s=7460587d24c4e40f08c518663aef30bf' },
    'GOM-102': { name: 'Black Beauty', ical_url: 'https://www.airbnb.co.in/calendar/ical/1676840617430941240.ics?s=b9f88e5532d2c123f505d9f86342c507' },
    'GOM-401': { name: 'The Nawabi Stay', ical_url: 'https://www.airbnb.co.in/calendar/ical/1723434530455939144.ics?s=266526ac3d972903b4b77b48ff6078bd' },
    'VIL-101': { name: 'Gomti Grand Villa', ical_url: 'https://www.airbnb.co.in/calendar/ical/1721732716374002170.ics?s=5e0e5482fdc5df8bf8e5901724f66b84' },
    'VIL-104': { name: 'The Green House', ical_url: 'https://www.airbnb.co.in/calendar/ical/1593461780265937816.ics?s=cddde69eff396b304620f8fd1f59022c' },
    'VIL-103': { name: 'The Pink House', ical_url: 'https://www.airbnb.co.in/calendar/ical/1592729438969718723.ics?s=0b58c0d6a8111e27b1fa685ac48f5544' },
    'GOM-202': { name: 'The Brown', ical_url: 'https://www.airbnb.co.in/calendar/ical/1660898784168880636.ics?s=0eceacf4f9f48aeebe0b0f166cb21fa3' },
    'VIL-107': { name: 'The Velvet House', ical_url: 'https://www.airbnb.co.in/calendar/ical/1727830063287100082.ics?s=941e03cc0e52d3636e9835e2ec2b62be' },
    'VIL-102': { name: 'Royal White House', ical_url: 'https://www.airbnb.co.in/calendar/ical/1718315215180636685.ics?s=88c698fc4b8a4085ab6ad210daee7e8f' },
    'GOM-201': { name: 'The Dark Blue', ical_url: 'https://www.airbnb.co.in/calendar/ical/1655969170448425308.ics?s=f706b4312eaf30553e047c4cd74b8128' },
    'GOM-101': { name: 'RedRose Palace', ical_url: 'https://www.airbnb.co.in/calendar/ical/1654261872286835347.ics?s=dd04cdcc476495684a1e2c6a33040799' }
  },
  mergedBookings: [],
  timerId: null,

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

        const checkIn = formatDate(dtStart);
        const checkOut = formatDate(dtEnd);

        // Include from August 1st 2026 onwards
        if (checkIn >= '2026-08-01') {
          const isBlock = summary.toLowerCase().includes('not available') || summary.toLowerCase().includes('blocked');
          events.push({
            booking_id: uid ? 'ICAL_' + uid : 'ICAL_' + Date.now() + '_' + i,
            guest_name: isBlock ? '🚫 Airbnb Blocked' : summary.replace('Reserved', 'Airbnb Guest').trim(),
            check_in: checkIn,
            check_out: checkOut,
            room_id: roomId,
            is_blocked: isBlock,
            booking_mode: isBlock ? 'Offline-Blocked' : 'Online-Airbnb',
            payment_status: 'Paid',
            notes: description || (isBlock ? 'Airbnb Blocked date' : 'Real-time iCal sync')
          });
        }
      }
    }
    return events;
  },

  syncAllProperties: async function() {
    const proxies = [
      'https://vxxmigdzimnrbbmkjzoa.supabase.co/functions/v1/ical-proxy?url=',
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://api.allorigins.win/raw?url='
    ];

    const roomIds = Object.keys(this.properties);

    for (const roomId of roomIds) {
      const prop = this.properties[roomId];
      if (!prop || !prop.ical_url) continue;

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

      if (!icsText) continue;

      const icalEvents = this.parseICS(icsText, roomId);
      if (icalEvents.length === 0) continue;

      // Fetch all existing bookings for this room in DB
      const { data: dbBookings } = await sb.from('guest_register')
        .select('booking_id, check_in, check_out, room_id, is_cancelled, guest_name')
        .eq('room_id', roomId)
        .neq('is_cancelled', true);

      const newToInsert = [];
      icalEvents.forEach(ev => {
        // Range overlap check
        const overlapBk = (dbBookings || []).find(dbB => {
          if (!dbB.check_in || !dbB.check_out) return false;
          return (dbB.check_in < ev.check_out && dbB.check_out > ev.check_in);
        });

        // 1. If NO OVERLAP -> Insert new booking or block entry
        if (!overlapBk) {
          const deterministicId = ev.is_blocked ? `BLK_${roomId}_${ev.check_in.replace(/-/g, '')}` : 'BK_' + Date.now() + '_' + Math.floor(Math.random()*10000);
          newToInsert.push({
            booking_id: deterministicId,
            guest_name: ev.guest_name,
            check_in: ev.check_in,
            check_out: ev.check_out,
            room_id: roomId,
            booking_mode: 'Online-Airbnb',
            payment_status: 'Paid',
            total_amount: 0,
            notes: ev.is_blocked ? 'Airbnb Blocked date auto-synced' : ('Auto-synced from ' + prop.name + ' iCal')
          });
        }
      });

      if (newToInsert.length > 0) {
        await sb.from('guest_register').upsert(newToInsert, { onConflict: 'booking_id', ignoreDuplicates: true });
        console.log(`✅ ${prop.name} (${roomId}): Synced ${newToInsert.length} bookings/blocks!`);
      }
    }
  },

  startAutoSync: function() {
    this.syncAllProperties();
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.syncAllProperties();
    }, 5 * 60 * 1000);
  },

  getStatus: function() {
    return {
      total_properties: Object.keys(this.properties).length,
      auto_sync: !!this.timerId
    };
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      if (window.HYBRID_SYNC) window.HYBRID_SYNC.startAutoSync();
    }, 2000);
  });
}
