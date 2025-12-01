import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const logFile = 'test-results.log';
const log = (msg) => {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}\n`;
  console.log(msg);
  fs.appendFileSync(logFile, line);
};

log('=== OpenAI Integration Test ===\n');
log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
log(`OPENAI_MODEL: ${process.env.OPENAI_MODEL || 'gpt-4o-mini (default)'}\n`);

(async () => {
  try {
    const { runOpenAI, generateIntents } = await import('./services/enrichment/OpenAIIntentService.js');
    
    log('Test 1: Testing runOpenAI()...');
    try {
      const result = await runOpenAI("Say 'AI enrichment is working'");
      log('✅ Test 1 PASSED');
      log(`Result: ${result.substring(0, 100)}${result.length > 100 ? '...' : ''}\n`);
    } catch (error) {
      log(`❌ Test 1 FAILED: ${error.message}\n`);
    }
    
    log('Test 2: Testing generateIntents()...');
    try {
      const intents = await generateIntents({
        topic: 'React Hooks',
        skills: ['react', 'javascript']
      });
      log('✅ Test 2 PASSED');
      log(`YouTube queries: ${JSON.stringify(intents.queries.youtube)}`);
      log(`GitHub queries: ${JSON.stringify(intents.queries.github)}`);
      log(`Tags: ${JSON.stringify(intents.tags)}\n`);
    } catch (error) {
      log(`❌ Test 2 FAILED: ${error.message}\n`);
    }
    
    log('🎉 Test Complete! Check test-results.log for details.');
  } catch (error) {
    log(`❌ Import failed: ${error.message}`);
    process.exit(1);
  }
})();
