# MCP Integration Servers

A collection of Model Context Protocol (MCP) servers for integrating with various IT service management and remote monitoring platforms.

## Available MCP Servers

### 🛠️ NinjaOne RMM MCP Server
**Package:** `@adamhancock/ninjarmm-mcp`  
**Version:** 0.1.11

MCP server for NinjaOne RMM API integration, providing comprehensive device management, monitoring, and automation capabilities.

**Features:**
- Device management and monitoring
- Organization and location management
- Alert handling and resolution
- Software inventory tracking
- Policy and job management
- Custom field operations
- Script execution on devices

[View Package →](./packages/ninjarmm-mcp)

---

### 🎫 HaloPSA MCP Server
**Package:** `@adamhancock/halopsa-mcp`  
**Version:** 0.1.1

MCP server for HaloPSA API integration, enabling ticket management and reporting capabilities.

**Features:**
- SQL-based reporting queries
- Ticket (FAULTS) management
- User and site management
- Actions and request type handling
- Database schema exploration
- API endpoint discovery

[View Package →](./packages/halopsa-mcp)

---

### 🔧 ConnectWise RMM MCP Server
**Package:** `@adamhancock/connectwisermm-mcp`  
**Version:** 0.1.0

MCP server for ConnectWise RMM API integration, providing remote monitoring and management capabilities.

**Features:**
- Company and site management
- Device monitoring and management
- Service ticket operations
- API schema exploration
- Flexible API endpoint access

[View Package →](./packages/connectwisermm-mcp)

---

### 📊 ConnectWise PSA MCP Server
**Package:** `@adamhancock/connectwisepsa-mcp`  
**Version:** 0.1.1

MCP server for ConnectWise PSA API integration, enabling professional services automation workflows.

**Features:**
- Company and contact management
- Service ticket management
- Project and finance operations
- API endpoint discovery
- Advanced query capabilities
- Schema exploration tools

[View Package →](./packages/connectwisepsa-mcp)

## Installation

Each MCP server can be installed independently using npm or pnpm:

```bash
# Install a specific MCP server
npm install @adamhancock/ninjarmm-mcp
npm install @adamhancock/halopsa-mcp
npm install @adamhancock/connectwisermm-mcp
npm install @adamhancock/connectwisepsa-mcp
```

## Configuration

Each MCP server requires specific environment variables for authentication. Create a `.env` file in the package directory:

### NinjaOne RMM
```env
NINJA_API_URL=https://api.ninjarmm.com
NINJA_CLIENT_ID=your_client_id
NINJA_CLIENT_SECRET=your_client_secret
```

### HaloPSA
```env
HALOPSA_API_URL=https://your-instance.halopsa.com
HALOPSA_CLIENT_ID=your_client_id
HALOPSA_CLIENT_SECRET=your_client_secret
```

### ConnectWise RMM
```env
CONNECTWISE_API_URL=https://your-region.myconnectwise.net
CONNECTWISE_API_KEY=your_api_key
```

### ConnectWise PSA
```env
CONNECTWISE_PSA_URL=https://api-na.myconnectwise.net
CONNECTWISE_CLIENT_ID=your_client_id
CONNECTWISE_PUBLIC_KEY=your_public_key
CONNECTWISE_PRIVATE_KEY=your_private_key
```

## Development

This monorepo uses pnpm for package management. To set up the development environment:

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm -r build

# Run development mode for a specific package
cd packages/[package-name]
pnpm dev

# Run the MCP inspector for debugging
pnpm inspector
```

## MCP Inspector

Each package includes an MCP inspector script for testing and debugging:

```bash
cd packages/[package-name]
pnpm inspector
```

This will start the MCP inspector UI where you can test the server's tools and functionality.

## Architecture

All MCP servers in this repository follow a consistent architecture:

- **TypeScript-based** implementation for type safety
- **MCP SDK** integration for standardized protocol support
- **Tool-based API** exposing platform capabilities as MCP tools
- **Environment-based configuration** for secure credential management
- **Schema discovery tools** for exploring available API endpoints

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

Each package may have its own license. Please check the individual package directories for specific license information:

- NinjaOne RMM MCP: MIT
- HaloPSA MCP: ISC
- ConnectWise RMM MCP: ISC
- ConnectWise PSA MCP: ISC

## Author

Adam Hancock

## Support

For issues or questions about specific MCP servers, please open an issue in this repository with the appropriate package label.