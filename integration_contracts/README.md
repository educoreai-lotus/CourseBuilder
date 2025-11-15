# Integration Contracts

This directory contains JSON contract specifications for all microservice integrations in the Course Builder system.

## Structure

Each contract file follows a consistent structure:

```json
{
  "send": {
    // Fields Course Builder sends TO this microservice
  },
  "receive": {
    // Fields Course Builder receives FROM this microservice
  },
  "source": {
    // Mapping: field -> which table or DTO it originates from
  },
  "derived": {
    // Which fields are computed (not stored in DB)
  },
  "validation": {
    // Validation rules for outbound and inbound payloads
  },
  "examples": {
    "minimal": { ... },
    "full": { ... }
  }
}
```

## Contract Files

1. **contentStudio.json** - Content Studio integration
   - Sends: learner_id, learner_company, skills[]
   - Receives: Trainer course or Learner-specific course data

2. **skillsEngine.json** - Skills Engine integration
   - Sends: topic (competency name)
   - Receives: skills[] (processed)

3. **assessment.json** - Assessment microservice
   - Sends: learner_id, learner_name, course_id, course_name, coverage_map[]
   - Receives: Assessment results (grade, passed, etc.)

4. **directory.json** - Directory microservice
   - Sends: feedback, course_id, course_name, learner_id
   - Receives: employee_id, preferred_language, bonus_attempt

5. **learningAnalytics.json** - Learning Analytics
   - Sends: Complete analytics object (course structure, progress, feedback, assessments)
   - Receives: Nothing (one-way)

6. **managementReporting.json** - Management Reporting
   - Sends: Course statistics (enrollments, completion rate, ratings)
   - Receives: Nothing (one-way)

7. **devlab.json** - DevLab integration
   - Sends: course_id, learner_id, course_name
   - Receives: Nothing (exercises stored in lessons.devlab_exercises)

8. **learnerAI.json** - Learner AI integration
   - Sends: Nothing
   - Receives: user_id, user_name, company_id, company_name, skills[], competency_name

## Field Categories

### Source Mapping
The `source` section maps each field to its origin:
- **Database tables**: `courses.id`, `registrations.learner_id`, etc.
- **DERIVED**: Fields computed from other data
- **Request body**: Data from incoming API requests

### Derived Fields
The `derived` section lists fields that are:
- **Computed dynamically** (not stored in DB)
- **Looked up** from related tables
- **Aggregated** from multiple sources

Examples:
- `coverage_map` in Assessment - built from lessons array
- `course_name` in Directory - looked up from courses table
- `completionRate` in Management Reporting - calculated from registrations

## Keeping Contracts in Sync

### When DTO Builders Change
1. Update the corresponding contract file's `send` or `receive` section
2. Update `source` mapping if field origins change
3. Update `derived` section if computation logic changes
4. Update `validation` rules if constraints change
5. Update `examples` to reflect new structure

### When Database Schema Changes
1. Update `source` mappings if table/column names change
2. Update `derived` section if new computed fields are added
3. Ensure contract reflects canonical DB fields only (not export-only fields)

### When Microservice API Changes
1. Update `send` or `receive` sections with new fields
2. Update `validation` rules
3. Update `examples` with new field examples
4. Document breaking changes in contract comments

## Validation

Each contract includes validation rules that should match:
- **Backend validation schemas** (Joi/Zod)
- **DTO builder validation functions**
- **API request/response validation**

## Examples

Each contract includes:
- **minimal**: Required fields only
- **full**: All optional fields included

Use these examples for:
- API testing
- Documentation
- Integration testing
- Mock data generation

## Usage

These contracts serve as:
1. **API Documentation** - Single source of truth for microservice interfaces
2. **Validation Reference** - Rules for payload validation
3. **Testing Guide** - Examples for integration tests
4. **Development Reference** - Field mappings and data flow

## Related Files

- **DTO Builders**: `/backend/dtoBuilders/*.js` - Implementation of these contracts
- **Backend Contracts**: `/backend/integrationContracts/*.json` - Simplified version for backend use
- **Validation**: `/backend/validation/*.js` - Joi schemas matching these contracts

## Notes

- All UUIDs are in standard UUID v4 format
- All timestamps are ISO8601 format strings
- All arrays default to empty array `[]` if not provided
- All optional fields can be `null` or omitted
- Required fields must always be present


