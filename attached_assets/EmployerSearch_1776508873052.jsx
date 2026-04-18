// src/hooks/useEmployerSearch.js
// ─────────────────────────────────────────────────────────────────────────────
// Typeahead hook — queries emi_calc_employer_categories via Supabase RPC.
// Debounces input, handles loading/error state, returns ranked results.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const DEBOUNCE_MS   = 280   // wait this long after last keystroke before querying
const MIN_CHARS     = 3     // don't query until user types at least this many chars
const MAX_RESULTS   = 10    // rows returned per query

export function useEmployerSearch() {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const debounceRef = useRef(null)
  const abortRef    = useRef(null)

  const search = useCallback(async (q) => {
    if (!q || q.trim().length < MIN_CHARS) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Use the RPC function defined in phase2_schema.sql
      // Returns: employer_name, best_category, best_foir,
      //          matched_lenders[], lender_categories jsonb, is_blocked
      const { data, error: rpcError } = await supabase.rpc(
        'emi_calc_search_employer',
        { search_query: q.trim(), result_limit: MAX_RESULTS }
      )

      if (rpcError) throw rpcError
      setResults(data || [])
    } catch (err) {
      setError(err.message)
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // Clear previous debounce
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query || query.trim().length < MIN_CHARS) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true) // show spinner immediately on keystroke

    debounceRef.current = setTimeout(() => {
      search(query)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
    setError(null)
  }, [])

  return { query, setQuery, results, loading, error, clear }
}


// ─────────────────────────────────────────────────────────────────────────────
// src/components/EmployerSearch.jsx
// Drop-in component — use inside Screen1Employment.jsx for salaried users
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useEffect } from 'react'
import { Search, X, AlertTriangle, CheckCircle, Building2 } from 'lucide-react'
import { useEmployerSearch } from '../hooks/useEmployerSearch'

/**
 * Props:
 *   onSelect(employer)  — called when user picks a result
 *                         employer = { employer_name, best_category, best_foir,
 *                                      matched_lenders, lender_categories, is_blocked }
 *   value               — currently selected employer name (controlled)
 *   error               — validation error string from React Hook Form
 */
