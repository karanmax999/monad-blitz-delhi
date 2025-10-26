'use client';

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface AIRecommendation {
  id: string;
  action: string;
  confidence: number;
  expectedReturn: number;
  reasoning: string;
  status: string;
  timestamp: string;
}

interface AIPerformanceMetrics {
  totalRecommendations: number;
  executedRecommendations: number;
  averageConfidence: number;
  successRate: number;
}

export function StrategyPerformance() {
  const { address } = useAccount();
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<AIPerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch user recommendations
        const recResponse = await fetch(`/api/ai/recommendations/${address}`);
        const recData = await recResponse.json();
        
        // Fetch performance metrics
        const perfResponse = await fetch('/api/ai/performance');
        const perfData = await perfResponse.json();
        
        if (recData.success) {
          setRecommendations(recData.data);
        }
        
        if (perfData.success) {
          setPerformanceMetrics(perfData.data);
        }
        
      } catch (err) {
        setError('Network error');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [address]);

  const handleGenerateRecommendation = async () => {
    try {
      const response = await fetch('/api/ai/recommendation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: address }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Refresh recommendations
        const recResponse = await fetch(`/api/ai/recommendations/${address}`);
        const recData = await recResponse.json();
        
        if (recData.success) {
          setRecommendations(recData.data);
        }
      }
    } catch (err) {
      console.error('Error generating recommendation:', err);
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'REBALANCE':
        return 'bg-blue-100 text-blue-800';
      case 'INCREASE_RISK':
        return 'bg-red-100 text-red-800';
      case 'DECREASE_RISK':
        return 'bg-green-100 text-green-800';
      case 'DIVERSIFY':
        return 'bg-purple-100 text-purple-800';
      case 'HOLD':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EXECUTED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'FAILED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-6">
          <h2 className="text-xl font-semibold mb-4">AI Strategy Performance</h2>
          <div className="flex items-center justify-center h-32">
            <LoadingSpinner />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">AI Strategy Performance</h2>
          <Button onClick={handleGenerateRecommendation} size="sm">
            Generate Recommendation
          </Button>
        </div>

        <div className="space-y-6">
          {/* Performance Metrics */}
          {performanceMetrics && (
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {performanceMetrics.totalRecommendations}
                </div>
                <div className="text-sm text-gray-600">Total Recommendations</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {performanceMetrics.successRate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {performanceMetrics.averageConfidence.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Avg Confidence</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">
                  {performanceMetrics.executedRecommendations}
                </div>
                <div className="text-sm text-gray-600">Executed</div>
              </div>
            </div>
          )}

          {/* Recent Recommendations */}
          <div>
            <h3 className="text-lg font-medium mb-3">Recent Recommendations</h3>
            <div className="space-y-3">
              {recommendations.slice(0, 5).map((rec) => (
                <div key={rec.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Badge className={getActionColor(rec.action)}>
                        {rec.action}
                      </Badge>
                      <Badge className={getStatusColor(rec.status)}>
                        {rec.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(rec.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm">
                      <span className="font-medium">Confidence:</span> {rec.confidence}%
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Expected Return:</span> {rec.expectedReturn}%
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {rec.reasoning}
                  </div>
                </div>
              ))}
              
              {recommendations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No recommendations yet. Generate your first AI recommendation!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
