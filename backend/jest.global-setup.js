/**
 * Global Test Setup
 * This runs once before all test suites
 * Sets up the test database: drops tables, runs migrations, seeds test data
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import setupTestDB from './tests/setupTestDB.js';
import seedTestData from './tests/testSeed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async () => {
  // Ensure NODE_ENV is set to test
  process.env.NODE_ENV = 'test';
  
  // Load .env.test file FIRST before any database connection
  dotenv.config({ path: path.join(__dirname, '.env.test') });
  
  console.log('🧪 Test environment initialized');
  console.log(`   Database: ${process.env.DB_NAME || 'course_builder_test'}`);
  console.log(`   DATABASE_URL: ${process.env.DATABASE_URL ? 'Set' : 'Not set'}\n`);
  
  // Run test database setup (drop tables, migrate)
  await setupTestDB();
  
  // Seed minimal test data
  await seedTestData();
};
