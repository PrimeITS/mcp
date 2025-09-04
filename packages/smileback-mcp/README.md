# SmileBack MCP Server

A Model Context Protocol (MCP) server that provides integration with the SmileBack API for accessing customer feedback, reviews, NPS responses, and CSAT data.

## Features

- **Reviews Management**: Access all reviews and recent reviews with filtering
- **NPS Integration**: Get NPS responses and campaigns 
- **CSAT Data**: Access CSAT agents, boards, companies, and contacts
- **Project Feedback**: Retrieve project responses and surveys
- **Schema Introspection**: Explore API endpoints and their schemas
- **Generic API Access**: Make calls to any SmileBack endpoint

## Installation

```bash
npm install @adamhancock/smileback-mcp
# or
pnpm add @adamhancock/smileback-mcp
```

## Configuration

Set the following environment variables:

```bash
export SMILEBACK_USERNAME="your-username"
export SMILEBACK_PASSWORD="your-password" 
export SMILEBACK_CLIENT_ID="your-client-id"
export SMILEBACK_CLIENT_SECRET="your-client-secret"

# Optional
export SMILEBACK_BASE_URL="https://app.smileback.io"  # Default value
export SMILEBACK_SCOPE="read"              # Default value
```

### Getting API Credentials

1. Log into your SmileBack account
2. Navigate to `/account/api-credentials` in the SmileBack portal
3. Get your `client_id` and `client_secret` from the API credentials page
4. Use your SmileBack username and password for authentication

## Usage with Claude Desktop

Add to your Claude Desktop MCP settings:

```json
{
  "mcpServers": {
    "smileback": {
      "command": "npx",
      "args": ["@adamhancock/smileback-mcp"],
      "env": {
        "SMILEBACK_USERNAME": "your-username",
        "SMILEBACK_PASSWORD": "your-password",
        "SMILEBACK_CLIENT_ID": "your-client-id", 
        "SMILEBACK_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

## Available Tools

### Reviews
- `smileback_get_reviews` - Get reviews with filtering and pagination
- `smileback_get_recent_reviews` - Get recent reviews with pagination
- `smileback_get_review` - Get specific review by ID

### NPS (Net Promoter Score)
- `smileback_get_nps_responses` - Get NPS survey responses
- `smileback_get_nps_campaigns` - Get NPS campaigns

### CSAT (Customer Satisfaction)
- `smileback_get_csat_agents` - Get CSAT agent data
- `smileback_get_csat_boards` - Get CSAT board data
- `smileback_get_csat_companies` - Get CSAT company data
- `smileback_get_csat_contacts` - Get CSAT contact data

### Project Feedback
- `smileback_get_prj_responses` - Get project feedback responses
- `smileback_get_prj_surveys` - Get project surveys

### API Introspection  
- `smileback_get_api_schema_overview` - Get API schema overview
- `smileback_get_api_endpoint_details` - Get detailed endpoint information

### Generic Access
- `smileback_api_call` - Make authenticated calls to any endpoint

## Example Queries

Ask Claude:
- "Show me recent customer reviews from SmileBack"
- "Get NPS responses from the last 30 days" 
- "What are the CSAT scores for our support agents?"
- "Analyze customer feedback trends from project surveys"
- "Show me the SmileBack API schema for reviews endpoints"

## Development

```bash
# Clone and install dependencies
pnpm install

# Build the server
pnpm build

# Run in development mode
pnpm dev
```

## Authentication

This server uses OAuth 2.0 Resource Owner Password Credentials grant flow:

1. Exchanges username/password + client credentials for access token
2. Uses access token for all API requests
3. Automatically refreshes tokens when expired
4. Supports the `read` and `read_recent` scopes

## Pagination

All list endpoints support pagination using `limit` and `offset` parameters:

```javascript
// Get first 10 reviews
{ limit: "10", offset: "0" }

// Get next 10 reviews  
{ limit: "10", offset: "10" }
```

Paginated responses include:
- `count`: Total number of items available
- `next`: URL for the next page (null if last page)
- `previous`: URL for the previous page (null if first page)
- `results`: Array of items for the current page
- `pagination_params`: Helper object with parsed limit/offset for next/previous pages

## Filtering Options

Most list endpoints support these common parameters:
- `limit`: Maximum items per page (default: 20)
- `offset`: Number of items to skip for pagination
- `modified_since`: ISO datetime for incremental updates
- `include_unrated`: Include items without ratings (true/false)
- `created_after`/`created_before`: Date range filtering
- `ordering`: Field name to sort results by
- `search`: Text search across relevant fields

## API Reference

The SmileBack API provides access to:
- Customer reviews and ratings
- NPS survey responses and campaigns
- CSAT metrics across agents, boards, companies
- Project-specific feedback and surveys

All endpoints support pagination, filtering, and ordering parameters.

## License

MIT