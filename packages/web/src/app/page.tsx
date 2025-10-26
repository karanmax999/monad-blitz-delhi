'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { PortfolioOverview } from '@/components/dashboard/PortfolioOverview';
import { StrategyPerformance } from '@/components/dashboard/StrategyPerformance';
import { RiskCenter } from '@/components/dashboard/RiskCenter';
import { CrossChainActions } from '@/components/dashboard/CrossChainActions';
import { LearningHub } from '@/components/dashboard/LearningHub';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to MANI X AI
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Connect your wallet to access the cross-chain DeFi dashboard
          </p>
          <div className="space-y-4">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                className="w-full max-w-xs mx-auto block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Connect {connector.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Cross-Chain DeFi Dashboard
          </h1>
          <p className="text-gray-600">
            AI-powered vault management across multiple chains
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <PortfolioOverview />
          <StrategyPerformance />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <RiskCenter />
          <CrossChainActions />
        </div>

        <LearningHub />
      </div>
    </ErrorBoundary>
  );
}
