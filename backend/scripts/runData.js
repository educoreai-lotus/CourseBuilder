/**
 * Run Data Script - Check and optionally seed database
 */

import db, { pgp } from '../config/database.js';
import dotenv from 'dotenv';

dotenv.config();

async function runData() {
  try {
    console.log('🔍 Checking database data...\n');

    // Check courses count
    const courseCount = await db.one('SELECT COUNT(*)::int as count FROM courses');
    console.log(`📚 Total courses: ${courseCount.count}`);

    // Check topics count
    const topicCount = await db.one('SELECT COUNT(*)::int as count FROM topics');
    console.log(`📖 Total topics: ${topicCount.count}`);

    // Check modules count
    const moduleCount = await db.one('SELECT COUNT(*)::int as count FROM modules');
    console.log(`📦 Total modules: ${moduleCount.count}`);

    // Check lessons count
    const lessonCount = await db.one('SELECT COUNT(*)::int as count FROM lessons');
    console.log(`📝 Total lessons: ${lessonCount.count}`);

    // Check registrations count
    const regCount = await db.one('SELECT COUNT(*)::int as count FROM registrations');
    console.log(`👤 Total registrations: ${regCount.count}`);

    // Show sample courses
    const courses = await db.any('SELECT id, course_name, course_type, status FROM courses ORDER BY created_at DESC LIMIT 5');
    console.log('\n📋 Sample courses:');
    courses.forEach(course => {
      console.log(`   - ${course.course_name} (${course.course_type}) - ${course.status}`);
    });

    console.log('\n✅ Data check complete!');
    
    if (courseCount.count === 0) {
      console.log('\n💡 Tip: Run "npm run seed:mock" to populate database with mock data');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      console.error('   Database connection failed. Check your DATABASE_URL environment variable.');
    }
  } finally {
    await pgp.end();
  }
}

runData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

