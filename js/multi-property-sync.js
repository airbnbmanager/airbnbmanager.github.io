/**
 * UHHS Multi-Property iCal Sync Manager
 * Real-time booking sync from all properties via CORS proxies (same as ical-sync.js)
 */

(function() {
  if (!window.UHHS_PROPERTIES) {
    console.error('❌ uhhs-config.js not loaded');
    return;
  }

  const MULTI_SYNC = window.MULTI_SYNC = {
    properties: UHHS_PROPERTIES,
    syncResults: {},
    allBookings: [],
    blockedDates: [],
    lastSyncTime: null,
    syncInProgress: false,
    autoSyncInterval: null,
    syncFrequency: 30,

    // Same proxies as ical-sync.js (with fallback)
    CORS_PROXIES: [
      'https://vxxmigdzimnrbbmkjzoa.supabase.co/functions/v1/ical-proxy?url=',
      'https://corsproxy.io/?',
      'https://api.codetabs.com/v1/proxy?quest=',
      'https://api.allorigins.win/raw?url='
    ],

    parseIcal(icalText) {
      const events = [];
      const eventRegex = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
      let match;

      while ((match = eventRegex.exec(icalText)) !== null) {
        const eventText = match[1];
        const event = {};
        const lines = eventText.split(/\r?\n/);
        let currentKey = '', currentValue = '';

        for (let line of lines) {
          if (line.match(/^[A-Z]/)) {
            if (currentKey) event[currentKey] = currentValue;
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
              currentKey = line.substring(0, colonIndex).split(';')[0];
              currentValue = line.substring(colonIndex + 1);
            }
          } else if (line.trim()) {
            currentValue += line;
          }
        }
        if (currentKey) event[currentKey] = currentValue;
        events.push(event);
      }
      return events;
    },

    parseIcalDate(dateStr) {
      if (!dateStr) return null;
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      const hour = dateStr.substring(9, 11) || '00';
      const min = dateStr.substring(11, 13) || '00';

      return {
        date: `${year}-${month}-${day}`,
        time: `${hour}:${min}`,
        isoString: `${year}-${month}-${day}T${hour}:${min}:00Z`
      };
    },

    classifyEvent(event, property) {
      const summary = event.SUMMARY || '';
      const isBlocked = summary.includes('Blocked') ||
                        summary === property.property_name ||
                        summary.includes('block');
      return { type: isBlocked ? 'BLOCKED' : 'BOOKING', isBlocked };
    },

    extractBooking(event, property) {
      const dtStart = event.DTSTART || '';
      const dtEnd = event.DTEND || '';
      const summary = event.SUMMARY || '';
      const description = event.DESCRIPTION || '';
      const uid = event.UID || '';

      const checkin = this.parseIcalDate(dtStart);
      const checkout = this.parseIcalDate(dtEnd);

      const guestName = summary.split(' - ')[0]?.trim() || '';

      const descLines = description.split(/\\n|\n/).filter(l => l.trim());
      const details = {};

      for (let line of descLines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim().toLowerCase();
          const value = line.substring(colonIndex + 1).trim();
          details[key] = value;
        }
      }

      let guests = 1, adults = 1, children = 0, infants = 0;
      const guestInfo = details.guests || '';
      if (guestInfo) {
        const adultsMatch = guestInfo.match(/(\d+)\s*adults?/i);
        const childrenMatch = guestInfo.match(/(\d+)\s*children?/i);
        const infantsMatch = guestInfo.match(/(\d+)\s*infants?/i);

        adults = adultsMatch ? parseInt(adultsMatch[1]) : 1;
        children = childrenMatch ? parseInt(childrenMatch[1]) : 0;
        infants = infantsMatch ? parseInt(infantsMatch[1]) : 0;
        guests = adults + children + infants;
      }

      return {
        confirmation_code: uid,
        guest_name: guestName,
        guest_phone: details.phone || details.contact || '',
        guest_count: guests,
        adults, children, infants,
        property_name: property.property_name,
        property_id: property.id,
        unit_no: property.unit_no,
        checkin_date: checkin?.date || '',
        checkin_time: checkin?.time || '10:00',
        checkout_date: checkout?.date || '',
        checkout_time: checkout?.time || '11:00',
        door_code: details['door code'] || details.door || '',
        special_requests: details.notes || details.requests || '',
        booking_mode: 'Online-Airbnb',
        source: 'iCal',
      };
    },

    // Use CORS proxies (same as ical-sync.js)
    async fetchPropertyIcal(property) {
      let lastError = null;
      
      for (let i = 0; i < this.CORS_PROXIES.length; i++) {
        try {
          const proxy = this.CORS_PROXIES[i];
          const proxyUrl = proxy + encodeURIComponent(property.ical_url);
          
          const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: { 'Accept': 'text/calendar, text/plain, */*' },
          });

          if (!response.ok) {
            lastError = `Proxy ${i + 1} returned ${response.status}`;
            continue;
          }

          const icalText = await response.text();
          
          if (!icalText.includes('BEGIN:VCALENDAR')) {
            lastError = `Proxy ${i + 1} returned invalid data`;
            continue;
          }

          return this.parseIcal(icalText);
        } catch (err) {
          lastError = `Proxy ${i + 1}: ${err.message}`;
          continue;
        }
      }

      throw new Error(`All proxies failed. Last: ${lastError}`);
    },

    async syncAllProperties() {
      console.group('🔄 Multi-Property iCal Sync Starting...');
      console.log(`⏰ ${new Date().toLocaleTimeString('en-IN')}`);

      this.syncInProgress = true;
      this.syncResults = {};
      this.allBookings = [];
      this.blockedDates = [];

      for (const property of this.properties) {
        if (!property.active) continue;

        try {
          console.log(`  ⏳ ${property.nickname}...`);
          const events = await this.fetchPropertyIcal(property);

          const bookings = [];
          const blocked = [];

          for (const event of events) {
            const classification = this.classifyEvent(event, property);

            if (classification.isBlocked) {
              const checkin = this.parseIcalDate(event.DTSTART);
              if (checkin) {
                blocked.push({
                  property_id: property.id,
                  property_name: property.property_name,
                  date: checkin.date,
                  reason: 'Airbnb Blocked',
                  source: 'iCal',
                });
              }
            } else {
              const booking = this.extractBooking(event, property);
              bookings.push(booking);
            }
          }

          this.syncResults[property.id] = {
            property: property.nickname,
            bookings: bookings.length,
            blocked: blocked.length,
            events: events.length,
            success: true,
          };

          this.allBookings.push(...bookings);
          this.blockedDates.push(...blocked);

          console.log(`  ✅ ${property.nickname}: ${bookings.length} bookings, ${blocked.length} blocked`);
        } catch (err) {
          this.syncResults[property.id] = {
            property: property.nickname,
            success: false,
            error: err.message,
          };
          console.error(`  ❌ ${property.nickname}: ${err.message}`);
        }
      }

      this.lastSyncTime = new Date();
      this.syncInProgress = false;

      console.log(`\n✅ Sync Complete! Total: ${this.allBookings.length} bookings, ${this.blockedDates.length} blocked`);
      console.groupEnd();

      return {
        success: true,
        bookings: this.allBookings,
        blocked: this.blockedDates,
        timestamp: this.lastSyncTime,
        results: this.syncResults,
      };
    },

    startAutoSync() {
      if (this.autoSyncInterval) {
        console.warn('⚠️ Auto-sync already running');
        return;
      }

      this.syncAllProperties();

      this.autoSyncInterval = setInterval(() => {
        console.log(`🤖 Auto-sync (every ${this.syncFrequency} mins)`);
        this.syncAllProperties();
      }, this.syncFrequency * 60 * 1000);

      console.log(`✅ Auto-sync started (every ${this.syncFrequency} mins)`);
    },

    stopAutoSync() {
      if (this.autoSyncInterval) {
        clearInterval(this.autoSyncInterval);
        this.autoSyncInterval = null;
        console.log('⏸️ Auto-sync stopped');
      }
    },

    getPropertyBookings(propertyId) {
      return this.allBookings.filter(b => b.property_id === propertyId);
    },

    getPropertyBlocked(propertyId) {
      return this.blockedDates.filter(b => b.property_id === propertyId);
    },

    getStatus() {
      const results = Object.values(this.syncResults);
      const successful = results.filter(r => r.success).length;

      return {
        total_properties: this.properties.length,
        synced_successfully: successful,
        total_bookings: this.allBookings.length,
        total_blocked: this.blockedDates.length,
        last_sync: this.lastSyncTime,
        sync_in_progress: this.syncInProgress,
        auto_sync_active: !!this.autoSyncInterval,
        sync_frequency_minutes: this.syncFrequency,
        results: this.syncResults,
      };
    }
  };

  console.log('✅ Multi-Property Sync loaded (using CORS proxies)');
})();
