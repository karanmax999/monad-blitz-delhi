import { test, expect } from '@playwright/test';

test.describe('MANI X AI Backend API', () => {
  const API_BASE_URL = 'http://localhost:3001';

  test.describe('Health Check', () => {
    test('should return health status', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/health`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.status).toBe('healthy');
      expect(data.services).toBeDefined();
    });
  });

  test.describe('Vault Management', () => {
    test('should get all vaults', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/vaults`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should get specific vault', async ({ request }) => {
      const vaultId = '0x1234567890123456789012345678901234567890';
      
      const response = await request.get(`${API_BASE_URL}/api/vaults/${vaultId}`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    test('should get vault TVL', async ({ request }) => {
      const vaultId = '0x1234567890123456789012345678901234567890';
      
      const response = await request.get(`${API_BASE_URL}/api/vaults/${vaultId}/tvl`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.totalValueLocked).toBeDefined();
    });

    test('should get multi-chain TVL', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/vaults/multi-chain/tvl`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.totalTVL).toBeDefined();
      expect(data.data.chainTVL).toBeDefined();
    });
  });

  test.describe('AI Strategy', () => {
    test('should generate AI recommendation', async ({ request }) => {
      const userId = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      const response = await request.post(`${API_BASE_URL}/api/ai/recommendation`, {
        data: { userId }
      });
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.action).toBeDefined();
      expect(data.data.confidence).toBeDefined();
    });

    test('should get user recommendations', async ({ request }) => {
      const userId = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6';
      
      const response = await request.get(`${API_BASE_URL}/api/ai/recommendations/${userId}`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should get AI performance metrics', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/ai/performance`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.totalRecommendations).toBeDefined();
      expect(data.data.successRate).toBeDefined();
    });

    test('should process AI action', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/ai/action`, {
        data: {
          userId: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
          action: 'REBALANCE',
          confidence: 85,
          expectedReturn: 12.5
        }
      });
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Risk Analytics', () => {
    test('should get vault risk metrics', async ({ request }) => {
      const vaultId = '0x1234567890123456789012345678901234567890';
      const chainId = '1';
      
      const response = await request.get(`${API_BASE_URL}/api/vaults/${vaultId}/risk-metrics?chainId=${chainId}`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeDefined();
    });

    test('should calculate risk metrics', async ({ request }) => {
      const vaultId = '0x1234567890123456789012345678901234567890';
      const chainId = '1';
      
      const response = await request.post(`${API_BASE_URL}/api/vaults/${vaultId}/calculate-risk`, {
        data: { chainId }
      });
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.riskScore).toBeDefined();
    });
  });

  test.describe('Cross-Chain Actions', () => {
    test('should handle cross-chain deposit', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/vaults/cross-chain-action`, {
        data: {
          action: 'deposit',
          amount: '1000000000000000000', // 1 ETH in wei
          sourceChain: '123456789',
          targetChain: '1',
          userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
        }
      });
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    test('should handle cross-chain withdrawal', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/vaults/cross-chain-action`, {
        data: {
          action: 'withdraw',
          amount: '500000000000000000', // 0.5 ETH in wei
          sourceChain: '1',
          targetChain: '137',
          userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
        }
      });
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle invalid vault ID', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/vaults/invalid-id`);
      expect(response.status()).toBe(404);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    test('should handle missing required fields', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/ai/recommendation`, {
        data: {} // Missing userId
      });
      expect(response.status()).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    test('should handle server errors gracefully', async ({ request }) => {
      // This test would require mocking a server error
      const response = await request.get(`${API_BASE_URL}/api/vaults/nonexistent`);
      expect(response.status()).toBe(404);
    });
  });

  test.describe('Rate Limiting', () => {
    test('should respect rate limits', async ({ request }) => {
      const requests = Array(20).fill(null).map(() => 
        request.get(`${API_BASE_URL}/api/vaults`)
      );
      
      const responses = await Promise.all(requests);
      
      // Check that some requests are rate limited
      const rateLimitedResponses = responses.filter(r => r.status() === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  test.describe('CORS', () => {
    test('should allow CORS requests', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/vaults`, {
        headers: {
          'Origin': 'http://localhost:3000'
        }
      });
      
      expect(response.status()).toBe(200);
      expect(response.headers()['access-control-allow-origin']).toBeDefined();
    });
  });
});
