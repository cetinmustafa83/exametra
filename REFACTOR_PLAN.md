# ExaMetra Refactor Action Plan
## PRD v1 → v2 → Production Ready

**Current State Analysis:**
- 70+ view components
- 100+ API routes  
- Estimated 40% code duplication
- 4 major PRD v2 modules not implemented
- Multiple memory leak patterns (detected but mostly fixed)

---

## Phase 1: Quick Wins (Week 1)

### 1.1 Implement Centralized API Fetching Hook
**File:** `src/hooks/use-api.ts`

Replace the 60+ identical fetch patterns with SWR:

```tsx
// Before: Repeated in every component
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
useEffect(() => {
  fetch(`/api/xyz`)
    .then(r => r.json())
    .then(d => setData(d))
    .catch(e => setError(e))
    .finally(() => setLoading(false));
}, []);

// After: Single hook in 60+ places
const { data, isLoading, error, mutate } = useApi('/api/xyz');
```

**Impact:** Reduces component code by 30%, fixes data sync issues, enables optimistic updates.

**Affected Files:** 60+ components

---

### 1.2 Extract Reusable UI Components

#### `src/components/ui/data-table.tsx`
Used in: analytics, attendance, competitions, behavior-tracking, grade-analytics
- Sorting, filtering, pagination
- Configurable columns
- Batch actions

#### `src/components/forms/form-builder.tsx`
Used in: student entry, grade entry, assessment creation, subject management
- Schema-driven validation
- Reusable field types
- Error handling

#### `src/components/dialogs/confirm-dialog.tsx`
Used in: 12+ places (delete confirmations, cancel actions)
- Consistent styling
- Accessibility
- Custom actions

**Impact:** Eliminates 25+ duplicate component implementations.

---

### 1.3 Standardize API Response Format

**Current inconsistency:** Some routes return `{ data: [...] }`, others return bare array

**Standard format:**
```json
{
  "success": true,
  "data": [...],
  "error": null,
  "pagination": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

**Create middleware:** `src/lib/api-response.ts`

**Impact:** Simplifies error handling, enables consistent pagination, better client-side caching.

---

### 1.4 Create API Route Middleware

**Problem:** Every route duplicates:
```ts
const session = await getSession();
if (!session?.user?.id) return unauthorized();
await logAudit(session.user.id, action);
```

**Solution:** Higher-order middleware wrapper

```ts
// Before
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) return unauthorized();
  // 50+ lines of actual logic
  await logAudit(...);
}

// After
export const GET = withAuth(withAudit(async (req, context) => {
  // Just the business logic
  const data = await db.xyz.findMany();
  return apiResponse(data);
}));
```

**Affected:** All 100+ API routes

**Impact:** Reduces average route size by 40%, eliminates repeated auth/audit code.

---

## Phase 2: Fix Architectural Issues (Weeks 2-3)

### 2.1 Consolidate Grading Logic

**Current duplication:** 3 implementations
- `src/components/grading-view.tsx` — Main grading UI
- `src/components/tablet-grading-view.tsx` — Tablet variant
- `src/components/grade-analytics-view.tsx` — Analytics view

**Problem:** Logic inconsistencies, hard to maintain

**Solution:**
1. Extract grading engine → `src/lib/grading-engine.ts`
   - Pure functions for grade computation
   - Unit tested
   - Reusable everywhere

2. Create UI layer → `src/components/grading/`
   - `GradingForm.tsx` — Input component (reusable)
   - `GradingView.tsx` — Desktop view (uses GradingForm)
   - `TabletGradingView.tsx` — Tablet view (uses GradingForm + responsive)
   - `GradeAnalytics.tsx` — Analytics (uses grading-engine)

**Impact:** Single source of truth for grading logic, easier to test, consistent across UI.

---

### 2.2 Unify Assessment Creation

**Current duplication:** 3 implementations
- `assessments-view.tsx` — Standard assessments
- `ai-tests-view.tsx` — AI-generated tests
- `exam-calendar-view.tsx` — Exam scheduling + creation

**Solution:**
1. Create `AssessmentForm.tsx` — Reusable form component
2. Create `AssessmentType.tsx` — Form variant selector (standard/AI-generated/exam)
3. Refactor views to use form component

---

### 2.3 Implement Single Competency Renderer

**Current duplication:** 4 implementations
- `competence-flower-view.tsx` — Radar chart
- `competency-grid-view.tsx` — Grid view
- `mastery-matrix-view.tsx` — Matrix view (duplicate of above)
- `curriculum-coverage-view.tsx` — Coverage view

**Solution:**
```tsx
// New component with configurable layout
<CompetencyViewer
  layout="flower"  // or "grid" or "matrix" or "coverage"
  competencies={competencies}
  config={config}
