/**
 * Generate signature from a JSON file
 * Usage: node get-signature-from-file.js payload.json
 * Or: node get-signature-from-file.js (reads from stdin)
 */

import { generateSignature } from './utils/signature.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

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

// Get payload from file or stdin
let payload = {};

if (process.argv[2]) {
  // Read from file
  try {
    const filePath = process.argv[2];
    const fileContent = fs.readFileSync(filePath, 'utf8');
    payload = JSON.parse(fileContent);
  } catch (e) {
    console.error('❌ Error reading file:', e.message);
    process.exit(1);
  }
} else {
  // Read from stdin
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  let input = '';
  rl.on('line', (line) => {
    input += line;
  });
  
  rl.on('close', () => {
    try {
      if (input.trim()) {
        payload = JSON.parse(input);
      }
      generateAndPrint();
    } catch (e) {
      console.error('❌ Invalid JSON:', e.message);
      process.exit(1);
    }
  });
  
  function generateAndPrint() {
    try {
      const signature = generateSignature(SERVICE_NAME, privateKey, payload);
      console.log(signature);
    } catch (error) {
      console.error('❌ Error:', error.message);
      process.exit(1);
    }
  }
  
  // If stdin is not a TTY, read all at once
  if (!process.stdin.isTTY) {
    let data = '';
    process.stdin.on('data', chunk => data += chunk);
    process.stdin.on('end', () => {
      try {
        if (data.trim()) {
          payload = JSON.parse(data);
        }
        const signature = generateSignature(SERVICE_NAME, privateKey, payload);
        console.log(signature);
      } catch (e) {
        console.error('❌ Error:', e.message);
        process.exit(1);
      }
    });
  }
}

// If we have payload already (from file), generate signature
if (Object.keys(payload).length > 0 || process.argv[2]) {
  try {
    const signature = generateSignature(SERVICE_NAME, privateKey, payload);
    console.log(signature);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

