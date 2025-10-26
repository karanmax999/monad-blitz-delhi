# MANI X AI Backend & Frontend Integration Guide

## Overview

This guide covers the complete full-stack integration of MANI X AI, including backend services, frontend dashboard, and testing infrastructure. The system provides AI-powered cross-chain vault management with LayerZero integration.

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Blockchain    │
│   (Next.js)     │◄──►│   (Node.js)     │◄──►│   (LayerZero)   │
│                 │    │                 │    │                 │
│ • Dashboard     │    │ • Vault Manager │    │ • ManixVault    │
│ • WebSocket     │    │ • AI Engine     │    │ • OVaultComposer│
│ • Notifications │    │ • Risk Analytics│    │ • AssetOFT      │
│ • Multi-chain   │    │ • Notifications │    │ • ShareOFT      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Folder Structure

```
services/
├── vault-manager/           # Main backend service
│   ├── src/
│   │   ├── index.ts        # Main server entry point
│   │   ├── services/       # Core services
│   │   │   ├── vault-manager.ts
│   │   │   ├── ai-strategy-engine.ts
│   │   │   ├── risk-analytics.ts
│   │   │   ├── notification.ts
│   │   │   └── event-listener.ts
│   │   ├── routes/         # API routes
│   │   │   ├── vaults.ts
│   │   │   ├── ai.ts
│   │   │   ├── analytics.ts
│   │   │   └── notifications.ts
│   │   └── types/          # TypeScript types
│   │       └── index.ts
│   ├── prisma/
│   │   └── schema.prisma   # Database schema
│   └── package.json

packages/web/               # Frontend application
├── src/
│   ├── app/               # Next.js app directory
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/        # React components
│   │   ├── dashboard/     # Dashboard components
│   │   │   ├── PortfolioOverview.tsx
│   │   │   ├── StrategyPerformance.tsx
│   │   │   ├── RiskCenter.tsx
│   │   │   ├── CrossChainActions.tsx
│   │   │   └── LearningHub.tsx
│   │   ├── ui/            # UI components
│   │   │   └── index.ts
│   │   └── layout/        # Layout components
│   │       ├── Header.tsx
│   │       └── Sidebar.tsx
│   ├── contexts/          # React contexts
│   │   ├── WebSocketContext.tsx
│   │   └── NotificationContext.tsx
│   └── lib/               # Utilities
│       └── utils.ts
├── package.json
└── tailwind.config.js

config/                     # Configuration files
├── config.json           # Deployment addresses
└── layerzero.config.ts   # LayerZero configuration
```

## Event Flow Diagram

```mermaid
graph TD
    A[User Action] --> B[Frontend]
    B --> C[Backend API]
    C --> D[Blockchain Contract]
    D --> E[LayerZero Event]
    E --> F[Event Listener]
    F --> G[Vault Manager]
    G --> H[Database Update]
    G --> I[AI Engine]
    I --> J[Risk Analytics]
    J --> K[Notification Service]
    K --> L[WebSocket]
    L --> M[Frontend Update]
    M --> N[User Notification]
```

## API Routes

### Vault Management

#### GET /api/vaults
Get all vaults with TVL data
```json
{
  "success": true,
  "data": [
    {
      "id": "vault-1",
      "address": "0x...",
      "name": "MANI X AI Hub Vault",
      "symbol": "MANIXHUB",
      "tvl": {
        "totalValueLocked": "1000000",
        "totalDeposits": "1200000",
        "totalWithdrawals": "200000",
        "activeUsers": 150,
        "lastUpdated": "2024-01-01T00:00:00Z"
      }
    }
  ]
}
```

#### GET /api/vaults/:vaultId
Get specific vault details
```json
{
  "success": true,
  "data": {
    "id": "vault-1",
    "address": "0x...",
    "name": "MANI X AI Hub Vault",
    "tvl": { ... },
    "riskMetrics": [
      {
        "apy": 12.5,
        "volatility": 8.2,
        "maxDrawdown": 15.3,
        "sharpeRatio": 1.8,
        "riskScore": 65
      }
    ]
  }
}
```

#### GET /api/vaults/:vaultId/tvl
Get vault TVL data
```json
{
  "success": true,
  "data": {
    "totalValueLocked": "1000000",
    "totalDeposits": "1200000",
    "totalWithdrawals": "200000",
    "activeUsers": 150,
    "lastUpdated": "2024-01-01T00:00:00Z"
  }
}
```

