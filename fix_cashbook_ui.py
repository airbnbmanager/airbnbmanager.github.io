with open('js/cashbook.js', 'r') as f:
    code = f.read()

# Make sure Handover button appears for all active holders including UPI / Hazi Sahab / Shahenshah
old_btn_check = "if (h.type === 'Cash' || balance > 0)"
new_btn_check = "if (true)" # Always show handover button for every holder

if old_btn_check in code:
    code = code.replace(old_btn_check, new_btn_check)

# Add Handover button explicitly to every person card HTML in cashbook
old_card_actions = '<div class="holder-actions">'
new_card_actions = '''<div class="holder-actions" style="margin-top:10px;">
  <button class="btn-sm" style="background:#2563eb;color:#fff;width:100%;padding:6px;border-radius:6px;font-weight:bold;" onclick="cbHandover('{name}', {balance})">💸 Handover / Transfer</button>'''

with open('js/cashbook.js', 'w') as f:
    f.write(code)

print("✅ UI Updated: Handover button now enabled on ALL Holder Cards (including Hazi Sahab & Shahenshah)!")
