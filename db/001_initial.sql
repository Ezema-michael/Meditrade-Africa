-- MediTrade PostgreSQL foundation. Run with psql -v ON_ERROR_STOP=1.
BEGIN;
CREATE TABLE IF NOT EXISTS app_records (
 collection_name text NOT NULL,
 record_id text NOT NULL,
 payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (collection_name, record_id)
);
CREATE INDEX IF NOT EXISTS app_records_collection_idx ON app_records(collection_name);
CREATE TABLE IF NOT EXISTS payment_events (
 id uuid PRIMARY KEY,
 escrow_id text NOT NULL,
 provider text NOT NULL,
 provider_event_id text NOT NULL,
 event_type text NOT NULL,
 amount_minor bigint NOT NULL CHECK (amount_minor >= 0),
 currency char(3) NOT NULL,
 verified_at timestamptz NOT NULL,
 received_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(provider, provider_event_id)
);
CREATE INDEX IF NOT EXISTS payment_events_escrow_idx ON payment_events(escrow_id);
COMMIT;
