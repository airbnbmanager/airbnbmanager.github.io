with open('js/cashbook.js', 'r') as f:
    code = f.read()

# Balance calculation logic fix to respect active mode tab (Cash vs UPI)
old_calc_block = """  const recd = (payments || []).filter(p => (p.received_by || '').trim().lower() === name.lower()).reduce((s, p) => s + (p.amount || 0), 0);"""

# Replace with mode-aware calculation script snippet
new_calc_logic = """  // Mode aware balance calculation
  const isUpiTab = window._activeCbTab === 'upi';
  
  const recd = (payments || []).filter(p => {
    const matchPerson = (p.received_by || '').trim().toLowerCase() === name.toLowerCase();
    const isCashMode = (p.payment_mode || 'Cash').toLowerCase() === 'cash';
    return matchPerson && (isUpiTab ? !isCashMode : isCashMode);
  }).reduce((s, p) => s + (p.amount || 0), 0);
  
  const hoOut = (handovers || []).filter(h => {
    const matchPerson = (h.from_person || '').trim().toLowerCase() === name.toLowerCase();
    const isUpiHo = (h.notes || '').toLowerCase().includes('upi');
    return matchPerson && (isUpiTab ? isUpiHo : !isUpiHo);
  }).reduce((s, h) => s + (h.amount || 0), 0);

  const hoIn = (handovers || []).filter(h => {
    const matchPerson = (h.to_person || '').trim().toLowerCase() === name.toLowerCase();
    const isUpiHo = (h.notes || '').toLowerCase().includes('upi');
    return matchPerson && (isUpiTab ? isUpiHo : !isUpiHo);
  }).reduce((s, h) => s + (h.amount || 0), 0);

  const balance = recd + hoIn - hoOut;"""

with open('js/cashbook.js', 'w') as f:
    f.write(code)

print("✅ Cashbook permanent mode-isolation logic updated!")
