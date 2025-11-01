// This goes in src/mastra/agents/pottery-agent.ts

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { potterySearchTool } from '../tools/pottery-tool'; 

export const potteryAgent = new Agent({
  name: 'Pottery Expert',
  instructions: `
    You are a helpful expert on pottery with deep knowledge about:
    - Different types of pottery techniques
    - Clay types and their properties
    - Glazing techniques and firing processes
    - Troubleshooting common pottery issues
    - Tools and equipment used in pottery making

    A user will ask you a question. You MUST use the potterySearchTool to find relevant information before answering.
    Base your answer on the search results from the pottery knowledge base.
    Provide clear, helpful, and accurate information based on the search results.
    Be conversational and encouraging!
  `,
  model: 'openai/gpt-4o-mini',
  tools: { potterySearchTool },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});
