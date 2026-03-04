-- Add 'Disabled' to the activation_status enum
ALTER TYPE activation_status ADD VALUE IF NOT EXISTS 'Disabled';
