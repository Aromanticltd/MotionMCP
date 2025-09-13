# Remote Portainer Deployment Guide

Since you have the files locally but Portainer is on a remote VM, here are several ways to deploy:

## 🚀 Method 1: Git Repository (If you have access)

If you can push to the repository:

```bash
# Push to repository
git push origin issue-2-Add-Support-for-running-Remotely-on-Cloudflare

# Then on your remote VM:
git clone https://github.com/devondragon/MotionMCP.git
cd MotionMCP
git checkout issue-2-Add-Support-for-running-Remotely-on-Cloudflare
```

## 📁 Method 2: File Transfer (Recommended)

### Option A: SCP/SFTP
```bash
# Copy files to remote VM
scp -r . user@your-vm-ip:/path/to/motion-mcp/
```

### Option B: WinSCP (Windows GUI)
1. Download WinSCP
2. Connect to your VM
3. Upload the entire project folder

### Option C: Shared Folder
1. Create a shared folder on your local machine
2. Copy the project files there
3. Mount the shared folder on your VM

## 📦 Method 3: Create Deployment Package

I'll create a deployment package for you:

```bash
# Create a deployment archive
tar -czf motion-mcp-docker.tar.gz \
  Dockerfile \
  docker-compose.yml \
  portainer-stack.yml \
  package.json \
  src/ \
  wrangler.toml \
  env.example \
  .dockerignore

# Or on Windows:
powershell Compress-Archive -Path Dockerfile,docker-compose.yml,portainer-stack.yml,package.json,src,wrangler.toml,env.example,.dockerignore -DestinationPath motion-mcp-docker.zip
```

## 🌐 Method 4: Portainer Git Integration

If your Portainer supports Git integration:

1. **In Portainer:**
   - Go to **Stacks** → **Add Stack**
   - Choose **Repository** option
   - Enter repository URL: `https://github.com/devondragon/MotionMCP.git`
   - Branch: `issue-2-Add-Support-for-running-Remotely-on-Cloudflare`
   - Compose path: `docker-compose.yml`

## 🔧 Method 5: Manual Stack Creation

### Step 1: Copy Stack Configuration

Copy this configuration into Portainer:

```yaml
version: '3.8'

services:
  motion-mcp-server:
    image: node:18-alpine
    container_name: motion-mcp-server
    restart: unless-stopped
    ports:
      - "8787:8787"
    environment:
      - NODE_ENV=production
      - MOTION_API_KEY=${MOTION_API_KEY}
      - MOTION_MCP_TOOLS=${MOTION_MCP_TOOLS:-essential}
    working_dir: /app
    command: >
      sh -c "
        npm install -g wrangler &&
        npm install &&
        wrangler dev --port 8787
      "
    volumes:
      - ./src:/app/src
      - ./package.json:/app/package.json
      - ./wrangler.toml:/app/wrangler.toml
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:8787/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - motion-mcp-network

networks:
  motion-mcp-network:
    driver: bridge
```

### Step 2: Upload Source Files

1. **Create a volume** for the source code
2. **Upload files** to the volume
3. **Deploy the stack**

## 🐳 Method 6: Pre-built Docker Image

### Build and Push to Registry

```bash
# Build the image
docker build -t your-registry/motion-mcp-server:latest .

# Push to your registry
docker push your-registry/motion-mcp-server:latest
```

### Use in Portainer

```yaml
version: '3.8'

services:
  motion-mcp-server:
    image: your-registry/motion-mcp-server:latest
    container_name: motion-mcp-server
    restart: unless-stopped
    ports:
      - "8787:8787"
    environment:
      - MOTION_API_KEY=${MOTION_API_KEY}
      - MOTION_MCP_TOOLS=${MOTION_MCP_TOOLS:-essential}
```

## 📋 Quick Setup Steps

### For Method 2 (File Transfer):

1. **On your local machine:**
   ```bash
   # Create deployment package
   powershell Compress-Archive -Path Dockerfile,docker-compose.yml,portainer-stack.yml,package.json,src,wrangler.toml,env.example,.dockerignore -DestinationPath motion-mcp-docker.zip
   ```

2. **Transfer to VM:**
   - Use SCP, WinSCP, or shared folder
   - Extract on the VM

3. **On your VM:**
   ```bash
   # Extract files
   unzip motion-mcp-docker.zip
   cd motion-mcp-docker
   
   # Create .env file
   cp env.example .env
   nano .env  # Add your MOTION_API_KEY
   
   # Deploy with Portainer
   # Use docker-compose.yml in Portainer stack
   ```

## 🔐 Environment Variables

Set these in Portainer:

- `MOTION_API_KEY`: Your Motion API key
- `MOTION_MCP_TOOLS`: `essential` (or your preference)

## ✅ Verification

After deployment, test:

```bash
# Health check
curl http://your-vm-ip:8787/health

# MCP endpoint
curl -X POST http://your-vm-ip:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

## 🆘 Troubleshooting

- **Port conflicts**: Change port 8787 if needed
- **Permission issues**: Check file ownership on VM
- **Network issues**: Verify firewall rules
- **API key**: Ensure it's set correctly in environment

Choose the method that works best for your setup!

