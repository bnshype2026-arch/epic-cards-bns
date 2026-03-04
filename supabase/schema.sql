-- 
-- Epic Cards by BNS - MVP Schema
-- 

-- 1. Custom Types
CREATE TYPE user_role AS ENUM ('user', 'admin');
CREATE TYPE card_rarity AS ENUM ('Common', 'Rare', 'Epic', 'Legendary', 'Mystic');
CREATE TYPE pool_status AS ENUM ('Available', 'Owned');
CREATE TYPE activation_status AS ENUM ('Inactive', 'Activated', 'Expired', 'Disabled');

-- 2. Tables

-- User Profiles (syncs with auth.users)
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  role user_role DEFAULT 'user'::user_role NOT NULL,
  lootbox_balance INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Audit Logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Card Templates (Admin defined)
CREATE TABLE card_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  rarity card_rarity NOT NULL,
  discount_percentage INTEGER NOT NULL,
  expiry_days INTEGER NOT NULL,
  has_gift BOOLEAN DEFAULT FALSE NOT NULL,
  has_task_gift BOOLEAN DEFAULT FALSE NOT NULL,
  description TEXT DEFAULT '' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Card Instances (Actual items users get)
CREATE TABLE card_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  serial_number TEXT UNIQUE NOT NULL,
  template_id UUID REFERENCES card_templates(id) NOT NULL,
  owner_id UUID REFERENCES user_profiles(id), -- NULL if not yet owned
  pool_status pool_status DEFAULT 'Available'::pool_status NOT NULL,
  activation_status activation_status DEFAULT 'Inactive'::activation_status NOT NULL,
  opened_at TIMESTAMPTZ,
  expiry_date TIMESTAMPTZ,
  locked_discount_percentage INTEGER,
  locked_expiry_days INTEGER,
  activated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 3. Row Level Security (RLS) Policies

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_instances ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: 
-- Users can read their own profile. Admins can read all.
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update profiles (e.g., balance)" ON user_profiles
  FOR UPDATE USING (is_admin());

-- Templates:
-- Anyone authenticated can read templates. Admins manage them.
CREATE POLICY "Anyone can read templates" ON card_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage templates" ON card_templates
  FOR ALL USING (is_admin());

-- Instances:
-- Users can read instances they own. Admins can read/manage all.
CREATE POLICY "Users can view their own instances" ON card_instances
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all instances" ON card_instances
  FOR ALL USING (is_admin());


-- 4. Triggers & Functions

-- Auto-create user_profile on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, role)
  VALUES (new.id, new.email, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Lootbox Opening Logic (Transactionally safe)
-- Returns the ID of the opened instance
CREATE OR REPLACE FUNCTION open_lootbox(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_instance_id UUID;
  v_balance INTEGER;
  v_template RECORD;
  v_serial TEXT;
  v_adjusted_active_to TIMESTAMPTZ;
BEGIN
  -- 1. Check & reduce balance
  SELECT lootbox_balance INTO v_balance FROM user_profiles WHERE id = p_user_id;
  IF v_balance <= 0 THEN
    RAISE EXCEPTION 'No lootboxes available';
  END IF;

  UPDATE user_profiles SET lootbox_balance = lootbox_balance - 1 WHERE id = p_user_id;

  -- 2. Find a random available instance
  SELECT i.id INTO v_instance_id
  FROM card_instances i
  WHERE i.pool_status = 'Available' AND i.owner_id IS NULL
  ORDER BY random()
  LIMIT 1
  FOR UPDATE;

  IF v_instance_id IS NULL THEN
    RAISE EXCEPTION 'No cards available in the pool';
  END IF;

  -- 3. Get template details
  SELECT t.* INTO v_template
  FROM card_instances i
  JOIN card_templates t ON i.template_id = t.id
  WHERE i.id = v_instance_id;

  -- 4. Calculate adjusted active_to (End of Day in WIB / UTC+7)
  -- If active_to is provided, we cast it to WIB timezone, set the time to 23:59:59, and cast it back to TIMESTAMPTZ
  IF v_template.active_to IS NOT NULL THEN
    -- Convert the active_to timestamp to WIB (Asia/Jakarta), truncate to date, add 23 hours, 59 mins, 59 secs, then cast back to UTC
    v_adjusted_active_to := (date_trunc('day', v_template.active_to AT TIME ZONE 'Asia/Jakarta') + interval '23 hours 59 minutes 59 seconds') AT TIME ZONE 'Asia/Jakarta';
  ELSE
    v_adjusted_active_to := NULL;
  END IF;

  -- 5. Update the instance to Owned
  UPDATE card_instances
  SET 
    owner_id = p_user_id,
    pool_status = 'Owned',
    opened_at = NOW(),
    -- Calculate expiry based on standard expiry days, but constrain it by the adjusted end-of-day active_to date if it exists
    expiry_date = LEAST(NOW() + (v_template.expiry_days || ' days')::INTERVAL, COALESCE(v_adjusted_active_to, NOW() + (v_template.expiry_days || ' days')::INTERVAL)),
    locked_discount_percentage = v_template.discount_percentage,
    locked_expiry_days = v_template.expiry_days,
    active_from = v_template.active_from,
    active_to = v_template.active_to
  WHERE id = v_instance_id;

  -- 6. Audit Log
  INSERT INTO audit_logs (user_id, action, details)
  VALUES (
    p_user_id, 
    'LOOTBOX_OPENED', 
    jsonb_build_object('instance_id', v_instance_id, 'template_id', v_template.id)
  );

  RETURN v_instance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Expiry Check Function (can be called periodically, or whenever reading instances)
-- We will just do it periodically or on-the-fly, but here is a helper to clean up inactive expired cards
CREATE OR REPLACE FUNCTION process_expirations()
RETURNS VOID AS $$
BEGIN
  UPDATE card_instances
  SET activation_status = 'Expired'
  WHERE activation_status = 'Inactive' 
    AND expiry_date < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: In a real Supabase environment, you would enable pg_cron via the dashboard
-- and then run the following to schedule this function purely via SQL:
-- SELECT cron.schedule('process-expirations', '0 * * * *', $$SELECT public.process_expirations()$$);
