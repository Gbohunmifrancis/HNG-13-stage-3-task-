# A2A Endpoint Validation Script (PowerShell)
# Simulates the HNG grading test for A2A protocol compliance
# Run with: .\test-a2a-validation.ps1

param(
    [string]$Endpoint = "https://future-hissing-ram-c1017.mastra.cloud/a2a/agent/potteryAgent"
)

# Initialize scoring
$totalScore = 0
$maxScore = 10
$passedTests = 0
$failedTests = 0
$startTime = Get-Date

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "A2A Endpoint Validation Results" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing Endpoint: $Endpoint" -ForegroundColor Yellow
Write-Host ""

# ============================================================
# TEST 1: A2A Endpoint Accessibility (2 points)
# ============================================================
Write-Host "============================================" -ForegroundColor White
Write-Host "TEST 1: A2A Endpoint Accessibility (2 pts)" -ForegroundColor White
Write-Host "============================================" -ForegroundColor White

try {
    # Try to reach the endpoint
    $response = Invoke-WebRequest -Uri $Endpoint -Method POST -ContentType "application/json" -Body '{}' -ErrorAction Stop -TimeoutSec 10
    
    Write-Host "✅ Endpoint is accessible" -ForegroundColor Green
    Write-Host "   └─ Status: $($response.StatusCode)" -ForegroundColor Gray
    $totalScore += 2
    $passedTests++
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 400 -or $statusCode -eq 404 -or $statusCode -eq 500) {
        # Endpoint is reachable but returning an error (still counts as accessible)
        Write-Host "✅ Endpoint is accessible (returned error $statusCode)" -ForegroundColor Green
        Write-Host "   └─ Status: $statusCode" -ForegroundColor Gray
        $totalScore += 2
        $passedTests++
    } else {
        Write-Host "❌ Endpoint is not accessible" -ForegroundColor Red
        Write-Host "   └─ Error: $($_.Exception.Message)" -ForegroundColor Gray
        $failedTests++
    }
}

Write-Host ""

# ============================================================
# TEST 2: A2A Protocol Support (5 points)
# ============================================================
Write-Host "============================================" -ForegroundColor White
Write-Host "TEST 2: A2A Protocol Support (5 pts)" -ForegroundColor White
Write-Host "============================================" -ForegroundColor White

# Construct a valid JSON-RPC 2.0 request
$a2aRequest = @{
    jsonrpc = "2.0"
    id = "test-validation-001"
    method = "message/send"
    params = @{
        id = "task-validation-001"
        sessionId = "session-validation-001"
        message = @{
            kind = "message"
            role = "user"
            parts = @(
                @{
                    kind = "text"
                    text = "What are the different types of clay used in pottery?"
                }
            )
            messageId = "msg-validation-001"
            taskId = "task-validation-001"
        }
        metadata = @{
            userId = "validator-test"
            source = "automated-validation"
        }
    }
} | ConvertTo-Json -Depth 10

