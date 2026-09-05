const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'db',
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASS,
  database: process.env.DATABASE_NAME || 'cats',
  waitForConnections: true,
  connectionLimit: 5,
  namedPlaceholders: true,
});

module.exports = { pool };
