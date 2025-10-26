export enum AIModel {
  GEMINI_PRO = 'gemini_pro',
  GEMINI_PRO_VISION = 'gemini_pro_vision',
  LOCAL_MODEL = 'local_model',
}

export interface AIRequest {
  id: string;
  model: AIModel;
  prompt: string;
  context?: Record<string, any>;
  userId: string;
  timestamp: number;
}

export interface AIResponse {
  requestId: string;
  content: string;
  confidence: number;
  reasoning?: string;
  metadata: {
    model: AIModel;
    tokensUsed: number;
    processingTime: number;
    timestamp: number;
  };
}

export interface MarketAnalysis {
  id: string;
  timestamp: number;
  chainId: string;
  analysis: {
    marketTrend: 'bullish' | 'bearish' | 'neutral';
    volatilityIndex: number;
    liquidityScore: number;
    riskFactors: string[];
    opportunities: string[];
  };
  recommendations: AIStrategyRecommendation[];
}

export interface AIStrategyRecommendation {
  strategyId: string;
  action: 'enter' | 'exit' | 'hold' | 'rebalance';
  confidence: number;
  reasoning: string;
  expectedOutcome: {
    return: number;
    timeframe: string;
    risk: number;
  };
}