export function EmployerSearch({ onSelect, value, error: fieldError }) {
  const { query, setQuery, results, loading, error: searchError, clear } = useEmployerSearch()
  const [open,     setOpen]     = useState(false)
  const [selected, setSelected] = useState(value || null)
  const inputRef  = useRef(null)
  const dropdownRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current   && !inputRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Open dropdown when results arrive
  useEffect(() => {
    if (results.length > 0) setOpen(true)
  }, [results])

  function handleInput(e) {
    const val = e.target.value
    setQuery(val)
    setSelected(null)       // clear selection when user retypes
    onSelect(null)          // clear parent form value
    if (val.length >= 3) setOpen(true)
    else setOpen(false)
  }

  function handleSelect(employer) {
    setSelected(employer.employer_name)
    setQuery(employer.employer_name)
    setOpen(false)
    onSelect(employer)
  }

  function handleClear() {
    clear()
    setSelected(null)
    onSelect(null)
    inputRef.current?.focus()
    setOpen(false)
  }

  // FOIR label color
  function foirColor(foir) {
    if (!foir) return '#6b7280'
    if (foir >= 0.70) return '#16a34a'
    if (foir >= 0.60) return '#d97706'
    return '#dc2626'
  }

  // Category badge label — shorten long names for display
  function categoryLabel(cat) {
    const labels = {
      SUPER_CAT_A: 'Super A',  CAT_A: 'Cat A',   CAT_B: 'Cat B',
      CAT_C: 'Cat C',          CAT_D: 'Cat D',    CAT_E: 'Cat E',
      ELITE: 'Elite',          SUPER_PRIME: 'Super Prime',
      PREFERRED: 'Preferred',  OPEN_MARKET: 'Open Mkt',
      DIAMOND_PLUS: 'Diamond+', DIAMOND: 'Diamond',
      GOLD_PLUS: 'Gold+',      GOLD: 'Gold',      SILVER: 'Silver',
      ACE_PLUS: 'Ace+',        ACE: 'Ace',        CAT_SA: 'Super A',
      TATA_GROUP: 'Tata Grp',  SELECT_ITBPO: 'IT/BPO',
      BLOCKED: 'Blocked',      DNS: 'DNS',        NEGATIVE: 'Negative',
      DELISTED: 'Delisted',
    }
    return labels[cat] || cat
  }

  const isBlocked  = selected && results.find(r => r.employer_name === selected)?.is_blocked
  const notListed  = selected && !loading && results.length === 0 && query.length >= 3

  return (
    <div style={{ position: 'relative', marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 14, fontWeight: 500,
                      color: 'var(--color-text-primary)', marginBottom: 6 }}>
        Company / Employer Name
      </label>

      {/* Input */}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <Search size={16} style={{ position: 'absolute', left: 12,
          color: 'var(--color-text-secondary)', pointerEvents: 'none' }} />
        <input
          ref={inputRef}
          type="text"
          value={selected || query}
          onChange={handleInput}
          onFocus={() => { if (results.length > 0) setOpen(true) }}
          placeholder="Type to search (e.g. Infosys, TCS, HDFC Bank)"
          style={{
            width: '100%', height: 48, paddingLeft: 36, paddingRight: 36,
            paddingTop: 0, paddingBottom: 0,
            border: `1px solid ${fieldError ? 'var(--color-border-danger)' : 'var(--color-border-secondary)'}`,
            borderRadius: 'var(--border-radius-md)',
            fontSize: 15, outline: 'none',
            background: 'var(--color-background-primary)',
            color: 'var(--color-text-primary)',
            boxSizing: 'border-box',
          }}
        />
        {/* Clear button */}
        {(selected || query) && (
          <button onClick={handleClear} type="button" style={{
            position: 'absolute', right: 10, background: 'none', border: 'none',
            cursor: 'pointer', padding: 4, color: 'var(--color-text-secondary)',
            display: 'flex', alignItems: 'center'
          }}>
            <X size={16} />
          </button>
        )}
        {/* Loading spinner */}
        {loading && !selected && (
          <div style={{
            position: 'absolute', right: 10, width: 16, height: 16,
            border: '2px solid var(--color-border-secondary)',
            borderTopColor: 'var(--color-text-info)',
            borderRadius: '50%', animation: 'spin 0.7s linear infinite'
          }} />
        )}
      </div>

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <div ref={dropdownRef} style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: 'var(--color-background-primary)',
          border: '1px solid var(--color-border-secondary)',
          borderRadius: 'var(--border-radius-md)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          marginTop: 4, maxHeight: 320, overflowY: 'auto'
        }}>
          {results.map((emp, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(emp)}
              style={{
                width: '100%', display: 'flex', alignItems: 'flex-start',
                gap: 10, padding: '10px 14px', border: 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                borderBottom: i < results.length - 1
                  ? '1px solid var(--color-border-tertiary)' : 'none',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--color-background-secondary)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              {/* Icon */}
              <Building2 size={16} style={{
                marginTop: 2, flexShrink: 0,
                color: emp.is_blocked ? '#dc2626' : 'var(--color-text-secondary)'
              }} />

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Employer name */}
                <div style={{
                  fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>
                  {emp.employer_name}
                </div>

                {/* Category + FOIR badges */}
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                  {!emp.is_blocked && (
                    <>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 4,
                        background: 'var(--color-background-success)',
                        color: 'var(--color-text-success)', fontWeight: 500
                      }}>
                        {categoryLabel(emp.best_category)}
                      </span>
                      <span style={{
                        fontSize: 11, padding: '2px 7px', borderRadius: 4,
                        background: 'var(--color-background-secondary)',
                        color: foirColor(emp.best_foir), fontWeight: 500
                      }}>
                        FOIR {Math.round((emp.best_foir || 0) * 100)}%
                      </span>
                      {emp.matched_lenders?.length > 1 && (
                        <span style={{
                          fontSize: 11, padding: '2px 7px', borderRadius: 4,
                          background: 'var(--color-background-info)',
                          color: 'var(--color-text-info)'
                        }}>
                          {emp.matched_lenders.length} lenders
                        </span>
                      )}
                    </>
                  )}
                  {emp.is_blocked && (
                    <span style={{
                      fontSize: 11, padding: '2px 7px', borderRadius: 4,
                      background: 'var(--color-background-danger)',
                      color: 'var(--color-text-danger)', fontWeight: 500
                    }}>
                      Not eligible
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}

          {/* "Not listed" fallback at bottom of dropdown */}
          <button
            type="button"
            onClick={() => handleSelect({ employer_name: query, best_category: 'UNLISTED',
              best_foir: 0.55, matched_lenders: [], lender_categories: [], is_blocked: false })}
            style={{
              width: '100%', padding: '10px 14px', border: 'none',
              background: 'var(--color-background-secondary)', cursor: 'pointer',
              textAlign: 'left', fontSize: 13, color: 'var(--color-text-secondary)',
              borderTop: '1px solid var(--color-border-tertiary)'
            }}
          >
            My company is not in this list → Continue with "{query}"
          </button>
        </div>
      )}

      {/* Helper text states */}
      {!selected && !open && query.length >= 3 && !loading && results.length === 0 && (
        <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 6 }}>
          Company not found — you can still continue.
        </p>
      )}

      {selected && !isBlocked && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <CheckCircle size={14} color="#16a34a" />
          <span style={{ fontSize: 12, color: '#16a34a' }}>Company verified in lender database</span>
        </div>
      )}

      {selected && isBlocked && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8, padding: '10px 12px',
          background: 'var(--color-background-danger)', borderRadius: 'var(--border-radius-md)',
          border: '1px solid var(--color-border-danger)'
        }}>
          <AlertTriangle size={15} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 13, color: 'var(--color-text-danger)', margin: 0 }}>
            This employer is on the lender's restricted list. Loan approval may be difficult.
            You can still submit your details to explore options.
          </p>
        </div>
      )}

      {/* Field error from React Hook Form */}
      {fieldError && (
        <p style={{ fontSize: 12, color: 'var(--color-text-danger)', marginTop: 4 }}>
          {fieldError}
        </p>
      )}

      {/* CSS for spinner */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
