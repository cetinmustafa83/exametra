# Critical APIs to Build - Priority List

## Phase 3: API Implementation (Ready for Your Team)

All endpoints follow the standardized middleware pattern defined in `src/lib/route-middleware.ts` and `src/lib/api-response.ts`.

---

## Priority 1: CRITICAL (Must Have for MVP)

### 1. Notifications Hub APIs

#### POST /api/v1/notifications/send
**Purpose:** Create and send notification to user(s)

```typescript
// Request
{
  schoolId: string;
  userId?: string;              // Single user
  userIds?: string[];           // Multiple users
  category: 'assessment' | 'behavior' | 'communication' | 'wellness' | 'system' | 'announcement';
  priority: 'low' | 'normal' | 'high' | 'critical';
  title: string;
  message: string;
  actionUrl?: string;
  actionLabel?: string;
  sourceType?: string;
  sourceId?: string;
  expiresAt?: Date;
}

// Response
{
  success: true;
  data: {
    id: string;
    createdAt: Date;
    sentTo: number;
  }
}
```

**Logic:**
- Validate user/school relationship
- Create notification_hub entries
- Trigger real-time update via WebSocket
- Log via audit system
- Check user notification preferences before sending

**Location:** `/src/app/api/v1/notifications/send/route.ts`

---

#### GET /api/v1/notifications/hub?limit=20&offset=0
**Purpose:** Get user's notifications

```typescript
// Response
{
  success: true;
  data: {
    notifications: [
      {
        id: string;
        category: string;
        priority: string;
        title: string;
        message: string;
        isRead: boolean;
        isDismissed: boolean;
        createdAt: Date;
        actionUrl?: string;
      }
    ];
    unreadCount: number;
    total: number;
  }
}
```

**Location:** `/src/app/api/v1/notifications/hub/route.ts`

---

#### PUT /api/v1/notifications/{id}/read
**Purpose:** Mark notification as read

```typescript
// Response
{
  success: true;
  data: {
    id: string;
    isRead: true;
    readAt: Date;
  }
}
```

**Location:** `/src/app/api/v1/notifications/[id]/read/route.ts`

---

### 2. Dashboard Widget APIs

#### POST /api/v1/dashboard/widgets
**Purpose:** Create widget

```typescript
// Request
{
  schoolId: string;
  userId: string;
  widgetType: string;
  size: 'small' | 'medium' | 'large' | 'full_width';
  config?: Record<string, any>;
  refreshInterval?: number;
}

// Response
{
  success: true;
  data: {
    id: string;
    position: number;
    widgetType: string;
    createdAt: Date;
  }
}
```

**Logic:**
- Find next available position
- Use getDefaultConfig(widgetType) if config not provided
- Validate widget type exists
- Create dashboard_widget record

**Location:** `/src/app/api/v1/dashboard/widgets/route.ts`

---

#### GET /api/v1/dashboard/widgets
**Purpose:** Get user's widgets

```typescript
// Response
{
  success: true;
  data: [
    {
      id: string;
      widgetType: string;
      title: string;
      position: number;
      size: string;
      config: Record<string, any>;
      cacheData?: any;
      lastRefresh?: Date;
    }
  ];
}
```

**Location:** `/src/app/api/v1/dashboard/widgets/route.ts`

---

#### PUT /api/v1/dashboard/widgets/{id}
**Purpose:** Update widget (position, config, size)

```typescript
// Request
{
  position?: number;
  size?: string;
  config?: Record<string, any>;
  title?: string;
}

// Response
{
  success: true;
  data: { /* updated widget */ }
}
```

**Location:** `/src/app/api/v1/dashboard/widgets/[id]/route.ts`

---

#### DELETE /api/v1/dashboard/widgets/{id}
**Purpose:** Remove widget from dashboard

```typescript
// Response
{
  success: true;
  data: { id: string }
}
```

**Location:** `/src/app/api/v1/dashboard/widgets/[id]/route.ts`

---

### 3. Signage APIs

#### POST /api/v1/signage/messages
**Purpose:** Create emergency message

```typescript
// Request
{
  schoolId: string;
  signageId?: string;              // Broadcast to specific device or all
  title: string;
  content: string;
  messageType: 'emergency' | 'notification' | 'schedule' | 'announcement' | 'alert';
  priority: 'low' | 'normal' | 'high' | 'critical';
  displayDuration?: number;        // seconds
  soundAlert?: boolean;
  soundFile?: string;
  startTime?: Date;
  endTime?: Date;
}

// Response
{
  success: true;
  data: {
    id: string;
    messageId: string;
    broadcastTo: number;            // devices affected
    priority: string;
  }
}
```

**Logic:**
- Create signage_message record
- If signageId: send to that device
- Else: broadcast to all active signages via WebSocket
- Log via audit system
- Create signage_audit_log entry

**Location:** `/src/app/api/v1/signage/messages/route.ts`

---

#### GET /api/v1/signage/devices
**Purpose:** Get school's signage devices

```typescript
// Response
{
  success: true;
  data: [
    {
      id: string;
      displayName: string;
      location: string;
      isActive: boolean;
      signageType: string;
      lastHeartbeat?: Date;
      currentMessage?: {
        id: string;
        title: string;
        priority: string;
      };
    }
  ];
}
```

**Location:** `/src/app/api/v1/signage/devices/route.ts`

---

#### POST /api/v1/signage/devices
**Purpose:** Register new signage device

```typescript
// Request
{
  schoolId: string;
  displayName: string;
  location: string;
  signageType: string;
  resolution: string;
  ipAddress?: string;
}

// Response
{
  success: true;
  data: { id: string; apiToken: string }
}
```

**Location:** `/src/app/api/v1/signage/devices/route.ts`

---

