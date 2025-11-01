
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';
import { potteryWorkflow } from './workflows/pottery-workflow';
import { potteryAgent } from './agents/pottery-agent';
import { a2aPotteryRoute, a2aHealthRoute } from './routes/a2a-pottery-route';

export const mastra = new Mastra({
  workflows: { potteryWorkflow },
  agents: { potteryAgent },
  storage: new LibSQLStore({
    // stores observability, scores, ... into memory storage, if it needs to persist, change to file:../mastra.db
    url: ":memory:",
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'debug', // Changed to debug for better A2A logging
  }),
  telemetry: {
    // Telemetry is deprecated and will be removed in the Nov 4th release
    enabled: false, 
  },
  observability: {
    // Enables DefaultExporter and CloudExporter for AI tracing
    default: { enabled: true }, 
  },
  server: {
    build: {
      openAPIDocs: true,
      swaggerUI: true,
    },
    apiRoutes: [a2aHealthRoute, a2aPotteryRoute]
  }
});
