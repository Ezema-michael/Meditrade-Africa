# PostgreSQL migration foundation

This branch is **not production-ready** and does not switch the existing Firestore application to PostgreSQL.

## Local database
Create a PostgreSQL database and a restricted application role. Set DATABASE_URL outside Git, then run:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/001_initial.sql
```

The `app_records` table is a transitional JSONB staging model to retain existing document shapes while replacing the storage adapter. It is **not** the final relational schema. In particular, escrow, offers, users, listings and financial accounting require normalized tables, foreign keys, constraints and transactional state transitions before cutover.

## Remaining work
1. Add `pg` and `@types/pg` to dependencies and regenerate the lockfile with `npm install`.
2. Inventory all Firestore collections and authoritative file-metadata reads, then replace the persistence adapter. Remove process-local arrays as the authoritative source of financial state.
3. Implement an authenticated, paginated Firestore export, validated PostgreSQL import, row-count/checksum reconciliation, and rollback procedure. Do not seed demonstration records in production.
4. Keep Firebase Auth, but bind accounts exclusively to verified Firebase UIDs and protect role transitions.
5. Rebuild escrow using SQL transactions, immutable provider-verified payment events and idempotency. Do not accept receipt acknowledgement as bank settlement.
6. Add integration tests with a real ephemeral PostgreSQL database and run CI before switching traffic.
7. Configure TLS, private networking, restricted DB roles, automated backups and tested restores.

Do not run the migration against production without a verified backup and maintenance/cutover plan.
