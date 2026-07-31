# Phase 2: Codebase Migration & Missing Modules (3-4 weeks)

## Overview
Build on Phase 1 infrastructure by migrating existing components and completing missing PRD modules.

## Part A: Component Migration (Week 2-3)

### Priority 1: High-Traffic Components
These fetch from multiple endpoints and cause duplicate requests.

#### 1. `app-layout.tsx` → Migrate to useApiGet()
**Current:** 6 manual fetch calls in separate useEffect blocks
**After:** Single `useApiQueries()` call with caching
**Impact:** ~40 lines → 10 lines, eliminates race conditions

```typescript
// Current (71 lines)
useEffect(() => { fetch('/api/announcements') }, []);
useEffect(() => { fetch('/api/schools') }, []);
useEffect(() => { fetch('/api/user') }, []);
// ... 6 times

// After (10 lines)
const { data } = useApiQueries([
  { url: '/api/announcements', key: 'announcements' },
  { url: '/api/schools', key: 'schools' },
  { url: '/api/user', key: 'user' },
]);
```

#### 2. `analytics-view.tsx` → Extract `AnalyticsDataFetcher` hook
**Current:** 3 useEffect blocks with manual filtering
**After:** Custom hook handling all data logic
**Impact:** Move 100 lines to hook, simplify component to UI-only

#### 3. `attendance-view.tsx` → Consolidate filters
**Current:** Separate state for class/date/filter
**After:** Unified filter state with `useApiGet()` query params
**Impact:** Reduce prop drilling, simplify component

#### 4. `assessments-view.tsx`, `ai-tests-view.tsx` → Merge
**Current:** 2 nearly identical views
**After:** Single `AssessmentsView` with tabs
**Impact:** 300 lines → 200 lines, single source of truth

### Priority 2: Form Components (8-10 each)
Replace with `FormBuilder` or create reusable form components.

#### Student Forms (3 locations)
- `students-view.tsx` - new student form
- `student-details.tsx` - edit student form
- `bulk-student-import.tsx` - batch form
**Strategy:** Create `StudentForm` component wrapping `FormBuilder`

#### Grade Forms (4 locations)
- `grading-view.tsx` - inline grading
- `grade-entry-modal.tsx` - modal grading
- `batch-grading.tsx` - bulk grading
- `ai-grading-audit.tsx` - audit comments
**Strategy:** Create `GradeForm` component using `grading-engine`

#### Assessment Forms (3 locations)
- `assessments-view.tsx` - create/edit
- `ai-tests-view.tsx` - create AI test
- `exam-calendar.tsx` - scheduled assessment
**Strategy:** Create `AssessmentForm` component

### Priority 3: Table Components (8 total)
Replace with unified `DataTable` component.

**Locations:**
- `students-view.tsx` - student list
- `grades-view.tsx` - grade entries
- `attendance-view.tsx` - attendance records
- `analytics-view.tsx` - performance analytics
- `assessments-view.tsx` - assessment list
- `competence-list.tsx` - competency list
- `library-view.tsx` - book inventory
- `report-builder.tsx` - report results

**Migration Pattern:**
```typescript
// Before (80 lines each)
const [sortBy, setSortBy] = useState('name');
const [filterText, setFilterText] = useState('');
// ... manual rendering ...

// After (5 lines)
<DataTable
  columns={columns}
  data={filteredData}
  searchableFields={['firstName', 'lastName', 'email']}
  actions={[{label: 'Edit', onClick: handleEdit}]}
/>
```

## Part B: API Route Migration (Week 2-3)

### Route Standardization Strategy
1. Pick one route family (e.g., `/api/v1/students`)
2. Apply middleware + response helpers
3. Test with client using new `useApiGet()`
4. Document as pattern
5. Apply to all other routes

### Priority Routes (in order)
1. **Students API** (4 routes)
   - GET /api/v1/students
   - POST /api/v1/students
   - GET /api/v1/students/[id]
   - PUT/DELETE /api/v1/students/[id]

2. **Grades API** (6 routes)
   - GET /api/v1/grades
   - POST /api/v1/grades
   - GET /api/v1/grades/[id]
   - PUT /api/v1/grades/[id]
   - DELETE /api/v1/grades/[id]
   - POST /api/v1/grades/batch

3. **Assessments API** (5 routes)
   - GET /api/v1/assessments
   - POST /api/v1/assessments
   - GET /api/v1/assessments/[id]
   - PUT/DELETE /api/v1/assessments/[id]

