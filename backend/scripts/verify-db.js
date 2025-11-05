import db, { pgp } from '../config/database.js';

async function verifyDatabase() {
  try {
    console.log('🔍 Verifying database connection and tables...\n');

    // Check tables
    const tables = await db.any(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`✅ Database connected successfully!`);
    console.log(`📊 Found ${tables.length} tables:\n`);
    
    tables.forEach(table => {
      console.log(`   ✓ ${table.table_name}`);
    });

    // Check course count
    try {
      const courseCount = await db.one('SELECT COUNT(*) as count FROM courses');
      console.log(`\n📚 Courses in database: ${courseCount.count}`);
    } catch (e) {
      console.log('\n⚠️  Courses table might be empty or not created yet');
    }

    console.log('\n🎉 Database is ready to use!');
    
  } catch (error) {
    console.error('❌ Database verification failed:', error.message);
    process.exit(1);
  } finally {
    await pgp.end();
  }
}

verifyDatabase();

