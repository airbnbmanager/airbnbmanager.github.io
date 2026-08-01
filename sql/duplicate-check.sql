-- ═══════════════════════════════════════════════
-- DUPLICATE BOOKING CHECKER
-- Run monthly to catch data entry issues
-- Excludes: reviews, linked, extended, groups
-- ═══════════════════════════════════════════════

-- Real overlapping bookings
SELECT 
  b1.booking_id as bk1_id, b1.guest_name as bk1_guest,
  b2.booking_id as bk2_id, b2.guest_name as bk2_guest,
  b1.room_id, b1.check_in, b1.check_out
FROM guest_register b1
JOIN guest_register b2 
  ON b1.room_id = b2.room_id
  AND b1.booking_id < b2.booking_id
  AND b1.check_in < b2.check_out
  AND b2.check_in < b1.check_out
WHERE 
  (b1.is_cancelled IS NOT TRUE) AND (b2.is_cancelled IS NOT TRUE)
  AND (b1.is_review_booking IS NOT TRUE) AND (b2.is_review_booking IS NOT TRUE)
  AND b1.linked_booking_id IS NULL AND b2.linked_booking_id IS NULL
  AND b1.parent_booking_id IS NULL AND b2.parent_booking_id IS NULL
  AND (b1.stay_group_id IS NULL OR b1.stay_group_id != b2.stay_group_id)
  AND NOT (LOWER(TRIM(b1.guest_name)) = LOWER(TRIM(b2.guest_name)) AND b1.check_in = b2.check_in)
  AND NOT (b1.phone = b2.phone AND b1.phone IS NOT NULL AND b1.check_in = b2.check_in)
ORDER BY b1.check_in DESC;
