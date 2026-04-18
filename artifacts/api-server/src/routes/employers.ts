import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();

interface IndexEntry {
  n: string;
  c: string;
  f: number;
  l: string[];
  lc: { lender: string; display: string; category: string; foir: number }[];
  b: 0 | 1;
}

interface EmployerResult {
  employer_name: string;
  best_category: string;
  best_foir: number;
  matched_lenders: string[];
  lender_categories: { lender: string; lender_display: string; category: string; max_foir: number }[];
  is_blocked: boolean;
}

let employers: IndexEntry[] = [];
let indexLoaded = false;

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
    employers = data.employers || [];
    indexLoaded = true;
    console.info(`[employers] Loaded ${employers.length.toLocaleString()} employer records`);
  } catch (e) {
    console.error("[employers] Failed to load index:", e);
    indexLoaded = true;
  }
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[.\-_,&]/g, " ").replace(/\s+/g, " ").trim();
}

function searchEmployers(query: string, limit: number): EmployerResult[] {
  const q = norm(query);
  if (!q || q.length < 2) return [];

  const startsWithMatch: IndexEntry[] = [];
  const wordStartsMatch: IndexEntry[] = [];
  const containsMatch: IndexEntry[] = [];

  for (const emp of employers) {
    const normName = norm(emp.n);
    if (normName.startsWith(q)) {
      startsWithMatch.push(emp);
    } else if (normName.split(" ").some((w) => w.startsWith(q))) {
      wordStartsMatch.push(emp);
    } else if (normName.includes(q)) {
      containsMatch.push(emp);
    }
    // Early exit: we have enough candidates
    if (startsWithMatch.length + wordStartsMatch.length + containsMatch.length >= limit * 8) break;
  }

  const combined = [...startsWithMatch, ...wordStartsMatch, ...containsMatch];
  return combined.slice(0, limit).map((emp) => ({
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
