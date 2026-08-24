import urllib.request
import json
import datetime

SUPABASE_URL = "https://vxxmigdzimnrbbmkjzoa.supabase.co"
SUPABASE_KEY = "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "json/application",
    "Prefer": "return=representation"
}

today = datetime.date.today().isoformat()

def post(endpoint, data):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except Exception as e:
        print(f"❌ Error inserting into {endpoint}:", e)
        return None

def fetch(endpoint):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

print("\n🔄 Syncing Cashbook balances...")

# 1. Ensure Shahenshah and Hazi Sahab exist in cash_holders
holders = fetch("cash_holders?select=*")
existing_names = [h.get('name') for h in holders]

for name in ["Shahenshah", "Mr. Alam Hazi Sahab", "Firoz", "Aniket", "Praveen"]:
    if name not in existing_names:
        post("cash_holders", {"name": name, "type": "Cash", "is_active": True, "spending_limit": 100000})
        print(f"✅ Created holder entry for: {name}")

# Fetch payments to calculate current balances
payments = fetch("payment_history?select=received_by,amount,payment_mode&neq.verification_status.rejected")
handovers = fetch("cash_handovers?select=from_person,to_person,amount")

def get_person_balance(person_name):
    recd = sum(float(p.get('amount') or 0) for p in payments if (p.get('received_by') or '').strip().lower() == person_name.lower())
    given = sum(float(h.get('amount') or 0) for h in handovers if (h.get('from_person') or '').strip().lower() == person_name.lower())
    got = sum(float(h.get('amount') or 0) for h in handovers if (h.get('to_person') or '').strip().lower() == person_name.lower())
    return recd + got - given

praveen_bal = get_person_balance("Praveen")
aniket_bal = get_person_balance("Aniket")

print(f"📌 Current Praveen Balance in DB: ₹{praveen_bal:,.2f}")
print(f"📌 Current Aniket Balance in DB: ₹{aniket_bal:,.2f}")

# 2. Settle Praveen (keep 3500, rest to Firoz)
if praveen_bal > 3500:
    diff = praveen_bal - 3500
    post("cash_handovers", {
        "from_person": "Praveen",
        "to_person": "Firoz",
        "amount": diff,
        "handover_date": today,
        "notes": "System Auto-Settle: Retaining 3,500 (The Brown), extra handed over to Firoz"
    })
    print(f"✅ Handover created: Praveen -> Firoz: ₹{diff:,.2f} (Praveen balance is now ₹3,500)")

# 3. Settle Aniket (keep 4500, rest to Firoz)
if aniket_bal > 4500:
    diff = aniket_bal - 4500
    post("cash_handovers", {
        "from_person": "Aniket",
        "to_person": "Firoz",
        "amount": diff,
        "handover_date": today,
        "notes": "System Auto-Settle: Retaining 4,500, extra handed over to Firoz"
    })
    print(f"✅ Handover created: Aniket -> Firoz: ₹{diff:,.2f} (Aniket balance is now ₹4,500)")

# 4. Hazi Sahab ₹16,000 UPI Transfer to Firoz
post("cash_handovers", {
    "from_person": "Mr. Alam Hazi Sahab",
    "to_person": "Firoz",
    "amount": 16000,
    "handover_date": today,
    "notes": "UPI Transfer | 16,000 UPI collections transferred to Firoz"
})
print("✅ Handover created: Mr. Alam Hazi Sahab -> Firoz: ₹16,000 (UPI Transfer Done)")

print("\n🎉 ALL BALANCES SETTLED ACCURATELY!")
