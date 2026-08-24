with open('js/cashbook.js', 'r') as f:
    code = f.read()

# Ensure holders dynamically include anyone who received payment (like Shahenshah, Hazi Sahab) even if not in static list
old_holder_map = "const holderNames = (holders || []).map(h => h.name);"
new_holder_map = """// Combine static holders + anyone who received payments (Shahenshah, Hazi Sahab, etc.)
  const dynamicHolders = setOfNames = new Set([
    ...(holders || []).map(h => h.name),
    ...(payments || []).map(p => p.received_by).filter(Boolean)
  ]);
  const holderNames = Array.from(dynamicHolders);"""

if old_holder_map in code:
    code = code.replace(old_holder_map, new_holder_map)

with open('js/cashbook.js', 'w') as f:
    f.write(code)

print("✅ Cashbook UI logic updated to automatically render Shahenshah & all payment receivers!")
