with open('js/cashbook.js', 'r') as f:
    code = f.read()

# Replace the holder mapping and balance calculation logic
old_calc_block = """const cashBalances = (holders || []).map(h => {"""

new_calc_block = """// MASTER CARRY-FORWARD & MODE ISOLATION LOGIC
  const allPersonsSet = new Set([
    ...(holders || []).map(h => h.name),
    ...(payments || []).map(p => p.received_by).filter(Boolean),
    ...(handovers || []).map(h => h.from_person).filter(Boolean),
    ...(handovers || []).map(h => h.to_person).filter(Boolean),
    'Shahenshah', 'Praveen', 'Aniket', 'Yash', 'Mr. Alam Hazi Sahab', 'Firoz'
  ]);
  const allPersonNames = Array.from(allPersonsSet);

  const cashBalances = allPersonNames.map(name => {
    const h = (holders || []).find(x => x.name === name) || { name, type: 'Staff' };

    // CUMULATIVE ALL-TIME PAYMENTS & HANDOVERS FOR ACCURATE BALANCE
    const cashPaymentsList = (payments || []).filter(p => 
      (p.received_by || '').strip?.()?.toLowerCase() === name.toLowerCase() || 
      (p.received_by || '').trim().toLowerCase() === name.toLowerCase()
    ).filter(p => (p.payment_mode || 'Cash').toLowerCase() === 'cash');

    const received = cashPaymentsList.reduce((s, p) => s + Number(p.amount || 0), 0);

    const hoInList = (handovers || []).filter(x => 
      (x.to_person || '').trim().toLowerCase() === name.toLowerCase() && 
      !(x.notes || '').toLowerCase().includes('upi')
    );
    const hoIn = hoInList.reduce((s, x) => s + Number(x.amount || 0), 0);

    const hoOutList = (handovers || []).filter(x => 
      (x.from_person || '').trim().toLowerCase() === name.toLowerCase() && 
      !(x.notes || '').toLowerCase().includes('upi')
    );
    const hoOut = hoOutList.reduce((s, x) => s + Number(x.amount || 0), 0);

    const balance = received + hoIn - hoOut;

    return {
      holder: h,
      balance,
      received,
      hoIn,
      hoOut,
      receivedList: cashPaymentsList,
      hoInList,
      hoOutList
    };
  });

  const unusedVar = (holders || []).map(h => {"""

if old_calc_block in code and 'MASTER CARRY-FORWARD' not in code:
    code = code.replace(old_calc_block, new_calc_block)
    with open('js/cashbook.js', 'w') as f:
        f.write(code)
    print("✅ Cashbook Master calculation script patched successfully!")
else:
    print("ℹ️ Script checked/already updated.")
