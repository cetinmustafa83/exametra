# Self Hosting

## Prerequisites

- Docker Engine with Docker Compose plugin
- A DNS name and HTTPS reverse proxy for production use

## Quick Start

1. Copy `.env.example` to `.env`.
2. Set `NEXT_PUBLIC_APP_URL` to the public application URL.
3. Review storage and optional SMTP values.
4. Build and start the service with `docker compose up -d --build`.
5. Review logs with `docker compose logs -f schulos`.
6. Run Prisma migrations inside the service when a release includes migrations.
7. Seed demo data only in a non-production instance with `pnpm db:seed`.

The service listens on port `3000` by default. Set `SCHULOS_PORT` in `.env` to
change the host port.

## Request Origin Protection

All mutation requests below `/api/` require a matching `Origin` or `Referer`.
Set `NEXT_PUBLIC_APP_URL` to the public HTTPS origin. For an approved second
origin, such as a separate admin host, provide comma-separated origins. Do not
include wildcard origins.

## Backup

Back up the complete persistent volume, including the database, uploads,
exports, and backups. For SQLite in WAL mode, preserve the main `.db` file and
its `-wal` and `-shm` companions or use SQLite's online backup command.

Test restores into a separate disposable deployment before relying on a backup.
The in-app backup endpoint writes a school-scoped JSON file to `BACKUP_PATH` and
verifies its readability before a restore drill; it does not automatically
overwrite a live database.

### WAL And Verified SQLite Backups

Run the following commands from the deployment directory after setting the
production environment values:

```bash
pnpm db:wal
pnpm db:backup
```

`db:wal` enables WAL mode, normal synchronous behavior, foreign-key checks, and
a checkpoint. `db:backup` uses SQLite's online `.backup` command, writes the
copy to `BACKUP_PATH`, and runs `PRAGMA integrity_check` on the result. A
successful command prints the backup file path, byte size, and `integrity: ok`.

Inside Docker, run the same commands with:

```bash
docker compose exec schulos pnpm db:wal
docker compose exec schulos pnpm db:backup
```

Do not restore onto the active school deployment. Copy the verified backup to a
separate maintenance environment, set its `DATABASE_URL` to the copied file,
and complete a login and data-read smoke test first.

## Upgrade

1. Take and verify a backup.
2. Pull the reviewed release.
3. Run `docker compose up -d --build`.
4. Run required Prisma migrations.
5. Confirm health, login, and critical role workflows.

## Password Hash Migration

New passwords use Argon2id. Existing bcrypt password hashes remain valid for
one successful login and are transparently upgraded to Argon2id at that time.
No bulk password reset is required for this migration.

## Account Recovery

Password reset requests create a one-time, SHA-256-hashed token with the TTL
configured by `PASSWORD_RESET_TTL_SECONDS`. The API always returns the same
success message whether or not an account exists. In development only, or when
`AUTH_SHOW_RESET_TOKEN=true`, the raw token is returned for local testing.

By default, self-hosted registrations are marked verified immediately. Set
`AUTH_REQUIRE_EMAIL_VERIFICATION=true` only after integrating a reviewed email
verification delivery flow. TOTP and recovery-code enrollment remain a planned
security enhancement.

## Compliance Notice

This software can support privacy-compliant operations but is not legal advice.
The deploying school must involve its DPO, Schultrager, and Personalrat before
processing real student data.
