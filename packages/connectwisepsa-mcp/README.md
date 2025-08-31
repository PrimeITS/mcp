# ConnectWise PSA MCP Server

A Model Context Protocol (MCP) server that provides seamless integration with ConnectWise PSA (Professional Services Automation) API. This server enables AI assistants to interact with ConnectWise PSA data including service tickets, companies, projects, and more.

## Features

- 🔍 **API Schema Discovery** - Browse and search ConnectWise PSA API endpoints
- 🎫 **Service Management** - Access and manage service tickets, boards, and statuses
- 🏢 **Company Management** - Query and manage companies and contacts
- 📊 **Project Management** - Access project information and tasks
- 💰 **Finance Integration** - Query invoices, agreements, and billing data
- 🔧 **Flexible API Access** - Direct API call capability for any ConnectWise PSA endpoint

## Installation

### Using npx

You can run the ConnectWise PSA MCP server directly using npx:

```bash
npx @adamhancock/connectwisepsa-mcp
```

### Using Docker

Pull and run the server using Docker:

```bash
docker run -it \
  -e CONNECTWISE_PSA_PUBLIC_KEY="your_public_key" \
  -e CONNECTWISE_PSA_PRIVATE_KEY="your_private_key" \
  -e CONNECTWISE_PSA_CLIENT_ID="your_client_id" \
  -e CONNECTWISE_PSA_COMPANY_URL="https://your-company.connectwisedev.com" \
  ghcr.io/adamhancock/connectwisepsa-mcp:latest
```

### Installing in MCP Client

To use this server with an MCP client like Claude Desktop, add it to your configuration:

#### Claude Desktop Configuration

Edit your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

Add the ConnectWise PSA server configuration:

##### Using npx:

```json
{
  "mcpServers": {
    "connectwisepsa": {
      "command": "npx",
      "args": ["@adamhancock/connectwisepsa-mcp"],
      "env": {
        "CONNECTWISE_PSA_PUBLIC_KEY": "your_public_key",
        "CONNECTWISE_PSA_PRIVATE_KEY": "your_private_key",
        "CONNECTWISE_PSA_CLIENT_ID": "your_client_id",
        "CONNECTWISE_PSA_COMPANY_URL": "https://your-company.connectwisedev.com"
      }
    }
  }
}
```

##### Using Docker:

```json
{
  "mcpServers": {
    "connectwisepsa": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "CONNECTWISE_PSA_PUBLIC_KEY=your_public_key",
        "-e",
        "CONNECTWISE_PSA_PRIVATE_KEY=your_private_key",
        "-e",
        "CONNECTWISE_PSA_CLIENT_ID=your_client_id",
        "-e",
        "CONNECTWISE_PSA_COMPANY_URL=https://your-company.connectwisedev.com",
        "ghcr.io/adamhancock/connectwisepsa-mcp:latest"
      ]
    }
  }
}
```

## Configuration

### Required Environment Variables

- `CONNECTWISE_PSA_PUBLIC_KEY`: Your ConnectWise PSA API public key
- `CONNECTWISE_PSA_PRIVATE_KEY`: Your ConnectWise PSA API private key
- `CONNECTWISE_PSA_CLIENT_ID`: Your ConnectWise PSA client ID
- `CONNECTWISE_PSA_COMPANY_URL`: Your ConnectWise PSA instance URL (e.g., https://your-company.connectwisedev.com)

### Getting API Credentials

1. Log in to your ConnectWise PSA instance
2. Navigate to System > Members
3. Select your API member or create a new one
4. Go to the API Keys tab
5. Generate new API keys if needed
6. Copy the Public Key and Private Key
7. Your Client ID is typically your company identifier + public key username

## Available Tools

### Schema Discovery

- `connectwisepsa_get_schema_overview` - Get an overview of available API endpoints
- `connectwisepsa_list_api_endpoints` - List all API endpoints with pagination
- `connectwisepsa_get_api_endpoint_details` - Get detailed information about specific endpoints
- `connectwisepsa_search_api_endpoints` - Search for endpoints by keywords
- `connectwisepsa_get_api_schemas` - Get API schema definitions

### Direct API Access

- `connectwisepsa_api_call` - Make authenticated API calls to any ConnectWise PSA endpoint

## Usage Examples

### Discovering Available APIs

```typescript
// Get API overview
await connectwisepsa_get_schema_overview();

// Search for ticket-related endpoints
await connectwisepsa_search_api_endpoints({ 
  query: "ticket" 
});

// Get details about service ticket endpoints
await connectwisepsa_get_api_endpoint_details({ 
  pathPattern: "service/tickets" 
});
```

### Working with Service Tickets

```typescript
// Get list of service tickets
await connectwisepsa_api_call({
  method: "GET",
  path: "/service/tickets",
  queryParams: {
    conditions: "status/name='Open'",
    pageSize: "25"
  }
});

// Create a new ticket
await connectwisepsa_api_call({
  method: "POST",
  path: "/service/tickets",
  body: {
    summary: "New support request",
    board: { id: 1 },
    status: { id: 1 },
    company: { id: 123 }
  }
});
```

### Query Parameters Guide

ConnectWise PSA API supports powerful filtering and querying:

- **conditions**: Filter results using field comparisons
  - Format: `"field operator value"`
  - Operators: `=`, `!=`, `<`, `<=`, `>`, `>=`, `contains`, `like`, `in`, `not`
  - Examples: 
    - `'status/name="Open"'`
    - `'lastUpdated>[2024-01-01T00:00:00Z]'`
    - `'priority/id in (1,2,3)'`

- **orderBy**: Sort results
  - Example: `'lastUpdated desc'`

- **fields**: Limit response fields
  - Example: `'id,summary,status'`

- **page** & **pageSize**: Pagination
  - Default pageSize: 25, Max: 1000

## Development

### Building from Source

```bash
# Clone the repository
git clone https://github.com/adamhancock/mcp.git
cd mcp/packages/connectwisepsa-mcp

# Install dependencies
npm install

# Build the package
npm run build

# Run locally
npm start
```

### Testing

```bash
npm test
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Verify your API credentials are correct
   - Ensure your API member has appropriate permissions
   - Check that your company URL is correct

2. **Connection Issues**
   - Verify network connectivity to ConnectWise PSA
   - Check firewall rules for API access
   - Ensure your ConnectWise PSA instance is accessible

3. **Rate Limiting**
   - ConnectWise PSA has rate limits (~1000 requests/minute)
   - Implement appropriate delays between bulk operations
   - Watch for HTTP 429 responses with Retry-After headers

## Support

For issues, questions, or contributions, please visit:
- GitHub Issues: [https://github.com/adamhancock/mcp/issues](https://github.com/adamhancock/mcp/issues)

## License

MIT

## Author

Adam Hancock

## Acknowledgments

Built on the Model Context Protocol (MCP) by Anthropic.