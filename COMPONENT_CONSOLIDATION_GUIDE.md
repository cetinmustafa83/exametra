# Component Consolidation Guide

## Overview
This guide consolidates 55+ duplicated components into 12 unified modules.
Target: 50% code reduction in components directory.

---

## Priority 1: High-Duplication Components

### 1. Communication System
**Current State:**
- `communication-view.tsx` (800 lines)
- `parent-communication-view.tsx` (900 lines)
- Total: 1,700 lines of 85% similar code

**Consolidated Solution:**
- ✅ Created `unified-communication.tsx` (wrapper)
- Uses unified-nav-menu for role-based filtering
- Both views now auto-select based on user role

**Migration Path:**
1. Update imports in parent pages to use `UnifiedCommunication`
2. Keep both views as internal implementations
3. Remove direct imports from pages

---

### 2. Navigation System
**Current State:**
- Multiple navigation implementations
- Duplicated menu building logic
- Inconsistent route references

**Consolidated Solution:**
- ✅ Created `navigation-config.ts` (centralized config)
- ✅ Created `unified-nav-menu.tsx` (single component)
- Single source of truth for all routes

**Benefits:**
- Change route once, updates everywhere
- Role-based filtering in one place
- Compliance gates centralized (Module L)

**Action Items:**
```typescript
// OLD: Multiple nav implementations
import { TeacherNav } from './teacher-nav'
import { StudentNav } from './student-nav'
import { ParentNav } from './parent-nav'

// NEW: Single unified nav
import { UnifiedNavMenu } from '@/components/unified-nav-menu'

<UnifiedNavMenu orientation="vertical" />
```

---

### 3. Data Tables (8 implementations)
**Current State:**
- analytics-table.tsx
- attendance-table.tsx
- grades-table.tsx
- behavior-table.tsx
- assessments-table.tsx
- competitors-table.tsx
- notebook-table.tsx
- messages-table.tsx

**Problem:** 85% identical code, only differs in columns/data

**Consolidated Solution:**
- Already created: `data-table.tsx` (reusable)
- Configure via column definitions, not code duplication

**Implementation:**
```typescript
// Define columns once
const gradesColumns: ColumnDef<Grade>[] = [
  { accessorKey: 'subject', header: 'Subject' },
  { accessorKey: 'grade', header: 'Grade' },
  // ... more columns
];

// Use generic table
<DataTable
  columns={gradesColumns}
  data={grades}
  onSort={handleSort}
  onFilter={handleFilter}
  actionButtons={[/* actions */]}
/>
```

**Consolidation Checklist:**
- [ ] Extract column definitions to separate files
- [ ] Replace all 8 table components with `DataTable`
- [ ] Verify sorting, filtering, pagination work
- [ ] Delete original 8 files
- [ ] Expected saving: ~3,000 lines

---

### 4. Forms (10+ implementations)
**Current State:**
- student-form.tsx
- grade-entry-form.tsx
- assessment-creation-form.tsx
- behavior-incident-form.tsx
- wellness-check-form.tsx
- message-compose-form.tsx
- notebook-form.tsx
- And more duplicates

**Consolidated Solution:**
- Already created: `form-builder.tsx` (schema-driven)

**Implementation:**
```typescript
// Define schema once
const gradeSchema = z.object({
  subject: z.string(),
  grade: z.number().min(1).max(6),
  comment: z.string().optional(),
});

// Use generic builder
<FormBuilder
  schema={gradeSchema}
  onSubmit={handleSubmit}
  fields={['subject', 'grade', 'comment']}
/>
```

**Consolidation Checklist:**
- [ ] Extract form schemas to `schemas/forms/`
- [ ] Replace all 10+ forms with `FormBuilder`
- [ ] Test validation on all forms
- [ ] Delete original files
- [ ] Expected saving: ~4,000 lines

---

### 5. Analytics & Charts (4 implementations)
**Current State:**
- grade-analytics-view.tsx (600 lines)
- attendance-analytics.tsx (500 lines)
- behavior-analytics.tsx (550 lines)
- competency-analytics.tsx (480 lines)

**Problem:** Same charting logic, different data sources

**Consolidated Solution:**
```typescript
// Centralized chart configs
const chartConfigs = {
  GRADES: { type: 'bar', color: 'emerald', metrics: ['grade', 'trend'] },
  ATTENDANCE: { type: 'line', color: 'blue', metrics: ['present', 'absent'] },
  BEHAVIOR: { type: 'area', color: 'red', metrics: ['incidents', 'warnings'] },
};

// Generic analytics component
<AnalyticsPanel
  type="GRADES"
  data={gradesData}
  config={chartConfigs.GRADES}
/>
```

**Expected saving:** ~2,000 lines

---

## Priority 2: Medium-Duplication Components

### 6. Dashboard Widgets (4 variations)
**Consolidation:** Use `widget-container.tsx` + `dashboard-customizer.tsx`

### 7. Modal/Dialog Components (6+ duplicates)
**Consolidation:** Use `confirm-dialog.tsx` for confirmations

### 8. Status Badges (5+ implementations)
**Consolidation:** Create centralized `status-badge.tsx`

---

## Priority 3: API & Data Patterns

### 9. API Hooks (60+ manual fetch patterns)
**Solution:** Use `useApi()` hook everywhere

**Migration:**
```typescript
// OLD
const [data, setData] = useState([]);
useEffect(() => {
  fetch('/api/grades').then(r => r.json()).then(setData);
}, []);

// NEW
const { data } = useApi('/api/grades', { revalidateOnFocus: true });
```

### 10. Response Handling (100+ duplicated patterns)
**Solution:** Use `api-response.ts` wrapper

---

## Expected Results After Consolidation

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Component files | 55 | 12 | 78% |
| Total LOC | ~18,000 | ~9,000 | 50% |
| Form code | 4,000 | 400 | 90% |
| Table code | 3,000 | 300 | 90% |
| Navigation LOC | 2,000 | 300 | 85% |
| API calls | 60+ patterns | 1 hook | 99% |
| Bundle size | 450KB | 300KB | 33% |
| Bundle (gzip) | 120KB | 75KB | 37% |

---

## Implementation Timeline

**Week 1:**
- [ ] Day 1: Consolidate navigation (UnifiedNavMenu)
- [ ] Day 2: Consolidate communication (UnifiedCommunication)
- [ ] Day 3: Consolidate data tables (replace all 8)
- [ ] Day 4: Consolidate forms (replace 10+)
- [ ] Day 5: Testing & verification

**Week 2:**
- [ ] Day 1-2: Consolidate analytics
- [ ] Day 3-4: Consolidate modals
- [ ] Day 5: Migration of remaining components

**Week 3:**
- [ ] Testing all user roles
- [ ] Performance benchmarking
- [ ] Documentation updates

---

## Success Criteria

- [ ] All 55 components mapped to 12 modules
- [ ] 50%+ code reduction achieved
- [ ] No functionality lost
- [ ] All tests passing
- [ ] Performance metrics improved
- [ ] Navigation works for all roles
- [ ] Compliance gates working (Module L)

---

## Files to Create (Already Done)

- ✅ `src/lib/navigation-config.ts` - Centralized routes
- ✅ `src/components/unified-nav-menu.tsx` - Single nav component
- ✅ `src/components/unified-communication.tsx` - Communication wrapper
- ✅ `src/components/data-table.tsx` - Generic table
- ✅ `src/components/form-builder.tsx` - Schema-driven forms
- ✅ `src/lib/hooks/useApi.ts` - Universal data fetching

## Files to Delete (During Migration)

- Will delete all 55 duplicated component files after verification
- Keep originals as backup until full migration complete

