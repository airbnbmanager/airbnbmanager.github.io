// ═══════════════════════════════════════════════════════════
// 🔄 HYBRID SYNC MODULE — Real-Time Airbnb iCal + DB Sync
// ═══════════════════════════════════════════════════════════

window.HYBRID_SYNC = {
  icalUrl: 'https://www.airbnb.co.in/calendar/ical/1606514664948608755.ics?s=e9df8a7bf2bec706ecda3cccb71d4e90',
  syncIntervalMinutes: 30,
  timerId: null,
  mergedBookings: [],

  init: function(icalUrl, intervalMins = 30) {
    if (icalUrl) this.icalUrl = icalUrl;
    this.syncIntervalMinutes = intervalMins;
    console.log('✅ HYBRID_SYNC initialized for:', this.icalUrl);
  },

  // Parse ICS Calendar Format
  parseICS: function(icsText) {
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

        events.push({
          booking_id: uid || 'ICAL_' + Date.now() + '_' + i,
          guest_name: summary.replace('Reserved', 'Airbnb Guest').replace('Airbnb (Not available)', 'Airbnb Guest').trim(),
          check_in: formatDate(dtStart),
          check_out: formatDate(dtEnd),
          notes: description,
          source: 'iCal Real-Time'
        });
      }
    }
    return events;
  },

  // Full Real-Time Sync with Supabase DB
  syncFull: async function() {
    try {
      if (!this.icalUrl) return;

      const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(this.icalUrl);
      const res = await fetch(proxyUrl);
      const text = await res.text();

      const icalBookings = this.parseICS(text);

      const { data: dbBookings } = await sb.from('guest_register').select('*');
      const merged = [...(dbBookings || [])];

      icalBookings.forEach(icB => {
        const exists = merged.some(dbB => 
          dbB.check_in === icB.check_in && dbB.room_id === 'LUL-402'
        );
        if (!exists) {
          merged.push({
            booking_id: icB.booking_id,
            guest_name: icB.guest_name,
            check_in: icB.check_in,
            check_out: icB.check_out,
            room_id: 'LUL-402',
            booking_mode: 'Online-Airbnb',
            payment_status: 'Paid',
            source: 'iCal Real-Time'
          });
        }
      });

      this.mergedBookings = merged;
      console.log('✅ Real-time Hybrid Sync complete. Total Bookings:', merged.length);
      return merged;
    } catch (err) {
      console.error('❌ Hybrid Sync Error:', err);
    }
  },

  startAutoSync: function() {
    this.syncFull();
    if (this.timerId) clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.syncFull();
    }, this.syncIntervalMinutes * 60 * 1000);
  },

  getStatus: function() {
    return {
      auto_sync_active: !!this.timerId,
      total_merged: this.mergedBookings.length,
      ical_url: this.icalUrl
    };
  }
};

// Auto-start on load
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    window.HYBRID_SYNC.startAutoSync();
  });
}
