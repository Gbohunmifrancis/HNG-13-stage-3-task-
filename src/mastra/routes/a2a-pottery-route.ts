import { registerApiRoute } from '@mastra/core/server';
import { randomUUID } from 'crypto';

/**
 * A2A (Agent-to-Agent) Protocol Route for Pottery Agent
 * 
 * This route implements the JSON-RPC 2.0 specification for A2A communication,
 * allowing the pottery agent to seamlessly integrate with Telex.im and other
 * A2A-compliant platforms.
 * 
 * Endpoint: /a2a/agent/potteryAgent
 * Protocol: JSON-RPC 2.0
 * Method: POST
 */
export const a2aPotteryRoute = registerApiRoute('/a2a/agent/:agentId', {
  method: 'POST',
  handler: async (c) => {
    try {
      const mastra = c.get('mastra');
      const agentId = c.req.param('agentId');

      // Parse JSON-RPC 2.0 request
      const body = await c.req.json();
      const { jsonrpc, id: requestId, method, params } = body;

      // Validate JSON-RPC 2.0 format
      if (jsonrpc !== '2.0' || !requestId) {
        return c.json({
          jsonrpc: '2.0',
          id: requestId || null,
          error: {
            code: -32600,
            message: 'Invalid Request: jsonrpc must be "2.0" and id is required'
          }
        }, 400);
      }

      // Validate agent exists
      const agent = mastra.getAgent(agentId);
      if (!agent) {
        return c.json({
          jsonrpc: '2.0',
          id: requestId,
          error: {
            code: -32602,
            message: `Agent '${agentId}' not found. Available agents: potteryAgent`
          }
        }, 404);
      }

      // Handle different A2A methods
      switch (method) {
        case 'message/send':
          return await handleMessageSend(c, agent, agentId, requestId, params);
        
        case 'message/stream':
          return await handleMessageStream(c, agent, agentId, requestId, params);
        
        case 'tasks/get':
          return await handleTasksGet(c, requestId, params);
        
        case 'tasks/cancel':
          return await handleTasksCancel(c, requestId, params);
        
        default:
          return c.json({
            jsonrpc: '2.0',
            id: requestId,
            error: {
              code: -32601,
              message: `Method '${method}' not found. Supported methods: message/send, message/stream, tasks/get, tasks/cancel`
            }
          }, 400);
      }

    } catch (error: any) {
      console.error('A2A Route Error:', error);
      return c.json({
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Internal error',
          data: { 
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
          }
        }
      }, 500);
    }
  }
});

/**
 * Handle message/send method
 * Processes a single message and returns the complete response
 */
async function handleMessageSend(c: any, agent: any, agentId: string, requestId: string, params: any) {
  const { message, messages, id: taskId, sessionId, metadata, historyLength } = params || {};

  // Build message list from either message or messages parameter
  let messagesList = [];
  if (message) {
    messagesList = [message];
  } else if (messages && Array.isArray(messages)) {
    messagesList = messages;
  } else {
    return c.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32602,
        message: 'Invalid params: either "message" or "messages" is required'
      }
    }, 400);
  }

  // Convert A2A messages to Mastra format
  const mastraMessages = messagesList.map((msg: any) => ({
    role: msg.role === 'user' ? 'user' : msg.role === 'agent' ? 'assistant' : msg.role,
    content: extractMessageContent(msg)
  }));

  // Add context for pottery-specific queries
  const systemContext = {
    role: 'system',
    content: 'You are a pottery expert with access to a rich knowledge base of 28,856+ pottery embeddings. Use the potterySearchTool to find relevant information before answering.'
  };

  // Execute agent with proper context
  const response = await agent.generate(
    [systemContext, ...mastraMessages],
    {
      threadId: sessionId || taskId || randomUUID(),
      resourceId: metadata?.userId || 'telex-user',
    }
  );

  const agentText = response.text || '';
  const currentTaskId = taskId || randomUUID();
  const currentContextId = sessionId || randomUUID();

  // Build artifacts array
  const artifacts = [
    {
      artifactId: randomUUID(),
      name: `${agentId}Response`,
      description: 'Main response from pottery expert',
      parts: [{ kind: 'text', text: agentText }]
    }
  ];

  // Add tool results as artifacts if available
  if (response.toolResults && response.toolResults.length > 0) {
    artifacts.push({
      artifactId: randomUUID(),
      name: 'PotteryKnowledgeResults',
      description: 'RAG search results from Pinecone vector database',
      parts: response.toolResults.map((result: any) => ({
        kind: 'data',
        data: result
      }))
    });
  }

  // Build conversation history
  const history = [
    ...messagesList.map((msg: any) => ({
      kind: 'message',
      role: msg.role,
      parts: msg.parts,
      messageId: msg.messageId || randomUUID(),
      taskId: currentTaskId,
      timestamp: msg.timestamp || new Date().toISOString()
    })),
    {
      kind: 'message',
      role: 'agent',
      parts: [{ kind: 'text', text: agentText }],
      messageId: randomUUID(),
      taskId: currentTaskId,
      timestamp: new Date().toISOString()
    }
  ];

  // Limit history if historyLength is specified
  const limitedHistory = historyLength && historyLength > 0 
    ? history.slice(-historyLength) 
    : history;

  // Return A2A-compliant response
  return c.json({
    jsonrpc: '2.0',
    id: requestId,
    result: {
      id: currentTaskId,
      contextId: currentContextId,
      sessionId: currentContextId,
      status: {
        state: 'completed',
        timestamp: new Date().toISOString(),
        message: {
          messageId: randomUUID(),
          role: 'agent',
          parts: [{ kind: 'text', text: agentText }],
          kind: 'message',
          timestamp: new Date().toISOString()
        }
      },
      artifacts,
      history: limitedHistory,
      kind: 'task',
      metadata: {
        agentId,
        agentName: 'Pottery Expert Agent',
        processingTime: response.metadata?.processingTime,
        toolsUsed: response.toolResults?.length || 0,
        vectorSearchPerformed: response.toolResults?.length > 0
      }
    }
  });
}

