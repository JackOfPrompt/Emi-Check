/**
 * Phase 2 — Lender Employer Data Import Script
 * ─────────────────────────────────────────────
 * Loads all 8 lender JSON files into emi_calc_employer_categories in Supabase.
 *
 * USAGE (run once from your Replit shell):
 *   node scripts/importLenders.js
 *
 * REQUIREMENTS:
 *   1. Run phase2_schema.sql in Supabase first
 *   2. Set environment variables:
 *      SUPABASE_URL=https://xxxx.supabase.co
 *      SUPABASE_SERVICE_KEY=your_service_role_key   ← NOT the anon key
 *   3. Place all 8 JSON files in: data/lenders/
 *   4. npm install @supabase/supabase-js
 *
 * The service role key bypasses RLS — never expose it in frontend code.
 * Find it in: Supabase Dashboard → Settings → API → service_role key
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL        = process.env.SUPABASE_URL
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY
const BATCH_SIZE          = 500          // Supabase insert limit per call
const TABLE               = 'emi_calc_employer_categories'
const DATA_DIR            = resolve(__dirname, '../data/lenders')

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalize employer name for consistent search matching */
function normalize(name) {
  if (!name || name === 'None' || name === 'null') return null
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')           // collapse multiple spaces
    .replace(/[.,\-_&]+/g, ' ')     // replace punctuation with space
    .replace(/\s+/g, ' ')           // collapse again after punctuation removal
    .trim()
}

/** Insert rows in batches, with retry on transient errors */
async function batchInsert(rows, lenderName) {
  let inserted = 0
  let failed   = 0

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE)
    const batchNum = Math.floor(i / BATCH_SIZE) + 1
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE)

    let attempts = 0
    let success  = false

    while (attempts < 3 && !success) {
      const { error } = await supabase.from(TABLE).insert(batch)
      if (!error) {
        success   = true
        inserted += batch.length
        process.stdout.write(
          `\r  ${lenderName}: batch ${batchNum}/${totalBatches} — ${inserted.toLocaleString()} rows inserted`
        )
      } else {
        attempts++
        if (attempts >= 3) {
          console.error(`\n  ⚠️  Batch ${batchNum} failed after 3 attempts:`, error.message)
          failed += batch.length
        } else {
          await new Promise(r => setTimeout(r, 1000 * attempts)) // backoff
        }
      }
    }
  }

  console.log(`\n  ✅  Done: ${inserted.toLocaleString()} inserted, ${failed} failed`)
  return { inserted, failed }
}

// ─── Per-lender transform functions ──────────────────────────────────────────
// Each returns an array of rows ready for Supabase insert

function transformAxisFinance(data) {
  const rows = []

  // Active employers
  for (const e of data.employers) {
    const name = e.employer_name
    const norm = normalize(name)
    if (!norm) continue
    rows.push({
      employer_name:            name?.trim(),
      employer_name_normalized: norm,
      lender:                   'axis_finance',
      lender_display:           'Axis Finance',
      category:                 e.category,
      category_raw:             e.category_raw,
      max_foir:                 data.category_foir_guidance[e.category] ?? null,
      employer_id:              e.employer_id ?? null,
      is_blocked:               false,
      is_active:                true,
    })
  }

  // Blocked employers
  for (const e of (data.blocked_employers || [])) {
    const name = e.employer_name
    const norm = normalize(name)
    if (!norm) continue
    rows.push({
      employer_name:            name?.trim(),
      employer_name_normalized: norm,
      lender:                   'axis_finance',
      lender_display:           'Axis Finance',
      category:                 'BLOCKED',
      category_raw:             'Blocked',
      max_foir:                 0,
      block_reason:             e.reason ?? null,
      is_blocked:               true,
      is_active:                true,
    })
  }

  return rows
}

function transformIDFCFirstBank(data) {
  const rows = []

  for (const e of data.employers) {
    const name = e.employer_name
    const norm = normalize(name)
    if (!norm) continue
    rows.push({
      employer_name:            name?.trim(),
      employer_name_normalized: norm,
      lender:                   'idfc_first_bank',
      lender_display:           'IDFC First Bank',
      category:                 e.category,
      category_raw:             e.category_raw,
      max_foir:                 data.category_foir_guidance[e.category] ?? null,
      cin:                      e.cin ?? null,
      employer_id:              e.employer_id ?? null,
      industry:                 e.industry ?? null,
      is_blocked:               false,
      is_active:                true,
    })
  }

  // DNS (Do Not Source) employers
  for (const e of (data.dns_employers || [])) {
    const name = e.employer_name
    const norm = normalize(name)
    if (!norm) continue
    rows.push({
      employer_name:            name?.trim(),
      employer_name_normalized: norm,
      lender:                   'idfc_first_bank',
      lender_display:           'IDFC First Bank',
      category:                 'DNS',
      category_raw:             'DNS',
      max_foir:                 0,
      cin:                      e.cin ?? null,
      block_reason:             'Do Not Source',
      is_blocked:               true,
      is_active:                true,
    })
  }

  return rows
}

