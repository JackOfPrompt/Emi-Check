import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

interface IndexEntry {
  n: string;
  k: string;
  c: string;
  f: number;
  l: string[];
  lc: { lender: string; display: string; category: string; foir: number }[];
  b: 0 | 1;
}

interface SearchEntry extends IndexEntry {
  _k: string; // canonical key used for matching (falls back to computed if k absent)
}

interface EmployerResult {
  employer_name: string;
  best_category: string;
  best_foir: number;
  matched_lenders: string[];
  lender_categories: { lender: string; lender_display: string; category: string; max_foir: number }[];
  is_blocked: boolean;
}

let employers: SearchEntry[] = [];
let indexLoaded = false;

/**
 * Canonical normalization — must exactly match buildEmployerIndex.js normalizeKey().
 * Strips parentheticals, unifies pvt/private, ltd/limited, removes noise suffixes.
 */
function canonicalNorm(s: string): string {
  let r = s.toLowerCase();
  r = r.replace(/\s*\([^)]*\)/g, "");          // strip (formerly ...) / (a division of ...)
  r = r.replace(/[.,\-_]/g, " ");
  r = r.replace(/&/g, " and ");
  r = r.replace(/\bprivate\b/g, "pvt");
  r = r.replace(/\blimited\b/g, "ltd");
  r = r.replace(/\bpvt\.\b/g, "pvt");
  r = r.replace(/\bltd\.\b/g, "ltd");
  r = r.replace(/\b(llp|llc|inc|corp|corporation)\b/g, "");
  return r.replace(/\s+/g, " ").trim();
}

function loadIndex() {
  if (indexLoaded) return;
  const indexPath = path.resolve(process.cwd(), "../emi-calculator/assets/employer_index.json");
  if (!fs.existsSync(indexPath)) {
    console.warn("[employers] Index not found at:", indexPath);
    indexLoaded = true;
    return;
  }
  try {
    const raw = fs.readFileSync(indexPath, "utf8");
    const data = JSON.parse(raw);
    // Pre-compute _k once at load: use stored k if available, otherwise compute
    employers = (data.employers || []).map((emp: IndexEntry) => ({
      ...emp,
      _k: emp.k ?? canonicalNorm(emp.n),
    }));
    indexLoaded = true;
    console.info(`[employers] Loaded ${employers.length.toLocaleString()} employer records`);
  } catch (e) {
    console.error("[employers] Failed to load index:", e);
    indexLoaded = true;
  }
}

/**
 * Score a match (lower = better rank):
 *   0 — exact key match
 *   1 — key starts with query
 *   2 — any word in key starts with query
 *   3 — key contains query (substring)
 *   4 — all query tokens present anywhere in key
 */
function matchScore(empKey: string, queryNorm: string, queryTokens: string[]): number | null {
  if (empKey === queryNorm) return 0;
  if (empKey.startsWith(queryNorm)) return 1;
  if (empKey.split(" ").some((w) => w.startsWith(queryNorm))) return 2;
  if (empKey.includes(queryNorm)) return 3;
  // Multi-token: all tokens must appear as word-starts somewhere in the key
  if (queryTokens.length >= 2) {
    const words = empKey.split(" ");
    const allPresent = queryTokens.every(
      (tok) => words.some((w) => w.startsWith(tok))
    );
    if (allPresent) return 4;
  }
  return null;
}

function searchEmployers(query: string, limit: number): EmployerResult[] {
  const queryNorm = canonicalNorm(query);
  if (!queryNorm || queryNorm.length < 2) return [];

  const queryTokens = queryNorm.split(" ").filter((t) => t.length >= 2);

  const hits: { emp: SearchEntry; score: number }[] = [];

  for (const emp of employers) {
    const score = matchScore(emp._k, queryNorm, queryTokens);
    if (score !== null) {
      hits.push({ emp, score });
      // Once we have plenty of candidates across all tiers, stop scanning
      if (hits.length >= limit * 10) break;
    }
  }

  // Sort: score asc (better match first), then FOIR desc, then alpha
  hits.sort((a, b) => {
    if (a.score !== b.score) return a.score - b.score;
    if (b.emp.f !== a.emp.f) return b.emp.f - a.emp.f;
    return a.emp.n.localeCompare(b.emp.n);
  });

  return hits.slice(0, limit).map(({ emp }) => ({
    employer_name: emp.n,
    best_category: emp.c,
    best_foir: emp.f,
    matched_lenders: emp.l,
    lender_categories: emp.lc.map((lc) => ({
      lender: lc.lender,
      lender_display: lc.display,
      category: lc.category,
      max_foir: lc.foir,
    })),
    is_blocked: emp.b === 1,
  }));
}

loadIndex();

router.get("/employers/search", (req, res) => {
  const q = typeof req.query["q"] === "string" ? req.query["q"].trim() : "";
  const limit = Math.min(Number(req.query["limit"] || 10), 30);

  if (!q || q.length < 3) {
    res.json({ results: [], query: q });
    return;
  }

  const results = searchEmployers(q, limit);
  res.json({ results, query: q, count: results.length });
});

export default router;
