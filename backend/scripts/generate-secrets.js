#!/usr/bin/env node
/**
 * Generate secure random secrets for deployment
 * Run from project root: node scripts/generate-secrets.js
 * Or from backend: node scripts/generate-secrets.js
 */

import crypto from 'crypto';

console.log('🔐 Generating Secure Secrets for Course Builder\n');
console.log('Copy these values to your cloud platform environment variables:\n');
console.log('='.repeat(60));

const secrets = {
  JWT_SECRET: crypto.randomBytes(32).toString('hex'),
  REFRESH_TOKEN_SECRET: crypto.randomBytes(32).toString('hex'),
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  SERVICE_CLIENT_SECRET: crypto.randomBytes(32).toString('hex'),
};

for (const [key, value] of Object.entries(secrets)) {
  console.log(`${key}=${value}`);
}

console.log('='.repeat(60));
console.log('\n⚠️  IMPORTANT: Store these securely and never commit them to Git!');
console.log('✅ Add them to Railway (backend) and Vercel (frontend) environment variables.\n');


