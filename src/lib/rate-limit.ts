// SchulOS — API Rate Limiting Middleware
// In-memory rate limiting with configurable limits per endpoint

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// ─── Rate Limit Store ──────────────────────────────────────────────────

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 60 seconds
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60 * 1000);

// ─── Preset Limits ────────────────────────────────────────────────────

export const RATE_LIMITS = {
  // Auth POST endpoints: 30 requests per minute (allows retries & multiple tabs)
  auth: { limit: 30, windowMs: 60 * 1000 },

  // Auth GET endpoint: 120 requests per minute (high frequency, low cost)
  authGet: { limit: 120, windowMs: 60 * 1000 },

  // Data read endpoints: 60 requests per minute (generous)
  dataRead: { limit: 60, windowMs: 60 * 1000 },

  // Data write endpoints (POST, PUT, DELETE): 30 requests per minute
  dataWrite: { limit: 30, windowMs: 60 * 1000 },

  // Heavy operations (export, PDF generation): 10 requests per 5 minutes
  heavy: { limit: 10, windowMs: 5 * 60 * 1000 },

  // Default: 30 requests per minute
  default: { limit: 30, windowMs: 60 * 1000 },
} as const;

// ─── Rate Limit Check ─────────────────────────────────────────────────

interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfterMs?: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // If no entry or expired window, create new entry
  if (!entry || now > entry.resetTime) {
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      limit,
      remaining: limit - 1,
      resetTime,
    };
  }

  // If within window, increment count
  if (entry.count < limit) {
    entry.count += 1;
    return {
      allowed: true,
      limit,
      remaining: limit - entry.count,
      resetTime: entry.resetTime,
    };
  }

  // Rate limit exceeded
  const retryAfterMs = entry.resetTime - now;
  return {
    allowed: false,
    limit,
    remaining: 0,
    resetTime: entry.resetTime,
    retryAfterMs,
  };
}

// ─── Get Rate Limit Key ────────────────────────────────────────────────

export function getRateLimitKey(
  request: Request,
  userId?: string
): string {
  // Get IP from headers or fallback
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 
    request.headers.get('x-real-ip') || 
    'unknown';

  // Combine IP + userId for unique key
  if (userId) {
    return `${ip}:${userId}`;
  }
  return ip;
}

// ─── Rate Limit Headers ───────────────────────────────────────────────

export function getRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers();
  headers.set('X-RateLimit-Limit', String(result.limit));
  headers.set('X-RateLimit-Remaining', String(result.remaining));
  headers.set('X-RateLimit-Reset', String(Math.ceil(result.resetTime / 1000)));
  if (result.retryAfterMs) {
    headers.set('Retry-After', String(Math.ceil(result.retryAfterMs / 1000)));
  }
  return headers;
}

// ─── Rate Limit Response ──────────────────────────────────────────────

export function createRateLimitResponse(result: RateLimitResult): {
  status: number;
  body: { error: string; retryAfter: number; limit: number };
  headers: Headers;
} {
  return {
    status: 429,
    body: {
      error: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((result.retryAfterMs || 0) / 1000),
      limit: result.limit,
    },
    headers: getRateLimitHeaders(result),
  };
}

// ─── withRateLimit Wrapper ────────────────────────────────────────────

import { NextResponse } from 'next/server';

type RouteContext = { params: Promise<Record<string, string>> };
type RouteHandler<TContext extends RouteContext = RouteContext> = (
  request: Request,
  context: TContext
) => Promise<NextResponse>;

export function withRateLimit<TContext extends RouteContext>(
  handler: RouteHandler<TContext>,
  limitPreset: keyof typeof RATE_LIMITS | { limit: number; windowMs: number }
): RouteHandler<TContext> {
  return async (request: Request, context: TContext) => {
    const { limit, windowMs } = typeof limitPreset === 'string'
      ? RATE_LIMITS[limitPreset]
      : limitPreset;

    // Get user ID from session if available (for auth routes, we skip this)
    const key = getRateLimitKey(request);

    const result = checkRateLimit(key, limit, windowMs);

    if (!result.allowed) {
      const rateLimitResponse = createRateLimitResponse(result);
      return NextResponse.json(rateLimitResponse.body, {
        status: rateLimitResponse.status,
        headers: rateLimitResponse.headers,
      });
    }

    // Execute the handler
    const response = await handler(request, context);

    // Add rate limit headers to successful responses
    const rateLimitHeaders = getRateLimitHeaders(result);
    for (const [headerKey, headerValue] of rateLimitHeaders.entries()) {
      response.headers.set(headerKey, headerValue);
    }

    return response;
  };
}

// ─── Rate Limit Stats (for admin monitoring) ──────────────────────────

export interface RateLimitStats {
  totalEntries: number;
  activeKeys: string[];
  topConsumers: Array<{ key: string; count: number; resetTime: number }>;
}

export function getRateLimitStats(): RateLimitStats {
  const entries = Array.from(rateLimitStore.entries());
  const now = Date.now();

  // Filter out expired entries
  const activeEntries = entries.filter(([, entry]) => now <= entry.resetTime);

  // Sort by count (most active first)
  const sorted = activeEntries.sort((a, b) => b[1].count - a[1].count);

  return {
    totalEntries: activeEntries.length,
    activeKeys: sorted.map(([key]) => key),
    topConsumers: sorted.slice(0, 20).map(([key, entry]) => ({
      key,
      count: entry.count,
      resetTime: entry.resetTime,
    })),
  };
}

// ─── Clear all rate limit entries ─────────────────────────────────────

export function clearRateLimitEntries(): void {
  rateLimitStore.clear();
}
