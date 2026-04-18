import { useState, useEffect, useRef, useCallback } from "react";
import { API_BASE_URL } from "@/lib/api";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 3;
const MAX_RESULTS = 10;

export interface EmployerResult {
  employer_name: string;
  best_category: string;
  best_foir: number;
  matched_lenders: string[];
  lender_categories: Array<{
    lender: string;
    lender_display: string;
    category: string;
    max_foir: number;
  }>;
  is_blocked: boolean;
}

export function useEmployerSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<EmployerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (q: string) => {
    if (!q || q.trim().length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const url = `${API_BASE_URL}/employers/search?q=${encodeURIComponent(q.trim())}&limit=${MAX_RESULTS}`;
      const resp = await fetch(url, { signal: abortRef.current.signal });
      if (!resp.ok) throw new Error(`Search failed: ${resp.status}`);
      const data = await resp.json();
      setResults(data.results || []);
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setError(err.message || "Search unavailable");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.trim().length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(() => {
      search(query);
    }, DEBOUNCE_MS);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, [query, search]);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  return { query, setQuery, results, loading, error, clear };
}
