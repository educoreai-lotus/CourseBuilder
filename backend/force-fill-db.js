/**
 * Force Fill Database
 * Ensures database is populated with all data
 */

import db, { pgp } from './config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function forceFillDatabase() {
  console.log('\n' + '='.repeat(70));
  console.log('🚀 FORCE FILLING DATABASE WITH ALL DATA');
  console.log('='.repeat(70) + '\n');
  
  try {
    // Import and run migrations
    console.log('📄 Step 1: Running migrations...\n');
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout: migrateOut, stderr: migrateErr } = await execAsync('npm run migrate', {
        cwd: process.cwd(),
        env: process.env
      });
      if (migrateOut) console.log(migrateOut);
      if (migrateErr && !migrateErr.includes('warning')) console.error('Migration errors:', migrateErr);
      console.log('✅ Migrations completed\n');
    } catch (migrateError) {
      console.error('⚠️  Migration error (continuing anyway):', migrateError.message);
    }
    
    // Import and run seeding
    console.log('🌱 Step 2: Seeding mock data...\n');
    try {
      const seedModule = await import('./scripts/seedMockData.js');
      await seedModule.default();
      console.log('✅ Seeding completed\n');
    } catch (seedError) {
      console.error('❌ Seeding failed:', seedError.message);
      console.error(seedError.stack);
      throw seedError;
    }
    
    // Verify
    console.log('='.repeat(70));
    console.log('✅ VERIFICATION');
    console.log('='.repeat(70) + '\n');
    
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
      console.log('❌ Database is still empty. Please check for errors above.\n');
    }
    
  } catch (error) {
    console.error('\n💥 Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pgp.end();
  }
}

forceFillDatabase();
