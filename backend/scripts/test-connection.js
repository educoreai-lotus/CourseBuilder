import db, { pgp } from '../config/database.js';

async function testConnection() {
  try {
    console.log('Testing database connection...\n');
    
    // Test basic connection
    const result = await db.one('SELECT NOW() as now, current_database() as db');
    console.log('✅ Connected to database:', result.db);
    console.log('✅ Server time:', result.now);
    
    // Try creating a simple test table
    console.log('\n📝 Creating test table...');
    await db.none(`
      CREATE TABLE IF NOT EXISTS test_table (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('✅ Test table created');
    
    // Check all tables
    const tables = await db.any(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    
    console.log(`\n📊 Found ${tables.length} tables:`);
    tables.forEach(t => console.log(`   - ${t.table_name}`));
    
    // Clean up test table
    await db.none('DROP TABLE IF EXISTS test_table');
    console.log('\n🧹 Cleaned up test table');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pgp.end();
  }
}

testConnection();

