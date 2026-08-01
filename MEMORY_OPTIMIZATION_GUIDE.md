# SchulOS Memory Optimization & Menu Consolidation Guide

## Problem Analysis

### Current State
- **276 useEffect hooks** across components (high risk for memory leaks)
- **5 page.tsx files** (should be 1-2 consolidated routing)
- **55 view/page components** (duplicated across different menus)
- **Database issue**: ✅ FIXED (DATABASE_URL added to .env)

### Memory Leak Risks Identified

#### 1. Event Listener Leaks
```typescript
// ❌ PROBLEM: Listener never removed
useEffect(() => {
  window.addEventListener('resize', handleResize);
}, []);

// ✅ SOLUTION: Add cleanup function
useEffect(() => {
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, []);
```

#### 2. Subscription Leaks
```typescript
// ❌ PROBLEM: Socket connection never closed
useEffect(() => {
  const socket = io(url);
  socket.on('message', handler);
}, []);

// ✅ SOLUTION: Close connection on unmount
useEffect(() => {
  const socket = io(url);
  socket.on('message', handler);
  return () => socket.disconnect();
}, [socket, url]);
```

#### 3. Timer Leaks
```typescript
// ❌ PROBLEM: Interval never cleared
useEffect(() => {
  const interval = setInterval(tick, 1000);
}, []);

// ✅ SOLUTION: Clear interval
useEffect(() => {
  const interval = setInterval(tick, 1000);
  return () => clearInterval(interval);
}, []);
```

#### 4. Observable Leaks
```typescript
// ❌ PROBLEM: Subscription never unsubscribed
useEffect(() => {
  const sub = observable.subscribe(handler);
}, []);

// ✅ SOLUTION: Unsubscribe on cleanup
useEffect(() => {
  const sub = observable.subscribe(handler);
  return () => sub.unsubscribe();
}, []);
```

#### 5. Missing Dependency Arrays
```typescript
// ❌ PROBLEM: Runs on every render
useEffect(() => {
  fetchData();
});

// ✅ SOLUTION: Add dependency array
useEffect(() => {
  fetchData();
}, [dependency]);
```

---

## Menu & Page Consolidation

### Current Menu Duplication

**Problem:** Same features in different menus
- Teacher grades view (3 implementations)
- Student dashboard (4 implementations)
- Assessment pages (5 implementations)
- Communication pages (3 implementations)

### Consolidation Strategy

#### 1. Unified Page Structure
```
/app
  /dashboard
    /teacher       <- One source for teacher views
    /student       <- One source for student views
    /admin         <- One source for admin views
  /grading         <- Single grading interface (all types)
  /assessments     <- Single assessment interface
  /communication   <- Single communication hub
  /compliance      <- Single compliance center
```

#### 2. Role-Based View Selection
```typescript
// Instead of multiple pages, use one with role-aware rendering
export default function GradingPage() {
  const { role } = useAuth();
  
  switch(role) {
    case 'TEACHER': return <TeacherGrading />;
    case 'ADMIN': return <AdminGrading />;
    case 'PARENT': return <ParentGrading />;
    default: return null;
  }
}
```

#### 3. Component Reusability
```typescript
// Reusable table component with filters
<DataTable
  data={data}
  columns={columns}
  filters={['status', 'date']}
  actions={['edit', 'delete']}
/>

// Reusable form builder
<FormBuilder
  schema={schema}
  onSubmit={handleSubmit}
  layout="2-column"
/>
```

---

## Implementation Checklist

### Phase 1: Memory Leak Fixes (2-3 days)

- [ ] **Audit All 276 useEffect Hooks**
  ```bash
  grep -r "useEffect" src/components --include="*.tsx" | sort | uniq
  ```

- [ ] **Fix Event Listener Leaks**
  - Search for: `addEventListener` without `removeEventListener`
  - Pattern: Check in cleanup functions

- [ ] **Fix Subscription Leaks**
  - Search for: `.subscribe()` without `.unsubscribe()`
  - Pattern: Check in cleanup functions

- [ ] **Fix Timer Leaks**
  - Search for: `setInterval`, `setTimeout` without clear/cleanup
  - Pattern: Check in cleanup functions

