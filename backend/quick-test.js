// Quick test to verify OpenAI setup
import dotenv from 'dotenv';
dotenv.config();

console.log('=== OpenAI Setup Verification ===');
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('OPENAI_MODEL:', process.env.OPENAI_MODEL || 'gpt-4o-mini');

try {
  const OpenAI = (await import('openai')).default;
  console.log('✅ OpenAI package imported successfully');
  
  if (process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log('✅ OpenAI client created successfully');
    
    // Quick test call
    console.log('Testing API call...');
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: "Say 'AI enrichment is working'" }],
      max_tokens: 20
    });
    
    console.log('✅ API call successful!');
    console.log('Response:', response.choices[0].message.content);
  } else {
    console.log('❌ OPENAI_API_KEY not found in environment');
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
