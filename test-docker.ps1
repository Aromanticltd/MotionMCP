# Motion MCP Server Docker Test Script (PowerShell)
Write-Host "🚀 Testing Motion MCP Server Docker Setup..." -ForegroundColor Green

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "❌ .env file not found. Please copy env.example to .env and add your MOTION_API_KEY" -ForegroundColor Red
    exit 1
}

# Check if MOTION_API_KEY is set
$envContent = Get-Content .env -Raw
if ($envContent -match "MOTION_API_KEY=your_motion_api_key_here") {
    Write-Host "❌ Please update .env file with your actual Motion API key" -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ .env file found with API key configured" -ForegroundColor Green
}

Write-Host "🔨 Building Docker image..." -ForegroundColor Yellow
docker build -t motion-mcp-server .

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Docker image built successfully" -ForegroundColor Green
} else {
    Write-Host "❌ Docker build failed" -ForegroundColor Red
    exit 1
}

Write-Host "🧪 Testing Docker container..." -ForegroundColor Yellow
docker run -d --name motion-mcp-test -p 8787:8787 --env-file .env motion-mcp-server

# Wait for container to start
Write-Host "⏳ Waiting for container to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# Test health endpoint
Write-Host "🏥 Testing health endpoint..." -ForegroundColor Yellow
try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:8787/health" -Method Get
    if ($healthResponse.status -eq "ok") {
        Write-Host "✅ Health check passed" -ForegroundColor Green
        Write-Host "Response: $($healthResponse | ConvertTo-Json)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Health check failed" -ForegroundColor Red
        Write-Host "Response: $($healthResponse | ConvertTo-Json)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test MCP endpoint
Write-Host "🔧 Testing MCP endpoint..." -ForegroundColor Yellow
try {
    $mcpBody = @{
        jsonrpc = "2.0"
        method = "tools/list"
        id = 1
    } | ConvertTo-Json

    $mcpResponse = Invoke-RestMethod -Uri "http://localhost:8787/mcp" -Method Post -Body $mcpBody -ContentType "application/json"
    if ($mcpResponse.result.tools) {
        Write-Host "✅ MCP endpoint working" -ForegroundColor Green
        Write-Host "Response: $($mcpResponse | ConvertTo-Json -Depth 3)" -ForegroundColor Cyan
    } else {
        Write-Host "❌ MCP endpoint failed" -ForegroundColor Red
        Write-Host "Response: $($mcpResponse | ConvertTo-Json)" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ MCP endpoint failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Cleanup
Write-Host "🧹 Cleaning up test container..." -ForegroundColor Yellow
docker stop motion-mcp-test
docker rm motion-mcp-test

Write-Host "🎉 Docker setup test completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Deploy to Portainer using docker-compose.yml" -ForegroundColor White
Write-Host "2. Set environment variables in Portainer" -ForegroundColor White
Write-Host "3. Access your Motion MCP Server at http://your-server:8787" -ForegroundColor White
