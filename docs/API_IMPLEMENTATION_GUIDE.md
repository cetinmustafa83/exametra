# API Implementation Guide - Module B, F, H

All endpoints follow the standardized response format and use the middleware pattern from `src/lib/route-middleware.ts`.

---

## Module B: Emergency Signage API

### Signage Device Management

**POST `/api/v1/signage/displays`**
```typescript
Request: {
  displayName: string,
  signageType: "digital_display" | "led_board" | "tv_monitor",
  location: string,
  resolution?: string,
  ipAddress?: string,
}

Response: {
  success: true,
  data: { id, displayName, signageType, location, isActive }
}
```

**GET `/api/v1/signage/displays`**
```typescript
Query: { schoolId: string, isActive?: boolean }
Response: {
  success: true,
  data: EmergencySignage[],
  pagination: { page, total, limit }
}
```

**PATCH `/api/v1/signage/displays/{id}`**
```typescript
Request: {
  brightness?: number,
  volume?: number,
  isActive?: boolean,
}
Response: { success: true, data: { id, ...updated } }
```

### Message Management

**POST `/api/v1/signage/messages`**
```typescript
Request: {
  signageId: string,
  title: string,
  content: string,
  messageType: "emergency" | "notification" | "schedule" | "announcement",
  priority: "low" | "normal" | "high" | "critical",
  displayDuration: number,
  soundAlert?: boolean,
  backgroundColor?: string,
  textColor?: string,
  startTime?: ISO8601,
  endTime?: ISO8601,
}

Response: {
  success: true,
  data: { id, title, messageType, priority, createdAt }
}
```

**GET `/api/v1/signage/messages`**
```typescript
Query: { schoolId: string, signageId?: string, type?: string }
Response: {
  success: true,
  data: SignageMessage[],
}
```

### Scheduling

**POST `/api/v1/signage/schedules`**
```typescript
Request: {
  signageId: string,
  messageId?: string,
  dayOfWeek: 0-6,
  startTime: "HH:mm",
  endTime: "HH:mm",
  isRecurring: boolean,
}

Response: { success: true, data: { id, dayOfWeek, startTime, endTime } }
```

---

## Module F: Exam Mode API

### Exam Session Management

**POST `/api/v1/exams/sessions`**
```typescript
Request: {
  assessmentId: string,
  studentId: string,
  durationMinutes: number,
  lockdownEnabled: boolean,
  cameraMonitor?: boolean,
}

Response: {
  success: true,
  data: {
    id,
    studentId,
    status: "not_started",
    startTime,
    environmentNotes,
  }
}
```

**GET `/api/v1/exams/sessions/{id}`**
```typescript
Response: {
  success: true,
  data: {
    id,
    status,
    timeRemaining,
    score,
    answers: ExamAnswer[],
    events: ExamEvent[],
    warnings: ExamWarning[],
  }
}
```

**GET `/api/v1/exams/active-sessions`**
```typescript
Query: { schoolId: string, classGroupId?: string }
Response: {
  success: true,
  data: ExamSession[] (with student, assessment, events)
}
```

### Answer Submission

**POST `/api/v1/exams/sessions/{id}/answers`**
```typescript
Request: {
  questionId: string,
  answer: string, // JSON serialized
}

Response: {
  success: true,
  data: { answerId, questionId, submittedAt }
}
```

**PATCH `/api/v1/exams/sessions/{id}/submit`**
```typescript
Request: { force?: boolean }
Response: {
  success: true,
  data: {
    id,
    status: "submitted",
    submittedAt,
    score,
    totalPoints,
  }
}
```

### Event Logging

**POST `/api/v1/exams/sessions/{id}/events`**
```typescript
Request: {
  eventType: "tab_switch" | "copy_paste" | "window_blur" | "camera_detected_none" | "suspicious_movement",
  severity: "info" | "warning" | "critical",
  description?: string,
  metadata?: Record<string, any>,
}

Response: {
  success: true,
  data: { eventId, eventType, severity, timestamp }
}
```

### Monitoring & Security

**GET `/api/v1/exams/{id}/security-report`**
```typescript
Response: {
  success: true,
  data: {
    suspiciousEvents: number,
    tabSwitches: number,
    copyCounts: number,
    focusLosses: number,
    riskScore: 0-100,
    events: ExamEvent[],
    warnings: ExamWarning[],
  }
}
```

