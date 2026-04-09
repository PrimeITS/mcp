interface HuntressConfig {
  apiKey: string;
  apiSecret: string;
  baseUrl?: string;
}

interface PaginatedResponse<T> {
  data: T;
  pagination?: {
    next_page_url?: string;
    next_page_token?: string;
  };
}

export class HuntressClient {
  private apiKey: string;
  private apiSecret: string;
  private baseUrl: string;
  private authHeader: string;

  constructor(config: HuntressConfig) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.baseUrl || 'https://api.huntress.io';

    // Create Basic Auth header (Base64 encode apiKey:apiSecret)
    const credentials = `${this.apiKey}:${this.apiSecret}`;
    this.authHeader = `Basic ${Buffer.from(credentials).toString('base64')}`;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.authHeader,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Huntress API error (${response.status}): ${errorText}`
      );
    }

    return response.json();
  }

  // Account endpoints
  async getAccount(): Promise<any> {
    return this.request('/v1/account');
  }

  async getActor(): Promise<any> {
    return this.request('/v1/actor');
  }

  // Agents endpoints
  async listAgents(params?: {
    limit?: number;
    page_token?: string;
    organization_id?: number;
    platform?: 'windows' | 'darwin' | 'linux';
  }): Promise<PaginatedResponse<any>> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.page_token) query.append('page_token', params.page_token);
    if (params?.organization_id) query.append('organization_id', params.organization_id.toString());
    if (params?.platform) query.append('platform', params.platform);

    const endpoint = `/v1/agents${query.toString() ? '?' + query.toString() : ''}`;
    return this.request(endpoint);
  }

  async getAgent(id: string): Promise<any> {
    return this.request(`/v1/agents/${id}`);
  }

  // Organizations endpoints
  async listOrganizations(params?: {
    limit?: number;
    page_token?: string;
  }): Promise<PaginatedResponse<any>> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.page_token) query.append('page_token', params.page_token);

    const endpoint = `/v1/organizations${query.toString() ? '?' + query.toString() : ''}`;
    return this.request(endpoint);
  }

  async getOrganization(id: string): Promise<any> {
    return this.request(`/v1/organizations/${id}`);
  }

  // Incident Reports endpoints
  async listIncidentReports(params?: {
    limit?: number;
    page_token?: string;
    organization_id?: number;
  }): Promise<PaginatedResponse<any>> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.page_token) query.append('page_token', params.page_token);
    if (params?.organization_id) query.append('organization_id', params.organization_id.toString());

    const endpoint = `/v1/incident_reports${query.toString() ? '?' + query.toString() : ''}`;
    return this.request(endpoint);
  }

  async getIncidentReport(id: string): Promise<any> {
    return this.request(`/v1/incident_reports/${id}`);
  }

  // Summary Reports endpoints
  async listReports(params?: {
    limit?: number;
    page_token?: string;
    organization_id?: number;
  }): Promise<PaginatedResponse<any>> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.page_token) query.append('page_token', params.page_token);
    if (params?.organization_id) query.append('organization_id', params.organization_id.toString());

    const endpoint = `/v1/reports${query.toString() ? '?' + query.toString() : ''}`;
    return this.request(endpoint);
  }

  async getReport(id: string): Promise<any> {
    return this.request(`/v1/reports/${id}`);
  }

  // Billing Reports endpoints
  async listBillingReports(params?: {
    limit?: number;
    page_token?: string;
  }): Promise<PaginatedResponse<any>> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.page_token) query.append('page_token', params.page_token);

    const endpoint = `/v1/billing_reports${query.toString() ? '?' + query.toString() : ''}`;
    return this.request(endpoint);
  }

  async getBillingReport(id: string): Promise<any> {
    return this.request(`/v1/billing_reports/${id}`);
  }

  // Signals endpoints
  async listSignals(params?: {
    limit?: number;
    page_token?: string;
    organization_id?: number;
  }): Promise<PaginatedResponse<any>> {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.page_token) query.append('page_token', params.page_token);
    if (params?.organization_id) query.append('organization_id', params.organization_id.toString());

    const endpoint = `/v1/signals${query.toString() ? '?' + query.toString() : ''}`;
    return this.request(endpoint);
  }

  async getSignal(id: string): Promise<any> {
    return this.request(`/v1/signals/${id}`);
  }
}
