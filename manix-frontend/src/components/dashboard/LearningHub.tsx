'use client';

import React from 'react';
import { Card } from '../ui';

export function LearningHub() {
  return (
    <Card>
      <h2 className="text-xl font-semibold mb-4">Learning Hub</h2>
      <div className="text-center py-8 text-gray-500">
        <div className="text-4xl mb-4">🎓</div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
        <p className="text-gray-600 mb-4">
          Educational content and simulation features are under development.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-2">📚</div>
            <h4 className="font-medium text-gray-900">DeFi Education</h4>
            <p className="text-sm text-gray-600">Learn about yield farming, liquidity provision, and risk management</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-2">🎮</div>
            <h4 className="font-medium text-gray-900">Simulation Mode</h4>
            <p className="text-sm text-gray-600">Practice strategies with virtual funds before investing real money</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl mb-2">🏆</div>
            <h4 className="font-medium text-gray-900">Achievements</h4>
            <p className="text-sm text-gray-600">Earn XP and NFTs for learning milestones and successful strategies</p>
          </div>
        </div>
      </div>
    </Card>
  );
}
