#!/usr/bin/env node
/**
 * Build a compact employer search index from all lender JSON files.
 * Output: artifacts/emi-calculator/assets/employer_index.json
 *
 * Each entry: { n: name, c: best_category, f: best_foir, l: [lenders], lc: [{lender,display,category,foir}], b: 0|1 }
 */

const fs = require("fs");
const path = require("path");

const ATTACHED = path.join(__dirname, "../../../attached_assets");
const OUT_PATH = path.join(__dirname, "../assets/employer_index.json");

const LENDER_FILES = [
  { file: "aditya_birla_finance_1776513244846.json", lender: "aditya_birla_finance", display: "Aditya Birla Finance" },
  { file: "kotak_mahindra_bank_1776513244847.json",  lender: "kotak_mahindra_bank",  display: "Kotak Mahindra Bank" },
  { file: "hdb_financial_1776513244848.json",        lender: "hdb_financial",         display: "HDB Financial (HDFC)" },
  { file: "icici_bank_1776513244848.json",           lender: "icici_bank",            display: "ICICI Bank" },
  { file: "idfc_first_bank_1776513244849.json",      lender: "idfc_first_bank",       display: "IDFC First Bank" },
  { file: "yes_bank_1776513244849.json",             lender: "yes_bank",              display: "Yes Bank" },
  { file: "axis_finance_1776513244849.json",         lender: "axis_finance",          display: "Axis Finance" },
];

// Per-category FOIR guidance (merged from all lenders)
const FOIR_MAP = {
  SUPER_CAT_A: 0.75, CAT_A: 0.70, CAT_A_PSU: 0.75,
  CAT_B: 0.65, CAT_C: 0.60, CSC_C: 0.55,
  CAT_D: 0.55, CSC_D: 0.50, CAT_E: 0.50, CAT_P: 0.50,
  ELITE: 0.75, SUPER_PRIME: 0.72, PREFERRED: 0.65, OPEN_MARKET: 0.55,
  ACE_PLUS: 0.80, ACE: 0.75, CAT_SA: 0.75,
  DIAMOND_PLUS: 0.75, DIAMOND: 0.72, GOLD_PLUS: 0.70, GOLD: 0.65,
  SILVER_PLUS: 0.60, SILVER: 0.55, SELECT_ITBPO: 0.70,
  TATA_GROUP: 0.80,
  DNS: 0.0, NEGATIVE: 0.0, BLOCKED: 0.0, DELISTED: 0.0,
};

const BLOCKED_CATS = new Set(["BLOCKED", "NEGATIVE", "DNS", "DELISTED", "CAT_P"]);

function getFoir(category, lenderGuidance) {
  if (lenderGuidance && lenderGuidance[category] !== undefined) return lenderGuidance[category];
  return FOIR_MAP[category] ?? 0.55;
}

/**
 * Canonical normalization used for deduplication keying.
 * Strips parentheticals, unifies pvt/private and ltd/limited variants.
 */
function normalizeKey(name) {
  let s = name.toLowerCase();
  // Strip parenthetical content: "(formerly ...)", "(a division of ...)", etc.
  s = s.replace(/\s*\([^)]*\)/g, "");
  // Punctuation → space (but keep apostrophes in names)
  s = s.replace(/[.,\-_]/g, " ");
  s = s.replace(/&/g, " and ");
  // Normalize: "private" → "pvt", "limited" → "ltd" (word-boundary safe)
  s = s.replace(/\bprivate\b/g, "pvt");
  s = s.replace(/\blimited\b/g, "ltd");
  // Strip trailing dots from abbreviations already in text
  s = s.replace(/\bpvt\.\b/g, "pvt");
  s = s.replace(/\bltd\.\b/g, "ltd");
  // Remove pure noise suffixes that add no identity value
  s = s.replace(/\b(llp|llc|inc|corp|corporation)\b/g, "");
  // Collapse whitespace
  return s.replace(/\s+/g, " ").trim();
}

const employerMap = new Map();

for (const { file, lender, display } of LENDER_FILES) {
  const filePath = path.join(ATTACHED, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`SKIP (not found): ${file}`);
    continue;
  }
  console.log(`Processing ${lender}...`);
  const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const guide = data.category_foir_guidance || {};

  let count = 0;
  for (const emp of data.employers) {
    if (!emp.employer_name) continue;
    const rawName = emp.employer_name.trim();
    if (!rawName) continue;

    const category = emp.category || "UNLISTED";
    const foir = getFoir(category, guide);
    const isBlocked = BLOCKED_CATS.has(category) || emp.is_blocked === false ? false : BLOCKED_CATS.has(category);
    const key = normalizeKey(rawName);

    if (!employerMap.has(key)) {
      employerMap.set(key, {
        n: rawName,
        k: key,           // store the canonical key for search use
        best_foir: isBlocked ? -1 : foir,
        best_category: category,
        lenders: {},
        any_active: !isBlocked,
      });
    }

    const entry = employerMap.get(key);

    // Update best name (prefer more properly cased / longer)
    if (rawName.length > entry.n.length) entry.n = rawName;

    // Track per-lender category
    if (!entry.lenders[lender] || foir > (FOIR_MAP[entry.lenders[lender].c] ?? 0)) {
      entry.lenders[lender] = { c: category, f: foir, d: display };
    }

    // Update best overall
    if (!isBlocked && foir > entry.best_foir) {
      entry.best_foir = foir;
      entry.best_category = category;
      entry.any_active = true;
    }
    count++;
  }
  console.log(`  → ${count.toLocaleString()} records loaded`);
}

console.log(`\nTotal unique employer keys: ${employerMap.size.toLocaleString()}`);

// Convert to compact sorted array
const employers = [];
for (const [, e] of employerMap) {
  if (!e.n) continue;
  const lenderList = Object.keys(e.lenders);
  const lenderCategories = Object.entries(e.lenders).map(([k, v]) => ({
    lender: k, display: v.d, category: v.c, foir: v.f,
  })).sort((a, b) => b.foir - a.foir);

  const allBlocked = lenderCategories.every(lc => BLOCKED_CATS.has(lc.category));

  employers.push({
    n: e.n,
    k: e.k,                 // canonical normalized key (used by search API)
    c: e.best_category,
    f: e.best_foir < 0 ? 0 : Math.round(e.best_foir * 100) / 100,
    l: lenderList,
    lc: lenderCategories,
    b: allBlocked ? 1 : 0,
  });
}

// Sort: non-blocked first → best FOIR desc → alpha
employers.sort((a, b) => {
  if (a.b !== b.b) return a.b - b.b;
  if (b.f !== a.f) return b.f - a.f;
  return a.n.localeCompare(b.n);
});

const output = { version: 1, count: employers.length, employers };
fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
fs.writeFileSync(OUT_PATH, JSON.stringify(output));

const sizeMB = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(2);
console.log(`\nWritten: ${OUT_PATH}`);
console.log(`Entries: ${employers.length.toLocaleString()}`);
console.log(`Size: ${sizeMB} MB`);
