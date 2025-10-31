import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';
import { potterySearchTool } from '../tools/pottery-tool';

/**
 * Pottery Knowledge Workflow
 * 
 * This workflow helps users with pottery-related queries by:
 * 1. Analyzing the user's question
 * 2. Searching the Pinecone knowledge base
 * 3. Formatting a comprehensive response
 * 4. Optionally providing related topics
 */

// Step 1: Parse and categorize the pottery query
const categorizeQuery = createStep({
  id: 'categorize-query',
  description: 'Analyzes and categorizes the pottery question',
  inputSchema: z.object({
    question: z.string().describe('The pottery-related question from the user'),
  }),
  outputSchema: z.object({
    question: z.string(),
    category: z.string(),
    keywords: z.array(z.string()),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const question = inputData.question.toLowerCase();
    
    // Categorize the question
    let category = 'general';
    if (question.includes('clay') || question.includes('material')) {
      category = 'materials';
    } else if (question.includes('glaze') || question.includes('glazing')) {
      category = 'glazing';
    } else if (question.includes('fire') || question.includes('firing') || question.includes('kiln')) {
      category = 'firing';
    } else if (question.includes('wheel') || question.includes('throw')) {
      category = 'techniques';
    } else if (question.includes('hand') || question.includes('coil') || question.includes('slab')) {
      category = 'hand-building';
    } else if (question.includes('crack') || question.includes('problem') || question.includes('fix')) {
      category = 'troubleshooting';
    } else if (question.includes('tool')) {
      category = 'tools';
    }

    // Extract keywords (simple approach - in production, use NLP)
    const keywords = question
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 5);

    return {
      question: inputData.question,
      category,
      keywords,
    };
  },
});

// Step 2: Search Pinecone for relevant information
const searchKnowledge = createStep({
  id: 'search-knowledge',
  description: 'Searches the Pinecone knowledge base for relevant pottery information',
  inputSchema: z.object({
    question: z.string(),
    category: z.string(),
    keywords: z.array(z.string()),
  }),
  outputSchema: z.object({
    results: z.string(),
    query: z.string(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    // Use the pottery search tool directly
    const { Pinecone } = await import('@pinecone-database/pinecone');
    const { OpenAI } = await import('openai');
    
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY || '',
    });
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || '',
    });
    
    const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME || 'pottery-knowledge';
    const PINECONE_NAMESPACE = process.env.PINECONE_NAMESPACE || '';
    
    try {
      const embeddingResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: inputData.question,
      });
      
      const queryEmbedding = embeddingResponse.data[0].embedding;
      const index = pinecone.index(PINECONE_INDEX_NAME);
      
      const queryResponse = await index.namespace(PINECONE_NAMESPACE).query({
        vector: queryEmbedding,
        topK: 5,
        includeMetadata: true,
      });
      
      const results = (queryResponse.matches || [])
        .filter((match: any) => match.score && match.score > 0.6)
        .map((match: any, idx: number) => {
          const metadata = match.metadata || {};
          const topic = metadata.title || metadata.topic || 'General Information';
          const content = metadata.description || metadata.lede || 'No content';
          const score = (match.score * 100).toFixed(1);
          return `[Result ${idx + 1}] (${score}%) ${topic}:\n${content}`;
        })
        .join('\n\n');
      
      return {
        results: results || 'No results found',
        query: inputData.question,
      };
    } catch (error) {
      return {
        results: 'Error searching knowledge base',
        query: inputData.question,
      };
    }
  },
});

// Step 3: Format the response with structured information
const formatResponse = createStep({
  id: 'format-response',
  description: 'Formats the search results into a comprehensive response',
  inputSchema: z.object({
    results: z.string(),
    query: z.string(),
  }),
  outputSchema: z.object({
    answer: z.string(),
    category: z.string(),
    relatedTopics: z.array(z.string()),
    sources: z.number(),
  }),
  execute: async ({ inputData }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const { results, query } = inputData;
    
    // Determine category from query
    const queryLower = query.toLowerCase();
    let category = 'general';
    if (queryLower.includes('clay') || queryLower.includes('material')) {
      category = 'materials';
    } else if (queryLower.includes('glaze') || queryLower.includes('glazing')) {
      category = 'glazing';
    } else if (queryLower.includes('fire') || queryLower.includes('firing') || queryLower.includes('kiln')) {
      category = 'firing';
    } else if (queryLower.includes('wheel') || queryLower.includes('throw')) {
      category = 'techniques';
    } else if (queryLower.includes('hand') || queryLower.includes('coil') || queryLower.includes('slab')) {
      category = 'hand-building';
    } else if (queryLower.includes('crack') || queryLower.includes('problem') || queryLower.includes('fix')) {
      category = 'troubleshooting';
    } else if (queryLower.includes('tool')) {
      category = 'tools';
    }

    // Count sources
    const sourceCount = (results.match(/\[Result \d+\]/g) || []).length;

    // Extract related topics based on category
    const relatedTopics: string[] = [];
    switch (category) {
      case 'materials':
        relatedTopics.push('Clay preparation', 'Clay storage', 'Clay wedging');
        break;
      case 'glazing':
        relatedTopics.push('Glaze application', 'Glaze firing', 'Glaze defects');
        break;
      case 'firing':
        relatedTopics.push('Bisque firing', 'Glaze firing', 'Kiln types');
        break;
      case 'techniques':
        relatedTopics.push('Centering', 'Pulling walls', 'Trimming');
        break;
      case 'hand-building':
        relatedTopics.push('Pinch pots', 'Coil building', 'Slab construction');
        break;
      case 'troubleshooting':
        relatedTopics.push('Cracking', 'Warping', 'Glaze defects');
        break;
      case 'tools':
        relatedTopics.push('Essential tools', 'Wheel maintenance', 'Kiln care');
        break;
      default:
        relatedTopics.push('Getting started', 'Basic techniques', 'Common questions');
    }

    // Format the answer
    const answer = `**Question:** ${query}

**Category:** ${category.charAt(0).toUpperCase() + category.slice(1)}

**Answer:**
${results}

**Related Topics:**
${relatedTopics.map(topic => `- ${topic}`).join('\n')}

**Sources:** ${sourceCount} results from pottery knowledge base`;

    return {
      answer,
      category,
      relatedTopics,
      sources: sourceCount,
    };
  },
});

// Create the workflow
const potteryWorkflow = createWorkflow({
  id: 'pottery-workflow',
  inputSchema: z.object({
    question: z.string().describe('The pottery question to answer'),
  }),
  outputSchema: z.object({
    answer: z.string(),
    category: z.string(),
    relatedTopics: z.array(z.string()),
    sources: z.number(),
  }),
})
  .then(categorizeQuery)
  .then(searchKnowledge)
  .then(formatResponse);

potteryWorkflow.commit();

export { potteryWorkflow };