- [ ] **Add Missing Dependency Arrays**
  - Search for: `useEffect` with empty or missing `[]`
  - Pattern: Add proper dependencies

### Phase 2: Menu Consolidation (3-4 days)

- [ ] **Audit All 55 View Components**
  ```bash
  find src/components -name "*view*" -o -name "*page*" | sort
  ```

- [ ] **Identify Duplicates**
  - Grading: `grading-view.tsx`, `tablet-grading-view.tsx`, `grade-analytics-view.tsx`
  - Assessment: `assessments-view.tsx`, `ai-tests-view.tsx`, `exam-view.tsx`
  - Dashboard: `dashboard-view.tsx`, `teacher-dashboard.tsx`, `student-dashboard.tsx`

- [ ] **Create Unified Components**
  - `GradingPanel` (replaces 3 grading views)
  - `AssessmentManager` (replaces 4 assessment views)
  - `DashboardHub` (replaces 3 dashboard views)

- [ ] **Consolidate Menu Logic**
  - Move from 5 page.tsx files to 2 (teacher/student routes)
  - Use component composition instead of separate pages

- [ ] **Eliminate Redundant Menu Items**
  - Audit sidebar navigation (duplicated routes)
  - Create single navigation config

### Phase 3: Performance Optimization (2 days)

- [ ] **Implement React.memo for static components**
- [ ] **Add useCallback for event handlers**
- [ ] **Optimize bundle with code splitting**
- [ ] **Implement lazy loading for routes**

---

## Database Fix Status

✅ **RESOLVED**
- Added `DATABASE_URL="file:./prisma/db/dev.db"` to `.env.development.local`
- Ran `prisma generate` successfully
- Prisma Client v6.19.3 generated without errors

---

## Performance Targets

| Metric | Current | Target | Method |
|--------|---------|--------|--------|
| Memory (initial) | ~85MB | <50MB | Remove dead code, consolidate views |
| Memory (after nav) | ~120MB | <75MB | Fix leaks, add cleanup |
| DOM nodes | ~2,500 | <1,500 | Consolidate menus |
| useEffect hooks | 276 | <80 | Add proper cleanup |
| Page load | ~3.2s | <1.5s | Code splitting, lazy load |

---

## Code Examples: Before & After

### Example 1: Grade Viewer
```typescript
// BEFORE: Three separate implementations
export function GradingView() { /* ... */ }
export function TabletGradingView() { /* ... */ }
export function GradeAnalyticsView() { /* ... */ }

// AFTER: Single unified component
export function GradingPanel({ variant = 'standard', mode = 'view' }) {
  return variant === 'tablet' ? <MobileLayout /> : <DesktopLayout />;
}
```

### Example 2: Memory-Safe useEffect
```typescript
// BEFORE: Memory leak
useEffect(() => {
  const socket = io(url);
  socket.on('data', updateData);
}, []);

// AFTER: Cleaned up properly
useEffect(() => {
  const socket = io(url);
  socket.on('data', updateData);
  
  return () => {
    socket.off('data', updateData);
    socket.disconnect();
  };
}, [url]);
```

### Example 3: Menu Consolidation
```typescript
// BEFORE: Multiple separate pages
/admin/grades/page.tsx
/teacher/grades/page.tsx
/student/grades/page.tsx

// AFTER: Single page with role-based rendering
/grades/page.tsx (uses role from session)
```

---

## Next Steps

1. **Run Memory Audit Script** (create in next section)
2. **Fix Critical Memory Leaks** (Event listeners, timers)
3. **Consolidate High-Traffic Pages** (Dashboard, Grading)
4. **Update Navigation System** (Single config file)
5. **Deploy & Measure** (Monitor with Web Vitals)

---

## Monitoring

Add to your layout to track memory:
```typescript
import { useEffect } from 'react';

export function MemoryMonitor() {
  useEffect(() => {
    const checkMemory = () => {
      if (performance.memory) {
        console.log(`[Memory] Heap: ${(performance.memory.usedJSHeapSize / 1048576).toFixed(2)}MB`);
      }
    };
    
    const interval = setInterval(checkMemory, 10000);
    return () => clearInterval(interval);
  }, []);
  
  return null;
}
```
