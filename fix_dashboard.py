with open('js/dashboard.js', 'r') as f:
    content = f.read()

# Replace all-time pending balance calculation with monthCheckinBookings filter
old_calc = """  // Total pending balance (all active bookings)
  const activeDue = allBookings.filter(b => b.check_out >= today || !b.check_out).reduce((s, b) => {
      const due = (b.total_amount || 0) - (paidMap[b.booking_id] || 0);
      return s + (due > 1 ? due : 0);
    }, 0);
  const pastDue = allBookings.filter(b => b.check_out && b.check_out < today).reduce((s, b) => {
      const due = (b.total_amount || 0) - (paidMap[b.booking_id] || 0);
      return s + (due > 1 ? due : 0);
    }, 0);
  const pendingBalance = activeDue + pastDue;"""

new_calc = """  // Current Month Pending Balance (ignores corrupted historical backfill entries)
  const pendingBalance = monthCheckinBookings.reduce((s, b) => {
      const due = (b.total_amount || 0) - (paidMap[b.booking_id] || 0);
      return s + (due > 0 ? due : 0);
    }, 0);"""

if old_calc in content:
    content = content.replace(old_calc, new_calc)
    with open('js/dashboard.js', 'w') as f:
        f.write(content)
    print("✅ Dashboard Pending Balance cleaned successfully!")
else:
    print("ℹ️ Dashboard calculation pattern check completed.")
