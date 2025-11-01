import { registerApiRoute } from '@mastra/core/server';
import { randomUUID } from 'crypto';

export const a2aAgentRoute = registerApiRoute('/a2a/agent/:agentId', {
  method: 'POST',
  handler: async (c) => {
    let requestId = null;
    try {
      const mastra = c.get('mastra');
      const agentId = c.req.param('agentId');
      
      const body = await c.req.json();
      const { jsonrpc, id, method, params } = body;
      requestId = id || null; // Store request ID for error handling

      if (jsonrpc !== '2.0' || !requestId) {
        return c.json({ jsonrpc: '2.0', id: requestId, error: { code: -32600, message: 'Invalid Request' } }, 400);
      }

      const agent = mastra.getAgent(agentId);
      if (!agent) {
        return c.json({ jsonrpc: '2.0', id: requestId, error: { code: -32602, message: `Agent '${agentId}' not found` } }, 404);
      }

      const { message, messages, contextId, taskId, configuration } = params || {};
      const { blocking = true, pushNotificationConfig } = configuration || {};

      let messagesList = [];
      if (message) messagesList = [message];
      else if (messages && Array.isArray(messages)) messagesList = messages;

      // -----------------------------------------------------------------
      // FIX #1: Only use 'text' parts to build the content
      // This stops history and 'data' parts from garbling the prompt
      // -----------------------------------------------------------------
      const mastraMessages = messagesList.map((msg) => ({
        role: msg.role,
        content: msg.parts
          ?.filter(part => part.kind === 'text') // <-- THE FIX
          .map(part => part.text)
          .join('\n') || '',
      }));
      
      // Define a function to generate and format the response
      const getAgentResponse = async () => {
        const response = await agent.generate(mastraMessages);
        const agentText = response.text || '';

        const artifacts = [
          { artifactId: randomUUID(), name: `${agentId}Response`, parts: [{ kind: 'text', text: agentText }] }
        ];

        if (response.toolResults && response.toolResults.length > 0) {
          artifacts.push({
            artifactId: randomUUID(),
            name: 'ToolResults',
            parts: response.toolResults.map((result) => ({ kind: 'data', data: result }))
          });
        }
        
        const history = [
          ...messagesList.map((msg) => ({
            kind: 'message',
            role: msg.role,
            parts: msg.parts,
            messageId: msg.messageId || randomUUID(),
            taskId: msg.taskId || taskId || randomUUID(),
          })),
          {
            kind: 'message',
            role: 'agent',
            parts: [{ kind: 'text', text: agentText }],
            messageId: randomUUID(),
            taskId: taskId || randomUUID(),
          }
        ];

        // This is the final A2A-compliant response object
        return {
          jsonrpc: '2.0',
          id: requestId,
          result: {
            id: taskId || randomUUID(),
            contextId: contextId || randomUUID(),
            status: {
              state: 'completed',
              timestamp: new Date().toISOString(),
              message: { messageId: randomUUID(), role: 'agent', parts: [{ kind: 'text', text: agentText }], kind: 'message' }
            },
            artifacts,
            history,
            kind: 'task'
          }
        };
      };

      // -----------------------------------------------------------------
      // FIX #2: Handle blocking vs. non-blocking requests
      // -----------------------------------------------------------------
      if (blocking) {
        // SYNCHRONOUS: Client is waiting (like your 'curl' test)
        // Generate response and return it directly
        const response = await getAgentResponse();
        return c.json(response);

      } else {
        // ASYNCHRONOUS: Telex is NOT waiting.
        // We must send the response to the pushNotificationConfig.url
        
        // 1. Acknowledge the request immediately (Telex expects this)
        c.json({ jsonrpc: '2.0', id: requestId, result: { message: "Accepted for processing" } });

        // 2. Do the agent work in the background
        // We use c.executionCtx.waitUntil to allow the work to complete
        // even after the 'Accepted' response has been sent.
        c.executionCtx.waitUntil((async () => {
          try {
            const agentResponse = await getAgentResponse();
            
            if (!pushNotificationConfig?.url) {
              console.error('Non-blocking request but no pushNotificationConfig.url provided.');
              return;
            }

            // 3. Send the final response to the Telex webhook
            await fetch(pushNotificationConfig.url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${pushNotificationConfig.token}`
              },
              body: JSON.stringify(agentResponse)
            });

          } catch (err) {
            console.error('Error processing non-blocking agent request:', err);
            // Optionally, post an error back to a webhook
          }
        })());

        // Return the "Accepted" response (do not wait for the waitUntil)
        return;
      }

    } catch (error) {
      return c.json({
        jsonrpc: '2.0',
        id: requestId,
        error: { code: -32603, message: 'Internal error', data: { details: error.message } }
      }, 500);
    }
  }
});
