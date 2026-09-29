-- ═══════════════════════════════════════════════════════════════════
--  UNIQUE HAVEN HOMES — Leads Table (Voice AI Captured)
--  Run in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════

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

-- Auto-timestamp
DROP TRIGGER IF EXISTS trg_leads_updated_at ON public.leads;
CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Anyone (widget on public site) can INSERT a lead
DROP POLICY IF EXISTS "Public can insert leads" ON public.leads;
CREATE POLICY "Public can insert leads"
  ON public.leads FOR INSERT WITH CHECK (true);

-- Only authenticated admins can read/update
DROP POLICY IF EXISTS "Auth users can manage leads" ON public.leads;
CREATE POLICY "Auth users can manage leads"
  ON public.leads FOR ALL USING (auth.role() = 'authenticated');

SELECT 'Leads table created!' AS status;
