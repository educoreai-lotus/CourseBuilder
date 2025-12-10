/**
 * Seed Database with Realistic Sample Data
 * Creates comprehensive courses, topics, modules, and lessons
 * 
 * Usage: npm run seed
 */

import db, { pgp } from '../config/database.js';
import { CourseRepository } from '../repositories/CourseRepository.js';
import { TopicRepository } from '../repositories/TopicRepository.js';
import { ModuleRepository } from '../repositories/ModuleRepository.js';
import { LessonRepository } from '../repositories/LessonRepository.js';
import { RegistrationRepository } from '../repositories/RegistrationRepository.js';
import { FeedbackRepository } from '../repositories/FeedbackRepository.js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// User IDs (matching frontend AppContext)
const TRAINER_ID = '20000000-0000-0000-0000-000000000001'; // Tristan Trainer
const LEARNER_ID = '10000000-0000-0000-0000-000000000001'; // Alice Learner
const LEARNER_NAME = 'Alice Learner';
const LEARNER_COMPANY = 'Emerald Learning';

const courseRepo = new CourseRepository();
const topicRepo = new TopicRepository();
const moduleRepo = new ModuleRepository();
const lessonRepo = new LessonRepository();
const registrationRepo = new RegistrationRepository();
const feedbackRepo = new FeedbackRepository();

// Helper function to create full course structure
async function createFullCourse(courseData, topicsData) {
  const course = await courseRepo.create(courseData);
  const createdTopics = [];
  
  for (const topicData of topicsData) {
    const topic = await topicRepo.create({
      course_id: course.id,
      topic_name: topicData.name,
      topic_description: topicData.description
    });
    
    const createdModules = [];
    for (const moduleData of topicData.modules) {
      const module = await moduleRepo.create({
        topic_id: topic.id,
        module_name: moduleData.name,
        module_description: moduleData.description
      });
      
      for (const lessonData of moduleData.lessons) {
        await lessonRepo.create({
          module_id: module.id,
          topic_id: topic.id,
          lesson_name: lessonData.name,
          lesson_description: lessonData.description,
          skills: lessonData.skills || [],
          trainer_ids: lessonData.trainer_ids || [TRAINER_ID],
          content_type: lessonData.content_type || 'text',
          content_data: lessonData.content_data || [
            {
              type: 'paragraph',
              content: lessonData.description || `Learn about ${lessonData.name}`
            }
          ],
          devlab_exercises: lessonData.devlab_exercises || []
        });
      }
      
      createdModules.push(module);
    }
    
    createdTopics.push({ topic, modules: createdModules });
  }
  
  return { course, topics: createdTopics };
}

