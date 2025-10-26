import { test, expect } from '@playwright/test';

test.describe('MANI X AI Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Mock wallet connection
    await page.addInitScript(() => {
      window.ethereum = {
        isMetaMask: true,
        request: async ({ method, params }: any) => {
          if (method === 'eth_requestAccounts') {
            return ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'];
          }
          if (method === 'eth_accounts') {
            return ['0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'];
          }
          if (method === 'eth_chainId') {
            return '0x1';
          }
          return null;
        },
      };
    });

    await page.goto('http://localhost:3000');
  });

  test('should display wallet connection prompt when not connected', async ({ page }) => {
    // Mock no wallet connection
    await page.addInitScript(() => {
      window.ethereum = undefined;
    });

    await page.goto('http://localhost:3000');

    await expect(page.getByText('Welcome to MANI X AI')).toBeVisible();
    await expect(page.getByText('Connect your wallet to access the cross-chain DeFi dashboard')).toBeVisible();
    await expect(page.getByRole('button', { name: /connect/i })).toBeVisible();
  });

  test('should display dashboard when wallet is connected', async ({ page }) => {
    await expect(page.getByText('Cross-Chain DeFi Dashboard')).toBeVisible();
    await expect(page.getByText('AI-powered vault management across multiple chains')).toBeVisible();
  });

  test('should display portfolio overview', async ({ page }) => {
    // Mock API response
    await page.route('**/api/vaults/portfolio/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalBalance: '1000000',
            chainBalances: {
              '1': '500000',
              '137': '300000',
              '42161': '200000'
            },
            pendingTransactions: [],
            crossChainActivity: {}
          }
        })
      });
    });

    await expect(page.getByText('Portfolio Overview')).toBeVisible();
    await expect(page.getByText('$1,000,000')).toBeVisible();
    await expect(page.getByText('Total Value Locked')).toBeVisible();
  });

  test('should display AI strategy performance', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/ai/recommendations/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'rec-1',
              action: 'REBALANCE',
              confidence: 85,
              expectedReturn: 12.5,
              reasoning: 'Based on current market conditions...',
              status: 'EXECUTED',
              timestamp: '2024-01-01T00:00:00Z'
            }
          ]
        })
      });
    });

    await page.route('**/api/ai/performance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalRecommendations: 150,
            executedRecommendations: 120,
            averageConfidence: 82.5,
            successRate: 80.0
          }
        })
      });
    });

    await expect(page.getByText('AI Strategy Performance')).toBeVisible();
    await expect(page.getByText('150')).toBeVisible();
    await expect(page.getByText('80.0%')).toBeVisible();
    await expect(page.getByText('Generate Recommendation')).toBeVisible();
  });

  test('should display risk center', async ({ page }) => {
    // Mock API response
    await page.route('**/api/vaults', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'vault-1',
              address: '0x123...',
              name: 'MANI X AI Hub Vault',
              symbol: 'MANIXHUB',
              riskMetrics: [
                {
                  vaultId: 'vault-1',
                  chainId: '1',
                  apy: 12.5,
                  volatility: 8.2,
                  maxDrawdown: 15.3,
                  sharpeRatio: 1.8,
                  var95: 5.2,
                  var99: 8.7,
                  marketCorrelation: 0.75,
                  riskScore: 65,
                  timestamp: '2024-01-01T00:00:00Z'
                }
              ]
            }
          ]
        })
      });
    });

    await expect(page.getByText('Risk Center')).toBeVisible();
    await expect(page.getByText('65')).toBeVisible();
    await expect(page.getByText('Risk Score')).toBeVisible();
  });

  test('should handle cross-chain deposit', async ({ page }) => {
    // Mock API response
    await page.route('**/api/vaults/cross-chain-action', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Cross-chain deposit initiated successfully!'
        })
      });
    });

    // Fill deposit form
    await page.getByRole('button', { name: 'Deposit' }).click();
    await page.getByLabel('Amount (ETH)').fill('1.0');
    await page.getByLabel('Source Chain').selectOption('123456789');
    await page.getByLabel('Target Chain').selectOption('1');

    // Submit form
    await page.getByRole('button', { name: /deposit 1.0 eth/i }).click();

    // Check success message
    await expect(page.getByText('Cross-chain deposit initiated successfully!')).toBeVisible();
  });

  test('should handle cross-chain withdrawal', async ({ page }) => {
    // Mock API response
    await page.route('**/api/vaults/cross-chain-action', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Cross-chain withdrawal initiated successfully!'
        })
      });
    });

    // Fill withdrawal form
    await page.getByRole('button', { name: 'Withdraw' }).click();
    await page.getByLabel('Amount (ETH)').fill('0.5');
    await page.getByLabel('Source Chain').selectOption('1');
    await page.getByLabel('Target Chain').selectOption('137');

    // Submit form
    await page.getByRole('button', { name: /withdraw 0.5 eth/i }).click();

    // Check success message
    await expect(page.getByText('Cross-chain withdrawal initiated successfully!')).toBeVisible();
  });

  test('should generate AI recommendation', async ({ page }) => {
    // Mock API responses
    await page.route('**/api/ai/recommendation', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            userId: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            action: 'REBALANCE',
            confidence: 85,
            expectedReturn: 12.5,
            reasoning: 'Based on current market conditions and your portfolio composition...',
            timestamp: new Date().toISOString(),
            status: 'GENERATED'
          }
        })
      });
    });

    await page.route('**/api/ai/recommendations/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'rec-1',
              action: 'REBALANCE',
              confidence: 85,
              expectedReturn: 12.5,
              reasoning: 'Based on current market conditions...',
              status: 'GENERATED',
              timestamp: new Date().toISOString()
            }
          ]
        })
      });
    });

    // Click generate recommendation button
    await page.getByRole('button', { name: 'Generate Recommendation' }).click();

    // Check that new recommendation appears
    await expect(page.getByText('REBALANCE')).toBeVisible();
    await expect(page.getByText('85%')).toBeVisible();
  });

  test('should display learning hub', async ({ page }) => {
    await expect(page.getByText('Learning Hub')).toBeVisible();
    // Add more specific tests for learning hub content
  });

  test('should handle WebSocket notifications', async ({ page }) => {
    // Mock WebSocket connection
    await page.addInitScript(() => {
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class MockWebSocket extends originalWebSocket {
        constructor(url: string) {
          super(url);
          // Simulate connection
          setTimeout(() => {
            this.dispatchEvent(new Event('open'));
          }, 100);
        }
      };
    });

    // Check that WebSocket connection is established
    await expect(page.getByText('Cross-Chain DeFi Dashboard')).toBeVisible();
  });

  test('should handle error states', async ({ page }) => {
    // Mock API error
    await page.route('**/api/vaults', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });

    // Check error handling
    await expect(page.getByText('Failed to fetch vaults')).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await expect(page.getByText('Cross-Chain DeFi Dashboard')).toBeVisible();
    
    // Check that mobile layout is working
    const portfolioCard = page.getByText('Portfolio Overview').locator('..');
    await expect(portfolioCard).toBeVisible();
  });
});
