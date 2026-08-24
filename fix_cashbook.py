with open('js/cashbook.js', 'r') as f:
    code = f.read()

# 1. Update Payment & Handover fetch logic to include All-time historical balances up to endDate
old_fetch = """  // Fetch all data
  const [{ data: holders }, { data: payments }, { data: handovers }] = await Promise.all([
    sb.from('cash_holders').select('*').eq('is_active', true),
    sb.from('payment_history')
      .select('id, received_by, amount, booking_id, payment_date, payment_mode, notes, paid_at, guest_register(guest_name, rooms(nickname, unit_no)))')
      .neq('verification_status', 'rejected')
      .gte('payment_date', startDate)
      .lte('payment_date', endDate)
      .order('paid_at', { ascending: false }),
    sb.from('cash_handovers')
      .select('*')
      .gte('handover_date', startDate)
      .lte('handover_date', endDate)
      .order('created_at', { ascending: false })
  ]);"""

# Replace date filters for payments/handovers to fetch all up to endDate so balance carries forward
code = code.replace(
    ".gte('payment_date', startDate)\n      .lte('payment_date', endDate)",
    ".lte('payment_date', endDate)"
)

code = code.replace(
    ".gte('handover_date', startDate)\n      .lte('handover_date', endDate)",
    ".lte('handover_date', endDate)"
)

# 2. Add Payment Mode (UPI / Cash / Bank) to Handover Modal
old_handover_form = """  const date = document.getElementById('cbDate').value;"""
new_handover_form = """  const mode = document.getElementById('cbMode')?.value || 'Cash';
  const date = document.getElementById('cbDate').value;"""

if old_handover_form in code and 'cbMode' not in code:
    code = code.replace(old_handover_form, new_handover_form)
    
    code = code.replace(
        "amount, handover_date: date, notes: notes || null,",
        "amount, handover_date: date, notes: notes ? (mode + ' Transfer | ' + notes) : (mode + ' Transfer'),"
    )

with open('js/cashbook.js', 'w') as f:
    f.write(code)

print("✅ Cashbook Carry-Forward & UPI Transfer capability updated successfully!")
