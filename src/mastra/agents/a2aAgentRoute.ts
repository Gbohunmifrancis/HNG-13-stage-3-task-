import { registerApiRoute } from '@mastra/core/server';
import { randomUUID } from 'crypto';

// Helper function to strip HTML tags and clean up text
const stripHtml = (html: string | undefined | null) => {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ') // Replace all HTML tags with a space
    .replace(/&nbsp;/g, ' ')   // Replace non-breaking spaces
    .replace(/\s\s+/g, ' ')   // Collapse multiple whitespace
    .trim();
};

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
      // FINAL FIX: Extract the REAL prompt from the 'data' part
      // -----------------------------------------------------------------
      let promptText = '';

      // Loop through all messages (usually just one)
      for (const msg of messagesList) {
        if (!msg.parts || !Array.isArray(msg.parts)) continue;

        // Find the 'data' part
        const dataPart = msg.parts.find(p => p.kind === 'data' && Array.isArray(p.data));
        
        if (dataPart) {
          // Find the *last* text item in the data array
          const lastTextItem = dataPart.data
            .slice() // Create a copy to reverse safely
            .reverse()
            .find(item => item.kind === 'text' && item.text);
            
          if (lastTextItem) {
            promptText = stripHtml(lastTextItem.text);
            break; // Found the real prompt
          }
        }
      }

      // Fallback: If no 'data' part logic worked, use the old (garbled) 'text' part
      if (!promptText) {
        console.warn("Could not find prompt in 'data' part, using 'text' part as fallback.");
        promptText = messagesList.map((msg) => (
          msg.parts
            ?.filter(part => part.kind === 'text')
            .map(part => stripHtml(part.text))
            .join('\n') || ''
        )).join('\n');
      }

      // Now, create the clean message for the agent
      const mastraMessages = [{
        role: 'user',
        content: promptText
      }];
      // -----------------------------------------------------------------

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

      // Handle blocking vs. non-blocking requests
      if (blocking) {
        // SYNCHRONOUS: Client is waiting
        const response = await getAgentResponse();
        return c.json(response);

      } else {
        // ASYNCHRONOUS: Telex is NOT waiting.
        
        // 1. Acknowledge the request immediately (Telex expects this)
        c.json({ jsonrpc: '2.0', id: requestId, result: { message: "Accepted for processing" } });

        // 2. Do the agent work in the background
        c.executionCtx.waitUntil((async () => {
          
          const webhookUrl = pushNotificationConfig?.url;
          if (!webhookUrl) {
            console.error('Non-blocking request but no pushNotificationConfig.url provided.');
            return;
          }
          
          try {
            // 3. Generate the actual response
            const agentResponse = await getAgentResponse();
            
            // 4. Send the SUCCESS response to the Telex webhook
            await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${pushNotificationConfig.token}`
              },
              body: JSON.stringify(agentResponse)
            });

          } catch (err) {
            console.error('Error processing non-blocking agent request:', err.message);
            
            // 5. Send an ERROR response back to the Telex webhook
            const errorResponse = {
              jsonrpc: '2.0',
              id: requestId, // Use the same requestId from the original request
              error: {
                code: -32000, // Standard JSON-RPC server error
                message: 'Agent failed to generate a response.',
                data: { details: err.message }
              }
            };

            await fetch(webhookUrl, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${pushNotificationConfig.token}`
              },
              body: JSON.stringify(errorResponse)
            });
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
