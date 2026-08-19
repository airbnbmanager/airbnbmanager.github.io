// ═══════════════════════════════════════════════════════════
// 📅 PER-DAY AUTO-CALC MODULE (v2 - SAFE)
// Auto-recalculates total_amount for open-ended bookings
// 🚨 NEVER modifies check_out date (learned from v1 bug)
// ═══════════════════════════════════════════════════════════

(function() {
  'use strict';

  // Preview mode: See what WOULD change, without updating DB
  window.previewOpenBookingUpdates = async function() {
    const today = new Date().toISOString().slice(0, 10);
    
    const { data: openBookings, error } = await sb.from('guest_register')
      .select('booking_id, guest_name, check_in, check_out, per_day_rate, total_amount, checkout_confirmed, is_cancelled')
      .eq('checkout_confirmed', false)
      .neq('is_cancelled', true)
      .lte('check_in', today);
    
    if (error) {
      console.error('❌ Query failed:', error);
      return { updated: 0, list: [] };
    }
    
    if (!openBookings || openBookings.length === 0) {
      console.log('ℹ️ No open-ended bookings found');
      return { updated: 0, list: [] };
    }
    
    const changes = [];
    for (const bk of openBookings) {
      if (!bk.per_day_rate || bk.per_day_rate <= 0) continue;
      
      const checkInDate = new Date(bk.check_in);
      const todayDate = new Date(today);
      const nights = Math.max(Math.ceil((todayDate - checkInDate) / 86400000), 1);
      const newTotal = nights * bk.per_day_rate;
      
      if (newTotal !== bk.total_amount) {
        changes.push({
          booking_id: bk.booking_id,
          guest: bk.guest_name,
          check_in: bk.check_in,
          nights_till_today: nights,
          per_day: bk.per_day_rate,
          old_total: bk.total_amount,
          new_total: newTotal,
          diff: newTotal - bk.total_amount
        });
      }
    }
    
    console.log('📊 PREVIEW: ' + changes.length + ' bookings would be updated');
    console.table(changes);
    return { updated: changes.length, list: changes };
  };

  // Apply mode: Actually update DB (with confirmation)
  window.applyOpenBookingUpdates = async function(skipConfirm) {
    const preview = await window.previewOpenBookingUpdates();
    
    if (preview.updated === 0) {
      console.log('✅ Nothing to update');
      return { updated: 0 };
    }
    
    if (!skipConfirm) {
      const ok = confirm('Update ' + preview.updated + ' bookings?\n\nOnly total_amount will change.\ncheck_out will NOT be modified.');
      if (!ok) {
        console.log('❌ Cancelled by user');
        return { updated: 0 };
      }
    }
    
    let success = 0, failed = 0;
    for (const change of preview.list) {
      const { error } = await sb.from('guest_register')
        .update({ total_amount: change.new_total })  // ✅ ONLY total_amount
        .eq('booking_id', change.booking_id);
      
      if (error) {
        console.error('❌ Failed:', change.booking_id, error.message);
        failed++;
      } else {
        success++;
      }
    }
    
    console.log('✅ Updated: ' + success + ' | ❌ Failed: ' + failed);
    return { updated: success, failed };
  };

  console.log('✅ Per-day calc module (v2) loaded — use previewOpenBookingUpdates() or applyOpenBookingUpdates()');
})();
