-- ============================================================
-- [UPGRADE ONLY] Migration: Reformat deal periods to FY format
-- ============================================================
-- NOT needed for a fresh install — use supabase-1-schema.sql instead.
-- Run this ONCE if you have existing deals that were logged with
-- the old calendar-quarter format (e.g. "Q1-2026") and need them
-- converted to the new FY format (e.g. "FY25-Q4").
--
-- Mapping logic:
--   Old Q1-YYYY (Jan-Mar) → FY(YYYY-1 % 100)-Q4
--   Old Q2-YYYY (Apr-Jun) → FY(YYYY % 100)-Q1
--   Old Q3-YYYY (Jul-Sep) → FY(YYYY % 100)-Q2
--   Old Q4-YYYY (Oct-Dec) → FY(YYYY % 100)-Q3
-- ============================================================

-- FY24 (Apr 2024 – Mar 2025)
update public.deals set period = 'FY24-Q1' where period = 'Q2-2024';
update public.deals set period = 'FY24-Q2' where period = 'Q3-2024';
update public.deals set period = 'FY24-Q3' where period = 'Q4-2024';
update public.deals set period = 'FY24-Q4' where period = 'Q1-2025';

-- FY25 (Apr 2025 – Mar 2026)
update public.deals set period = 'FY25-Q1' where period = 'Q2-2025';
update public.deals set period = 'FY25-Q2' where period = 'Q3-2025';
update public.deals set period = 'FY25-Q3' where period = 'Q4-2025';
update public.deals set period = 'FY25-Q4' where period = 'Q1-2026';

-- FY26 (Apr 2026 – Mar 2027)
update public.deals set period = 'FY26-Q1' where period = 'Q2-2026';
update public.deals set period = 'FY26-Q2' where period = 'Q3-2026';
update public.deals set period = 'FY26-Q3' where period = 'Q4-2026';
update public.deals set period = 'FY26-Q4' where period = 'Q1-2027';
