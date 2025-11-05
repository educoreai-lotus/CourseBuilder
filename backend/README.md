# Course Builder Backend

Express.js backend for the Course Builder microservice.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your PostgreSQL connection details:
```
DATABASE_URL=postgresql://user:password@localhost:5432/coursebuilder
```

4. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

## API Endpoints

### Courses
- `GET /api/v1/courses` - Browse courses (with filters: search, category, level, sort, page, limit)
- `GET /api/v1/courses/:id` - Get course details
- `POST /api/v1/courses/:id/register` - Register for a course

### Feedback
- `POST /api/v1/courses/:id/feedback` - Submit feedback
- `GET /api/v1/feedback/:courseId` - Get aggregated feedback

### Health
- `GET /health` - Health check endpoint

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

Watch mode:
```bash
npm run test:watch
```

## Project Structure

```
backend/
├── config/
│   └── database.js          # PostgreSQL connection config
├── controllers/
│   ├── courses.controller.js
│   └── feedback.controller.js
├── routes/
│   ├── courses.routes.js
│   └── feedback.routes.js
├── services/
│   ├── courses.service.js
│   └── feedback.service.js
├── __tests__/
│   ├── courses.test.js
│   └── feedback.test.js
├── server.js                # Express app entry point
├── package.json
└── .env.example
```

## Database Schema

The backend expects the following PostgreSQL tables (as defined in Architecture_Design.md):
- `courses`
- `modules`
- `lessons`
- `registrations`
- `feedback`
- `versions`
- `assessments`

See `Main_Development_Plan/Architecture_Design.md` for the full schema definition.


