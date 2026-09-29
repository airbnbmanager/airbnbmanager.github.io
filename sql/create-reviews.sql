-- ═══════════════════════════════════════════════════════════════════
--  UNIQUE HAVEN HOMES — Reviews Table (Fetched from Airbnb)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.property_reviews (
  id              SERIAL PRIMARY KEY,
  room_id         TEXT NOT NULL,          -- e.g. 'GOM-201'
  slug            TEXT NOT NULL,          -- e.g. 'the-dark-blue'
  property_name   TEXT NOT NULL,
  airbnb_id       TEXT NOT NULL,          -- Airbnb listing ID
  reviewer_name   TEXT NOT NULL,
  reviewer_avatar TEXT,                   -- First letter(s) as fallback
  reviewer_from   TEXT,                   -- City/Country
  rating          INTEGER NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  review_text     TEXT NOT NULL,
  review_date     DATE,
  review_date_str TEXT,                   -- "September 2026"
  is_featured     BOOLEAN DEFAULT false,  -- Show on homepage
  fetched_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_reviews_room_id    ON public.property_reviews (room_id);
CREATE INDEX IF NOT EXISTS idx_reviews_featured   ON public.property_reviews (is_featured);
CREATE INDEX IF NOT EXISTS idx_reviews_slug       ON public.property_reviews (slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique 
  ON public.property_reviews (airbnb_id, reviewer_name, review_date_str);

-- RLS: anyone can read reviews
ALTER TABLE public.property_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read reviews" ON public.property_reviews;
CREATE POLICY "Public can read reviews"
  ON public.property_reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth can manage reviews" ON public.property_reviews;
CREATE POLICY "Auth can manage reviews"
  ON public.property_reviews FOR ALL USING (auth.role() = 'authenticated');

SELECT 'Reviews table ready!' AS status;
