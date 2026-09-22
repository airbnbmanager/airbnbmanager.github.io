/**
 * Airbnb iCal Parser Module
 * Fetches and parses iCal format bookings from Airbnb URLs
 */

(function() {
  const CORS_PROXIES = [
    'https://vxxmigdzimnrbbmkjzoa.supabase.co/functions/v1/ical-proxy?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest=',
    'https://api.allorigins.win/raw?url='
  ];

  const parser = {
    parseIcal(icalText) {
      if (!icalText) return [];
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
      const clean = dateStr.replace(/[^0-9]/g, '');
      const year = clean.substring(0, 4);
      const month = clean.substring(4, 6);
      const day = clean.substring(6, 8);
      const hour = clean.substring(8, 10) || '00';
      const min = clean.substring(10, 12) || '00';

      return {
        date: `${year}-${month}-${day}`,
        time: `${hour}:${min}`,
        isoString: `${year}-${month}-${day}T${hour}:${min}:00Z`
      };
    },

    async fetchFromUrl(icalUrl) {
      if (!icalUrl) return [];
      for (let proxy of CORS_PROXIES) {
        try {
          const proxyUrl = proxy + encodeURIComponent(icalUrl);
          const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: { 'Accept': 'text/calendar, text/plain, */*' },
          });
          if (response.ok) {
            const icalText = await response.text();
            if (icalText.includes('BEGIN:VCALENDAR')) {
              return this.parseIcal(icalText);
            }
          }
        } catch (err) {
          // Continue to next proxy
        }
      }
      return [];
    }
  };

  window.ICAL_PARSER = parser;

  // Safely merge into window.ICAL_SYNC without overwriting syncAll / syncProperty
  if (window.ICAL_SYNC && typeof window.ICAL_SYNC === 'object') {
    window.ICAL_SYNC.parseIcalDate = parser.parseIcalDate;
    if (!window.ICAL_SYNC.fetchFromUrl) {
      window.ICAL_SYNC.fetchFromUrl = parser.fetchFromUrl.bind(parser);
    }
  } else {
    window.ICAL_SYNC = parser;
  }

  console.log('✅ Airbnb iCal Sync parser loaded safely');
})();
