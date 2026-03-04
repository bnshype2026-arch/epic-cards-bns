-- Add active period columns to card_templates
ALTER TABLE card_templates 
ADD COLUMN active_from TIMESTAMPTZ,
ADD COLUMN active_to TIMESTAMPTZ;

-- Add actual active period boundaries to card_instances (locked upon generation/opening)
ALTER TABLE card_instances
ADD COLUMN active_from TIMESTAMPTZ,
ADD COLUMN active_to TIMESTAMPTZ;

-- Update the RPC function `open_lootbox` to lock the `active_from` and `active_to` dates
CREATE OR REPLACE FUNCTION open_lootbox(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_instance_id UUID;
  v_balance INTEGER;
  v_template RECORD;
  v_serial TEXT;
BEGIN
  -- 1. Check & reduce balance
  SELECT lootbox_balance INTO v_balance FROM user_profiles WHERE id = p_user_id;
  IF v_balance <= 0 THEN
    RAISE EXCEPTION 'No lootboxes available';
  END IF;

  UPDATE user_profiles SET lootbox_balance = lootbox_balance - 1 WHERE id = p_user_id;

  -- 2. Find a random available instance, considering probabilities
  -- To prevent breaking existing systems, we continue using basic random selection here if probabilities aren't fully integrated,
  -- but we'll fetch the template info anyway.
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

  -- 4. Update the instance to Owned
  UPDATE card_instances
  SET 
    owner_id = p_user_id,
    pool_status = 'Owned',
    opened_at = NOW(),
    -- Calculate expiry based on standard expiry days, but constrain it by the active_to date if it exists
    expiry_date = LEAST(NOW() + (v_template.expiry_days || ' days')::INTERVAL, COALESCE(v_template.active_to, NOW() + (v_template.expiry_days || ' days')::INTERVAL)),
    locked_discount_percentage = v_template.discount_percentage,
    locked_expiry_days = v_template.expiry_days,
    active_from = v_template.active_from,
    active_to = v_template.active_to
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
