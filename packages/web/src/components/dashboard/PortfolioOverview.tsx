'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ChainBadge } from '@/components/ui/ChainBadge';
import { formatEther } from 'ethers/lib/utils';

interface PortfolioData {
  totalBalance: string;
  chainBalances: { [chainId: string]: string };
  pendingTransactions: any[];
  crossChainActivity: any;
}

const CHAIN_NAMES: { [key: string]: string } = {
  '123456789': 'Monad',
  '1': 'Ethereum',
  '137': 'Polygon',
  '42161': 'Arbitrum',
  '56': 'BSC'
};

export function PortfolioOverview() {
  const { address } = useAccount();
  const [portfolioData, setPortfolioData] = useState<PortfolioData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const fetchPortfolioData = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/vaults/portfolio/${address}`);
        const data = await response.json();
        
        if (data.success) {
          setPortfolioData(data.data);
        } else {
          setError(data.error || 'Failed to fetch portfolio data');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolioData();
  }, [address]);

  if (isLoading) {
    return (
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Portfolio Overview</h2>
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Portfolio Overview</h2>
          <div className="text-red-600 text-center">
            {error}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Portfolio Overview</h2>
        
        <div className="space-y-6">
          {/* Total Balance */}
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              ${parseFloat(portfolioData?.totalBalance || '0').toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total Value Locked</div>
          </div>

          {/* Chain Balances */}
          <div>
            <h3 className="text-lg font-medium mb-3">Chain Balances</h3>
            <div className="space-y-2">
              {Object.entries(portfolioData?.chainBalances || {}).map(([chainId, balance]) => (
                <div key={chainId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <ChainBadge chainId={chainId} />
                    <span className="font-medium">{CHAIN_NAMES[chainId] || `Chain ${chainId}`}</span>
                  </div>
                  <span className="font-semibold">
                    ${parseFloat(balance).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Transactions */}
          {portfolioData?.pendingTransactions && portfolioData.pendingTransactions.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Pending Transactions</h3>
              <div className="space-y-2">
                {portfolioData.pendingTransactions.slice(0, 3).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${
                        tx.type === 'DEPOSIT' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="text-sm font-medium">{tx.type}</span>
                    </div>
                    <span className="text-sm text-gray-600">
                      ${parseFloat(tx.amount).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cross-Chain Activity */}
          {portfolioData?.crossChainActivity && Object.keys(portfolioData.crossChainActivity).length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Cross-Chain Activity</h3>
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(portfolioData.crossChainActivity).map(([key, value]) => (
                  <div key={key} className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-lg font-semibold text-blue-600">
                      {typeof value === 'number' ? value : 'N/A'}
                    </div>
                    <div className="text-sm text-blue-800 capitalize">
                      {key.replace(/_/g, ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
