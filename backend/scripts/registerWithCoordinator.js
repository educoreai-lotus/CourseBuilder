/**
 * Register Course Builder Service with Coordinator
 * Two-stage registration process
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
const SERVICE_NAME = 'course-builder-service';
const SERVICE_VERSION = '1.0.0';
// Ensure endpoint doesn't have trailing slash
const SERVICE_ENDPOINT = (process.env.SERVICE_ENDPOINT || 'https://coursebuilder-production.up.railway.app').replace(/\/+$/, '');
const HEALTH_CHECK_PATH = '/health';

// Read migration file
const migrationPath = path.join(__dirname, '..', '..', 'migration.json');
const migrationFile = JSON.parse(fs.readFileSync(migrationPath, 'utf8'));

async function registerService() {
  try {
    console.log('🚀 Starting Course Builder service registration with Coordinator...\n');
    console.log(`📡 Coordinator URL: ${COORDINATOR_URL}`);
    console.log(`🏷️  Service Name: ${SERVICE_NAME}`);
    console.log(`📦 Version: ${SERVICE_VERSION}`);
    console.log(`🔗 Endpoint: ${SERVICE_ENDPOINT}\n`);

    // Check Coordinator health first
    console.log('🔍 Checking Coordinator health...\n');
    try {
      const healthResponse = await fetch(`${COORDINATOR_URL}/health`);
      const healthData = await healthResponse.json();
      console.log('✅ Coordinator is healthy:', JSON.stringify(healthData, null, 2));
      console.log('\n');
    } catch (err) {
      console.warn('⚠️  Could not check Coordinator health:', err.message);
      console.log('\n');
    }

    // Check if service already exists
    console.log('🔍 Checking if service already exists...\n');
    try {
      const servicesResponse = await fetch(`${COORDINATOR_URL}/services?includeAll=true`);
      const servicesData = await servicesResponse.json();
      if (servicesData.success && servicesData.services) {
        const existingService = servicesData.services.find(s => s.serviceName === SERVICE_NAME);
        if (existingService) {
          console.log('✅ Service already registered:');
          console.log(JSON.stringify(existingService, null, 2));
          console.log('\n');
          
          // Get serviceId - it should be in the service object
          const serviceId = existingService.serviceId || existingService.id;
          if (serviceId) {
            console.log(`✅ Found Service ID: ${serviceId}\n`);
            console.log('📤 Proceeding to upload/update migration file...\n');
            await uploadMigration(serviceId);
            
            // Print summary
            console.log('🎉 Migration Update Complete!\n');
            console.log('📋 Summary:');
            console.log(`   Service Name: ${SERVICE_NAME}`);
            console.log(`   Service ID: ${serviceId}`);
            console.log(`   Status: ${existingService.status || 'active'}`);
            console.log(`   Endpoint: ${existingService.endpoint || SERVICE_ENDPOINT}`);
            console.log(`   Health Check: ${existingService.endpoint || SERVICE_ENDPOINT}${HEALTH_CHECK_PATH}`);
            console.log('\n✅ Course Builder service migration has been updated!\n');
            return;
          } else {
            console.log('⚠️  Service ID not found in service details.');
            console.log('💡 You may need to register a new service or contact Coordinator admin for serviceId.\n');
            console.log('Proceeding with new registration attempt (may fail if service exists)...\n');
          }
        } else {
          console.log('ℹ️  Service not found, proceeding with registration...\n');
        }
      }
    } catch (err) {
      console.warn('⚠️  Could not check existing services:', err.message);
      console.log('Proceeding with registration...\n');
    }

    // ============================================
    // STAGE 1: Basic Registration
    // ============================================
    console.log('📝 Stage 1: Basic Registration...\n');

    const stage1Payload = {
      serviceName: SERVICE_NAME,
      version: SERVICE_VERSION,
      endpoint: SERVICE_ENDPOINT,
      healthCheck: HEALTH_CHECK_PATH,
      description: 'Course Builder is the structural orchestration microservice responsible for generating full course structures based on approved learning paths and learner context. It is triggered by Learner AI, which provides the finalized learning path along with learner identity, organizational context, and competency targets. Course Builder does NOT generate educational content itself and does NOT decide learning paths. Instead, it forwards the received learning path to Content Studio to generate lesson content, then organizes the returned content into a structured hierarchy (Course → Topic → Module → Lesson), applies metadata, manages versions, and stores the complete structured course in the database. Course Builder also manages learner registrations and feedback internally, generates skill-coverage maps for downstream Assessment services, and exposes read-optimized DTOs for other consuming microservices.',
      metadata: {
        team: 'Team Course Builder',
        owner: 'Course Builder Team',
        capabilities: [
          'course management',
          'lesson management',
          'course generation',
          'learner registration',
          'feedback collection',
          'course analytics',
          'AI-powered content generation',
          'microservice integration'
        ]
      }
    };

    console.log('Request payload:');
    console.log(JSON.stringify(stage1Payload, null, 2));
    console.log('\n');

    const stage1Response = await fetch(`${COORDINATOR_URL}/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stage1Payload)
    });

    const stage1Data = await stage1Response.json();

    if (!stage1Response.ok) {
      console.error('❌ Stage 1 Registration Failed:');
      console.error(`Status: ${stage1Response.status} ${stage1Response.statusText}`);
      console.error(JSON.stringify(stage1Data, null, 2));
      
      // Check if service already exists
      if (stage1Response.status === 409 || stage1Data.message?.includes('already exists')) {
        console.log('\n💡 Service may already be registered. Checking existing services...\n');
        try {
          const servicesResponse = await fetch(`${COORDINATOR_URL}/services?includeAll=true`);
          const servicesData = await servicesResponse.json();
          if (servicesData.success && servicesData.services) {
            const existingService = servicesData.services.find(s => s.serviceName === SERVICE_NAME);
            if (existingService) {
              console.log('✅ Found existing service:');
              console.log(JSON.stringify(existingService, null, 2));
              console.log('\n💡 If you want to update, use PUT /register/:serviceId/migration');
              process.exit(0);
            }
          }
        } catch (err) {
          console.error('Could not check existing services:', err.message);
        }
      }
      
      process.exit(1);
    }

    console.log('✅ Stage 1 Registration Successful:');
    console.log(JSON.stringify(stage1Data, null, 2));
    console.log('\n');

    const serviceId = stage1Data.serviceId;
    if (!serviceId) {
      console.error('❌ No serviceId received from Coordinator');
      process.exit(1);
    }

    // Upload migration
    await uploadMigration(serviceId);

    // ============================================
    // SUMMARY
    // ============================================
    console.log('🎉 Registration Complete!\n');
    console.log('📋 Summary:');
    console.log(`   Service Name: ${SERVICE_NAME}`);
    console.log(`   Service ID: ${serviceId}`);
    console.log(`   Status: active`);
    console.log(`   Endpoint: ${SERVICE_ENDPOINT}`);
    console.log(`   Health Check: ${SERVICE_ENDPOINT}${HEALTH_CHECK_PATH}`);
    console.log('\n✅ Course Builder service is now registered and active with Coordinator!\n');

  } catch (error) {
    console.error('❌ Registration failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

async function uploadMigration(serviceId) {
  // ============================================
  // STAGE 2: Migration Upload/Update
  // ============================================
  console.log('📤 Uploading/Updating Migration File...\n');
  console.log(`Service ID: ${serviceId}\n`);

  const stage2Payload = {
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
  console.log('Attempting POST (new migration)...\n');
  let stage2Response = await fetch(`${COORDINATOR_URL}/register/${serviceId}/migration`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(stage2Payload)
  });

  let stage2Data = await stage2Response.json();

  // If POST fails, try PUT (update existing migration)
  if (!stage2Response.ok) {
    console.log(`POST failed (${stage2Response.status}), trying PUT to update existing migration...\n`);
    stage2Response = await fetch(`${COORDINATOR_URL}/register/${serviceId}/migration`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(stage2Payload)
    });

    stage2Data = await stage2Response.json();
  }

  if (!stage2Response.ok) {
    console.error('❌ Migration Upload/Update Failed:');
    console.error(`Status: ${stage2Response.status} ${stage2Response.statusText}`);
    console.error(JSON.stringify(stage2Data, null, 2));
    throw new Error(`Migration upload failed: ${stage2Data.message || 'Unknown error'}`);
  }

  console.log('✅ Migration Upload/Update Successful:');
  console.log(JSON.stringify(stage2Data, null, 2));
  console.log('\n');
}

// Run registration
registerService();

