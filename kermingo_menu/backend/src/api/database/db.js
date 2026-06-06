import mysql from 'mysql2/promise';
import environments from '../config/environments.js';

const pool = mysql.createPool({
  host: environments.db.host,
  port: environments.db.port,
  user: environments.db.user,
  password: environments.db.password,
  database: environments.db.database,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de MySQL:', err.message);
});

export function getPool() {
  return pool;
}

export default pool;

