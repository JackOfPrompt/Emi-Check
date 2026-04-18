-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2: Employer Categories Table
-- Run this in Supabase SQL editor BEFORE running the import script
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE emi_calc_employer_categories (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at              TIMESTAMPTZ DEFAULT now(),

  -- Core identity
  employer_name           TEXT NOT NULL,
  employer_name_normalized TEXT NOT NULL,        -- lowercase, trimmed, collapsed spaces

  -- Lender info
  lender                  TEXT NOT NULL,         -- 'axis_finance', 'icici_bank', etc.
  lender_display          TEXT NOT NULL,         -- 'Axis Finance', 'ICICI Bank', etc.
  category                TEXT NOT NULL,         -- normalized: 'CAT_A', 'ELITE', etc.
  category_raw            TEXT,                  -- original value from source file
  max_foir                NUMERIC(5,2),          -- e.g. 0.70 for 70%

  -- Optional enrichment fields (populated where available)
  cin                     TEXT,                  -- Company Identification Number
  employer_id             TEXT,                  -- lender's internal ID (Axis)
  company_code            TEXT,                  -- lender's internal code (Tata)
  unique_code             TEXT,                  -- lender's internal code (ICICI)
  industry                TEXT,                  -- IDFC industry classification
  state                   TEXT,                  -- ICICI state field
  select_top_corporate    BOOLEAN DEFAULT false, -- ICICI flag

  -- Status flags
  is_blocked              BOOLEAN DEFAULT false, -- blocked / DNS / negative / delisted
  block_reason            TEXT,                  -- reason if blocked
  is_active               BOOLEAN DEFAULT true
);

-- ─────────────────────────────────────────────────────────────────────────────
-- INDEXES — critical for fast typeahead at 386k+ rows
-- ─────────────────────────────────────────────────────────────────────────────

-- Primary search index: trigram for ILIKE '%query%' to be fast
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX idx_emi_employer_trgm
  ON emi_calc_employer_categories
  USING GIN (employer_name_normalized gin_trgm_ops);

-- Exact prefix search (faster than trigram for starts-with queries)
CREATE INDEX idx_emi_employer_normalized
  ON emi_calc_employer_categories (employer_name_normalized);

-- Filter by lender
CREATE INDEX idx_emi_employer_lender
  ON emi_calc_employer_categories (lender);

-- Filter active, non-blocked records
CREATE INDEX idx_emi_employer_active
  ON emi_calc_employer_categories (is_active, is_blocked);

-- CIN lookup (for deduplication and enrichment)
CREATE INDEX idx_emi_employer_cin
  ON emi_calc_employer_categories (cin)
  WHERE cin IS NOT NULL;


-- ─────────────────────────────────────────────────────────────────────────────
-- TYPEAHEAD FUNCTION (callable via Supabase RPC)
-- Returns best match per employer across all lenders
-- ─────────────────────────────────────────────────────────────────────────────
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
    -- Pick highest-FOIR category as the "best" for display
    (ARRAY_AGG(category ORDER BY max_foir DESC NULLS LAST))[1]  AS best_category,
    MAX(max_foir)                                                AS best_foir,
    ARRAY_AGG(DISTINCT lender ORDER BY lender)                  AS matched_lenders,
    -- Full detail per lender for result screen
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
    -- Exact starts-with matches ranked first
    CASE WHEN employer_name_normalized ILIKE LOWER(TRIM(search_query)) || '%' THEN 0 ELSE 1 END,
    MAX(max_foir) DESC NULLS LAST,
    employer_name
  LIMIT result_limit;
$$;


-- ─────────────────────────────────────────────────────────────────────────────
-- VERIFY after import
-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT lender, COUNT(*) as total, COUNT(*) FILTER (WHERE is_blocked) as blocked
-- FROM emi_calc_employer_categories
-- GROUP BY lender ORDER BY total DESC;
