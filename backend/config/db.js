const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'campuspulse',
  port: parseInt(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL Database Connected successfully to ' + (process.env.DB_NAME || 'campuspulse'));
    connection.release();
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    console.error('Please ensure MySQL server is running and configured correctly.');
  }
})();

module.exports = pool;
