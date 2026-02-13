const API_BASE = '/api';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface CompanyInfo {
  name: string;
  description?: string;
  business?: string;
  industry?: string;
  foundingYear?: string;
  location?: string;
  teamSize?: string;
  products?: string[];
  achievements?: string[];
  values?: string[];
}

export interface GenerateResult {
  companyName: string;
  companyInfo: CompanyInfo;
  outputDir: string;
  generatedFiles: string[];
  deployTarget: string;
  githubUrl?: string;
  indexUrl?: string;
  previewUrl?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '请求失败',
      };
    }
  }

  async healthCheck(): Promise<ApiResponse<{ timestamp: string; version: string }>> {
    return this.request('/health');
  }

  async searchCompany(companyName: string): Promise<ApiResponse<{ companyName: string; results: SearchResult[] }>> {
    return this.request('/search', {
      method: 'POST',
      body: JSON.stringify({ companyName }),
    });
  }

  async generateWebsite(
    companyName: string,
    deployTarget: string = 'none'
  ): Promise<ApiResponse<GenerateResult>> {
    return this.request('/generate', {
      method: 'POST',
      body: JSON.stringify({ companyName, deployTarget }),
    });
  }
}

export const apiClient = new ApiClient();
