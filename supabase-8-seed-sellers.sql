-- ============================================================
-- Hitachi Cloud Cup — Seed Sellers Data
-- ============================================================
-- Run this script to add all Cloud Cup participants to the
-- sales_reps table with their correct segments.
-- ============================================================

-- French Account Management
INSERT INTO public.sales_reps (name, segment) VALUES
  ('Marie-Christine Bock', 'France'),
  ('Bastien Gooris', 'France'),
  ('Stephane Vareilles', 'France'),
  ('Benoit Delesalle', 'France'),
  ('Quentin Bohe', 'France'),
  ('Afzal Ackbaraly', 'France')
ON CONFLICT DO NOTHING;

-- German Sales
INSERT INTO public.sales_reps (name, segment) VALUES
  ('Kerstin Seitz', 'Germany'),
  ('Athanasios Plevnalis (Saki)', 'Germany'),
  ('Christian Puder', 'Germany'),
  ('Michael Meyer', 'Germany'),
  ('Doris Pauli', 'Germany')
ON CONFLICT DO NOTHING;

-- SDMs Europe (LTS)
INSERT INTO public.sales_reps (name, segment) VALUES
  ('Connor Timson', 'LTS'),
  ('Gill Carroll', 'LTS'),
  ('Emma Bannister', 'LTS'),
  ('Steve Bott', 'LTS'),
  ('Kashish Bhatia', 'LTS'),
  ('Ammelia Scott', 'LTS'),
  ('Emma Kehoe', 'LTS'),
  ('Dominic Blake', 'LTS'),
  ('Shanu Atkinsete', 'LTS'),
  ('Desislava Dimova', 'LTS'),
  ('Melissa Apiou', 'LTS'),
  ('Sava Botchev', 'LTS'),
  ('Benjamin Behr', 'LTS')
ON CONFLICT DO NOTHING;

-- UK Commercial Sellers
INSERT INTO public.sales_reps (name, segment) VALUES
  ('James Lloyd', 'UK Commercial'),
  ('David Weaver', 'UK Commercial'),
  ('Matthew Holmes', 'UK Commercial'),
  ('Gary McEachran', 'UK Commercial'),
  ('Liz Carlo', 'UK Commercial'),
  ('Jason Colbridge', 'UK Commercial'),
  ('George Efthimiou', 'UK Commercial'),
  ('Rob Evans', 'UK Commercial')
ON CONFLICT DO NOTHING;

-- UK Government
INSERT INTO public.sales_reps (name, segment) VALUES
  ('Jamie Watson', 'UK Government'),
  ('Ben Brown', 'UK Government'),
  ('Liam Murphy', 'UK Government'),
  ('Lauren Weeks', 'UK Government'),
  ('Kirsty Fox', 'UK Government'),
  ('Simon Robinson', 'UK Government'),
  ('Thomas Day', 'UK Government'),
  ('Ian Michaelwaite', 'UK Government')
ON CONFLICT DO NOTHING;

-- ============================================================
-- Summary: 42 sellers added
--   - France: 6
--   - Germany: 5
--   - LTS (SDMs Europe): 13
--   - UK Commercial: 8
--   - UK Government: 8
-- ============================================================
