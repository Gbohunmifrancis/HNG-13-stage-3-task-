/**
 * Simple test script for the Pottery Agent
 * 
 * This script demonstrates how to use the pottery agent programmatically.
 * Run with: npm run dev (in another terminal) then node test-pottery.js
 */

const testQueries = [
  "What are the different types of clay used in pottery?",
  "How do I start with wheel throwing?",
  "What's the difference between bisque firing and glaze firing?",
  "How can I fix cracks in my pottery?",
  "What tools do I need to start pottery as a beginner?",
];

async function testPotteryAgent() {
  console.log("🏺 Testing Pottery Agent\n");
  console.log("=".repeat(50));
  
  const baseUrl = "http://localhost:4111";
  
  for (const query of testQueries) {
    console.log(`\n📝 Question: ${query}\n`);
    
    try {
      const response = await fetch(`${baseUrl}/api/agents/potteryAgent/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [
            {
              role: "user",
              content: query,
            },
          ],
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`💡 Answer: ${data.text}\n`);
      console.log("-".repeat(50));
      
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      console.log("Make sure the Mastra dev server is running: npm run dev\n");
    }
  }
}

// Run the test
console.log("\n🚀 Starting Pottery Agent Tests...\n");
console.log("⚠️  Make sure you have:");
console.log("   1. Set OPENAI_API_KEY in your .env file");
console.log("   2. Started the dev server: npm run dev");
console.log("   3. Waited for the server to be ready\n");

testPotteryAgent().catch(console.error);
