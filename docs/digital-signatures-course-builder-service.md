# Digital Signatures for Course Builder Service

## Overview

Course Builder uses **ECDSA P-256 digital signatures** to authenticate all outbound requests to the Coordinator service. This ensures secure, verifiable communication between microservices.

## How It Works

### 1. **Signature Generation**

When Course Builder sends a request to Coordinator:

1. **Build Message**: Creates a message string:
   ```
   educoreai-{serviceName}-{payloadHash}
   ```
   - `serviceName`: `course-builder-service`
   - `payloadHash`: SHA-256 hash of the JSON payload

2. **Sign Message**: Uses Course Builder's **private key** to sign the message with ECDSA P-256

3. **Add Headers**: Includes in request headers:
   - `X-Service-Name`: `course-builder-service`
   - `X-Signature`: Base64-encoded signature

### 2. **Signature Verification**

When Coordinator responds:

1. **Extract Signature**: Reads `X-Service-Signature` header from Coordinator response

2. **Verify**: Uses Coordinator's **public key** to verify the response signature

3. **Validate**: Ensures the response hasn't been tampered with

## Key Files

### Private Key (Course Builder)
- **Location**: `backend/course-builder-private-key.pem` (local, not committed)
- **Usage**: Signs all outbound requests
- **Format**: ECDSA P-256 PEM format

### Public Key (Coordinator)
- **Location**: `services/course-builder-service/keys/coordinator-public-key.pem` (committed)
- **Usage**: Verifies Coordinator response signatures
- **Format**: ECDSA P-256 PEM format

## Implementation

### Signature Utility

Located in: `backend/utils/signature.js`

```javascript
import { generateSignature, verifySignature } from '../utils/signature.js';

// Generate signature for outbound request
const signature = generateSignature('course-builder-service', privateKey, payload);

// Verify Coordinator response
const isValid = verifySignature('coordinator', signature, coordinatorPublicKey, responseData);
```

### Coordinator Client

Located in: `backend/services/gateways/coordinatorClient.js`

- Automatically signs all requests
- Verifies Coordinator responses (optional)
- Loads keys from environment variables or local files

## Environment Variables

```env
SERVICE_NAME=course-builder-service
COORDINATOR_URL=https://coordinator-production-e0a0.up.railway.app
PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
COORDINATOR_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

## Gateway Pattern

All microservice-to-microservice communication now routes through Coordinator:

- **Content Studio**: `backend/services/gateways/contentStudioGateway.js`
- **Learner AI**: `backend/services/gateways/learnerAIGateway.js`
- **Assessment**: `backend/services/gateways/assessmentGateway.js`
- **Directory**: `backend/services/gateways/directoryGateway.js`

Each gateway:
1. Builds the envelope (`requester_service`, `payload`, `response`)
2. Sends via Coordinator with signature
3. Extracts and returns response data

## Security Benefits

✅ **Authentication**: Coordinator can verify requests are from Course Builder  
✅ **Integrity**: Detects if payloads are tampered with  
✅ **Non-repudiation**: Course Builder cannot deny sending signed requests  
✅ **Centralized Routing**: All MS-to-MS traffic goes through Coordinator

## Message Format

The signed message follows this format:

```
educoreai-{serviceName}-{payloadHash}
```

Example:
```
educoreai-course-builder-service-a1b2c3d4e5f6...
```

Where `a1b2c3d4e5f6...` is the SHA-256 hash of the JSON payload.

## Troubleshooting

### Signature Generation Fails
- Check `PRIVATE_KEY` is set in environment
- Verify private key file exists and is readable
- Ensure key is valid ECDSA P-256 format

### Coordinator Rejects Requests
- Verify `COORDINATOR_URL` is correct
- Check `X-Service-Name` and `X-Signature` headers are present
- Ensure Coordinator has Course Builder's public key registered

### Response Verification Fails
- Check `COORDINATOR_PUBLIC_KEY` is set
- Verify Coordinator public key file is correct
- Ensure Coordinator is signing responses correctly

## See Also

- `backend/utils/signature.js` - Signature utility functions
- `backend/services/gateways/coordinatorClient.js` - Coordinator client
- `services/course-builder-service/keys/` - Key storage
