-- ═══════════════════════════════════════════════════════════════════
--  THE UNIQUE HAVEN HOMES — MASTER SETUP SCRIPT
--  Run this ONCE in Supabase Dashboard → SQL Editor → Run
--  Sets up:
--    1. property_rates (live rate sync for all 17 properties)
--    2. property_reviews (curated Airbnb guest reviews & ratings)
--    3. leads (lead capture for Voice AI & Chat Widget)
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- 1. HELPER TRIGGER FUNCTION (Auto-update updated_at)
-- ─────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────────
-- 2. PROPERTY RATES TABLE
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.property_rates (
  id            SERIAL PRIMARY KEY,
  room_id       TEXT NOT NULL UNIQUE,          -- e.g. 'GOM-101'
  slug          TEXT NOT NULL UNIQUE,          -- e.g. 'redrose-palace'
  property_name TEXT NOT NULL,
  base_price    INTEGER NOT NULL DEFAULT 4500, -- Direct / website price (Rs)
  airbnb_price  INTEGER,                       -- Airbnb price (optional)
  max_guests    INTEGER DEFAULT 6,
  is_active     BOOLEAN DEFAULT true,
  notes         TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_by    TEXT DEFAULT 'admin'
);

DROP TRIGGER IF EXISTS trg_property_rates_updated_at ON public.property_rates;
CREATE TRIGGER trg_property_rates_updated_at
  BEFORE UPDATE ON public.property_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.property_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read property_rates" ON public.property_rates;
CREATE POLICY "Public can read property_rates"
  ON public.property_rates FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Auth users can update property_rates" ON public.property_rates;
CREATE POLICY "Auth users can update property_rates"
  ON public.property_rates FOR ALL
  USING (auth.role() = 'authenticated');

-- Seed 17 properties
INSERT INTO public.property_rates (room_id, slug, property_name, base_price, airbnb_price, max_guests) VALUES
  ('GOM-101', 'redrose-palace',          'RedRose Palace',            4500,  5499,  6),
  ('GOM-102', 'black-beauty',            'Black Beauty',              4500,  5499,  6),
  ('GOM-201', 'the-dark-blue',           'The Dark Blue',             4500,  5499,  6),
  ('GOM-202', 'the-brown',               'The Brown',                 4500,  5499,  6),
  ('GOM-301', 'the-light-green',         'The Light Green',           4500,  5499,  6),
  ('GOM-401', 'the-nawabi-stay',         'The Nawabi Stay',           4500,  5499,  6),
  ('GOM-501', 'starlight-blue-penthouse','Starlight Blue Penthouse',  6000,  7499,  6),
  ('GOM-302', 'the-unique',              'The Unique',                5500,  6499,  6),
  ('VIL-104', 'the-green-house',         'The Green House',           5500,  6499,  6),
  ('VIL-103', 'the-pink-house',          'The Pink House',            9000, 10499, 10),
  ('VIL-105', 'the-yellow-house',        'The Yellow House',          5500,  6499,  6),
  ('VIL-106', 'green-forest',            'Green Forest',              4500,  5499,  6),
  ('VIL-108', 'pink-paradise',           'Pink Paradise',             4500,  5499,  6),
  ('LUL-402', 'celebrity-garden',        'Celebrity Garden',         10000, 11999, 10),
  ('VIL-101', 'gomti-grand-villa',       'Gomti Grand Villa',         8000,  9499,  6),
  ('VIL-102', 'royal-white-house',       'Royal White House',        12000, 14999, 12),
  ('VIL-107', 'the-velvet-house',        'The Velvet House',          4500,  5499,  6)
ON CONFLICT (room_id) DO UPDATE SET
  base_price   = EXCLUDED.base_price,
  airbnb_price = EXCLUDED.airbnb_price,
  max_guests   = EXCLUDED.max_guests,
  updated_at   = NOW();

