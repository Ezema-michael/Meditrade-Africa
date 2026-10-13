# Local-first migration runbook

The app is **not switched to PostgreSQL** yet. Firestore remains authoritative.

## Development setup

1. Create a local, untracked `.env` file with `POSTGRES_PASSWORD` set to a unique secret.
2. Run `docker compose --env-file .env -f deploy/docker-compose.local.yml up -d`.
3. Run the schema scripts in order:
   ```sh
   docker compose --env-file .env -f deploy/docker-compose.local.yml exec -T postgres psql -U meditrade -d meditrade < db/001_initial.sql
   docker compose --env-file .env -f deploy/docker-compose.local.yml exec -T postgres psql -U meditrade -d meditrade < db/002_integrity.sql
   ```
4. Run `npm install` to regenerate and commit `package-lock.json` after adding the PostgreSQL dependencies. The current branch's lockfile has **not** been regenerated; `npm ci` may fail until it is.
5. Set `DATABASE_URL` to the local PostgreSQL connection URL for future application integration. URL-encode any special characters in its password.

## Data migration

The `scripts/import-firestore-to-postgres.ts` script is a **staging importer**, not a production cutover tool. It requires a working Firebase Admin configuration, `DATABASE_URL`, `CONFIRM_PG_IMPORT=YES`, and initialized SQL schema. Do not run it against production without backups and a reviewed snapshot/export. It currently compares collection counts but does not yet verify content checksums, references, or concurrent source writes.

## Required before production

- Normalize marketplace tables and add referential constraints.
- Replace all API reads/writes to process-local arrays and Firestore with PostgreSQL queries.
- Use PostgreSQL transactions for escrow and offers.
- Ensure bank-transfer proof never sets `funds_deposited` without independent settlement verification.
- Fix role/status mutation and account binding to verified Firebase UIDs.
- Add integration tests, migration reconciliation, backup/restore tests and rollback procedures.
- Run `npm ci`, typecheck, tests and build in CI after lockfile update.

Do not deploy the current migration branch as production.
