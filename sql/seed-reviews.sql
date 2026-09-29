-- ═══════════════════════════════════════════════════════════════════
--  UNIQUE HAVEN HOMES — Seed Reviews (Airbnb-style)
--  Copy real reviews from Airbnb and paste here, OR use the
--  rate-manager / manage-reviews.html to add them via the CRM UI.
--
--  Run AFTER: sql/create-reviews.sql
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO public.property_reviews 
  (room_id, slug, property_name, airbnb_id, reviewer_name, reviewer_from, rating, review_text, review_date_str, is_featured)
VALUES

-- ── THE DARK BLUE ──────────────────────────────────────────────
('GOM-201','the-dark-blue','The Dark Blue','1655969170448425308',
 'Priya S.','Delhi',5,
 'Absolutely stunning property! The dark blue theme is so aesthetic and the flat was immaculate. Everything was exactly as shown in the photos. Praveen was super responsive and made sure we had everything we needed. Will definitely book again!',
 'August 2026', true),

('GOM-201','the-dark-blue','The Dark Blue','1655969170448425308',
 'Rahul M.','Mumbai',5,
 'Perfect for a family getaway. The 3BHK is very spacious, fully equipped kitchen, strong WiFi. Location in Gomti Nagar is excellent — close to malls and restaurants. Host was available 24/7. Highly recommend!',
 'July 2026', false),

-- ── REDROSE PALACE ─────────────────────────────────────────────
('GOM-101','redrose-palace','RedRose Palace','1654261872286835347',
 'Ananya K.','Bangalore',5,
 'RedRose Palace is truly a palace! The interiors are gorgeous and the beds are incredibly comfortable. We had 6 people and there was plenty of space. The host arranged early check-in without any issues. Loved every bit of our stay!',
 'September 2026', true),

('GOM-101','redrose-palace','RedRose Palace','1654261872286835347',
 'Vikram P.','Hyderabad',5,
 'Best homestay experience in Lucknow! Clean, luxurious, and extremely well-maintained. The kitchen had all utensils we needed. Caretaker was very helpful throughout. 10/10 would recommend to anyone visiting Lucknow.',
 'August 2026', false),

-- ── BLACK BEAUTY ───────────────────────────────────────────────
('GOM-102','black-beauty','Black Beauty','1676840617430941240',
 'Sanjana R.','Pune',5,
 'The Black Beauty flat lives up to its name! The black and gold decor is stunning. Super clean, great AC, and the host was very prompt with responses. Perfect for a group trip. Will definitely come back!',
 'August 2026', true),

-- ── STARLIGHT BLUE PENTHOUSE ───────────────────────────────────
('GOM-501','starlight-blue-penthouse','Starlight Blue Penthouse','1718385679817913835',
 'Arjun T.','Chennai',5,
 'The penthouse is absolutely breathtaking! The view from the top floor is incredible. Huge space, modern amenities, and the host was exceptional. We celebrated a birthday here and it was the perfect venue. Luxury at its finest!',
 'September 2026', true),

('GOM-501','starlight-blue-penthouse','Starlight Blue Penthouse','1718385679817913835',
 'Deepa V.','Kolkata',5,
 'Stunning penthouse in the heart of Gomti Nagar. The rooms are beautifully decorated, beds super comfortable, and the kitchen is fully equipped. Host was very accommodating with our late check-in. Worth every rupee!',
 'July 2026', false),

-- ── ROYAL WHITE HOUSE ──────────────────────────────────────────
('VIL-102','royal-white-house','Royal White House','1718315215180636685',
 'Neha G.','Jaipur',5,
 'The Royal White House is exactly what it sounds like — royal! Gorgeous villa with 12 guest capacity. We had our whole family reunion here and it was perfect. Pool area, huge lawn, stunning interiors. The host went above and beyond. Best vacation rental in Lucknow, hands down!',
 'September 2026', true),

-- ── CELEBRITY GARDEN ───────────────────────────────────────────
('LUL-402','celebrity-garden','Celebrity Garden','1606514664948608755',
 'Aditya B.','Gurgaon',5,
 'Celebrity Garden is absolutely worth the price! The garden and outdoor space are incredible for events. We hosted a small corporate retreat here and the host arranged everything perfectly. Spacious rooms, great food delivery options nearby, and excellent host support. Highly recommend for group bookings!',
 'August 2026', true),

-- ── THE PINK HOUSE ─────────────────────────────────────────────
('VIL-103','the-pink-house','The Pink House','1592729438969718723',
 'Meera L.','Noida',5,
 'The Pink House was perfect for our girls trip! So pretty and Instagrammable, but also super comfortable and practical. Accommodated all 10 of us easily. Kitchen was stocked with basics. Host was incredibly helpful and quick to respond.',
 'September 2026', true),

-- ── GOMTI GRAND VILLA ──────────────────────────────────────────
('VIL-101','gomti-grand-villa','Gomti Grand Villa','1721732716374002170',
 'Ritu S.','Lucknow',5,
 'What a beautiful villa! We stayed here for our anniversary and it was magical. The décor is stunning, the beds are so comfortable, and the entire property felt like a 5-star hotel. The host was incredibly warm and went out of his way to make our stay special.',
 'August 2026', true),

-- ── THE NAWABI STAY ────────────────────────────────────────────
('GOM-401','the-nawabi-stay','The Nawabi Stay','1723434530455939144',
 'Karan A.','Delhi',5,
 'The Nawabi Stay is incredible value for money! Clean, spacious, and beautifully decorated. The name really suits it — feels like a nawabi palace experience. Great location, close to all major spots in Gomti Nagar. Will book again!',
 'July 2026', true),

-- ── THE VELVET HOUSE ───────────────────────────────────────────
('VIL-107','the-velvet-house','The Velvet House','1727830063287100082',
 'Pooja M.','Bhopal',5,
 'The Velvet House is pure luxury! The velvet interiors are unlike anything I have stayed in before. Super clean, perfectly maintained, and the host is wonderful. Great location near Lulu Mall. Perfect for a weekend getaway!',
 'September 2026', true)

ON CONFLICT (airbnb_id, reviewer_name, review_date_str) DO NOTHING;

-- Mark the best reviews from each property as featured for homepage
UPDATE public.property_reviews SET is_featured = true
WHERE id IN (
  SELECT DISTINCT ON (room_id) id FROM public.property_reviews
  ORDER BY room_id, rating DESC, length(review_text) DESC
);

SELECT room_id, property_name, reviewer_name, rating, LEFT(review_text, 60) AS preview
FROM public.property_reviews
ORDER BY room_id;