### 4. Exam Session APIs

#### POST /api/v1/exam-sessions/start
**Purpose:** Begin exam session for student

```typescript
// Request
{
  schoolId: string;
  assessmentId: string;
  studentId: string;
  lockdownEnabled?: boolean;
  cameraMonitor?: boolean;
  screenShare?: boolean;
}

// Response
{
  success: true;
  data: {
    sessionId: string;
    startTime: Date;
    endTime: Date;
    timeAllowed: number;           // minutes
    token: string;                 // JWT for session verification
    lockdownToken?: string;        // For kiosk mode
  }
}
```

**Logic:**
- Validate student is enrolled in course
- Create exam_session record
- Generate JWT with session data + exp
- If lockdownEnabled: generate kiosk token (restricted permissions)
- Start real-time monitoring via WebSocket
- Log audit trail

**Location:** `/src/app/api/v1/exam-sessions/start/route.ts`

---

#### GET /api/v1/exam-sessions/{sessionId}/events
**Purpose:** Stream exam monitoring events

```typescript
// Query Params
?limit=50&type=all|warning|critical

// Response (streamed)
{
  success: true;
  data: {
    events: [
      {
        id: string;
        eventType: 'tab_switch' | 'copy_paste' | 'window_blur' | 'camera_detected_none' | 'suspicious_movement' | 'time_warning';
        severity: 'info' | 'warning' | 'critical';
        timestamp: Date;
        description?: string;
      }
    ];
    securityRisk: 0-100;           // Computed score
    warnings: Exam
Warning[];
  }
}
```

**Logic:**
- Retrieve exam_events for session
- Filter by type if provided
- Compute security risk score:
  - tab_switch: +15
  - copy_paste: +25
  - window_blur: +10
  - suspicious_movement: +35
  - Max capped at 100
- Include active exam_warnings

**Location:** `/src/app/api/v1/exam-sessions/[sessionId]/events/route.ts`

---

#### POST /api/v1/exam-sessions/{sessionId}/submit
**Purpose:** Submit exam for grading

```typescript
// Request
{
  studentId: string;
  answers: [
    { questionId: string; answer: string }
  ]
}

// Response
{
  success: true;
  data: {
    sessionId: string;
    submittedAt: Date;
    status: 'submitted';
    securityFlags: number;
  }
}
```

**Location:** `/src/app/api/v1/exam-sessions/[sessionId]/submit/route.ts`

---

## Priority 2: IMPORTANT (Build in Week 2)

### 5. Dashboard Layout API
```
POST   /api/v1/dashboard/layouts
GET    /api/v1/dashboard/layouts/{id}
PUT    /api/v1/dashboard/layouts/{id}
DELETE /api/v1/dashboard/layouts/{id}
```

### 6. Signage Scheduling
```
POST   /api/v1/signage/schedules
GET    /api/v1/signage/schedules
PUT    /api/v1/signage/schedules/{id}
DELETE /api/v1/signage/schedules/{id}
```

### 7. Exam Proctoring (Teacher)
```
GET    /api/v1/exam-proctoring/sessions?classId=xxx
POST   /api/v1/exam-proctoring/{sessionId}/pause
POST   /api/v1/exam-proctoring/{sessionId}/resume
POST   /api/v1/exam-proctoring/{sessionId}/flag-warning
```

### 8. Notification Preferences
```
GET    /api/v1/notifications/preferences
PUT    /api/v1/notifications/preferences
```

---

## Implementation Template

Use this template for each API (follows middleware pattern):

```typescript
// /src/app/api/v1/[module]/[action]/route.ts
import { NextRequest } from 'next/server';
import { withAuth, withAudit, withRateLimit } from '@/lib/route-middleware';
import { apiResponse, apiError } from '@/lib/api-response';
import { db } from '@/lib/db';
import { logComplianceAudit } from '@/lib/audit';

export async function POST(request: NextRequest) {
  return withAuth(async (user) => {
    return withAudit(async () => {
      try {
        const body = await request.json();

        // Validate input
        if (!body.schoolId) {
          return apiError('School ID required', 400);
        }

        // Verify user access to school
        const school = await db.school.findUnique({
          where: { id: body.schoolId },
        });

        if (!school) {
          return apiError('School not found', 404);
        }

        // Business logic
        const result = await db.yourModel.create({
          data: { /* ... */ },
        });

        // Audit log
        await logComplianceAudit({
          userId: user.id,
          schoolId: body.schoolId,
          action: 'YOUR_ACTION',
          entityType: 'YourModel',
          entityId: result.id,
        });

        return apiResponse({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error('[v0] API error:', error);
        return apiError('Operation failed', 500);
      }
    }, request);
  }, request);
}
```

---

## WebSocket Events (Real-Time)

For real-time notifications, exams, and signage updates:

```typescript
// Server sends:
{
  type: 'notification.created' | 'exam.event' | 'signage.updated';
  data: { /* event data */ };
  timestamp: Date;
}

// Client subscribes:
const ws = new WebSocket('wss://api.domain/ws');
ws.send(JSON.stringify({
  action: 'subscribe',
  channels: ['notifications', 'exam:sessionId', 'signage:schoolId']
}));
```

---

## Testing Checklist

For each API:
- ✅ Valid request succeeds with 200
- ✅ Invalid input returns 400
- ✅ Unauthorized returns 401
- ✅ Forbidden returns 403
- ✅ Not found returns 404
- ✅ Audit log created
- ✅ Real-time updates triggered
- ✅ Performance <200ms

---

## Estimated Effort

**Priority 1:** 3-4 days (10 endpoints)  
**Priority 2:** 3-4 days (8+ endpoints)  
**Total:** 6-8 days for complete API layer

All infrastructure is ready. Just implement the business logic following the templates above.
