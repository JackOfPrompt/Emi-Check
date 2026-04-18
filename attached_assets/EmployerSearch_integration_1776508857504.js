// ─────────────────────────────────────────────────────────────────────────────
// HOW TO WIRE EmployerSearch INTO Screen1Employment.jsx
// ─────────────────────────────────────────────────────────────────────────────
//
// 1. Import the component
// 2. Add employer_name + employer_lender_data to your Zustand store
// 3. Use onSelect callback to store the full employer object
// 4. Pass the stored lender data into calcFOIR() to get accurate FOIR
// ─────────────────────────────────────────────────────────────────────────────

// ── Inside Screen1Employment.jsx ─────────────────────────────────────────────

import { EmployerSearch } from '../components/EmployerSearch'
import { useFormStore }   from '../store/useFormStore'

export function Screen1Employment() {
  const { employment, setEmployment } = useFormStore()

  // Store the selected employer object from the typeahead
  const [selectedEmployer, setSelectedEmployer] = useState(
    employment.selectedEmployer || null
  )

  function handleEmployerSelect(employer) {
    // employer = {
    //   employer_name:      "Infosys Limited",
    //   best_category:      "CAT_A",
    //   best_foir:          0.70,
    //   matched_lenders:    ["axis_finance", "icici_bank", "tata_capital"],
    //   lender_categories:  [{ lender, lender_display, category, max_foir }, ...],
    //   is_blocked:         false
    // }
    // or null if cleared
    setSelectedEmployer(employer)
  }

  function onSubmit(formValues) {
    setEmployment({
      ...formValues,
      // Store the full employer object so Screen4 can show lender matches
      selectedEmployer: selectedEmployer,
      // Store the best FOIR for the eligibility engine
      employer_best_foir: selectedEmployer?.best_foir ?? null,
      employer_name:      selectedEmployer?.employer_name ?? formValues.employer_name_text ?? null,
    })
    navigate('/obligations')
  }

  return (
    // ... your existing StepLayout / form wrapper ...

    // Add EmployerSearch only for salaried users, after employer_category field:
    employment_type === 'salaried' && (
      <EmployerSearch
        value={employment.employer_name}
        onSelect={handleEmployerSelect}
        error={errors.employer_name?.message}
      />
    )

    // ... rest of your form ...
  )
}


// ── Update useFormStore.js ────────────────────────────────────────────────────
// Add employer_best_foir and employer_name to the employment slice:
//
// employment: {
//   employment_type: null,
//   employer_category: null,
//   employer_name: null,           // ← ADD
//   employer_best_foir: null,      // ← ADD
//   selectedEmployer: null,        // ← ADD (full object for Screen4)
//   monthly_net_income: null,
//   ...
// }


// ── Update eligibility.js — calcFOIR() ───────────────────────────────────────
// When employer_best_foir is available, use it directly instead of
// the generic category-based estimate:

export function calcFOIR(profile) {
  // If we have an exact FOIR from the lender database, use it
  if (profile.employer_best_foir && profile.employer_best_foir > 0) {
    let foir = profile.employer_best_foir
    // Still apply risk deductions
    if (profile.overdue_last_6months) foir -= 0.15
    if (profile.salary_mode === 'cash') foir -= 0.10
    return Math.min(0.80, Math.max(0.30, parseFloat(foir.toFixed(2))))
  }

  // Fallback: generic FOIR based on employer_category
  let foir = profile.employment_type === 'salaried' ? 0.65 : 0.55
  if (profile.employment_type === 'salaried') {
    if (['mnc', 'listed', 'government_psu'].includes(profile.employer_category)) foir = 0.75
    else if (profile.employer_category === 'pvt_ltd') foir = 0.70
  }
  if (profile.employment_type === 'self_employed') {
    if (profile.itr_filed && profile.gst_registered) foir = 0.65
    else if (profile.itr_filed) foir = 0.60
  }
  if (profile.overdue_last_6months) foir -= 0.15
  if (profile.salary_mode === 'cash') foir -= 0.10
  return Math.min(0.80, Math.max(0.30, parseFloat(foir.toFixed(2))))
}


// ── Screen4Result.jsx — show lender-specific matches ─────────────────────────
// The selectedEmployer.lender_categories array gives you per-lender eligibility:

import { useFormStore } from '../store/useFormStore'

export function Screen4Result() {
  const { employment, result } = useFormStore()
  const selectedEmployer = employment.selectedEmployer

  // Build lender match display
  const lenderMatches = selectedEmployer?.lender_categories?.map(lc => ({
    lender_display: lc.lender_display,
    category:       lc.category,
    max_foir:       lc.max_foir,
    // Recalculate eligibility per lender using their specific FOIR
    eligible:       lc.max_foir > 0,
  })) ?? []

  return (
    // ... your result cards ...

    // After result cards, show lender breakdown if employer was found:
    lenderMatches.length > 0 && (
      <div style={{ marginTop: 24 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--color-text-secondary)',
                    marginBottom: 10 }}>
          Your employer is listed with these lenders:
        </p>
        {lenderMatches.map((lm, i) => (
          <div key={i} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 0',
            borderBottom: i < lenderMatches.length - 1
              ? '1px solid var(--color-border-tertiary)' : 'none'
          }}>
            <span style={{ fontSize: 14, color: 'var(--color-text-primary)' }}>
              {lm.lender_display}
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>
                {lm.category.replace(/_/g, ' ')}
              </span>
              {lm.eligible
                ? <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 500 }}>✓ Eligible</span>
                : <span style={{ fontSize: 12, color: '#dc2626', fontWeight: 500 }}>✗ Not eligible</span>
              }
            </div>
          </div>
        ))}
      </div>
    )

    // ... lead capture form ...
  )
}


// ── Supabase insert — add employer fields to payload ─────────────────────────
// In your final insert on Screen4, add these fields:

const payload = {
  // ... all existing fields ...

  // Add employer data
  employer_name:        employment.employer_name ?? null,
  // Store matched lender count as a useful meta field
  // (add employer_lender_count INT to emi_calc_leads if you want)
}
