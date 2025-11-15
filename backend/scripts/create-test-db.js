/**
 * Script to create the test database
 * Run this once before running tests:
 *   node scripts/create-test-db.js
 */

import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

// Load default .env (not .env.test - we need to connect to default DB first)
dotenv.config();

const pgp = pgPromise();

// Connect to default postgres database to create test database
const adminDb = pgp({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: 'postgres', // Connect to default postgres database
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const testDbName = 'course_builder_test';

async function createTestDatabase() {
  try {
    console.log(`📦 Creating test database: ${testDbName}...`);

    // Check if database already exists
    const dbExists = await adminDb.oneOrNone(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [testDbName]
    );

    if (dbExists) {
      console.log(`✅ Database "${testDbName}" already exists.`);
      console.log('   Skipping creation.');
    } else {
      // Create database
      await adminDb.none(`CREATE DATABASE ${testDbName}`);
      console.log(`✅ Database "${testDbName}" created successfully!`);
    }
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`✅ Database "${testDbName}" already exists.`);
    } else {
      console.error('❌ Error creating test database:', error.message);
      throw error;
    }
  } finally {
    await adminDb.$pool.end();
    pgp.end();
  }
}

createTestDatabase()
  .then(() => {
    console.log('\n✨ Test database setup complete!');
    console.log('   You can now run: npm test');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed to create test database:', error);
    process.exit(1);
  });

