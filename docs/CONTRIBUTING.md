# Contributing

## Setup

1. Use Node.js 22 and pnpm.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Install dependencies with `pnpm install`.
4. Generate Prisma client with `pnpm db:generate`.
5. Create local schema with `pnpm db:push` or run the reviewed migration flow.
6. Seed only non-production data with `pnpm db:seed`.
7. Start the app with `pnpm dev`.

## Required Checks

Run these before opening a pull request:

```bash
pnpm prisma validate
pnpm lint
pnpm test
pnpm typecheck
git diff --check
```

## Engineering Rules

- Use server-side authorization for every route. UI visibility is never a
  substitute for access control.
- Scope every school-owned query to the caller school. Scope teacher data to
  assigned classes, student data to self, and parent data to linked children.
- Use `src/lib/access-policy.ts` and `src/lib/role-access.ts` instead of
  duplicating access rules.
- Use `src/lib/storage.ts` for local files. Never assemble arbitrary paths from
  request input.
- Use the Calendar and Notification modules as shared sources, not local copies
  of deadlines or delivery logic.
- Keep new UI icon-based with Lucide. Do not introduce emoji UI affordances.
- Preserve existing palette, shared motion vocabulary, responsive behavior, and
  role-aware page ownership defined in `TODO.md`.
- Add a migration for every Prisma schema change and update relevant docs/tests.
- Do not add hardcoded policy values when a school-configurable policy is
  required.

## Pull Requests

- Keep a pull request narrowly scoped to one TODO phase item.
- Explain security, migration, audit, export/erasure, and retention effects.
- Include tests for authorization failures and cross-school IDOR attempts when
  a route handles school or student data.
- Do not commit `.env`, database files, backup files, uploaded documents, or
  generated test artifacts.
