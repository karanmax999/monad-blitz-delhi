'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useNotifications } from '../../contexts/NotificationContext';
import { AIStrategyRecommendation } from '../../types';
import { Card, Button, LoadingSpinner, Badge } from '../ui';

export function StrategyPerformance() {
  const { address } = useAccount();
  const { addNotification } = useNotifications();
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: recommendations, isLoading, error } = useQuery({
    queryKey: ['ai-recommendations', address],
    queryFn: () => apiClient.getAIRecommendations(address!),
    enabled: !!address,
    refetchInterval: 60000, // Refetch every minute
  });

  const { data: performance } = useQuery({
    queryKey: ['ai-performance'],
    queryFn: () => apiClient.getAIPerformance(),
    refetchInterval: 300000, // Refetch every 5 minutes
  });

  const generateRecommendationMutation = useMutation({
    mutationFn: () => apiClient.generateAIRecommendation(address!),
    onSuccess: (response) => {
      addNotification({
        type: 'success',
        title: 'AI Recommendation Generated',
        message: `New recommendation with ${response.data.confidence}% confidence`,
      });
      queryClient.invalidateQueries({ queryKey: ['ai-recommendations', address] });
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Generation Failed',
        message: 'Failed to generate AI recommendation',
      });
    },
  });

  const handleGenerateRecommendation = async () => {
    setIsGenerating(true);
    try {
      await generateRecommendationMutation.mutateAsync();
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <h2 className="text-xl font-semibold mb-4">AI Strategy Performance</h2>
        <div className="flex items-center justify-center h-32">
          <LoadingSpinner />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <h2 className="text-xl font-semibold mb-4">AI Strategy Performance</h2>
        <div className="text-center py-8">
          <div className="text-red-500 mb-4">Failed to load AI data</div>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const recommendationsData = recommendations?.data || [];
  const performanceData = performance?.data || {
    totalRecommendations: 0,
    successRate: 0,
    avgConfidence: 0,
    executed: 0,
  };

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">AI Strategy Performance</h2>
        <Button 
          onClick={handleGenerateRecommendation} 
          disabled={isGenerating || !address}
          className="text-sm py-1 px-3"
        >
          {isGenerating ? 'Generating...' : 'Generate Recommendation'}
        </Button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{performanceData.totalRecommendations}</div>
            <div className="text-sm text-gray-600">Total Recommendations</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{performanceData.successRate}%</div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{performanceData.avgConfidence}%</div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{performanceData.executed}</div>
            <div className="text-sm text-gray-600">Executed</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">Recent Recommendations</h3>
          {recommendationsData.length > 0 ? (
            <div className="space-y-3">
              {recommendationsData.slice(0, 3).map((recommendation: AIStrategyRecommendation) => (
                <div key={recommendation.strategyId} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <Badge className={
                      recommendation.action === 'enter' ? 'bg-green-100 text-green-800' :
                      recommendation.action === 'exit' ? 'bg-red-100 text-red-800' :
                      recommendation.action === 'rebalance' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {recommendation.action.toUpperCase()}
                    </Badge>
                    <div className="text-sm font-medium">
                      {recommendation.confidence}% confidence
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {recommendation.reasoning}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Expected Return: {recommendation.expectedOutcome.return}%</span>
                    <span>Risk: {recommendation.expectedOutcome.risk}/10</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No recommendations yet. Generate your first AI recommendation!
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
