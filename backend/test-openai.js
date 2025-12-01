import dotenv from 'dotenv';

dotenv.config();

console.log('🧪 Testing OpenAI Integration...\n');
console.log('Environment check:');
console.log('- OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing');
console.log('- OPENAI_MODEL:', process.env.OPENAI_MODEL || 'gpt-4o-mini (default)');
console.log('');

async function testOpenAI() {
  try {
    const { runOpenAI, generateIntents } = await import('./services/enrichment/OpenAIIntentService.js');

    // Test 1: Simple runOpenAI call
    console.log('Test 1: Testing runOpenAI() helper function...');
    try {
      const result = await runOpenAI("Say 'AI enrichment is working'");
      console.log('✅ Test 1 PASSED');
      console.log('Result:', result.substring(0, 100) + (result.length > 100 ? '...' : ''));
      console.log('');
    } catch (error) {
      console.error('❌ Test 1 FAILED:', error.message);
      if (error.stack) console.error('Stack:', error.stack);
      console.log('');
    }

    // Test 2: generateIntents function
    console.log('Test 2: Testing generateIntents() function...');
    try {
      const intents = await generateIntents({
        topic: 'React Hooks',
        skills: ['react', 'javascript']
      });
      console.log('✅ Test 2 PASSED');
      console.log('Intents generated:');
      console.log('- YouTube queries:', intents.queries.youtube);
      console.log('- GitHub queries:', intents.queries.github);
      console.log('- Tags:', intents.tags);
      console.log('- Source:', intents.source || 'N/A');
      console.log('');
    } catch (error) {
      console.error('❌ Test 2 FAILED:', error.message);
      if (error.stack) console.error('Stack:', error.stack);
      console.log('');
    }

    console.log('🎉 OpenAI Integration Test Complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to import OpenAI service:', error.message);
    if (error.stack) console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testOpenAI();
