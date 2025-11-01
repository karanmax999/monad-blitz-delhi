'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { PortfolioData, ChainBalance, VaultPosition } from '@/types';
import { Card, Button, LoadingSpinner, Badge } from '@/components/ui';

export function PortfolioOverview() {
  const { address } = useAccount();
  const { isConnected } = useWebSocket();
  const { addNotification } = useNotifications();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: portfolio, isLoading, error, refetch } = useQuery({
    queryKey: ['portfolio', address],
    queryFn: () => apiClient.getPortfolio(address!),
    enabled: !!address,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      addNotification({
        type: 'success',
        title: 'Portfolio Updated',
        message: 'Your portfolio data has been refreshed',
        read: false
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Failed to refresh portfolio data',
        read: false
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <h2 className="text-xl font-semibold mb-4">Portfolio Overview</h2>
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <h2 className="text-xl font-semibold mb-4">Portfolio Overview</h2>
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">Failed to load portfolio data</div>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Refreshing...' : 'Retry'}
          </Button>
        </div>
      </Card>
    );
  }

  const portfolioData = portfolio?.data || {
    totalValueUSD: '0.00',
    chainBalances: [],
    vaultPositions: [],
    pendingTransactions: [],
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Portfolio Overview</h2>
        <div className="flex items-center space-x-2">
          <Badge className={isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
          <Button onClick={handleRefresh} disabled={isRefreshing} className="text-sm py-1 px-3">
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            ${portfolioData.totalValueUSD}
          </div>
          <div className="text-sm text-gray-600">Total Value Locked</div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">Chain Balances</h3>
          <div className="space-y-2">
            {portfolioData.chainBalances.length > 0 ? (
              portfolioData.chainBalances.map((balance: ChainBalance) => (
                <div key={balance.chainId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className="font-medium">{balance.chainName}</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {balance.vaultCount} vaults
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{balance.balanceUSD}</div>
                    <div className="text-sm text-gray-500">{balance.balance}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-4 text-gray-500">
                No balances found. Connect your wallet to see your portfolio.
              </div>
            )}
          </div>
        </div>

        {portfolioData.pendingTransactions.length > 0 && (
          <div>
            <h3 className="text-lg font-medium mb-3">Pending Transactions</h3>
            <div className="space-y-2">
              {portfolioData.pendingTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div>
                    <span className="font-medium capitalize">{tx.type}</span>
                    <div className="text-sm text-gray-600">{tx.amount} ETH</div>
                  </div>
                  <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
