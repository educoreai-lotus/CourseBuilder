/**
 * Generate ECDSA P-256 key pair for course-builder-service
 * 
 * Usage:
 *   node scripts/generate-service-keys.js
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SERVICE_NAME = 'course-builder-service';

console.log('\n' + '='.repeat(70));
console.log('🔐 GENERATING ECDSA P-256 KEY PAIR');
console.log('='.repeat(70) + '\n');
console.log(`Service Name: ${SERVICE_NAME}\n`);

try {
  // Generate ECDSA P-256 key pair
  console.log('📝 Generating key pair...');
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1', // P-256
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem'
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem'
    }
  });

  console.log('✅ Key pair generated successfully!\n');

  // Display keys
  console.log('='.repeat(70));
  console.log('🔑 PRIVATE KEY (PEM)');
  console.log('='.repeat(70));
  console.log(privateKey);
  console.log('');

  console.log('='.repeat(70));
  console.log('🔑 PUBLIC KEY (PEM)');
  console.log('='.repeat(70));
  console.log(publicKey);
  console.log('');

  // Save keys to files
  const privateKeyPath = path.join(__dirname, '..', 'course-builder-private-key.pem');
  const publicKeyPath = path.join(__dirname, '..', 'course-builder-public-key.pem');

  fs.writeFileSync(privateKeyPath, privateKey, 'utf8');
  fs.writeFileSync(publicKeyPath, publicKey, 'utf8');

  console.log('='.repeat(70));
  console.log('💾 KEYS SAVED');
  console.log('='.repeat(70));
  console.log(`Private Key: ${privateKeyPath}`);
  console.log(`Public Key: ${publicKeyPath}\n`);

  console.log('⚠️  IMPORTANT: These keys are NOT committed to git.');
  console.log('   Keep them secure and local only!\n');

  console.log('✅ Key generation completed!\n');

} catch (error) {
  console.error('\n❌ Error generating key pair:');
  console.error(`   ${error.message}`);
  console.error(error.stack);
  process.exit(1);
}
