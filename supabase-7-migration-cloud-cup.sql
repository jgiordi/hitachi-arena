-- ============================================================
-- Hitachi Cloud Cup — Migration: Segments and Scoring Fields
-- ============================================================
-- Run this migration to update an existing database with the new
-- Cloud Cup features:
--   - segment field on sales_reps (replaces country)
--   - is_net_new field on deals
--   - account_id field on deals
-- ============================================================

-- Add segment column to sales_reps (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'sales_reps' 
    AND column_name = 'segment'
  ) THEN
    ALTER TABLE public.sales_reps 
    ADD COLUMN segment text DEFAULT 'UK Commercial';
  END IF;
END $$;

-- Migrate existing country data to segment
UPDATE public.sales_reps 
SET segment = CASE 
  WHEN country = 'UK' THEN 'UK Commercial'
  WHEN country = 'France' THEN 'France'
  WHEN country = 'Germany' THEN 'Germany'
  ELSE 'UK Commercial'
END
WHERE segment IS NULL OR segment = '';

-- Add is_net_new column to deals (if not exists)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deals' 
    AND column_name = 'is_net_new'
  ) THEN
    ALTER TABLE public.deals 
    ADD COLUMN is_net_new boolean DEFAULT false;
  END IF;
END $$;

-- Add account_id column to deals for tracking same-account deals
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'deals' 
    AND column_name = 'account_id'
  ) THEN
    ALTER TABLE public.deals 
    ADD COLUMN account_id text;
  END IF;
END $$;

-- Create index on segment for better query performance
CREATE INDEX IF NOT EXISTS idx_sales_reps_segment 
ON public.sales_reps(segment);

-- Create index on is_net_new for filtering
CREATE INDEX IF NOT EXISTS idx_deals_is_net_new 
ON public.deals(is_net_new);

-- Create index on account_id for same-account queries
CREATE INDEX IF NOT EXISTS idx_deals_account_id 
ON public.deals(account_id);

-- ============================================================
-- Note: The 'country' column is kept for backwards compatibility
-- but 'segment' should be used going forward.
-- ============================================================
