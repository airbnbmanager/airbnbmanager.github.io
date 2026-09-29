-- ═══════════════════════════════════════════════════════════════════
--  UNIQUE HAVEN HOMES — Property Rates Table
--  Run this in Supabase → SQL Editor
--  This table powers the real-time price sync on the website.
-- ═══════════════════════════════════════════════════════════════════

-- 1. Create the table
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

-- 2. Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_property_rates_updated_at ON public.property_rates;
CREATE TRIGGER trg_property_rates_updated_at
  BEFORE UPDATE ON public.property_rates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3. Enable Row Level Security
ALTER TABLE public.property_rates ENABLE ROW LEVEL SECURITY;

-- 4. Policy: anyone (anon) can READ rates (needed for public website)
DROP POLICY IF EXISTS "Public can read property_rates" ON public.property_rates;
CREATE POLICY "Public can read property_rates"
  ON public.property_rates FOR SELECT
  USING (true);

-- 5. Policy: only authenticated users can UPDATE/INSERT rates (CRM admin)
DROP POLICY IF EXISTS "Auth users can update property_rates" ON public.property_rates;
CREATE POLICY "Auth users can update property_rates"
  ON public.property_rates FOR ALL
  USING (auth.role() = 'authenticated');

-- 6. Seed all 17 properties with current prices
INSERT INTO public.property_rates (room_id, slug, property_name, base_price, airbnb_price, max_guests) VALUES
  ('GOM-101', 'redrose-palace',          'RedRose Palace',            4500, 5499, 6),
  ('GOM-102', 'black-beauty',            'Black Beauty',              4500, 5499, 6),
  ('GOM-201', 'the-dark-blue',           'The Dark Blue',             4500, 5499, 6),
  ('GOM-202', 'the-brown',               'The Brown',                 4500, 5499, 6),
  ('GOM-301', 'the-light-green',         'The Light Green',           4500, 5499, 6),
  ('GOM-401', 'the-nawabi-stay',         'The Nawabi Stay',           4500, 5499, 6),
  ('GOM-501', 'starlight-blue-penthouse','Starlight Blue Penthouse',  6000, 7499, 6),
  ('GOM-302', 'the-unique',              'The Unique',                5500, 6499, 6),
  ('VIL-104', 'the-green-house',         'The Green House',           5500, 6499, 6),
  ('VIL-103', 'the-pink-house',          'The Pink House',            9000,10499,10),
  ('VIL-105', 'the-yellow-house',        'The Yellow House',          5500, 6499, 6),
  ('VIL-106', 'green-forest',            'Green Forest',              4500, 5499, 6),
  ('VIL-108', 'pink-paradise',           'Pink Paradise',             4500, 5499, 6),
  ('LUL-402', 'celebrity-garden',        'Celebrity Garden',         10000,11999,10),
  ('VIL-101', 'gomti-grand-villa',       'Gomti Grand Villa',         8000, 9499, 6),
  ('VIL-102', 'royal-white-house',       'Royal White House',        12000,14999,12),
  ('VIL-107', 'the-velvet-house',        'The Velvet House',          4500, 5499, 6)
ON CONFLICT (room_id) DO UPDATE SET
  base_price   = EXCLUDED.base_price,
  airbnb_price = EXCLUDED.airbnb_price,
  max_guests   = EXCLUDED.max_guests,
  updated_at   = NOW();

-- Done!
SELECT room_id, property_name, base_price, airbnb_price, max_guests FROM public.property_rates ORDER BY room_id;
