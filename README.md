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

## Kya Automatic hai, kya Manual (important — samajh lo)

**✅ Automatic calculate hota hai (kuch karna nahi padta):**
- Booking Balance Due (Total − sab payments ka sum, real-time)
- Nights & Suggested Amount (check-in/check-out se)
- Online booking Net Amount (Gross − Airbnb Commission)
- Salary Pending, Advance Balance
- Attendance %
- Store ka current stock (In − Out)
- Dashboard ke sab numbers, Reports/Graphs
- Sub-Owner ka earning (unki property ki booking se)

**⚠️ Manually enter karna padta hai (software record rakhta hai, khud data nahi banata):**
- Naya booking (form bharna, per booking ek baar)
- Payment aayi to "➕ Payment" button dabana
- Roz ki Attendance mark karna
- Stock In/Out jab bhi ho, log karna
- Flat Clean/Dirty status update karna
- Har mahine Salary Record add karna (amount auto-suggest hota hai, entry khud karni hai)

**Matlab:** Ek baar raw entry daal do (booking, payment, attendance) — uske baad saare totals/balances/percentages khud calculate ho jaate hain, kabhi manually jodna-ghatana nahi padta.

## Apne Data ka Local Backup Kaise Lo

⚠️ **Zaroori:** Backup mein guest phone number, ID proof number, employee salary jaisa sensitive data hota hai.
Ise apne **public GitHub Pages repo** (`airbnbmanager.github.io`) mein kabhi mat daalna — wahan koi bhi dekh sakta hai.
Backup hamesha ek **alag, private jagah** (jaise `~/Backups/airbnb-db/` folder, sirf apne Mac pe) rakho.

**Tareeka (Supabase CLI se, terminal mein):**
```bash
# ek baar setup (sirf pehli baar karna hai)
npx supabase login
npx supabase link --project-ref vxxmigdzimnrbbmkjzoa

# jab bhi backup lena ho (ye command chalao):
mkdir -p ~/Backups/airbnb-db
npx supabase db dump --data-only -f ~/Backups/airbnb-db/backup_$(date +%Y-%m-%d).sql
```
Ye ek `.sql` file banayega jisme us din ka **poora data** hoga (sab tables). Isse weekly ya monthly chala lena — purane backups bhi rakh sakte ho, disk space kam hi lagta hai.

**Agar terminal use nahi karna ho (simple tareeka):**
Supabase → **Table Editor** → har table kholo → upar-right **Export → CSV** — per-table CSV download ho jayegi. Terminal wala tareeka better hai kyunki ek command mein sab table aa jaati hain.


- Guest/Investor ke liye WhatsApp-friendly printable slip
- Bulk data import (Excel se seedha upload)
- Automatic monthly salary generation
