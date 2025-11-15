import pgPromise from 'pg-promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Load appropriate .env file based on NODE_ENV
if (process.env.NODE_ENV === 'test') {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  // Load .env.test file
  dotenv.config({ path: path.join(__dirname, '..', '.env.test') });
} else {
  // Load default .env file
  dotenv.config();
}

const pgp = pgPromise({
  // Connection error handling
  error(err, e) {
    if (e.cn) {
      console.error('Connection error:', err.message);
    }
  }
});

// Database connection configuration
// In test environment, use test database
const isTest = process.env.NODE_ENV === 'test';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: isTest ? (process.env.DB_NAME || 'course_builder_test') : (process.env.DB_NAME || 'coursebuilder'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  max: isTest ? 10 : 30, // Lower pool size for tests
  idleTimeoutMillis: isTest ? 10000 : 30000, // Faster cleanup in tests
  connectionTimeoutMillis: isTest ? 5000 : 2000,
};

// Use DATABASE_URL if provided (for Supabase/Railway), otherwise use individual config
// ⚠️ CRITICAL: In test environment, ensure we're using the test database
let connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  connectionString = `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;
} else if (isTest) {
  // Ensure DATABASE_URL points to test database
  if (!connectionString.includes('course_builder_test')) {
    console.warn('⚠️  WARNING: DATABASE_URL does not contain "course_builder_test". Test database name might be incorrect.');
  }
}

// Create database instance
const db = pgp(connectionString);

// Test database connection (only in non-test environment to avoid startup delays)
if (!isTest) {
  db.connect()
    .then(obj => {
      console.log('✅ Database connected successfully');
      obj.done(); // Release the connection
    })
    .catch(error => {
      console.error('❌ Database connection error:', error.message);
    });
}

export default db;
export { pgp };