**POST `/api/v1/exams/sessions/{id}/warnings`**
```typescript
Request: {
  warningType: "time_low" | "behavior_suspicious" | "multiple_tabs" | "camera_issue",
  message: string,
}

Response: { success: true, data: { id, warningType, createdAt } }
```

---

## Module H: Notifications API

### Notification Hub

**GET `/api/v1/notifications/hub`**
```typescript
Query: { 
  userId: string,
  limit?: number,
  category?: string,
}

Response: {
  success: true,
  data: NotificationHub[],
  pagination: { unreadCount, totalCount }
}
```

**POST `/api/v1/notifications`**
```typescript
Request: {
  userId: string,
  category: "assessment" | "behavior" | "communication" | "wellness" | "system",
  priority: "low" | "normal" | "high" | "critical",
  title: string,
  message: string,
  actionUrl?: string,
  actionLabel?: string,
  sourceType?: string,
  sourceId?: string,
  expiresAt?: ISO8601,
}

Response: {
  success: true,
  data: { id, userId, category, priority, createdAt }
}
```

### Notification Actions

**PATCH `/api/v1/notifications/{id}/read`**
```typescript
Response: { success: true, data: { id, isRead: true, readAt } }
```

**PATCH `/api/v1/notifications/{id}/dismiss`**
```typescript
Response: { success: true, data: { id, isDismissed: true, dismissedAt } }
```

**PATCH `/api/v1/notifications/{id}/archive`**
```typescript
Response: { success: true, data: { id, archivedAt } }
```

### Bulk Operations

**POST `/api/v1/notifications/batch`**
```typescript
Request: {
  userIds: string[],
  category: string,
  priority: string,
  title: string,
  message: string,
}

Response: {
  success: true,
  data: { createdCount: number }
}
```

**PATCH `/api/v1/notifications/batch/read`**
```typescript
Request: { notificationIds: string[] }
Response: { success: true, data: { updatedCount: number } }
```

### Preferences

**GET `/api/v1/notifications/preferences`**
```typescript
Query: { userId: string }
Response: {
  success: true,
  data: NotificationPreferences[]
}
```

**PATCH `/api/v1/notifications/preferences`**
```typescript
Request: {
  category: string,
  channel: "email" | "in_app" | "push" | "sms",
  enabled: boolean,
}

Response: { success: true, data: { id, category, channel, enabled } }
```

---

## Implementation Template

All routes should follow this pattern:

```typescript
import { withAuth } from '@/lib/route-middleware';
import { successResponse, errorResponse } from '@/lib/api-response';
import { logComplianceAudit } from '@/lib/audit';

export const POST = withAuth(
  ['SCHOOL_ADMIN', 'TEACHER'],
  async (req: Request, session: Session) => {
    try {
      // Validate input
      const body = await req.json();
      
      // Check authorization
      if (body.schoolId !== session.user.schoolId) {
        return errorResponse('Unauthorized', 403);
      }

      // Create resource
      const resource = await db.model.create({
        data: body,
      });

      // Log audit
      await logComplianceAudit({
        userId: session.user.id,
        schoolId: session.user.schoolId,
        action: 'CREATE',
        entityType: 'Model',
        entityId: resource.id,
      });

      return successResponse(resource);
    } catch (error) {
      return errorResponse('Internal server error', 500);
    }
  }
);
```

---

## Testing Checklist

For each endpoint:
- [ ] Happy path (valid input)
- [ ] Missing required fields
- [ ] Invalid field types
- [ ] Unauthorized access (wrong school)
- [ ] Rate limiting
- [ ] Audit logging
- [ ] Response format compliance

---

## Performance Notes

**Indices needed:**
```sql
CREATE INDEX idx_exam_sessions_status ON exam_sessions(status);
CREATE INDEX idx_exam_events_session ON exam_events(examSessionId);
CREATE INDEX idx_notifications_user_read ON notification_hubs(userId, isRead);
CREATE INDEX idx_signage_school_active ON emergency_signages(schoolId, isActive);
```

**Caching strategy:**
- Signage devices: 5 minutes
- Active exams: 30 seconds
- Notifications: 1 minute (invalidate on create)
- User preferences: 1 hour

**Pagination defaults:**
- Default limit: 20
- Max limit: 100
- Default page: 1
