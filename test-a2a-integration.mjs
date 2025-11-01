/**
 * A2A Integration Test Script
 * 
 * This script tests the A2A (Agent-to-Agent) protocol integration
 * for the Pottery Expert Agent deployed on Mastra Cloud.
 * 
 * Run with: node test-a2a-integration.mjs
 */

const A2A_ENDPOINT = 'https://future-hissing-ram-c1017.mastra.cloud/a2a/agent/potteryAgent';

/**
 * Test message/send method
 */
async function testMessageSend() {
  console.log('\n🧪 Testing message/send method...\n');

  const request = {
    jsonrpc: '2.0',
    id: 'test-message-send-001',
    method: 'message/send',
    params: {
      id: 'task-test-001',
      sessionId: 'session-test-001',
      message: {
        kind: 'message',
        role: 'user',
        parts: [
          {
            kind: 'text',
            text: 'What are the different types of clay used in pottery?'
          }
        ],
        messageId: 'msg-test-001',
        taskId: 'task-test-001'
      },
      historyLength: 10,
      metadata: {
        userId: 'test-user-123',
        source: 'integration-test'
      }
    }
  };

  try {
    const response = await fetch(A2A_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request)
    });

    const data = await response.json();

    if (data.error) {
      console.error('❌ Error:', data.error);
      return false;
    }

    console.log('✅ Status:', response.status);
    console.log('✅ Response received');
    console.log('\n📄 Result:');
    console.log('   Task ID:', data.result.id);
    console.log('   Context ID:', data.result.contextId);
    console.log('   Status:', data.result.status.state);
    console.log('   Timestamp:', data.result.status.timestamp);
    console.log('\n💬 Agent Response:');
    console.log('   ', data.result.status.message.parts[0].text.substring(0, 200) + '...');
    console.log('\n📦 Artifacts:', data.result.artifacts.length);
    data.result.artifacts.forEach((artifact, idx) => {
      console.log(`   ${idx + 1}. ${artifact.name} (${artifact.description || 'No description'})`);
    });
    console.log('\n📝 History Items:', data.result.history.length);
    console.log('\n🔍 Metadata:');
    console.log('   Agent:', data.result.metadata.agentName);
    console.log('   Tools Used:', data.result.metadata.toolsUsed);
    console.log('   Vector Search:', data.result.metadata.vectorSearchPerformed);

    return true;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return false;
  }
}

/**
 * Test multi-turn conversation
 */
async function testMultiTurnConversation() {
  console.log('\n🧪 Testing multi-turn conversation...\n');

  const sessionId = 'session-multi-turn-001';

  // First message
  const request1 = {
    jsonrpc: '2.0',
    id: 'test-multi-turn-001',
    method: 'message/send',
    params: {
      id: 'task-multi-turn-001',
      sessionId: sessionId,
      message: {
        kind: 'message',
        role: 'user',
        parts: [
          {
            kind: 'text',
            text: 'What is stoneware?'
          }
        ],
        messageId: 'msg-multi-turn-001',
        taskId: 'task-multi-turn-001'
      }
    }
  };

  try {
    console.log('📤 Sending first message: "What is stoneware?"');
    const response1 = await fetch(A2A_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request1)
    });

    const data1 = await response1.json();
    if (data1.error) {
      console.error('❌ Error:', data1.error);
      return false;
    }

    console.log('✅ Response 1 received');
    console.log('   ', data1.result.status.message.parts[0].text.substring(0, 150) + '...\n');

    // Second message (with context)
    const request2 = {
      jsonrpc: '2.0',
      id: 'test-multi-turn-002',
      method: 'message/send',
      params: {
        id: 'task-multi-turn-002',
        sessionId: sessionId, // Same session for context
        messages: [
          {
            kind: 'message',
            role: 'user',
            parts: [{ kind: 'text', text: 'What is stoneware?' }],
            messageId: 'msg-multi-turn-001',
            taskId: 'task-multi-turn-001'
          },
          {
            kind: 'message',
            role: 'agent',
            parts: [{ kind: 'text', text: data1.result.status.message.parts[0].text }],
            messageId: data1.result.status.message.messageId,
            taskId: 'task-multi-turn-001'
          },
          {
            kind: 'message',
            role: 'user',
            parts: [{ kind: 'text', text: 'What temperature should I fire it at?' }],
            messageId: 'msg-multi-turn-002',
            taskId: 'task-multi-turn-002'
          }
        ]
      }
    };

    console.log('📤 Sending follow-up: "What temperature should I fire it at?"');
    const response2 = await fetch(A2A_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request2)
    });

    const data2 = await response2.json();
    if (data2.error) {
      console.error('❌ Error:', data2.error);
      return false;
    }

    console.log('✅ Response 2 received (with context)');
    console.log('   ', data2.result.status.message.parts[0].text.substring(0, 150) + '...');
    console.log('\n✅ Multi-turn conversation successful!');

    return true;
  } catch (error) {
    console.error('❌ Multi-turn test failed:', error.message);
    return false;
  }
}

