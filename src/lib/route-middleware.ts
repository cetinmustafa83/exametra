import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logComplianceAudit } from '@/lib/audit';
import { unauthorizedError, forbiddenError } from '@/lib/api-response';
import { hasRoleAccess, type AppRole } from '@/lib/role-access';

export type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

export interface RouteConfig {
  auth?: boolean; // Require authentication
  roles?: string[]; // Required roles
  audit?: boolean; // Log to audit trail
}

/**
 * Middleware for authentication check
 */
export const withAuth = (handler: RouteHandler) => {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    try {
      const session = await getSession();
      if (!session) {
        return unauthorizedError(request.url);
      }
      // Attach user to request for use in handler
      (request as any).user = session.user;
      return handler(request, context);
    } catch (error) {
      console.error('[v0] Auth error:', error);
      return unauthorizedError(request.url);
    }
  };
};

/**
 * Middleware for role-based access control
 */
export const withRoles = (allowedRoles: string[]) => {
  return (handler: RouteHandler) => {
    return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
      const session = await getSession();
      if (!session) {
        return unauthorizedError(request.url);
      }

      const userRole = session.user?.role;
      if (!hasRoleAccess(userRole, allowedRoles as AppRole[])) {
        return forbiddenError(request.url);
      }

      (request as any).user = session.user;
      return handler(request, context);
    };
  };
};

/**
 * Middleware for audit logging
 */
export const withAudit = (action: string) => {
  return (handler: RouteHandler) => {
    return async (request: NextRequest, context: any) => {
      const session = await getSession();
      const user = session?.user;

      const response = await handler(request, context);

      // Log after handler completes
      if (user) {
        try {
          await logComplianceAudit({
            userId: user.id,
            schoolId: user.schoolId ?? undefined,
            action,
            entityType: request.url.split('/').pop() || 'unknown',
            metadata: {
              method: request.method,
              path: request.url,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (error) {
          console.error('[v0] Audit log error:', error);
        }
      }

      return response;
    };
  };
};

/**
 * Middleware for request validation
 */
export const withValidation = (schema: any) => {
  return (handler: RouteHandler) => {
    return async (request: NextRequest, context: any) => {
      try {
        if (request.method === 'GET' || request.method === 'DELETE') {
          return handler(request, context);
        }

        const body = await request.json();
        const validation = schema.safeParse(body);

        if (!validation.success) {
          return NextResponse.json(
            {
              success: false,
              error: 'Validation error',
              details: validation.error.errors,
            },
            { status: 422 }
          );
        }

        (request as any).validatedBody = validation.data;
        return handler(request, context);
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Invalid request body' },
          { status: 400 }
        );
      }
    };
  };
};

/**
 * Combine multiple middleware
 */
export const withMiddleware =
  (...middleware: Array<(h: RouteHandler) => RouteHandler>) =>
  (handler: RouteHandler) => {
    return middleware.reduceRight((fn, mw) => mw(fn), handler);
  };

/**
 * Example usage in a route:
 *
 * export const GET = withMiddleware(
 *   withAuth,
 *   withRoles(['TEACHER', 'ADMIN']),
 *   withAudit('GET_STUDENTS')
 * )(async (request) => {
 *   const user = (request as any).user;
 *   // handler logic
 * });
 */
