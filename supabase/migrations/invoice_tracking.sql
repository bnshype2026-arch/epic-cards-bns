-- 1. Add Operational Tracking Columns to card_instances
ALTER TABLE card_instances
ADD COLUMN IF NOT EXISTS activated_invoice_number TEXT,
ADD COLUMN IF NOT EXISTS activated_by UUID REFERENCES user_profiles(id);

-- 2. Update the Admin Audit Log Policy to ensure they can see who activated what
-- (Assuming the Admin policy exists, creating a safe replacement just in case)
DROP POLICY IF EXISTS "Admins can view all instances" ON card_instances;
CREATE POLICY "Admins can view all instances" ON card_instances
    FOR SELECT USING (
         EXISTS (
            SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Note: The ability for an Admin to UPDATE the row during activation is likely already covered 
-- by an existing "Admins can update instances" policy.
