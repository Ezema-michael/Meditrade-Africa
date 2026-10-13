import 'dotenv/config';
import { adminDb } from '../src/server/config/firebaseAdmin';
import { pgPool } from '../src/server/postgres';

const collectionNames = [
  'users','sellers','categories','listings','procurement_requests',
  'procurement_quotes','favorites','reports','verification_requests',
  'engineers','engineer_reviews','offers','escrow_deals',
  'financing_applications','inspections','leads','chats',
  'notifications','file_metadata','search_logs','activity_logs'
];

async function main() {
  if (process.env.CONFIRM_PG_IMPORT !== 'YES') {
    throw new Error('Set CONFIRM_PG_IMPORT=YES after verifying the destination and backup.');
  }
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
  if (!adminDb) throw new Error('Firebase Admin SDK is required for export');
  const client = await pgPool.connect();
  try {
    const database = await client.query('SELECT current_database() AS name');
    console.log('Destination PostgreSQL database:', database.rows[0].name);
    for (const name of collectionNames) {
      const snapshot = await adminDb.collection(name).get();
      await client.query('BEGIN');
      try {
        for (const document of snapshot.docs) {
          const record = JSON.stringify(document.data());
          await client.query(
            `INSERT INTO app_records(collection_name,record_id,payload)
             VALUES($1,$2,$3::jsonb)
             ON CONFLICT(collection_name,record_id) DO UPDATE
             SET payload=excluded.payload,updated_at=now()`,
            [name, document.id, record]
          );
        }
        const count = await client.query(
          'SELECT count(*)::int AS n FROM app_records WHERE collection_name=$1',
          [name]
        );
        if (count.rows[0].n !== snapshot.size) {
          throw new Error(`Count mismatch for ${name}: Firestore=${snapshot.size} PostgreSQL=${count.rows[0].n}`);
        }
        await client.query('COMMIT');
        console.log(`${name}: ${snapshot.size} records verified`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } finally {
    client.release();
    await pgPool.end();
  }
}
main().catch(err => { console.error(err); process.exitCode = 1; });
