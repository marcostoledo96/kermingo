import { getPool } from '../src/api/database/db.js';
import bcrypt from 'bcrypt';

const pool = getPool();
const hash = await bcrypt.hash('admin123', 10);
await pool.query(
  'UPDATE usuario SET contrasenia_hash = ? WHERE email = ?',
  [hash, 'admin@kermingo.com']
);
console.log('Admin hash updated. New hash:', hash);
await pool.end();
