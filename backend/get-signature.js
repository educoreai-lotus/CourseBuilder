/**
 * Generate signature for any payload
 * Usage: node get-signature.js [payload-json-string]
 * 
 * If no payload provided, generates signature for empty payload
 */

import { generateSignature } from './utils/signature.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get private key
let privateKey = process.env.PRIVATE_KEY;

if (!privateKey) {
  const privateKeyPath = path.join(__dirname, 'course-builder-private-key.pem');
  if (fs.existsSync(privateKeyPath)) {
    privateKey = fs.readFileSync(privateKeyPath, 'utf8');
  } else {
    console.error('❌ ERROR: Private key not found!');
    process.exit(1);
  }
}

const SERVICE_NAME = 'course-builder-service';

// Get payload from command line or use empty
let payload = {};
if (process.argv[2]) {
  try {
    // Handle PowerShell escaping - remove outer quotes if present
    let jsonString = process.argv[2];
    if ((jsonString.startsWith('"') && jsonString.endsWith('"')) || 
        (jsonString.startsWith("'") && jsonString.endsWith("'"))) {
      jsonString = jsonString.slice(1, -1);
    }
    payload = JSON.parse(jsonString);
  } catch (e) {
    console.error('❌ Invalid JSON payload');
    console.error('Error:', e.message);
    console.error('\nUsage: node get-signature.js \'{"key":"value"}\'');
    process.exit(1);
  }
}

// Generate signature
try {
  const signature = generateSignature(SERVICE_NAME, privateKey, payload);
  console.log(signature);
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}