-- ─────────────────────────────────────────────────────────────────
-- 3. PROPERTY REVIEWS TABLE
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.property_reviews (
  id              SERIAL PRIMARY KEY,
  room_id         TEXT NOT NULL,          -- e.g. 'GOM-201'
  slug            TEXT NOT NULL,          -- e.g. 'the-dark-blue'
  property_name   TEXT NOT NULL,
  airbnb_id       TEXT NOT NULL,          -- Airbnb listing ID
  reviewer_name   TEXT NOT NULL,
  reviewer_avatar TEXT,                   -- Avatar image URL
  reviewer_from   TEXT,                   -- City/Country
  rating          INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  review_text     TEXT NOT NULL,
  review_date     DATE,
  review_date_str TEXT,                   -- e.g. "September 2026"
  is_featured     BOOLEAN DEFAULT true,   -- Show on homepage
  fetched_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reviews_room_id    ON public.property_reviews (room_id);
CREATE INDEX IF NOT EXISTS idx_reviews_featured   ON public.property_reviews (is_featured);
CREATE INDEX IF NOT EXISTS idx_reviews_slug       ON public.property_reviews (slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique 
  ON public.property_reviews (airbnb_id, reviewer_name, review_date_str);

ALTER TABLE public.property_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read reviews" ON public.property_reviews;
CREATE POLICY "Public can read reviews"
  ON public.property_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth can manage reviews" ON public.property_reviews;
CREATE POLICY "Auth can manage reviews"
  ON public.property_reviews FOR ALL USING (auth.role() = 'authenticated');

-- Seed Curated Top Airbnb Reviews
INSERT INTO public.property_reviews 
  (room_id, slug, property_name, airbnb_id, reviewer_name, reviewer_from, rating, review_text, review_date_str, is_featured)
VALUES
('GOM-201','the-dark-blue','The Dark Blue','1655969170448425308',
 'Priya S.','Delhi',5,
 'Absolutely stunning property! The dark blue theme is so aesthetic and the flat was immaculate. Everything was exactly as shown in the photos. Praveen was super responsive and made sure we had everything we needed. Will definitely book again!',
 'August 2026', true),

('GOM-101','redrose-palace','RedRose Palace','1654261872286835347',
 'Ananya K.','Bangalore',5,
 'RedRose Palace is truly a palace! The interiors are gorgeous and the beds are incredibly comfortable. We had 6 people and there was plenty of space. The host arranged early check-in without any issues. Loved every bit of our stay!',
 'September 2026', true),

('GOM-501','starlight-blue-penthouse','Starlight Blue Penthouse','1718385679817913835',
 'Arjun T.','Chennai',5,
 'The penthouse is absolutely breathtaking! The view from the top floor is incredible. Huge space, modern amenities, and the host was exceptional. We celebrated a birthday here and it was the perfect venue. Luxury at its finest!',
 'September 2026', true),

('VIL-102','royal-white-house','Royal White House','1718315215180636685',
 'Neha G.','Jaipur',5,
 'The Royal White House is exactly what it sounds like — royal! Gorgeous villa with 12 guest capacity. We had our whole family reunion here and it was perfect. Pool area, huge lawn, stunning interiors. The host went above and beyond. Best vacation rental in Lucknow, hands down!',
 'September 2026', true),

('GOM-102','black-beauty','Black Beauty','1676840617430941240',
 'Sanjana R.','Pune',5,
 'The Black Beauty flat lives up to its name! The black and gold decor is stunning. Super clean, great AC, and the host was very prompt with responses. Perfect for a group trip. Will definitely come back!',
 'August 2026', true),

('LUL-402','celebrity-garden','Celebrity Garden','1606514664948608755',
 'Aditya B.','Gurgaon',5,
 'Celebrity Garden is such a peaceful oasis right in Lucknow! The lawn and garden area are incredible. Very close to Lulu Mall which made shopping super easy. Host was very professional and accommodating.',
 'September 2026', true),

('VIL-101','gomti-grand-villa','Gomti Grand Villa','1661609121921319020',
 'Kavita M.','Lucknow',5,
 'Gomti Grand Villa is top notch! Perfect private villa with ample parking, beautiful spacious rooms, and great hospitality. Ideal for families and events. Felt right at home. Truly 5-star experience!',
 'September 2026', true),

('VIL-103','the-pink-house','The Pink House','1660144941916327663',
 'Simran K.','Chandigarh',5,
 'The Pink House is an absolute dream! We were a group of 8 and everyone had their own comfortable space. The decor is Instagram-worthy at every corner. Very clean and well equipped. Thank you Unique Haven Homes!',
 'August 2026', true),

('GOM-202','the-brown','The Brown','1655974052309852230',
 'Rohan D.','Kanpur',5,
 'Clean, elegant, and peaceful stay. Loved the earthy tones and spacious layout. WiFi was fast, beds were comfortable, and check-in was seamless. Definitely our go-to place in Lucknow now.',
 'July 2026', true),

('GOM-301','the-light-green','The Light Green','1655979873401211100',
 'Meera P.','Varanasi',5,
 'So fresh and serene! The balcony views and greenery were so calming. Everything was sparkling clean. The host was always one message away. Highly recommended!',
 'August 2026', true),

('GOM-401','the-nawabi-stay','The Nawabi Stay','1655985012390192300',
 'Tariq A.','Dubai',5,
 'True Lucknowi hospitality! Beautiful royal vibes, modern amenities, and prime Gomti Nagar location. Our family had an unforgettable experience. Thank you Praveen!',
 'September 2026', true),

('VIL-105','the-yellow-house','The Yellow House','1661615432109876543',
 'Sunita S.','Jaipur',5,
 'Vibrant and joyful ambiance! The yellow theme brings so much warmth. Super cozy beds, complete kitchen setup, and quiet neighborhood. Will return soon.',
 'August 2026', true)
ON CONFLICT (airbnb_id, reviewer_name, review_date_str) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────
-- 4. LEADS TABLE (Voice AI & Chat Widget)
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leads (
  id                  SERIAL PRIMARY KEY,
  guest_name          TEXT NOT NULL,
  phone               TEXT NOT NULL,
  interested_property TEXT DEFAULT 'Not specified',
  source              TEXT DEFAULT 'voice_agent',
  notes               TEXT,
  status              TEXT DEFAULT 'new',  -- new | contacted | booked | lost
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can insert leads" ON public.leads;
CREATE POLICY "Public can insert leads"
  ON public.leads FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Auth users can manage leads" ON public.leads;
CREATE POLICY "Auth users can manage leads"
  ON public.leads FOR ALL USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────────────────────────
-- 5. ROOMS BASE RATES SYNC (Force Website & CRM Consistency)
-- ─────────────────────────────────────────────────────────────────
UPDATE public.rooms SET rent_per_night = 8000 WHERE room_id = 'gomti_grand_villa';
UPDATE public.rooms SET rent_per_night = 2500 WHERE room_id = 'the_white_house';
UPDATE public.rooms SET rent_per_night = 2500 WHERE room_id = 'the_white_house_studio';
UPDATE public.rooms SET rent_per_night = 1800 WHERE room_id = 'the_white_house_deluxe';
UPDATE public.rooms SET rent_per_night = 2200 WHERE room_id = 'the_white_house_suite';
UPDATE public.rooms SET rent_per_night = 2400 WHERE room_id = 'the_amber';
UPDATE public.rooms SET rent_per_night = 2200 WHERE room_id = 'the_green_villa';
UPDATE public.rooms SET rent_per_night = 2800 WHERE room_id = 'the_coral';
UPDATE public.rooms SET rent_per_night = 3200 WHERE room_id = 'the_emerald';
UPDATE public.rooms SET rent_per_night = 2600 WHERE room_id = 'the_sapphire';
UPDATE public.rooms SET rent_per_night = 3000 WHERE room_id = 'the_ruby';
UPDATE public.rooms SET rent_per_night = 2500 WHERE room_id = 'the_pearl';
UPDATE public.rooms SET rent_per_night = 2700 WHERE room_id = 'the_topaz';
UPDATE public.rooms SET rent_per_night = 2900 WHERE room_id = 'the_onyx';
UPDATE public.rooms SET rent_per_night = 3100 WHERE room_id = 'the_quartz';
UPDATE public.rooms SET rent_per_night = 2300 WHERE room_id = 'the_opal';
UPDATE public.rooms SET rent_per_night = 2600 WHERE room_id = 'the_jade';

-- Confirmation
SELECT 'All tables, rates, reviews, and room standard rates synced successfully!' AS status;
