-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2: Employer Categories Table + RPC Function
-- Run this in: Supabase Dashboard → SQL Editor → New Query → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- Drop existing table and function if present (safe to re-run)
DROP FUNCTION IF EXISTS emi_calc_search_employer(TEXT, INT);
DROP TABLE IF EXISTS emi_calc_employer_categories;

CREATE TABLE emi_calc_employer_categories (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              TIMESTAMPTZ DEFAULT now(),

  employer_name           TEXT NOT NULL,
  employer_name_normalized TEXT NOT NULL,

  lender                  TEXT NOT NULL,
  lender_display          TEXT NOT NULL,
  category                TEXT NOT NULL,
  category_raw            TEXT,
  max_foir                NUMERIC(5,2),

  cin                     TEXT,
  employer_id             TEXT,
  company_code            TEXT,
  unique_code             TEXT,
  industry                TEXT,
  state                   TEXT,
  select_top_corporate    BOOLEAN DEFAULT false,

  is_blocked              BOOLEAN DEFAULT false,
  block_reason            TEXT,
  is_active               BOOLEAN DEFAULT true
);

-- Trigram extension for fast fuzzy search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_emi_employer_trgm
  ON emi_calc_employer_categories
  USING GIN (employer_name_normalized gin_trgm_ops);

CREATE INDEX idx_emi_employer_normalized
  ON emi_calc_employer_categories (employer_name_normalized);

CREATE INDEX idx_emi_employer_lender
  ON emi_calc_employer_categories (lender);

CREATE INDEX idx_emi_employer_active
  ON emi_calc_employer_categories (is_active, is_blocked);

-- Typeahead RPC function — called from the mobile app
CREATE OR REPLACE FUNCTION emi_calc_search_employer(
  search_query TEXT,
  result_limit INT DEFAULT 10
)
RETURNS TABLE (
  employer_name           TEXT,
  best_category           TEXT,
  best_foir               NUMERIC,
  matched_lenders         TEXT[],
  lender_categories       JSONB,
  is_blocked              BOOLEAN
)
LANGUAGE SQL STABLE AS $$
  SELECT
    employer_name,
    (ARRAY_AGG(category ORDER BY max_foir DESC NULLS LAST))[1]  AS best_category,
    MAX(max_foir)                                                AS best_foir,
    ARRAY_AGG(DISTINCT lender ORDER BY lender)                  AS matched_lenders,
    JSONB_AGG(
      JSONB_BUILD_OBJECT(
        'lender',         lender,
        'lender_display', lender_display,
        'category',       category,
        'max_foir',       max_foir
      )
      ORDER BY max_foir DESC NULLS LAST
    )                                                            AS lender_categories,
    BOOL_OR(is_blocked)                                          AS is_blocked
  FROM emi_calc_employer_categories
  WHERE
    is_active = true
    AND employer_name_normalized ILIKE '%' || LOWER(TRIM(search_query)) || '%'
  GROUP BY employer_name
  ORDER BY
    CASE WHEN employer_name_normalized ILIKE LOWER(TRIM(search_query)) || '%' THEN 0 ELSE 1 END,
    MAX(max_foir) DESC NULLS LAST,
    employer_name
  LIMIT result_limit;
$$;

-- Verify after import:
-- SELECT lender, COUNT(*) FROM emi_calc_employer_categories GROUP BY lender;
