import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";

const DEBOUNCE_MS = 280;
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

  const search = useCallback(async (q: string) => {
    if (!q || q.trim().length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc(
        "emi_calc_search_employer",
        { search_query: q.trim(), result_limit: MAX_RESULTS }
      );

      if (rpcError) throw rpcError;
      setResults((data as EmployerResult[]) || []);
    } catch (err: any) {
      setError(err.message);
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
    };
  }, [query, search]);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
  }, []);

  return { query, setQuery, results, loading, error, clear };
}
