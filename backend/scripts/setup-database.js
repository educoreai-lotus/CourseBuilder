import pgPromise from 'pg-promise';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Connect to default 'postgres' database first to create our database
const adminConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: 'postgres', // Connect to default database
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
};

const pgp = pgPromise();
const adminDb = pgp(adminConfig);

const targetDbName = process.env.DB_NAME || 'coursebuilder';

/**
 * Create database if it doesn't exist
 */
async function setupDatabase() {
  try {
    console.log('🔍 Checking PostgreSQL connection...');

    // Test connection to admin database
    await adminDb.one('SELECT NOW()');
    console.log('✅ Connected to PostgreSQL server');

    // Check if database exists
    const dbExists = await adminDb.oneOrNone(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [targetDbName]
    );

    if (dbExists) {
      console.log(`✅ Database '${targetDbName}' already exists`);
    } else {
      console.log(`📦 Creating database '${targetDbName}'...`);
      // Note: CREATE DATABASE cannot be run in a transaction
      await adminDb.none(`CREATE DATABASE ${targetDbName}`);
      console.log(`✅ Database '${targetDbName}' created successfully`);
    }

    // Close admin connection
    await pgp.end();

    console.log('\n🎉 Database setup complete!');
    console.log('\n📝 Next steps:');
    console.log('   1. Run migrations: npm run migrate');
    console.log('   2. Seed test data: npm run seed');
    console.log('   3. Or reset everything: npm run db:reset');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure PostgreSQL is installed and running');
    console.error('   2. Check your .env file has correct DB credentials');
    console.error('   3. Verify PostgreSQL service is started');
    console.error('   4. For Windows: Check Services (services.msc) for "PostgreSQL"');
    console.error('   5. For Linux/Mac: Run "sudo service postgresql start" or "brew services start postgresql"');
    process.exit(1);
  }
}

setupDatabase();

