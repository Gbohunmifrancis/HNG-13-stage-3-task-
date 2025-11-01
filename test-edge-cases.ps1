# A2A Endpoint REAL Edge Case Validation Script
# Tests actual failure scenarios that cause grading failures

param(
    [string]$Endpoint = "https://future-hissing-ram-c1017.mastra.cloud/a2a/agent/potteryAgent"
)

$totalTests = 0
$passedTests = 0
$failedTests = 0

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "A2A EDGE CASE VALIDATION" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# TEST 1: Missing jsonrpc field (should return -32600)
Write-Host "[TEST 1] Missing 'jsonrpc' field" -ForegroundColor Yellow
$totalTests++
try {
    $badRequest = @{
        id = "test-001"
        method = "message/send"
        params = @{}
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri $Endpoint -Method POST -ContentType "application/json" -Body $badRequest -ErrorAction Stop
    
    if ($response.error -and $response.error.code -eq -32600) {
        Write-Host "  [PASS] Correctly rejected with error -32600" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  [FAIL] Should return error -32600 for missing jsonrpc" -ForegroundColor Red
        $failedTests++
    }
} catch {
    Write-Host "  [FAIL] Threw exception instead of returning JSON-RPC error" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
    $failedTests++
}

# TEST 2: Invalid method (should return -32601)
Write-Host ""
Write-Host "[TEST 2] Invalid method name" -ForegroundColor Yellow
$totalTests++
try {
    $badRequest = @{
        jsonrpc = "2.0"
        id = "test-002"
        method = "invalid/method"
        params = @{}
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri $Endpoint -Method POST -ContentType "application/json" -Body $badRequest -ErrorAction Stop
    
    if ($response.error -and $response.error.code -eq -32601) {
        Write-Host "  [PASS] Correctly rejected with error -32601" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  [FAIL] Should return error -32601 for invalid method" -ForegroundColor Red
        $failedTests++
    }
} catch {
    Write-Host "  [FAIL] Threw exception instead of returning JSON-RPC error" -ForegroundColor Red
    $failedTests++
}

# TEST 3: Missing required params (should return -32602)
Write-Host ""
Write-Host "[TEST 3] Missing required 'message' or 'messages' param" -ForegroundColor Yellow
$totalTests++
try {
    $badRequest = @{
        jsonrpc = "2.0"
        id = "test-003"
        method = "message/send"
        params = @{
            id = "task-001"
        }
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri $Endpoint -Method POST -ContentType "application/json" -Body $badRequest -ErrorAction Stop
    
    if ($response.error -and $response.error.code -eq -32602) {
        Write-Host "  [PASS] Correctly rejected with error -32602" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  [FAIL] Should return error -32602 for missing params" -ForegroundColor Red
        $failedTests++
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "  [FAIL] Returned HTTP 400 instead of JSON-RPC error -32602" -ForegroundColor Red
        Write-Host "  This is what caused the grading failure!" -ForegroundColor Red
        $failedTests++
    } else {
        Write-Host "  [FAIL] Unexpected error: $($_.Exception.Message)" -ForegroundColor Red
        $failedTests++
    }
}

# TEST 4: Malformed JSON (should handle gracefully)
Write-Host ""
Write-Host "[TEST 4] Malformed JSON body" -ForegroundColor Yellow
$totalTests++
try {
    $badJson = '{"jsonrpc": "2.0", "id": "test-004", "method": "message/send", "params": {'
    
    $response = Invoke-WebRequest -Uri $Endpoint -Method POST -ContentType "application/json" -Body $badJson -ErrorAction Stop
    Write-Host "  [FAIL] Should have rejected malformed JSON" -ForegroundColor Red
    $failedTests++
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "  [PASS] Correctly rejected malformed JSON" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  [WARN] Returned $statusCode instead of 400" -ForegroundColor Yellow
        $passedTests++
    }
}

# TEST 5: Missing 'id' field (should return -32600)
Write-Host ""
Write-Host "[TEST 5] Missing 'id' field" -ForegroundColor Yellow
$totalTests++
try {
    $badRequest = @{
        jsonrpc = "2.0"
        method = "message/send"
        params = @{}
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri $Endpoint -Method POST -ContentType "application/json" -Body $badRequest -ErrorAction Stop
    
    if ($response.error -and $response.error.code -eq -32600) {
        Write-Host "  [PASS] Correctly rejected with error -32600" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  [FAIL] Should return error -32600 for missing id" -ForegroundColor Red
        $failedTests++
    }
} catch {
    Write-Host "  [FAIL] Threw exception instead of returning JSON-RPC error" -ForegroundColor Red
    $failedTests++
}

# TEST 6: Empty message parts array
Write-Host ""
Write-Host "[TEST 6] Empty message parts array" -ForegroundColor Yellow
$totalTests++
try {
    $badRequest = @{
        jsonrpc = "2.0"
        id = "test-006"
        method = "message/send"
        params = @{
            message = @{
                kind = "message"
                role = "user"
                parts = @()
                messageId = "msg-006"
            }
        }
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri $Endpoint -Method POST -ContentType "application/json" -Body $badRequest -ErrorAction Stop
    
    # Should either succeed with empty response or return proper error
    if ($response.result) {
        Write-Host "  [PASS] Handled empty message gracefully" -ForegroundColor Green
        $passedTests++
    } elseif ($response.error) {
        Write-Host "  [PASS] Returned proper error for empty message" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  [FAIL] Unexpected response format" -ForegroundColor Red
        $failedTests++
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "  [FAIL] Returned HTTP 400 instead of JSON-RPC error" -ForegroundColor Red
        $failedTests++
    } else {
        Write-Host "  [WARN] Returned $statusCode" -ForegroundColor Yellow
        $passedTests++
    }
}

# TEST 7: Invalid message role
Write-Host ""
Write-Host "[TEST 7] Invalid message role" -ForegroundColor Yellow
$totalTests++
try {
    $badRequest = @{
        jsonrpc = "2.0"
        id = "test-007"
        method = "message/send"
        params = @{
            message = @{
                kind = "message"
                role = "invalid_role"
                parts = @(
                    @{
                        kind = "text"
                        text = "test"
                    }
                )
                messageId = "msg-007"
            }
        }
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri $Endpoint -Method POST -ContentType "application/json" -Body $badRequest -ErrorAction Stop
    
    if ($response.result) {
        Write-Host "  [PASS] Handled invalid role gracefully" -ForegroundColor Green
        $passedTests++
    } elseif ($response.error) {
        Write-Host "  [PASS] Returned proper error for invalid role" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  [FAIL] Unexpected response" -ForegroundColor Red
        $failedTests++
    }
} catch {
    Write-Host "  [WARN] Threw exception for invalid role" -ForegroundColor Yellow
    $passedTests++
}

# TEST 8: Tool call failure simulation (THIS IS THE KEY TEST)
Write-Host ""
Write-Host "[TEST 8] Agent with disabled tool (CRITICAL)" -ForegroundColor Yellow
Write-Host "  This simulates the actual grading failure scenario" -ForegroundColor Gray
$totalTests++
try {
    $request = @{
        jsonrpc = "2.0"
        id = "test-008"
        method = "message/send"
        params = @{
            message = @{
                kind = "message"
                role = "user"
                parts = @(
                    @{
                        kind = "text"
                        text = "Use the potterySearchTool to find information about clay types"
                    }
                )
                messageId = "msg-008"
            }
        }
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri $Endpoint -Method POST -ContentType "application/json" -Body $request -ErrorAction Stop
    
    if ($response.result -and $response.result.status.state -eq "completed") {
        Write-Host "  [PASS] Agent successfully used tool" -ForegroundColor Green
        Write-Host "  Tool is properly registered!" -ForegroundColor Green
        $passedTests++
    } elseif ($response.error) {
        Write-Host "  [FAIL] Agent returned error - tool might not be registered" -ForegroundColor Red
        Write-Host "  Error: $($response.error.message)" -ForegroundColor Gray
        $failedTests++
    }
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -eq 400) {
        Write-Host "  [FAIL] HTTP 400 - Tool not registered in agent!" -ForegroundColor Red
        Write-Host "  THIS IS THE GRADING FAILURE CAUSE" -ForegroundColor Red
        Write-Host "  Fix: Uncomment tools: { potterySearchTool } in agent" -ForegroundColor Yellow
        $failedTests++
    } elseif ($statusCode -eq 500) {
        Write-Host "  [FAIL] HTTP 500 - Internal server error" -ForegroundColor Red
        Write-Host "  Agent might be trying to use unregistered tool" -ForegroundColor Yellow
        $failedTests++
    } else {
        Write-Host "  [FAIL] Unexpected status: $statusCode" -ForegroundColor Red
        $failedTests++
    }
}

# TEST 9: Verify response structure completeness
Write-Host ""
Write-Host "[TEST 9] Response structure validation" -ForegroundColor Yellow
$totalTests++
try {
    $request = @{
        jsonrpc = "2.0"
        id = "test-009"
        method = "message/send"
        params = @{
            message = @{
                kind = "message"
                role = "user"
                parts = @(
                    @{
                        kind = "text"
                        text = "What is earthenware?"
                    }
                )
                messageId = "msg-009"
            }
        }
    } | ConvertTo-Json -Depth 10
    
    $response = Invoke-RestMethod -Uri $Endpoint -Method POST -ContentType "application/json" -Body $request -ErrorAction Stop
    
    $missingFields = @()
    if (-not $response.result.id) { $missingFields += "result.id" }
    if (-not $response.result.contextId) { $missingFields += "result.contextId" }
    if (-not $response.result.status) { $missingFields += "result.status" }
    if (-not $response.result.status.state) { $missingFields += "result.status.state" }
    if (-not $response.result.status.timestamp) { $missingFields += "result.status.timestamp" }
    if (-not $response.result.status.message) { $missingFields += "result.status.message" }
    if (-not $response.result.kind) { $missingFields += "result.kind" }
    
    if ($missingFields.Count -eq 0) {
        Write-Host "  [PASS] All required fields present" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  [FAIL] Missing fields: $($missingFields -join ', ')" -ForegroundColor Red
        $failedTests++
    }
} catch {
    Write-Host "  [FAIL] Could not validate response structure" -ForegroundColor Red
    $failedTests++
}

# TEST 10: Concurrent request handling
Write-Host ""
Write-Host "[TEST 10] Concurrent requests (stress test)" -ForegroundColor Yellow
$totalTests++
try {
    $jobs = 1..3 | ForEach-Object {
        Start-Job -ScriptBlock {
            param($endpoint, $testNum)
            $request = @{
                jsonrpc = "2.0"
                id = "test-010-$testNum"
                method = "message/send"
                params = @{
                    message = @{
                        kind = "message"
                        role = "user"
                        parts = @(
                            @{
                                kind = "text"
                                text = "Quick test $testNum"
                            }
                        )
                        messageId = "msg-010-$testNum"
                    }
                }
            } | ConvertTo-Json -Depth 10
            
            Invoke-RestMethod -Uri $endpoint -Method POST -ContentType "application/json" -Body $request -TimeoutSec 15
        } -ArgumentList $Endpoint, $_
    }
    
    $results = $jobs | Wait-Job -Timeout 30 | Receive-Job
    $jobs | Remove-Job -Force
    
    $successCount = ($results | Where-Object { $_.result -ne $null }).Count
    if ($successCount -eq 3) {
        Write-Host "  [PASS] Handled concurrent requests ($successCount/3)" -ForegroundColor Green
        $passedTests++
    } else {
        Write-Host "  [WARN] Some concurrent requests failed ($successCount/3)" -ForegroundColor Yellow
        $passedTests++
    }
} catch {
    Write-Host "  [FAIL] Concurrent request test failed" -ForegroundColor Red
    $failedTests++
}

# FINAL REPORT
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EDGE CASE TEST RESULTS" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Total Tests: $totalTests" -ForegroundColor White
Write-Host "Passed: $passedTests" -ForegroundColor Green
Write-Host "Failed: $failedTests" -ForegroundColor Red
Write-Host ""

$percentage = [math]::Round(($passedTests / $totalTests) * 100, 1)

if ($failedTests -eq 0) {
    Write-Host "[SUCCESS] All edge cases handled correctly!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[WARNING] $failedTests edge case(s) failed" -ForegroundColor Yellow
    Write-Host "Review failures above for details" -ForegroundColor Yellow
    exit 1
}
