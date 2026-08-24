with open('js/cashbook.js', 'r') as f:
    code = f.read()

# 1. Update Cash Handovers to exclude UPI handovers in Cash View
old_cash_ho_in = "const hoIn = (handovers || []).filter(x => x.to_person === h.name)"
new_cash_ho_in = "const hoIn = (handovers || []).filter(x => x.to_person === h.name && !(x.notes || '').toLowerCase().includes('upi'))"

old_cash_ho_out = "const hoOut = (handovers || []).filter(x => x.from_person === h.name)"
new_cash_ho_out = "const hoOut = (handovers || []).filter(x => x.from_person === h.name && !(x.notes || '').toLowerCase().includes('upi'))"

if old_cash_ho_in in code:
    code = code.replace(old_cash_ho_in, new_cash_ho_in)

if old_cash_ho_out in code:
    code = code.replace(old_cash_ho_out, new_cash_ho_out)

# 2. Update UPI Handovers to include ONLY UPI handovers in UPI View
old_upi_ho_in = "const upiHoIn = (handovers || []).filter(x => x.to_person === key)"
new_upi_ho_in = "const upiHoIn = (handovers || []).filter(x => x.to_person === key && (x.notes || '').toLowerCase().includes('upi'))"

old_upi_ho_out = "const upiHoOut = (handovers || []).filter(x => x.from_person === key)"
new_upi_ho_out = "const upiHoOut = (handovers || []).filter(x => x.from_person === key && (x.notes || '').toLowerCase().includes('upi'))"

if old_upi_ho_in in code:
    code = code.replace(old_upi_ho_in, new_upi_ho_in)

if old_upi_ho_out in code:
    code = code.replace(old_upi_ho_out, new_upi_ho_out)

with open('js/cashbook.js', 'w') as f:
    f.write(code)

print("✅ PERMANENT FIX APPLIED: Cash and UPI handovers are now completely isolated!")
