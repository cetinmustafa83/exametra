# API Standardization Guide

## Overview
All API routes must follow this standardized format for consistency, maintainability, and predictable client-side behavior.

## Response Format

### Success Response (GET, POST, PUT, PATCH)
```json
{
  "success": true,
  "data": { /* actual data */ },
  "timestamp": "2024-01-01T12:00:00Z",
  "path": "/api/v1/students"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Descriptive error message",
  "timestamp": "2024-01-01T12:00:00Z",
  "path": "/api/v1/students"
}
```

### Delete Response (204 No Content)
No body, just status 204

## Status Codes

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | GET, PUT, PATCH success |
| 201 | Created | POST success |
| 204 | No Content | DELETE success |
| 400 | Bad Request | Invalid input data |
| 401 | Unauthorized | Not authenticated |
| 403 | Forbidden | Authenticated but no permission |
| 404 | Not Found | Resource doesn't exist |
| 422 | Unprocessable | Validation error |
| 500 | Server Error | Unhandled exception |

## Route Structure

### Before (Inconsistent)
```typescript
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // ... 100 lines of mixed logic

    if (!resource) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Multiple different response formats
    return NextResponse.json(resource, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

### After (Standardized)
```typescript
import { NextRequest } from 'next/server';
import { withMiddleware, withAuth, withRoles, withAudit } from '@/lib/route-middleware';
import { successResponse, createdResponse, notFoundError, validationError } from '@/lib/api-response';
import { db } from '@/lib/db';

async function handler(request: NextRequest) {
  const body = await request.json();
  const { resourceId } = body;

  if (!resourceId) {
    return validationError('resourceId is required');
  }

  const resource = await db.resource.create({ data: body });

  if (!resource) {
    return notFoundError('Resource creation failed');
  }

  return createdResponse(resource);
}

export const POST = withMiddleware(
  withAuth,
  withRoles(['TEACHER', 'ADMIN']),
  withAudit('CREATE_RESOURCE')
)(handler);
```

## Using API Response Helpers

All routes should use helpers from `@/lib/api-response`:

```typescript
import {
  successResponse,
  createdResponse,
  noContentResponse,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  validationError,
  serverError,
} from '@/lib/api-response';

// GET - return data
return successResponse(data);

// POST - return created resource
return createdResponse(resource);

// DELETE - no content
return noContentResponse();

// Errors
return unauthorizedError();
return forbiddenError();
return notFoundError('Resource not found');
return validationError('Invalid email format');
return serverError(error);
```

## Using Middleware

### Basic Authentication
```typescript
import { withAuth } from '@/lib/route-middleware';

async function handler(request: NextRequest) {
  const user = (request as any).user; // injected by middleware
  // handler logic
}

export const GET = withAuth(handler);
```

### Role-Based Access
```typescript
import { withRoles } from '@/lib/route-middleware';

async function handler(request: NextRequest) {
  // only TEACHER and ADMIN can access
}

export const POST = withRoles(['TEACHER', 'ADMIN'])(handler);
```

### Audit Logging
```typescript
import { withAudit } from '@/lib/route-middleware';

export const DELETE = withAudit('DELETE_STUDENT')(handler);
```

### Combining Middleware
```typescript
import { withMiddleware, withAuth, withRoles, withAudit } from '@/lib/route-middleware';

export const PUT = withMiddleware(
  withAuth,
  withRoles(['TEACHER', 'ADMIN']),
  withAudit('UPDATE_GRADES')
)(handler);
```

## Client-Side Usage

### With useApiGet (for data fetching)
```typescript
import { useApiGet } from '@/lib/hooks/useApi';

function MyComponent() {
  const { data, error, isLoading, mutate } = useApiGet('/api/v1/students');

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return <div>{data.map(s => <div key={s.id}>{s.name}</div>)}</div>;
}
```

### With useApiMutation (for mutations)
```typescript
import { useApiMutation } from '@/lib/hooks/useApi';

function MyComponent() {
  const { mutate, isLoading, error } = useApiMutation('/api/v1/students', {
    method: 'POST',
    onSuccess: (data) => console.log('Created:', data),
    onError: (error) => console.error('Error:', error),
  });

  const handleCreate = async () => {
    await mutate({ name: 'John', email: 'john@example.com' });
  };

  return <button onClick={handleCreate} disabled={isLoading}>Create</button>;
}
```

## Migration Checklist

When standardizing an existing route:

- [ ] Import helpers from `@/lib/api-response`
- [ ] Import middleware from `@/lib/route-middleware`
- [ ] Replace inline auth check with `withAuth`
- [ ] Replace inline role check with `withRoles`
- [ ] Replace inline error handling with response helpers
- [ ] Add `withAudit` for sensitive operations
- [ ] Ensure all responses use standardized format
- [ ] Test with client using new `useApiGet`/`useApiMutation`
- [ ] Update any direct `fetch` calls to use hooks

## Common Patterns

### List with Filtering/Pagination
```typescript
async function handler(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');

  const [data, total] = await Promise.all([
    db.resource.findMany({
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.resource.count(),
  ]);

  return successResponse({
    data,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  });
}
```

### Nested Route with ID
```typescript
async function handler(request: NextRequest, { params }: any) {
  const { id } = await params;

  const resource = await db.resource.findUnique({ where: { id } });

  if (!resource) {
    return notFoundError(`Resource ${id} not found`);
  }

  return successResponse(resource);
}
```

### Batch Operations
```typescript
async function handler(request: NextRequest) {
  const { ids } = await request.json();

  const deleted = await db.resource.deleteMany({
    where: { id: { in: ids } },
  });

  return successResponse({
    deletedCount: deleted.count,
    ids,
  });
}
```

## Benefits

1. **Predictable** - Clients know exactly what format to expect
2. **Debuggable** - Timestamps and paths help track issues
3. **DRY** - Reusable middleware eliminates boilerplate
4. **Testable** - Standardized responses are easier to test
5. **Maintainable** - Consistent patterns across all routes
6. **Safe** - Automatic error handling reduces bugs
