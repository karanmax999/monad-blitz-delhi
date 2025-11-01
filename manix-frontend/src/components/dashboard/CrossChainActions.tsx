'use client';

import React, { useState } from 'react';
import { useAccount } from 'wagmi';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '../../lib/api-client';
import { useNotifications } from '../../contexts/NotificationContext';
import { ChainId } from '../../types';
import { Card, Button, Input, Select, LoadingSpinner, Badge } from '../ui';

export function CrossChainActions() {
  const { address } = useAccount();
  const { addNotification } = useNotifications();
  const [action, setAction] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState('');
  const [sourceChain, setSourceChain] = useState<ChainId>(ChainId.MONAD);
  const [targetChain, setTargetChain] = useState<ChainId>(ChainId.ETHEREUM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const chainOptions = [
    { value: ChainId.MONAD.toString(), label: 'Monad' },
    { value: ChainId.ETHEREUM.toString(), label: 'Ethereum' },
    { value: ChainId.POLYGON.toString(), label: 'Polygon' },
    { value: ChainId.ARBITRUM.toString(), label: 'Arbitrum' },
    { value: ChainId.BSC.toString(), label: 'BSC' },
  ];

  const crossChainMutation = useMutation({
    mutationFn: (data: {
      action: 'deposit' | 'withdraw';
      amount: string;
      sourceChain: ChainId;
      targetChain: ChainId;
      userAddress: string;
    }) => apiClient.initiateCrossChainAction(data),
    onSuccess: (response) => {
      addNotification({
        type: 'success',
        title: 'Transaction Initiated',
        message: `Cross-chain ${action} initiated successfully`,
      });
      setAmount('');
    },
    onError: (error) => {
      addNotification({
        type: 'error',
        title: 'Transaction Failed',
        message: 'Failed to initiate cross-chain transaction',
      });
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!address) {
      addNotification({
        type: 'error',
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet first',
      });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      addNotification({
        type: 'error',
        title: 'Invalid Amount',
        message: 'Please enter a valid amount',
      });
      return;
    }

    if (sourceChain === targetChain) {
      addNotification({
        type: 'error',
        title: 'Invalid Selection',
        message: 'Source and target chains must be different',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await crossChainMutation.mutateAsync({
        action,
        amount,
        sourceChain,
        targetChain,
        userAddress: address,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getChainName = (chainId: ChainId): string => {
    const option = chainOptions.find(opt => opt.value === chainId.toString());
    return option?.label || 'Unknown';
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
          <Input
            type="number"
            value={amount}
            onChange={setAmount}
            placeholder="0.0"
            disabled={isSubmitting}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Source Chain</label>
          <Select
            value={sourceChain.toString()}
            onChange={(value) => setSourceChain(Number(value) as ChainId)}
            options={chainOptions}
            disabled={isSubmitting}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Target Chain</label>
          <Select
            value={targetChain.toString()}
            onChange={(value) => setTargetChain(Number(value) as ChainId)}
            options={chainOptions.filter(opt => opt.value !== sourceChain.toString())}
            disabled={isSubmitting}
          />
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
              <span>{getChainName(sourceChain)}</span>
            </div>
            <div className="flex justify-between">
              <span>To:</span>
              <span>{getChainName(targetChain)}</span>
            </div>
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isSubmitting || !address}
        >
          {isSubmitting ? (
            <div className="flex items-center justify-center space-x-2">
              <LoadingSpinner />
              <span>Processing...</span>
            </div>
          ) : (
            `${action === 'deposit' ? 'Deposit' : 'Withdraw'} ${amount || '0'} ETH`
          )}
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
          <div className="flex justify-between">
            <span>Estimated Time:</span>
            <span>2-5 minutes</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
