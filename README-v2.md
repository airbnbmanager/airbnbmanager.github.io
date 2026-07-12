# The Unique Haven Homes Pvt Ltd — v2 Update

Ye update add karta hai: proper property details (13 properties seeded),
Payment History (timestamped), Online/Offline booking + Airbnb commission,
ID proof photo upload, Store/Inventory, Investor role, Reports/Charts,
aur login pe naam+role dikhna.

## Step 1 — Database migration run karo
1. Supabase → **SQL Editor** → New query
2. `migration-v2.sql` ka poora content paste karo → **Run**
3. "Success" aana chahiye. Ye tumhara purana data delete nahi karega —
   sirf naye columns/tables add karta hai aur 13 properties seed karta hai.

⚠️ Agar koi error aaye ("column already exists" jaisa), screenshot bhej dena.

## Step 2 — Apna display name set karo
SQL Editor mein ye run karo (apna email daal ke jo owner account hai):
```sql
update profiles set display_name = 'Praveen (Owner)'
where user_id = (select id from auth.users where email = 'videoeditorlucknow@gmail.com');
```

## Step 3 — Files apne repo mein replace karo
Ye sab files purani wali jagah replace karo:
- `app.js`
- `index.html`
- `style.css`
- (schema.sql, config.js, migration-v2.sql — inhe bhi copy kar lena, reference ke liye)

```bash
git add .
git commit -m "v2: property details, payment history, store, investors, reports"
git push
```

## Step 4 — Boss (Viewer) ka login
1. Supabase → Authentication → Users → Add user (unka email/password)
2. Table Editor → `profiles` → Insert row:
   - `user_id` = unka UID
   - `role` = `viewer`
   - `display_name` = `Shahenshah (Boss)`

## Step 5 — Investor ka login (jab zaroorat ho)
1. Owner dashboard → **Investors** page → "Add Investor" (naam, phone) →
   ek **Investor ID** milega (jaise `INV1234567890`)
2. "Link Property to Investor" se unki property(s) link karo
3. Authentication → Users → Add user (unka email/password)
4. Table Editor → `profiles` → Insert row:
   - `user_id` = unka UID
   - `role` = `investor`
   - `investor_id` = wahi Investor ID jo Step 1 mein mila
   - `display_name` = unka naam

## Naya kya hai — quick summary
- **Manage Rooms**: ab Property Name, Unit Type, Unit No, Floor, Nickname, Mode (On/Off) sab
- **Manage Bookings**: ID Proof Type + Photo upload, Booking Mode (Online-Airbnb/Offline),
  Online ke liye Gross Amount + Airbnb Commission (Net auto-calculate), Payment History
  (har payment apne timestamp ke saath — "➕ Payment" button se add karo)
- **Reports** (naya sidebar item): Revenue by month graph, Online vs Offline pie,
  Occupancy pie, Attendance % bar chart
- **Manage Store** (Owner only): Items master + Stock In/Out log
- **Investors** (Owner only): Investor add + property link; unka apna simple
  read-only dashboard hota hai jisme sirf unki properties ki booking dikhti hai
- Sabka login pe naam + role top pe dikhta hai ab

## ID Proof Photo — kaise kaam karta hai
- Photo Supabase Storage ke **private bucket** (`id-proofs`) mein save hoti hai
- Sirf Owner dekh sakta hai (secure signed link, 5 minute ke liye valid)
- Agar Viewer ko bhi photo dikhani ho, bata dena — ek chhoti si policy add kar denge

## Agla step (jab chaho)
- Guest/Investor ke liye WhatsApp-friendly printable slip
- Bulk data import (Excel se seedha upload)
- Automatic monthly salary generation
