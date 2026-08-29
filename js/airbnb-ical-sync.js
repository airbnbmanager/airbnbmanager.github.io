/**
 * Airbnb iCal Parser Module
 * Fetches and parses iCal format bookings from Airbnb URLs
 */

window.ICAL_SYNC = {
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

  async fetchFromUrl(icalUrl) {
    try {
      const response = await fetch(icalUrl, {
        method: 'GET',
        headers: { 'Accept': 'text/calendar' },
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      const icalText = await response.text();
      return this.parseIcal(icalText);
    } catch (err) {
      console.error('iCal fetch error:', err);
      return [];
    }
  }
};

console.log('✅ Airbnb iCal Sync module loaded');
