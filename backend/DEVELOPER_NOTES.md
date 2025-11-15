# Developer Notes - Course Builder Backend

This document provides essential information for developers working on the Course Builder backend.

## Table of Contents

1. [Test Environment Structure](#test-environment-structure)
2. [Migrations in Test Mode](#migrations-in-test-mode)
3. [Test Seed Data](#test-seed-data)
4. [Integration Handlers](#integration-handlers)
5. [Naming Conventions](#naming-conventions)
6. [Architecture Rules](#architecture-rules)
7. [Unified Integration Endpoint](#unified-integration-endpoint)
8. [Files That Should Never Be Modified](#files-that-should-never-be-modified)
9. [Adding New Tests](#adding-new-tests)
10. [Project Structure](#project-structure)

---

## Test Environment Structure

### Dedicated Test Database

- **Database Name**: `course_builder_test`
- **Configuration**: `.env.test` file (created manually by developers)
- **Environment Variable**: `NODE_ENV=test` must be set

### Test Files Location

All test files are located in:
- `backend/__tests__/` - Main test files
- `backend/tests/` - Test utilities and setup scripts

**⚠️ IMPORTANT**: Test utilities in `/tests` should NEVER be imported in production code.

### Test Configuration Files

- `jest.config.js` - Jest configuration
- `jest.global-setup.js` - Runs before all tests (database setup, migrations, seed)
- `jest.global-teardown.js` - Runs after all tests (database cleanup)
- `jest.setup.js` - Per-test-file setup (environment variables, timeouts)

### Test Environment Variables

When `NODE_ENV=test`:
- `.env.test` is loaded (must contain `DATABASE_URL` pointing to `course_builder_test`)
- Authentication is disabled by default (`AUTH_DISABLED=true`)
- Database pool size is reduced to 2 connections

---

## Migrations in Test Mode

### Automatic Migration Execution

Migrations run automatically before all tests via `jest.global-setup.js`:

1. **Script**: `backend/tests/setupTestDB.js`
2. **Process**:
   - Drops all existing tables in test database
   - Runs all SQL migrations from `backend/database/schema.sql`
   - Validates schema creation

### Migration Files

- **Location**: `backend/database/schema.sql`
- **Format**: PostgreSQL SQL with dollar-quoted strings support
- **Execution**: Parsed and executed by `setupTestDB.js`

### How Migrations Work

```javascript
// In jest.global-setup.js
import setupTestDB from './tests/setupTestDB.js';

export default async () => {
  // Load .env.test
  dotenv.config({ path: path.join(__dirname, '.env.test') });
  
  // Drop tables, run migrations
  await setupTestDB();
  
  // Seed test data
  await seedTestData();
};
```

**⚠️ IMPORTANT**: 
- Migrations are run ONLY when `NODE_ENV=test`
- All tables are dropped before migrations
- This ensures a clean state for every test run

---

## Test Seed Data

### Purpose

Minimal test data inserted into `course_builder_test` before all tests run.

### Files

- **Seed Script**: `backend/tests/testSeed.js`
- **Execution**: Called automatically in `jest.global-setup.js`

### Seeded Data

Fixed UUIDs are used for predictable test results:

- **Course ID**: `11111111-1111-1111-1111-111111111111`
- **Topic ID**: `22222222-2222-2222-2222-222222222222`
- **Module ID**: `33333333-3333-3333-3333-333333333333`
- **Lesson ID**: `44444444-4444-4444-4444-444444444444`

### Seed Safety

The seed script includes guards:

```javascript
// Only runs in test environment
if (process.env.NODE_ENV !== 'test') {
  console.error('❌ testSeed.js can only run when NODE_ENV=test');
  process.exit(1);
}

// Uses ON CONFLICT DO NOTHING to allow re-runs
INSERT INTO courses (...) VALUES (...)
ON CONFLICT (id) DO NOTHING;
```

**⚠️ IMPORTANT**:
- Seed data is NOT used in production
- Seed script cannot run outside `NODE_ENV=test`
- Seed uses `ON CONFLICT DO NOTHING` for idempotency

### Using Seed Data in Tests

```javascript
// In test files
const testCourseId = '11111111-1111-1111-1111-111111111111';

it('should fetch seeded course', async () => {
  const response = await request(app)
    .get(`/api/v1/courses/${testCourseId}`)
    .expect(200);
  
  expect(response.body.id).toBe(testCourseId);
});
```

**⚠️ IMPORTANT**: 
- Always use fixed UUIDs from seed for shared test data
- Use unique IDs (with timestamps) for test-specific data
- Clean up test-specific data in `afterAll` hooks

---

## Integration Handlers

### Architecture

All microservice integrations go through a unified integration layer:

```
External Service
    ↓
POST /api/fill-content-metrics
    ↓
integration/dispatcher.js
    ↓
integration/handlers/{serviceName}Handler.js
    ↓
dtoBuilders/{serviceName}DTO.js
    ↓
Internal Services/DB
```

### Handler Structure

Each handler is located in `backend/integration/handlers/`:

- `contentStudioHandler.js` - Content Studio integration
- `learnerAIHandler.js` - Learner AI integration
- `assessmentHandler.js` - Assessment service integration
- `directoryHandler.js` - Directory service integration
- `learningAnalyticsHandler.js` - Learning Analytics integration
- `managementReportingHandler.js` - Management Reporting integration
- `skillsHandler.js` - Skills Engine integration
- `devlabHandler.js` - DevLab integration

### Handler Pattern

```javascript
// Example: integration/handlers/contentStudioHandler.js
import contentStudioDTO from '../../dtoBuilders/contentStudioDTO.js';

export async function handleContentStudioIntegration(payloadObject) {
  // 1. Validate payload structure
  // 2. Transform using DTO builder
  // 3. Process business logic
  // 4. Return response object
  return {
    status: 'success',
    data: transformedData
  };
}
```

**⚠️ IMPORTANT**: 
- Handlers should NEVER call external services directly
- Use clients in `integration/clients/` for outbound calls
- Always use DTO builders for data transformation

---

## Naming Conventions

### Files

- **Controllers**: `{resource}.controller.js` (e.g., `courses.controller.js`)
- **Services**: `{resource}.service.js` (e.g., `courses.service.js`)
- **Repositories**: `{Resource}Repository.js` (e.g., `CourseRepository.js`)
- **Models**: `{Resource}.js` (e.g., `Course.js`)
- **Routes**: `{resource}.routes.js` (e.g., `courses.routes.js`)
- **DTOs**: `{serviceName}DTO.js` (e.g., `assessmentDTO.js`)
- **Handlers**: `{serviceName}Handler.js` (e.g., `assessmentHandler.js`)
- **Clients**: `{serviceName}Client.js` (e.g., `assessmentClient.js`)
- **Tests**: `{resource}.test.js` or `{resource}.integration.test.js`

### Functions

- **Service Functions**: camelCase (e.g., `getCourseDetails`)
- **Repository Functions**: camelCase (e.g., `findById`)
- **Handler Functions**: camelCase with `handle` prefix (e.g., `handleContentStudioIntegration`)
- **Client Functions**: camelCase with `send` prefix (e.g., `sendToContentStudio`)

### Database

- **Tables**: snake_case (e.g., `course_completion`)
- **Columns**: snake_case (e.g., `course_name`, `created_at`)
- **Foreign Keys**: `{referenced_table}_id` (e.g., `course_id`, `topic_id`)

---

## Architecture Rules

### Data Flow

```
Client Request
    ↓
Routes → Controllers → Services → Repositories → Database
    ↓
Response ← Controllers ← Services ← Repositories ← Database
```

### Layer Responsibilities

1. **Routes**: Define endpoints, middleware, request validation
2. **Controllers**: Handle HTTP request/response, error handling
3. **Services**: Business logic, orchestration, external integrations
4. **Repositories**: Database access, SQL queries, data mapping
5. **Models**: Data structure definitions, validation rules

### Integration Flow

```
External Service Request
    ↓
POST /api/fill-content-metrics
    ↓
integration.controller.js
    ↓
integration/dispatcher.js
    ↓
integration/handlers/{serviceName}Handler.js
    ↓
dtoBuilders/{serviceName}DTO.js
    ↓
Services/Repositories
    ↓
Response (unified format)
```

### Rules

1. **Controllers** should NOT access database directly
2. **Services** should NOT handle HTTP requests/responses
3. **Repositories** should NOT contain business logic
4. **Handlers** should NOT call external services directly (use clients)
5. **DTOs** should be the ONLY place for data transformation
6. **Models** should be pure data structures (no methods that touch DB)

---

## Unified Integration Endpoint

### Single Endpoint

**Endpoint**: `POST /api/fill-content-metrics`

**Purpose**: Unified gateway for all microservice integrations

### Request Format

```javascript
{
  "serviceName": "ContentStudio",  // Required: string
  "payload": "{\"key\":\"value\"}"  // Required: stringified JSON
}
```

### Response Format

```javascript
{
  "serviceName": "ContentStudio",  // Same as request
  "payload": "{\"status\":\"success\",\"data\":{...}}"  // Stringified JSON
}
```

### Supported Services

- `ContentStudio`
- `LearnerAI`
- `Assessment`
- `Directory`
- `LearningAnalytics`
- `ManagementReporting`
- `SkillsEngine`
- `Devlab` or `DevLab`

### Error Format

```javascript
{
  "error": "Bad Request",
  "message": "Unsupported service: UnknownService",
  "serviceName": "UnknownService"
}
```

### Implementation

```javascript
// controllers/integration.controller.js
export async function handleFillContentMetrics(req, res, next) {
  const { serviceName, payload } = req.body;
  
  // Parse payload
  const payloadObject = JSON.parse(payload);
  
  // Dispatch to handler
  const responseObject = await dispatchIntegrationRequest(serviceName, payloadObject);
  
  // Return unified format
  res.json({
    serviceName: serviceName,
    payload: JSON.stringify(responseObject)
  });
}
```

**⚠️ IMPORTANT**:
- ALL microservice integrations MUST go through this endpoint
- NO direct HTTP calls to external services from controllers/services
- Use `integration/clients/` for outbound requests
- Use `integration/handlers/` for inbound request processing

---

## Files That Should Never Be Modified

### Database Schema

- **❌ NEVER MODIFY**: `backend/database/schema.sql`
- **Reason**: Production schema is immutable after deployment
- **Exception**: Only modify in development before first deployment

### Migration Scripts

- **❌ NEVER MODIFY**: `backend/tests/setupTestDB.js`
- **Reason**: Test database setup must remain consistent
- **Exception**: Bug fixes only, with team approval

### Test Seed

- **❌ NEVER MODIFY**: `backend/tests/testSeed.js` (fixed UUIDs)
- **Reason**: Tests depend on predictable seed data
- **Exception**: Adding new seed data (with new UUIDs)

### Integration Contracts

- **❌ NEVER MODIFY**: `backend/integrationContracts/*.json`
- **Reason**: Contracts define API agreements with other services
- **Exception**: Only when coordinating with other service teams

### Environment Variables

- **❌ NEVER MODIFY**: Environment variable names (`.env`, `.env.test`)
- **Reason**: CI/CD and deployment scripts depend on these names
- **Exception**: Adding new optional variables only

---

## Adding New Tests

### Test File Location

- **Unit Tests**: `backend/__tests__/{resource}.test.js`
- **Integration Tests**: `backend/__tests__/{resource}.integration.test.js`
- **Service Tests**: `backend/services/__tests__/{service}.test.js`

### Test Structure

```javascript
import request from 'supertest';
import app from '../server.js';
import db from '../config/database.js';

describe('Resource Tests', () => {
  // Use seeded data for shared resources
  const testCourseId = '11111111-1111-1111-1111-111111111111';
  
  // Use unique IDs for test-specific data
  const uniqueLearnerId = `00000000-0000-0000-0000-${Date.now().toString().slice(-12)}`;
  
  afterAll(async () => {
    // Clean up test-specific data
    await db.none('DELETE FROM registrations WHERE learner_id = $1', [uniqueLearnerId]);
  });
  
  it('should perform action', async () => {
    const response = await request(app)
      .get(`/api/v1/resource/${testCourseId}`)
      .expect(200);
    
    expect(response.body).toHaveProperty('id');
  });
});
```

### Test Best Practices

1. **Use Seeded Data**: Reference fixed UUIDs from `testSeed.js` for shared resources
2. **Use Unique IDs**: Generate unique IDs (with timestamps) for test-specific data
3. **Clean Up**: Always clean up test-specific data in `afterAll` hooks
4. **Isolation**: Tests should not depend on execution order
5. **Assertions**: Be specific about what you're testing
6. **Error Cases**: Test both success and error paths

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- __tests__/courses.test.js

# Run tests with coverage
npm test -- --coverage
```

### Test Environment Setup

1. **Create `.env.test`**:
   ```env
   NODE_ENV=test
   DATABASE_URL=postgresql://user:password@localhost:5432/course_builder_test
   ```

2. **Create test database**:
   ```bash
   npm run db:create-test
   ```

3. **Run tests**:
   ```bash
   npm test
   ```

**⚠️ IMPORTANT**:
- Tests automatically set up database (drop tables, migrate, seed)
- Tests automatically clean up database connections after completion
- DO NOT modify production database during tests
- DO NOT use production database in tests

---

## Project Structure

```
backend/
├── __tests__/              # Main test files
├── config/                 # Configuration files
│   └── database.js         # Database connection config
├── controllers/            # HTTP request handlers
├── database/               # Database schema and migrations
│   ├── schema.sql          # Main schema file
│   ├── SCHEMA_DIAGRAM.md   # Schema documentation
│   └── SCHEMA_UPDATE_SUMMARY.md
├── dtoBuilders/            # Data Transfer Object builders
├── integration/            # Microservice integration layer
│   ├── clients/            # Outbound client libraries
│   ├── handlers/           # Inbound request handlers
│   └── dispatcher.js       # Request router
├── integrationContracts/   # API contracts (JSON)
├── middleware/             # Express middleware
├── migrations/             # Database migrations (if separate)
├── models/                 # Data models
├── repositories/           # Database access layer
├── routes/                 # Route definitions
├── scripts/                # Utility scripts
├── services/               # Business logic layer
│   └── __tests__/          # Service-specific tests
├── tests/                  # Test utilities (TEST ONLY)
│   ├── setupTestDB.js      # Database setup for tests
│   └── testSeed.js         # Test data seed script
├── utils/                  # Utility functions
├── validation/             # Input validation schemas
├── jest.config.js          # Jest configuration
├── jest.global-setup.js    # Global test setup
├── jest.global-teardown.js # Global test teardown
├── jest.setup.js           # Per-test setup
├── server.js               # Express server entry point
├── package.json            # Dependencies and scripts
├── README.md               # Project documentation
└── DEVELOPER_NOTES.md      # This file
```

### Directory Purposes

- **`__tests__/`**: All test files (integration and unit tests)
- **`tests/`**: Test utilities (setup, seed) - **NEVER import in production code**
- **`config/`**: Configuration files (database, environment)
- **`controllers/`**: HTTP request/response handling
- **`services/`**: Business logic and orchestration
- **`repositories/`**: Database access layer
- **`models/`**: Data structure definitions
- **`dtoBuilders/`**: Data transformation for integrations
- **`integration/`**: Microservice integration layer
- **`routes/`**: Route definitions and middleware
- **`validation/`**: Input validation schemas (Joi)
- **`scripts/`**: Utility scripts (migrations, seed, etc.)

---

## Additional Notes

### Environment Variables

- **Production**: `.env` file (not committed to git)
- **Test**: `.env.test` file (not committed to git)
- **Required**: `DATABASE_URL` must be set in both environments

### Database Connections

- **Production**: Pool size configured in `config/database.js`
- **Test**: Pool size reduced to 2 connections for test environment

### Error Handling

- All errors should be caught and handled at appropriate layers
- Controllers return HTTP status codes and error messages
- Services throw errors with appropriate status codes
- Repositories throw database errors as-is

### Logging

- Use `console.log` for informational messages
- Use `console.error` for errors
- Consider adding structured logging in the future

---

## Questions or Issues?

If you have questions about this codebase:
1. Check this document first
2. Review the code comments
3. Ask the team lead

**Last Updated**: 2025-11-15

