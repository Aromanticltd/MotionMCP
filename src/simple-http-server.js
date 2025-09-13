// Simple HTTP server for Motion MCP Server using existing CommonJS files
const http = require('http');
const url = require('url');
const axios = require('axios');

// Simple Motion API Service using CommonJS
class SimpleMotionApiService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.usemotion.com/v1';
  }

  async makeRequest(method, endpoint, data = null) {
    try {
      const config = {
        method,
        url: `${this.baseURL}${endpoint}`,
        headers: {
          'X-API-Key': this.apiKey,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    } catch (error) {
      console.error('API Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  async getWorkspaces() {
    return this.makeRequest('GET', '/workspaces');
  }

  async getProjects(workspaceId = null) {
    // Motion API requires workspaceId for projects
    if (!workspaceId) {
      // Try to get the first workspace if none provided
      const workspaces = await this.getWorkspaces();
      if (workspaces && workspaces.length > 0) {
        workspaceId = workspaces[0].id;
        console.log(`Using default workspace: ${workspaceId}`);
      } else {
        throw new Error('No workspace found. Please provide a workspaceId or ensure you have access to at least one workspace.');
      }
    }
    const endpoint = `/projects?workspaceId=${workspaceId}`;
    return this.makeRequest('GET', endpoint);
  }

  async createProject(projectData) {
    return this.makeRequest('POST', '/projects', projectData);
  }

  async getTasks(options = {}) {
    // Motion API requires workspaceId for tasks
    if (!options.workspaceId) {
      // Try to get the first workspace if none provided
      const workspaces = await this.getWorkspaces();
      if (workspaces && workspaces.length > 0) {
        options.workspaceId = workspaces[0].id;
        console.log(`Using default workspace for tasks: ${options.workspaceId}`);
      } else {
        throw new Error('No workspace found. Please provide a workspaceId or ensure you have access to at least one workspace.');
      }
    }
    
    let endpoint = '/tasks';
    const params = new URLSearchParams();
    
    params.append('workspaceId', options.workspaceId);
    if (options.projectId) params.append('projectId', options.projectId);
    if (options.status) params.append('status', options.status);
    
    endpoint += '?' + params.toString();
    
    return this.makeRequest('GET', endpoint);
  }

  async createTask(taskData) {
    return this.makeRequest('POST', '/tasks', taskData);
  }
}

// MCP Server implementation for HTTP
class MotionMCPServer {
  constructor(apiKey) {
    this.motionService = new SimpleMotionApiService(apiKey);
    this.serverInfo = {
      name: "motion-mcp-server",
      version: "1.0.0"
    };
    this.capabilities = {
      tools: {}
    };
  }

  // MCP Tool definitions
  getToolDefinitions() {
    return [
      {
        name: "create_motion_project",
        description: "Create a new project in Motion",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Project name (required)"
            },
            description: {
              type: "string",
              description: "Project description (optional)"
            },
            color: {
              type: "string",
              description: "Project color in hex format (optional, e.g., #FF5733)"
            },
            status: {
              type: "string",
              description: "Project status (optional)"
            }
          },
          required: ["name"]
        }
      },
      {
        name: "list_motion_projects",
        description: "List all projects in Motion. If no workspace is specified, will use the default workspace.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceId: {
              type: "string",
              description: "Optional workspace ID to filter projects"
            }
          },
          additionalProperties: false
        }
      },
      {
        name: "create_motion_task",
        description: "Create a new task in Motion",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Task name (required)"
            },
            description: {
              type: "string",
              description: "Task description (optional)"
            },
            workspaceId: {
              type: "string",
              description: "Workspace ID where the task should be created"
            },
            projectId: {
              type: "string",
              description: "Project ID to assign task to (optional)"
            },
            status: {
              type: "string",
              description: "Task status (optional)"
            },
            priority: {
              type: "string",
              enum: ["ASAP", "HIGH", "MEDIUM", "LOW"],
              description: "Task priority (optional)"
            },
            dueDate: {
              type: "string",
              description: "Due date in ISO format (optional)"
            }
          },
          required: ["name"]
        }
      },
      {
        name: "list_motion_tasks",
        description: "List tasks in Motion with optional filters",
        inputSchema: {
          type: "object",
          properties: {
            workspaceId: {
              type: "string",
              description: "Optional workspace ID to filter tasks"
            },
            projectId: {
              type: "string",
              description: "Filter tasks by project ID (optional)"
            },
            status: {
              type: "string",
              description: "Filter tasks by status (optional)"
            }
          },
          additionalProperties: false
        }
      },
      {
        name: "list_motion_workspaces",
        description: "List all workspaces in Motion",
        inputSchema: {
          type: "object",
          properties: {},
          additionalProperties: false
        }
      }
    ];
  }

  // Handle MCP tool calls
  async handleToolCall(toolName, args) {
    try {
      console.log(`MCP Tool Call: ${toolName}`, JSON.stringify(args, null, 2));
      
      switch (toolName) {
        case "create_motion_project":
          return await this.handleCreateProject(args);
        case "list_motion_projects":
          return await this.handleListProjects(args);
        case "create_motion_task":
          return await this.handleCreateTask(args);
        case "list_motion_tasks":
          return await this.handleListTasks(args);
        case "list_motion_workspaces":
          return await this.handleListWorkspaces();
        default:
          throw new Error(`Unknown tool: ${toolName}`);
      }
    } catch (error) {
      console.error(`MCP Tool Error [${toolName}]:`, error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message}`
          }
        ],
        isError: true
      };
    }
  }

  // Tool handler methods
  async handleCreateProject(args) {
    const project = await this.motionService.createProject(args);
    return {
      content: [
        {
          type: "text",
          text: `Successfully created project "${project.name}" with ID: ${project.id}`
        }
      ]
    };
  }

  async handleListProjects(args = {}) {
    const projects = await this.motionService.getProjects(args.workspaceId);
    const projectList = projects.map(p => `- ${p.name} (ID: ${p.id})`).join('\n');
    return {
      content: [
        {
          type: "text",
          text: `Found ${projects.length} projects:\n${projectList}`
        }
      ]
    };
  }

  async handleCreateTask(args) {
    const task = await this.motionService.createTask(args);
    return {
      content: [
        {
          type: "text",
          text: `Successfully created task "${task.name}" with ID: ${task.id}`
        }
      ]
    };
  }

  async handleListTasks(args = {}) {
    const tasks = await this.motionService.getTasks(args);
    const taskList = tasks.map(t => `- ${t.name} (ID: ${t.id}) - Status: ${t.status || 'N/A'}`).join('\n');
    return {
      content: [
        {
          type: "text",
          text: `Found ${tasks.length} tasks:\n${taskList}`
        }
      ]
    };
  }

  async handleListWorkspaces() {
    const workspaces = await this.motionService.getWorkspaces();
    const workspaceList = workspaces.map(w => `- ${w.name} (ID: ${w.id})`).join('\n');
    return {
      content: [
        {
          type: "text",
          text: `Found ${workspaces.length} workspaces:\n${workspaceList}`
        }
      ]
    };
  }
}

// CORS headers
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

// MCP HTTP response helpers
function createMCPResponse(data) {
  return JSON.stringify(data);
}

function createMCPError(error, id = null) {
  return JSON.stringify({
    jsonrpc: "2.0",
    error: {
      code: -32603,
      message: error.message || error
    },
    id
  });
}

// Main request handler
async function handleRequest(request, mcpServer) {
  if (request.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: ''
    };
  }

  const parsedUrl = url.parse(request.url, true);
  const path = parsedUrl.pathname;

  // Health check endpoint
  if (path === '/health') {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders()
      },
      body: JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        hasApiKey: !!process.env.MOTION_API_KEY
      })
    };
  }

  // MCP HTTP Stream Transport endpoint
  if (path === '/mcp' && request.method === 'POST') {
    if (!process.env.MOTION_API_KEY) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders()
        },
        body: createMCPError('Motion API key not configured')
      };
    }

    try {
      console.log('MCP Request Body:', request.body);
      const requestData = JSON.parse(request.body);
      console.log('Parsed MCP Request:', JSON.stringify(requestData, null, 2));

      // Handle MCP protocol messages
      if (requestData.method === 'initialize') {
        console.log('Handling initialize request');
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders()
          },
          body: createMCPResponse({
            jsonrpc: "2.0",
            result: {
              protocolVersion: "2024-11-05",
              capabilities: mcpServer.capabilities,
              serverInfo: mcpServer.serverInfo
            },
            id: requestData.id
          })
        };
      }

      if (requestData.method === 'tools/list') {
        console.log('Handling tools/list request');
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders()
          },
          body: createMCPResponse({
            jsonrpc: "2.0",
            result: {
              tools: mcpServer.getToolDefinitions()
            },
            id: requestData.id
          })
        };
      }

      if (requestData.method === 'tools/call') {
        console.log('Handling tools/call request');
        const { name, arguments: args } = requestData.params;
        console.log(`Tool call: ${name} with args:`, args);
        const result = await mcpServer.handleToolCall(name, args);
        
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders()
          },
          body: createMCPResponse({
            jsonrpc: "2.0",
            result: result,
            id: requestData.id
          })
        };
      }

      console.log(`Unknown MCP method: ${requestData.method}`);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders()
        },
        body: createMCPError(`Unknown method: ${requestData.method}`, requestData.id)
      };

    } catch (error) {
      console.error('MCP Error:', error);
      console.error('Request body that caused error:', request.body);
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          ...corsHeaders()
        },
        body: createMCPError(error.message || 'Internal server error', requestData?.id)
      };
    }
  }

  return {
    statusCode: 404,
    headers: corsHeaders(),
    body: 'Not Found'
  };
}

// Start HTTP server
const port = process.env.PORT || 8787;
const apiKey = process.env.MOTION_API_KEY;

if (!apiKey) {
  console.error('MOTION_API_KEY environment variable is required');
  process.exit(1);
}

const mcpServer = new MotionMCPServer(apiKey);

const server = http.createServer(async (req, res) => {
  let body = '';
  
  req.on('data', chunk => {
    body += chunk.toString();
  });
  
  req.on('end', async () => {
    try {
      const response = await handleRequest({ ...req, body }, mcpServer);
      
      res.writeHead(response.statusCode, response.headers);
      res.end(response.body);
    } catch (error) {
      console.error('Server error:', error);
      res.writeHead(500, corsHeaders());
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });
});

server.listen(port, () => {
  console.log(`Motion MCP Server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`MCP endpoint: http://localhost:${port}/mcp`);
});

module.exports = { MotionMCPServer };
