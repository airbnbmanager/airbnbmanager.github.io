-- Production SAFE amount fix: CSV Earnings -> You earn ( * 0.92 / 0.97 )
-- NO DELETE. Updates only when old amount still matches.
BEGIN;

UPDATE guest_register SET total_amount = 7726.92 WHERE booking_id = 'BK1787782356591906' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 8146.86) < 0.02;
UPDATE guest_register SET total_amount = 3220.0 WHERE booking_id = 'BK1787664331669389' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 3395) < 0.02;
UPDATE guest_register SET total_amount = 3532.8 WHERE booking_id = 'BK1787510362157169' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 3724.8) < 0.02;
UPDATE guest_register SET total_amount = 13138.53 WHERE booking_id = 'BK178778234975966' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 13852.58) < 0.02;
UPDATE guest_register SET total_amount = 9014.16 WHERE booking_id = 'BK1787782346507833' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 9504.06) < 0.02;
UPDATE guest_register SET total_amount = 3569.65 WHERE booking_id = 'BK_1788010142589_9502' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 3763.65) < 0.02;
UPDATE guest_register SET total_amount = 3243.0 WHERE booking_id = 'BK_1788093769270_2851' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 3419.25) < 0.02;
UPDATE guest_register SET total_amount = 5431.23 WHERE booking_id = 'BK1787782356801169' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 5726.41) < 0.02;
UPDATE guest_register SET total_amount = 2205.72 WHERE booking_id = 'BK_1788166971072_6256' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 2325.6) < 0.02;
UPDATE guest_register SET total_amount = 20187.08 WHERE booking_id = 'BK1787782333008179' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 21284.2) < 0.02;
UPDATE guest_register SET total_amount = 17965.84 WHERE booking_id = 'BK1787782349971378' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 18942.24) < 0.02;
UPDATE guest_register SET total_amount = 11099.18 WHERE booking_id = 'B1785782104359' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 11702.4) < 0.02;
UPDATE guest_register SET total_amount = 20700.0 WHERE booking_id = 'BK1787782329905892' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 21825) < 0.02;
UPDATE guest_register SET total_amount = 18626.25 WHERE booking_id = 'BK1787782350387281' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 19638.55) < 0.02;
UPDATE guest_register SET total_amount = 26128.0 WHERE booking_id = 'BK1787782334704442' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 27548) < 0.02;
UPDATE guest_register SET total_amount = 91358.85 WHERE booking_id = 'B1785782372538' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 96324) < 0.02;
UPDATE guest_register SET total_amount = 45227.48 WHERE booking_id = 'BK1787782341499614' AND booking_mode = 'Online-Airbnb' AND check_in >= '2026-08-01' AND ABS(COALESCE(total_amount,0) - 47685.5) < 0.02;

COMMIT;
