import { test, expect } from '@playwright/test';
import { ethers } from 'ethers';
import * as fs from 'fs';
import * as path from 'path';

interface StressTestConfig {
  concurrentUsers: number;
  transactionsPerUser: number;
  testDuration: number; // in minutes
  chains: string[];
  transactionTypes: ('deposit' | 'withdraw')[];
  monitoring: {
    enableMetrics: boolean;
    prometheusEndpoint: string;
  };
}

interface StressTestResult {
  testId: string;
  timestamp: string;
  config: StressTestConfig;
  results: {
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    throughput: number; // transactions per second
    errorRate: number;
    gasUsage: {
      total: string;
      average: string;
      max: string;
      min: string;
    };
  };
  chainResults: { [chainId: string]: any };
  errors: any[];
}

export class StressTestRunner {
  private config: StressTestConfig;
  private results: StressTestResult[] = [];
  private isRunning: boolean = false;

  constructor(config: StressTestConfig) {
    this.config = config;
  }

  /**
   * Run comprehensive stress tests
   */
  async runStressTests(): Promise<StressTestResult[]> {
    console.log('🚀 Starting MANI X AI Stress Tests...');
    
    const testId = `stress-test-${Date.now()}`;
    this.isRunning = true;

    try {
      // Test 1: Throughput Testing
      console.log('📊 Test 1: Throughput Testing');
      const throughputResult = await this.runThroughputTest();
      this.results.push(throughputResult);

      // Test 2: Latency Testing
      console.log('⏱️ Test 2: Latency Testing');
      const latencyResult = await this.runLatencyTest();
      this.results.push(latencyResult);

      // Test 3: Database Stress Testing
      console.log('🗄️ Test 3: Database Stress Testing');
      const dbResult = await this.runDatabaseStressTest();
      this.results.push(dbResult);

      // Test 4: WebSocket Load Testing
      console.log('🔌 Test 4: WebSocket Load Testing');
      const wsResult = await this.runWebSocketLoadTest();
      this.results.push(wsResult);

      // Test 5: Cross-Chain Message Testing
      console.log('🔗 Test 5: Cross-Chain Message Testing');
      const crossChainResult = await this.runCrossChainMessageTest();
      this.results.push(crossChainResult);

      // Generate comprehensive report
      await this.generateStressTestReport();

      console.log('✅ Stress tests completed successfully!');
      return this.results;

    } catch (error) {
      console.error('❌ Stress tests failed:', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Test 1: Throughput Testing
   */
  private async runThroughputTest(): Promise<StressTestResult> {
    const testId = `throughput-${Date.now()}`;
    const startTime = Date.now();
    
    console.log(`🧪 Running throughput test with ${this.config.concurrentUsers} concurrent users`);

    const promises: Promise<any>[] = [];
    const results: any[] = [];

    // Create concurrent user simulations
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      promises.push(this.simulateUserActivity(i, results));
    }

    // Wait for all users to complete
    await Promise.all(promises);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000; // seconds

    // Calculate metrics
    const totalTransactions = results.length;
    const successfulTransactions = results.filter(r => r.success).length;
    const failedTransactions = totalTransactions - successfulTransactions;
    const throughput = totalTransactions / duration;

    const responseTimes = results.map(r => r.responseTime).filter(t => t !== undefined);
    const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    const minResponseTime = Math.min(...responseTimes);

    const gasUsage = results.map(r => r.gasUsed).filter(g => g !== undefined);
    const totalGas = gasUsage.reduce((a, b) => a + BigInt(b), BigInt(0));

    return {
      testId,
      timestamp: new Date().toISOString(),
      config: this.config,
      results: {
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        averageResponseTime,
        maxResponseTime,
        minResponseTime,
        throughput,
        errorRate: (failedTransactions / totalTransactions) * 100,
        gasUsage: {
          total: totalGas.toString(),
          average: gasUsage.length > 0 ? (totalGas / BigInt(gasUsage.length)).toString() : '0',
          max: Math.max(...gasUsage.map(g => parseInt(g))).toString(),
          min: Math.min(...gasUsage.map(g => parseInt(g))).toString()
        }
      },
      chainResults: {},
      errors: results.filter(r => !r.success).map(r => r.error)
    };
  }

  /**
   * Test 2: Latency Testing
   */
  private async runLatencyTest(): Promise<StressTestResult> {
    const testId = `latency-${Date.now()}`;
    const startTime = Date.now();
    
    console.log('⏱️ Testing cross-chain message latency');

    const latencyResults: any[] = [];

    // Test latency for each chain pair
    for (let i = 0; i < this.config.chains.length - 1; i++) {
      const sourceChain = this.config.chains[i];
      const targetChain = this.config.chains[i + 1];

      const latency = await this.measureCrossChainLatency(sourceChain, targetChain);
      latencyResults.push({
        sourceChain,
        targetChain,
        latency,
        timestamp: new Date().toISOString()
      });
    }

    const endTime = Date.now();
    const totalDuration = (endTime - startTime) / 1000;

    const latencies = latencyResults.map(r => r.latency);
    const averageLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);

    return {
      testId,
      timestamp: new Date().toISOString(),
      config: this.config,
      results: {
        totalTransactions: latencyResults.length,
        successfulTransactions: latencyResults.length,
        failedTransactions: 0,
        averageResponseTime: averageLatency,
        maxResponseTime: maxLatency,
        minResponseTime: minLatency,
        throughput: latencyResults.length / totalDuration,
        errorRate: 0,
        gasUsage: {
          total: '0',
          average: '0',
          max: '0',
          min: '0'
        }
      },
      chainResults: latencyResults.reduce((acc, r) => {
        acc[`${r.sourceChain}-${r.targetChain}`] = r;
        return acc;
      }, {} as any),
      errors: []
    };
  }

  /**
   * Test 3: Database Stress Testing
   */
  private async runDatabaseStressTest(): Promise<StressTestResult> {
    const testId = `database-${Date.now()}`;
    const startTime = Date.now();
    
    console.log('🗄️ Testing database performance with high write load');

    const writePromises: Promise<any>[] = [];
    const results: any[] = [];

    // Simulate high database write load
    for (let i = 0; i < 1000; i++) {
      writePromises.push(this.simulateDatabaseWrite(i, results));
    }

    await Promise.all(writePromises);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    const successfulWrites = results.filter(r => r.success).length;
    const failedWrites = results.length - successfulWrites;
    const writeThroughput = results.length / duration;

    const writeTimes = results.map(r => r.writeTime).filter(t => t !== undefined);
    const averageWriteTime = writeTimes.reduce((a, b) => a + b, 0) / writeTimes.length;

    return {
      testId,
      timestamp: new Date().toISOString(),
      config: this.config,
      results: {
        totalTransactions: results.length,
        successfulTransactions: successfulWrites,
        failedTransactions: failedWrites,
        averageResponseTime: averageWriteTime,
        maxResponseTime: Math.max(...writeTimes),
        minResponseTime: Math.min(...writeTimes),
        throughput: writeThroughput,
        errorRate: (failedWrites / results.length) * 100,
        gasUsage: {
          total: '0',
          average: '0',
          max: '0',
          min: '0'
        }
      },
      chainResults: {},
      errors: results.filter(r => !r.success).map(r => r.error)
    };
  }

  /**
   * Test 4: WebSocket Load Testing
   */
  private async runWebSocketLoadTest(): Promise<StressTestResult> {
    const testId = `websocket-${Date.now()}`;
    const startTime = Date.now();
    
    console.log(`🔌 Testing WebSocket with ${this.config.concurrentUsers} concurrent connections`);

    const connectionPromises: Promise<any>[] = [];
    const results: any[] = [];

    // Create concurrent WebSocket connections
    for (let i = 0; i < this.config.concurrentUsers; i++) {
      connectionPromises.push(this.simulateWebSocketConnection(i, results));
    }

    await Promise.all(connectionPromises);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    const successfulConnections = results.filter(r => r.success).length;
    const failedConnections = results.length - successfulConnections;
    const connectionThroughput = results.length / duration;

    const connectionTimes = results.map(r => r.connectionTime).filter(t => t !== undefined);
    const averageConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length;

    return {
      testId,
      timestamp: new Date().toISOString(),
      config: this.config,
      results: {
        totalTransactions: results.length,
        successfulTransactions: successfulConnections,
        failedTransactions: failedConnections,
        averageResponseTime: averageConnectionTime,
        maxResponseTime: Math.max(...connectionTimes),
        minResponseTime: Math.min(...connectionTimes),
        throughput: connectionThroughput,
        errorRate: (failedConnections / results.length) * 100,
        gasUsage: {
          total: '0',
          average: '0',
          max: '0',
          min: '0'
        }
      },
      chainResults: {},
      errors: results.filter(r => !r.success).map(r => r.error)
    };
  }

  /**
   * Test 5: Cross-Chain Message Testing
   */
  private async runCrossChainMessageTest(): Promise<StressTestResult> {
    const testId = `crosschain-${Date.now()}`;
    const startTime = Date.now();
    
    console.log('🔗 Testing cross-chain message handling');

    const messagePromises: Promise<any>[] = [];
    const results: any[] = [];

    // Test cross-chain messages between all chain pairs
    for (const sourceChain of this.config.chains) {
      for (const targetChain of this.config.chains) {
        if (sourceChain !== targetChain) {
          for (const txType of this.config.transactionTypes) {
            messagePromises.push(this.simulateCrossChainMessage(sourceChain, targetChain, txType, results));
          }
        }
      }
    }

    await Promise.all(messagePromises);

    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;

    const successfulMessages = results.filter(r => r.success).length;
    const failedMessages = results.length - successfulMessages;
    const messageThroughput = results.length / duration;

    const messageTimes = results.map(r => r.messageTime).filter(t => t !== undefined);
    const averageMessageTime = messageTimes.reduce((a, b) => a + b, 0) / messageTimes.length;

    return {
      testId,
      timestamp: new Date().toISOString(),
      config: this.config,
      results: {
        totalTransactions: results.length,
        successfulTransactions: successfulMessages,
        failedTransactions: failedMessages,
        averageResponseTime: averageMessageTime,
        maxResponseTime: Math.max(...messageTimes),
        minResponseTime: Math.min(...messageTimes),
        throughput: messageThroughput,
        errorRate: (failedMessages / results.length) * 100,
        gasUsage: {
          total: '0',
          average: '0',
          max: '0',
          min: '0'
        }
      },
      chainResults: {},
      errors: results.filter(r => !r.success).map(r => r.error)
    };
  }

  /**
   * Simulate user activity
   */
  private async simulateUserActivity(userId: number, results: any[]): Promise<void> {
    const userResults: any[] = [];

    for (let i = 0; i < this.config.transactionsPerUser; i++) {
      const startTime = Date.now();
      
      try {
        // Simulate API call
        const response = await fetch('http://localhost:3001/api/vaults/cross-chain-action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'deposit',
            amount: '1000000000000000000', // 1 ETH
            sourceChain: this.config.chains[0],
            targetChain: this.config.chains[1],
            userAddress: `0x${userId.toString().padStart(40, '0')}`
          })
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        userResults.push({
          userId,
          transactionId: i,
          success: response.ok,
          responseTime,
          gasUsed: '21000', // Mock gas usage
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        userResults.push({
          userId,
          transactionId: i,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }

      // Small delay between transactions
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    results.push(...userResults);
  }

  /**
   * Measure cross-chain latency
   */
  private async measureCrossChainLatency(sourceChain: string, targetChain: string): Promise<number> {
    const startTime = Date.now();
    
    try {
      // Simulate cross-chain message
      const response = await fetch('http://localhost:3001/api/vaults/cross-chain-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'deposit',
          amount: '1000000000000000000',
          sourceChain,
          targetChain,
          userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
        })
      });

      const endTime = Date.now();
      return endTime - startTime;

    } catch (error) {
      console.error(`Error measuring latency ${sourceChain} -> ${targetChain}:`, error);
      return -1;
    }
  }

  /**
   * Simulate database write
   */
  private async simulateDatabaseWrite(writeId: number, results: any[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Simulate database write via API
      const response = await fetch('http://localhost:3001/api/vaults', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          writeId,
          data: {
            timestamp: new Date().toISOString(),
            value: Math.random() * 1000
          }
        })
      });

      const endTime = Date.now();
      const writeTime = endTime - startTime;

      results.push({
        writeId,
        success: response.ok,
        writeTime,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      results.push({
        writeId,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Simulate WebSocket connection
   */
  private async simulateWebSocketConnection(connectionId: number, results: any[]): Promise<void> {
    const startTime = Date.now();
    
    try {
      // Simulate WebSocket connection
      const ws = new WebSocket('ws://localhost:3001');
      
      await new Promise((resolve, reject) => {
        ws.onopen = () => {
          const endTime = Date.now();
          const connectionTime = endTime - startTime;
          
          results.push({
            connectionId,
            success: true,
            connectionTime,
            timestamp: new Date().toISOString()
          });
          
          ws.close();
          resolve(undefined);
        };
        
        ws.onerror = (error) => {
          results.push({
            connectionId,
            success: false,
            error: error.toString(),
            timestamp: new Date().toISOString()
          });
          reject(error);
        };
        
        // Timeout after 5 seconds
        setTimeout(() => {
          ws.close();
          reject(new Error('Connection timeout'));
        }, 5000);
      });

    } catch (error) {
      results.push({
        connectionId,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Simulate cross-chain message
   */
  private async simulateCrossChainMessage(
    sourceChain: string, 
    targetChain: string, 
    txType: 'deposit' | 'withdraw',
    results: any[]
  ): Promise<void> {
    const startTime = Date.now();
    
    try {
      const response = await fetch('http://localhost:3001/api/vaults/cross-chain-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: txType,
          amount: '1000000000000000000',
          sourceChain,
          targetChain,
          userAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
        })
      });

      const endTime = Date.now();
      const messageTime = endTime - startTime;

      results.push({
        sourceChain,
        targetChain,
        txType,
        success: response.ok,
        messageTime,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      results.push({
        sourceChain,
        targetChain,
        txType,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Generate comprehensive stress test report
   */
  private async generateStressTestReport(): Promise<void> {
    const report = {
      testSuite: 'MANI X AI Stress Tests',
      timestamp: new Date().toISOString(),
      config: this.config,
      summary: {
        totalTests: this.results.length,
        overallSuccess: this.results.every(r => r.results.errorRate < 10),
        averageThroughput: this.results.reduce((sum, r) => sum + r.results.throughput, 0) / this.results.length,
        maxLatency: Math.max(...this.results.map(r => r.results.maxResponseTime)),
        totalErrors: this.results.reduce((sum, r) => sum + r.results.failedTransactions, 0)
      },
      results: this.results,
      recommendations: this.generateRecommendations()
    };

    // Save report
    const reportPath = path.join(__dirname, '../reports/stress-test-report.json');
    const reportDir = path.dirname(reportPath);
    
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Stress test report saved: ${reportPath}`);
  }

  /**
   * Generate recommendations based on test results
   */
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];

    // Check throughput
    const avgThroughput = this.results.reduce((sum, r) => sum + r.results.throughput, 0) / this.results.length;
    if (avgThroughput < 10) {
      recommendations.push('Consider scaling horizontally - current throughput is below target');
    }

    // Check latency
    const maxLatency = Math.max(...this.results.map(r => r.results.maxResponseTime));
    if (maxLatency > 2000) {
      recommendations.push('Optimize cross-chain message processing - latency exceeds 2 second target');
    }

    // Check error rate
    const avgErrorRate = this.results.reduce((sum, r) => sum + r.results.errorRate, 0) / this.results.length;
    if (avgErrorRate > 5) {
      recommendations.push('Investigate error sources - error rate exceeds acceptable threshold');
    }

    // Check WebSocket performance
    const wsResult = this.results.find(r => r.testId.includes('websocket'));
    if (wsResult && wsResult.results.errorRate > 10) {
      recommendations.push('Scale WebSocket infrastructure - connection failure rate is high');
    }

    return recommendations;
  }
}

// Export for use in test files
export default StressTestRunner;
