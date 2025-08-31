#!/usr/bin/env node
import process from 'node:process';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ConnectWisePSAClient } from './connectwisepsa-client.js';
import type { ConnectWisePSAConfig } from './connectwisepsa-client.js';

// Initialize ConnectWise PSA client with environment variables
const config: ConnectWisePSAConfig = {
  apiUrl: process.env.CONNECTWISE_PSA_API_URL || '',
  companyId: process.env.CONNECTWISE_PSA_COMPANY_ID || '',
  publicKey: process.env.CONNECTWISE_PSA_PUBLIC_KEY || '',
  privateKey: process.env.CONNECTWISE_PSA_PRIVATE_KEY || '',
  ...(process.env.CONNECTWISE_PSA_CLIENT_ID && { clientId: process.env.CONNECTWISE_PSA_CLIENT_ID })
};

// Validate configuration
if (!config.apiUrl || !config.companyId || !config.publicKey || !config.privateKey) {
  console.error('Missing required environment variables. Please check your .env file.');
  console.error('Required: CONNECTWISE_PSA_API_URL, CONNECTWISE_PSA_COMPANY_ID, CONNECTWISE_PSA_PUBLIC_KEY, CONNECTWISE_PSA_PRIVATE_KEY');
  console.error('Optional: CONNECTWISE_PSA_CLIENT_ID');
  process.exit(1);
}

const connectWiseClient = new ConnectWisePSAClient(config);

