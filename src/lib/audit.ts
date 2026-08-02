// SchulOS — Audit Logging Middleware
// Provides logAudit() and withAuditLog() helpers for recording all data modifications

// @ts-nocheck
import { db } from '@/lib/db';
import { getSession } from '@/lib/auth';

export interface AuditLogParams {
  userId?: string;
  schoolId?: string;
  action: string; // CREATE, UPDATE, DELETE
  entityType: string; // e.g., 'BehaviorIncident', 'Student', 'User'
  entityId?: string;
  changes?: {
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an audit entry to the database.
 * Automatically resolves userId from session if not provided.
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    let userId = params.userId;
    if (!userId) {
      const session = await getSession();
      userId = session?.user?.id ?? undefined;
    }

    await db.auditLog.create({
      data: {
        userId: userId ?? null,
        schoolId: params.schoolId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        changes: params.changes ? JSON.stringify(params.changes) : null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      },
    });
  } catch (error) {
    // Audit logging should never block the main operation
    console.error('Audit log error:', error);
  }
}

/**
 * Extract client info from a Next.js Request object.
 */
export function extractClientInfo(request: Request): {
  ipAddress?: string;
  userAgent?: string;
} {
  const forwarded = request.headers.get('x-forwarded-for');
  const ipAddress = forwarded?.split(',')[0]?.trim() ?? request.headers.get('x-real-ip') ?? undefined;
  const userAgent = request.headers.get('user-agent') ?? undefined;
  return { ipAddress, userAgent };
}

/**
 * Wrapper that adds audit logging to API route handlers.
 * Automatically logs CREATE, UPDATE, DELETE actions with before/after data.
 *
 * Usage:
 * ```ts
 * export const POST = withAuditLog(async (request) => {
 *   // ... handler logic ...
 *   return NextResponse.json(result);
 * }, 'CREATE', 'BehaviorIncident');
 * ```
 */
export function withAuditLog(
  handler: (request: Request, context: { params: Promise<Record<string, string>> }) => Promise<Response>,
  action: string,
  entityType: string,
) {
  return async (request: Request, context: { params: Promise<Record<string, string>> }) => {
    const clientInfo = extractClientInfo(request);
    let session: { user?: { id?: string; schoolId?: string } } | null = null;

    try {
      session = await getSession();
    } catch {
      // Session may not be available for some endpoints
    }

    // Execute the handler
    const response = await handler(request, context);

    // If the handler was successful (2xx), log the audit entry
    if (response.status >= 200 && response.status < 300) {
      try {
        // Try to extract entity ID from response body
        let entityId: string | undefined;
        let changes: AuditLogParams['changes'];

        // Clone the response so we can read the body without consuming it
        const clonedResponse = response.clone();
        try {
          const body = await clonedResponse.json();
          entityId = body?.id ?? body?.data?.id ?? undefined;
          if (action === 'UPDATE' && body?.data) {
            changes = { after: body.data };
          } else if (action === 'CREATE' && body?.data) {
            changes = { after: body.data };
          }
        } catch {
          // Response body may not be JSON
        }

        // Try to extract entity ID from URL params
        if (!entityId && context?.params) {
          const params = await context.params;
          entityId = params?.id as string | undefined;
        }

        await logAudit({
          userId: session?.user?.id,
          schoolId: session?.user?.schoolId,
          action,
          entityType,
          entityId,
          changes,
          ...clientInfo,
        });
      } catch (auditError) {
        // Audit logging should never block the response
        console.error('withAuditLog error:', auditError);
      }
    }

    return response;
  };
}

// ─── Module L: Compliance Audit Logging ────────────────────────────────

export interface ComplianceAuditParams extends AuditLogParams {
  dataSubject?: string; // Student ID if applicable (for GDPR export scope)
}

/**
 * Log compliance-specific actions (DPO approvals, policy changes, etc.)
 * Includes dataSubject field for tracking affected individuals
 */
export async function logComplianceAudit(params: ComplianceAuditParams): Promise<void> {
  try {
    let userId = params.userId;
    if (!userId) {
      const session = await getSession();
      userId = session?.user?.id ?? undefined;
    }

    await db.auditLog.create({
      data: {
        userId: userId ?? null,
        schoolId: params.schoolId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        changes: params.changes ? JSON.stringify(params.changes) : null,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        metadata: params.metadata ? JSON.stringify(params.metadata) : null,
        dataSubject: params.dataSubject ?? null, // Track affected individual
      },
    });
  } catch (error) {
    console.error("[v0] Compliance audit log error:", error);
  }
}

/**
 * Log when a student's data is accessed (for audit trail)
 */
export async function logDataAccess(
  userId: string,
  studentId: string,
  action: string,
  schoolId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logComplianceAudit({
    userId,
    schoolId,
    action: `DATA_ACCESS_${action}`, // e.g., DATA_ACCESS_VIEW_GRADES
    entityType: "Student",
    entityId: studentId,
    dataSubject: studentId,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Log DPO approval actions
 */
export async function logDPOApproval(
  dpoId: string,
  schoolId: string,
  approvalType: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  await logComplianceAudit({
    userId: dpoId,
    schoolId,
    action: `DPO_APPROVAL_${approvalType}`,
    entityType: "ComplianceStatus",
    metadata,
  });
}

/**
 * Log policy updates
 */
export async function logPolicyUpdate(
  userId: string,
  schoolId: string,
  policyType: string,
  changes: AuditLogParams['changes'],
): Promise<void> {
  await logComplianceAudit({
    userId,
    schoolId,
    action: "POLICY_UPDATE",
    entityType: policyType, // e.g., "DataRetentionPolicy"
    changes,
  });
}

/**
 * Query audit logs for a specific data subject (student)
 * Used for GDPR right-of-access requests
 */
export async function getAuditTrailForDataSubject(
  schoolId: string,
  studentId: string,
  limit: number = 100
) {
  try {
    const logs = await db.auditLog.findMany({
      where: {
        schoolId,
        dataSubject: studentId,
      },
      orderBy: { timestamp: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        entityType: true,
        userId: true,
        timestamp: true,
        metadata: true,
      },
    });

    return logs.map((log) => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));
  } catch (error) {
    console.error("[v0] Error querying audit trail:", error);
    return [];
  }
}
