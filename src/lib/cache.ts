// SchulOS — In-memory API response cache utility
// Provides TTL-based caching for API responses to reduce redundant fetches

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // time to live in ms
}

const cache = new Map<string, CacheEntry<any>>();

/**
 * Get cached data or fetch and cache it.
 * If the cache entry exists and is not expired, returns cached data.
 * Otherwise, calls the fetcher, caches the result, and returns it.
 */
export function getCached<T>(key: string, fetcher: () => Promise<T>, ttlMs: number = 30000): Promise<T> {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < entry.ttl) {
    return Promise.resolve(entry.data as T);
  }

  return fetcher().then((data) => {
    cache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
    return data;
  });
}

/**
 * Invalidate a specific cache entry by key.
 */
export function invalidateCache(key: string): void {
  cache.delete(key);
}

/**
 * Invalidate all cache entries whose key matches a pattern.
 * Pattern uses simple wildcard: '*' matches any characters.
 * Example: invalidateCachePattern('dashboard:*') clears all keys starting with 'dashboard:'
 */
export function invalidateCachePattern(pattern: string): void {
  const regexStr = pattern.replace(/\*/g, '.*');
  const regex = new RegExp(`^${regexStr}$`);
  for (const key of cache.keys()) {
    if (regex.test(key)) {
      cache.delete(key);
    }
  }
}

/**
 * Clear all cache entries.
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Get cache stats for debugging.
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: cache.size,
    keys: [...cache.keys()],
  };
}

// Default TTLs for different API types
export const CACHE_TTL = {
  DASHBOARD: 30000,     // 30s
  ANALYTICS: 60000,     // 60s
  NOTIFICATIONS: 15000, // 15s
  SCHOOL_YEARS: 120000, // 120s
  COMPETENCY_TEMPLATES: 120000, // 120s
  CLASSES: 60000,       // 60s
  STUDENTS: 60000,      // 60s
  ATTENDANCE: 30000,    // 30s
  ASSESSMENTS: 45000,   // 45s
} as const;
