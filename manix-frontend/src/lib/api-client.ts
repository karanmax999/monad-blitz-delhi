import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  ApiResponse, 
  PortfolioData, 
  VaultPosition, 
  AIStrategyRecommendation, 
  RiskMetrics,
  ChainId 
} from '../types';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('API Response Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  // Vault API methods
  async getVaults(): Promise<ApiResponse<any[]>> {
    const response = await this.client.get('/api/vaults');
    return response.data;
  }

  async getVaultById(vaultId: string): Promise<ApiResponse<any>> {
    const response = await this.client.get(`/api/vaults/${vaultId}`);
    return response.data;
  }

  async getPortfolio(address: string): Promise<ApiResponse<PortfolioData>> {
    const response = await this.client.get(`/api/vaults/portfolio/${address}`);
    return response.data;
  }

  async getVaultPositions(address: string): Promise<ApiResponse<VaultPosition[]>> {
    const response = await this.client.get(`/api/vaults/positions/${address}`);
    return response.data;
  }

  async getRiskMetrics(vaultId?: string): Promise<ApiResponse<RiskMetrics>> {
    const url = vaultId ? `/api/vaults/${vaultId}/risk` : '/api/vaults/risk';
    const response = await this.client.get(url);
    return response.data;
  }

  // AI API methods
  async getAIRecommendations(address: string): Promise<ApiResponse<AIStrategyRecommendation[]>> {
    const response = await this.client.get(`/api/ai/recommendations/${address}`);
    return response.data;
  }

  async generateAIRecommendation(address: string, context?: any): Promise<ApiResponse<AIStrategyRecommendation>> {
    const response = await this.client.post(`/api/ai/recommendations/${address}`, { context });
    return response.data;
  }

  async getAIPerformance(): Promise<ApiResponse<any>> {
    const response = await this.client.get('/api/ai/performance');
    return response.data;
  }

  // Cross-chain API methods
  async initiateCrossChainAction(data: {
    action: 'deposit' | 'withdraw';
    amount: string;
    sourceChain: ChainId;
    targetChain: ChainId;
    userAddress: string;
  }): Promise<ApiResponse<any>> {
    const response = await this.client.post('/api/vaults/cross-chain-action', data);
    return response.data;
  }

  async getCrossChainStatus(txHash: string): Promise<ApiResponse<any>> {
    const response = await this.client.get(`/api/vaults/cross-chain-status/${txHash}`);
    return response.data;
  }

  // Analytics API methods
  async getAnalytics(timeframe: '1d' | '7d' | '30d' | '90d' = '7d'): Promise<ApiResponse<any>> {
    const response = await this.client.get(`/api/analytics?timeframe=${timeframe}`);
    return response.data;
  }

  async getTVLHistory(timeframe: '1d' | '7d' | '30d' = '7d'): Promise<ApiResponse<any[]>> {
    const response = await this.client.get(`/api/analytics/tvl?timeframe=${timeframe}`);
    return response.data;
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: number }>> {
    const response = await this.client.get('/api/health');
    return response.data;
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Export for use in components
export default apiClient;
