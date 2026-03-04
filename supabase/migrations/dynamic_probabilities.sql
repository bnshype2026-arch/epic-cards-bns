-- 1. Create the Rarity Probabilities Table
CREATE TABLE IF NOT EXISTS rarity_probabilities (
    rarity card_rarity PRIMARY KEY,
    weight INTEGER NOT NULL DEFAULT 10
);

-- 2. Insert default probabilities (if not exists)
INSERT INTO rarity_probabilities (rarity, weight)
VALUES 
    ('Common', 40),
    ('Rare', 30),
    ('Epic', 15),
    ('Legendary', 10),
    ('Mystic', 5)
ON CONFLICT (rarity) DO NOTHING;

-- 3. Enable RLS and setup policies
ALTER TABLE rarity_probabilities ENABLE ROW LEVEL SECURITY;

-- Drop policies if they already exist so the script is idempotent
DROP POLICY IF EXISTS "Anyone can read probabilities" ON rarity_probabilities;
DROP POLICY IF EXISTS "Admins can manage probabilities" ON rarity_probabilities;

-- Anyone can read probabilities
CREATE POLICY "Anyone can read probabilities" ON rarity_probabilities
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage probabilities
CREATE POLICY "Admins can manage probabilities" ON rarity_probabilities
    FOR ALL USING (
         EXISTS (
            SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Create Audit Logs table (if you haven't already run this from the previous adjustment)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 5. Update open_lootbox RPC to use Weighted Probabilities
CREATE OR REPLACE FUNCTION open_lootbox(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_instance_id UUID;
  v_balance INTEGER;
  v_template RECORD;
  v_serial TEXT;
  v_random_val FLOAT;
BEGIN
  -- 1. Check & reduce balance
  SELECT lootbox_balance INTO v_balance FROM user_profiles WHERE id = p_user_id;
  IF v_balance <= 0 THEN
    RAISE EXCEPTION 'No lootboxes available';
  END IF;

  UPDATE user_profiles SET lootbox_balance = lootbox_balance - 1 WHERE id = p_user_id;

  -- 2. Find a random instance based on weighted rarity probability
  
  -- Create a temporary table to hold our weights so it's accessible across queries
  CREATE TEMP TABLE IF NOT EXISTS temp_weights (
    rarity card_rarity,
    weight INTEGER
  ) ON COMMIT DROP;

  -- Clear it in case of connection pooling
  TRUNCATE temp_weights;

  -- Populate it with only available rarities and their configured weights
  INSERT INTO temp_weights (rarity, weight)
  SELECT DISTINCT t.rarity, rp.weight
  FROM card_instances i
  JOIN card_templates t ON i.template_id = t.id
  JOIN rarity_probabilities rp ON t.rarity = rp.rarity
  WHERE i.pool_status = 'Available' AND i.owner_id IS NULL;

  -- Check if we have any cards available at all
  IF NOT EXISTS (SELECT 1 FROM temp_weights) THEN
    RAISE EXCEPTION 'No cards available in the pool';
  END IF;

  -- Select a random val between 0 and total_weight
  SELECT random() * COALESCE(SUM(weight), 0) INTO v_random_val FROM temp_weights;

  -- Pick the rarity based on the random value
  WITH cumulative AS (
      SELECT rarity, weight, sum(weight) over (order by rarity) as cumulative_weight
      FROM temp_weights
  )
  SELECT i.id INTO v_instance_id
  FROM card_instances i
  JOIN card_templates t ON i.template_id = t.id
  WHERE i.pool_status = 'Available' AND i.owner_id IS NULL
    AND t.rarity = (
      SELECT rarity 
      FROM cumulative 
      WHERE cumulative_weight >= v_random_val 
      ORDER BY cumulative_weight 
      LIMIT 1
    )
  ORDER BY random()
  LIMIT 1
  FOR UPDATE; -- Lock the row

  IF v_instance_id IS NULL THEN
    RAISE EXCEPTION 'Failed to resolve a card from the pool.';
  END IF;

  -- 3. Get template details to lock values
  SELECT t.* INTO v_template
  FROM card_instances i
  JOIN card_templates t ON i.template_id = t.id
  WHERE i.id = v_instance_id;

  -- 4. Update the instance to Owned
  UPDATE card_instances
  SET 
    owner_id = p_user_id,
    pool_status = 'Owned',
    opened_at = NOW(),
    expiry_date = NOW() + (v_template.expiry_days || ' days')::INTERVAL,
    locked_discount_percentage = v_template.discount_percentage,
    locked_expiry_days = v_template.expiry_days
  WHERE id = v_instance_id;

  -- 5. Audit Log
  INSERT INTO audit_logs (user_id, action, details)
  VALUES (
    p_user_id, 
    'LOOTBOX_OPENED', 
    jsonb_build_object('instance_id', v_instance_id, 'template_id', v_template.id)
  );

  RETURN v_instance_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 6. Expiry Cron Job Setup (Run if you have pg_cron enabled in Supabase)
-- SELECT cron.schedule('process-expirations', '0 * * * *', $$SELECT public.process_expirations()$$);