/**
 * Handle message/stream method
 * Streams responses for real-time interaction
 */
async function handleMessageStream(c: any, agent: any, agentId: string, requestId: string, params: any) {
  const { message, messages, id: taskId, sessionId, metadata } = params || {};

  let messagesList = [];
  if (message) {
    messagesList = [message];
  } else if (messages && Array.isArray(messages)) {
    messagesList = messages;
  }

  const mastraMessages = messagesList.map((msg: any) => ({
    role: msg.role === 'user' ? 'user' : msg.role === 'agent' ? 'assistant' : msg.role,
    content: extractMessageContent(msg)
  }));

  const currentTaskId = taskId || randomUUID();
  const currentContextId = sessionId || randomUUID();

  // Set up SSE streaming
  c.header('Content-Type', 'text/event-stream');
  c.header('Cache-Control', 'no-cache');
  c.header('Connection', 'keep-alive');

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Send initial status
        const startEvent = {
          jsonrpc: '2.0',
          id: requestId,
          result: {
            id: currentTaskId,
            contextId: currentContextId,
            status: {
              state: 'processing',
              timestamp: new Date().toISOString()
            },
            kind: 'task'
          }
        };
        controller.enqueue(`data: ${JSON.stringify(startEvent)}\n\n`);

        // Stream agent response
        const response = await agent.stream(mastraMessages, {
          threadId: sessionId || currentTaskId,
          resourceId: metadata?.userId || 'telex-user',
        });

        let fullText = '';
        for await (const chunk of response) {
          if (chunk.text) {
            fullText += chunk.text;
            const chunkEvent = {
              jsonrpc: '2.0',
              id: requestId,
              result: {
                id: currentTaskId,
                contextId: currentContextId,
                status: {
                  state: 'streaming',
                  timestamp: new Date().toISOString(),
                  message: {
                    kind: 'message',
                    role: 'agent',
                    parts: [{ kind: 'text', text: chunk.text }]
                  }
                }
              }
            };
            controller.enqueue(`data: ${JSON.stringify(chunkEvent)}\n\n`);
          }
        }

        // Send completion event
        const completionEvent = {
          jsonrpc: '2.0',
          id: requestId,
          result: {
            id: currentTaskId,
            contextId: currentContextId,
            status: {
              state: 'completed',
              timestamp: new Date().toISOString(),
              message: {
                messageId: randomUUID(),
                role: 'agent',
                parts: [{ kind: 'text', text: fullText }],
                kind: 'message'
              }
            },
            artifacts: [
              {
                artifactId: randomUUID(),
                name: `${agentId}Response`,
                parts: [{ kind: 'text', text: fullText }]
              }
            ],
            kind: 'task'
          }
        };
        controller.enqueue(`data: ${JSON.stringify(completionEvent)}\n\n`);
        controller.close();

      } catch (error: any) {
        const errorEvent = {
          jsonrpc: '2.0',
          id: requestId,
          error: {
            code: -32603,
            message: 'Streaming error',
            data: { details: error.message }
          }
        };
        controller.enqueue(`data: ${JSON.stringify(errorEvent)}\n\n`);
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  });
}

/**
 * Handle tasks/get method
 * Retrieves task status and history
 */
async function handleTasksGet(c: any, requestId: string, params: any) {
  const { id: taskId, historyLength, metadata } = params || {};

  if (!taskId) {
    return c.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32602,
        message: 'Invalid params: "id" (taskId) is required'
      }
    }, 400);
  }

  // In a production system, you'd retrieve this from storage
  // For now, return a placeholder response
  return c.json({
    jsonrpc: '2.0',
    id: requestId,
    result: {
      id: taskId,
      status: {
        state: 'completed',
        timestamp: new Date().toISOString()
      },
      history: [],
      kind: 'task',
      metadata: {
        message: 'Task history retrieval requires persistent storage implementation'
      }
    }
  });
}

/**
 * Handle tasks/cancel method
 * Cancels a running task
 */
async function handleTasksCancel(c: any, requestId: string, params: any) {
  const { id: taskId, metadata } = params || {};

  if (!taskId) {
    return c.json({
      jsonrpc: '2.0',
      id: requestId,
      error: {
        code: -32602,
        message: 'Invalid params: "id" (taskId) is required'
      }
    }, 400);
  }

  // In a production system, you'd cancel the running task
  return c.json({
    jsonrpc: '2.0',
    id: requestId,
    result: {
      id: taskId,
      status: {
        state: 'cancelled',
        timestamp: new Date().toISOString()
      },
      kind: 'task'
    }
  });
}

/**
 * Extract content from A2A message parts
 */
function extractMessageContent(msg: any): string {
  if (!msg.parts || !Array.isArray(msg.parts)) {
    return '';
  }

  return msg.parts.map((part: any) => {
    if (part.kind === 'text') return part.text;
    if (part.kind === 'data') return JSON.stringify(part.data);
    return '';
  }).join('\n');
}
