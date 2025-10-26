import { ChainId } from '@manix-ai/types';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export const config = {
  // Application
  app: {
    name: 'MANI X AI',
    version: process.env.npm_package_version || '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3001'),
  },

  // Database
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/manixai',
  },

  // Redis
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  // Blockchain RPC URLs
  rpc: {
    [ChainId.ETHEREUM]: process.env.ETHEREUM_RPC_URL || '',
    [ChainId.POLYGON]: process.env.POLYGON_RPC_URL || '',
    [ChainId.ARBITRUM]: process.env.ARBITRUM_RPC_URL || '',
    [ChainId.BSC]: process.env.BSC_RPC_URL || '',
    [ChainId.MONAD]: process.env.MONAD_RPC_URL || '',
  },

  // API Keys
  explorer: {
    etherscan: process.env.ETHERSCAN_API_KEY || '',
    polygonscan: process.env.POLYGONSCAN_API_KEY || '',
    arbiscan: process.env.ARBISCAN_API_KEY || '',
    bscscan: process.env.BSCSCAN_API_KEY || '',
  },

  // Supabase
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  // AI Services
  ai: {
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
  },

  // Notifications
  notifications: {
    resendApiKey: process.env.RESEND_API_KEY || '',
    discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  },

  // Security
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    encryptionKey: process.env.ENCRYPTION_KEY || '',
  },
};

export default config;
