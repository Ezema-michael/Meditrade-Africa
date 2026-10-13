# Self-hosted PostgreSQL — VPS staging instructions

This stack provisions PostgreSQL **only**; it does not migrate data or switch application traffic.

1. On the VPS, use a private deployment directory with permissions 0700. Ensure Docker Compose is installed.
2. Copy `deploy/docker-compose.postgres.yml` to that directory and create `secrets/postgres_password` with a unique random password. Set file mode 0600. Never commit secrets.
3. Put `POSTGRES_DB=meditrade` and `POSTGRES_USER=meditrade_app` in a private `.env` file (mode 0600). Use a separate migration role for schema changes before production.
4. Start the database with `docker compose -f docker-compose.postgres.yml up -d postgres`.
5. Apply `db/001_initial.sql` using `psql` through the private Docker network or `docker compose exec -T postgres psql -U meditrade_app -d meditrade < db/001_initial.sql` when the SQL file is on the host.
6. Do not publish port 5432 on the public internet. When app and database run on different hosts, use a private VPN or tunnel and TLS with certificate verification.
7. Set up daily encrypted backups **off the VPS**, retention, monitoring, and regularly test restoration. A Docker volume alone is not a backup.
8. Do not point the production app at PostgreSQL until the data adapter, Firestore export/import, integrity reconciliation, authorization fixes and integration tests are complete.

The database password is read from a Docker secret file; no database credentials belong in GitHub.
