/**
 * Update Migration File in Coordinator
 * 
 * This script ONLY updates the migration file in Coordinator.
 * It does NOT register the service - use registerWithCoordinator.js for that.
 * 
 * Usage:
 *   node backend/scripts/updateMigration.js
 * 
 * Environment Variables:
 *   COORDINATOR_URL - Coordinator service URL (default: https://coordinator-production-6004.up.railway.app)
 *   SERVICE_NAME - Service name (default: course-builder-service)
 *   SERVICE_ID - Service ID (optional, will look it up if not provided)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const COORDINATOR_URL = process.env.COORDINATOR_URL || 'https://coordinator-production-6004.up.railway.app';
const SERVICE_NAME = process.env.SERVICE_NAME || 'course-builder-service';
const SERVICE_ID = process.env.SERVICE_ID || '61011ad9-911e-4b0f-aac1-6ec2688d08fd';

// Read migration file
const migrationPath = path.join(__dirname, '..', '..', 'migration.json');
const migrationFile = JSON.parse(fs.readFileSync(migrationPath, 'utf8'));

/**
 * Get service ID by looking up the service name
 */
async function getServiceId() {
  if (SERVICE_ID) {
    console.log(`✅ Using provided Service ID: ${SERVICE_ID}\n`);
    return SERVICE_ID;
  }

  console.log(`🔍 Looking up Service ID for: ${SERVICE_NAME}\n`);
  try {
    const response = await fetch(`${COORDINATOR_URL}/services?includeAll=true`);
    const data = await response.json();
    
    if (data.success && data.services) {
      const service = data.services.find(s => s.serviceName === SERVICE_NAME);
      if (service) {
        const serviceId = service.serviceId || service.id;
        if (serviceId) {
          console.log(`✅ Found Service ID: ${serviceId}\n`);
          return serviceId;
        }
      }
    }
    
    throw new Error(`Service "${SERVICE_NAME}" not found in Coordinator`);
  } catch (error) {
    console.error('❌ Failed to get Service ID:', error.message);
    console.error('\n💡 You can provide SERVICE_ID as an environment variable:');
    console.error(`   SERVICE_ID=your-service-id node backend/scripts/updateMigration.js\n`);
    throw error;
  }
}

/**
 * Update migration file in Coordinator
 */
async function updateMigration(serviceId) {
  console.log('📤 Updating Migration File in Coordinator...\n');
  console.log(`Service ID: ${serviceId}`);
  console.log(`Coordinator URL: ${COORDINATOR_URL}\n`);

  const payload = {
    migrationFile: migrationFile.migrationFile
  };

  console.log('Migration file structure:');
  console.log(`- Version: ${migrationFile.migrationFile.version}`);
  console.log(`- Database tables: ${migrationFile.migrationFile.database.tables.length}`);
  console.log(`- API endpoints: ${migrationFile.migrationFile.api.endpoints.length}`);
  console.log(`- Dependencies: ${migrationFile.migrationFile.dependencies.length}`);
  console.log(`- Published events: ${migrationFile.migrationFile.events.publishes.length}`);
  console.log('\n');

  // Try POST first (for new migration), then PUT (for update)
  console.log('🔄 Attempting POST (new migration)...\n');
  let response = await fetch(`${COORDINATOR_URL}/register/${serviceId}/migration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  let data = await response.json();

  // If POST fails, try PUT (update existing migration)
  if (!response.ok) {
    console.log(`POST failed (${response.status}), trying PUT to update existing migration...\n`);
    response = await fetch(`${COORDINATOR_URL}/register/${serviceId}/migration`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    data = await response.json();
  }

  if (!response.ok) {
    console.error('❌ Migration Update Failed:');
    console.error(`Status: ${response.status} ${response.statusText}`);
    console.error(JSON.stringify(data, null, 2));
    throw new Error(`Migration update failed: ${data.message || 'Unknown error'}`);
  }

  console.log('✅ Migration Update Successful:');
  console.log(JSON.stringify(data, null, 2));
  console.log('\n');
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('🚀 Starting Migration File Update...\n');
    console.log(`📡 Coordinator URL: ${COORDINATOR_URL}`);
    console.log(`🏷️  Service Name: ${SERVICE_NAME}\n`);

    // Get service ID
    const serviceId = await getServiceId();

    // Update migration
    await updateMigration(serviceId);

    console.log('🎉 Migration Update Complete!\n');
    console.log('📋 Summary:');
    console.log(`   Service Name: ${SERVICE_NAME}`);
    console.log(`   Service ID: ${serviceId}`);
    console.log(`   Migration Version: ${migrationFile.migrationFile.version}`);
    console.log('\n✅ Migration file has been updated in Coordinator!\n');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Run
main();

