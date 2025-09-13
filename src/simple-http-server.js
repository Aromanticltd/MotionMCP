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

      console.log(`Making API request: ${method} ${endpoint}`);
      console.log('Request config:', JSON.stringify(config, null, 2));

      const response = await axios(config);
      console.log('API Response:', response.status, response.data);
      return response.data;
    } catch (error) {
      console.error('API Error Details:');
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Config:', error.config);
      throw new Error(error.response?.data?.message || error.message);
    }
  }

  async getWorkspaces() {
    return this.makeRequest('GET', '/workspaces');
  }

  async getProjects(workspaceId = null) {
    // Motion API requires workspaceId for projects
    if (!workspaceId) {
      console.log('No workspaceId provided, fetching workspaces...');
      try {
        const response = await this.getWorkspaces();
        console.log('Available workspaces response:', JSON.stringify(response, null, 2));
        
        // Handle different response formats
        const workspaces = response.workspaces || response;
        console.log('Extracted workspaces:', JSON.stringify(workspaces, null, 2));
        
        if (Array.isArray(workspaces) && workspaces.length > 0) {
          workspaceId = workspaces[0].id;
          console.log(`Using default workspace: ${workspaceId}`);
        } else {
          throw new Error('No workspace found. Please provide a workspaceId or ensure you have access to at least one workspace.');
        }
      } catch (error) {
        console.error('Error fetching workspaces:', error);
        throw new Error(`Failed to fetch workspaces: ${error.message}`);
      }
    }
    const endpoint = `/projects?workspaceId=${workspaceId}`;
    console.log(`Fetching projects for workspace: ${workspaceId}`);
    return this.makeRequest('GET', endpoint);
  }

  async createProject(projectData) {
    // Motion API requires workspaceId for creating projects
    if (!projectData.workspaceId) {
      console.log('No workspaceId in project data, fetching workspaces...');
      try {
        const response = await this.getWorkspaces();
        console.log('Available workspaces for project creation:', JSON.stringify(response, null, 2));
        
        // Handle different response formats
        const workspaces = response.workspaces || response;
        console.log('Extracted workspaces for project creation:', JSON.stringify(workspaces, null, 2));
        
        if (Array.isArray(workspaces) && workspaces.length > 0) {
          projectData.workspaceId = workspaces[0].id;
          console.log(`Using default workspace for project creation: ${projectData.workspaceId}`);
        } else {
          throw new Error('No workspace found. Please provide a workspaceId or ensure you have access to at least one workspace.');
        }
      } catch (error) {
        console.error('Error fetching workspaces for project creation:', error);
        throw new Error(`Failed to fetch workspaces: ${error.message}`);
      }
    }
    console.log('Creating project with data:', JSON.stringify(projectData, null, 2));
    return this.makeRequest('POST', '/projects', projectData);
  }

  async getTasks(options = {}) {
    // Motion API requires workspaceId for tasks
    if (!options.workspaceId) {
      console.log('No workspaceId provided for tasks, fetching workspaces...');
      try {
        const response = await this.getWorkspaces();
        console.log('Available workspaces for tasks:', JSON.stringify(response, null, 2));
        
        // Handle different response formats
        const workspaces = response.workspaces || response;
        console.log('Extracted workspaces for tasks:', JSON.stringify(workspaces, null, 2));
        
        if (Array.isArray(workspaces) && workspaces.length > 0) {
          options.workspaceId = workspaces[0].id;
          console.log(`Using default workspace for tasks: ${options.workspaceId}`);
        } else {
          throw new Error('No workspace found. Please provide a workspaceId or ensure you have access to at least one workspace.');
        }
      } catch (error) {
        console.error('Error fetching workspaces for tasks:', error);
        throw new Error(`Failed to fetch workspaces: ${error.message}`);
      }
    }
    
    let endpoint = '/tasks';
    const params = new URLSearchParams();
    
    params.append('workspaceId', options.workspaceId);
    
    // Only add projectId if it's a valid value (not null, undefined, or "null" string)
    if (options.projectId && options.projectId !== 'null' && options.projectId !== null) {
      params.append('projectId', options.projectId);
    }
    
    if (options.status) params.append('status', options.status);
    
    endpoint += '?' + params.toString();
    console.log(`Final tasks endpoint: ${endpoint}`);
    
    return this.makeRequest('GET', endpoint);
  }

  async createTask(taskData) {
    // Motion API requires workspaceId for creating tasks
    if (!taskData.workspaceId) {
      console.log('No workspaceId in task data, fetching workspaces...');
      try {
        const response = await this.getWorkspaces();
        console.log('Available workspaces for task creation:', JSON.stringify(response, null, 2));
        
        // Handle different response formats
        const workspaces = response.workspaces || response;
        console.log('Extracted workspaces for task creation:', JSON.stringify(workspaces, null, 2));
        
        if (Array.isArray(workspaces) && workspaces.length > 0) {
          taskData.workspaceId = workspaces[0].id;
          console.log(`Using default workspace for task creation: ${taskData.workspaceId}`);
        } else {
          throw new Error('No workspace found. Please provide a workspaceId or ensure you have access to at least one workspace.');
        }
      } catch (error) {
        console.error('Error fetching workspaces for task creation:', error);
        throw new Error(`Failed to fetch workspaces: ${error.message}`);
      }
    }
    console.log('Creating task with data:', JSON.stringify(taskData, null, 2));
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
        description: "Create a new project in Motion. If no workspaceId is provided, will use the first available workspace.",
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
            },
            workspaceId: {
              type: "string",
              description: "Workspace ID where the project should be created (optional - will auto-select if not provided)"
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
        description: "Create a new task in Motion. If no workspaceId is provided, will use the first available workspace.",
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
              description: "Workspace ID where the task should be created (optional - will auto-select if not provided)"
            },
            projectId: {
              type: "string",
              description: "Project ID to assign task to (optional - tasks can exist without a project)"
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
        description: "List tasks in Motion with optional filters. If no workspaceId is provided, will use the first available workspace.",
        inputSchema: {
          type: "object",
          properties: {
            workspaceId: {
              type: "string",
              description: "Workspace ID to filter tasks (optional - will auto-select if not provided)"
            },
            projectId: {
              type: "string",
              description: "Filter tasks by project ID (optional - leave empty to get all tasks regardless of project)"
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
    const response = await this.motionService.getProjects(args.workspaceId);
    console.log('Projects response:', JSON.stringify(response, null, 2));
    
    // Handle different response formats
    const projects = response.projects || response;
    console.log('Extracted projects:', JSON.stringify(projects, null, 2));
    
    if (!Array.isArray(projects)) {
      throw new Error(`Unexpected projects format: ${typeof projects}`);
    }
    
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
    const response = await this.motionService.getTasks(args);
    console.log('Tasks response:', JSON.stringify(response, null, 2));
    
    // Handle different response formats
    const tasks = response.tasks || response;
    console.log('Extracted tasks:', JSON.stringify(tasks, null, 2));
    
    if (!Array.isArray(tasks)) {
      throw new Error(`Unexpected tasks format: ${typeof tasks}`);
    }
    
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
    const response = await this.motionService.getWorkspaces();
    console.log('Workspaces response:', JSON.stringify(response, null, 2));
    
    // Handle different response formats
    const workspaces = response.workspaces || response;
    console.log('Extracted workspaces:', JSON.stringify(workspaces, null, 2));
    
    if (!Array.isArray(workspaces)) {
      throw new Error(`Unexpected workspaces format: ${typeof workspaces}`);
    }
    
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
