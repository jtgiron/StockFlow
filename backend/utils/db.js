// backend/utils/db.js
import { getPool, query as dbQuery } from "../database.js";

/**
 * Run a callback inside a transaction. Automatically commits on success
 * and rolls back on error. The callback receives a `query` function scoped
 * to the transaction client.
 */
export async function withTransaction(callback) {
  const client = await getPool().connect();

  try {
    await client.query("BEGIN");
    const result = await callback((text, params) => client.query(text, params));
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// pg_advisory_lock is session-scoped: lock and unlock must run on the same
// connection or the unlock is a no-op. Pin a pool client for the critical section.
export async function withAdvisoryLock(lockKey, callback) {
  const client = await getPool().connect();
  try {
    await client.query("SELECT pg_advisory_lock($1)", [lockKey]);
    try {
      return await callback();
    } finally {
      await client.query("SELECT pg_advisory_unlock($1)", [lockKey]);
    }
  } finally {
    client.release();
  }
}

export { dbQuery as query };
