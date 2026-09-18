-- ========================================================
-- Remove / Delete Mohammad Iesa (Esha) - FIRED
-- Employee ID: E001
-- User ID: 9fb4e445-6651-45d0-bc70-34e59f258a1f
-- ========================================================

-- 1. Remove references from rooms table
UPDATE rooms
SET
  caretaker_emp_id = NULL,
  caretaker_name = CASE WHEN caretaker_emp_id = 'E001' OR caretaker_name ILIKE '%esha%' OR caretaker_name ILIKE '%iesa%' THEN 'Pending' ELSE caretaker_name END,
  caretaker_phone = CASE WHEN caretaker_emp_id = 'E001' OR caretaker_phone = '9546908534' THEN NULL ELSE caretaker_phone END,
  checkin_manager_emp_id = CASE WHEN checkin_manager_emp_id = 'E001' THEN NULL ELSE checkin_manager_emp_id END,
  checkin_manager = CASE WHEN checkin_manager_emp_id = 'E001' OR checkin_manager ILIKE '%esha%' OR checkin_manager ILIKE '%iesa%' THEN NULL ELSE checkin_manager END
WHERE caretaker_emp_id = 'E001'
   OR checkin_manager_emp_id = 'E001'
   OR caretaker_name ILIKE '%esha%'
   OR caretaker_name ILIKE '%iesa%'
   OR checkin_manager ILIKE '%esha%'
   OR checkin_manager ILIKE '%iesa%';

-- 2. Remove from property_shifts
DELETE FROM property_shifts WHERE emp_id = 'E001';

-- 3. Delete any linked logs/tasks if exist
DELETE FROM employee_tasks WHERE emp_id = 'E001';
DELETE FROM attendance_log WHERE emp_id = 'E001';
DELETE FROM salary_tracker WHERE emp_id = 'E001';
DELETE FROM advance_tracker WHERE emp_id = 'E001';

-- 4. Delete login profile (revoking app access completely)
DELETE FROM profiles WHERE emp_id = 'E001' OR user_id = '9fb4e445-6651-45d0-bc70-34e59f258a1f';

-- 5. Delete employee record from employees table
DELETE FROM employees WHERE emp_id = 'E001';

-- 6. Ban/block auth user in Supabase auth (optional safety)
UPDATE auth.users 
SET banned_until = '2999-01-01 00:00:00+00' 
WHERE id = '9fb4e445-6651-45d0-bc70-34e59f258a1f';
