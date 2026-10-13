-- Add idempotency and state history. Transitional schema only.
BEGIN;
CREATE TABLE IF NOT EXISTS escrow_state_events (
  event_id uuid PRIMARY KEY,
  escrow_id text NOT NULL,
  previous_state text,
  next_state text NOT NULL,
  actor_id text NOT NULL,
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS escrow_state_events_escrow_idx
  ON escrow_state_events(escrow_id, occurred_at);
CREATE UNIQUE INDEX IF NOT EXISTS app_records_firebase_uid_unique
  ON app_records ((payload->>'firebase_uid'))
  WHERE collection_name='users' AND payload ? 'firebase_uid';
COMMIT;
