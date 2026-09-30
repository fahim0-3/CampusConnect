# =============================================================================
# Lab 6 Microservices Verification & Test Automation Script
# Web Services & SOA Laboratory - Lab 6
# =============================================================================

$ErrorActionPreference = "Continue"

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host " Starting Lab 6 Microservices Automated Verification Flow" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan

function Assert-Step($title, $condition, $details) {
    if ($condition) {
        Write-Host " [PASS] $title" -ForegroundColor Green
    } else {
        Write-Host " [FAIL] $title" -ForegroundColor Red
        Write-Host "        Details: $details" -ForegroundColor Yellow
    }
}

# 1. Health Checks
Write-Host "`n--- 1. Health Checks ---" -ForegroundColor Magenta
try {
    $userHealth = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get -TimeoutSec 5
    Assert-Step "User Service is Healthy" ($userHealth.status -eq "ok") ($userHealth | ConvertTo-Json -Compress)
} catch {
    Assert-Step "User Service is Healthy" $false $_.Exception.Message
}

try {
    $prodHealth = Invoke-RestMethod -Uri "http://localhost:3002/health" -Method Get -TimeoutSec 5
    Assert-Step "Product Service is Healthy" ($prodHealth.status -eq "ok") ($prodHealth | ConvertTo-Json -Compress)
} catch {
    Assert-Step "Product Service is Healthy" $false $_.Exception.Message
}

try {
    $orderHealth = Invoke-RestMethod -Uri "http://localhost:3003/health" -Method Get -TimeoutSec 5
    Assert-Step "Order Service is Healthy" ($orderHealth.status -eq "ok") ($orderHealth | ConvertTo-Json -Compress)
} catch {
    Assert-Step "Order Service is Healthy" $false $_.Exception.Message
}

# 2. Direct Service Endpoints (Expected 200)
Write-Host "`n--- 2. Direct Service Endpoints ---" -ForegroundColor Magenta
try {
    $users = Invoke-RestMethod -Uri "http://localhost:3001/users" -Method Get
    Assert-Step "GET /users returns 200 and array" ($users.Count -gt 0) "User count: $($users.Count)"
} catch {
    Assert-Step "GET /users returns 200" $false $_.Exception.Message
}

try {
    $prods = Invoke-RestMethod -Uri "http://localhost:3002/products" -Method Get
    Assert-Step "GET /products returns 200 and array" ($prods.Count -gt 0) "Product count: $($prods.Count)"
} catch {
    Assert-Step "GET /products returns 200" $false $_.Exception.Message
}

# 3. Create Valid Order (Expected 201 Created & Inter-Service Call Success)
Write-Host "`n--- 3. Order -> User & Product Inter-Service Communication ---" -ForegroundColor Magenta
$validOrderBody = @{
    userId = 101
    productId = 501
    quantity = 2
} | ConvertTo-Json

try {
    $orderResponse = Invoke-RestMethod -Uri "http://localhost:3003/orders" -Method Post -Body $validOrderBody -ContentType "application/json"
    $is201 = ($orderResponse.id -ne $null) -and ($orderResponse.totalAmount -eq 99.98)
    Assert-Step "POST /orders returns 201 with calculated total ($($orderResponse.totalAmount))" $is201 ($orderResponse | ConvertTo-Json -Compress)
    Assert-Step "Order contains verified User Snapshot ($($orderResponse.userSnapshot.name))" ($orderResponse.userSnapshot.name -eq "Alice Johnson") ""
    Assert-Step "Order contains verified Product Snapshot ($($orderResponse.productSnapshot.name))" ($orderResponse.productSnapshot.name -like "*Cloud Computing*") ""
} catch {
    Assert-Step "POST /orders returns 201" $false $_.Exception.Message
}

# 4. Invalid User ID Test (Expected 404)
Write-Host "`n--- 4. Invalid User ID (Expected 404) ---" -ForegroundColor Magenta
$invalidUserBody = @{
    userId = 9999
    productId = 501
    quantity = 1
} | ConvertTo-Json

try {
    $res = Invoke-WebRequest -Uri "http://localhost:3003/orders" -Method Post -Body $invalidUserBody -ContentType "application/json"
    Assert-Step "Invalid User returns 404" $false "Received 200 instead of 404"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Assert-Step "Invalid User returns 404 Not Found" ($statusCode -eq 404) "Status: $statusCode"
}

# 5. Fault Tolerance: Stop User Service -> Attempt Order (Expected 503)
Write-Host "`n--- 5. Fault Tolerance: Stop Dependency & Verify 503 ---" -ForegroundColor Magenta
Write-Host "Stopping user-service container..." -ForegroundColor Yellow
docker stop user-service | Out-Null
Start-Sleep -Seconds 2

try {
    $res = Invoke-WebRequest -Uri "http://localhost:3003/orders" -Method Post -Body $validOrderBody -ContentType "application/json"
    Assert-Step "Dependency down returns 503" $false "Received 200 instead of 503"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Assert-Step "Dependency down returns 503 Service Unavailable" ($statusCode -eq 503) "Status: $statusCode"
}

# 6. Self-Healing & Recovery: Restart User Service -> Attempt Order (Expected 201)
Write-Host "`n--- 6. Recovery: Restart Dependency & Verify Recovery ---" -ForegroundColor Magenta
Write-Host "Restarting user-service container..." -ForegroundColor Yellow
docker start user-service | Out-Null
Start-Sleep -Seconds 4

try {
    $recoverOrder = Invoke-RestMethod -Uri "http://localhost:3003/orders" -Method Post -Body $validOrderBody -ContentType "application/json"
    Assert-Step "Service recovered: POST /orders succeeds (201)" ($recoverOrder.id -ne $null) ($recoverOrder | ConvertTo-Json -Compress)
} catch {
    Assert-Step "Service recovered: POST /orders succeeds" $false $_.Exception.Message
}

Write-Host "`n=================================================================" -ForegroundColor Cyan
Write-Host " Lab 6 Verification Test Suite Complete" -ForegroundColor Cyan
Write-Host "=================================================================" -ForegroundColor Cyan
