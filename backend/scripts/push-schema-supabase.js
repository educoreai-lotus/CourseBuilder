/**
 * Quick script to push schema to Supabase
 * Alternative simpler version
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function pushToSupabase() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_URL;
  
  if (!connectionString) {
    console.error('❌ DATABASE_URL or SUPABASE_URL environment variable is required');
    console.error('\n💡 Get your connection string from Supabase:');
    console.error('   Project Settings → Database → Connection string');
    console.error('\n   Then set it as:');
    console.error('   export DATABASE_URL="postgresql://user:pass@host:port/db"');
    process.exit(1);
  }

  const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
  const schemaSQL = readFileSync(schemaPath, 'utf8');

  // Extract connection details for psql
  const url = new URL(connectionString.replace('postgresql://', 'http://'));
  const user = url.username;
  const password = url.password;
  const host = url.hostname;
  const port = url.port || '5432';
  const database = url.pathname.slice(1) || 'postgres';

  console.log('🚀 Pushing schema to Supabase...');
  console.log(`   Host: ${host}`);
  console.log(`   Database: ${database}\n`);

  // Use psql if available, otherwise use node script
  try {
    // Try using psql command
    const psqlCommand = `PGPASSWORD="${password}" psql -h ${host} -p ${port} -U ${user} -d ${database} -f "${schemaPath}"`;
    await execAsync(psqlCommand);
    console.log('\n✅ Schema successfully pushed to Supabase using psql!');
  } catch (psqlError) {
    // Fallback to Node.js execution
    console.log('⚠️  psql not found, using Node.js connection...\n');
    
    try {
      const { default: db } = await import('../config/database.js');
      await db.none(schemaSQL);
      console.log('\n✅ Schema successfully pushed to Supabase!');
    } catch (nodeError) {
      console.error('\n❌ Error pushing schema:');
      console.error(`   ${nodeError.message}`);
      process.exit(1);
    }
  }
}

pushToSupabase();







