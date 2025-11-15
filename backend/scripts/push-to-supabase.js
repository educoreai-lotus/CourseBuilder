/**
 * Push Database Schema to Supabase
 * 
 * This script reads the schema.sql file and executes it against Supabase
 * 
 * Usage:
 *   Set DATABASE_URL environment variable to your Supabase connection string
 *   node scripts/push-to-supabase.js
 * 
 * Or use individual connection parameters:
 *   DB_HOST=your-supabase-host
 *   DB_PORT=5432
 *   DB_NAME=postgres
 *   DB_USER=postgres
 *   DB_PASSWORD=your-password
 */

import pgPromise from 'pg-promise';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pgp = pgPromise({
  error(err, e) {
    if (e.cn) {
      console.error('❌ Connection error:', err.message);
    }
  }
});

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || process.env.SUPABASE_HOST,
  port: parseInt(process.env.DB_PORT || process.env.SUPABASE_PORT || '5432', 10),
  database: process.env.DB_NAME || process.env.SUPABASE_DB || 'postgres',
  user: process.env.DB_USER || process.env.SUPABASE_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.SUPABASE_PASSWORD,
  ssl: process.env.SUPABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false,
  max: 1, // Single connection for schema execution
};

// Use DATABASE_URL if provided (Supabase connection string)
const connectionString = process.env.DATABASE_URL || 
  process.env.SUPABASE_URL ||
  `postgresql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;

console.log('🔌 Connecting to Supabase...');
console.log(`   Host: ${dbConfig.host || 'from DATABASE_URL'}`);
console.log(`   Database: ${dbConfig.database || 'from DATABASE_URL'}`);

const db = pgp(connectionString);

async function pushSchema() {
  try {
    // Read the schema file
    const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
    console.log(`\n📖 Reading schema file: ${schemaPath}`);
    
    const schemaSQL = readFileSync(schemaPath, 'utf8');
    
    // Split by semicolons but keep them for execution
    // We'll execute the entire file as one transaction
    console.log('\n🚀 Executing schema...');
    console.log('   This may take a few moments...\n');
    
    // Execute the schema
    await db.none(schemaSQL);
    
    console.log('\n✅ Schema successfully pushed to Supabase!');
    console.log('\n📊 Tables created:');
    console.log('   - courses');
    console.log('   - topics');
    console.log('   - modules');
    console.log('   - lessons');
    console.log('   - assessments');
    console.log('   - feedback');
    console.log('   - registrations');
    console.log('   - versions');
    console.log('\n✨ Database rebuild complete!');
    
  } catch (error) {
    console.error('\n❌ Error pushing schema to Supabase:');
    console.error(`   ${error.message}`);
    
    if (error.message.includes('connection')) {
      console.error('\n💡 Make sure your DATABASE_URL or connection parameters are correct.');
      console.error('   You can find your Supabase connection string in:');
      console.error('   Project Settings → Database → Connection string');
    }
    
    if (error.message.includes('permission')) {
      console.error('\n💡 Make sure you have the correct database permissions.');
    }
    
    process.exit(1);
  } finally {
    pgp.end();
  }
}

// Verify connection before proceeding
db.connect()
  .then(obj => {
    console.log('✅ Connected to Supabase successfully!\n');
    obj.done();
    return pushSchema();
  })
  .catch(error => {
    console.error('❌ Failed to connect to Supabase:');
    console.error(`   ${error.message}\n`);
    console.error('💡 Please check your connection settings:');
    console.error('   - DATABASE_URL (recommended)');
    console.error('   - Or SUPABASE_URL');
    console.error('   - Or individual DB_* environment variables\n');
    process.exit(1);
  });



