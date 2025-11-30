# Running Database Data Scripts

## Available Commands

To populate the database with data, use one of these commands:

### 1. Seed Mock Data (Recommended)
```bash
cd backend
npm run seed:mock
```

This will populate the database with:
- 1 learner (Alice Learner)
- 2 trainers
- 8 courses (4 marketplace + 4 personalized)
- Full course structure (topics → modules → lessons)
- Registrations for all courses
- Progress tracking data
- Feedback data

### 2. Check Existing Data
```bash
cd backend
npm run checkData
# Or use the new script:
node scripts/runData.js
```

### 3. Reset and Reseed Mock Data
```bash
cd backend
npm run db:reset-mock
```
This clears the database and reseeds with mock data.

### 4. Full Database Initialization
```bash
cd backend
npm run db:init
```
This sets up the database schema, runs migrations, and seeds data.

## Data Structure

The mock data includes:

**Courses:**
- JavaScript course
- Python course
- React course
- Node.js course
- 4 personalized courses

**Structure:**
- Topics → Modules → Lessons hierarchy
- Full content data (content_data, devlab_exercises, skills)
- Registrations and progress tracking
- Feedback and ratings

**User IDs:**
- Learner: `10000000-0000-0000-0000-000000000001` (Alice Learner)
- Trainer: `20000000-0000-0000-0000-000000000001` (Tristan Trainer)
- Trainer 2: `20000000-0000-0000-0000-000000000002`

## Troubleshooting

If scripts don't show output:
1. Check your `.env` file has `DATABASE_URL` set
2. Verify database connection
3. Run scripts directly: `node scripts/seedMockData.js`

## Verification

After seeding, verify data with:
```bash
node scripts/checkData.js
```

This will show counts and sample records from all tables.

