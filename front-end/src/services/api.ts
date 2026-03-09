/**
 * API Service
 * Handles all communication with the backend API using axios.
 * Auth: LIFF access token sent as Bearer in Authorization header.
 */

import axios, { AxiosError, AxiosInstance } from 'axios';
import type { SubmitClaimResponse, LocationItemResponse, ApiError } from '@/types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  console.warn('VITE_API_URL is not configured. API calls will fail.');
}

// ── Retry configuration ──────────────────────────────────────────────────────

const RETRY_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  // 500 is intentionally excluded: claim submission must not be retried on
  // server error to prevent duplicate cases being created in Salesforce.
  retryableStatuses: [408, 429, 502, 503, 504] as number[],
} as const;

function getRetryDelay(attempt: number): number {
  const delay = RETRY_CONFIG.baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000;
  return Math.min(delay + jitter, RETRY_CONFIG.maxDelay);
}

function isRetryableError(error: AxiosError): boolean {
  if (!error.response) {
    return error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
  }
  return RETRY_CONFIG.retryableStatuses.includes(error.response.status);
}

// ── Axios instance ───────────────────────────────────────────────────────────

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
  });

  // Set Content-Type dynamically: FormData → multipart (browser sets boundary),
  // everything else → application/json.
  client.interceptors.request.use(
    (config) => {
      if (!(config.data instanceof FormData)) {
        config.headers['Content-Type'] = 'application/json';
      }
      if (config.data instanceof FormData) {
        config.timeout = 60000; // allow longer for file uploads
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Map HTTP errors to Thai user messages.
  client.interceptors.response.use(
    (response) => response,
    (error: AxiosError<ApiError>) => {
      let message = 'เกิดข้อผิดพลาดในการเชื่อมต่อ';

      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response) {
        const { status } = error.response;
        if (status === 401) message = 'ไม่ได้รับอนุญาต กรุณาเข้าสู่ระบบใหม่';
        else if (status === 413) message = 'ไฟล์มีขนาดใหญ่เกินไป';
        else if (status === 429) message = 'ส่งคำขอบ่อยเกินไป กรุณารอสักครู่';
        else if (status >= 500) message = 'เซิร์ฟเวอร์มีปัญหา กรุณาลองใหม่ภายหลัง';
        else if (status >= 400) message = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
      } else if (error.code === 'ECONNABORTED') {
        message = 'หมดเวลาการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง';
      } else if (error.code === 'ERR_NETWORK') {
        message = 'ไม่สามารถเชื่อมต่อเครือข่ายได้';
      } else if (error.code === 'ERR_CANCELED') {
        message = 'ยกเลิกการดำเนินการแล้ว';
      }

      return Promise.reject(new Error(message));
    }
  );

  return client;
}

export const apiClient = createApiClient();

// ── Retry wrapper ─────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; onRetry?: (attempt: number) => void } = {}
): Promise<T> {
  const { maxRetries = RETRY_CONFIG.maxRetries, onRetry } = options;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt === maxRetries) break;
      if (error instanceof AxiosError && !isRetryableError(error)) break;
      const delay = getRetryDelay(attempt);
      onRetry?.(attempt + 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

// ── Claim submission ─────────────────────────────────────────────────────────

/**
 * Submit a claim (with optional files as FormData) to the backend.
 * Uses the LIFF access token for authentication.
 * Does NOT retry on 5xx to prevent duplicate Salesforce cases.
 */
export async function submitClaim(
  data: Record<string, unknown> | FormData,
  liffToken: string,
  options: { signal?: AbortSignal } = {}
): Promise<SubmitClaimResponse> {
  const response = await apiClient.post<SubmitClaimResponse>('/api/claims/friar', data, {
    headers: { Authorization: `Bearer ${liffToken}` },
    signal: options.signal,
  });

  const respData = response.data as any;
  if (respData?.data) {
    return {
      success: respData.success,
      caseId: respData.data.caseId,
      caseNumber: respData.data.caseNumber,
      error: respData.error,
      code: respData.code,
    };
  }

  return respData;
}

// ── Location cascade ─────────────────────────────────────────────────────────

export async function fetchLocations(
  type: 'province' | 'district' | 'subdistrict',
  parentId?: string
): Promise<LocationItemResponse[]> {
  return withRetry(async () => {
    let url = `/api/locations?type=${type}`;
    if (parentId) url += `&parentId=${encodeURIComponent(parentId)}`;
    const response = await apiClient.get<{ success: boolean; data: LocationItemResponse[] }>(url);
    return response.data.data ?? [];
  });
}
