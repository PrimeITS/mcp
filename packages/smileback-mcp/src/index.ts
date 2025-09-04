#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { 
  CallToolRequestSchema, 
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { SmileBackClient } from './smileback-client.js';

const server = new Server(
  {
    name: 'smileback-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let smileBackClient: SmileBackClient | null = null;

function initializeClient() {
  const username = process.env.SMILEBACK_USERNAME;
  const password = process.env.SMILEBACK_PASSWORD;
  const clientId = process.env.SMILEBACK_CLIENT_ID;
  const clientSecret = process.env.SMILEBACK_CLIENT_SECRET;
  const baseUrl = process.env.SMILEBACK_BASE_URL;
  const scope = process.env.SMILEBACK_SCOPE;

  if (!username || !password || !clientId || !clientSecret) {
    throw new Error('SMILEBACK_USERNAME, SMILEBACK_PASSWORD, SMILEBACK_CLIENT_ID and SMILEBACK_CLIENT_SECRET environment variables are required');
  }

  smileBackClient = new SmileBackClient({
    username,
    password,
    clientId,
    clientSecret,
    baseUrl,
    scope
  });
}

const tools: Tool[] = [
  {
    name: 'smileback_get_reviews',
    description: 'Fetch customer reviews and feedback from SmileBack. Returns paginated results including ratings, comments, ticket details, contact information, and company data. Use this to analyze customer satisfaction trends, identify issues, and track feedback over time.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Maximum number of reviews per page (default: 20)' },
        offset: { type: 'string', description: 'Number of reviews to skip for pagination (default: 0)' },
        modified_since: { type: 'string', description: 'ISO datetime to filter reviews modified since this timestamp' },
        include_unrated: { type: 'string', description: 'Set to "true" to include reviews without a rating' },
        ordering: { type: 'string', description: 'Field to order results by' },
        search: { type: 'string', description: 'Search term to filter results' },
        created_after: { type: 'string', description: 'ISO datetime to filter reviews created after this date' },
        created_before: { type: 'string', description: 'ISO datetime to filter reviews created before this date' }
      }
    }
  },
  {
    name: 'smileback_get_recent_reviews',
    description: 'Fetch the most recently submitted or modified customer reviews from SmileBack. Ideal for monitoring real-time customer feedback, tracking new responses, and staying on top of customer sentiment. Returns paginated results with full review details.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Maximum number of reviews per page (default: 20)' },
        offset: { type: 'string', description: 'Number of reviews to skip for pagination (default: 0)' },
        modified_since: { type: 'string', description: 'ISO datetime to filter reviews modified since this timestamp' },
        include_unrated: { type: 'string', description: 'Set to "true" to include reviews without a rating' },
        ordering: { type: 'string', description: 'Field to order results by' },
        search: { type: 'string', description: 'Search term to filter results' },
        created_after: { type: 'string', description: 'ISO datetime to filter reviews created after this date' },
        created_before: { type: 'string', description: 'ISO datetime to filter reviews created before this date' }
      }
    }
  },
  {
    name: 'smileback_get_review',
    description: 'Retrieve detailed information for a specific customer review by its ID. Returns complete review data including rating, comment, associated ticket, customer contact details, and company information. Use this to drill down into individual feedback cases.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Review ID' }
      },
      required: ['id']
    }
  },
  {
    name: 'smileback_get_nps_responses',
    description: 'Retrieve Net Promoter Score (NPS) survey responses from SmileBack. Returns customer NPS ratings (0-10 scale), comments, and categorization as Promoters (9-10), Passives (7-8), or Detractors (0-6). Essential for measuring customer loyalty and satisfaction trends.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Maximum number of results per page (default: 20)' },
        offset: { type: 'string', description: 'Number of results to skip for pagination (default: 0)' },
        ordering: { type: 'string', description: 'Field to order results by' },
        search: { type: 'string', description: 'Search term to filter results' },
        created_after: { type: 'string', description: 'ISO datetime to filter responses created after this date' },
        created_before: { type: 'string', description: 'ISO datetime to filter responses created before this date' }
      }
    }
  },
  {
    name: 'smileback_get_nps_campaigns',
    description: 'Fetch information about Net Promoter Score (NPS) survey campaigns configured in SmileBack. Returns campaign settings, targeting rules, and performance metrics. Use this to understand your NPS survey strategy and campaign effectiveness.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Maximum number of results per page (default: 20)' },
        offset: { type: 'string', description: 'Number of results to skip for pagination (default: 0)' },
        ordering: { type: 'string', description: 'Field to order results by' },
        search: { type: 'string', description: 'Search term to filter results' }
      }
    }
  },
  {
    name: 'smileback_get_csat_agents',
    description: 'Retrieve Customer Satisfaction (CSAT) scores and performance metrics for individual support agents. Returns agent-specific satisfaction ratings, response counts, and performance trends. Essential for identifying top performers and coaching opportunities.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Maximum number of results per page (default: 20)' },
        offset: { type: 'string', description: 'Number of results to skip for pagination (default: 0)' },
        ordering: { type: 'string', description: 'Field to order results by' },
        search: { type: 'string', description: 'Search term to filter results' }
      }
    }
  },
  {
    name: 'smileback_get_csat_boards',
    description: 'Fetch Customer Satisfaction (CSAT) data organized by support boards or queues. Returns satisfaction metrics grouped by service desk boards, helping identify which support areas deliver the best customer experience.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Maximum number of results per page (default: 20)' },
        offset: { type: 'string', description: 'Number of results to skip for pagination (default: 0)' },
        ordering: { type: 'string', description: 'Field to order results by' },
        search: { type: 'string', description: 'Search term to filter results' }
      }
    }
  },
  {
    name: 'smileback_get_csat_companies',
    description: 'Retrieve Customer Satisfaction (CSAT) scores segmented by customer companies. Returns company-specific satisfaction metrics, helping identify which clients are most satisfied with your service and which need attention.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Maximum number of results per page (default: 20)' },
        offset: { type: 'string', description: 'Number of results to skip for pagination (default: 0)' },
        ordering: { type: 'string', description: 'Field to order results by' },
        search: { type: 'string', description: 'Search term to filter results' }
      }
    }
  },
  {
    name: 'smileback_get_csat_contacts',
    description: 'Fetch Customer Satisfaction (CSAT) data for individual customer contacts. Returns satisfaction history and feedback patterns for specific users, enabling personalized support strategies and relationship management.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Maximum number of results per page (default: 20)' },
        offset: { type: 'string', description: 'Number of results to skip for pagination (default: 0)' },
        ordering: { type: 'string', description: 'Field to order results by' },
        search: { type: 'string', description: 'Search term to filter results' }
      }
    }
  },
  {
    name: 'smileback_get_prj_responses',
    description: 'Retrieve customer feedback responses related to specific projects. Returns project-associated satisfaction scores and comments, helping measure project success from the customer perspective and identify areas for improvement.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Maximum number of results per page (default: 20)' },
        offset: { type: 'string', description: 'Number of results to skip for pagination (default: 0)' },
        ordering: { type: 'string', description: 'Field to order results by' },
        search: { type: 'string', description: 'Search term to filter results' },
        created_after: { type: 'string', description: 'ISO datetime to filter responses created after this date' },
        created_before: { type: 'string', description: 'ISO datetime to filter responses created before this date' }
      }
    }
  },
  {
    name: 'smileback_get_prj_surveys',
    description: 'Fetch information about project-specific survey campaigns in SmileBack. Returns survey configurations, questions, and targeting rules used to gather feedback on project deliverables and outcomes.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'string', description: 'Maximum number of results per page (default: 20)' },
        offset: { type: 'string', description: 'Number of results to skip for pagination (default: 0)' },
        ordering: { type: 'string', description: 'Field to order results by' },
        search: { type: 'string', description: 'Search term to filter results' }
      }
    }
  },
  {
    name: 'smileback_get_api_schema_overview',
    description: 'Get an overview of the SmileBack API schema including available endpoint categories, path counts, and basic endpoint information.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'smileback_get_api_endpoint_details',
    description: 'Get detailed information for specific API endpoints matching a path pattern (e.g., "reviews", "nps", "csat"). Supports flexible filtering to control response size and detail level. Use summaryOnly for quick exploration, disable schemas for smaller responses, or limit maxEndpoints for focused results.',
    inputSchema: {
      type: 'object',
      properties: {
        pathPattern: { 
          type: 'string', 
          description: 'Path pattern to match endpoints (e.g., "reviews", "nps", "csat", "prj")'
        },
        summaryOnly: {
          type: 'boolean',
          description: 'Return only basic endpoint information (path, methods, summary) without detailed schemas - ideal for quick API exploration'
        },
        includeSchemas: {
          type: 'boolean',
          description: 'Include detailed request/response schemas (default: true, set to false to significantly reduce response size)'
        },
        maxEndpoints: {
          type: 'number',
          description: 'Maximum number of endpoints to return (default: 10, max: 50) - helps manage response size'
        },
        includeExamples: {
          type: 'boolean',
          description: 'Include request/response examples (default: false to keep responses smaller)'
        }
      },
      required: ['pathPattern']
    }
  },
  {
    name: 'smileback_api_call',
    description: 'Make authenticated API calls to any SmileBack endpoint not covered by specific tools. Useful for accessing newer API features or custom endpoints.',
    inputSchema: {
      type: 'object',
      properties: {
        path: { 
          type: 'string', 
          description: 'API endpoint path starting with / (e.g., "/reviews/", "/nps-responses/")'
        },
        method: { 
          type: 'string', 
          enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
          description: 'HTTP method to use (default: GET)' 
        },
        body: { 
          type: 'object', 
          description: 'Request body data for POST/PUT/PATCH requests' 
        },
        queryParams: { 
          type: 'object', 
          description: 'URL query parameters as key-value pairs',
          additionalProperties: { type: 'string' }
        }
      },
      required: ['path']
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Helper function to extract pagination params from URL
function extractPaginationParams(url: string | null): { limit?: string; offset?: string } | null {
  if (!url) return null;
  
  try {
    const urlObj = new URL(url);
    const params: { limit?: string; offset?: string } = {};
    
    const limit = urlObj.searchParams.get('limit');
    const offset = urlObj.searchParams.get('offset');
    
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;
    
    return Object.keys(params).length > 0 ? params : null;
  } catch {
    return null;
  }
}

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!smileBackClient) {
    initializeClient();
  }

  if (!smileBackClient) {
    throw new Error('Failed to initialize SmileBack client');
  }

  const { name, arguments: args } = request.params;

  try {
    let result;
    
    // Type-safe argument access
    const getArg = (key: string, defaultValue?: any) => {
      return args && typeof args === 'object' && key in args ? (args as any)[key] : defaultValue;
    };

    // Convert arguments to query parameters object
    const buildQueryParams = (excludeKeys: string[] = []) => {
      if (!args || typeof args !== 'object') return undefined;
      const params: Record<string, string> = {};
      Object.entries(args).forEach(([key, value]) => {
        if (!excludeKeys.includes(key) && value !== undefined && value !== null) {
          params[key] = String(value);
        }
      });
      return Object.keys(params).length > 0 ? params : undefined;
    };

    switch (name) {
      case 'smileback_get_reviews':
        result = await smileBackClient.getReviews(buildQueryParams());
        // Add pagination helper info
        if (result && typeof result === 'object' && 'next' in result) {
          (result as any).pagination_params = {
            next: extractPaginationParams((result as any).next),
            previous: extractPaginationParams((result as any).previous),
            help: 'Use limit and offset parameters to navigate pages'
          };
        }
        break;
      case 'smileback_get_recent_reviews':
        result = await smileBackClient.getRecentReviews(buildQueryParams());
        // Add pagination helper info
        if (result && typeof result === 'object' && 'next' in result) {
          (result as any).pagination_params = {
            next: extractPaginationParams((result as any).next),
            previous: extractPaginationParams((result as any).previous),
            help: 'Use limit and offset parameters to navigate pages'
          };
        }
        break;
      case 'smileback_get_review':
        result = await smileBackClient.getReview(getArg('id'));
        break;
      case 'smileback_get_nps_responses':
        result = await smileBackClient.getNpsResponses(buildQueryParams());
        break;
      case 'smileback_get_nps_campaigns':
        result = await smileBackClient.getNpsCampaigns(buildQueryParams());
        break;
      case 'smileback_get_csat_agents':
        result = await smileBackClient.getCsatAgents(buildQueryParams());
        break;
      case 'smileback_get_csat_boards':
        result = await smileBackClient.getCsatBoards(buildQueryParams());
        break;
      case 'smileback_get_csat_companies':
        result = await smileBackClient.getCsatCompanies(buildQueryParams());
        break;
      case 'smileback_get_csat_contacts':
        result = await smileBackClient.getCsatContacts(buildQueryParams());
        break;
      case 'smileback_get_prj_responses':
        result = await smileBackClient.getPrjResponses(buildQueryParams());
        break;
      case 'smileback_get_prj_surveys':
        result = await smileBackClient.getPrjSurveys(buildQueryParams());
        break;
      case 'smileback_get_api_schema_overview':
        result = await smileBackClient.getApiSchemaOverview();
        break;
      case 'smileback_get_api_endpoint_details':
        result = await smileBackClient.getApiEndpointDetails(
          getArg('pathPattern'),
          getArg('summaryOnly', false),
          getArg('includeSchemas', true),
          getArg('maxEndpoints', 10),
          getArg('includeExamples', false)
        );
        break;
      case 'smileback_api_call':
        result = await smileBackClient.makeApiCall(
          getArg('path'), 
          getArg('method', 'GET'), 
          getArg('body'), 
          getArg('queryParams')
        );
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    };
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      ]
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});