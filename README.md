# Airbnb Manager — Web App Starter

Ye ek starter hai jo Excel workbook wali structure ko real website + database
mein badalta hai. Owner ko full access, employee ko sirf apna data.

## Kya use ho raha hai
- **Database**: Supabase (free) — asli Postgres database + login system
- **Website**: plain HTML/JS — GitHub Pages pe directly chalega, koi build step nahi
- **Security**: Row Level Security (RLS) — database khud check karta hai kaun kya dekh sakta hai

---

## Step 1 — Supabase project banao
1. https://supabase.com pe jao, free account banao
2. "New Project" — naam do, database password set karo (yaad rakhna)
3. Project ready hone ke baad: left sidebar → **SQL Editor** → **New query**
4. Is folder ki `schema.sql` file ka poora content paste karo → **Run**
   (Ye sab tables + security rules bana dega)

## Step 2 — API keys lo
1. Left sidebar → **Project Settings → API**
2. `Project URL` aur `anon public` key copy karo
3. Is folder ki `config.js` file kholo, dono values yahan paste karo

## Step 3 — Apna login banao (owner)
1. Supabase → **Authentication → Users → Add user** — apna email/password daalo
2. Us user ka **User UID** copy karo
3. Supabase → **Table Editor → profiles → Insert row**:
   - `user_id` = wahi UID jo copy kiya
   - `role` = `owner`
   - `emp_id` = khali chhod do

## Step 4 — Employee logins banao (jitni zaroorat ho)
1. Har employee ke liye Authentication → Users → Add user (unka email/password)
2. `profiles` table mein row add karo: `role` = `employee`, `emp_id` = unka Emp ID
   (jo `employees` table mein already hai)

## Step 5 — Data daalo
Filhaal Table Editor (Supabase ke andar hi) se seedha data add karo:
`rooms`, `employees`, `flats_status`, `salary_tracker`, `advance_tracker`,
`guest_register`, `attendance_log`, `employee_tasks` — sab tables Excel ke
sheets jaisi hi hain.

## Step 6 — GitHub Pages pe daalo
```bash
# naya repo banao (photography site se ALAG rakho)
cd ~/Developer/GITHUB
mkdir airbnb-manager && cd airbnb-manager
git init
# is poore folder (schema.sql, config.js, index.html, app.js, style.css) ko yahan copy karo
git add .
git commit -m "Airbnb manager starter"
git branch -M main
git remote add origin https://github.com/<username>/airbnb-manager.git
git push -u origin main
```
Phir GitHub repo → **Settings → Pages** → Source: `main` branch → Save.
Kuch minute mein live ho jayega: `https://<username>.github.io/airbnb-manager/`

Custom domain baad mein chahiye to: Settings → Pages → Custom domain mein
apna domain daalo (waise hi jaise `pawanstudioshop.github.io` ke CNAME mein hai).

---

## Abhi ke liye limitations (agla step)
- Data add/edit abhi Supabase Table Editor se hota hai (seedhe website se nahi) —
  agla step mein add/edit forms website pe bhi bana sakte hain
- Attendance/Task Google Form se auto-fill karna — agla step
- Design/branding (logo, colors) — abhi placeholder hai, customize kar sakte ho

Koi bhi cheez extend karni ho, bata dena — is starter ko step-by-step aage
badhate rahenge.