### AI Strategy

#### POST /api/ai/recommendation
Generate AI recommendation
```json
{
  "userId": "user-123",
  "action": "REBALANCE",
  "confidence": 85,
  "expectedReturn": 12.5,
  "reasoning": "Based on current market conditions..."
}
```

#### GET /api/ai/recommendations/:userId
Get user's AI recommendations
```json
{
  "success": true,
  "data": [
    {
      "id": "rec-1",
      "action": "REBALANCE",
      "confidence": 85,
      "expectedReturn": 12.5,
      "status": "EXECUTED",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### GET /api/ai/performance
Get AI performance metrics
```json
{
  "success": true,
  "data": {
    "totalRecommendations": 150,
    "executedRecommendations": 120,
    "averageConfidence": 82.5,
    "successRate": 80.0
  }
}
```

### Risk Analytics

#### GET /api/vaults/:vaultId/risk-metrics
Get vault risk metrics
```json
{
  "success": true,
  "data": {
    "vaultId": "vault-1",
    "chainId": "1",
    "apy": 12.5,
    "volatility": 8.2,
    "maxDrawdown": 15.3,
    "sharpeRatio": 1.8,
    "var95": 5.2,
    "var99": 8.7,
    "marketCorrelation": 0.75,
    "riskScore": 65,
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

#### POST /api/vaults/:vaultId/calculate-risk
Trigger risk metrics calculation
```json
{
  "success": true,
  "data": {
    "vaultId": "vault-1",
    "chainId": "1",
    "apy": 12.5,
    "volatility": 8.2,
    "maxDrawdown": 15.3,
    "sharpeRatio": 1.8,
    "var95": 5.2,
    "var99": 8.7,
    "marketCorrelation": 0.75,
    "riskScore": 65,
    "timestamp": "2024-01-01T00:00:00Z"
  }
}
```

## WebSocket Events

### Connection
```javascript
const socket = io('http://localhost:3001');

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});

socket.on('disconnect', () => {
  console.log('Disconnected from WebSocket server');
});
```

### Event Types

#### Notification Event
```javascript
socket.on('notification', (data) => {
  console.log('Notification received:', data);
  // {
  //   id: "notif-1",
  //   type: "AI_RECOMMENDATION",
  //   message: "AI recommendation: REBALANCE (85% confidence)",
  //   data: { action: "REBALANCE", confidence: 85 },
  //   timestamp: "2024-01-01T00:00:00Z"
  // }
});
```

#### Vault Update Event
```javascript
socket.on('vault-update', (data) => {
  console.log('Vault update received:', data);
  // {
  //   vaultId: "vault-1",
  //   tvl: { totalValueLocked: "1000000", ... },
  //   riskMetrics: { apy: 12.5, ... }
  // }
});
```

#### AI Recommendation Event
```javascript
socket.on('ai-recommendation', (data) => {
  console.log('AI recommendation received:', data);
  // {
  //   userId: "user-123",
  //   action: "REBALANCE",
  //   confidence: 85,
  //   expectedReturn: 12.5,
  //   reasoning: "Based on current market conditions..."
  // }
});
```

#### Cross-Chain Update Event
```javascript
socket.on('crosschain-update', (data) => {
  console.log('Cross-chain update received:', data);
  // {
  //   transactionId: "tx-123",
  //   userId: "user-123",
  //   amount: "1000000000000000000",
  //   sourceChain: "1",
  //   targetChain: "137",
  //   type: "DEPOSIT"
  // }
});
```

## Deployment Guide

### Prerequisites

1. **Node.js** (v18+)
2. **PostgreSQL** (v14+)
3. **Redis** (v6+)
4. **Docker** (optional)

### Backend Deployment

1. **Install Dependencies**
```bash
cd services/vault-manager
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Database Setup**
```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed
```

4. **Start Services**
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Frontend Deployment

1. **Install Dependencies**
```bash
cd packages/web
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. **Build and Start**
```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### Docker Deployment

1. **Backend Dockerfile**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3001
CMD ["npm", "start"]
```

2. **Frontend Dockerfile**
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
```

3. **Docker Compose**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: manix_ai
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:6-alpine
    ports:
      - "6379:6379"

  backend:
    build: ./services/vault-manager
    ports:
      - "3001:3001"
    environment:
      DATABASE_URL: postgresql://postgres:password@postgres:5432/manix_ai
      REDIS_URL: redis://redis:6379
    depends_on:
      - postgres
      - redis

  frontend:
    build: ./packages/web
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3001
      NEXT_PUBLIC_WS_URL: http://localhost:3001
    depends_on:
      - backend

volumes:
  postgres_data:
```

## Monitoring & Analytics

### Grafana Dashboard

1. **Install Grafana**
```bash
docker run -d --name grafana -p 3000:3000 grafana/grafana
```

2. **Configure Data Sources**
   - PostgreSQL: `postgresql://postgres:password@localhost:5432/manix_ai`
   - Redis: `redis://localhost:6379`

3. **Import Dashboard**
   - Import the provided Grafana dashboard JSON
   - Configure alerts for high risk scores, failed transactions, etc.

### The Graph Subgraph

1. **Install The Graph CLI**
```bash
npm install -g @graphprotocol/graph-cli
```

2. **Initialize Subgraph**
```bash
graph init --from-contract 0x... manix-ai-subgraph
```

3. **Deploy Subgraph**
```bash
graph deploy --node https://api.thegraph.com/deploy/ manix-ai-subgraph
```

### Health Checks

1. **Backend Health Check**
```bash
curl http://localhost:3001/health
```

2. **Database Health Check**
```bash
npx prisma db execute --stdin <<< "SELECT 1;"
```

3. **Redis Health Check**
```bash
redis-cli ping
```

## Testing

### Unit Tests

1. **Backend Tests**
```bash
cd services/vault-manager
npm test
```

2. **Frontend Tests**
```bash
cd packages/web
npm test
```

### Integration Tests

1. **API Tests**
```bash
cd services/vault-manager
npm run test:integration
```

2. **End-to-End Tests**
```bash
cd packages/web
npm run test:e2e
```

### Load Testing

1. **Install Artillery**
```bash
npm install -g artillery
```

2. **Run Load Tests**
```bash
artillery run load-test.yml
```

## Security Considerations

### API Security

1. **Rate Limiting**
   - Implement rate limiting for all API endpoints
   - Use Redis for distributed rate limiting

2. **Authentication**
   - Implement JWT-based authentication
   - Use wallet signature verification

3. **Input Validation**
   - Validate all input parameters
   - Use Joi for schema validation

### Database Security

1. **Connection Security**
   - Use SSL connections
   - Implement connection pooling

2. **Data Encryption**
   - Encrypt sensitive data at rest
   - Use proper key management

### Frontend Security

1. **Content Security Policy**
   - Implement CSP headers
   - Use nonce-based CSP

2. **XSS Protection**
   - Sanitize user input
   - Use React's built-in XSS protection

## Troubleshooting

### Common Issues

1. **WebSocket Connection Issues**
   - Check firewall settings
   - Verify CORS configuration
   - Check network connectivity

2. **Database Connection Issues**
   - Verify connection string
   - Check database permissions
   - Monitor connection pool

3. **LayerZero Event Issues**
   - Verify contract addresses
   - Check RPC endpoints
   - Monitor event listener logs

### Logging

1. **Backend Logs**
```bash
# View logs
docker logs -f backend

# Log levels
LOG_LEVEL=debug npm run dev
```

2. **Frontend Logs**
```bash
# Browser console
# Check Network tab for API calls
# Check Console tab for errors
```

## Performance Optimization

### Backend Optimization

1. **Database Optimization**
   - Add proper indexes
   - Use connection pooling
   - Implement query optimization

2. **Caching Strategy**
   - Use Redis for caching
   - Implement cache invalidation
   - Use CDN for static assets

### Frontend Optimization

1. **Code Splitting**
   - Use dynamic imports
   - Implement route-based splitting
   - Optimize bundle size

2. **Performance Monitoring**
   - Use Web Vitals
   - Implement performance budgets
   - Monitor Core Web Vitals

## Conclusion

This guide provides a comprehensive overview of the MANI X AI full-stack integration. The system is designed to be scalable, maintainable, and secure, with proper monitoring and testing infrastructure in place.

For additional support or questions, please refer to the project documentation or contact the development team.
