export interface BackupRadarConfig {
  baseUrl: string;
  apiKey: string;
  apiKeyHeader?: string;
  timeoutMs?: number;
  userAgent?: string;
}

type QueryValue = string | number | boolean | Date | undefined | null;
export type QueryParams = Record<string, QueryValue | QueryValue[]>;

export class BackupRadarClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly apiKeyHeader: string;
  private readonly timeoutMs: number;
  private readonly userAgent?: string;

  constructor(config: BackupRadarConfig) {
    if (!config.baseUrl) {
      throw new Error('BackupRadar baseUrl is required');
    }
    if (!config.apiKey) {
      throw new Error('BackupRadar apiKey is required');
    }

    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.apiKeyHeader = config.apiKeyHeader || 'ApiKey';
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.userAgent = config.userAgent;
  }

  async listBackups(params?: QueryParams) {
    return this.request('GET', '/backups', { query: params });
  }

  async getBackup(backupId: string | number, params?: QueryParams) {
    return this.request('GET', `/backups/${backupId}`, { query: params });
  }

  async getBackupResults(backupId: string | number, params?: QueryParams) {
    return this.request('GET', `/backups/${backupId}/results`, { query: params });
  }

  private buildUrl(path: string, query?: QueryParams): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${normalizedPath}`);

    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null) {
          return;
        }

        if (Array.isArray(value)) {
          value.forEach((entry) => {
            if (entry !== undefined && entry !== null) {
              url.searchParams.append(key, this.stringify(entry));
            }
          });
        } else {
          url.searchParams.append(key, this.stringify(value));
        }
      });
    }

    return url.toString();
  }

  private stringify(value: QueryValue): string {
    if (value === undefined || value === null) {
      return '';
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    return String(value);
  }

  private async request<T>(
    method: string,
    path: string,
    options: {
      query?: QueryParams;
      body?: unknown;
      headers?: Record<string, string>;
    } = {}
  ): Promise<T> {
    const url = this.buildUrl(path, options.query);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const headers: Record<string, string> = {
        Accept: 'application/json',
        [this.apiKeyHeader]: this.apiKey,
        ...(this.userAgent ? { 'User-Agent': this.userAgent } : {}),
        ...options.headers,
      };

      if (options.body !== undefined && options.body !== null) {
        headers['Content-Type'] = 'application/json';
      }

      const response = await fetch(url, {
        method,
        signal: controller.signal,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        throw new Error(
          `BackupRadar API error: ${response.status} ${response.statusText}${
            errorBody ? ` - ${errorBody}` : ''
          }`
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return (await response.json()) as T;
      }

      const text = await response.text();
      return text as unknown as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`BackupRadar request timed out after ${this.timeoutMs} ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}
