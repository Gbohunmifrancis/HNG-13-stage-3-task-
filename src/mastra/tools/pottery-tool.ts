// This goes in src/mastra/tools/pottery-tool.ts

import { createTool } from '@mastra/core/tools'; // <-- THIS WAS THE LIKELY ERROR
import { z } from 'zod';
import { Pinecone } from '@pinecone-database/pinecone';
import { OpenAI } from 'openai';

/**
 * Pottery Search Tool - RAG (Retrieval-Augmented Generation) Tool
 * * This tool searches through a Pinecone vector database containing pottery knowledge.
 * It uses OpenAI embeddings to convert queries into vectors and performs similarity search.
 */

// Initialize Pinecone client
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY || '',
});

// Initialize OpenAI client for embeddings
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

// Get the Pinecone index name from environment variable
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'pottery-knowledge';
const PINECONE_NAMESPACE = process.env.PINECONE_NAMESPACE || ''; // Optional namespace

// Mock knowledge base - Used as fallback if Pinecone is not configured
const potteryKnowledge = [
  {
    topic: "Clay Types",
    content: "There are three main types of clay used in pottery: Earthenware (fires at low temperatures 1000-1150°C, porous), Stoneware (fires at 1200-1300°C, non-porous, durable), and Porcelain (fires at 1200-1400°C, white, translucent, very strong).",
  },
  {
    topic: "Wheel Throwing",
    content: "Wheel throwing is a pottery technique where clay is shaped on a potter's wheel. Key steps include: centering the clay, opening the form, pulling up the walls, and shaping. It requires practice to master hand coordination and maintaining consistent pressure.",
  },
  {
    topic: "Glazing",
    content: "Glazing is the process of applying a glassy coating to pottery. Glazes provide color, texture, and make pieces waterproof. Glazes are applied after bisque firing and before the final glaze firing. Common application methods include dipping, pouring, brushing, and spraying.",
  },
  {
    topic: "Firing Process",
    content: "Pottery goes through two main firings: Bisque firing (first firing at 900-1000°C to harden the clay) and Glaze firing (second firing at higher temperatures to melt the glaze). Kilns can be electric, gas, or wood-fired, each producing different effects.",
  },
  {
    topic: "Hand Building",
    content: "Hand-building techniques include: Pinch pots (shaping clay with fingers), Coil building (rolling clay into ropes and stacking them), and Slab building (rolling clay flat and joining pieces). These techniques predate the potter's wheel and are still widely used.",
  },
  {
    topic: "Clay Preparation",
    content: "Clay preparation involves wedging (kneading clay to remove air bubbles and create uniform consistency). Proper wedging prevents cracking and explosions in the kiln. Clay should be stored in airtight containers to maintain moisture.",
  },
  {
    topic: "Common Issues",
    content: "Common pottery problems include: Cracking (often from drying too quickly or uneven thickness), Warping (from uneven drying or clay memory), S-cracks (from improper wedging), and Glaze defects like crazing (fine cracks in glaze from thermal expansion mismatch) or crawling (glaze pulling away from clay).",
  },
  {
    topic: "Tools",
    content: "Essential pottery tools include: Potter's wheel, kiln, wire clay cutter, needle tool, ribbon/loop tools, sponges, wooden modeling tools, calipers, bat system, and trimming tools. Beginners can start with basic hand tools before investing in a wheel.",
  },
];

/**
 * Search Pinecone vector database for relevant pottery information
 */
async function searchPineconeKnowledge(query: string, maxResults: number = 3): Promise<string> {
  try {
    // Generate embeddings for the query using OpenAI
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Or 'text-embedding-ada-002'
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0].embedding;

    // Get the Pinecone index
    const index = pinecone.index(PINECONE_INDEX_NAME);

    // Query Pinecone for similar vectors
    const queryResponse = await index.namespace(PINECONE_NAMESPACE).query({
      vector: queryEmbedding,
      topK: maxResults,
      includeMetadata: true,
    });

    // Check if we got results
    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      return "No relevant information found in the knowledge base for this query.";
    }

    // Format the results
    const results = queryResponse.matches
      .filter((match: any) => match.score && match.score > 0.6) // Lower threshold to 0.6 for more results
      .map((match: any, index: number) => {
        const metadata = match.metadata || {};
        
        // Handle multiple metadata field variations from your Pinecone index
        const topic = metadata.title || 
                     metadata.topic || 
                     metadata.originalTerm || 
                     metadata.original_term || 
                     'General Information';
        
        const content = metadata.description || 
                       metadata.lede || 
                       metadata.content || 
                       metadata.text || 
                       'No detailed content available';
        
        const category = metadata.category || '';
        const source = metadata.source || '';
        const score = match.score ? (match.score * 100).toFixed(1) : 'N/A';
        
        // Build a rich response with available metadata
        let result = `[Result ${index + 1}] (Relevance: ${score}%) ${topic}`;
        if (category) result += ` [Category: ${category}]`;
        result += `:\n${content}`;
        if (source) result += `\n(Source: ${source})`;
        
        return result;
      });

    if (results.length === 0) {
      return "No highly relevant information found. The query may be too specific or outside the knowledge base.";
    }

    return results.join("\n\n");

  } catch (error) {
    console.error('Error querying Pinecone:', error);
    // Fallback to mock knowledge base if Pinecone fails
    return searchMockKnowledge(query, maxResults);
  }
}

/**
 * Fallback search function using mock knowledge base
 */
function searchMockKnowledge(query: string, maxResults: number = 3): string {
  const queryLower = query.toLowerCase();
  
  // Simple keyword matching - Used as fallback
  const results = potteryKnowledge
    .map(item => {
      const contentLower = item.content.toLowerCase();
      const topicLower = item.topic.toLowerCase();
      
      // Calculate relevance score based on keyword matches
      const queryWords = queryLower.split(/\s+/);
      let score = 0;
      
      queryWords.forEach(word => {
        if (word.length > 3) { // Only count words longer than 3 chars
          if (topicLower.includes(word)) score += 3;
          if (contentLower.includes(word)) score += 1;
        }
      });
      
      return { ...item, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  if (results.length === 0) {
    return "No relevant information found in the knowledge base for this query.";
  }

  return results
    .map((item, index) => 
      `[Result ${index + 1}] ${item.topic}:\n${item.content}`
    )
    .join("\n\n");
}

export const potterySearchTool = createTool({
  id: 'pottery-search-tool',
  description: 'Search the pottery knowledge base for relevant information about pottery techniques, materials, processes, and troubleshooting. Use this tool to find accurate information before answering user questions.',
  inputSchema: z.object({
    query: z.string().describe('The search query - what you want to know about pottery'),
    maxResults: z.number().optional().default(3).describe('Maximum number of results to return (default: 3)'),
  }),
  outputSchema: z.object({
    results: z.string().describe('The search results from the pottery knowledge base'),
    query: z.string().describe('The original search query'),
  }),
  execute: async ({ context }) => {
    const { query, maxResults = 3 } = context;
    
    // Check if Pinecone is configured
    const usePinecone = process.env.PINECONE_API_KEY && process.env.PINECONE_INDEX_NAME;
    
    let results: string;
    
    if (usePinecone) {
      // Use Pinecone for vector similarity search
      results = await searchPineconeKnowledge(query, maxResults);
    } else {
      // Fallback to mock knowledge base
      console.warn('Pinecone not configured. Using mock knowledge base. Set PINECONE_API_KEY and PINECONE_INDEX_NAME environment variables.');
      results = searchMockKnowledge(query, maxResults);
    }
    
    return {
      results,
      query,
    };
  },
});
