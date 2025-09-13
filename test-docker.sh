#!/bin/bash

# Motion MCP Server Docker Test Script
echo "🚀 Testing Motion MCP Server Docker Setup..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please copy env.example to .env and add your MOTION_API_KEY"
    exit 1
fi

# Check if MOTION_API_KEY is set
if ! grep -q "MOTION_API_KEY=your_motion_api_key_here" .env; then
    echo "✅ .env file found with API key configured"
else
    echo "❌ Please update .env file with your actual Motion API key"
    exit 1
fi

echo "🔨 Building Docker image..."
docker build -t motion-mcp-server .

if [ $? -eq 0 ]; then
    echo "✅ Docker image built successfully"
else
    echo "❌ Docker build failed"
    exit 1
fi

echo "🧪 Testing Docker container..."
docker run -d --name motion-mcp-test -p 8787:8787 --env-file .env motion-mcp-server

# Wait for container to start
echo "⏳ Waiting for container to start..."
sleep 10

# Test health endpoint
echo "🏥 Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s http://localhost:8787/health)

if echo "$HEALTH_RESPONSE" | grep -q "ok"; then
    echo "✅ Health check passed"
    echo "Response: $HEALTH_RESPONSE"
else
    echo "❌ Health check failed"
    echo "Response: $HEALTH_RESPONSE"
fi

# Test MCP endpoint
echo "🔧 Testing MCP endpoint..."
MCP_RESPONSE=$(curl -s -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}')

if echo "$MCP_RESPONSE" | grep -q "tools"; then
    echo "✅ MCP endpoint working"
    echo "Response: $MCP_RESPONSE"
else
    echo "❌ MCP endpoint failed"
    echo "Response: $MCP_RESPONSE"
fi

# Cleanup
echo "🧹 Cleaning up test container..."
docker stop motion-mcp-test
docker rm motion-mcp-test

echo "🎉 Docker setup test completed!"
echo ""
echo "Next steps:"
echo "1. Deploy to Portainer using docker-compose.yml"
echo "2. Set environment variables in Portainer"
echo "3. Access your Motion MCP Server at http://your-server:8787"
