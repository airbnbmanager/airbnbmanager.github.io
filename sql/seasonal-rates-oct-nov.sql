-- ═══════════════════════════════════════════════════════════════════
--  UNIQUE HAVEN HOMES — Seasonal Pricing Sync (Oct +10% / Nov +15%)
--  Run in Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
--  Both Website and CRM sync immediately with these queries!
-- ═══════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────
-- OPTION A: APPLY OCTOBER +10% SURGE (FESTIVE / DUSSEHRA SEASON)
-- Increases all property base prices by 10% (rounded to nearest 50)
-- ─────────────────────────────────────────────────────────────────

-- 1. Update primary CRM source: public.rooms
UPDATE public.rooms
SET rent_per_night = CASE room_id
  WHEN 'GOM-101' THEN 4950  -- RedRose Palace (base 4500 + 10%)
  WHEN 'GOM-102' THEN 4950  -- Black Beauty (base 4500 + 10%)
  WHEN 'GOM-201' THEN 4950  -- The Dark Blue (base 4500 + 10%)
  WHEN 'GOM-202' THEN 4950  -- The Brown (base 4500 + 10%)
  WHEN 'GOM-301' THEN 4950  -- The Light Green (base 4500 + 10%)
  WHEN 'GOM-302' THEN 6050  -- The Unique (base 5500 + 10%)
  WHEN 'GOM-401' THEN 4950  -- The Nawabi Stay (base 4500 + 10%)
  WHEN 'GOM-501' THEN 6600  -- Starlight Blue Penthouse (base 6000 + 10%)
  WHEN 'VIL-101' THEN 8800  -- Gomti Grand Villa (base 8000 + 10%)
  WHEN 'VIL-102' THEN 13200 -- Royal White House (base 12000 + 10%)
  WHEN 'VIL-103' THEN 9900  -- The Pink House (base 9000 + 10%)
  WHEN 'VIL-104' THEN 6050  -- The Green House (base 5500 + 10%)
  WHEN 'VIL-105' THEN 6050  -- The Yellow House (base 5500 + 10%)
  WHEN 'VIL-106' THEN 4950  -- Green Forest (base 4500 + 10%)
  WHEN 'VIL-107' THEN 4950  -- The Velvet House (base 4500 + 10%)
  WHEN 'VIL-108' THEN 4950  -- Pink Paradise (base 4500 + 10%)
  WHEN 'LUL-402' THEN 11000 -- Celebrity Garden (base 10000 + 10%)
  ELSE ROUND((COALESCE(rent_per_night, 4500) * 1.10) / 50) * 50
END
WHERE room_id IN (
  'GOM-101','GOM-102','GOM-201','GOM-202','GOM-301','GOM-302','GOM-401','GOM-501',
  'VIL-101','VIL-102','VIL-103','VIL-104','VIL-105','VIL-106','VIL-107','VIL-108','LUL-402'
);

-- 2. Update website sync table: public.property_rates
UPDATE public.property_rates
SET
  base_price = CASE room_id
    WHEN 'GOM-101' THEN 4950
    WHEN 'GOM-102' THEN 4950
    WHEN 'GOM-201' THEN 4950
    WHEN 'GOM-202' THEN 4950
    WHEN 'GOM-301' THEN 4950
    WHEN 'GOM-302' THEN 6050
    WHEN 'GOM-401' THEN 4950
    WHEN 'GOM-501' THEN 6600
    WHEN 'VIL-101' THEN 8800
    WHEN 'VIL-102' THEN 13200
    WHEN 'VIL-103' THEN 9900
    WHEN 'VIL-104' THEN 6050
    WHEN 'VIL-105' THEN 6050
    WHEN 'VIL-106' THEN 4950
    WHEN 'VIL-107' THEN 4950
    WHEN 'VIL-108' THEN 4950
    WHEN 'LUL-402' THEN 11000
    ELSE ROUND((COALESCE(base_price, 4500) * 1.10) / 50) * 50
  END,
  airbnb_price = CASE room_id
    WHEN 'GOM-101' THEN 6049
    WHEN 'GOM-102' THEN 6049
    WHEN 'GOM-201' THEN 6049
    WHEN 'GOM-202' THEN 6049
    WHEN 'GOM-301' THEN 6049
    WHEN 'GOM-302' THEN 7399
    WHEN 'GOM-401' THEN 6049
    WHEN 'GOM-501' THEN 8099
    WHEN 'VIL-101' THEN 10799
    WHEN 'VIL-102' THEN 16199
    WHEN 'VIL-103' THEN 12099
    WHEN 'VIL-104' THEN 7399
    WHEN 'VIL-105' THEN 7399
    WHEN 'VIL-106' THEN 6049
    WHEN 'VIL-107' THEN 6049
    WHEN 'VIL-108' THEN 6049
    WHEN 'LUL-402' THEN 13499
    ELSE ROUND((COALESCE(base_price, 4500) * 1.10 * 1.22) / 50) * 50
  END,
  updated_at = NOW(),
  notes = 'October Festive Surge (+10%) synced across Website and CRM';

