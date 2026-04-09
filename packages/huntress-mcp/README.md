# Huntress MCP Server

A Model Context Protocol (MCP) server that provides integration with the Huntress API for cybersecurity monitoring, threat detection, and incident response capabilities.

## Features

This MCP server provides access to:
- **Account Management**: View account and actor (API user) details
- **Agent Monitoring**: List and manage monitored endpoints across Windows, macOS, and Linux
- **Organization Management**: Access details for customer organizations
- **Incident Reports**: View security incidents, threats, and remediation actions
- **Security Signals**: Monitor real-time security events and anomalies
- **Summary Reports**: Access high-level security insights and statistics
- **Billing Reports**: View usage data and licensing information

## Installation

```bash
cd packages/huntress-mcp
pnpm install
pnpm build
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Generate your Huntress API credentials:
   - Log into your Huntress account at `<subdomain>.huntress.io`
   - Navigate to the dropdown menu at the top-right corner
   - Select "API Credentials"
   - Click "Setup" then "Generate" to create your API key pair
   - **Important**: Save your API Secret immediately - it won't be shown again!

3. Update `.env` with your credentials:
```env
HUNTRESS_API_KEY=hk_your_api_key_here
HUNTRESS_API_SECRET=your_api_secret_here
```

## Usage with Claude Desktop

Add this to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "huntress": {
      "command": "node",
      "args": ["/absolute/path/to/mcp/packages/huntress-mcp/dist/index.js"],
      "env": {
        "HUNTRESS_API_KEY": "hk_your_api_key_here",
        "HUNTRESS_API_SECRET": "your_api_secret_here"
      }
    }
  }
}
```

## Available Tools

### Account & Authentication
- `huntress_get_account` - Get account details and settings
- `huntress_get_actor` - Get current API user information

### Agents (Endpoints)
- `huntress_list_agents` - List all monitored agents
  - Optional filters: `organization_id`, `platform` (windows/darwin/linux)
  - Pagination: `limit`, `page_token`
- `huntress_get_agent` - Get detailed agent information by ID

### Organizations
- `huntress_list_organizations` - List all organizations
  - Pagination: `limit`, `page_token`
- `huntress_get_organization` - Get organization details by ID

### Security Incidents
- `huntress_list_incident_reports` - List security incident reports
  - Optional filter: `organization_id`
  - Pagination: `limit`, `page_token`
- `huntress_get_incident_report` - Get detailed incident information by ID

### Security Signals
- `huntress_list_signals` - List real-time security signals and events
  - Optional filter: `organization_id`
  - Pagination: `limit`, `page_token`
- `huntress_get_signal` - Get detailed signal information by ID

### Reports
- `huntress_list_reports` - List summary reports
  - Optional filter: `organization_id`
  - Pagination: `limit`, `page_token`
- `huntress_get_report` - Get report details by ID

### Billing
- `huntress_list_billing_reports` - List billing reports
  - Pagination: `limit`, `page_token`
- `huntress_get_billing_report` - Get billing report details by ID

## API Rate Limits

The Huntress API enforces rate limiting:
- **60 requests per minute** on a sliding window
- If you exceed this limit, you'll receive a 429 error response
- Plan your automation accordingly to stay within limits

## Development

### Run in development mode
```bash
pnpm dev
```

### Test with MCP Inspector
```bash
pnpm inspector
```

### Build for production
```bash
pnpm build
```

## API Documentation

For more details about the Huntress API:
- [Official API Documentation](https://api.huntress.io/docs)
- [Support](https://support.huntress.io)
- [Feature Requests](https://feedback.huntress.com/)

## License

MIT

## Author

Adam Hancock
