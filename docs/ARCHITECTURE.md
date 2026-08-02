# Architecture

SchoolOS is a single Next.js application with TypeScript, Prisma, and SQLite.
It is intentionally deployable as one self-hosted container for a single
school. Core personal data remains in SQLite; generated uploads, exports, and
backups live in persistent local storage.

## Components

- Next.js App Router hosts the UI and API routes.
- Prisma owns schema validation, migrations, and database access.
- SQLite is the default relational store. Use WAL mode in the deployment
  bootstrap and retain the database plus `-wal` and `-shm` files during backups.
- The storage layer uses local filesystem paths first. Future S3-compatible
  storage must use the same storage interface rather than feature-specific SDKs.
- `src/lib/storage.ts` is the single local filesystem boundary. It constrains
  uploads, exports, and backups to configured roots and rejects path traversal.
- Notification, Calendar, Policy, and Authorization remain shared services;
  feature modules must not create duplicate delivery, date, or permission logic.

## Deployment Boundary

`docker-compose.yml` runs the application with a named `/data` volume:

- `/data/db`: SQLite database files
- `/data/uploads`: uploaded evidence and documents
- `/data/exports`: generated reports and rights exports
- `/data/backups`: verified backups

Use a reverse proxy that terminates TLS in production. Configure
`NEXT_PUBLIC_APP_URL` with the public HTTPS URL.

## Security Notes

- Server-side authorization is mandatory; hiding navigation does not grant
  access control.
- Secrets belong only in `.env` or deployment secret management.
- AI is optional and must remain disabled until policy/DPIA gates allow it.
- This engineering documentation is not legal advice. A school must involve its
  DPO, Schultrager, and Personalrat before production use.
