'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { PortfolioOverview } from '../components/dashboard/PortfolioOverview';
import { StrategyPerformance } from '../components/dashboard/StrategyPerformance';
import { RiskCenter } from '../components/dashboard/RiskCenter';
import { CrossChainActions } from '../components/dashboard/CrossChainActions';
import { LearningHub } from '../components/dashboard/LearningHub';
import { LoadingSpinner, Button, ErrorBoundary } from '../components/ui';
import { useWebSocket } from '../contexts/WebSocketContext';
import { useNotifications } from '../contexts/NotificationContext';

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { isConnected: wsConnected } = useWebSocket();
  const { notifications, unreadCount } = useNotifications();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to MANI X AI
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Connect your wallet to access the cross-chain DeFi dashboard
            </p>
          </div>
          
          <div className="space-y-4">
            {connectors.map((connector) => (
              <button
                key={connector.id}
                onClick={() => connect({ connector })}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Connect {connector.name}
              </button>
            ))}
          </div>
          
          <div className="mt-8 text-sm text-gray-500">
            <p>Supported chains: Monad, Ethereum, Polygon, Arbitrum, BSC</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                MANI X AI
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {wsConnected ? 'Live' : 'Offline'}
                </span>
              </div>
              {unreadCount > 0 && (
                <div className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                  {unreadCount}
                </div>
              )}
              <span className="text-sm text-gray-600">
                {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Not connected'}
              </span>
              <Button onClick={() => disconnect()} className="bg-red-600 hover:bg-red-700">
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Cross-Chain DeFi Dashboard
            </h1>
            <p className="text-gray-600">
              AI-powered vault management across multiple chains
            </p>
          </div>

          <ErrorBoundary>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <PortfolioOverview />
              <StrategyPerformance />
            </div>
          </ErrorBoundary>

          <ErrorBoundary>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <RiskCenter />
              <CrossChainActions />
            </div>
          </ErrorBoundary>

          <ErrorBoundary>
            <LearningHub />
          </ErrorBoundary>
        </div>
      </div>

      {/* Notification Toast */}
      {notifications.length > 0 && (
        <div className="fixed bottom-4 right-4 space-y-2 z-50">
          {notifications.slice(0, 3).map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg shadow-lg max-w-sm ${
                notification.type === 'success' ? 'bg-green-500 text-white' :
                notification.type === 'error' ? 'bg-red-500 text-white' :
                notification.type === 'warning' ? 'bg-yellow-500 text-white' :
                'bg-blue-500 text-white'
              }`}
            >
              <div className="font-medium">{notification.title}</div>
              <div className="text-sm opacity-90">{notification.message}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}