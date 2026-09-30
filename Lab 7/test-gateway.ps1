# =============================================================================
# Lab 7 Automated Verification Test Suite
# Tests API Gateway Single Entry Point, Port Isolation, Service Discovery,
# and Centralized 502/503 Error Handling
# =============================================================================

$ErrorActionPreference = "Continue"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Starting Lab 7 API Gateway & Service Discovery Test Suite" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

function Assert-Step($title, $condition, $details) {
    if ($condition) {
        Write-Host " [PASS] $title" -ForegroundColor Green
    } else {
        Write-Host " [FAIL] $title" -ForegroundColor Red
        Write-Host "        Details: $details" -ForegroundColor Yellow
    }
}

# 1. Gateway Health Check
Write-Host "`n--- 1. Gateway Self-Check (No Proxying) ---" -ForegroundColor Magenta
try {
    $gwHealth = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 5
    Assert-Step "Gateway /health returns 200 OK" ($gwHealth.status -eq "ok") ($gwHealth | ConvertTo-Json -Compress)
    Assert-Step "Gateway has active service registry" ($gwHealth.serviceDiscovery.registry.users.target -ne $null) ""
} catch {
    Assert-Step "Gateway /health check" $false $_.Exception.Message
}

# 2. Host Port Isolation Verification
Write-Host "`n--- 2. Port Isolation: Confirming Backend Services NOT Accessible Directly ---" -ForegroundColor Magenta
$directUserFailed = $false
try {
    $res = Invoke-RestMethod -Uri "http://localhost:3001/users" -Method Get -TimeoutSec 2
} catch {
    $directUserFailed = $true
}
Assert-Step "Port 3001 NOT accessible from host (Secure Container Isolation)" $directUserFailed "Direct call failed as expected"

$directProdFailed = $false
try {
    $res = Invoke-RestMethod -Uri "http://localhost:3002/products" -Method Get -TimeoutSec 2
} catch {
    $directProdFailed = $true
}
Assert-Step "Port 3002 NOT accessible from host (Secure Container Isolation)" $directProdFailed "Direct call failed as expected"

# 3. Gateway Routed Endpoints
Write-Host "`n--- 3. Testing Client Traffic Through Single Gateway Entry Point (:5000) ---" -ForegroundColor Magenta
try {
    $users = Invoke-RestMethod -Uri "http://localhost:5000/users" -Method Get -TimeoutSec 5
    Assert-Step "GET /users routed through Gateway (200 OK)" ($users.Count -gt 0) "User count: $($users.Count)"
} catch {
    Assert-Step "GET /users routed through Gateway" $false $_.Exception.Message
}

try {
    $prods = Invoke-RestMethod -Uri "http://localhost:5000/products" -Method Get -TimeoutSec 5
    Assert-Step "GET /products routed through Gateway (200 OK)" ($prods.Count -gt 0) "Product count: $($prods.Count)"
} catch {
    Assert-Step "GET /products routed through Gateway" $false $_.Exception.Message
}

# 4. Gateway Routed POST /orders
Write-Host "`n--- 4. Gateway Routed Order Placement (Full Chain Validation) ---" -ForegroundColor Magenta
$orderBody = @{
    userId = 101
    productId = 501
    quantity = 2
} | ConvertTo-Json

try {
    $order = Invoke-RestMethod -Uri "http://localhost:5000/orders" -Method Post -Body $orderBody -ContentType "application/json" -TimeoutSec 8
    Assert-Step "POST /orders routed through Gateway (201 Created)" ($order.id -ne $null -and $order.totalAmount -eq 99.98) ($order | ConvertTo-Json -Compress)
    Assert-Step "Order contains verified snapshots via gateway" ($order.userSnapshot.name -eq "Alice Johnson") ""
} catch {
    Assert-Step "POST /orders routed through Gateway" $false $_.Exception.Message
}

# 5. Centralized Error Handling: Stop Dependency and verify 502/503 from Gateway
Write-Host "`n--- 5. Centralized Error Handling: Unreachable Service ---" -ForegroundColor Magenta
Write-Host "Stopping user-service container to simulate downtime..." -ForegroundColor Yellow
docker stop user-service | Out-Null
Start-Sleep -Seconds 2

try {
    $res = Invoke-RestMethod -Uri "http://localhost:5000/users/101" -Method Get -TimeoutSec 5
    Assert-Step "Unreachable service returns 502/503" $false "Received 200 instead of error"
} catch {
    $code = 0
    if ($_.Exception.Response -ne $null) {
        $code = [int]$_.Exception.Response.StatusCode
    }
    $is503 = ($code -eq 503 -or $code -eq 502 -or $_.Exception.Message -match "503|502")
    Assert-Step "Gateway trapped outage and returned controlled 502/503 ($code)" $is503 "Message: $($_.Exception.Message)"
}

# 6. Recovery
Write-Host "`n--- 6. Gateway Recovery After Service Restart ---" -ForegroundColor Magenta
Write-Host "Restarting user-service container..." -ForegroundColor Yellow
docker start user-service | Out-Null
Start-Sleep -Seconds 3

try {
    $recoveredUser = Invoke-RestMethod -Uri "http://localhost:5000/users/101" -Method Get -TimeoutSec 5
    Assert-Step "Gateway recovers cleanly: GET /users/101 succeeds (200 OK)" ($recoveredUser.id -eq 101) ($recoveredUser | ConvertTo-Json -Compress)
} catch {
    Assert-Step "Gateway recovery" $false $_.Exception.Message
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host " Lab 7 Verification Test Suite Complete" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
