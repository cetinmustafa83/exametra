'use client';

import { useCallback, useState, useEffect } from 'react';
import useSWR, { SWRConfiguration } from 'swr';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

export interface UseApiOptions extends SWRConfiguration {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: HeadersInit;
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
  skip?: boolean;
}

const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Standardized API fetcher with error handling
 */
export const apiFetcher = async (
  url: string,
  options?: {
    method?: string;
    body?: any;
    headers?: HeadersInit;
  }
): Promise<any> => {
  const method = options?.method || 'GET';
  const headers = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  const response = await fetch(`${apiUrl}${url}`, {
    method,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
};

/**
 * Hook for fetching data with built-in caching (GET requests)
 * @param url - API endpoint
 * @param options - SWR options
 * @returns { data, error, isLoading, mutate }
 */
export function useApiGet<T = any>(
  url: string | null,
  options?: SWRConfiguration & { skip?: boolean }
) {
  const { skip = false, ...swrOptions } = options || {};

  const { data, error, isLoading, mutate } = useSWR<T>(
    skip || !url ? null : url,
    (url) => apiFetcher(url),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
      ...swrOptions,
    }
  );

  return {
    data,
    error,
    isLoading: isLoading && !error,
    mutate,
  };
}

/**
 * Hook for mutations (POST, PUT, DELETE, PATCH)
 * @param url - API endpoint
 * @param options - Custom options including onSuccess, onError callbacks
 * @returns { mutate, isLoading, error, data }
 */
export function useApiMutation<T = any>(
  url: string,
  options?: UseApiOptions
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);

  const mutate = useCallback(
    async (payload?: any) => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`${apiUrl}${url}`, {
          method: options?.method || 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          body: JSON.stringify(payload || options?.body),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || `HTTP ${response.status}`);
        }

        setData(result.data || result);
        options?.onSuccess?.(result.data || result);

        return result.data || result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        setError(message);
        options?.onError?.(err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [url, options]
  );

  return { mutate, isLoading, error, data };
}

/**
 * Hook for complex queries with multiple dependencies
 * Useful for parallel requests
 */
export function useApiQueries<T = any>(
  queries: Array<{ url: string | null; key?: string }>,
  options?: SWRConfiguration
) {
  const results = queries.map((query) => {
    const { data, error, isLoading, mutate } = useApiGet(query.url, options);
    return {
      key: query.key || query.url,
      data,
      error,
      isLoading,
      mutate,
    };
  });

  const isLoading = results.some((r) => r.isLoading);
  const error = results.find((r) => r.error);
  const data = Object.fromEntries(results.map((r) => [r.key, r.data])) as Record<
    string,
    T | undefined
  >;

  return { data, error, isLoading };
}

/**
 * Imperative API call (for one-off requests)
 */
export const apiCall = async <T = any>(
  url: string,
  options?: {
    method?: string;
    body?: any;
    headers?: HeadersInit;
  }
): Promise<T> => {
  return apiFetcher(`${apiUrl}${url}`, options);
};

/**
 * Convenience methods
 */
export const apiGet = async <T = any>(url: string): Promise<T> => {
  return apiCall(url, { method: 'GET' });
};

export const apiPost = async <T = any>(url: string, body?: any): Promise<T> => {
  return apiCall(url, { method: 'POST', body });
};

export const apiPut = async <T = any>(url: string, body?: any): Promise<T> => {
  return apiCall(url, { method: 'PUT', body });
};

export const apiDelete = async <T = any>(url: string, body?: any): Promise<T> => {
  return apiCall(url, { method: 'DELETE', body });
};

export const apiPatch = async <T = any>(url: string, body?: any): Promise<T> => {
  return apiCall(url, { method: 'PATCH', body });
};
