// Quick check to verify OpenAI package installation
import fs from 'fs';
import path from 'path';

console.log('Checking OpenAI package installation...\n');

// Check if node_modules exists
const nodeModulesPath = path.join(process.cwd(), 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('❌ node_modules directory not found!');
  console.log('Run: npm install');
  process.exit(1);
}

// Check if openai package exists
const openaiPath = path.join(nodeModulesPath, 'openai');
if (!fs.existsSync(openaiPath)) {
  console.log('❌ OpenAI package not found in node_modules!');
  console.log('Run: npm install openai');
  process.exit(1);
}

console.log('✅ node_modules directory exists');
console.log('✅ OpenAI package found in node_modules');

// Try importing
try {
  const OpenAI = (await import('openai')).default;
  console.log('✅ OpenAI module can be imported successfully');
  console.log('✅ Installation verified!\n');
  console.log('You can now start the server with: npm start');
} catch (error) {
  console.log('❌ Error importing OpenAI:', error.message);
  console.log('Try running: npm install openai');
  process.exit(1);
}
