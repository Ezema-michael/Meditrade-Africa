import { Pool } from 'pg';
const connectionString = process.env.DATABASE_URL;
export const pgPool = new Pool({
  connectionString,
  max: Number(process.env.PG_POOL_MAX || 10),
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});
export async function pgHealthcheck() {
  const client = await pgPool.connect();
  try { await client.query('SELECT 1'); } finally { client.release(); }
}
export async function upsertRecord(collection: string, id: string, payload: unknown) {
  await pgPool.query(
    `INSERT INTO app_records(collection_name,record_id,payload)
     VALUES ($1,$2,$3::jsonb)
     ON CONFLICT(collection_name,record_id)
     DO UPDATE SET payload=excluded.payload,updated_at=now()`,
    [collection,id,JSON.stringify(payload)]
  );
}
export async function readRecords<T>(collection: string): Promise<T[]> {
  const result = await pgPool.query<{payload:T}>(
    'SELECT payload FROM app_records WHERE collection_name=$1 ORDER BY record_id',
    [collection]
  );
  return result.rows.map(row => row.payload);
}
export async function deleteRecord(collection: string, id: string) {
  await pgPool.query('DELETE FROM app_records WHERE collection_name=$1 AND record_id=$2',[collection,id]);
}
