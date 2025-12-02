/**
 * Fill Database - Complete Setup
 * Runs migrations and seeds all data
 */

import db, { pgp } from './config/database.js';
import dotenv from 'dotenv';
import seedMockData from './scripts/seedMockData.js';

dotenv.config();

async function runMigrations() {
  try {
    console.log('🔄 Running migrations...\n');
    
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    const { stdout, stderr } = await execAsync('npm run migrate', {
      cwd: process.cwd(),
      env: process.env
    });
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('warning')) {
      console.error('Migration warnings:', stderr);
    }
    
    console.log('✅ Migrations complete\n');
    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.stdout) console.log('Output:', error.stdout);
    if (error.stderr) console.error('Errors:', error.stderr);
    return false;
  }
}

async function checkConnection() {
  try {
    console.log('🔍 Checking database connection...\n');
    const result = await db.one('SELECT NOW() as now, current_database() as db');
    console.log(`✅ Connected to database: ${result.db}\n`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('\n💡 Please check:');
    console.error('   - Is PostgreSQL running?');
    console.error('   - Is DATABASE_URL correct in .env?');
    return false;
  }
}

async function fillDatabase() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 FILLING DATABASE WITH ALL DATA');
  console.log('='.repeat(60) + '\n');
  
  // Check connection
  const connected = await checkConnection();
  if (!connected) {
    await pgp.end();
    process.exit(1);
  }
  
  // Run migrations
  const migrated = await runMigrations();
  if (!migrated) {
    console.error('❌ Failed to run migrations');
    await pgp.end();
    process.exit(1);
  }
  
  // Seed data
  console.log('🌱 Seeding mock data...\n');
  try {
    await seedMockData();
    console.log('\n✅ Seeding complete!\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
    await pgp.end();
    process.exit(1);
  }
  
  // Verify
  console.log('='.repeat(60));
  console.log('✅ VERIFICATION\n');
  
  try {
    const courseCount = await db.one('SELECT COUNT(*)::int as count FROM courses');
    const topicCount = await db.one('SELECT COUNT(*)::int as count FROM topics');
    const moduleCount = await db.one('SELECT COUNT(*)::int as count FROM modules');
    const lessonCount = await db.one('SELECT COUNT(*)::int as count FROM lessons');
    const regCount = await db.one('SELECT COUNT(*)::int as count FROM registrations');
    
    console.log(`📚 Courses: ${courseCount.count}`);
    console.log(`📖 Topics: ${topicCount.count}`);
    console.log(`📦 Modules: ${moduleCount.count}`);
    console.log(`📝 Lessons: ${lessonCount.count}`);
    console.log(`👤 Registrations: ${regCount.count}\n`);
    
    if (courseCount.count > 0) {
      console.log('🎉 DATABASE SUCCESSFULLY FILLED!\n');
    } else {
      console.log('⚠️  Database appears to be empty. Check for errors above.\n');
    }
  } catch (error) {
    console.error('❌ Verification error:', error.message);
  }
  
  await pgp.end();
  console.log('='.repeat(60));
  console.log('✨ Done!\n');
}

fillDatabase().catch(err => {
  console.error('\n💥 Fatal error:', err);
  process.exit(1);
});
