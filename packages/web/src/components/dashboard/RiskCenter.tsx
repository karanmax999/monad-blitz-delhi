'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface RiskMetrics {
  vaultId: string;
  chainId: string;
  apy: number;
  volatility: number;
  maxDrawdown: number;
  sharpeRatio: number;
  var95: number;
  var99: number;
  marketCorrelation: number;
  riskScore: number;
  timestamp: string;
}

interface VaultData {
  id: string;
  address: string;
  name: string;
  symbol: string;
  riskMetrics?: RiskMetrics[];
}

const CHAIN_NAMES: { [key: string]: string } = {
  '123456789': 'Monad',
  '1': 'Ethereum',
  '137': 'Polygon',
  '42161': 'Arbitrum',
  '56': 'BSC'
};

export function RiskCenter() {
  const [vaults, setVaults] = useState<VaultData[]>([]);
  const [selectedVault, setSelectedVault] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVaults = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/vaults');
        const data = await response.json();
        
        if (data.success) {
          setVaults(data.data);
          if (data.data.length > 0) {
            setSelectedVault(data.data[0].address);
          }
        } else {
          setError(data.error || 'Failed to fetch vaults');
        }
      } catch (err) {
        setError('Network error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaults();
  }, []);

  const selectedVaultData = vaults.find(v => v.address === selectedVault);
  const latestRiskMetrics = selectedVaultData?.riskMetrics?.[0];

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 60) return 'text-orange-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getRiskScoreBadgeColor = (score: number) => {
    if (score >= 80) return 'bg-red-100 text-red-800';
    if (score >= 60) return 'bg-orange-100 text-orange-800';
    if (score >= 40) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  // Mock historical data for chart
  const historicalData = latestRiskMetrics ? [
    { date: '2024-01-01', apy: latestRiskMetrics.apy * 0.8, volatility: latestRiskMetrics.volatility * 1.2 },
    { date: '2024-01-02', apy: latestRiskMetrics.apy * 0.9, volatility: latestRiskMetrics.volatility * 1.1 },
    { date: '2024-01-03', apy: latestRiskMetrics.apy * 1.1, volatility: latestRiskMetrics.volatility * 0.9 },
    { date: '2024-01-04', apy: latestRiskMetrics.apy * 1.0, volatility: latestRiskMetrics.volatility * 1.0 },
    { date: '2024-01-05', apy: latestRiskMetrics.apy, volatility: latestRiskMetrics.volatility },
  ] : [];

  if (isLoading) {
    return (
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">Risk Center</h2>
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
          <h2 className="text-xl font-semibold mb-4">Risk Center</h2>
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
        <h2 className="text-xl font-semibold mb-4">Risk Center</h2>
        
        <div className="space-y-6">
          {/* Vault Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Vault
            </label>
            <select
              value={selectedVault || ''}
              onChange={(e) => setSelectedVault(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {vaults.map((vault) => (
                <option key={vault.address} value={vault.address}>
                  {vault.name} ({vault.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Risk Score */}
          {latestRiskMetrics && (
            <div className="text-center">
              <div className={`text-4xl font-bold mb-2 ${getRiskScoreColor(latestRiskMetrics.riskScore)}`}>
                {latestRiskMetrics.riskScore}
              </div>
              <Badge className={getRiskScoreBadgeColor(latestRiskMetrics.riskScore)}>
                Risk Score
              </Badge>
            </div>
          )}

          {/* Risk Metrics Grid */}
          {latestRiskMetrics && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {latestRiskMetrics.apy.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-600">APY</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {latestRiskMetrics.volatility.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-600">Volatility</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {latestRiskMetrics.maxDrawdown.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-600">Max Drawdown</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {latestRiskMetrics.sharpeRatio.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Sharpe Ratio</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {latestRiskMetrics.var95.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-600">VaR (95%)</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {latestRiskMetrics.marketCorrelation.toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">Market Correlation</div>
              </div>
            </div>
          )}

          {/* Historical Chart */}
          {historicalData.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">Risk Trends</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={historicalData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="apy" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="APY (%)"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="volatility" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      name="Volatility (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Risk Alerts */}
          {latestRiskMetrics && latestRiskMetrics.riskScore >= 70 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
                <div className="text-red-800 font-medium">
                  High Risk Alert
                </div>
              </div>
              <div className="text-red-700 text-sm mt-1">
                This vault has a high risk score. Consider diversifying your portfolio.
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
