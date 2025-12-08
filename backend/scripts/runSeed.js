import dotenv from 'dotenv';
dotenv.config();

console.log('🌱 Starting seed script...');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set' : 'NOT SET');

try {
  const seedMockData = await import('./seedMockData.js');
  console.log('✅ Seed module loaded');
  await seedMockData.default();
  console.log('✅ Seed completed');
  process.exit(0);
} catch (error) {
  console.error('❌ Seed failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}

