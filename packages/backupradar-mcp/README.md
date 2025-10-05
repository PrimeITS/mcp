# BackupRadar MCP Server

Expose BackupRadar backup monitoring data to Model Context Protocol (MCP) clients. This package wraps the BackupRadar REST API and makes common workflows—like reviewing backup jobs or acknowledging alerts—available as MCP tools.

## Highlights
- Query BackupRadar policies with familiar filters and pagination controls
- Inspect individual backup records to review configuration details
- Fetch execution results for a backup and confirm recent outcomes
- Works seamlessly with the bundled Mockoon environment for offline testing

## Installation

```bash
pnpm add @adamhancock/backupradar-mcp
# or
npm install @adamhancock/backupradar-mcp
```

## Configuration

Set the required environment variables (usually via `.env`):

```env
BACKUPRADAR_API_KEY=your_api_key
BACKUPRADAR_BASE_URL=https://api.backupradar.com/v2

# Optional overrides
BACKUPRADAR_API_KEY_HEADER=ApiKey
BACKUPRADAR_TIMEOUT_MS=30000
BACKUPRADAR_USER_AGENT=my-mcp-integration/1.0
```

### Mock API (Mockoon)

A ready-to-use Mockoon environment lives at `packages/backupradar-mcp/MockoonBackupRadar.json`. Import it into Mockoon (Desktop or CLI) to exercise the MCP against realistic-but-safe sample data.

- Default host/port: `http://lvh.me:3000`
- Authentication header: `ApiKey: demo-key`
- Query parameters such as `SearchByCompanyName`, `SearchByDeviceName`, `SearchByJobName`, `SearchByBackupMethod`, `tags`, `statuses`, `policyIds`, etc. are echoed back in the payload so you can validate filtering and pagination behaviour end-to-end.
- When no company/policy filter is supplied, additional sample entities are returned so list views still look populated.
- Note - Support for complex query param combinations is not fully implemented - to test fully, a live backupRadar API connection is recommended!

Sample `.env` for the mock:

```env
BACKUPRADAR_BASE_URL=http://lvh.me:3000
BACKUPRADAR_API_KEY=demo-key
BACKUPRADAR_API_KEY_HEADER=ApiKey
```

## Available Tools

| Tool | Description |
| --- | --- |
| `backupradar_list_backups` | List backups (/backups) with optional filters for company, device, method, status, tags, and paging. |
| `backupradar_get_backup` | Retrieve a single backup record (/backups/{backupId}) with optional date hinting for history. |
| `backupradar_get_backup_results` | Fetch execution results for a backup (/backups/{backupId}/results), optionally scoped by date. |

All responses are returned verbatim from the BackupRadar API to preserve schema details for downstream automation.

## Example Usage
- "List BackupRadar backups tagged `Veeam` that haven’t succeeded in 3 days."
- "Show the configuration for backup `12004` from yesterday."
- "Fetch the execution results for backup `12004` on 2025-09-30."

## Development

```bash
# Install dependencies for the whole monorepo
pnpm install

# Build just this package
pnpm --filter backupradar-mcp build

# Run in watch mode with .env support
cd packages/backupradar-mcp
pnpm dev

# Launch the MCP inspector for interactive testing
pnpm inspector
```

The TypeScript source lives in `src/`. Building compiles to `dist/` for publishing.

## License

ISC
