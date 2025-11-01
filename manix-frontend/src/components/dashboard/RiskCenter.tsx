'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { RiskMetrics } from '../../types';
import { Card, LoadingSpinner, Badge } from '../ui';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export function RiskCenter() {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('7d');

  const { data: riskMetrics, isLoading, error } = useQuery({
    queryKey: ['risk-metrics', selectedTimeframe],
    queryFn: () => apiClient.getRiskMetrics(),
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: tvlHistory } = useQuery({
    queryKey: ['tvl-history', selectedTimeframe],
    queryFn: () => apiClient.getTVLHistory(selectedTimeframe),
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  if (isLoading) {
    return (
      <Card>
        <h2 className="text-xl font-semibold mb-4">Risk Center</h2>
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <h2 className="text-xl font-semibold mb-4">Risk Center</h2>
        <div className="text-center py-8 text-red-500">
          Failed to load risk metrics
        </div>
      </Card>
    );
  }

  const metrics: RiskMetrics = riskMetrics?.data || {
    apy: 8.5,
    volatility: 12.3,
    maxDrawdown: -5.2,
    sharpeRatio: 1.8,
    var: 2.1,
    marketCorrelation: 0.65,
    riskScore: 25,
    riskLevel: 'low',
  };

  const getRiskBadgeColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const chartData = tvlHistory?.data || [
    { date: '2024-01-01', tvl: 1000000, apy: 8.5 },
    { date: '2024-01-02', tvl: 1050000, apy: 8.7 },
    { date: '2024-01-03', tvl: 1020000, apy: 8.3 },
    { date: '2024-01-04', tvl: 1080000, apy: 8.9 },
    { date: '2024-01-05', tvl: 1100000, apy: 9.1 },
    { date: '2024-01-06', tvl: 1070000, apy: 8.8 },
    { date: '2024-01-07', tvl: 1120000, apy: 9.2 },
  ];

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Risk Center</h2>
        <div className="flex space-x-2">
          {(['7d', '30d', '90d'] as const).map((timeframe) => (
            <button
              key={timeframe}
              onClick={() => setSelectedTimeframe(timeframe)}
              className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                selectedTimeframe === timeframe
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {timeframe}
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-gray-900 mb-2">{metrics.riskScore}</div>
          <Badge className={getRiskBadgeColor(metrics.riskLevel)}>
            {metrics.riskLevel.toUpperCase()} RISK
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{metrics.apy}%</div>
            <div className="text-sm text-gray-600">APY</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{metrics.volatility}%</div>
            <div className="text-sm text-gray-600">Volatility</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{metrics.maxDrawdown}%</div>
            <div className="text-sm text-gray-600">Max Drawdown</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{metrics.sharpeRatio}</div>
            <div className="text-sm text-gray-600">Sharpe Ratio</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{metrics.var}%</div>
            <div className="text-sm text-gray-600">VaR (95%)</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{Math.round(metrics.marketCorrelation * 100)}%</div>
            <div className="text-sm text-gray-600">Market Correlation</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">TVL & APY Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="tvl" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  name="TVL ($)"
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="apy" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="APY (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {metrics.riskLevel === 'high' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="font-medium text-red-900 mb-2">Risk Alert</h4>
            <p className="text-sm text-red-800">
              High risk detected. Consider reducing position size or implementing risk management strategies.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
