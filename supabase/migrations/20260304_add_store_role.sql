-- Ensure "store" role exists
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'store';

-- Redefine is_admin to actually mean is_staff (admin OR store) 
-- This grants DB RLS access to store staff. The frontend enforces which pages they see.
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'store')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
