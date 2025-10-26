'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useContractWrite, useWaitForTransaction } from 'wagmi';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Badge } from '@/components/ui/Badge';
import { ethers } from 'ethers';

// Mock contract addresses - in production, these would come from config.json
const VAULT_ADDRESSES = {
  '123456789': '0x0000000000000000000000000000000000000000', // Monad
  '1': '0x0000000000000000000000000000000000000000', // Ethereum
  '137': '0x0000000000000000000000000000000000000000', // Polygon
  '42161': '0x0000000000000000000000000000000000000000', // Arbitrum
  '56': '0x0000000000000000000000000000000000000000', // BSC
};

const CHAIN_NAMES: { [key: string]: string } = {
  '123456789': 'Monad',
  '1': 'Ethereum',
  '137': 'Polygon',
  '42161': 'Arbitrum',
  '56': 'BSC'
};

const CHAIN_OPTIONS = [
  { value: '123456789', label: 'Monad' },
  { value: '1', label: 'Ethereum' },
  { value: '137', label: 'Polygon' },
  { value: '42161', label: 'Arbitrum' },
  { value: '56', label: 'BSC' },
];

export function CrossChainActions() {
  const { address } = useAccount();
  const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [sourceChain, setSourceChain] = useState('123456789');
  const [targetChain, setTargetChain] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Mock contract write - in production, this would use actual contract ABI
  const { write: writeContract, data: hash, isLoading: isWriting } = useContractWrite({
    address: VAULT_ADDRESSES[sourceChain as keyof typeof VAULT_ADDRESSES] as `0x${string}`,
    abi: [
      {
        name: action === 'deposit' ? 'composerDeposit' : 'composerWithdraw',
        type: 'function',
        stateMutability: 'payable',
        inputs: [
          { name: 'amount', type: 'uint256' },
          { name: 'targetChain', type: 'uint16' },
          { name: 'minShares', type: 'uint256' }
        ],
        outputs: []
      }
    ],
    functionName: action === 'deposit' ? 'composerDeposit' : 'composerWithdraw',
  });

  const { isLoading: isConfirming } = useWaitForTransaction({
    hash,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      setError('Please connect your wallet');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (sourceChain === targetChain) {
      setError('Source and target chains must be different');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      // Convert amount to wei
      const amountWei = ethers.utils.parseEther(amount);
      
      // Mock transaction - in production, this would call the actual contract
      console.log(`${action} ${amount} from ${CHAIN_NAMES[sourceChain]} to ${CHAIN_NAMES[targetChain]}`);
      
      // Simulate API call to backend
      const response = await fetch('/api/vaults/cross-chain-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          amount: amountWei.toString(),
          sourceChain,
          targetChain,
          userAddress: address,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setSuccess(`Cross-chain ${action} initiated successfully!`);
        setAmount('');
      } else {
        setError(data.error || 'Transaction failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setIsLoading(false);
    }
  };

  const isLoadingTransaction = isWriting || isConfirming || isLoading;

  return (
    <Card>
      <div className="p-6">
        <h2 className="text-xl font-semibold mb-4">Cross-Chain Actions</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Action Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Action
            </label>
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

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Amount (ETH)
            </label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="0.001"
              min="0"
              required
            />
          </div>

          {/* Source Chain */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Chain
            </label>
            <Select
              value={sourceChain}
              onChange={(e) => setSourceChain(e.target.value)}
              options={CHAIN_OPTIONS}
            />
          </div>

          {/* Target Chain */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Chain
            </label>
            <Select
              value={targetChain}
              onChange={(e) => setTargetChain(e.target.value)}
              options={CHAIN_OPTIONS.filter(option => option.value !== sourceChain)}
            />
          </div>

          {/* Transaction Summary */}
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
                <span>{amount} ETH</span>
              </div>
              <div className="flex justify-between">
                <span>From:</span>
                <span>{CHAIN_NAMES[sourceChain]}</span>
              </div>
              <div className="flex justify-between">
                <span>To:</span>
                <span>{CHAIN_NAMES[targetChain]}</span>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-800">{error}</div>
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-green-800">{success}</div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isLoadingTransaction || !address}
            className="w-full"
          >
            {isLoadingTransaction ? (
              <div className="flex items-center justify-center">
                <LoadingSpinner size="sm" className="mr-2" />
                Processing...
              </div>
            ) : (
              `${action === 'deposit' ? 'Deposit' : 'Withdraw'} ${amount || '0'} ETH`
            )}
          </Button>
        </form>

        {/* Cross-Chain Status */}
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
              <span>{Object.keys(CHAIN_NAMES).length}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
