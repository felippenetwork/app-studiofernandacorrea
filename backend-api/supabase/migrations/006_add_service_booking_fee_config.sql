-- Configure booking fee per service: fixed value or percentage of service price
ALTER TABLE services
  ADD COLUMN IF NOT EXISTS booking_fee_type TEXT NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS booking_fee_value NUMERIC NOT NULL DEFAULT 40;
