# Motion MCP Server - Docker Setup Guide

This guide will help you deploy the Motion MCP Server using Docker Compose via Portainer.

## Prerequisites

- Docker and Docker Compose installed
- Portainer running on your server
- Motion API key from [https://app.usemotion.com/settings/api](https://app.usemotion.com/settings/api)

## Quick Start

### 1. Prepare Environment

```bash
# Copy the environment template
cp env.example .env

# Edit .env with your Motion API key
nano .env
```

### 2. Build and Test Locally

```bash
# Build the Docker image
npm run docker:build

# Test locally
npm run docker:run
```

### 3. Deploy via Portainer

#### Option A: Using Docker Compose Stack

1. **In Portainer:**
   - Go to **Stacks** → **Add Stack**
   - Name: `motion-mcp-server`
   - Copy the contents of `docker-compose.yml`
   - Add environment variables:
     - `MOTION_API_KEY`: Your Motion API key
     - `MOTION_MCP_TOOLS`: `essential` (or your preferred config)

2. **Deploy the stack**

#### Option B: Using Portainer Stack File

1. **In Portainer:**
   - Go to **Stacks** → **Add Stack**
   - Name: `motion-mcp-server`
   - Upload `portainer-stack.yml`
   - Configure environment variables

### 4. Verify Deployment

Once deployed, test the endpoints:

```bash
# Health check
curl http://your-server:8787/health

# MCP endpoint (requires proper MCP client)
curl -X POST http://your-server:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## Configuration Options

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `MOTION_API_KEY` | Your Motion API key | - | Yes |
| `MOTION_MCP_TOOLS` | Tool configuration | `essential` | No |
| `NODE_ENV` | Node environment | `production` | No |
| `PORT` | Server port | `8787` | No |

### Tool Configurations

- **`minimal`**: 3 tools (basic functionality)
- **`essential`**: 9 tools (recommended)
- **`all`**: 20 tools (full functionality)
- **`custom:tool1,tool2`**: Specific tools only

## Available Endpoints

### MCP Protocol
- **`POST /mcp`** - Main MCP endpoint
- **`GET /health`** - Health check

### REST API (Legacy)
- **`GET /api/motion/projects`** - List projects
- **`POST /api/motion/projects`** - Create project
- **`GET /api/motion/tasks`** - List tasks
- **`POST /api/motion/tasks`** - Create task
- **`GET /api/motion/workspaces`** - List workspaces
- **`GET /api/motion/users`** - List users

## Traefik Integration

The Docker Compose includes Traefik labels for automatic reverse proxy setup:

- **Domain**: `motion-mcp.yourdomain.com`
- **SSL**: Automatic Let's Encrypt certificates
- **CORS**: Enabled for cross-origin requests

To use with your domain:
1. Update the `Host` rule in `docker-compose.yml`
2. Ensure your domain points to your server
3. Deploy the stack

## Troubleshooting

### Common Issues

1. **Container won't start**
   - Check environment variables are set correctly
   - Verify Motion API key is valid
   - Check logs: `docker-compose logs motion-mcp-server`

2. **Health check fails**
   - Ensure port 8787 is not in use
   - Check if the application is starting properly
   - Verify network connectivity

3. **API calls fail**
   - Verify Motion API key is correct
   - Check Motion API service status
   - Review application logs

### Logs

```bash
# View logs
docker-compose logs -f motion-mcp-server

# Or via Portainer
# Go to Container → motion-mcp-server → Logs
```

### Health Check

```bash
# Test health endpoint
curl http://localhost:8787/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "hasApiKey": true
}
```

## Security Considerations

1. **API Key**: Store securely in environment variables
2. **Network**: Use reverse proxy (Traefik/Nginx) for production
3. **SSL**: Enable HTTPS in production
4. **Firewall**: Restrict access to necessary ports only

## Scaling

For high availability, consider:
- Multiple container instances behind a load balancer
- Database for persistent storage (if needed)
- Redis for caching (if needed)

## Support

- Check logs for detailed error messages
- Verify Motion API key and permissions
- Test with minimal configuration first
- Review Motion API documentation for endpoint requirements
