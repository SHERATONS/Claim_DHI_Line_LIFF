import { useState, useEffect, useMemo } from 'react';
import { sanitizeText } from '@/utils/security';

/**
 * Allowed query parameter keys for form pre-fill
 * Add more keys as needed when vendor spec is finalized
 */
export const ALLOWED_FORM_PARAMS = [
  'policyNumber',
  'policyHolder',
  'idcard',
  'notifierName',
  'phone',
  'email',
] as const;

export type FormParamKey = (typeof ALLOWED_FORM_PARAMS)[number];
export type FormParams = Partial<Record<FormParamKey, string>>;

/**
 * Token-based pre-fill response from API
 * Adjust structure based on vendor spec
 */
export interface TokenPrefillData {
  policyNumber?: string;
  policyHolder?: string;
  idcard?: string;
  notifierName?: string;
  phone?: string;
  email?: string;
}

interface UseQueryParamsOptions {
  /**
   * Function to fetch pre-fill data using token
   * If provided, will be called when ?token=xxx is present
   */
  fetchPrefillData?: (token: string) => Promise<TokenPrefillData>;
}

interface UseQueryParamsReturn {
  /** Pre-fill values from URL params or token API */
  prefillData: FormParams;
  /** One-time token from URL (if present) */
  token: string | null;
  /** Loading state when fetching token data */
  isLoading: boolean;
  /** Error message if token fetch failed */
  error: string | null;
  /** Raw URL search params (for debugging) */
  rawParams: URLSearchParams;
}

/**
 * Parse and sanitize query parameters from URL
 * Supports both direct params and token-based pre-fill
 *
 * @example
 * // Direct params: ?policyNumber=POL-123&phone=0812345678
 * const { prefillData } = useQueryParams();
 * // prefillData = { policyNumber: 'POL-123', phone: '0812345678' }
 *
 * @example
 * // Token mode: ?token=abc123
 * const { prefillData, isLoading } = useQueryParams({
 *   fetchPrefillData: async (token) => {
 *     const res = await api.get(`/prefill?token=${token}`);
 *     return res.data;
 *   }
 * });
 */
export function useQueryParams(options: UseQueryParamsOptions = {}): UseQueryParamsReturn {
  const { fetchPrefillData } = options;

  const [tokenData, setTokenData] = useState<FormParams>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Parse URL params once
  const rawParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  // Get token from URL
  const token = rawParams.get('token');

  // Extract and sanitize direct form params from URL
  const directParams = useMemo((): FormParams => {
    const params: FormParams = {};

    for (const key of ALLOWED_FORM_PARAMS) {
      const value = rawParams.get(key);
      if (value) {
        // Sanitize to prevent XSS from URL params
        params[key] = sanitizeText(decodeURIComponent(value));
      }
    }

    return params;
  }, [rawParams]);

  // Fetch data if token is present
  useEffect(() => {
    if (!token || !fetchPrefillData) return;

    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchPrefillData(token);

        if (cancelled) return;

        // Sanitize all fetched values
        const sanitized: FormParams = {};
        for (const key of ALLOWED_FORM_PARAMS) {
          const value = data[key];
          if (value) {
            sanitized[key] = sanitizeText(value);
          }
        }

        setTokenData(sanitized);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลได้');
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, [token, fetchPrefillData]);

  // Merge: token data takes precedence over direct params
  const prefillData = useMemo((): FormParams => {
    return {
      ...directParams,
      ...tokenData, // Token data overwrites direct params
    };
  }, [directParams, tokenData]);

  return {
    prefillData,
    token,
    isLoading,
    error,
    rawParams,
  };
}