try {
    Write-Host "📤 Sending valid A2A request..." -ForegroundColor Cyan
    
    $response = Invoke-RestMethod -Uri $Endpoint -Method POST -ContentType "application/json" -Body $a2aRequest -ErrorAction Stop -TimeoutSec 30
    
    # Check if response has required JSON-RPC structure
    if ($response.jsonrpc -eq "2.0" -and $response.id) {
        
        if ($response.result) {
            Write-Host "✅ A2A Protocol Support: Valid response" -ForegroundColor Green
            Write-Host "   └─ Response contains 'jsonrpc' and 'result'" -ForegroundColor Gray
            Write-Host "   └─ Task ID: $($response.result.id)" -ForegroundColor Gray
            Write-Host "   └─ Status: $($response.result.status.state)" -ForegroundColor Gray
            $totalScore += 5
            $passedTests++
            
            # Store response for next test
            $script:validResponse = $response
            
        } elseif ($response.error) {
            Write-Host "⚠️  A2A Protocol Support: Response has error" -ForegroundColor Yellow
            Write-Host "   └─ Error code: $($response.error.code)" -ForegroundColor Gray
            Write-Host "   └─ Error message: $($response.error.message)" -ForegroundColor Gray
            $totalScore += 2  # Partial credit for correct error format
            $failedTests++
        } else {
            Write-Host "❌ A2A Protocol Support: Invalid response structure" -ForegroundColor Red
            Write-Host "   └─ Missing both 'result' and 'error'" -ForegroundColor Gray
            $failedTests++
        }
        
    } else {
        Write-Host "❌ A2A Protocol Support: Not JSON-RPC 2.0 compliant" -ForegroundColor Red
        Write-Host "   └─ Missing 'jsonrpc' or 'id' field" -ForegroundColor Gray
        $failedTests++
    }
    
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    
    if ($statusCode -eq 400) {
        Write-Host "❌ A2A Protocol Support: Endpoint does not accept A2A requests" -ForegroundColor Red
        Write-Host "   └─ Status: 400 Bad Request" -ForegroundColor Gray
        Write-Host "   └─ Possible causes:" -ForegroundColor Gray
        Write-Host "      • Tool not registered in agent" -ForegroundColor Gray
        Write-Host "      • Invalid request format" -ForegroundColor Gray
        Write-Host "      • Missing required parameters" -ForegroundColor Gray
    } elseif ($statusCode -eq 404) {
        Write-Host "❌ A2A Protocol Support: Endpoint not found" -ForegroundColor Red
        Write-Host "   └─ Status: 404 Not Found" -ForegroundColor Gray
        Write-Host "   └─ Check that route is registered correctly" -ForegroundColor Gray
    } elseif ($statusCode -eq 500) {
        Write-Host "❌ A2A Protocol Support: Internal server error" -ForegroundColor Red
        Write-Host "   └─ Status: 500 Internal Server Error" -ForegroundColor Gray
        Write-Host "   └─ Check server logs for details" -ForegroundColor Gray
    } else {
        Write-Host "❌ A2A Protocol Support: Request failed" -ForegroundColor Red
        Write-Host "   └─ Error: $($_.Exception.Message)" -ForegroundColor Gray
    }
    
    $failedTests++
}

Write-Host ""

# ============================================================
# TEST 3: A2A Response Format (3 points)
# ============================================================
Write-Host "============================================" -ForegroundColor White
Write-Host "TEST 3: A2A Response Format (3 pts)" -ForegroundColor White
Write-Host "============================================" -ForegroundColor White

if ($script:validResponse) {
    $result = $script:validResponse.result
    $missingFields = @()
    $score = 3
    
    # Check required fields
    if (-not $result.id) { $missingFields += "id"; $score -= 0.5 }
    if (-not $result.contextId) { $missingFields += "contextId"; $score -= 0.3 }
    if (-not $result.status) { $missingFields += "status"; $score -= 1 }
    if (-not $result.status.state) { $missingFields += "status.state"; $score -= 0.5 }
    if (-not $result.status.timestamp) { $missingFields += "status.timestamp"; $score -= 0.2 }
    if (-not $result.status.message) { $missingFields += "status.message"; $score -= 0.5 }
    if (-not $result.kind) { $missingFields += "kind"; $score -= 0.2 }
    
    # Check optional but recommended fields
    if (-not $result.artifacts) { 
        Write-Host "⚠️  Warning: Missing 'artifacts' field (recommended)" -ForegroundColor Yellow 
    }
    if (-not $result.history) { 
        Write-Host "⚠️  Warning: Missing 'history' field (recommended)" -ForegroundColor Yellow 
    }
    
    if ($missingFields.Count -eq 0) {
        Write-Host "✅ A2A Response Format: All required fields present" -ForegroundColor Green
        Write-Host "   └─ id: $($result.id)" -ForegroundColor Gray
        Write-Host "   └─ contextId: $($result.contextId)" -ForegroundColor Gray
        Write-Host "   └─ status.state: $($result.status.state)" -ForegroundColor Gray
        Write-Host "   └─ status.timestamp: $($result.status.timestamp)" -ForegroundColor Gray
        Write-Host "   └─ kind: $($result.kind)" -ForegroundColor Gray
        
        if ($result.status.message.parts) {
            $messageText = $result.status.message.parts[0].text
            if ($messageText.Length -gt 100) {
                $messageText = $messageText.Substring(0, 100) + "..."
            }
            Write-Host "   └─ message: $messageText" -ForegroundColor Gray
        }
        
        $totalScore += 3
        $passedTests++
    } else {
        Write-Host "❌ A2A Response Format: Missing required fields" -ForegroundColor Red
        Write-Host "   └─ Missing: $($missingFields -join ', ')" -ForegroundColor Gray
        $totalScore += [Math]::Max(0, $score)
        $failedTests++
    }
    
} else {
    Write-Host "⚠️  A2A Response Format: Cannot test" -ForegroundColor Yellow
    Write-Host "   └─ No valid response from previous test" -ForegroundColor Gray
    $failedTests++
}