4. **Attendance API** (4 routes)

5. **Analytics API** (3 routes)

**Each route takes ~30 minutes after first one is done (pattern is clear)**

## Part C: Module Consolidation (Week 3)

### 1. Grading Logic Consolidation
**Status:** `grading-engine.ts` complete, need to refactor existing views

**Views to consolidate:**
- `grading-view.tsx` - manual grading
- `tablet-grading-view.tsx` - tablet UI
- `grade-analytics-view.tsx` - analytics
- `ai-grading-audit.tsx` - AI review + audit

**Steps:**
1. Replace all grading calculations with `grading-engine` functions
2. Use `GradingPanel` for UI
3. Keep AI audit logic separate (Module F feature)
4. Delete old view files after verification

### 2. Calendar Logic Consolidation
**Current:** 3 separate implementations
- `exam-calendar.tsx`
- `event-calendar.tsx`
- `school-calendar.tsx`

**Approach:**
1. Extract calendar engine (similar to grading-engine)
2. Create `CalendarComponent` wrapper
3. Pass different event types as props
4. Merge into single admin calendar view

### 3. Competency Visualization
**Current:** 4 different renderers
- `competence-flower-view.tsx`
- `competence-matrix.tsx`
- `competence-radar.tsx`
- `competence-list.tsx`

**Approach:**
1. Create `CompetencyViewer` component with visualization options
2. Accept `visualizationType` prop
3. Consolidate data fetching
4. Use same grading-engine for calculations

## Part D: Missing Modules (Week 3-4)

### Module B: Complete Signage System
**Database:** ✓ Complete
**Admin UI:** ✓ Core page created
**API:** Need to implement
**Display Client:** New component needed

**Work:**
1. Create signage API endpoints (2-3 hours)
2. Create display client component (1-2 hours)
3. WebSocket integration for live updates (2 hours)

### Module F: Exam Mode (Kiosk Lockdown)
**Database:** Needs `ExamSession`, `ExamLockdown` models
**Admin UI:** Exam configuration page
**Student UI:** Kiosk display component
**API:** Session management endpoints

**Work:** 4-5 days

### Module H: Notifications Hub
**Database:** Needs `Notification`, `NotificationPreference` models
**UI:** Unified notification center
**API:** Notification endpoints
**Integration:** Tie to existing alert system

**Work:** 3-4 days

### Module J: Dashboard Widgets
**Database:** Needs `DashboardWidget`, `WidgetPreference` models
**UI:** Widget system + library
**API:** Widget data endpoints
**Refactor:** Break current monolithic dashboard

**Work:** 4-5 days

## Effort Breakdown

| Task | Effort | Priority |
|------|--------|----------|
| Migrate app-layout to useApiGet | 4h | CRITICAL |
| Migrate other high-traffic components | 16h | HIGH |
| Replace table implementations | 8h | HIGH |
| Replace form implementations | 12h | HIGH |
| Standardize API routes | 32h | MEDIUM |
| Consolidate grading/calendar/competency | 12h | MEDIUM |
| Complete Module B Signage | 8h | HIGH |
| Implement Module F Exam Mode | 40h | CRITICAL |
| Implement Module H Notifications | 32h | HIGH |
| Implement Module J Widgets | 40h | HIGH |
| Testing & Documentation | 16h | MEDIUM |
| **Total** | **220 hours** | **3-4 weeks** |

## Success Metrics

After Phase 2:
- ✓ 0 duplicated table implementations
- ✓ 0 duplicated form implementations
- ✓ 0 duplicated grading logic
- ✓ All 100+ routes standardized
- ✓ 60+ components migrated to new hooks
- ✓ 4 missing modules implemented
- ✓ Codebase reduced from 200K → 140K LOC
- ✓ All components testable in isolation
- ✓ Full test coverage for business logic

## Implementation Order

**Week 2:**
1. Monday-Tuesday: Migrate app-layout, analytics-view, attendance-view
2. Wednesday: Consolidate forms
3. Thursday-Friday: Start API standardization with students routes

**Week 3:**
1. Monday-Tuesday: Continue API standardization
2. Wednesday: Consolidate grading/calendar/competency
3. Thursday-Friday: Module B completion, Module F start

**Week 4:**
1. Monday-Wednesday: Module F continuation
2. Thursday-Friday: Module H + Module J skeleton

This keeps the most impactful changes (code reduction, bug fixes) early while building new features in parallel.