/**
 * Test invalid requests (error handling)
 */
async function testErrorHandling() {
  console.log('\n🧪 Testing error handling...\n');

  const tests = [
    {
      name: 'Missing jsonrpc field',
      request: {
        id: 'test-error-001',
        method: 'message/send',
        params: {}
      },
      expectedErrorCode: -32600
    },
    {
      name: 'Invalid method',
      request: {
        jsonrpc: '2.0',
        id: 'test-error-002',
        method: 'invalid/method',
        params: {}
      },
      expectedErrorCode: -32601
    },
    {
      name: 'Missing message parameter',
      request: {
        jsonrpc: '2.0',
        id: 'test-error-003',
        method: 'message/send',
        params: {}
      },
      expectedErrorCode: -32602
    }
  ];

  let allPassed = true;

  for (const test of tests) {
    try {
      const response = await fetch(A2A_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.request)
      });

      const data = await response.json();

      if (data.error && data.error.code === test.expectedErrorCode) {
        console.log(`✅ ${test.name}: Got expected error code ${test.expectedErrorCode}`);
      } else {
        console.log(`❌ ${test.name}: Expected error code ${test.expectedErrorCode}, got ${data.error?.code || 'no error'}`);
        allPassed = false;
      }
    } catch (error) {
      console.error(`❌ ${test.name}: Request failed:`, error.message);
      allPassed = false;
    }
  }

  return allPassed;
}

/**
 * Test different pottery queries
 */
async function testPotteryQueries() {
  console.log('\n🧪 Testing pottery-specific queries...\n');

  const queries = [
    'How do I center clay on a pottery wheel?',
    'What causes pottery to crack during firing?',
    'Explain the raku firing technique',
    'What is the difference between earthenware and porcelain?'
  ];

  let successCount = 0;

  for (const query of queries) {
    const request = {
      jsonrpc: '2.0',
      id: `test-pottery-${successCount}`,
      method: 'message/send',
      params: {
        message: {
          kind: 'message',
          role: 'user',
          parts: [{ kind: 'text', text: query }],
          messageId: `msg-pottery-${successCount}`,
          taskId: `task-pottery-${successCount}`
        }
      }
    };

    try {
      console.log(`📤 Query: "${query}"`);
      const response = await fetch(A2A_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      const data = await response.json();

      if (data.error) {
        console.log('   ❌ Error:', data.error.message);
      } else {
        console.log('   ✅ Success');
        console.log('   📝', data.result.status.message.parts[0].text.substring(0, 100) + '...');
        successCount++;
      }
    } catch (error) {
      console.log('   ❌ Failed:', error.message);
    }

    console.log('');
  }

  console.log(`✅ ${successCount}/${queries.length} pottery queries successful\n`);

  return successCount === queries.length;
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🎨 Pottery Expert Agent - A2A Integration Tests');
  console.log('═══════════════════════════════════════════════════════');
  console.log('\n📍 Endpoint:', A2A_ENDPOINT);
  console.log('📅 Date:', new Date().toISOString());

  const results = {
    messageSend: false,
    multiTurn: false,
    errorHandling: false,
    potteryQueries: false
  };

  results.messageSend = await testMessageSend();
  results.multiTurn = await testMultiTurnConversation();
  results.errorHandling = await testErrorHandling();
  results.potteryQueries = await testPotteryQueries();

  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📊 Test Results Summary');
  console.log('═══════════════════════════════════════════════════════\n');
  console.log(`   message/send:        ${results.messageSend ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   multi-turn:          ${results.multiTurn ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   error handling:      ${results.errorHandling ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   pottery queries:     ${results.potteryQueries ? '✅ PASS' : '❌ FAIL'}`);

  const allPassed = Object.values(results).every(r => r === true);

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(allPassed ? '✅ ALL TESTS PASSED!' : '❌ SOME TESTS FAILED');
  console.log('═══════════════════════════════════════════════════════\n');

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runAllTests().catch(error => {
  console.error('\n💥 Test suite crashed:', error);
  process.exit(1);
});
