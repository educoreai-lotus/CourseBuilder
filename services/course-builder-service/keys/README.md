# Coordinator Public Key

This directory contains the Coordinator service's public key for verifying JWT signatures.

## Files

- `coordinator-public-key.pem` - Coordinator's ECDSA P-256 public key

## Loading the Key in Course Builder

Example code to load the Coordinator public key:

```javascript
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load Coordinator public key
const coordinatorPublicKeyPath = path.join(
  __dirname,
  '..',
  'services',
  'course-builder-service',
  'keys',
  'coordinator-public-key.pem'
);

const coordinatorPublicKey = fs.readFileSync(coordinatorPublicKeyPath, 'utf8');

// Use with crypto.verify() for JWT signature verification
// Example:
// const isValid = crypto.verify(
//   'sha256',
//   Buffer.from(tokenParts[1], 'base64url'),
//   {
//     key: coordinatorPublicKey,
//     dsaEncoding: 'ieee-p1363'
//   },
//   Buffer.from(signature, 'base64url')
// );
```
