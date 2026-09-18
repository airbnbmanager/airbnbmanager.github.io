-- ========================================================
-- Update Vikalp Khand Shifts & Contacts (8 Properties)
-- Day Caretaker: Arman Commandar (E1786007049815) - 8467080284
-- Day Manager: Praveen Singh (E012) - 9454470872
-- Night Caretaker: Shuaib (E1784442871930) - 8957725081
-- ========================================================

-- 1. Enable RLS policy for anon / authenticated on property_shifts if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'property_shifts' AND policyname = 'Allow anon manage property_shifts'
    ) THEN
        CREATE POLICY "Allow anon manage property_shifts" ON property_shifts
            FOR ALL TO anon USING (true) WITH CHECK (true);
    END IF;
END $$;

-- 2. Clear and insert updated shifts for 8 Vikalp Khand properties
DELETE FROM property_shifts WHERE room_id IN (
    'GOM-101','GOM-102','GOM-201','GOM-202','GOM-301','GOM-302','GOM-401','GOM-501'
);

INSERT INTO property_shifts (room_id, emp_id, shift_type, contact_role, shift_start, shift_end, is_active)
VALUES
-- GOM-101 (RedRose Palace)
('GOM-101', 'E1786007049815', 'Day', 'Caretaker', '08:00', '20:00', true),
('GOM-101', 'E012', 'Day', 'Manager & Check-in', '08:00', '20:00', true),
('GOM-101', 'E1784442871930', 'Night', 'Caretaker', '20:00', '08:00', true),

-- GOM-102 (Black Beauty)
('GOM-102', 'E1786007049815', 'Day', 'Caretaker', '08:00', '20:00', true),
('GOM-102', 'E012', 'Day', 'Manager & Check-in', '08:00', '20:00', true),
('GOM-102', 'E1784442871930', 'Night', 'Caretaker', '20:00', '08:00', true),

-- GOM-201 (The Dark Blue)
('GOM-201', 'E1786007049815', 'Day', 'Caretaker', '08:00', '20:00', true),
('GOM-201', 'E012', 'Day', 'Manager & Check-in', '08:00', '20:00', true),
('GOM-201', 'E1784442871930', 'Night', 'Caretaker', '20:00', '08:00', true),

-- GOM-202 (The Brown)
('GOM-202', 'E1786007049815', 'Day', 'Caretaker', '08:00', '20:00', true),
('GOM-202', 'E012', 'Day', 'Manager & Check-in', '08:00', '20:00', true),
('GOM-202', 'E1784442871930', 'Night', 'Caretaker', '20:00', '08:00', true),

-- GOM-301 (The Light Green)
('GOM-301', 'E1786007049815', 'Day', 'Caretaker', '08:00', '20:00', true),
('GOM-301', 'E012', 'Day', 'Manager & Check-in', '08:00', '20:00', true),
('GOM-301', 'E1784442871930', 'Night', 'Caretaker', '20:00', '08:00', true),

-- GOM-302 (The Unique)
('GOM-302', 'E1786007049815', 'Day', 'Caretaker', '08:00', '20:00', true),
('GOM-302', 'E012', 'Day', 'Manager & Check-in', '08:00', '20:00', true),
('GOM-302', 'E1784442871930', 'Night', 'Caretaker', '20:00', '08:00', true),

-- GOM-401 (The Nawabi Stay)
('GOM-401', 'E1786007049815', 'Day', 'Caretaker', '08:00', '20:00', true),
('GOM-401', 'E012', 'Day', 'Manager & Check-in', '08:00', '20:00', true),
('GOM-401', 'E1784442871930', 'Night', 'Caretaker', '20:00', '08:00', true),

-- GOM-501 (Starlight Blue PentHouse)
('GOM-501', 'E1786007049815', 'Day', 'Caretaker', '08:00', '20:00', true),
('GOM-501', 'E012', 'Day', 'Manager & Check-in', '08:00', '20:00', true),
('GOM-501', 'E1784442871930', 'Night', 'Caretaker', '20:00', '08:00', true);

-- 3. Update rooms table
UPDATE rooms SET
  caretaker_emp_id = 'E1786007049815',
  caretaker_name = 'Arman Commandar',
  caretaker_phone = '8467080284',
  checkin_manager_emp_id = 'E012',
  checkin_manager = 'Praveen Singh'
WHERE room_id IN ('GOM-101','GOM-102','GOM-201','GOM-202','GOM-301','GOM-302','GOM-401','GOM-501');

-- 4. Update employees table
UPDATE employees SET
  role = 'Caretaker',
  property_role = 'Caretaker',
  shift = 'day',
  in_whatsapp_template = true,
  whatsapp_display_role = 'Caretaker',
  status = 'Active',
  is_active = true
WHERE emp_id = 'E1786007049815';

UPDATE employees SET
  role = 'Caretaker',
  property_role = 'Caretaker',
  shift = 'night',
  in_whatsapp_template = true,
  whatsapp_display_role = 'Caretaker',
  status = 'Active',
  is_active = true
WHERE emp_id = 'E1784442871930';

UPDATE employees SET
  role = 'Manager',
  property_role = 'Manager & Check-in',
  shift = 'day',
  in_whatsapp_template = true,
  whatsapp_display_role = 'Manager & Check-in',
  status = 'Active',
  is_active = true
WHERE emp_id = 'E012';

UPDATE employees SET in_whatsapp_template = false WHERE emp_id = 'E1784442352225';
DELETE FROM employees WHERE emp_id = 'E001';