/>
```

**Impact:** Single source of truth for competency data rendering.

---

### 2.4 Unify Calendar Implementations

**Current:** 3 separate calendar components
- `calendar-view.tsx` — General calendar
- `exam-calendar-view.tsx` — Exam-specific calendar
- `lesson-plans-view.tsx` — Lesson scheduling calendar

**Solution:** Single calendar with event type filtering
```tsx
<Calendar
  events={allEvents}
  eventTypeFilters={['lesson', 'exam', 'deadline']}
  config={config}
/>
```

---

## Phase 3: Implement Missing PRD v2 Modules (Weeks 4-6)

### 3.1 Module B — Digital Signage (Emergency Alerts, TV Displays)

**Required tables:**
- `SignageDisplay` — Physical displays
- `SignageSlide` — Content slides
- `SignagePlaylist` — Rotation config
- `EmergencyAlert` — Alert system

**Implementation:**
1. Create admin interface: `/admin/signage/displays`, `/admin/signage/slides`
2. Create display client: `/signage/display/[displayId]` (fullscreen kiosk)
3. Create push notifications for emergency alerts (integrate with Module H)
4. Add approval workflow for teacher-submitted slides

**Safety requirement:** Emergency alerts must override all displays immediately with push notification to staff.

**Effort:** 4–5 days

**Files to create:**
- `src/app/admin/signage/` — Admin pages
- `src/app/signage/display/` — Display client
- `src/components/signage/` — Reusable components
- `src/lib/signage-engine.ts` — Rotation logic

---

### 3.2 Module H — Centralized Notifications

**Required tables:**
- `Notification` — Unified notification model
- `NotificationPreference` — Per-user settings
- `NotificationSubscription` — Service worker subscriptions

**Implementation:**
1. Create `Notification` model unified for all alert types
2. Implement service worker + Web Push API
3. Create notification center UI: `/notifications`
4. Add real-time delivery via WebSocket
5. Refactor all modules to emit into this system instead of creating own alerts

**Current alerts to consolidate:**
- Exam warnings (from exam-calendar-view)
- Messages (from communication-view)
- System alerts (scattered)
- Signage emergencies (new from Module B)

**Effort:** 3–4 days

**Files to create:**
- `src/app/api/notifications/` — Notification API
- `src/app/api/push-subscriptions/` — Web Push setup
- `src/components/notification-center.tsx`
- `src/lib/notification-engine.ts`
- `src/lib/push-service-worker.ts`

---

### 3.3 Module J — Dashboard Widget System (Customizable Home)

**Current issue:** Dashboard monolithic (241KB), not reusable per spec

**Required tables:**
- `DashboardWidget` — Widget definitions
- `UserDashboardPreference` — Per-user layout
- `WidgetData` — Cached widget data (optional)

**Implementation:**
1. Create widget registry system
2. Create `Widget` wrapper component (read-only data consumer)
3. Create customization UI: `/dashboard/customize`
4. Refactor `dashboard-view.tsx` to use widget system
5. Make dashboard widgets available elsewhere (student portal, parent portal)

**Widgets to create (examples):**
- `AttendanceWidget` — Pulls from canonical attendance data
- `UpcomingExamsWidget` — Pulls from calendar
- `GradeWidget` — Pulls from grading system
- `RecentActivitiesWidget` — Pulls from audit log
- `WeatherWidget` — Optional external data

**Each widget must:**
- Fetch from single canonical source (no duplication)
- Be read-only in dashboard context
- Have configurable options (hidden by user preference)
- Load independently with skeleton state

**Effort:** 2–3 days

**Files to create:**
- `src/components/dashboard-widgets/` — Widget implementations
- `src/app/dashboard/customize/` — Customization page
- `src/lib/widget-registry.ts` — Widget system

---

### 3.4 Module F — Exam Mode (Kiosk Lockdown + Proctoring)

**Required tables:**
- `ExamSession` — Active exam session
- `ExamWarning` — Warning log
- `ExamIncidentEvent` — Incident tracking

**Implementation:**
1. Create `ExamSession` model + lifecycle (started → paused → resumed → ended)
2. Implement fullscreen kiosk UI: `/exam/[sessionId]`
3. Add browser-level lockdown:
   - Service worker intercepts navigation
   - Fullscreen API lock
   - Tab/window switching detection
4. Create teacher control panel: `/exam/monitor`
5. Implement warning system (3-strike auto-pause)
6. Add bathroom request flow + distress signal
7. Create incident logging + parent visibility

**Safety requirements:**
- Bathroom requests pause only that student's session
- Distress signal triggers immediate teacher alert
- 3rd warning auto-pauses (not teacher-initiated)
- All incidents logged for audit trail

**Effort:** 5–6 days (complex client-side security)

**Files to create:**
- `src/app/exam/[sessionId]/` — Kiosk page
- `src/app/exam/monitor/` — Teacher control panel
- `src/components/exam-mode/` — Exam UI components
- `src/lib/exam-lockdown.ts` — Kiosk logic
- `src/lib/service-worker-exam.ts` — Browser lockdown

---

## Phase 4: Consolidate Duplicates (Weeks 7-8)

After Phases 1-3, apply architectural changes:

1. **Merge grading implementations** → Single engine + UI variants
2. **Merge assessment creation** → Unified form component
3. **Merge competency renderers** → Configurable component
4. **Merge calendar implementations** → Single calendar with filters
5. **Delete 12+ duplicate utility functions** → Use shared lib

**Result:** Code reduction 30-40%.

---

## Phase 5: Configuration & Compliance (Week 9)

### 5.1 Database Configuration System

Migrate hardcoded values to database:

**Create `SystemConfig` table:**
```ts
{
  key: string (PK),
  value: string | number | boolean | JSON,
  description: string,
  editable: boolean,
  schoolId: string? (null = system-wide)
}
```

**Migrate:**
- Escalation wait period: "3 business days" → `Config["escalation.wait_days"]`
- Grading scales: hardcoded 1–6 → configurable per school
- Mastery levels: hardcoded 4 levels → configurable
- Report templates: hardcoded phrases → DB-driven

**Effort:** 2 days

---

### 5.2 Role-Based Permission UI

Implement UI-level permission checks:

```tsx
// Before: Just hidden, not prevented
{userRole === 'ADMIN' && <AdminButton />}

