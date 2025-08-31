import { Buffer } from 'node:buffer';

export interface ConnectWisePSAConfig {
  apiUrl: string;
  companyId: string;
  publicKey: string;
  privateKey: string;
  clientId?: string;
}

export interface ApiEndpoint {
  path: string;
  method: string;
  summary?: string;
  description?: string;
  parameters?: any[];
  requestBody?: any;
  responses?: any;
  tags?: string[];
}

export interface SchemaDefinition {
  type?: string;
  properties?: Record<string, any>;
  required?: string[];
  description?: string;
  items?: any;
  enum?: string[];
  format?: string;
  example?: any;
}

interface ApiCallOptions {
  method?: string;
  path: string;
  queryParams?: Record<string, any>;
  body?: any;
}

export class ConnectWisePSAClient {
  private config: ConnectWisePSAConfig;
  private baseUrl: string;
  private authHeader: string;
  private swaggerSpec: any = null;

  constructor(config: ConnectWisePSAConfig) {
    this.config = config;
    // Ensure base URL ends with /v4_6_release/apis/3.0
    let baseUrl = config.apiUrl.replace(/\/$/, '');
    if (!baseUrl.includes('/v4_6_release/apis/3.0')) {
      baseUrl = `${baseUrl}/v4_6_release/apis/3.0`;
    }
    this.baseUrl = baseUrl;
    
    // Create basic auth header
    const auth = Buffer.from(`${config.companyId}+${config.publicKey}:${config.privateKey}`).toString('base64');
    this.authHeader = `Basic ${auth}`;
  }

  async loadSwaggerSpec(): Promise<void> {
    if (this.swaggerSpec) {
      return;
    }

    try {
      // Load from the local All.json file
      const fs = await import('node:fs').then(m => m.promises);
      const path = await import('node:path');
      const url = await import('node:url');
      const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
      const swaggerPath = path.join(__dirname, 'All.json');
      
      const swaggerContent = await fs.readFile(swaggerPath, 'utf-8');
      this.swaggerSpec = JSON.parse(swaggerContent);
      console.error('Loaded ConnectWise PSA API spec from local file');
    } catch (error) {
      console.error('Error loading swagger spec:', error);
      // Initialize with basic structure if loading fails
      this.swaggerSpec = {
        paths: {},
        components: { schemas: {} }
      };
    }
  }

