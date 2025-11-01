'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';

// Simple UI Components
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, className = "", disabled = false }: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 ${className}`}
  >
    {children}
  </button>
);

const LoadingSpinner = () => (
  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
);

const Badge = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
    {children}
  </span>
);

// Dashboard Components
const PortfolioOverview = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

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

  return (
    <Card>
      <h2 className="text-xl font-semibold mb-4">Portfolio Overview</h2>
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 mb-2">
            $0.00
          </div>
          <div className="text-sm text-gray-600">Total Value Locked</div>
        </div>
        
        <div>
          <h3 className="text-lg font-medium mb-3">Chain Balances</h3>
          <div className="space-y-2">
            {[
              { chain: 'Monad', balance: '$0.00' },
              { chain: 'Ethereum', balance: '$0.00' },
              { chain: 'Polygon', balance: '$0.00' },
              { chain: 'Arbitrum', balance: '$0.00' },
              { chain: 'BSC', balance: '$0.00' }
            ].map((item) => (
              <div key={item.chain} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="font-medium">{item.chain}</span>
                <span className="font-semibold">{item.balance}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
};

const StrategyPerformance = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

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

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">AI Strategy Performance</h2>
        <Button onClick={() => alert('Generating AI recommendation...')} className="text-sm py-1 px-3">
          Generate Recommendation
        </Button>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-600">Total Recommendations</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">0%</div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">0%</div>
            <div className="text-sm text-gray-600">Avg Confidence</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">0</div>
            <div className="text-sm text-gray-600">Executed</div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-3">Recent Recommendations</h3>
          <div className="text-center py-8 text-gray-500">
            No recommendations yet. Generate your first AI recommendation!
          </div>
        </div>
      </div>
    </Card>
  );
};

const RiskCenter = () => {
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

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

  return (
    <Card>
      <h2 className="text-xl font-semibold mb-4">Risk Center</h2>
      
      <div className="space-y-6">
        <div className="text-center">
          <div className="text-4xl font-bold text-green-600 mb-2">25</div>
          <Badge className="bg-green-100 text-green-800">Low Risk</Badge>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">8.5%</div>
            <div className="text-sm text-gray-600">APY</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">12.3%</div>
            <div className="text-sm text-gray-600">Volatility</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">-5.2%</div>
            <div className="text-sm text-gray-600">Max Drawdown</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">1.8</div>
            <div className="text-sm text-gray-600">Sharpe Ratio</div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const CrossChainActions = () => {
  const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [sourceChain, setSourceChain] = useState('123456789');
  const [targetChain, setTargetChain] = useState('1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`${action} ${amount} ETH from ${sourceChain} to ${targetChain}`);
  };

  return (
    <Card>
      <h2 className="text-xl font-semibold mb-4">Cross-Chain Actions</h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setAction('deposit')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                action === 'deposit'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Deposit
            </button>
            <button
              type="button"
              onClick={() => setAction('withdraw')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                action === 'withdraw'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Withdraw
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount (ETH)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            step="0.001"
            min="0"
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Source Chain</label>
          <select
            value={sourceChain}
            onChange={(e) => setSourceChain(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="123456789">Monad</option>
            <option value="1">Ethereum</option>
            <option value="137">Polygon</option>
            <option value="42161">Arbitrum</option>
            <option value="56">BSC</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Target Chain</label>
          <select
            value={targetChain}
            onChange={(e) => setTargetChain(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1">Ethereum</option>
            <option value="137">Polygon</option>
            <option value="42161">Arbitrum</option>
            <option value="56">BSC</option>
            <option value="123456789">Monad</option>
          </select>
        </div>

        <div className="p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-2">Transaction Summary</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Action:</span>
              <Badge className={action === 'deposit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {action.toUpperCase()}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Amount:</span>
              <span>{amount || '0'} ETH</span>
            </div>
            <div className="flex justify-between">
              <span>From:</span>
              <span>{sourceChain === '123456789' ? 'Monad' : sourceChain === '1' ? 'Ethereum' : sourceChain === '137' ? 'Polygon' : sourceChain === '42161' ? 'Arbitrum' : 'BSC'}</span>
            </div>
            <div className="flex justify-between">
              <span>To:</span>
              <span>{targetChain === '123456789' ? 'Monad' : targetChain === '1' ? 'Ethereum' : targetChain === '137' ? 'Polygon' : targetChain === '42161' ? 'Arbitrum' : 'BSC'}</span>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full">
          {action === 'deposit' ? 'Deposit' : 'Withdraw'} {amount || '0'} ETH
        </Button>
      </form>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Cross-Chain Status</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex justify-between">
            <span>LayerZero Integration:</span>
            <Badge className="bg-green-100 text-green-800">Active</Badge>
          </div>
          <div className="flex justify-between">
            <span>DVN Validation:</span>
            <Badge className="bg-green-100 text-green-800">Enabled</Badge>
          </div>
          <div className="flex justify-between">
            <span>Supported Chains:</span>
            <span>5</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const LearningHub = () => (
  <Card>
    <h2 className="text-xl font-semibold mb-4">Learning Hub</h2>
    <div className="text-center py-8 text-gray-500">
      <div className="text-4xl mb-4">🎓</div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
      <p className="text-gray-600">Educational content and simulation features are under development.</p>
    </div>
  </Card>
);

export default function HomePage() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
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
      </div>
    </div>
  );
}
