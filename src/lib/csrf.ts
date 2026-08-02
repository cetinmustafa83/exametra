const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function normalizeOrigin(value: string): string | null {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function configuredOrigins(): Set<string> {
  return new Set(
    (process.env.NEXT_PUBLIC_APP_URL ?? '')
      .split(',')
      .map((origin) => normalizeOrigin(origin.trim()))
      .filter((origin): origin is string => Boolean(origin))
  );
}

export function isCsrfProtectedRequest(request: Request): boolean {
  return !SAFE_METHODS.has(request.method.toUpperCase())
    && new URL(request.url).pathname.startsWith('/api/');
}

export function isTrustedRequestOrigin(request: Request): boolean {
  if (!isCsrfProtectedRequest(request)) return true;

  const requestOrigin = normalizeOrigin(request.url);
  const origin = normalizeOrigin(request.headers.get('origin') ?? '');
  const referer = normalizeOrigin(request.headers.get('referer') ?? '');
  const allowedOrigins = configuredOrigins();

  if (requestOrigin) allowedOrigins.add(requestOrigin);
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.add('http://localhost:3000');
    allowedOrigins.add('http://127.0.0.1:3000');
    allowedOrigins.add('http://localhost:32104');
    allowedOrigins.add('http://127.0.0.1:32104');
  }

  const suppliedOrigin = origin ?? referer;
  return suppliedOrigin !== null && allowedOrigins.has(suppliedOrigin);
}
