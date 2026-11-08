-- ═══════════════════════════════════════════════════════════════════════════════
-- 🧠 THE UNIQUE HAVEN HOMES (TUHH) — KNOWLEDGE BASE & RAG SCHEMA
-- Run in Supabase SQL Editor to enable AI Knowledge Retrieval
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.knowledge_base (
  id          SERIAL PRIMARY KEY,
  category    TEXT NOT NULL,            -- 'property', 'wifi', 'directions', 'house_rules', 'pricing', 'general_faq'
  room_id     TEXT,                     -- e.g. 'GOM-101', 'VIL-104', or NULL for global
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,
  keywords    TEXT[],                   -- Array of search tokens for fast matching
  metadata    JSONB DEFAULT '{}'::jsonb,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for AI agent & chat widget)
DROP POLICY IF EXISTS "Public can read knowledge_base" ON public.knowledge_base;
CREATE POLICY "Public can read knowledge_base" ON public.knowledge_base FOR SELECT USING (true);

-- Allow authenticated / admin update access
DROP POLICY IF EXISTS "Admins can manage knowledge_base" ON public.knowledge_base;
CREATE POLICY "Admins can manage knowledge_base" ON public.knowledge_base FOR ALL USING (true);

-- Create fast search index
CREATE INDEX IF NOT EXISTS idx_kb_category ON public.knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_kb_room_id ON public.knowledge_base(room_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- SEED DATA: 19 PROPERTIES & MASTER POLICIES
-- ─────────────────────────────────────────────────────────────────────────────

INSERT INTO public.knowledge_base (category, room_id, title, content, keywords, metadata) VALUES
('property', 'GOM-101', 'RedRose Palace (3BHK Luxury Flat)',
 'RedRose Palace is a premier 3BHK luxury apartment in Vikalp Khand, Gomti Nagar / Chinhat. Amenities: 3 AC Bedrooms, elegant living area, modular kitchen with RO water and gas stove, 200 Mbps Wi-Fi, Smart TV, elevator, and free dedicated parking. Caretaker: Arman & Shuaib (+91 8467080284 / +91 8957725081). Map: https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA. Tariff: ₹5,200/night.',
 ARRAY['redrose', 'palace', 'gom-101', 'vikalp', 'chinhat', '3bhk'],
 '{"wifi_ssid":"UniqueHaven_RedRose","wifi_pass":"Airbnb.in1","caretaker":"Arman & Shuaib","phone":"8467080284","rent":5200}'::jsonb),

('property', 'GOM-102', 'Black Beauty (3BHK Luxury Flat)',
 'Black Beauty is a stylish black-themed 3BHK luxury stay in Vikalp Khand, Gomti Nagar / Chinhat. Includes 3 master AC bedrooms, mood lighting, modular kitchen, balcony, Wi-Fi 200 Mbps. Couple friendly and safe. Caretaker: Arman & Shuaib (+91 8467080284). Map: https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA. Tariff: ₹5,200/night.',
 ARRAY['black beauty', 'gom-102', 'vikalp', 'chinhat', '3bhk', 'luxury flat'],
 '{"wifi_ssid":"UniqueHaven_BlackBeauty","wifi_pass":"Airbnb.in1","caretaker":"Arman & Shuaib","phone":"8467080284","rent":5200}'::jsonb),

('property', 'GOM-201', 'The Dark Blue (3BHK Luxury Flat)',
 'The Dark Blue offers a calming oceanic blue aesthetic with 3 spacious AC bedrooms, living hall, modular kitchen with gas & fridge, and high-speed Wi-Fi. Located in Vikalp Khand, Gomti Nagar. Caretaker: Arman & Shuaib (+91 8467080284). Map: https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA. Tariff: ₹5,200/night.',
 ARRAY['dark blue', 'gom-201', 'vikalp', 'chinhat', '3bhk'],
 '{"wifi_ssid":"UniqueHaven_DarkBlue","wifi_pass":"Airbnb.in1","caretaker":"Arman & Shuaib","phone":"8467080284","rent":5200}'::jsonb),

('property', 'GOM-202', 'The Brown (3BHK Luxury Flat)',
 'The Brown features warm earth tones, wooden textures, 3 AC bedrooms, and a fully equipped kitchen. Located in Vikalp Khand, Gomti Nagar. Caretaker: Arman & Shuaib (+91 8467080284). Map: https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA. Tariff: ₹5,200/night.',
 ARRAY['the brown', 'brown', 'gom-202', 'vikalp', 'chinhat', '3bhk'],
 '{"wifi_ssid":"UniqueHaven_Brown","wifi_pass":"Airbnb.in1","caretaker":"Arman & Shuaib","phone":"8467080284","rent":5200}'::jsonb),

('property', 'GOM-301', 'The Light Green (3BHK Luxury Flat)',
 'The Light Green is a nature-inspired luxury 3BHK flat in Vikalp Khand, Gomti Nagar. Bright, airy, with fast Wi-Fi and modular kitchen. Caretaker: Arman & Shuaib (+91 8467080284). Map: https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA. Tariff: ₹5,200/night.',
 ARRAY['light green', 'green flat', 'gom-301', 'vikalp', 'chinhat', '3bhk'],
 '{"wifi_ssid":"UniqueHaven_LightGreen","wifi_pass":"Airbnb.in1","caretaker":"Arman & Shuaib","phone":"8467080284","rent":5200}'::jsonb),

('property', 'GOM-302', 'The Unique (3BHK Luxury Flat)',
 'The Unique is an ultra-modern 3BHK flat in Vikalp Khand, Gomti Nagar. Maximum 8 guests, 3 AC bedrooms, modular kitchen, 200 Mbps Wi-Fi, elevator access. Caretaker: Arman & Shuaib (+91 8467080284). Map: https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA. Tariff: ₹6,300/night.',
 ARRAY['the unique', 'unique flat', 'gom-302', 'vikalp', 'chinhat', '3bhk'],
 '{"wifi_ssid":"UniqueHaven_Unique","wifi_pass":"Airbnb.in1","caretaker":"Arman & Shuaib","phone":"8467080284","rent":6300}'::jsonb),

('property', 'GOM-401', 'The Nawabi Stay (3BHK Luxury Flat)',
 'The Nawabi Stay brings Awadhi hospitality with modern luxury. Located near Max Hospital in Gomti Nagar. 3 AC bedrooms, kitchen, high-speed Wi-Fi, lift. Caretaker: Arman & Shuaib (+91 8467080284). Map: https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA. Tariff: ₹5,200/night.',
 ARRAY['nawabi', 'nawabi stay', 'gom-401', 'max hospital', 'vikalp', '3bhk'],
 '{"wifi_ssid":"UniqueHaven_Nawabi","wifi_pass":"Airbnb.in1","caretaker":"Arman & Shuaib","phone":"8467080284","rent":5200}'::jsonb),

('property', 'GOM-501', 'Starlight Blue PentHouse (4BHK Penthouse)',
 'Starlight Blue PentHouse is a spectacular top-floor 4BHK penthouse with panoramic city views, terrace access, 4 AC bedrooms, accommodates up to 10 guests. Near Max Hospital, Gomti Nagar. Caretaker: Arman & Shuaib (+91 8467080284). Map: https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA. Tariff: ₹6,900/night.',
 ARRAY['starlight', 'penthouse', 'starlight blue', 'gom-501', '4bhk', 'terrace'],
 '{"wifi_ssid":"UniqueHaven_Starlight","wifi_pass":"Airbnb.in1","caretaker":"Arman & Shuaib","phone":"8467080284","rent":6900}'::jsonb),

('property', 'Flat 402', 'The Tehzeeb Nest (3BHK Blossom Skyline)',
 'The Tehzeeb Nest is located on the 4th Floor of Blossom Skyline in Vikalp Khand, Gomti Nagar. High-end interiors, 3 AC bedrooms, kitchen, lift, reserved parking. Accommodates up to 10 guests. Caretaker: Arman Commandar (+91 8467080284). Map: https://maps.app.goo.gl/HvqjAfKwSC3Q6CJQA. Tariff: ₹5,200/night.',
 ARRAY['tehzeeb', 'blossom skyline', 'flat 402', 'vikalp', 'gomtinagar', '3bhk'],
 '{"wifi_ssid":"UniqueHaven_Tehzeeb","wifi_pass":"Airbnb.in1","caretaker":"Arman Commandar","phone":"8467080284","rent":5200}'::jsonb),

('property', 'VIL-103', 'The Pink House (5BR Duplex Villa)',
 'The Pink House is a grand 5BR Duplex Villa spanning the 2nd & 3rd Floors at 3/64 Vishesh Khand 3, Gomti Nagar. Ideal for big families, weddings, and group stays (up to 10-14 guests). Fast Wi-Fi, private terrace, full modular kitchen. Caretaker: Aniket (+91 9214246820). Map: https://maps.app.goo.gl/pCGigAPQGHjcfadQ8. Tariff: ₹10,350/night.',
 ARRAY['pink house', 'vil-103', 'vishesh khand', 'duplex', '5br', 'villa', 'wedding'],
 '{"wifi_ssid":"UniqueHaven_PinkHouse","wifi_pass":"Airbnb.in1","caretaker":"Aniket","phone":"9214246820","rent":10350}'::jsonb),

('property', 'VIL-104', 'The Green House (3BHK Villa 1st Floor)',
 'The Green House is a tranquil 3BHK villa floor on the 1st Floor of 3/64 Vishesh Khand 3, Gomti Nagar. Spacious bedrooms with AC, private balcony, modular kitchen, lush green peaceful neighborhood. Caretaker: Aniket (+91 9214246820). Map: https://maps.app.goo.gl/pCGigAPQGHjcfadQ8. Tariff: ₹6,300/night.',
 ARRAY['green house', 'vil-104', 'vishesh khand', '1st floor', '3bhk villa'],
 '{"wifi_ssid":"UniqueHaven_GreenHouse","wifi_pass":"Airbnb.in1","caretaker":"Aniket","phone":"9214246820","rent":6300}'::jsonb),

('property', 'VIL-105', 'The Yellow House (3BHK Ground Floor Villa)',
 'The Yellow House is a ground-floor 3BHK villa with private lawn/courtyard access at 3/64 Vishesh Khand 3, Gomti Nagar. Senior-citizen and wheelchair friendly (zero stairs). Full kitchen, Wi-Fi, parking. Caretaker: Aniket (+91 9214246820). Map: https://maps.app.goo.gl/pCGigAPQGHjcfadQ8. Tariff: ₹6,300/night.',
 ARRAY['yellow house', 'vil-105', 'vishesh khand', 'ground floor', 'lawn', '3bhk'],
 '{"wifi_ssid":"UniqueHaven_YellowHouse","wifi_pass":"Airbnb.in1","caretaker":"Aniket","phone":"9214246820","rent":6300}'::jsonb),

('property', 'VIL-101', 'Gomti Grand Villa (4BHK Private Estate)',
 'Gomti Grand Villa is an exclusive 4BHK private estate in Geetapuri Colony near Lulu Mall & Shaheed Path. Expansive living hall, landscaped lawns, private parking for 3+ cars. Accommodates up to 10-12 guests. Map: https://maps.app.goo.gl/qQRbCANwvez7mnD3A. Tariff: ₹9,200/night.',
 ARRAY['gomti grand', 'grand villa', 'vil-101', 'geetapuri', 'lulu mall', '4bhk estate'],
 '{"wifi_ssid":"UniqueHaven_GrandVilla","wifi_pass":"Airbnb.in1","caretaker":"Host Concierge","phone":"9450055554","rent":9200}'::jsonb),

('property', 'VIL-102', 'Royal White House (Presidential Estate)',
 'Royal White House is TUHH’s flagship luxury estate in Omax City near Shaheed Path, Airport, and Lulu Mall. Grand classical architecture, palatial rooms, up to 18 guests capacity. Perfect for VIP stays, pre-wedding events, and luxury getaways. Caretaker: Kanchan (+91 9194109911). Tariff: ₹13,800/night.',
 ARRAY['royal white house', 'white house', 'vil-102', 'omax city', 'presidential', 'palace'],
 '{"wifi_ssid":"UniqueHaven_RoyalWhite","wifi_pass":"Airbnb.in1","caretaker":"Kanchan","phone":"9194109911","rent":13800}'::jsonb),

('property', 'LUL-101', 'The Luxe Haven (1BHK Luxury Flat)',
 'The Luxe Haven is a cozy, modern 1BHK luxury stay in Golf City, literally 3 mins from Lulu Mall and Medanta Hospital. Ideal for solo travelers, couples, or medical tourists. High-speed Wi-Fi, kitchen, elevator. Caretaker: Shrwan (+91 8858034382). Map: https://maps.app.goo.gl/b8YjBduoQxa98QhT6. Tariff: ₹2,650/night.',
 ARRAY['luxe haven', 'lul-101', '1bhk', 'golf city', 'lulu mall', 'medanta'],
 '{"wifi_ssid":"UniqueHaven_Luxe","wifi_pass":"Airbnb.in1","caretaker":"Shrwan","phone":"8858034382","rent":2650}'::jsonb),

('property', 'LUL-402', 'Celebrity Garden (5-Bed Luxury Villa)',
 'Celebrity Garden is a massive 5-Bedroom luxury estate in Golf City Sector B, right behind Lulu Mall, Medanta, and Ekana Stadium. Accommodates 10-15 guests. Wi-Fi, lush private gardens, outdoor seating, ample parking. Caretaker: Sarvan (+91 8858034382). Tariff: ₹11,500/night.',
 ARRAY['celebrity garden', 'lul-402', '5 bed', 'golf city', 'lulu mall', 'ekana'],
 '{"wifi_ssid":"UniqueHaven_Celebrity","wifi_pass":"Airbnb.in1","caretaker":"Sarvan","phone":"8858034382","rent":11500}'::jsonb),

('property', 'VIL-106', 'Green Forest View (2nd Floor 3BHK)',
 'Green Forest is a peaceful 3BHK luxury floor near Shaheed Path & Lulu Mall. Scenic tree-lined views, 3 AC bedrooms, modular kitchen. Caretaker: Sarvan (+91 8858034382). Tariff: ₹5,200/night.',
 ARRAY['green forest', 'vil-106', 'shaheed path', '3bhk', 'forest view'],
 '{"wifi_ssid":"UniqueHaven_GreenForest","wifi_pass":"Airbnb.in1","caretaker":"Sarvan","phone":"8858034382","rent":5200}'::jsonb),

('property', 'VIL-107', 'The Velvet House (1st Floor 3BHK)',
 'The Velvet House features plush velvet interiors and premium upholstery. 3 AC bedrooms, kitchen, high-speed Wi-Fi. Near Medanta & Lulu Mall. Caretaker: Sarvan (+91 8858034382). Tariff: ₹5,200/night.',
 ARRAY['velvet house', 'vil-107', 'velvet', 'lulu mall', 'medanta', '3bhk'],
 '{"wifi_ssid":"UniqueHaven_Velvet","wifi_pass":"Airbnb.in1","caretaker":"Sarvan","phone":"8858034382","rent":5200}'::jsonb),

('property', 'VIL-108', 'Pink Paradise Villa (3BHK 3rd Floor)',
 'Pink Paradise is a chic top-floor 3BHK villa with terrace view near Shaheed Path & Medanta Hospital. Caretaker: Sarvan (+91 8858034382). Tariff: ₹5,200/night.',
 ARRAY['pink paradise', 'vil-108', 'terrace', 'shaheed path', '3bhk'],
 '{"wifi_ssid":"UniqueHaven_PinkParadise","wifi_pass":"Airbnb.in1","caretaker":"Sarvan","phone":"8858034382","rent":5200}'::jsonb),

-- ─────────────────────────────────────────────────────────────────────────────
-- GLOBAL FAQs & POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
('general_faq', NULL, 'Check-in & Check-out Policies',
 'Standard Check-in is at 02:00 PM and Standard Check-out is at 11:00 AM. Early check-in or late check-out is complimentary subject to availability. Self check-in with digital lock / on-ground caretaker is available 24/7.',
 ARRAY['checkin', 'check out', 'timing', 'early checkin', 'late checkout', 'time'],
 '{"checkin_time":"02:00 PM","checkout_time":"11:00 AM"}'::jsonb),

('general_faq', NULL, 'Couple Friendly & ID Proof Policy',
 'All The Unique Haven Homes properties are 100% couple-friendly, safe, and private for married and unmarried couples. All adult guests must carry a valid Government Photo ID (Aadhaar Card, Driving License, Voter ID, or Passport). PAN Card is not accepted as address proof.',
 ARRAY['couple', 'unmarried', 'safe', 'id', 'aadhaar', 'local id', 'rules'],
 '{"couple_friendly":true,"required_id":"Aadhaar / DL / Passport"}'::jsonb),

('general_faq', NULL, 'Kitchen & Cooking Amenities',
 'Every property features a fully functional modular kitchen equipped with LPG gas stove, RO drinking water purifier, double-door refrigerator, electric kettle, cookware (kadhai, frypan, cooker), plates, glasses, and cutlery. Basic cooking is 100% permitted at no extra charge.',
 ARRAY['kitchen', 'cooking', 'gas', 'ro', 'fridge', 'refrigerator', 'cookware', 'food'],
 '{"kitchen_available":true,"gas_included":true}'::jsonb),

('general_faq', NULL, 'Wi-Fi & Entertainment',
 'All properties feature dedicated 200 Mbps to 300 Mbps high-speed fiber broadband Wi-Fi (password: Airbnb.in1) with uninterrupted power backup. Living rooms are equipped with 50-55 inch 4K Smart TVs with Netflix, YouTube, and OTT streaming.',
 ARRAY['wifi', 'internet', 'password', 'smart tv', 'speed', 'netflix'],
 '{"wifi_speed":"200 Mbps","wifi_pass":"Airbnb.in1"}'::jsonb),

('general_faq', NULL, 'Direct Booking Discount & Payment Options',
 'Booking directly through The Unique Haven Homes website or WhatsApp saves 15% to 20% compared to Airbnb/Booking.com rates. We accept UPI (Google Pay, PhonePe, Paytm), Net Banking, and Credit/Debit Cards. Standard booking requires a 30-50% advance to lock dates.',
 ARRAY['discount', 'save', 'price', 'rates', 'direct booking', 'upi', 'payment', 'advance'],
 '{"direct_discount_pct":15}'::jsonb),

('general_faq', NULL, 'Proximity & Nearby Landmarks (Lucknow)',
 'Properties are strategically located in Gomti Nagar & Shaheed Path: 5 mins to Lulu Mall & Medanta Hospital, 7 mins to Ekana International Cricket Stadium & Phoenix Palassio, 12 mins to Charbagh Railway Station, and 20 mins to Chaudhary Charan Singh International Airport (via Shaheed Path flyover).',
 ARRAY['distance', 'lulu mall', 'medanta', 'ekana', 'airport', 'location', 'palassio'],
 '{"airport_mins":20,"lulu_mins":5,"ekana_mins":7}'::jsonb)
ON CONFLICT DO NOTHING;
