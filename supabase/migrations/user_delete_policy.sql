-- Migration: Add user delete permissions and adjust views

-- 1. Add DELETE policy for users on card_instances
-- Rules: They must own it AND the status must not be 'Available' or 'Inactive' (only allow deleting used/expired items to prevent accidental self-sabotage of active cards).
CREATE POLICY "Users can delete their own expired or activated instances" ON card_instances
  FOR DELETE USING (
    auth.uid() = owner_id 
    AND (activation_status = 'Expired' OR activation_status = 'Activated')
  );
