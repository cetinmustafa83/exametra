# ExaMetra PRD Implementation Todo — Visual Roadmap

## Current Status: 30% Complete (Week 1)

```
COMPLETED THIS WEEK (Week 1):
✅ Calendar Consolidation (88% code reduction)
✅ Grading Consolidation (81% code reduction)
✅ Navigation Updates
```

---

## Critical Path: 8 Weeks to PRD Compliance

### WEEK 1 (This Week) — Foundation
```
[✅] Consolidate Calendar & Grading
[  ] API Response Standardization
[  ] useApi Hook Universal Implementation
[  ] Complete Module A: Academics Core
[  ] Complete Module K: Identity & Admin
```
**Blockers:** Everything else depends on these

---

### WEEK 2-3 — Legal & Core
```
[  ] Module L: GDPR/DSGVO Engine (CRITICAL FOR GERMANY)
[  ] Database: Add 39 missing tables
[  ] Module A: Complete Academics (Reports, Mastery Levels)
[  ] Module C: Escalation Policy Engine
[  ] Module I: Calendar (Complete, test business-day logic)
```
**Blockers:** Module L must complete before any school go-live

---

### WEEK 4 — Exam & Messaging
```
[  ] Module F: Exam Mode Browser Lockdown
[  ] Module C: Finish Escalation (with Module I integration)
[  ] Module H: Notifications Hub
```
**Blockers:** Exams need lockdown for use-case viability

---

### WEEK 5-6 — Extended Core
```
[  ] Module D: Learning Hub (Search, Progress)
[  ] Module G: Digital Notebook (Stylus Support)
[  ] Module B: Signage System
```
**Blockers:** None (after previous weeks)

---

### WEEK 7-8 — Polish & Extras
```
[  ] Module J: Dashboard Widgets
[  ] Module E: AI Tutor (Full Integration)
[  ] Testing & Hardening
[  ] Deployment Documentation
```
**Blockers:** None

---

## Module Implementation Status

| # | Module | Status | Size | Tests | Priority |
|---|--------|--------|------|-------|----------|
| A | Academics Core | 40% 🟡 | 8K LOC | None | 🔴 CRITICAL |
| B | Signage | 5% 🔴 | 2K LOC | None | 🟢 Low |
| C | Communication | 30% 🟡 | 6K LOC | None | 🔴 CRITICAL |
| D | Learning Hub | 20% 🔴 | 4K LOC | None | 🟢 Low |
| E | AI Tutor | 20% 🔴 | 3K LOC | None | 🟢 Low |
| F | Exam Mode | 35% 🟡 | 5K LOC | None | 🔴 CRITICAL |
| G | Digital Notebook | 10% 🔴 | 3K LOC | None | 🟢 Low |
| H | Notifications | 0% 🔴 | 4K LOC | None | 🟡 HIGH |
| I | Calendar | 70% 🟢 | 2K LOC | Basic | 🟡 HIGH |
| J | Dashboard | 40% 🟡 | 3K LOC | None | 🟢 Low |
| K | Identity & Admin | 50% 🟡 | 6K LOC | None | 🔴 CRITICAL |
| L | Legal/GDPR | 0% 🔴 | 5K LOC | None | 🔴 **LEGAL REQUIREMENT** |
| **TOTAL** | **12 Modules** | **30%** | **51K LOC** | **<5%** | **70% To Do** |

---

## Missing Database Tables (39 Required)

### Priority 1: Add This Week
```
Module L (GDPR):
[ ] DataRetentionPolicy
[ ] ConsentRecord  
[ ] AccessLog
[ ] DataExportRequest
[ ] BreachNotification

Module A (Academics):
[ ] MasteryLevelDefinition
[ ] ClassCompetencyAssignment
```

### Priority 2: Add Week 2
```
Module C (Communication):
[ ] EscalationPolicy
[ ] EscalationRequest
[ ] ClassMessagingLock

Module H (Notifications):
[ ] Notification
[ ] NotificationTemplate
[ ] NotificationDeliveryLog

Module I (Calendar):
[ ] SchoolCalendar
[ ] ClassPeriod
[ ] RecurrencePattern
```

### Priority 3: Add Week 3-4
```
Remaining 22 tables for Modules B, D, E, F, G, J
```

---

## Code Quality Metrics

### Current State
```
Components:        72 (HIGH DUPLICATION)
API Routes:        264 (INCONSISTENT)
LOC Total:         ~200K
Test Coverage:     <50%
Bundle Size:       ~2.5MB
```

### Target State (Week 8)
```
Components:        45 (consolidated)
API Routes:        80 (standardized)
LOC Total:         ~140K
Test Coverage:     70%+
Bundle Size:       ~1.8MB
```

### Reductions Needed
```
Components:        -27 (consolidate)
API Routes:        -184 (standardize)
LOC:               -60K (remove duplication)
Add Tests:         +2000 (increase coverage)
```

---

## Daily/Weekly Checklist

### Today's Work
- [x] Calendar consolidation completed
- [x] Grading consolidation completed
- [x] Navigation updated
- [x] PRD status report created
- [x] Todo list created

### This Week (Days 2-5)
- [ ] Review consolidation (performance test)
- [ ] Start API standardization
- [ ] Complete Module A DB schema
- [ ] Begin useApi hook refactor (first 10 routes)

### Next Week (Week 2)
- [ ] Complete useApi implementation (all 264 routes)
- [ ] Start Module L (GDPR)
- [ ] Add 10 priority DB tables
- [ ] Complete Module A academics core

---

## Risk Tracking

| Risk | Impact | Mitigation | Status |
|------|--------|-----------|--------|
| **Module L not ready for German law** | 🔴 CRITICAL | Start Week 1, hire legal consultant | ⚠️ At Risk |
| **Browser lockdown impossible** | 🟡 HIGH | Research Electron/Kiosk.js alternatives | ✅ Planned |
| **Database schema incomplete** | 🟡 HIGH | Add all 39 tables Week 1-2 | ⚠️ In Progress |
| **API inconsistency** | 🟡 HIGH | Standardize responses + middleware | 🚀 Starting |
| **Test coverage <5%** | 🟡 HIGH | Add 2000+ tests in parallel | ✅ Planned |

---

## Success Criteria (Week 8 Deliverable)

- [x] 12 modules defined
- [ ] 100% module feature parity with PRD
- [ ] All 39+ DB tables implemented
- [ ] 264 API routes standardized
- [ ] 70%+ test coverage
- [ ] Module L (GDPR) production-ready
- [ ] Zero hardcoded values (all DB-driven)
- [ ] Soft deletes + audit trail
- [ ] DPIA gating functional
- [ ] Self-hosting Docker image ready

---

## Deployment Timeline

```
Week 1-3:  Stabilize Foundation + Legal (Module L)
Week 4-6:  Implement Core Features (Modules A-H, K)
Week 7-8:  Polish, Test, Document, Deploy
Week 9:    Go-Live to Real School
```

---

## Notes

1. **Module L (GDPR) is non-negotiable** — German schools cannot use without it
2. **Database first** — Define all tables before UI code
3. **No hardcoding** — All rules, thresholds, templates must be DB-driven
4. **Tests early** — Each module needs tests, not afterthought
5. **Self-hosting path** — Docker + SQLite + local storage must work

---

**Created:** August 1, 2026  
**Target Completion:** September 26, 2026 (8 weeks)  
**Status:** On Track (with focused execution required)