async function seed() {
  try {
    console.log('🌱 Starting comprehensive database seeding...\n');

    // Check if data already exists
    const existingCourses = await db.any('SELECT COUNT(*)::int as count FROM courses');
    if (existingCourses[0].count > 0) {
      console.log('⚠️  Database already contains data. Skipping seed.');
      console.log('💡 Use "npm run db:clear" to clear the database first if you want to reseed.\n');
      await pgp.end();
      process.exit(0);
    }

    // ============================================
    // 1. CREATE 4 TRAINER COURSES (Marketplace)
    // ============================================
    console.log('📚 Creating 4 trainer courses (marketplace)...\n');

    // Course 1: JavaScript Fundamentals
    const jsCourse = await createFullCourse(
      {
        id: uuidv4(),
        course_name: 'JavaScript Fundamentals',
        course_description: 'Master the core concepts of JavaScript programming. Learn variables, functions, objects, arrays, and modern ES6+ features. Perfect for beginners who want to build a solid foundation.',
        course_type: 'trainer',
        status: 'active',
        level: 'beginner',
        duration_hours: 40,
        created_by_user_id: TRAINER_ID
      },
      [
        {
          name: 'Getting Started with JavaScript',
          description: 'Introduction to JavaScript and development environment setup',
          modules: [
            {
              name: 'Introduction to JavaScript',
              description: 'What is JavaScript and why it matters',
              lessons: [
                { name: 'What is JavaScript?', description: 'Understanding JavaScript as a programming language', skills: ['javascript', 'programming'], content_data: [{ type: 'paragraph', content: 'JavaScript is a versatile programming language used for web development, server-side applications, and mobile apps.' }] },
                { name: 'JavaScript History', description: 'The evolution of JavaScript', skills: ['javascript'], content_data: [{ type: 'paragraph', content: 'JavaScript was created in 1995 by Brendan Eich and has evolved significantly over the years.' }] },
                { name: 'Setting Up Your Environment', description: 'Installing Node.js and VS Code', skills: ['javascript', 'development'], content_data: [{ type: 'paragraph', content: 'Set up your development environment with Node.js, npm, and a code editor.' }] }
              ]
            },
            {
              name: 'Your First JavaScript Program',
              description: 'Writing and running your first JavaScript code',
              lessons: [
                { name: 'Hello World in JavaScript', description: 'Writing your first console.log', skills: ['javascript', 'basics'], content_data: [{ type: 'paragraph', content: 'Learn how to write and execute your first JavaScript program using console.log().' }] },
                { name: 'Understanding Console', description: 'Using browser and Node.js console', skills: ['javascript', 'debugging'], content_data: [{ type: 'paragraph', content: 'Master the console for debugging and outputting information.' }] }
              ]
            }
          ]
        },
        {
          name: 'Variables and Data Types',
          description: 'Understanding variables, constants, and JavaScript data types',
          modules: [
            {
              name: 'Variable Declarations',
              description: 'var, let, and const',
              lessons: [
                { name: 'Understanding var, let, and const', description: 'Differences between variable declarations', skills: ['javascript', 'variables'], content_data: [{ type: 'paragraph', content: 'Learn when to use var, let, and const and understand their scoping differences.' }] },
                { name: 'Variable Hoisting', description: 'How JavaScript hoists variables', skills: ['javascript', 'scope'], content_data: [{ type: 'paragraph', content: 'Understand how JavaScript hoists variable declarations to the top of their scope.' }] }
              ]
            },
            {
              name: 'Data Types',
              description: 'Primitive and reference types',
              lessons: [
                { name: 'Primitive Data Types', description: 'String, Number, Boolean, etc.', skills: ['javascript', 'data-types'], content_data: [{ type: 'paragraph', content: 'JavaScript has 7 primitive types: string, number, bigint, boolean, undefined, null, and symbol.' }] },
                { name: 'Type Coercion', description: 'Understanding type conversion', skills: ['javascript', 'data-types'], content_data: [{ type: 'paragraph', content: 'Learn how JavaScript converts between different data types automatically.' }] }
              ]
            }
          ]
        },
        {
          name: 'Functions and Scope',
          description: 'Working with functions and understanding scope',
          modules: [
            {
              name: 'Function Basics',
              description: 'Declaring and calling functions',
              lessons: [
                { name: 'Function Declarations', description: 'Creating functions with function keyword', skills: ['javascript', 'functions'], content_data: [{ type: 'paragraph', content: 'Learn how to declare functions using the function keyword.' }] },
                { name: 'Arrow Functions', description: 'Modern ES6 arrow function syntax', skills: ['javascript', 'functions', 'es6'], content_data: [{ type: 'paragraph', content: 'Master the concise arrow function syntax introduced in ES6.' }] },
                { name: 'Function Parameters', description: 'Passing arguments to functions', skills: ['javascript', 'functions'], content_data: [{ type: 'paragraph', content: 'Understand how to pass and receive parameters in functions.' }] }
              ]
            },
            {
              name: 'Scope and Closures',
              description: 'Understanding scope and closure concepts',
              lessons: [
                { name: 'Global vs Local Scope', description: 'Understanding variable scope', skills: ['javascript', 'scope'], content_data: [{ type: 'paragraph', content: 'Learn the difference between global and local variable scope.' }] },
                { name: 'Closures Explained', description: 'Understanding JavaScript closures', skills: ['javascript', 'closures'], content_data: [{ type: 'paragraph', content: 'Master closures - one of JavaScript\'s most powerful features.' }] }
              ]
            }
          ]
        },
        {
          name: 'Objects and Arrays',
          description: 'Working with objects and arrays',
          modules: [
            {
              name: 'Objects',
              description: 'Creating and manipulating objects',
              lessons: [
                { name: 'Object Literals', description: 'Creating objects with object literal syntax', skills: ['javascript', 'objects'], content_data: [{ type: 'paragraph', content: 'Learn how to create objects using the object literal syntax.' }] },
                { name: 'Accessing Object Properties', description: 'Dot notation and bracket notation', skills: ['javascript', 'objects'], content_data: [{ type: 'paragraph', content: 'Master different ways to access and modify object properties.' }] },
                { name: 'Object Methods', description: 'Adding functions to objects', skills: ['javascript', 'objects', 'methods'], content_data: [{ type: 'paragraph', content: 'Learn how to add methods to objects and use the this keyword.' }] }
              ]
            },
            {
              name: 'Arrays',
              description: 'Working with arrays and array methods',
              lessons: [
                { name: 'Array Basics', description: 'Creating and accessing arrays', skills: ['javascript', 'arrays'], content_data: [{ type: 'paragraph', content: 'Learn how to create arrays and access their elements.' }] },
                { name: 'Array Methods', description: 'map, filter, reduce, and more', skills: ['javascript', 'arrays', 'functional'], content_data: [{ type: 'paragraph', content: 'Master powerful array methods like map, filter, and reduce.' }] }
              ]
            }
          ]
        },
        {
          name: 'Modern JavaScript (ES6+)',
          description: 'ES6+ features and modern JavaScript patterns',
          modules: [
            {
              name: 'ES6 Features',
              description: 'Destructuring, spread operator, and more',
              lessons: [
                { name: 'Destructuring', description: 'Array and object destructuring', skills: ['javascript', 'es6'], content_data: [{ type: 'paragraph', content: 'Learn how to extract values from arrays and objects using destructuring.' }] },
                { name: 'Spread Operator', description: 'Using the spread operator', skills: ['javascript', 'es6'], content_data: [{ type: 'paragraph', content: 'Master the spread operator for arrays and objects.' }] },
                { name: 'Template Literals', description: 'String interpolation with template literals', skills: ['javascript', 'es6'], content_data: [{ type: 'paragraph', content: 'Use template literals for cleaner string formatting.' }] }
              ]
            }
          ]
        }
      ]
    );

    // Course 2: React Development
    const reactCourse = await createFullCourse(
      {
        id: uuidv4(),
        course_name: 'React Development with Hooks',
        course_description: 'Build modern React applications using functional components and hooks. Learn state management, effects, context, and advanced patterns. Perfect for developers ready to build interactive UIs.',
        course_type: 'trainer',
        status: 'active',
        level: 'intermediate',
        duration_hours: 50,
        created_by_user_id: TRAINER_ID
      },
      [
        {
          name: 'React Fundamentals',
          description: 'Understanding React components and JSX',
          modules: [
            {
              name: 'Introduction to React',
              description: 'What is React and why use it',
              lessons: [
                { name: 'What is React?', description: 'Understanding React library', skills: ['react', 'javascript'], content_data: [{ type: 'paragraph', content: 'React is a JavaScript library for building user interfaces, developed by Facebook.' }] },
                { name: 'Component-Based Architecture', description: 'Understanding components', skills: ['react', 'components'], content_data: [{ type: 'paragraph', content: 'Learn how React uses components to build reusable UI pieces.' }] }
              ]
            },
            {
              name: 'JSX and Rendering',
              description: 'Writing JSX and rendering components',
              lessons: [
                { name: 'Understanding JSX', description: 'JavaScript XML syntax', skills: ['react', 'jsx'], content_data: [{ type: 'paragraph', content: 'JSX allows you to write HTML-like syntax in JavaScript.' }] },
                { name: 'Rendering Components', description: 'How React renders components', skills: ['react', 'rendering'], content_data: [{ type: 'paragraph', content: 'Learn how React renders components to the DOM.' }] }
              ]
            }
          ]
        },
        {
          name: 'React Hooks',
          description: 'Using React hooks for state and side effects',
          modules: [
            {
              name: 'useState Hook',
              description: 'Managing component state',
              lessons: [
                { name: 'Introduction to useState', description: 'Using useState for state management', skills: ['react', 'hooks', 'useState'], content_data: [{ type: 'paragraph', content: 'useState is a hook that lets you add state to functional components.' }] },
                { name: 'Updating State', description: 'How to update state correctly', skills: ['react', 'hooks', 'useState'], content_data: [{ type: 'paragraph', content: 'Learn the proper way to update state in React components.' }] }
              ]
            },
            {
              name: 'useEffect Hook',
              description: 'Handling side effects',
              lessons: [
                { name: 'Understanding useEffect', description: 'Managing side effects in components', skills: ['react', 'hooks', 'useEffect'], content_data: [{ type: 'paragraph', content: 'useEffect lets you perform side effects in functional components.' }] },
                { name: 'Dependency Arrays', description: 'Controlling when effects run', skills: ['react', 'hooks', 'useEffect'], content_data: [{ type: 'paragraph', content: 'Learn how dependency arrays control when useEffect runs.' }] }
              ]
            },
            {
              name: 'Other Hooks',
              description: 'useContext, useReducer, and custom hooks',
              lessons: [
                { name: 'useContext', description: 'Sharing data with context', skills: ['react', 'hooks', 'useContext'], content_data: [{ type: 'paragraph', content: 'useContext allows you to access context values in components.' }] },
                { name: 'Custom Hooks', description: 'Creating reusable custom hooks', skills: ['react', 'hooks'], content_data: [{ type: 'paragraph', content: 'Learn how to create your own custom hooks for code reuse.' }] }
              ]
            }
          ]
        },
        {
          name: 'State Management',
          description: 'Managing complex application state',
          modules: [
            {
              name: 'Context API',
              description: 'Using Context for global state',
              lessons: [
                { name: 'Creating Context', description: 'Setting up React Context', skills: ['react', 'context'], content_data: [{ type: 'paragraph', content: 'Learn how to create and provide context in React applications.' }] },
                { name: 'Consuming Context', description: 'Using context in components', skills: ['react', 'context'], content_data: [{ type: 'paragraph', content: 'Access context values using useContext hook.' }] }
              ]
            }
          ]
        },
        {
          name: 'React Router',
          description: 'Navigation and routing in React',
          modules: [
            {
              name: 'Setting Up Routes',
              description: 'Configuring React Router',
              lessons: [
                { name: 'Installation and Setup', description: 'Setting up React Router', skills: ['react', 'routing'], content_data: [{ type: 'paragraph', content: 'Install and configure React Router in your application.' }] },
                { name: 'Route Configuration', description: 'Defining routes', skills: ['react', 'routing'], content_data: [{ type: 'paragraph', content: 'Learn how to define routes in your React application.' }] }
              ]
            }
          ]
        },
        {
          name: 'Advanced Patterns',
          description: 'Performance optimization and advanced techniques',
          modules: [
            {
              name: 'Performance Optimization',
              description: 'Optimizing React applications',
              lessons: [
                { name: 'React.memo', description: 'Memoizing components', skills: ['react', 'performance'], content_data: [{ type: 'paragraph', content: 'Use React.memo to prevent unnecessary re-renders.' }] },
                { name: 'useMemo and useCallback', description: 'Memoizing values and functions', skills: ['react', 'performance'], content_data: [{ type: 'paragraph', content: 'Optimize expensive calculations with useMemo and useCallback.' }] }
              ]
            }
          ]
        }
      ]
    );

    // Course 3: Python for Data Science
    const pythonCourse = await createFullCourse(
      {
        id: uuidv4(),
        course_name: 'Python for Data Science',
        description: 'Master Python programming for data analysis, visualization, and machine learning. Learn pandas, numpy, matplotlib, and scikit-learn. Perfect for aspiring data scientists.',
        course_type: 'trainer',
        status: 'active',
        level: 'intermediate',
        duration_hours: 60,
        created_by_user_id: TRAINER_ID
      },
      [
        {
          name: 'Python Basics',
          description: 'Python fundamentals for data science',
          modules: [
            {
              name: 'Python Fundamentals',
              description: 'Core Python concepts',
              lessons: [
                { name: 'Python Syntax', description: 'Understanding Python syntax', skills: ['python', 'basics'], content_data: [{ type: 'paragraph', content: 'Learn Python\'s clean and readable syntax.' }] },
                { name: 'Data Structures', description: 'Lists, dictionaries, tuples', skills: ['python', 'data-structures'], content_data: [{ type: 'paragraph', content: 'Master Python\'s built-in data structures.' }] }
              ]
            }
          ]
        },
        {
          name: 'NumPy',
          description: 'Numerical computing with NumPy',
          modules: [
            {
              name: 'NumPy Arrays',
              description: 'Working with NumPy arrays',
              lessons: [
                { name: 'Creating Arrays', description: 'Creating NumPy arrays', skills: ['python', 'numpy'], content_data: [{ type: 'paragraph', content: 'Learn how to create and manipulate NumPy arrays.' }] },
                { name: 'Array Operations', description: 'Performing operations on arrays', skills: ['python', 'numpy'], content_data: [{ type: 'paragraph', content: 'Master array operations and broadcasting.' }] }
              ]
            }
          ]
        },
        {
          name: 'Pandas',
          description: 'Data manipulation with pandas',
          modules: [
            {
              name: 'DataFrames',
              description: 'Working with pandas DataFrames',
              lessons: [
                { name: 'Creating DataFrames', description: 'Creating and loading DataFrames', skills: ['python', 'pandas'], content_data: [{ type: 'paragraph', content: 'Learn how to create and load data into pandas DataFrames.' }] },
                { name: 'Data Manipulation', description: 'Filtering and transforming data', skills: ['python', 'pandas'], content_data: [{ type: 'paragraph', content: 'Master data manipulation techniques in pandas.' }] }
              ]
            }
          ]
        },
        {
          name: 'Data Visualization',
          description: 'Creating visualizations with matplotlib and seaborn',
          modules: [
            {
              name: 'Matplotlib',
              description: 'Basic plotting with matplotlib',
              lessons: [
                { name: 'Line and Bar Charts', description: 'Creating basic charts', skills: ['python', 'matplotlib'], content_data: [{ type: 'paragraph', content: 'Learn how to create line and bar charts with matplotlib.' }] },
                { name: 'Customizing Plots', description: 'Styling and customizing visualizations', skills: ['python', 'matplotlib'], content_data: [{ type: 'paragraph', content: 'Customize your plots with colors, labels, and styles.' }] }
              ]
            }
          ]
        },
        {
          name: 'Machine Learning Basics',
          description: 'Introduction to machine learning with scikit-learn',
          modules: [
            {
              name: 'Scikit-Learn',
              description: 'Using scikit-learn for ML',
              lessons: [
                { name: 'Linear Regression', description: 'Implementing linear regression', skills: ['python', 'machine-learning'], content_data: [{ type: 'paragraph', content: 'Learn how to implement linear regression with scikit-learn.' }] },
                { name: 'Classification', description: 'Building classification models', skills: ['python', 'machine-learning'], content_data: [{ type: 'paragraph', content: 'Create classification models using scikit-learn.' }] }
              ]
            }
          ]
        }
      ]
    );

    // Course 4: Node.js Backend Development
    const nodeCourse = await createFullCourse(
      {
        id: uuidv4(),
        course_name: 'Node.js Backend Development',
        description: 'Build scalable backend applications with Node.js and Express. Learn RESTful APIs, database integration, authentication, and deployment. Perfect for full-stack developers.',
        course_type: 'trainer',
        status: 'active',
        level: 'advanced',
        duration_hours: 55,
        created_by_user_id: TRAINER_ID
      },
      [
        {
          name: 'Node.js Fundamentals',
          description: 'Understanding Node.js and npm',
          modules: [
            {
              name: 'Introduction to Node.js',
              description: 'What is Node.js and how it works',
              lessons: [
                { name: 'Node.js Overview', description: 'Understanding Node.js runtime', skills: ['nodejs', 'backend'], content_data: [{ type: 'paragraph', content: 'Node.js is a JavaScript runtime built on Chrome\'s V8 engine.' }] },
                { name: 'npm and Package Management', description: 'Working with npm', skills: ['nodejs', 'npm'], content_data: [{ type: 'paragraph', content: 'Learn how to manage packages with npm.' }] }
              ]
            }
          ]
        },
        {
          name: 'Express.js Framework',
          description: 'Building web applications with Express',
          modules: [
            {
              name: 'Express Basics',
              description: 'Setting up Express server',
              lessons: [
                { name: 'Creating Express App', description: 'Setting up your first Express server', skills: ['nodejs', 'express'], content_data: [{ type: 'paragraph', content: 'Learn how to create and configure an Express application.' }] },
                { name: 'Routing', description: 'Defining routes in Express', skills: ['nodejs', 'express'], content_data: [{ type: 'paragraph', content: 'Master Express routing for handling HTTP requests.' }] }
              ]
            },
            {
              name: 'Middleware',
              description: 'Using Express middleware',
              lessons: [
                { name: 'Understanding Middleware', description: 'What is middleware', skills: ['nodejs', 'express'], content_data: [{ type: 'paragraph', content: 'Learn how middleware works in Express applications.' }] },
                { name: 'Custom Middleware', description: 'Creating your own middleware', skills: ['nodejs', 'express'], content_data: [{ type: 'paragraph', content: 'Create custom middleware for your application needs.' }] }
              ]
            }
          ]
        },
        {
          name: 'RESTful APIs',
          description: 'Designing and building REST APIs',
          modules: [
            {
              name: 'API Design',
              description: 'RESTful API principles',
              lessons: [
                { name: 'REST Principles', description: 'Understanding REST architecture', skills: ['nodejs', 'api', 'rest'], content_data: [{ type: 'paragraph', content: 'Learn the principles of RESTful API design.' }] },
                { name: 'HTTP Methods', description: 'Using GET, POST, PUT, DELETE', skills: ['nodejs', 'api'], content_data: [{ type: 'paragraph', content: 'Master HTTP methods for different operations.' }] }
              ]
            }
          ]
        },
        {
          name: 'Database Integration',
          description: 'Connecting to databases',
          modules: [
            {
              name: 'PostgreSQL',
              description: 'Working with PostgreSQL',
              lessons: [
                { name: 'Connecting to PostgreSQL', description: 'Setting up database connection', skills: ['nodejs', 'postgresql'], content_data: [{ type: 'paragraph', content: 'Learn how to connect Node.js applications to PostgreSQL.' }] },
                { name: 'Querying Data', description: 'Executing SQL queries', skills: ['nodejs', 'postgresql'], content_data: [{ type: 'paragraph', content: 'Execute queries and handle database operations.' }] }
              ]
            }
          ]
        },
        {
          name: 'Authentication and Security',
          description: 'Implementing authentication and security',
          modules: [
            {
              name: 'JWT Authentication',
              description: 'Token-based authentication',
              lessons: [
                { name: 'JWT Basics', description: 'Understanding JSON Web Tokens', skills: ['nodejs', 'authentication'], content_data: [{ type: 'paragraph', content: 'Learn how JWT authentication works.' }] },
                { name: 'Implementing JWT', description: 'Adding JWT to your app', skills: ['nodejs', 'authentication'], content_data: [{ type: 'paragraph', content: 'Implement JWT authentication in your Express app.' }] }
              ]
            }
          ]
        }
      ]
    );

    console.log('✅ Created 4 trainer courses\n');

    // ============================================
    // 2. CREATE 4 LEARNER-SPECIFIC COURSES
    // ============================================
    console.log('🎯 Creating 4 learner-specific courses...\n');

    const personalizedCourse1 = await createFullCourse(
      {
        id: uuidv4(),
        course_name: 'Personalized Web Development Path',
        course_description: 'A customized learning journey designed specifically for your web development goals. Covers HTML, CSS, JavaScript, and modern frameworks tailored to your learning pace.',
        course_type: 'learner_specific',
        status: 'active',
        level: 'beginner',
        duration_hours: 80,
        learning_path_designation: {
          is_designated: true,
          target_competency: {
            competency_id: 'web-dev-001',
            competency_name: 'Web Development',
            target_level: 'intermediate'
          }
        }
      },
      [
        {
          name: 'HTML Fundamentals',
          description: 'Mastering HTML structure and semantics',
          modules: [
            {
              name: 'HTML Basics',
              description: 'Understanding HTML elements',
              lessons: [
                { name: 'HTML Structure', description: 'Basic HTML document structure', skills: ['html'], content_data: [{ type: 'paragraph', content: 'Learn the fundamental structure of HTML documents.' }] },
                { name: 'Semantic HTML', description: 'Using semantic elements', skills: ['html'], content_data: [{ type: 'paragraph', content: 'Use semantic HTML for better accessibility and SEO.' }] }
              ]
            }
          ]
        },
        {
          name: 'CSS Styling',
          description: 'Creating beautiful styles with CSS',
          modules: [
            {
              name: 'CSS Basics',
              description: 'Selectors and properties',
              lessons: [
                { name: 'CSS Selectors', description: 'Targeting elements with CSS', skills: ['css'], content_data: [{ type: 'paragraph', content: 'Master CSS selectors to style your web pages.' }] },
                { name: 'Layout with Flexbox', description: 'Creating layouts with Flexbox', skills: ['css', 'flexbox'], content_data: [{ type: 'paragraph', content: 'Learn how to create flexible layouts with CSS Flexbox.' }] }
              ]
            }
          ]
        },
        {
          name: 'JavaScript Basics',
          description: 'Programming fundamentals with JavaScript',
          modules: [
            {
              name: 'JavaScript Introduction',
              description: 'Getting started with JavaScript',
              lessons: [
                { name: 'Variables and Functions', description: 'JavaScript basics', skills: ['javascript'], content_data: [{ type: 'paragraph', content: 'Learn JavaScript variables and functions.' }] },
                { name: 'DOM Manipulation', description: 'Interacting with the DOM', skills: ['javascript', 'dom'], content_data: [{ type: 'paragraph', content: 'Manipulate the Document Object Model with JavaScript.' }] }
              ]
            }
          ]
        },
        {
          name: 'Responsive Design',
          description: 'Making websites work on all devices',
          modules: [
            {
              name: 'Media Queries',
              description: 'Creating responsive layouts',
              lessons: [
                { name: 'Mobile-First Design', description: 'Designing for mobile devices', skills: ['css', 'responsive'], content_data: [{ type: 'paragraph', content: 'Learn mobile-first responsive design principles.' }] }
              ]
            }
          ]
        },
        {
          name: 'Project: Personal Portfolio',
          description: 'Build your own portfolio website',
          modules: [
            {
              name: 'Portfolio Project',
              description: 'Creating a complete portfolio',
              lessons: [
                { name: 'Project Setup', description: 'Setting up your portfolio project', skills: ['html', 'css', 'javascript'], content_data: [{ type: 'paragraph', content: 'Set up your portfolio website project.' }] },
                { name: 'Adding Content', description: 'Adding your work and information', skills: ['html', 'css'], content_data: [{ type: 'paragraph', content: 'Add your projects and personal information to the portfolio.' }] }
              ]
            }
          ]
        }
      ]
    );

    const personalizedCourse2 = await createFullCourse(
      {
        id: uuidv4(),
        course_name: 'Custom React Development Journey',
        course_description: 'A personalized React learning path designed to match your current skill level and career goals. Progressive learning from basics to advanced patterns.',
        course_type: 'learner_specific',
        status: 'active',
        level: 'intermediate',
        duration_hours: 70,
        learning_path_designation: {
          is_designated: true,
          target_competency: {
            competency_id: 'react-dev-001',
            competency_name: 'React Development',
            target_level: 'advanced'
          }
        }
      },
      [
        {
          name: 'React Components',
          description: 'Building reusable components',
          modules: [
            {
              name: 'Component Architecture',
              description: 'Designing component structure',
              lessons: [
                { name: 'Component Design', description: 'Planning component structure', skills: ['react', 'components'], content_data: [{ type: 'paragraph', content: 'Learn how to design effective component architectures.' }] },
                { name: 'Component Composition', description: 'Composing components together', skills: ['react', 'components'], content_data: [{ type: 'paragraph', content: 'Master component composition patterns.' }] }
              ]
            }
          ]
        },
        {
          name: 'State Management',
          description: 'Managing application state',
          modules: [
            {
              name: 'Local State',
              description: 'Component-level state',
              lessons: [
                { name: 'useState Patterns', description: 'Effective state management', skills: ['react', 'state'], content_data: [{ type: 'paragraph', content: 'Learn best practices for using useState.' }] }
              ]
            }
          ]
        },
        {
          name: 'Data Fetching',
          description: 'Loading data in React',
          modules: [
            {
              name: 'API Integration',
              description: 'Fetching data from APIs',
              lessons: [
                { name: 'Fetch API', description: 'Using fetch in React', skills: ['react', 'api'], content_data: [{ type: 'paragraph', content: 'Learn how to fetch data from APIs in React.' }] },
                { name: 'Loading States', description: 'Handling loading and errors', skills: ['react', 'api'], content_data: [{ type: 'paragraph', content: 'Implement loading and error states for API calls.' }] }
              ]
            }
          ]
        },
        {
          name: 'Performance Optimization',
          description: 'Optimizing React applications',
          modules: [
            {
              name: 'Optimization Techniques',
              description: 'Improving app performance',
              lessons: [
                { name: 'Memoization', description: 'Using memoization', skills: ['react', 'performance'], content_data: [{ type: 'paragraph', content: 'Optimize components with memoization techniques.' }] }
              ]
            }
          ]
        },
        {
          name: 'Testing React Apps',
          description: 'Writing tests for React',
          modules: [
            {
              name: 'Testing Basics',
              description: 'Testing React components',
              lessons: [
                { name: 'Jest and React Testing Library', description: 'Setting up testing', skills: ['react', 'testing'], content_data: [{ type: 'paragraph', content: 'Learn how to test React components with Jest.' }] }
              ]
            }
          ]
        }
      ]
    );

    const personalizedCourse3 = await createFullCourse(
      {
        id: uuidv4(),
        course_name: 'Personalized Python Data Analysis',
        course_description: 'A tailored Python course focused on data analysis and visualization. Learn at your own pace with content adapted to your background.',
        course_type: 'learner_specific',
        status: 'active',
        level: 'beginner',
        duration_hours: 65,
        learning_path_designation: {
          is_designated: true,
          target_competency: {
            competency_id: 'data-analysis-001',
            competency_name: 'Data Analysis',
            target_level: 'intermediate'
          }
        }
      },
      [
        {
          name: 'Python Basics',
          description: 'Python fundamentals',
          modules: [
            {
              name: 'Python Introduction',
              description: 'Getting started with Python',
              lessons: [
                { name: 'Python Setup', description: 'Installing Python and tools', skills: ['python'], content_data: [{ type: 'paragraph', content: 'Set up your Python development environment.' }] },
                { name: 'Basic Syntax', description: 'Python syntax basics', skills: ['python'], content_data: [{ type: 'paragraph', content: 'Learn Python\'s basic syntax and structure.' }] }
              ]
            }
          ]
        },
        {
          name: 'Data Manipulation',
          description: 'Working with data',
          modules: [
            {
              name: 'Pandas Basics',
              description: 'Introduction to pandas',
              lessons: [
                { name: 'DataFrames', description: 'Working with DataFrames', skills: ['python', 'pandas'], content_data: [{ type: 'paragraph', content: 'Learn how to work with pandas DataFrames.' }] }
              ]
            }
          ]
        },
        {
          name: 'Data Visualization',
          description: 'Creating visualizations',
          modules: [
            {
              name: 'Plotting',
              description: 'Creating plots',
              lessons: [
                { name: 'Basic Charts', description: 'Creating charts', skills: ['python', 'visualization'], content_data: [{ type: 'paragraph', content: 'Create basic charts with matplotlib.' }] }
              ]
            }
          ]
        },
        {
          name: 'Data Cleaning',
          description: 'Preparing data for analysis',
          modules: [
            {
              name: 'Cleaning Techniques',
              description: 'Data cleaning methods',
              lessons: [
                { name: 'Handling Missing Data', description: 'Dealing with missing values', skills: ['python', 'data-cleaning'], content_data: [{ type: 'paragraph', content: 'Learn techniques for handling missing data.' }] }
              ]
            }
          ]
        },
        {
          name: 'Project: Data Analysis',
          description: 'Complete data analysis project',
          modules: [
            {
              name: 'Final Project',
              description: 'Analyzing real-world data',
              lessons: [
                { name: 'Project Setup', description: 'Setting up your project', skills: ['python', 'pandas'], content_data: [{ type: 'paragraph', content: 'Set up your data analysis project.' }] },
                { name: 'Analysis and Insights', description: 'Drawing insights from data', skills: ['python', 'data-analysis'], content_data: [{ type: 'paragraph', content: 'Perform analysis and draw meaningful insights.' }] }
              ]
            }
          ]
        }
      ]
    );

    const personalizedCourse4 = await createFullCourse(
      {
        id: uuidv4(),
        course_name: 'Tailored Full-Stack Development',
        course_description: 'A comprehensive full-stack development course customized for your learning style. Covers frontend, backend, databases, and deployment.',
        course_type: 'learner_specific',
        status: 'active',
        level: 'intermediate',
        duration_hours: 90,
        learning_path_designation: {
          is_designated: true,
          target_competency: {
            competency_id: 'fullstack-001',
            competency_name: 'Full-Stack Development',
            target_level: 'advanced'
          }
        }
      },
      [
        {
          name: 'Frontend Development',
          description: 'Building user interfaces',
          modules: [
            {
              name: 'Modern Frontend',
              description: 'React and modern tools',
              lessons: [
                { name: 'React Setup', description: 'Setting up React project', skills: ['react', 'frontend'], content_data: [{ type: 'paragraph', content: 'Set up a modern React development environment.' }] },
                { name: 'Component Development', description: 'Building components', skills: ['react'], content_data: [{ type: 'paragraph', content: 'Develop reusable React components.' }] }
              ]
            }
          ]
        },
        {
          name: 'Backend Development',
          description: 'Server-side development',
          modules: [
            {
              name: 'Node.js Backend',
              description: 'Building APIs',
              lessons: [
                { name: 'Express Setup', description: 'Setting up Express server', skills: ['nodejs', 'express'], content_data: [{ type: 'paragraph', content: 'Create Express backend servers.' }] },
                { name: 'RESTful APIs', description: 'Building REST APIs', skills: ['nodejs', 'api'], content_data: [{ type: 'paragraph', content: 'Design and implement RESTful APIs.' }] }
              ]
            }
          ]
        },
        {
          name: 'Database Integration',
          description: 'Working with databases',
          modules: [
            {
              name: 'Database Design',
              description: 'Designing database schemas',
              lessons: [
                { name: 'SQL Basics', description: 'Understanding SQL', skills: ['sql', 'database'], content_data: [{ type: 'paragraph', content: 'Learn SQL fundamentals for database design.' }] },
                { name: 'ORM Usage', description: 'Using ORMs', skills: ['database', 'orm'], content_data: [{ type: 'paragraph', content: 'Work with Object-Relational Mapping tools.' }] }
              ]
            }
          ]
        },
        {
          name: 'Authentication',
          description: 'Implementing security',
          modules: [
            {
              name: 'Auth Systems',
              description: 'User authentication',
              lessons: [
                { name: 'JWT Implementation', description: 'Token-based auth', skills: ['authentication', 'jwt'], content_data: [{ type: 'paragraph', content: 'Implement JWT authentication.' }] },
                { name: 'Password Security', description: 'Secure password handling', skills: ['authentication', 'security'], content_data: [{ type: 'paragraph', content: 'Learn secure password storage techniques.' }] }
              ]
            }
          ]
        },
        {
          name: 'Deployment',
          description: 'Deploying applications',
          modules: [
            {
              name: 'Production Deployment',
              description: 'Deploying to production',
              lessons: [
                { name: 'Cloud Deployment', description: 'Deploying to cloud platforms', skills: ['deployment', 'devops'], content_data: [{ type: 'paragraph', content: 'Deploy applications to cloud platforms.' }] },
                { name: 'CI/CD Pipelines', description: 'Setting up CI/CD', skills: ['devops', 'cicd'], content_data: [{ type: 'paragraph', content: 'Implement continuous integration and deployment.' }] }
              ]
            }
          ]
        }
      ]
    );

    console.log('✅ Created 4 learner-specific courses\n');

    // ============================================
    // 3. CREATE REGISTRATIONS
    // ============================================
    console.log('📋 Creating registrations...\n');

    const courses = [jsCourse.course, reactCourse.course, pythonCourse.course, nodeCourse.course, personalizedCourse1.course, personalizedCourse2.course, personalizedCourse3.course, personalizedCourse4.course];
    
    for (let i = 0; i < Math.min(6, courses.length); i++) {
      await registrationRepo.create({
        learner_id: LEARNER_ID,
        learner_name: LEARNER_NAME,
        course_id: courses[i].id,
        company_id: uuidv4(),
        company_name: LEARNER_COMPANY,
        status: i < 3 ? 'in_progress' : 'completed'
      });
    }

    console.log('✅ Created 6 registrations\n');

    // ============================================
    // 4. CREATE FEEDBACK
    // ============================================
    console.log('💬 Creating feedback...\n');

    await feedbackRepo.create({
      learner_id: LEARNER_ID,
      course_id: jsCourse.course.id,
      rating: 5,
      comment: 'Excellent course! The explanations are clear and the examples are practical. Highly recommend for beginners.'
    });

    await feedbackRepo.create({
      learner_id: LEARNER_ID,
      course_id: reactCourse.course.id,
      rating: 5,
      comment: 'Great React course! The hooks section is particularly well explained. The projects help solidify the concepts.'
    });

    await feedbackRepo.create({
      learner_id: LEARNER_ID,
      course_id: pythonCourse.course.id,
      rating: 4,
      comment: 'Very comprehensive Python course. The data science focus is perfect. Would love more advanced pandas examples.'
    });

    await feedbackRepo.create({
      learner_id: LEARNER_ID,
      course_id: personalizedCourse1.course.id,
      rating: 5,
      comment: 'This personalized path is exactly what I needed! The progression feels natural and the content matches my learning style perfectly.'
    });

    console.log('✅ Created 4 feedback entries\n');

    // ============================================
    // SUMMARY
    // ============================================
    const courseCount = await db.one('SELECT COUNT(*)::int as count FROM courses');
    const topicCount = await db.one('SELECT COUNT(*)::int as count FROM topics');
    const moduleCount = await db.one('SELECT COUNT(*)::int as count FROM modules');
    const lessonCount = await db.one('SELECT COUNT(*)::int as count FROM lessons');
    const registrationCount = await db.one('SELECT COUNT(*)::int as count FROM registrations');
    const feedbackCount = await db.one('SELECT COUNT(*)::int as count FROM feedback');

    console.log('📊 Seeding Summary:');
    console.log(`   ✅ Courses: ${courseCount.count}`);
    console.log(`   ✅ Topics: ${topicCount.count}`);
    console.log(`   ✅ Modules: ${moduleCount.count}`);
    console.log(`   ✅ Lessons: ${lessonCount.count}`);
    console.log(`   ✅ Registrations: ${registrationCount.count}`);
    console.log(`   ✅ Feedback: ${feedbackCount.count}\n`);

    console.log('🎉 Database seeding completed successfully!\n');

  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error.stack);
    throw error;
  } finally {
    await pgp.end();
  }
}

// Run seed
seed()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Seed script failed:', error.message);
    process.exit(1);
  });