// After: Proper permission check
<ProtectedFeature feature="admin.grading" fallback={<LockedIcon />}>
  <AdminButton />
</ProtectedFeature>
```

**Effort:** 1 day

---

## Timeline Summary

| Phase | Duration | Completion |
|-------|----------|------------|
| Phase 1 (Quick Wins) | 1 week | Reduce duplication by 30% |
| Phase 2 (Architecture) | 2 weeks | Consolidate major duplicates |
| Phase 3 (Missing Modules) | 3 weeks | Implement B, H, J, F |
| Phase 4 (Consolidation) | 1 week | Final cleanup |
| Phase 5 (Config) | 1 week | Database config system |
| **Total** | **~9 weeks** | **Production ready** |

---

## Immediate Next Steps

1. **Create `use-api.ts` hook** — Replace 60+ fetch patterns
2. **Extract `DataTable`, `FormBuilder`, `ConfirmDialog`** — Eliminate 25+ duplicates
3. **Standardize API responses** — Middleware wrapper
4. **Start Module B (Signage)** — Critical safety feature

---

## Success Metrics

- [ ] Codebase reduced by 30% (duplication eliminated)
- [ ] All 11 PRD v2 modules implemented
- [ ] Zero memory leaks (verified with Chrome DevTools)
- [ ] All API responses standardized
- [ ] Role-based permissions enforced UI + backend
- [ ] Configuration system working
- [ ] Dashboard customization working
- [ ] Emergency alert system tested
- [ ] Exam mode kiosk tested
- [ ] Full test coverage for critical paths (>80%)

