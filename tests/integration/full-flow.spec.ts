import { test, expect } from '@playwright/test';
import { ethers } from 'ethers';

test.describe('MANI X AI Full Integration Flow', () => {
  const API_BASE_URL = 'http://localhost:3001';
  const FRONTEND_URL = 'http://localhost:3000';

  test('should complete full cross-chain deposit flow', async ({ page, request }) => {
    // Step 1: Mock wallet connection
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

    // Step 2: Navigate to frontend
    await page.goto(FRONTEND_URL);
    await expect(page.getByText('Cross-Chain DeFi Dashboard')).toBeVisible();

    // Step 3: Mock initial portfolio data
    await page.route('**/api/vaults/portfolio/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalBalance: '1000000',
            chainBalances: {
              '123456789': '500000', // Monad
              '1': '300000',        // Ethereum
              '137': '200000'       // Polygon
            },
            pendingTransactions: [],
            crossChainActivity: {}
          }
        })
      });
    });

    // Step 4: Verify portfolio display
    await expect(page.getByText('$1,000,000')).toBeVisible();
    await expect(page.getByText('Monad')).toBeVisible();
    await expect(page.getByText('Ethereum')).toBeVisible();
    await expect(page.getByText('Polygon')).toBeVisible();

    // Step 5: Initiate cross-chain deposit
    await page.getByRole('button', { name: 'Deposit' }).click();
    await page.getByLabel('Amount (ETH)').fill('1.0');
    await page.getByLabel('Source Chain').selectOption('123456789'); // Monad
    await page.getByLabel('Target Chain').selectOption('1'); // Ethereum

    // Step 6: Mock cross-chain action API
    await page.route('**/api/vaults/cross-chain-action', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Cross-chain deposit initiated successfully!',
          transactionId: '0x1234567890abcdef1234567890abcdef12345678'
        })
      });
    });

    // Step 7: Submit deposit
    await page.getByRole('button', { name: /deposit 1.0 eth/i }).click();
    await expect(page.getByText('Cross-chain deposit initiated successfully!')).toBeVisible();

    // Step 8: Simulate LayerZero event processing
    const depositEvent = {
      type: 'CrossChainDepositInitiated',
      chainId: '123456789',
      blockNumber: 12345,
      transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
      data: {
        transactionId: '0x1234567890abcdef1234567890abcdef12345678',
        user: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        amount: ethers.utils.parseEther('1.0'),
        targetChain: 1,
        targetVault: '0x1234567890123456789012345678901234567890',
        sourceChain: '123456789'
      }
    };

    // Step 9: Verify backend processes the event
    const eventResponse = await request.post(`${API_BASE_URL}/api/vaults/process-event`, {
      data: depositEvent
    });
    expect(eventResponse.status()).toBe(200);

    // Step 10: Check that TVL is updated
    const tvlResponse = await request.get(`${API_BASE_URL}/api/vaults/multi-chain/tvl`);
    expect(tvlResponse.status()).toBe(200);
    const tvlData = await tvlResponse.json();
    expect(tvlData.success).toBe(true);

    // Step 11: Generate AI recommendation
    await page.getByRole('button', { name: 'Generate Recommendation' }).click();

    // Step 12: Mock AI recommendation
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
            reasoning: 'Based on your recent cross-chain deposit and current market conditions, rebalancing your portfolio would optimize returns.',
            timestamp: new Date().toISOString(),
            status: 'GENERATED'
          }
        })
      });
    });

    // Step 13: Verify AI recommendation appears
    await expect(page.getByText('REBALANCE')).toBeVisible();
    await expect(page.getByText('85%')).toBeVisible();

    // Step 14: Check risk metrics update
    const riskResponse = await request.get(`${API_BASE_URL}/api/vaults/0x1234567890123456789012345678901234567890/risk-metrics?chainId=1`);
    expect(riskResponse.status()).toBe(200);
    const riskData = await riskResponse.json();
    expect(riskData.success).toBe(true);

    // Step 15: Verify WebSocket notification
    await page.addInitScript(() => {
      // Mock WebSocket notification
      const event = new CustomEvent('notification', {
        detail: {
          type: 'CROSS_CHAIN_UPDATE',
          message: 'Cross-chain deposit completed: 1.0 ETH from Monad to Ethereum',
          data: {
            transactionId: '0x1234567890abcdef1234567890abcdef12345678',
            amount: '1000000000000000000',
            sourceChain: '123456789',
            targetChain: '1'
          }
        }
      });
      window.dispatchEvent(event);
    });

    // Step 16: Verify notification appears
    await expect(page.getByText('Cross-chain deposit completed')).toBeVisible();
  });

  test('should complete AI-driven rebalancing flow', async ({ page, request }) => {
    // Step 1: Setup wallet connection
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

    await page.goto(FRONTEND_URL);

    // Step 2: Mock portfolio with imbalanced allocation
    await page.route('**/api/vaults/portfolio/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            totalBalance: '2000000',
            chainBalances: {
              '1': '1500000',       // 75% Ethereum (overweight)
              '137': '300000',      // 15% Polygon
              '42161': '200000'     // 10% Arbitrum
            },
            pendingTransactions: [],
            crossChainActivity: {}
          }
        })
      });
    });

    // Step 3: Generate AI recommendation for rebalancing
    await page.getByRole('button', { name: 'Generate Recommendation' }).click();

    // Step 4: Mock AI recommendation for rebalancing
    await page.route('**/api/ai/recommendation', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            userId: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
            action: 'REBALANCE',
            confidence: 92,
            expectedReturn: 15.2,
            reasoning: 'Your portfolio is heavily weighted towards Ethereum (75%). Rebalancing to 50% Ethereum, 30% Polygon, and 20% Arbitrum would improve diversification and reduce risk.',
            timestamp: new Date().toISOString(),
            status: 'GENERATED'
          }
        })
      });
    });

    // Step 5: Verify high-confidence recommendation
    await expect(page.getByText('REBALANCE')).toBeVisible();
    await expect(page.getByText('92%')).toBeVisible();

    // Step 6: Execute rebalancing via cross-chain withdrawals
    await page.getByRole('button', { name: 'Withdraw' }).click();
    await page.getByLabel('Amount (ETH)').fill('0.5');
    await page.getByLabel('Source Chain').selectOption('1'); // Ethereum
    await page.getByLabel('Target Chain').selectOption('137'); // Polygon

    // Step 7: Mock rebalancing transaction
    await page.route('**/api/vaults/cross-chain-action', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'AI-driven rebalancing transaction initiated!',
          transactionId: '0xabcdef1234567890abcdef1234567890abcdef12'
        })
      });
    });

    await page.getByRole('button', { name: /withdraw 0.5 eth/i }).click();
    await expect(page.getByText('AI-driven rebalancing transaction initiated!')).toBeVisible();

    // Step 8: Verify AI performance metrics update
    const performanceResponse = await request.get(`${API_BASE_URL}/api/ai/performance`);
    expect(performanceResponse.status()).toBe(200);
    const performanceData = await performanceResponse.json();
    expect(performanceData.success).toBe(true);
    expect(performanceData.data.totalRecommendations).toBeGreaterThan(0);

    // Step 9: Check risk metrics improvement
    const riskResponse = await request.get(`${API_BASE_URL}/api/vaults/0x1234567890123456789012345678901234567890/risk-metrics?chainId=1`);
    expect(riskResponse.status()).toBe(200);
    const riskData = await riskResponse.json();
    expect(riskData.success).toBe(true);
    expect(riskData.data.riskScore).toBeLessThan(80); // Should be lower risk after rebalancing
  });

  test('should handle multi-chain risk monitoring', async ({ page, request }) => {
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

    await page.goto(FRONTEND_URL);

    // Step 1: Mock vaults with different risk profiles
    await page.route('**/api/vaults', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'vault-1',
              address: '0x1234567890123456789012345678901234567890',
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
            },
            {
              id: 'vault-2',
              address: '0x2345678901234567890123456789012345678901',
              name: 'MANI X AI Spoke Vault',
              symbol: 'MANIXSPOKE',
              riskMetrics: [
                {
                  vaultId: 'vault-2',
                  chainId: '137',
                  apy: 18.2,
                  volatility: 12.5,
                  maxDrawdown: 22.1,
                  sharpeRatio: 1.4,
                  var95: 8.3,
                  var99: 12.7,
                  marketCorrelation: 0.85,
                  riskScore: 78,
                  timestamp: '2024-01-01T00:00:00Z'
                }
              ]
            }
          ]
        })
      });
    });

    // Step 2: Verify risk center displays both vaults
    await expect(page.getByText('Risk Center')).toBeVisible();
    await expect(page.getByText('MANI X AI Hub Vault')).toBeVisible();

    // Step 3: Switch to high-risk vault
    await page.getByLabel('Select Vault').selectOption('0x2345678901234567890123456789012345678901');
    await expect(page.getByText('78')).toBeVisible(); // High risk score

    // Step 4: Verify risk alert appears
    await expect(page.getByText('High Risk Alert')).toBeVisible();
    await expect(page.getByText('This vault has a high risk score')).toBeVisible();

    // Step 5: Trigger risk recalculation
    const riskResponse = await request.post(`${API_BASE_URL}/api/vaults/0x2345678901234567890123456789012345678901/calculate-risk`, {
      data: { chainId: '137' }
    });
    expect(riskResponse.status()).toBe(200);

    // Step 6: Verify risk metrics are updated
    const updatedRiskResponse = await request.get(`${API_BASE_URL}/api/vaults/0x2345678901234567890123456789012345678901/risk-metrics?chainId=137`);
    expect(updatedRiskResponse.status()).toBe(200);
    const updatedRiskData = await updatedRiskResponse.json();
    expect(updatedRiskData.success).toBe(true);
  });

  test('should handle WebSocket real-time updates', async ({ page }) => {
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

    await page.goto(FRONTEND_URL);

    // Step 1: Mock WebSocket connection
    await page.addInitScript(() => {
      const mockSocket = {
        on: (event: string, callback: Function) => {
          if (event === 'connect') {
            setTimeout(() => callback(), 100);
          }
        },
        emit: () => {},
        disconnect: () => {}
      };
      window.io = () => mockSocket;
    });

    // Step 2: Simulate real-time vault update
    await page.evaluate(() => {
      const event = new CustomEvent('vault-update', {
        detail: {
          vaultId: '0x1234567890123456789012345678901234567890',
          tvl: {
            totalValueLocked: '1500000',
            totalDeposits: '1200000',
            totalWithdrawals: '200000',
            activeUsers: 175,
            lastUpdated: new Date().toISOString()
          },
          riskMetrics: {
            apy: 14.2,
            volatility: 7.8,
            maxDrawdown: 12.1,
            sharpeRatio: 2.1,
            riskScore: 58
          }
        }
      });
      window.dispatchEvent(event);
    });

    // Step 3: Verify UI updates reflect new data
    await expect(page.getByText('$1,500,000')).toBeVisible();

    // Step 4: Simulate AI recommendation notification
    await page.evaluate(() => {
      const event = new CustomEvent('notification', {
        detail: {
          type: 'AI_RECOMMENDATION',
          message: 'New AI recommendation: DIVERSIFY (88% confidence)',
          data: {
            action: 'DIVERSIFY',
            confidence: 88,
            expectedReturn: 16.5,
            reasoning: 'Market volatility suggests diversification would reduce risk while maintaining returns.'
          }
        }
      });
      window.dispatchEvent(event);
    });

    // Step 5: Verify notification appears
    await expect(page.getByText('New AI recommendation: DIVERSIFY')).toBeVisible();
  });
});
