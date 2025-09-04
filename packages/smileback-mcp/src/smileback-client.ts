interface SmileBackAuthConfig {
  username: string;
  password: string;
  clientId: string;
  clientSecret: string;
  baseUrl?: string;
  scope?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
}

export class SmileBackClient {
  private authConfig: SmileBackAuthConfig;
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;
  private baseUrl: string;

  constructor(config: SmileBackAuthConfig) {
    this.authConfig = config;
    this.baseUrl = config.baseUrl || 'https://app.smileback.io';
  }

  private async ensureAuthenticated(): Promise<void> {
    if (this.accessToken && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return;
    }
    await this.authenticate();
  }

  private async authenticate(): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'password',
          username: this.authConfig.username,
          password: this.authConfig.password,
          client_id: this.authConfig.clientId,
          client_secret: this.authConfig.clientSecret,
          scope: this.authConfig.scope || 'read read_recent'
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      const data: TokenResponse = await response.json();
      this.accessToken = data.access_token;
      const expiryTime = new Date();
      expiryTime.setSeconds(expiryTime.getSeconds() + data.expires_in - 60);
      this.tokenExpiry = expiryTime;
    } catch (error) {
      throw new Error('Failed to authenticate with SmileBack API');
    }
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    await this.ensureAuthenticated();
    
    const url = `${this.baseUrl}/api/v3${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.accessToken}`,
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  // Reviews
  async getReviews(params?: Record<string, string>) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reviews/${queryString ? '?' + queryString : ''}`);
  }

  async getRecentReviews(params?: Record<string, string>) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/reviews/recent/${queryString ? '?' + queryString : ''}`);
  }

  async getReview(id: string | number) {
    return this.request(`/reviews/${id}/`);
  }

  // NPS Responses
  async getNpsResponses(params?: Record<string, string>) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/nps-responses/${queryString ? '?' + queryString : ''}`);
  }

  // NPS Campaigns
  async getNpsCampaigns(params?: Record<string, string>) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/nps-campaigns/${queryString ? '?' + queryString : ''}`);
  }

  // CSAT Agents
  async getCsatAgents(params?: Record<string, string>) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/csat-agents/${queryString ? '?' + queryString : ''}`);
  }

  // CSAT Boards
  async getCsatBoards(params?: Record<string, string>) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/csat-boards/${queryString ? '?' + queryString : ''}`);
  }

  // CSAT Companies
  async getCsatCompanies(params?: Record<string, string>) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/csat-companies/${queryString ? '?' + queryString : ''}`);
  }

  // CSAT Contacts
  async getCsatContacts(params?: Record<string, string>) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/csat-contacts/${queryString ? '?' + queryString : ''}`);
  }

  // PRJ Responses
  async getPrjResponses(params?: Record<string, string>) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/prj-responses/${queryString ? '?' + queryString : ''}`);
  }

  // PRJ Surveys
  async getPrjSurveys(params?: Record<string, string>) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
    }
    const queryString = queryParams.toString();
    return this.request(`/prj-surveys/${queryString ? '?' + queryString : ''}`);
  }

  // Generic API call method
  async makeApiCall(path: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' = 'GET', body?: any, queryParams?: Record<string, string>) {
    let url = path;
    
    // Add query parameters if provided
    if (queryParams && Object.keys(queryParams).length > 0) {
      const params = new URLSearchParams();
      Object.entries(queryParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value);
        }
      });
      const paramString = params.toString();
      if (paramString) {
        url += (path.includes('?') ? '&' : '?') + paramString;
      }
    }

    const options: RequestInit = { method };
    
    if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      if (typeof body === 'object') {
        options.body = JSON.stringify(body);
      } else {
        options.body = body;
      }
    }

    return this.request(url, options);
  }

  // Get API schema overview
  async getApiSchemaOverview() {
    try {
      const response = await fetch('https://app.smileback.io/api/docs/?format=openapi');
      if (!response.ok) {
        throw new Error(`Failed to fetch API schema: ${response.status} ${response.statusText}`);
      }
      const schema = await response.json();

      // Group paths by category and extract basic info
      const pathGroups: Record<string, string[]> = {};
      const allPaths: { path: string; methods: string[]; summary?: string }[] = [];

      if (schema.paths) {
        Object.entries(schema.paths).forEach(([path, pathObj]: [string, any]) => {
          const methods: string[] = [];
          let summary = '';

          if (pathObj && typeof pathObj === 'object') {
            Object.entries(pathObj).forEach(([method, methodObj]: [string, any]) => {
              methods.push(method.toUpperCase());
              if (!summary && methodObj?.summary) {
                summary = methodObj.summary;
              }
            });
          }

          allPaths.push({ path, methods, summary });

          // Categorize by path pattern
          const category = this.categorizeApiPath(path);
          if (!pathGroups[category]) {
            pathGroups[category] = [];
          }
          pathGroups[category].push(path);
        });
      }

      return {
        info: schema.info,
        servers: schema.servers,
        totalPaths: allPaths.length,
        pathGroups,
        allPaths: allPaths.slice(0, 100), // Limit to first 100 for overview
        message: "Use smileback_get_api_endpoint_details with a specific path to get full endpoint information"
      };
    } catch (error) {
      throw new Error('Failed to fetch SmileBack API schema overview');
    }
  }

  // Get detailed information for specific API endpoints
  async getApiEndpointDetails(
    pathPattern: string, 
    summaryOnly: boolean = false,
    includeSchemas: boolean = true,
    maxEndpoints: number = 10,
    includeExamples: boolean = false
  ) {
    try {
      const response = await fetch('https://app.smileback.io/api/docs/?format=openapi');
      if (!response.ok) {
        throw new Error(`Failed to fetch API schema: ${response.status} ${response.statusText}`);
      }
      const schema = await response.json();

      const matchingPaths: any = {};
      const pathEntries = Object.entries(schema.paths || {});
      let matchCount = 0;
      
      // Find matching paths and limit results
      for (const [path, pathObj] of pathEntries) {
        if (matchCount >= Math.min(maxEndpoints, 50)) break; // Cap at 50 max
        
        if (path.toLowerCase().includes(pathPattern.toLowerCase())) {
          if (summaryOnly) {
            // Return only basic info for summary mode
            const methods: string[] = [];
            let summary = '';
            
            if (pathObj && typeof pathObj === 'object') {
              Object.entries(pathObj).forEach(([method, methodObj]: [string, any]) => {
                methods.push(method.toUpperCase());
                if (!summary && methodObj?.summary) {
                  summary = methodObj.summary;
                }
              });
            }
            
            matchingPaths[path] = { methods, summary };
          } else {
            // Filter the path object based on options
            const filteredPathObj: any = {};
            
            if (pathObj && typeof pathObj === 'object') {
              Object.entries(pathObj).forEach(([method, methodObj]: [string, any]) => {
                const filteredMethodObj: any = {
                  summary: methodObj?.summary,
                  operationId: methodObj?.operationId,
                  tags: methodObj?.tags
                };
                
                if (includeSchemas) {
                  filteredMethodObj.parameters = methodObj?.parameters;
                  filteredMethodObj.requestBody = methodObj?.requestBody;
                  filteredMethodObj.responses = methodObj?.responses;
                }
                
                if (includeExamples && methodObj?.examples) {
                  filteredMethodObj.examples = methodObj.examples;
                }
                
                filteredPathObj[method] = filteredMethodObj;
              });
            }
            
            matchingPaths[path] = filteredPathObj;
          }
          matchCount++;
        }
      }

      const result: any = {
        pathPattern,
        matchingPaths,
        matchCount,
        totalMatches: pathEntries.filter(([path]) => 
          path.toLowerCase().includes(pathPattern.toLowerCase())
        ).length,
        limited: matchCount >= Math.min(maxEndpoints, 50)
      };

      // Only include components if schemas are requested and not in summary mode
      if (includeSchemas && !summaryOnly && matchCount > 0) {
        // Include only referenced components to reduce size
        result.components = {
          schemas: schema.definitions ? 
            Object.fromEntries(
              Object.entries(schema.definitions).slice(0, 20)
            ) : undefined
        };
      }

      return result;
    } catch (error) {
      throw new Error('Failed to fetch SmileBack API endpoint details');
    }
  }

  private categorizeApiPath(path: string): string {
    if (path.includes('/reviews')) return 'Reviews Management';
    if (path.includes('/nps-')) return 'NPS Management';
    if (path.includes('/csat-')) return 'CSAT Management';
    if (path.includes('/prj-')) return 'Project Management';
    return 'Other';
  }
}