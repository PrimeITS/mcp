#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import type { Tool } from '@modelcontextprotocol/sdk/types.js';
import { HuntressClient } from './huntress-client.js';

const server = new Server(
  {
    name: 'huntress-mcp',
    version: '0.1.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

let huntressClient: HuntressClient | null = null;

function initializeClient() {
  const apiKey = process.env.HUNTRESS_API_KEY;
  const apiSecret = process.env.HUNTRESS_API_SECRET;
  const baseUrl = process.env.HUNTRESS_BASE_URL;

  if (!apiKey || !apiSecret) {
    throw new Error('HUNTRESS_API_KEY and HUNTRESS_API_SECRET environment variables are required');
  }

  huntressClient = new HuntressClient({
    apiKey,
    apiSecret,
    baseUrl
  });
}

const tools: Tool[] = [
  {
    name: 'huntress_get_account',
    description: 'Get details about your Huntress account including account configuration, settings, and permissions.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'huntress_get_actor',
    description: 'Get details about the current authenticated actor (API user) including user information and access rights.',
    inputSchema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'huntress_list_agents',
    description: 'List all agents (endpoints) monitored by Huntress. Agents represent managed devices running the Huntress agent software. Supports filtering by organization, platform (Windows/macOS/Linux), and pagination.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of agents to return per page (default: 10, max: 500)',
          minimum: 1,
          maximum: 500
        },
        page_token: {
          type: 'string',
          description: 'Token for pagination to retrieve the next page of results'
        },
        organization_id: {
          type: 'number',
          description: 'Filter agents by organization ID'
        },
        platform: {
          type: 'string',
          enum: ['windows', 'darwin', 'linux'],
          description: 'Filter agents by platform (windows, darwin, linux)'
        }
      }
    }
  },
  {
    name: 'huntress_get_agent',
    description: 'Get detailed information about a specific agent by ID including system details, security status, and deployment information.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Agent ID'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'huntress_list_organizations',
    description: 'List all organizations (customer accounts) in your Huntress account. Organizations represent separate client or business entities being monitored.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of organizations to return per page (default: 10, max: 500)',
          minimum: 1,
          maximum: 500
        },
        page_token: {
          type: 'string',
          description: 'Token for pagination to retrieve the next page of results'
        }
      }
    }
  },
  {
    name: 'huntress_get_organization',
    description: 'Get detailed information about a specific organization by ID including contact details, settings, and associated resources.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Organization ID'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'huntress_list_incident_reports',
    description: 'List security incident reports from Huntress. Incident reports detail security threats, malware detections, suspicious activity, and remediation actions taken. Essential for security monitoring and incident response.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of incident reports to return per page (default: 10, max: 500)',
          minimum: 1,
          maximum: 500
        },
        page_token: {
          type: 'string',
          description: 'Token for pagination to retrieve the next page of results'
        },
        organization_id: {
          type: 'number',
          description: 'Filter incident reports by organization ID'
        }
      }
    }
  },
  {
    name: 'huntress_get_incident_report',
    description: 'Get detailed information about a specific security incident by ID including threat details, affected systems, timeline, and remediation steps.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Incident Report ID'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'huntress_list_reports',
    description: 'List summary reports from Huntress. Summary reports provide high-level security insights, statistics, and trends across your monitored environment.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of reports to return per page (default: 10, max: 500)',
          minimum: 1,
          maximum: 500
        },
        page_token: {
          type: 'string',
          description: 'Token for pagination to retrieve the next page of results'
        },
        organization_id: {
          type: 'number',
          description: 'Filter reports by organization ID'
        }
      }
    }
  },
  {
    name: 'huntress_get_report',
    description: 'Get detailed information about a specific summary report by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Report ID'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'huntress_list_billing_reports',
    description: 'List billing reports from Huntress. Billing reports contain usage data, licensing information, and cost details for your account.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of billing reports to return per page (default: 10, max: 500)',
          minimum: 1,
          maximum: 500
        },
        page_token: {
          type: 'string',
          description: 'Token for pagination to retrieve the next page of results'
        }
      }
    }
  },
  {
    name: 'huntress_get_billing_report',
    description: 'Get detailed information about a specific billing report by ID.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Billing Report ID'
        }
      },
      required: ['id']
    }
  },
  {
    name: 'huntress_list_signals',
    description: 'List security signals from Huntress. Signals represent detected security events, threats, or anomalies that may require investigation. Use this for real-time security monitoring and threat hunting.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of signals to return per page (default: 10, max: 500)',
          minimum: 1,
          maximum: 500
        },
        page_token: {
          type: 'string',
          description: 'Token for pagination to retrieve the next page of results'
        },
        organization_id: {
          type: 'number',
          description: 'Filter signals by organization ID'
        }
      }
    }
  },
  {
    name: 'huntress_get_signal',
    description: 'Get detailed information about a specific security signal by ID including detection details, severity, affected assets, and recommended actions.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'Signal ID'
        }
      },
      required: ['id']
    }
  }
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (!huntressClient) {
    throw new Error('Huntress client not initialized');
  }

  const { name, arguments: args } = request.params;

  try {
    let result;

    switch (name) {
      case 'huntress_get_account':
        result = await huntressClient.getAccount();
        break;

      case 'huntress_get_actor':
        result = await huntressClient.getActor();
        break;

      case 'huntress_list_agents':
        result = await huntressClient.listAgents({
          limit: args?.limit as number | undefined,
          page_token: args?.page_token as string | undefined,
          organization_id: args?.organization_id as number | undefined,
          platform: args?.platform as 'windows' | 'darwin' | 'linux' | undefined
        });
        break;

      case 'huntress_get_agent':
        if (!args?.id) {
          throw new Error('Agent ID is required');
        }
        result = await huntressClient.getAgent(args.id as string);
        break;

      case 'huntress_list_organizations':
        result = await huntressClient.listOrganizations({
          limit: args?.limit as number | undefined,
          page_token: args?.page_token as string | undefined
        });
        break;

      case 'huntress_get_organization':
        if (!args?.id) {
          throw new Error('Organization ID is required');
        }
        result = await huntressClient.getOrganization(args.id as string);
        break;

      case 'huntress_list_incident_reports':
        result = await huntressClient.listIncidentReports({
          limit: args?.limit as number | undefined,
          page_token: args?.page_token as string | undefined,
          organization_id: args?.organization_id as number | undefined
        });
        break;

      case 'huntress_get_incident_report':
        if (!args?.id) {
          throw new Error('Incident Report ID is required');
        }
        result = await huntressClient.getIncidentReport(args.id as string);
        break;

      case 'huntress_list_reports':
        result = await huntressClient.listReports({
          limit: args?.limit as number | undefined,
          page_token: args?.page_token as string | undefined,
          organization_id: args?.organization_id as number | undefined
        });
        break;

      case 'huntress_get_report':
        if (!args?.id) {
          throw new Error('Report ID is required');
        }
        result = await huntressClient.getReport(args.id as string);
        break;

      case 'huntress_list_billing_reports':
        result = await huntressClient.listBillingReports({
          limit: args?.limit as number | undefined,
          page_token: args?.page_token as string | undefined
        });
        break;

      case 'huntress_get_billing_report':
        if (!args?.id) {
          throw new Error('Billing Report ID is required');
        }
        result = await huntressClient.getBillingReport(args.id as string);
        break;

      case 'huntress_list_signals':
        result = await huntressClient.listSignals({
          limit: args?.limit as number | undefined,
          page_token: args?.page_token as string | undefined,
          organization_id: args?.organization_id as number | undefined
        });
        break;

      case 'huntress_get_signal':
        if (!args?.id) {
          throw new Error('Signal ID is required');
        }
        result = await huntressClient.getSignal(args.id as string);
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorMessage}`
        }
      ],
      isError: true
    };
  }
});

async function main() {
  try {
    initializeClient();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Huntress MCP server running on stdio');
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
