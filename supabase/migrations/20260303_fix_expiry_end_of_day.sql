-- Update the RPC function `open_lootbox` to ensure active_to represents the END of the day (23:59:59) in WIB (UTC+7)
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