function transformYesBank(data) {
  const rows = []

  for (const e of data.employers) {
    const name = e.employer_name
    const norm = normalize(name)
    if (!norm) continue
    rows.push({
      employer_name:            name?.trim(),
      employer_name_normalized: norm,
      lender:                   'yes_bank',
      lender_display:           'Yes Bank',
      category:                 e.category,
      category_raw:             e.category_raw,
      max_foir:                 data.category_foir_guidance[e.category] ?? null,
      cin:                      e.cin ?? null,
      is_blocked:               false,
      is_active:                true,
    })
  }

  // SELECT IT/BPO — premium category
  for (const e of (data.select_itbpo || [])) {
    const name = e.employer_name
    const norm = normalize(name)
    if (!norm) continue
    rows.push({
      employer_name:            name?.trim(),
      employer_name_normalized: norm,
      lender:                   'yes_bank',
      lender_display:           'Yes Bank',
      category:                 'SELECT_ITBPO',
      category_raw:             'SELECT ITBPO',
      max_foir:                 data.category_foir_guidance['SELECT_ITBPO'] ?? 0.70,
      is_blocked:               false,
      is_active:                true,
    })
  }

  // Negative employers
  for (const e of (data.negative_employers || [])) {
    const name = e.employer_name
    const norm = normalize(name)
    if (!norm) continue
    rows.push({
      employer_name:            name?.trim(),
      employer_name_normalized: norm,
      lender:                   'yes_bank',
      lender_display:           'Yes Bank',
      category:                 'NEGATIVE',
      category_raw:             'Not Ok for Sourcing',
      max_foir:                 0,
      cin:                      e.cin ?? null,
      block_reason:             'Negative list',
      is_blocked:               true,
      is_active:                true,
    })
  }

  return rows
}

function transformTataCapital(data) {
  const rows = []

  for (const e of data.employers) {
    const name = e.employer_name
    const norm = normalize(name)
    if (!norm) continue
    rows.push({
      employer_name:            name?.trim(),
      employer_name_normalized: norm,
      lender:                   'tata_capital',
      lender_display:           'Tata Capital',
      category:                 e.category,
      category_raw:             e.category_raw,
      max_foir:                 data.category_foir_guidance[e.category] ?? null,
      company_code:             e.company_code ?? null,
      is_blocked:               false,
      is_active:                true,
    })
  }

  // Delisted employers
  for (const e of (data.delisted_employers || [])) {
    const name = e.employer_name
    const norm = normalize(name)
    if (!norm) continue
    rows.push({
      employer_name:            name?.trim(),
      employer_name_normalized: norm,
      lender:                   'tata_capital',
      lender_display:           'Tata Capital',
      category:                 'DELISTED',
      category_raw:             'DELIST',
      max_foir:                 0,
      company_code:             e.company_code ?? null,
      block_reason:             e.reason ?? 'Delisted',
      is_blocked:               true,
      is_active:                true,
    })
  }

  return rows
}

function transformICICIBank(data) {
  return data.employers
    .map(e => {
      const name = e.employer_name
      const norm = normalize(name)
      if (!norm) return null
      return {
        employer_name:            name?.trim(),
        employer_name_normalized: norm,
        lender:                   'icici_bank',
        lender_display:           'ICICI Bank',
        category:                 e.category,
        category_raw:             e.category_raw,
        max_foir:                 data.category_foir_guidance[e.category] ?? null,
        unique_code:              e.unique_code ?? null,
        state:                    e.state ?? null,
        select_top_corporate:     e.select_top_corporate === true,
        is_blocked:               false,
        is_active:                true,
      }
    })
    .filter(Boolean)
}

function transformHDBFinancial(data) {
  return data.employers
    .map(e => {
      const name = e.employer_name
      const norm = normalize(name)
      if (!norm) return null
      return {
        employer_name:            name?.trim(),
        employer_name_normalized: norm,
        lender:                   'hdb_financial',
        lender_display:           'HDB Financial Services',
        category:                 e.category,
        category_raw:             e.category_raw,
        max_foir:                 data.category_foir_guidance[e.category] ?? null,
        is_blocked:               false,
        is_active:                true,
      }
    })
    .filter(Boolean)
}