-- ─────────────────────────────────────────────────────────────────
-- OPTION B: APPLY NOVEMBER +15% SURGE (PEAK WEDDING SEASON)
-- Run this in November or for November bookings
-- ─────────────────────────────────────────────────────────────────
/*
UPDATE public.rooms
SET rent_per_night = CASE room_id
  WHEN 'GOM-101' THEN 5200  -- RedRose Palace (base 4500 + 15%)
  WHEN 'GOM-102' THEN 5200  -- Black Beauty (base 4500 + 15%)
  WHEN 'GOM-201' THEN 5200  -- The Dark Blue (base 4500 + 15%)
  WHEN 'GOM-202' THEN 5200  -- The Brown (base 4500 + 15%)
  WHEN 'GOM-301' THEN 5200  -- The Light Green (base 4500 + 15%)
  WHEN 'GOM-302' THEN 6350  -- The Unique (base 5500 + 15%)
  WHEN 'GOM-401' THEN 5200  -- The Nawabi Stay (base 4500 + 15%)
  WHEN 'GOM-501' THEN 6900  -- Starlight Blue Penthouse (base 6000 + 15%)
  WHEN 'VIL-101' THEN 9200  -- Gomti Grand Villa (base 8000 + 15%)
  WHEN 'VIL-102' THEN 13800 -- Royal White House (base 12000 + 15%)
  WHEN 'VIL-103' THEN 10350 -- The Pink House (base 9000 + 15%)
  WHEN 'VIL-104' THEN 6350  -- The Green House (base 5500 + 15%)
  WHEN 'VIL-105' THEN 6350  -- The Yellow House (base 5500 + 15%)
  WHEN 'VIL-106' THEN 5200  -- Green Forest (base 4500 + 15%)
  WHEN 'VIL-107' THEN 5200  -- The Velvet House (base 4500 + 15%)
  WHEN 'VIL-108' THEN 5200  -- Pink Paradise (base 4500 + 15%)
  WHEN 'LUL-402' THEN 11500 -- Celebrity Garden (base 10000 + 15%)
  ELSE ROUND((COALESCE(rent_per_night, 4500) * 1.15) / 50) * 50
END
WHERE room_id IN (
  'GOM-101','GOM-102','GOM-201','GOM-202','GOM-301','GOM-302','GOM-401','GOM-501',
  'VIL-101','VIL-102','VIL-103','VIL-104','VIL-105','VIL-106','VIL-107','VIL-108','LUL-402'
);

UPDATE public.property_rates
SET
  base_price = CASE room_id
    WHEN 'GOM-101' THEN 5200
    WHEN 'GOM-102' THEN 5200
    WHEN 'GOM-201' THEN 5200
    WHEN 'GOM-202' THEN 5200
    WHEN 'GOM-301' THEN 5200
    WHEN 'GOM-302' THEN 6350
    WHEN 'GOM-401' THEN 5200
    WHEN 'GOM-501' THEN 6900
    WHEN 'VIL-101' THEN 9200
    WHEN 'VIL-102' THEN 13800
    WHEN 'VIL-103' THEN 10350
    WHEN 'VIL-104' THEN 6350
    WHEN 'VIL-105' THEN 6350
    WHEN 'VIL-106' THEN 5200
    WHEN 'VIL-107' THEN 5200
    WHEN 'VIL-108' THEN 5200
    WHEN 'LUL-402' THEN 11500
    ELSE ROUND((COALESCE(base_price, 4500) * 1.15) / 50) * 50
  END,
  airbnb_price = CASE room_id
    WHEN 'GOM-101' THEN 6349
    WHEN 'GOM-102' THEN 6349
    WHEN 'GOM-201' THEN 6349
    WHEN 'GOM-202' THEN 6349
    WHEN 'GOM-301' THEN 6349
    WHEN 'GOM-302' THEN 7749
    WHEN 'GOM-401' THEN 6349
    WHEN 'GOM-501' THEN 8449
    WHEN 'VIL-101' THEN 11249
    WHEN 'VIL-102' THEN 16899
    WHEN 'VIL-103' THEN 12649
    WHEN 'VIL-104' THEN 7749
    WHEN 'VIL-105' THEN 7749
    WHEN 'VIL-106' THEN 6349
    WHEN 'VIL-107' THEN 6349
    WHEN 'VIL-108' THEN 6349
    WHEN 'LUL-402' THEN 14049
    ELSE ROUND((COALESCE(base_price, 4500) * 1.15 * 1.22) / 50) * 50
  END,
  updated_at = NOW(),
  notes = 'November Wedding Surge (+15%) synced across Website and CRM';
*/

