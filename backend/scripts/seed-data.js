/**
 * Shared Seed Data Module
 * Contains all seed data definitions used by both seed.js and seedToDatabase.js
 * Ensures both Supabase databases get exactly the same data
 */

import { v4 as uuidv4 } from 'uuid';

// User IDs (matching frontend AppContext)
export const TRAINER_ID = '20000000-0000-0000-0000-000000000001'; // Tristan Trainer
export const LEARNER_ID = '10000000-0000-0000-0000-000000000001'; // Alice Learner
export const LEARNER_NAME = 'Alice Learner';
export const LEARNER_COMPANY = 'Emerald Learning';

/**
 * Get all seed data
 * Returns complete course structure with topics, modules, and lessons
 */
export function getSeedData() {
  return {
    courses: [
      // ============================================
      // 4 TRAINER COURSES (Marketplace)
      // ============================================
      {
        id: uuidv4(),
        course_name: 'JavaScript Fundamentals',
        course_description: 'Master the core concepts of JavaScript programming. Learn variables, functions, objects, arrays, and modern ES6+ features. Perfect for beginners who want to build a solid foundation.',
        course_type: 'trainer',
        status: 'active',
        level: 'beginner',
        duration_hours: 40,
        created_by_user_id: TRAINER_ID,
        topics: [
          {
            name: 'Getting Started with JavaScript',
            description: 'Introduction to JavaScript and development environment setup',
            modules: [
              {
                name: 'Introduction to JavaScript',
                description: 'What is JavaScript and why it matters',
                lessons: [
                  { 
                    name: 'What is JavaScript?', 
                    description: 'Understanding JavaScript as a programming language', 
                    skills: ['javascript', 'programming'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'JavaScript is a versatile programming language used for web development, server-side applications, and mobile apps.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'JavaScript History', 
                    description: 'The evolution of JavaScript', 
                    skills: ['javascript'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'JavaScript was created in 1995 by Brendan Eich and has evolved significantly over the years.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Setting Up Your Environment', 
                    description: 'Installing Node.js and VS Code', 
                    skills: ['javascript', 'development'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Set up your development environment with Node.js, npm, and a code editor.' }],
                    devlab_exercises: []
                  }
                ]
              },
              {
                name: 'Your First JavaScript Program',
                description: 'Writing and running your first JavaScript code',
                lessons: [
                  { 
                    name: 'Hello World in JavaScript', 
                    description: 'Writing your first console.log', 
                    skills: ['javascript', 'basics'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to write and execute your first JavaScript program using console.log().' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Understanding Console', 
                    description: 'Using browser and Node.js console', 
                    skills: ['javascript', 'debugging'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Master the console for debugging and outputting information.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Understanding var, let, and const', 
                    description: 'Differences between variable declarations', 
                    skills: ['javascript', 'variables'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn when to use var, let, and const and understand their scoping differences.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Variable Hoisting', 
                    description: 'How JavaScript hoists variables', 
                    skills: ['javascript', 'scope'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Understand how JavaScript hoists variable declarations to the top of their scope.' }],
                    devlab_exercises: []
                  }
                ]
              },
              {
                name: 'Data Types',
                description: 'Primitive and reference types',
                lessons: [
                  { 
                    name: 'Primitive Data Types', 
                    description: 'String, Number, Boolean, etc.', 
                    skills: ['javascript', 'data-types'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'JavaScript has 7 primitive types: string, number, bigint, boolean, undefined, null, and symbol.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Type Coercion', 
                    description: 'Understanding type conversion', 
                    skills: ['javascript', 'data-types'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how JavaScript converts between different data types automatically.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Function Declarations', 
                    description: 'Creating functions with function keyword', 
                    skills: ['javascript', 'functions'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to declare functions using the function keyword.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Arrow Functions', 
                    description: 'Modern ES6 arrow function syntax', 
                    skills: ['javascript', 'functions', 'es6'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Master the concise arrow function syntax introduced in ES6.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Function Parameters', 
                    description: 'Passing arguments to functions', 
                    skills: ['javascript', 'functions'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Understand how to pass and receive parameters in functions.' }],
                    devlab_exercises: []
                  }
                ]
              },
              {
                name: 'Scope and Closures',
                description: 'Understanding scope and closure concepts',
                lessons: [
                  { 
                    name: 'Global vs Local Scope', 
                    description: 'Understanding variable scope', 
                    skills: ['javascript', 'scope'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn the difference between global and local variable scope.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Closures Explained', 
                    description: 'Understanding JavaScript closures', 
                    skills: ['javascript', 'closures'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Master closures - one of JavaScript\'s most powerful features.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Object Literals', 
                    description: 'Creating objects with object literal syntax', 
                    skills: ['javascript', 'objects'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to create objects using the object literal syntax.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Accessing Object Properties', 
                    description: 'Dot notation and bracket notation', 
                    skills: ['javascript', 'objects'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Master different ways to access and modify object properties.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Object Methods', 
                    description: 'Adding functions to objects', 
                    skills: ['javascript', 'objects', 'methods'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to add methods to objects and use the this keyword.' }],
                    devlab_exercises: []
                  }
                ]
              },
              {
                name: 'Arrays',
                description: 'Working with arrays and array methods',
                lessons: [
                  { 
                    name: 'Array Basics', 
                    description: 'Creating and accessing arrays', 
                    skills: ['javascript', 'arrays'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to create arrays and access their elements.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Array Methods', 
                    description: 'map, filter, reduce, and more', 
                    skills: ['javascript', 'arrays', 'functional'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Master powerful array methods like map, filter, and reduce.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Destructuring', 
                    description: 'Array and object destructuring', 
                    skills: ['javascript', 'es6'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to extract values from arrays and objects using destructuring.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Spread Operator', 
                    description: 'Using the spread operator', 
                    skills: ['javascript', 'es6'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Master the spread operator for arrays and objects.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Template Literals', 
                    description: 'String interpolation with template literals', 
                    skills: ['javascript', 'es6'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Use template literals for cleaner string formatting.' }],
                    devlab_exercises: []
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: uuidv4(),
        course_name: 'React Development with Hooks',
        course_description: 'Build modern React applications using functional components and hooks. Learn state management, effects, context, and advanced patterns. Perfect for developers ready to build interactive UIs.',
        course_type: 'trainer',
        status: 'active',
        level: 'intermediate',
        duration_hours: 50,
        created_by_user_id: TRAINER_ID,
        topics: [
          {
            name: 'React Fundamentals',
            description: 'Understanding React components and JSX',
            modules: [
              {
                name: 'Introduction to React',
                description: 'What is React and why use it',
                lessons: [
                  { 
                    name: 'What is React?', 
                    description: 'Understanding React library', 
                    skills: ['react', 'javascript'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'React is a JavaScript library for building user interfaces, developed by Facebook.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Component-Based Architecture', 
                    description: 'Understanding components', 
                    skills: ['react', 'components'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how React uses components to build reusable UI pieces.' }],
                    devlab_exercises: []
                  }
                ]
              },
              {
                name: 'JSX and Rendering',
                description: 'Writing JSX and rendering components',
                lessons: [
                  { 
                    name: 'Understanding JSX', 
                    description: 'JavaScript XML syntax', 
                    skills: ['react', 'jsx'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'JSX allows you to write HTML-like syntax in JavaScript.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Rendering Components', 
                    description: 'How React renders components', 
                    skills: ['react', 'rendering'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how React renders components to the DOM.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Introduction to useState', 
                    description: 'Using useState for state management', 
                    skills: ['react', 'hooks', 'useState'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'useState is a hook that lets you add state to functional components.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Updating State', 
                    description: 'How to update state correctly', 
                    skills: ['react', 'hooks', 'useState'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn the proper way to update state in React components.' }],
                    devlab_exercises: []
                  }
                ]
              },
              {
                name: 'useEffect Hook',
                description: 'Handling side effects',
                lessons: [
                  { 
                    name: 'Understanding useEffect', 
                    description: 'Managing side effects in components', 
                    skills: ['react', 'hooks', 'useEffect'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'useEffect lets you perform side effects in functional components.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Dependency Arrays', 
                    description: 'Controlling when effects run', 
                    skills: ['react', 'hooks', 'useEffect'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how dependency arrays control when useEffect runs.' }],
                    devlab_exercises: []
                  }
                ]
              },
              {
                name: 'Other Hooks',
                description: 'useContext, useReducer, and custom hooks',
                lessons: [
                  { 
                    name: 'useContext', 
                    description: 'Sharing data with context', 
                    skills: ['react', 'hooks', 'useContext'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'useContext allows you to access context values in components.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Custom Hooks', 
                    description: 'Creating reusable custom hooks', 
                    skills: ['react', 'hooks'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to create your own custom hooks for code reuse.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Creating Context', 
                    description: 'Setting up React Context', 
                    skills: ['react', 'context'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to create and provide context in React applications.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Consuming Context', 
                    description: 'Using context in components', 
                    skills: ['react', 'context'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Access context values using useContext hook.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Installation and Setup', 
                    description: 'Setting up React Router', 
                    skills: ['react', 'routing'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Install and configure React Router in your application.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Route Configuration', 
                    description: 'Defining routes', 
                    skills: ['react', 'routing'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to define routes in your React application.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'React.memo', 
                    description: 'Memoizing components', 
                    skills: ['react', 'performance'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Use React.memo to prevent unnecessary re-renders.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'useMemo and useCallback', 
                    description: 'Memoizing values and functions', 
                    skills: ['react', 'performance'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Optimize expensive calculations with useMemo and useCallback.' }],
                    devlab_exercises: []
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: uuidv4(),
        course_name: 'Python for Data Science',
        course_description: 'Master Python programming for data analysis, visualization, and machine learning. Learn pandas, numpy, matplotlib, and scikit-learn. Perfect for aspiring data scientists.',
        course_type: 'trainer',
        status: 'active',
        level: 'intermediate',
        duration_hours: 60,
        created_by_user_id: TRAINER_ID,
        topics: [
          {
            name: 'Python Basics',
            description: 'Python fundamentals for data science',
            modules: [
              {
                name: 'Python Fundamentals',
                description: 'Core Python concepts',
                lessons: [
                  { 
                    name: 'Python Syntax', 
                    description: 'Understanding Python syntax', 
                    skills: ['python', 'basics'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn Python\'s clean and readable syntax.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Data Structures', 
                    description: 'Lists, dictionaries, tuples', 
                    skills: ['python', 'data-structures'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Master Python\'s built-in data structures.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Creating Arrays', 
                    description: 'Creating NumPy arrays', 
                    skills: ['python', 'numpy'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to create and manipulate NumPy arrays.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Array Operations', 
                    description: 'Performing operations on arrays', 
                    skills: ['python', 'numpy'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Master array operations and broadcasting.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Creating DataFrames', 
                    description: 'Creating and loading DataFrames', 
                    skills: ['python', 'pandas'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to create and load data into pandas DataFrames.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Data Manipulation', 
                    description: 'Filtering and transforming data', 
                    skills: ['python', 'pandas'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Master data manipulation techniques in pandas.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Line and Bar Charts', 
                    description: 'Creating basic charts', 
                    skills: ['python', 'matplotlib'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to create line and bar charts with matplotlib.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Customizing Plots', 
                    description: 'Styling and customizing visualizations', 
                    skills: ['python', 'matplotlib'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Customize your plots with colors, labels, and styles.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Linear Regression', 
                    description: 'Implementing linear regression', 
                    skills: ['python', 'machine-learning'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to implement linear regression with scikit-learn.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Classification', 
                    description: 'Building classification models', 
                    skills: ['python', 'machine-learning'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Create classification models using scikit-learn.' }],
                    devlab_exercises: []
                  }
                ]
              }
            ]
          }
        ]
      },
      {
        id: uuidv4(),
        course_name: 'Node.js Backend Development',
        course_description: 'Build scalable backend applications with Node.js and Express. Learn RESTful APIs, database integration, authentication, and deployment. Perfect for full-stack developers.',
        course_type: 'trainer',
        status: 'active',
        level: 'advanced',
        duration_hours: 55,
        created_by_user_id: TRAINER_ID,
        topics: [
          {
            name: 'Node.js Fundamentals',
            description: 'Understanding Node.js and npm',
            modules: [
              {
                name: 'Introduction to Node.js',
                description: 'What is Node.js and how it works',
                lessons: [
                  { 
                    name: 'Node.js Overview', 
                    description: 'Understanding Node.js runtime', 
                    skills: ['nodejs', 'backend'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Node.js is a JavaScript runtime built on Chrome\'s V8 engine.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'npm and Package Management', 
                    description: 'Working with npm', 
                    skills: ['nodejs', 'npm'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to manage packages with npm.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Creating Express App', 
                    description: 'Setting up your first Express server', 
                    skills: ['nodejs', 'express'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to create and configure an Express application.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Routing', 
                    description: 'Defining routes in Express', 
                    skills: ['nodejs', 'express'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Master Express routing for handling HTTP requests.' }],
                    devlab_exercises: []
                  }
                ]
              },
              {
                name: 'Middleware',
                description: 'Using Express middleware',
                lessons: [
                  { 
                    name: 'Understanding Middleware', 
                    description: 'What is middleware', 
                    skills: ['nodejs', 'express'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how middleware works in Express applications.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Custom Middleware', 
                    description: 'Creating your own middleware', 
                    skills: ['nodejs', 'express'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Create custom middleware for your application needs.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'REST Principles', 
                    description: 'Understanding REST architecture', 
                    skills: ['nodejs', 'api', 'rest'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn the principles of RESTful API design.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'HTTP Methods', 
                    description: 'Using GET, POST, PUT, DELETE', 
                    skills: ['nodejs', 'api'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Master HTTP methods for different operations.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Connecting to PostgreSQL', 
                    description: 'Setting up database connection', 
                    skills: ['nodejs', 'postgresql'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to connect Node.js applications to PostgreSQL.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Querying Data', 
                    description: 'Executing SQL queries', 
                    skills: ['nodejs', 'postgresql'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Execute queries and handle database operations.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'JWT Basics', 
                    description: 'Understanding JSON Web Tokens', 
                    skills: ['nodejs', 'authentication'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how JWT authentication works.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Implementing JWT', 
                    description: 'Adding JWT to your app', 
                    skills: ['nodejs', 'authentication'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Implement JWT authentication in your Express app.' }],
                    devlab_exercises: []
                  }
                ]
              }
            ]
          }
        ]
      },
      // ============================================
      // 4 LEARNER-SPECIFIC COURSES
      // ============================================
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
        },
        topics: [
          {
            name: 'HTML Fundamentals',
            description: 'Mastering HTML structure and semantics',
            modules: [
              {
                name: 'HTML Basics',
                description: 'Understanding HTML elements',
                lessons: [
                  { 
                    name: 'HTML Structure', 
                    description: 'Basic HTML document structure', 
                    skills: ['html'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn the fundamental structure of HTML documents.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Semantic HTML', 
                    description: 'Using semantic elements', 
                    skills: ['html'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Use semantic HTML for better accessibility and SEO.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'CSS Selectors', 
                    description: 'Targeting elements with CSS', 
                    skills: ['css'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Master CSS selectors to style your web pages.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Layout with Flexbox', 
                    description: 'Creating layouts with Flexbox', 
                    skills: ['css', 'flexbox'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to create flexible layouts with CSS Flexbox.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Variables and Functions', 
                    description: 'JavaScript basics', 
                    skills: ['javascript'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn JavaScript variables and functions.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'DOM Manipulation', 
                    description: 'Interacting with the DOM', 
                    skills: ['javascript', 'dom'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Manipulate the Document Object Model with JavaScript.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Mobile-First Design', 
                    description: 'Designing for mobile devices', 
                    skills: ['css', 'responsive'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn mobile-first responsive design principles.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Project Setup', 
                    description: 'Setting up your portfolio project', 
                    skills: ['html', 'css', 'javascript'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Set up your portfolio website project.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Adding Content', 
                    description: 'Adding your work and information', 
                    skills: ['html', 'css'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Add your projects and personal information to the portfolio.' }],
                    devlab_exercises: []
                  }
                ]
              }
            ]
          }
        ]
      },
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
        },
        topics: [
          {
            name: 'React Components',
            description: 'Building reusable components',
            modules: [
              {
                name: 'Component Architecture',
                description: 'Designing component structure',
                lessons: [
                  { 
                    name: 'Component Design', 
                    description: 'Planning component structure', 
                    skills: ['react', 'components'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to design effective component architectures.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Component Composition', 
                    description: 'Composing components together', 
                    skills: ['react', 'components'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Master component composition patterns.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'useState Patterns', 
                    description: 'Effective state management', 
                    skills: ['react', 'state'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn best practices for using useState.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Fetch API', 
                    description: 'Using fetch in React', 
                    skills: ['react', 'api'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to fetch data from APIs in React.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Loading States', 
                    description: 'Handling loading and errors', 
                    skills: ['react', 'api'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Implement loading and error states for API calls.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Memoization', 
                    description: 'Using memoization', 
                    skills: ['react', 'performance'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Optimize components with memoization techniques.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Jest and React Testing Library', 
                    description: 'Setting up testing', 
                    skills: ['react', 'testing'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to test React components with Jest.' }],
                    devlab_exercises: []
                  }
                ]
              }
            ]
          }
        ]
      },
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
        },
        topics: [
          {
            name: 'Python Basics',
            description: 'Python fundamentals',
            modules: [
              {
                name: 'Python Introduction',
                description: 'Getting started with Python',
                lessons: [
                  { 
                    name: 'Python Setup', 
                    description: 'Installing Python and tools', 
                    skills: ['python'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Set up your Python development environment.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Basic Syntax', 
                    description: 'Python syntax basics', 
                    skills: ['python'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn Python\'s basic syntax and structure.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'DataFrames', 
                    description: 'Working with DataFrames', 
                    skills: ['python', 'pandas'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn how to work with pandas DataFrames.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Basic Charts', 
                    description: 'Creating charts', 
                    skills: ['python', 'visualization'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Create basic charts with matplotlib.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Handling Missing Data', 
                    description: 'Dealing with missing values', 
                    skills: ['python', 'data-cleaning'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn techniques for handling missing data.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Project Setup', 
                    description: 'Setting up your project', 
                    skills: ['python', 'pandas'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Set up your data analysis project.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Analysis and Insights', 
                    description: 'Drawing insights from data', 
                    skills: ['python', 'data-analysis'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Perform analysis and draw meaningful insights.' }],
                    devlab_exercises: []
                  }
                ]
              }
            ]
          }
        ]
      },
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
        },
        topics: [
          {
            name: 'Frontend Development',
            description: 'Building user interfaces',
            modules: [
              {
                name: 'Modern Frontend',
                description: 'React and modern tools',
                lessons: [
                  { 
                    name: 'React Setup', 
                    description: 'Setting up React project', 
                    skills: ['react', 'frontend'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Set up a modern React development environment.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Component Development', 
                    description: 'Building components', 
                    skills: ['react'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Develop reusable React components.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Express Setup', 
                    description: 'Setting up Express server', 
                    skills: ['nodejs', 'express'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Create Express backend servers.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'RESTful APIs', 
                    description: 'Building REST APIs', 
                    skills: ['nodejs', 'api'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Design and implement RESTful APIs.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'SQL Basics', 
                    description: 'Understanding SQL', 
                    skills: ['sql', 'database'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn SQL fundamentals for database design.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'ORM Usage', 
                    description: 'Using ORMs', 
                    skills: ['database', 'orm'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Work with Object-Relational Mapping tools.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'JWT Implementation', 
                    description: 'Token-based auth', 
                    skills: ['authentication', 'jwt'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Implement JWT authentication.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'Password Security', 
                    description: 'Secure password handling', 
                    skills: ['authentication', 'security'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Learn secure password storage techniques.' }],
                    devlab_exercises: []
                  }
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
                  { 
                    name: 'Cloud Deployment', 
                    description: 'Deploying to cloud platforms', 
                    skills: ['deployment', 'devops'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Deploy applications to cloud platforms.' }],
                    devlab_exercises: []
                  },
                  { 
                    name: 'CI/CD Pipelines', 
                    description: 'Setting up CI/CD', 
                    skills: ['devops', 'cicd'], 
                    trainer_ids: [TRAINER_ID],
                    content_data: [{ type: 'paragraph', content: 'Implement continuous integration and deployment.' }],
                    devlab_exercises: []
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    registrations: [
      {
        learner_id: LEARNER_ID,
        learner_name: LEARNER_NAME,
        company_id: uuidv4(),
        company_name: LEARNER_COMPANY,
        status: 'in_progress'
      },
      {
        learner_id: LEARNER_ID,
        learner_name: LEARNER_NAME,
        company_id: uuidv4(),
        company_name: LEARNER_COMPANY,
        status: 'in_progress'
      },
      {
        learner_id: LEARNER_ID,
        learner_name: LEARNER_NAME,
        company_id: uuidv4(),
        company_name: LEARNER_COMPANY,
        status: 'in_progress'
      },
      {
        learner_id: LEARNER_ID,
        learner_name: LEARNER_NAME,
        company_id: uuidv4(),
        company_name: LEARNER_COMPANY,
        status: 'completed'
      },
      {
        learner_id: LEARNER_ID,
        learner_name: LEARNER_NAME,
        company_id: uuidv4(),
        company_name: LEARNER_COMPANY,
        status: 'completed'
      },
      {
        learner_id: LEARNER_ID,
        learner_name: LEARNER_NAME,
        company_id: uuidv4(),
        company_name: LEARNER_COMPANY,
        status: 'completed'
      }
    ],
    feedback: [
      {
        learner_id: LEARNER_ID,
        rating: 5,
        comment: 'Excellent course! The explanations are clear and the examples are practical. Highly recommend for beginners.'
      },
      {
        learner_id: LEARNER_ID,
        rating: 5,
        comment: 'Great React course! The hooks section is particularly well explained. The projects help solidify the concepts.'
      },
      {
        learner_id: LEARNER_ID,
        rating: 4,
        comment: 'Very comprehensive Python course. The data science focus is perfect. Would love more advanced pandas examples.'
      },
      {
        learner_id: LEARNER_ID,
        rating: 5,
        comment: 'This personalized path is exactly what I needed! The progression feels natural and the content matches my learning style perfectly.'
      }
    ]
  };
}


