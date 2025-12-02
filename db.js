


// Express에서는 DB랑 직접 통신 x so 연결 객체 만듬
// 하지만 매번 커넥트 하면? 느림

// so pool 만들어서 최대 10개 정도의 DB 연결 시켜줌 
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true
});

module.exports = pool;
