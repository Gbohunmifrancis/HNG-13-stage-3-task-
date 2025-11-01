// This goes in src/mastra/agents/pottery-agent.ts

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
// We comment out the import because we are not using the tool in this test
// import { potterySearchTool } from '../tools/pottery-tool'; 

export const potteryAgent = new Agent({
  name: 'Pottery Expert',
  instructions: `
    You are a helpful expert on pottery with deep knowledge about:
    - Different types of pottery techniques
    - Clay types and their properties
    - Glazing techniques and firing processes
    - Troubleshooting common pottery issues
    - Tools and equipment used in pottery making

    A user will ask you a question. Answer it directly using your own general knowledge.
    Provide clear, helpful, and accurate information.
    Be conversational and encouraging!
  `,
  model: 'openai/gpt-4o-mini',
  // tools: { potterySearchTool }, // <-- Tool is temporarily disabled
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db', // path is relative to the .mastra/output directory
    }),
  }),
});
