// backend/database.js
import pkg from "pg";
const { Pool } = pkg;

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export const query = (text, params) => getPool().query(text, params);
