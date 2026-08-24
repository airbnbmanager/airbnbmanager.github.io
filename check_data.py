import urllib.request
import json

SUPABASE_URL = "https://vxxmigdzimnrbbmkjzoa.supabase.co"
SUPABASE_KEY = "sb_publishable_ZgssvBczAg9TPv4ihN8IfQ_FPcEnq1F"

headers = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}"
}

def fetch(endpoint):
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

print("\n📡 Fetching data from Supabase...")

try:
    # 1. Fetch all bookings and payment history
    bookings = fetch("guest_register?select=id,booking_id,guest_name,total_amount,check_in,check_out,status")
    payments = fetch("payment_history?select=booking_id,amount")

    # Payment aggregate map
    paid_map = {}
    for p in payments:
        b_id = str(p.get('booking_id'))
        amt = float(p.get('amount') or 0)
        paid_map[b_id] = paid_map.get(b_id, 0) + amt

    # Calculate due for each booking
    pending_list = []
    total_pending_all = 0

    for b in bookings:
        b_id = str(b.get('booking_id'))
        total_amt = float(b.get('total_amount') or 0)
        paid_amt = paid_map.get(b_id, 0)
        due = total_amt - paid_amt
        
        if due > 1:
            total_pending_all += due
            pending_list.append({
                'id': b.get('id'),
                'booking_id': b.get('booking_id'),
                'guest_name': b.get('guest_name'),
                'total_amount': total_amt,
                'paid_amount': paid_amt,
                'due': due,
                'check_in': b.get('check_in'),
                'check_out': b.get('check_out'),
                'status': b.get('status')
            })

    # Sort by due descending
    pending_list.sort(key=lambda x: x['due'], reverse=True)

    print(f"\n📊 TOTAL CALCULATED PENDING BALANCE: ₹{total_pending_all:,.2f}")
    print("\n🚨 --- TOP 10 BOOKINGS WITH HIGHEST PENDING DUE ---")
    print(f"{'ID':<6} | {'Booking ID':<15} | {'Guest Name':<20} | {'Total (₹)':<12} | {'Paid (₹)':<10} | {'Due (₹)':<12} | {'Check-In':<10}")
    print("-" * 105)

    for item in pending_list[:10]:
        print(f"{str(item['id']):<6} | {str(item['booking_id']):<15} | {str(item['guest_name'])[:20]:<20} | {item['total_amount']:<12,.0f} | {item['paid_amount']:<10,.0f} | {item['due']:<12,.0f} | {str(item['check_in']):<10}")

    print("\n📅 --- BOOKINGS WITH YEAR 2026 ---")
    b2026 = [b for b in bookings if (b.get('check_in') or '').startswith('2026')]
    print(f"Total 2026 bookings found: {len(b2026)}")
    for b in b2026[:5]:
        print(f"ID: {b.get('id')} | BookingID: {b.get('booking_id')} | Guest: {b.get('guest_name')} | Amount: ₹{b.get('total_amount')} | CheckIn: {b.get('check_in')}")

except Exception as e:
    print("❌ Error:", e)