-- ─────────────────────────────────────────────────────────────────
-- OPTION C: RESET TO STANDARD BASELINE RATES
-- ─────────────────────────────────────────────────────────────────
/*
UPDATE public.rooms
SET rent_per_night = CASE room_id
  WHEN 'GOM-101' THEN 4500
  WHEN 'GOM-102' THEN 4500
  WHEN 'GOM-201' THEN 4500
  WHEN 'GOM-202' THEN 4500
  WHEN 'GOM-301' THEN 4500
  WHEN 'GOM-302' THEN 5500
  WHEN 'GOM-401' THEN 4500
  WHEN 'GOM-501' THEN 6000
  WHEN 'VIL-101' THEN 8000
  WHEN 'VIL-102' THEN 12000
  WHEN 'VIL-103' THEN 9000
  WHEN 'VIL-104' THEN 5500
  WHEN 'VIL-105' THEN 5500
  WHEN 'VIL-106' THEN 4500
  WHEN 'VIL-107' THEN 4500
  WHEN 'VIL-108' THEN 4500
  WHEN 'LUL-402' THEN 10000
END
WHERE room_id IN (
  'GOM-101','GOM-102','GOM-201','GOM-202','GOM-301','GOM-302','GOM-401','GOM-501',
  'VIL-101','VIL-102','VIL-103','VIL-104','VIL-105','VIL-106','VIL-107','VIL-108','LUL-402'
);

UPDATE public.property_rates
SET
  base_price = CASE room_id
    WHEN 'GOM-101' THEN 4500
    WHEN 'GOM-102' THEN 4500
    WHEN 'GOM-201' THEN 4500
    WHEN 'GOM-202' THEN 4500
    WHEN 'GOM-301' THEN 4500
    WHEN 'GOM-302' THEN 5500
    WHEN 'GOM-401' THEN 4500
    WHEN 'GOM-501' THEN 6000
    WHEN 'VIL-101' THEN 8000
    WHEN 'VIL-102' THEN 12000
    WHEN 'VIL-103' THEN 9000
    WHEN 'VIL-104' THEN 5500
    WHEN 'VIL-105' THEN 5500
    WHEN 'VIL-106' THEN 4500
    WHEN 'VIL-107' THEN 4500
    WHEN 'VIL-108' THEN 4500
    WHEN 'LUL-402' THEN 10000
  END,
  airbnb_price = CASE room_id
    WHEN 'GOM-101' THEN 5499
    WHEN 'GOM-102' THEN 5499
    WHEN 'GOM-201' THEN 5499
    WHEN 'GOM-202' THEN 5499
    WHEN 'GOM-301' THEN 5499
    WHEN 'GOM-302' THEN 6499
    WHEN 'GOM-401' THEN 5499
    WHEN 'GOM-501' THEN 7499
    WHEN 'VIL-101' THEN 9499
    WHEN 'VIL-102' THEN 14999
    WHEN 'VIL-103' THEN 10499
    WHEN 'VIL-104' THEN 6499
    WHEN 'VIL-105' THEN 6499
    WHEN 'VIL-106' THEN 5499
    WHEN 'VIL-107' THEN 5499
    WHEN 'VIL-108' THEN 5499
    WHEN 'LUL-402' THEN 11999
  END,
  updated_at = NOW(),
  notes = 'Baseline standard rates restored';
*/

-- ─────────────────────────────────────────────────────────────────
-- VERIFY SYNCED RATES
-- ─────────────────────────────────────────────────────────────────
SELECT
  r.room_id,
  r.property_name,
  r.rent_per_night AS crm_rooms_rent,
  pr.base_price AS website_base_price,
  pr.airbnb_price AS airbnb_comparison,
  pr.updated_at
FROM public.rooms r
LEFT JOIN public.property_rates pr ON r.room_id = pr.room_id
WHERE r.room_id IN (
  'GOM-101','GOM-102','GOM-201','GOM-202','GOM-301','GOM-302','GOM-401','GOM-501',
  'VIL-101','VIL-102','VIL-103','VIL-104','VIL-105','VIL-106','VIL-107','VIL-108','LUL-402'
)
ORDER BY r.room_id;