  async listApiEndpoints(options: {
    category?: string;
    skip?: number;
    limit?: number;
  } = {}): Promise<ApiEndpoint[]> {
    await this.loadSwaggerSpec();
    
    const { category, skip = 0, limit = 100 } = options;
    const endpoints: ApiEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(this.swaggerSpec.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          const op = operation as any;
          
          // Filter by category if specified
          if (category && op.tags && !op.tags.includes(category)) {
            continue;
          }

          endpoints.push({
            path,
            method: method.toUpperCase(),
            summary: op.summary,
            description: op.description,
            tags: op.tags || [],
            parameters: op.parameters,
            requestBody: op.requestBody,
            responses: op.responses
          });
        }
      }
    }

    // Apply pagination
    return endpoints.slice(skip, skip + limit);
  }

  async getApiEndpointDetails(options: {
    pathPattern: string;
    maxEndpoints?: number;
    includeSchemas?: boolean;
    includeExamples?: boolean;
    summaryOnly?: boolean;
  }): Promise<ApiEndpoint[]> {
    await this.loadSwaggerSpec();
    
    const { 
      pathPattern, 
      maxEndpoints = 10,
      includeSchemas = true,
      includeExamples = false,
      summaryOnly = false
    } = options;

    const pattern = pathPattern.toLowerCase();
    const matchingEndpoints: ApiEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(this.swaggerSpec.paths || {})) {
      if (matchingEndpoints.length >= maxEndpoints) break;

      // Check if path matches pattern
      if (!path.toLowerCase().includes(pattern)) {
        continue;
      }

      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (matchingEndpoints.length >= maxEndpoints) break;
        
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          const op = operation as any;
          
          const endpoint: ApiEndpoint = {
            path,
            method: method.toUpperCase(),
            summary: op.summary,
            description: op.description,
            tags: op.tags || []
          };

          if (!summaryOnly) {
            if (includeSchemas) {
              endpoint.parameters = op.parameters;
              endpoint.requestBody = op.requestBody;
              endpoint.responses = op.responses;
            }
            
            if (!includeSchemas && !includeExamples) {
              // Include minimal info
              endpoint.parameters = op.parameters?.map((p: any) => ({
                name: p.name,
                in: p.in,
                required: p.required,
                description: p.description
              }));
            }
          }

          matchingEndpoints.push(endpoint);
        }
      }
    }

    return matchingEndpoints;
  }

  async getApiSchemas(options: {
    schemaPattern?: string;
    skip?: number;
    limit?: number;
    listNames?: boolean;
  } = {}): Promise<{ schemas: Record<string, SchemaDefinition>, totalCount: number, names?: string[] }> {
    await this.loadSwaggerSpec();
    
    const { schemaPattern, skip = 0, limit = 50, listNames = false } = options;
    const allSchemas = this.swaggerSpec.components?.schemas || {};
    
    let filteredSchemas: Record<string, SchemaDefinition> = {};
    let schemaNames: string[] = [];

    for (const [name, schema] of Object.entries(allSchemas)) {
      if (schemaPattern && !name.toLowerCase().includes(schemaPattern.toLowerCase())) {
        continue;
      }
      schemaNames.push(name);
    }

    // Sort names for consistent pagination
    schemaNames.sort();
    
    // Apply pagination
    const paginatedNames = schemaNames.slice(skip, skip + limit);
    
    for (const name of paginatedNames) {
      filteredSchemas[name] = allSchemas[name];
    }

    const result: any = {
      schemas: filteredSchemas,
      totalCount: schemaNames.length
    };

    // Include names list if requested or if there are many matches
    if (listNames || schemaNames.length <= 20) {
      result.names = schemaNames;
    }

    return result;
  }

  async searchApiEndpoints(query: string, options: {
    skip?: number;
    limit?: number;
  } = {}): Promise<ApiEndpoint[]> {
    await this.loadSwaggerSpec();
    
    const { skip = 0, limit = 50 } = options;
    const searchTerm = query.toLowerCase();
    const matchingEndpoints: ApiEndpoint[] = [];

    for (const [path, pathItem] of Object.entries(this.swaggerSpec.paths || {})) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          const op = operation as any;
          
          // Search in path, summary, description, and tags
          const searchableText = [
            path,
            op.summary || '',
            op.description || '',
            ...(op.tags || [])
          ].join(' ').toLowerCase();

          if (searchableText.includes(searchTerm)) {
            matchingEndpoints.push({
              path,
              method: method.toUpperCase(),
              summary: op.summary,
              description: op.description,
              tags: op.tags || []
            });
          }
        }
      }
    }

    // Apply pagination
    return matchingEndpoints.slice(skip, skip + limit);
  }

  async makeApiCall(options: ApiCallOptions): Promise<any> {
    const { method = 'GET', path, queryParams, body } = options;
    
    // Build query string
    const queryString = queryParams 
      ? '?' + new URLSearchParams(queryParams).toString()
      : '';

    const url = `${this.baseUrl}${path}${queryString}`;
    
    const headers: Record<string, string> = {
      'Authorization': this.authHeader,
      'Accept': 'application/json'
    };

    if (this.config.clientId) {
      headers['clientId'] = this.config.clientId;
    }

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const fetchOptions: RequestInit = {
        method: method.toUpperCase(),
        headers
      };
      
      if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
        fetchOptions.body = JSON.stringify(body);
      }
      
      const response = await fetch(url, fetchOptions);

      const responseText = await response.text();
      
      if (!response.ok) {
        throw new Error(`API call failed: ${response.status} ${response.statusText}\n${responseText}`);
      }

      // Try to parse as JSON, return text if it fails
      try {
        return JSON.parse(responseText);
      } catch {
        return responseText;
      }
    } catch (error) {
      console.error('API call error:', error);
      throw error;
    }
  }

  async getSchemaOverview(): Promise<any> {
    await this.loadSwaggerSpec();
    
    const paths = this.swaggerSpec.paths || {};
    const schemas = this.swaggerSpec.components?.schemas || {};
    
    // Count endpoints by method
    const methodCounts: Record<string, number> = {};
    const tagCounts: Record<string, number> = {};
    const pathCategories: Record<string, string[]> = {};
    
    for (const [path, pathItem] of Object.entries(paths)) {
      for (const [method, operation] of Object.entries(pathItem as any)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          const op = operation as any;
          
          // Count methods
          methodCounts[method.toUpperCase()] = (methodCounts[method.toUpperCase()] || 0) + 1;
          
          // Count tags
          for (const tag of (op.tags || [])) {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            
            // Group paths by tag
            if (!pathCategories[tag]) {
              pathCategories[tag] = [];
            }
            if (!pathCategories[tag].includes(path)) {
              pathCategories[tag].push(path);
            }
          }
        }
      }
    }

    return {
      info: this.swaggerSpec.info || {},
      servers: this.swaggerSpec.servers || [],
      totalPaths: Object.keys(paths).length,
      totalSchemas: Object.keys(schemas).length,
      methodCounts,
      tagCounts,
      topTags: Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count, samplePaths: pathCategories[tag]?.slice(0, 3) || [] })),
      sampleEndpoints: Object.entries(paths)
        .slice(0, 5)
        .map(([path, pathItem]) => {
          const methods = pathItem ? Object.keys(pathItem as any)
            .filter(m => ['get', 'post', 'put', 'patch', 'delete'].includes(m.toLowerCase()))
            .map(m => m.toUpperCase()) : [];
          return { path, methods };
        })
    };
  }
}