// Create the MCP server
const server = new Server(
  {
    name: 'connectwisepsa-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
const tools: Tool[] = [
  {
    name: 'connectwisepsa_get_schema_overview',
    description: 'Get an overview of the ConnectWise PSA API schema including available endpoint categories, path counts, and basic endpoint information.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'connectwisepsa_list_api_endpoints',
    description: 'List all API endpoints with their paths, methods, and summaries. Use this first to discover available endpoints, then use connectwisepsa_get_api_endpoint_details for full details. Supports pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional category filter (e.g., "Company", "Service", "Project", "Finance")'
        },
        skip: {
          type: 'number',
          description: 'Number of endpoints to skip for pagination (default: 0)',
          default: 0
        },
        limit: {
          type: 'number',
          description: 'Maximum number of endpoints to return (default: 100)',
          default: 100
        }
      }
    }
  },
  {
    name: 'connectwisepsa_get_api_endpoint_details',
    description: 'Get complete details for specific API endpoints including parameters, request/response schemas, and examples. Use after finding endpoints with connectwisepsa_list_api_endpoints.',
    inputSchema: {
      type: 'object',
      properties: {
        pathPattern: {
          type: 'string',
          description: 'Path pattern to match endpoints (e.g., "company", "service/tickets", "project", "finance/invoices")'
        },
        maxEndpoints: {
          type: 'number',
          description: 'Maximum number of endpoints to return (default: 10, max: 50) - helps manage response size',
          default: 10
        },
        includeSchemas: {
          type: 'boolean',
          description: 'Include detailed request/response schemas (default: true, set to false to significantly reduce response size)',
          default: true
        },
        includeExamples: {
          type: 'boolean',
          description: 'Include request/response examples (default: false to keep responses smaller)',
          default: false
        },
        summaryOnly: {
          type: 'boolean',
          description: 'Return only basic endpoint information (path, methods, summary) without detailed schemas - ideal for quick API exploration',
          default: false
        }
      },
      required: ['pathPattern']
    }
  },
  {
    name: 'connectwisepsa_search_api_endpoints',
    description: 'Search for API endpoints by keywords. Returns matching endpoints with basic info. Use connectwisepsa_get_api_endpoint_details for full details of specific endpoints. Supports pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find endpoints (searches in paths, summaries, descriptions, and tags)'
        },
        skip: {
          type: 'number',
          description: 'Number of results to skip for pagination (default: 0)',
          default: 0
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 50)',
          default: 50
        }
      },
      required: ['query']
    }
  },
  {
    name: 'connectwisepsa_get_api_schemas',
    description: 'Get API schemas/models from the swagger definition. Shows the structure of request/response objects used by the API endpoints. Supports pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        schemaPattern: {
          type: 'string',
          description: 'Optional pattern to filter schemas by name (e.g., "Company", "Ticket", "Project", "Invoice")'
        },
        skip: {
          type: 'number',
          description: 'Number of matching schemas to skip for pagination (default: 0)',
          default: 0
        },
        limit: {
          type: 'number',
          description: 'Maximum number of schemas to return (default: 50)',
          default: 50
        },
        listNames: {
          type: 'boolean',
          description: 'Include list of all matching schema names (default: false, auto-included if ≤20 matches)',
          default: false
        }
      }
    }
  },
  {
    name: 'connectwisepsa_api_call',
    description: `Make authenticated API calls to any ConnectWise PSA endpoint. Use this after finding the right endpoint with schema tools.

QUERY PARAMETERS GUIDE:
- conditions: Filter results using field comparisons. Format: "field operator value"
  Operators: =, !=, <, <=, >, >=, <>, contains, like, in, not
  Examples: 'board/name="Integration"', 'lastUpdated>[2016-08-20T18:04:26Z]', 'board/id in (3,2,4)'
  
- childConditions: Search arrays on endpoints with child objects  
  Example: 'communicationItems/value like "john@outlook.com" AND communicationItems/communicationType="Email"'
  
- customFieldConditions: Search custom fields when customFieldConditions is listed in parameters
  Example: 'caption="TomNumber" AND value!="null"'
  
- orderBy: Sort results by field. Add "asc" or "desc" 
  Example: 'contact/name asc'
  
- fields: Limit response fields (not available on reporting endpoints)
  Example: 'id,name,status/id'
  
- columns: Limit response fields (only for reporting endpoints)  
  Example: 'id,summary,name'
  
- page: Pagination (starts at 1) 
- pageSize: Results per page (default 25, max 1000)

CONDITION FORMATTING:
- Strings: Must be in quotes: 'summary="This is my string"' (accepts *'s for wildcards)
- Integers: No formatting required: 'board/id=123'  
- Booleans: Must be True or False: 'closedFlag=True'
- Datetimes: Must be in square brackets: 'lastUpdated=[2016-08-20T18:04:26Z]'
- Logic: Use AND/OR: 'board/name="Integration" and summary="xyz"'
- References: Use / for nested fields: 'manufacturer/name'

IMPORTANT NOTES:
- For URLs over 10,000 chars, use /search endpoints with conditions in request body
- Rate limiting: Max ~1000 requests/minute. Watch for HTTP 429 with Retry-After header
- URL encoding required for special chars: & = %26, " = %22, + = %2B, etc.
- Max URL length recommended: 2000 characters including domain
- SSL required on production servers (use api- prefix for cloud: api-na.myconnectwise.net)`,
    inputSchema: {
      type: 'object',
      properties: {
        method: {
          type: 'string',
          enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
          description: 'HTTP method to use',
          default: 'GET'
        },
        path: {
          type: 'string',
          description: 'API endpoint path (e.g., "/company/companies", "/service/tickets") - the /v4_6_release/apis/3.0 prefix is automatically added'
        },
        queryParams: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: 'URL query parameters. Common ones: conditions, childConditions, customFieldConditions, orderBy, fields, page, pageSize'
        },
        body: {
          type: 'object',
          description: 'Request body data for POST/PUT/PATCH requests'
        }
      },
      required: ['path']
    }
  }
];

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools,
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case 'connectwisepsa_get_schema_overview': {
        const overview = await connectWiseClient.getSchemaOverview();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(overview, null, 2)
            }
          ]
        };
      }

      case 'connectwisepsa_list_api_endpoints': {
        const endpoints = await connectWiseClient.listApiEndpoints({
          category: args.category as string,
          skip: args.skip as number,
          limit: args.limit as number
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                count: endpoints.length,
                endpoints: endpoints.map(ep => ({
                  path: ep.path,
                  method: ep.method,
                  summary: ep.summary,
                  tags: ep.tags
                }))
              }, null, 2)
            }
          ]
        };
      }

      case 'connectwisepsa_get_api_endpoint_details': {
        const endpoints = await connectWiseClient.getApiEndpointDetails({
          pathPattern: args.pathPattern as string,
          maxEndpoints: args.maxEndpoints as number,
          includeSchemas: args.includeSchemas as boolean,
          includeExamples: args.includeExamples as boolean,
          summaryOnly: args.summaryOnly as boolean
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                count: endpoints.length,
                endpoints
              }, null, 2)
            }
          ]
        };
      }

      case 'connectwisepsa_search_api_endpoints': {
        const endpoints = await connectWiseClient.searchApiEndpoints(
          args.query as string,
          {
            skip: args.skip as number,
            limit: args.limit as number
          }
        );
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                query: args.query,
                count: endpoints.length,
                endpoints: endpoints.map(ep => ({
                  path: ep.path,
                  method: ep.method,
                  summary: ep.summary,
                  tags: ep.tags
                }))
              }, null, 2)
            }
          ]
        };
      }

      case 'connectwisepsa_get_api_schemas': {
        const result = await connectWiseClient.getApiSchemas({
          schemaPattern: args.schemaPattern as string,
          skip: args.skip as number,
          limit: args.limit as number,
          listNames: args.listNames as boolean
        });
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                totalCount: result.totalCount,
                returnedCount: Object.keys(result.schemas).length,
                names: result.names,
                schemas: result.schemas
              }, null, 2)
            }
          ]
        };
      }

      case 'connectwisepsa_api_call': {
        const result = await connectWiseClient.makeApiCall({
          method: args.method as string,
          path: args.path as string,
          queryParams: args.queryParams as Record<string, any>,
          body: args.body
        });
        
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error.message}`
        }
      ]
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ConnectWise PSA MCP server started');
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});