function transformKotakMahindra(data) {
  return data.employers
    .map(e => {
      const name = e.employer_name
      const norm = normalize(name)
      if (!norm) return null
      return {
        employer_name:            name?.trim(),
        employer_name_normalized: norm,
        lender:                   'kotak_mahindra_bank',
        lender_display:           'Kotak Mahindra Bank',
        category:                 e.category,
        category_raw:             e.category_raw,
        max_foir:                 data.category_foir_guidance[e.category] ?? null,
        is_blocked:               e.category === 'NEGATIVE',
        block_reason:             e.category === 'NEGATIVE' ? 'Negative list' : null,
        is_active:                true,
      }
    })
    .filter(Boolean)
}

function transformAdityaBirla(data) {
  return data.employers
    .map(e => {
      const name = e.employer_name
      const norm = normalize(name)
      if (!norm) return null
      return {
        employer_name:            name?.trim(),
        employer_name_normalized: norm,
        lender:                   'aditya_birla_finance',
        lender_display:           'Aditya Birla Finance',
        category:                 e.category,
        category_raw:             e.category_raw,
        max_foir:                 data.category_foir_guidance[e.category] ?? null,
        is_blocked:               false,
        is_active:                true,
      }
    })
    .filter(Boolean)
}

// ─── Lender manifest ─────────────────────────────────────────────────────────
const LENDERS = [
  { file: 'axis_finance.json',          transform: transformAxisFinance   },
  { file: 'idfc_first_bank.json',       transform: transformIDFCFirstBank },
  { file: 'yes_bank.json',              transform: transformYesBank       },
  { file: 'tata_capital.json',          transform: transformTataCapital   },
  { file: 'icici_bank.json',            transform: transformICICIBank     },
  { file: 'hdb_financial.json',         transform: transformHDBFinancial  },
  { file: 'kotak_mahindra_bank.json',   transform: transformKotakMahindra },
  { file: 'aditya_birla_finance.json',  transform: transformAdityaBirla   },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(' EMI Calculator — Lender Data Import')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  // Optional: wipe existing data before re-import
  // Useful if re-running after fixing source files
  const args = process.argv.slice(2)
  if (args.includes('--fresh')) {
    console.log('⚠️  --fresh flag: deleting existing data...')
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // delete all
    if (error) {
      console.error('❌  Failed to clear table:', error.message)
      process.exit(1)
    }
    console.log('🗑️   Table cleared\n')
  }

  let totalInserted = 0
  let totalFailed   = 0
  const summary     = []

  for (const { file, transform } of LENDERS) {
    const filePath = resolve(DATA_DIR, file)
    console.log(`\n📂  Loading ${file}...`)

    let data
    try {
      data = JSON.parse(readFileSync(filePath, 'utf-8'))
    } catch (err) {
      console.error(`  ❌  Could not read ${file}: ${err.message}`)
      continue
    }

    const rows = transform(data)
    console.log(`  📊  Transformed: ${rows.length.toLocaleString()} rows`)
    console.log(`       (${rows.filter(r => r.is_blocked).length.toLocaleString()} blocked, ` +
                `${rows.filter(r => !r.is_blocked).length.toLocaleString()} active)`)

    const { inserted, failed } = await batchInsert(rows, data.lender_display)
    totalInserted += inserted
    totalFailed   += failed
    summary.push({ lender: data.lender_display, rows: rows.length, inserted, failed })
  }

  // ─── Summary report ────────────────────────────────────────────────────────
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(' IMPORT COMPLETE')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`${'Lender'.padEnd(32)} ${'Rows'.padStart(8)} ${'Inserted'.padStart(10)} ${'Failed'.padStart(8)}`)
  console.log('─'.repeat(62))
  for (const s of summary) {
    const status = s.failed > 0 ? '⚠️ ' : '✅ '
    console.log(`${status} ${s.lender.padEnd(30)} ${s.rows.toLocaleString().padStart(8)} ${s.inserted.toLocaleString().padStart(10)} ${s.failed.toLocaleString().padStart(8)}`)
  }
  console.log('─'.repeat(62))
  console.log(`${'TOTAL'.padEnd(32)} ${totalInserted.toLocaleString().padStart(8+10+2)} ${totalFailed.toLocaleString().padStart(8)}`)

  if (totalFailed > 0) {
    console.log(`\n⚠️  ${totalFailed.toLocaleString()} rows failed. Re-run with --fresh to start clean.`)
  } else {
    console.log('\n🎉  All rows imported successfully!')
    console.log('\nNext: verify in Supabase with:')
    console.log('  SELECT lender, COUNT(*) FROM emi_calc_employer_categories GROUP BY lender;')
  }
}

main().catch(err => {
  console.error('❌  Fatal error:', err)
  process.exit(1)
})
