# 🚀 Course Builder - Fresh Start Guide

Welcome! This guide will help you set up and run the Course Builder project from scratch.

## 📋 Prerequisites

Before starting, make sure you have:
- ✅ Node.js (v18 or higher)
- ✅ PostgreSQL (v15 or higher) installed and running
- ✅ Git (optional, for version control)

---

## 🎯 Step 1: Database Setup

### 1.1 Install PostgreSQL
- Download and install PostgreSQL from: https://www.postgresql.org/download/
- During installation, remember your **postgres user password**
- Make sure PostgreSQL service is running

### 1.2 Create Database
Open PostgreSQL command line (psql) or pgAdmin and run:

```sql
CREATE DATABASE coursebuilder;
```

Or use the command line:
```bash
createdb coursebuilder
```

### 1.3 Update Backend Environment Variables
Create `backend/.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=coursebuilder
DB_USER=postgres
DB_PASSWORD=your_postgres_password_here

# Server Configuration
PORT=3000
NODE_ENV=development

# API Configuration
API_BASE_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173

# CORS
CORS_ORIGIN=http://localhost:5173
```

**⚠️ Important:** Replace `your_postgres_password_here` with your actual PostgreSQL password!

---

## 🎯 Step 2: Backend Setup

### 2.1 Install Backend Dependencies
```bash
cd backend
npm install
```

### 2.2 Run Database Migration
This creates all the database tables:

```bash
npm run migrate
```

You should see:
```
✅ Database migration completed successfully!
📊 Tables created: courses, modules, topics, lessons, registrations, feedback, assessments, versions
```

### 2.3 Seed Database (Optional)
This adds sample data for testing:

```bash
npm run seed
```

You should see:
```
✅ Database seeding completed successfully!
📊 Seed data summary:
   Courses: 4
   Modules: 7
   Topics: 6
   ...
```

### 2.4 Start Backend Server
```bash
npm run dev
```

You should see:
```
✅ Database connected successfully
🚀 Server running on http://localhost:3000
```

**✅ Backend is now running!** Keep this terminal open.

---

## 🎯 Step 3: Frontend Setup

### 3.1 Open a New Terminal
Keep the backend running, open a **new terminal window**.

### 3.2 Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 3.3 Create Frontend Environment File
Create `frontend/.env` file:

```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_ENV=development
```

### 3.4 Start Frontend Server
```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**✅ Frontend is now running!**

---

## 🎯 Step 4: Verify Everything Works

### 4.1 Open Your Browser
Navigate to: **http://localhost:5173**

You should see the Course Builder homepage!

### 4.2 Test Backend API
Open a new browser tab and go to:
- **http://localhost:3000/api/v1/courses** - Should return a list of courses (if you ran seed)

### 4.3 Check Database Connection
In the backend terminal, you should see:
```
✅ Database connected successfully
```

---

## 🎯 Step 5: Development Workflow

### Daily Development:
1. **Start Backend:** `cd backend && npm run dev`
2. **Start Frontend:** `cd frontend && npm run dev` (in a new terminal)
3. **Make changes** to your code
4. **Test** in browser at http://localhost:5173

### Useful Commands:

**Backend:**
```bash
cd backend
npm run migrate    # Run database migration
npm run seed        # Add sample data
npm test           # Run tests
npm run dev        # Start development server
```

**Frontend:**
```bash
cd frontend
npm run dev        # Start development server
npm test           # Run tests
npm run build      # Build for production
```

---

## 🐛 Troubleshooting

### Database Connection Error
- ✅ Check PostgreSQL is running
- ✅ Verify password in `backend/.env` is correct
- ✅ Make sure database `coursebuilder` exists

### Port Already in Use
- ✅ Backend uses port 3000 - close other apps using it
- ✅ Frontend uses port 5173 - Vite will suggest another port if busy

### Module Not Found
- ✅ Run `npm install` in both `backend/` and `frontend/` directories

### CORS Errors
- ✅ Make sure `CORS_ORIGIN` in `backend/.env` matches frontend URL
- ✅ Usually: `CORS_ORIGIN=http://localhost:5173`

---

## 📁 Project Structure

```
MainDevelopment_tamplates/
├── backend/              # Node.js + Express backend
│   ├── config/           # Database configuration
│   ├── controllers/      # Request handlers
│   ├── database/         # SQL schema and seeds
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   └── server.js         # Entry point
│
├── frontend/             # React + Vite frontend
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── services/     # API service layer
│   │   └── styles/       # CSS styles
│   └── index.html        # HTML entry point
│
└── Main_Development_Plan/  # Project documentation
```

---

## 🎓 Next Steps

Once everything is running:

1. **Explore the API:** Visit http://localhost:3000/api/v1/courses
2. **Browse Courses:** Go to http://localhost:5173/courses
3. **Read Documentation:** Check `Main_Development_Plan/` folder
4. **Start Coding:** Make changes and see them live!

---

## 💡 Tips

- **Hot Reload:** Both frontend and backend support hot reload - changes appear automatically
- **Database Reset:** Run `npm run db:reset` in backend to reset database
- **API Testing:** Use Postman or browser to test API endpoints
- **Check Logs:** Backend logs appear in terminal, frontend errors in browser console

---

## ✅ Success Checklist

- [ ] PostgreSQL installed and running
- [ ] Database `coursebuilder` created
- [ ] `backend/.env` file created with correct password
- [ ] Backend dependencies installed (`npm install` in backend/)
- [ ] Database migrated (`npm run migrate`)
- [ ] Database seeded (`npm run seed`)
- [ ] Backend server running on port 3000
- [ ] `frontend/.env` file created
- [ ] Frontend dependencies installed (`npm install` in frontend/)
- [ ] Frontend server running on port 5173
- [ ] Browser shows homepage at http://localhost:5173
- [ ] API returns data at http://localhost:3000/api/v1/courses

---

**🎉 You're all set! Happy coding!**

