/**
 * Test script to verify Pinecone connection and query
 * Run this to ensure your Pinecone integration is working correctly
 */

import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'pottery-knowledge';
const PINECONE_NAMESPACE = process.env.PINECONE_NAMESPACE || '';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function testPineconeConnection() {
  console.log('🔍 Testing Pinecone Integration\n');
  console.log('=' .repeat(60));
  
  // Check environment variables
  console.log('\n📋 Configuration Check:');
  console.log(`   OPENAI_API_KEY: ${OPENAI_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   PINECONE_API_KEY: ${PINECONE_API_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`   PINECONE_INDEX_NAME: ${PINECONE_INDEX_NAME}`);
  console.log(`   PINECONE_NAMESPACE: ${PINECONE_NAMESPACE || '(default)'}`);
  
  if (!OPENAI_API_KEY || !PINECONE_API_KEY) {
    console.error('\n❌ Error: Missing required API keys in .env file');
    console.log('\nPlease set:');
    if (!OPENAI_API_KEY) console.log('   - OPENAI_API_KEY');
    if (!PINECONE_API_KEY) console.log('   - PINECONE_API_KEY');
    process.exit(1);
  }
  
  try {
    // Initialize clients
    console.log('\n🔌 Initializing clients...');
    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
    
    // Get index info
    console.log(`\n📊 Checking index: ${PINECONE_INDEX_NAME}`);
    const index = pinecone.index(PINECONE_INDEX_NAME);
    
    // Get index stats
    const stats = await index.describeIndexStats();
    console.log(`   ✅ Index found!`);
    console.log(`   📈 Total vectors: ${stats.totalRecordCount || 0}`);
    console.log(`   📐 Dimensions: ${stats.dimension || 'N/A'}`);
    
    if (stats.namespaces) {
      console.log(`   📁 Namespaces: ${Object.keys(stats.namespaces).join(', ') || 'none'}`);
    }
    
    // Test query
    const testQuery = "What are the different types of clay used in pottery?";
    console.log(`\n🔍 Testing search with query: "${testQuery}"`);
    
    // Generate embedding
    console.log('   ⏳ Generating query embedding...');
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: testQuery,
    });
    
    const queryEmbedding = embeddingResponse.data[0].embedding;
    console.log(`   ✅ Embedding generated (${queryEmbedding.length} dimensions)`);
    
    // Query Pinecone
    console.log('   ⏳ Searching Pinecone...');
    const queryResponse = await index.namespace(PINECONE_NAMESPACE).query({
      vector: queryEmbedding,
      topK: 3,
      includeMetadata: true,
    });
    
    console.log(`   ✅ Search completed!`);
    console.log(`   📊 Found ${queryResponse.matches?.length || 0} results\n`);
    
    // Display results
    if (queryResponse.matches && queryResponse.matches.length > 0) {
      console.log('📝 Results:\n');
      queryResponse.matches.forEach((match, index) => {
        const score = (match.score * 100).toFixed(1);
        const metadata = match.metadata || {};
        const topic = metadata.topic || metadata.title || 'No topic';
        const content = metadata.content || metadata.text || 'No content';
        
        console.log(`[${index + 1}] Similarity: ${score}%`);
        console.log(`    Topic: ${topic}`);
        console.log(`    Content: ${content.substring(0, 150)}${content.length > 150 ? '...' : ''}`);
        console.log(`    Metadata keys: ${Object.keys(metadata).join(', ')}`);
        console.log();
      });
    } else {
      console.log('⚠️  No results found. This could mean:');
      console.log('   1. The index is empty');
      console.log('   2. The embedding model doesn\'t match');
      console.log('   3. The namespace is incorrect');
    }
    
    console.log('=' .repeat(60));
    console.log('\n✅ Pinecone connection test completed successfully!');
    console.log('\nYour pottery agent is ready to use Pinecone for RAG.\n');
    
  } catch (error) {
    console.error('\n❌ Error during testing:');
    console.error(`   ${error.message}`);
    
    if (error.message.includes('Index not found')) {
      console.log('\n💡 Suggestion: Check that PINECONE_INDEX_NAME matches your actual index name');
    } else if (error.message.includes('Unauthorized') || error.message.includes('403')) {
      console.log('\n💡 Suggestion: Check that your PINECONE_API_KEY is correct');
    } else if (error.message.includes('Incorrect API key')) {
      console.log('\n💡 Suggestion: Check that your OPENAI_API_KEY is correct');
    }
    
    console.log('\nFull error:', error);
    process.exit(1);
  }
}

// Run the test
testPineconeConnection().catch(console.error);
