import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

const pgp = pgPromise({
  // Connection error handling
  error(err, e) {
    if (e.cn) {
      console.error('Connection error:', err.message);
    }
  }
});

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'coursebuilder',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: 30, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
};

// Use DATABASE_URL if provided (for Supabase/Railway), otherwise use individual config
const connectionString = process.env.DATABASE_URL || 
  `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;

// Create database instance
const db = pgp(connectionString);

// Test database connection
db.connect()
  .then(obj => {
    console.log('✅ Database connected successfully');
    obj.done(); // Release the connection
  })
  .catch(error => {
    console.error('❌ Database connection error:', error.message);
  });

export default db;
export { pgp };