Write-Host ""

# ============================================================
# FINAL REPORT
# ============================================================
$endTime = Get-Date
$executionTime = ($endTime - $startTime).TotalSeconds

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "📊 Grading Report" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

$percentage = [math]::Round(($totalScore / $maxScore) * 100, 1)

# Score with color
if ($percentage -ge 80) {
    Write-Host "🎯 Score: $totalScore/$maxScore ($percentage%)" -ForegroundColor Green
} elseif ($percentage -ge 50) {
    Write-Host "🎯 Score: $totalScore/$maxScore ($percentage%)" -ForegroundColor Yellow
} else {
    Write-Host "🎯 Score: $totalScore/$maxScore ($percentage%)" -ForegroundColor Red
}

Write-Host "✅ Passed: $passedTests/3" -ForegroundColor Green
Write-Host "❌ Failed: $failedTests/3" -ForegroundColor Red
Write-Host "⏱️  Execution Time: $([math]::Round($executionTime, 2))s" -ForegroundColor Cyan
Write-Host ""

Write-Host "Test Results:" -ForegroundColor White
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor White

# Test 1 Summary
if ($totalScore -ge 2) {
    Write-Host "✅ A2A Endpoint Accessibility: 2/2 pts" -ForegroundColor Green
} else {
    Write-Host "❌ A2A Endpoint Accessibility: 0/2 pts" -ForegroundColor Red
}

# Test 2 Summary
$test2Score = [Math]::Min(5, [Math]::Max(0, $totalScore - 2))
if ($test2Score -eq 5) {
    Write-Host "✅ A2A Protocol Support: 5/5 pts" -ForegroundColor Green
} elseif ($test2Score -gt 0) {
    Write-Host "⚠️  A2A Protocol Support: $test2Score/5 pts" -ForegroundColor Yellow
} else {
    Write-Host "❌ A2A Protocol Support: 0/5 pts" -ForegroundColor Red
    Write-Host "   └─ Endpoint does not accept A2A requests (status: 400)" -ForegroundColor Gray
}

# Test 3 Summary
$test3Score = [Math]::Max(0, $totalScore - 7)
if ($test3Score -eq 3) {
    Write-Host "✅ A2A Response Format: 3/3 pts" -ForegroundColor Green
} elseif ($test3Score -gt 0) {
    Write-Host "⚠️  A2A Response Format: $test3Score/3 pts" -ForegroundColor Yellow
} else {
    if (-not $script:validResponse) {
        Write-Host "⚠️  A2A Response Format: 0/3 pts" -ForegroundColor Yellow
        Write-Host "   └─ Cannot test response format: endpoint not responding correctly" -ForegroundColor Gray
    } else {
        Write-Host "❌ A2A Response Format: 0/3 pts" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

# Final verdict
if ($percentage -ge 80) {
    Write-Host "✅ ALL TESTS PASSED! Ready for submission." -ForegroundColor Green
} elseif ($percentage -ge 50) {
    Write-Host "⚠️  SOME TESTS FAILED. Consider fixing before submission." -ForegroundColor Yellow
} else {
    Write-Host "❌ MULTIPLE TESTS FAILED. Please fix issues before submission." -ForegroundColor Red
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Recommendations
if ($totalScore -lt 10) {
    Write-Host "💡 Recommendations:" -ForegroundColor Yellow
    Write-Host ""
    
    if ($totalScore -lt 2) {
        Write-Host "• Check that your endpoint URL is correct" -ForegroundColor White
        Write-Host "• Verify that your deployment is live" -ForegroundColor White
        Write-Host "• Test connectivity to Mastra Cloud" -ForegroundColor White
    }
    
    if ($test2Score -eq 0) {
        Write-Host "• Enable the potterySearchTool in your agent definition" -ForegroundColor White
        Write-Host "• Check src/mastra/agents/pottery-agent.ts" -ForegroundColor White
        Write-Host "• Uncomment: tools: { potterySearchTool }" -ForegroundColor White
        Write-Host "• Verify your A2A route is registered in index.ts" -ForegroundColor White
    }
    
    if ($test3Score -eq 0 -and $script:validResponse) {
        Write-Host "• Ensure your response includes all required A2A fields" -ForegroundColor White
        Write-Host "• Check: id, contextId, status, status.state, status.message" -ForegroundColor White
    }
    
    Write-Host ""
}

# Return exit code based on pass/fail
if ($percentage -ge 70) {
    exit 0
} else {
    exit 1
}
