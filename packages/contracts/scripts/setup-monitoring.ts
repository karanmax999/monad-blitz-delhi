import { ethers } from "hardhat";
import fs from "fs";
import path from "path";

// Monitoring configuration
const MONITORING_CONFIG = {
  networks: {
    ethereum: {
      chainId: 1,
      name: "Ethereum",
      rpcUrl: process.env.ETHEREUM_RPC_URL!,
      explorerUrl: "https://etherscan.io",
      color: "#627EEA"
    },
    polygon: {
      chainId: 137,
      name: "Polygon",
      rpcUrl: process.env.POLYGON_RPC_URL!,
      explorerUrl: "https://polygonscan.com",
      color: "#8247E5"
    },
    arbitrum: {
      chainId: 42161,
      name: "Arbitrum",
      rpcUrl: process.env.ARBITRUM_RPC_URL!,
      explorerUrl: "https://arbiscan.io",
      color: "#28A0F0"
    },
    bsc: {
      chainId: 56,
      name: "BSC",
      rpcUrl: process.env.BSC_RPC_URL!,
      explorerUrl: "https://bscscan.com",
      color: "#F3BA2F"
    },
    monad: {
      chainId: 123456789,
      name: "Monad",
      rpcUrl: process.env.MONAD_RPC_URL!,
      explorerUrl: "https://monadscan.com",
      color: "#00D4AA"
    }
  }
};

// Grafana dashboard configuration
const GRAFANA_DASHBOARD = {
  dashboard: {
    id: null,
    title: "MANI X AI Cross-Chain Vault Monitoring",
    tags: ["defi", "layerzero", "vault", "ai"],
    timezone: "browser",
    panels: [
      {
        id: 1,
        title: "Total Value Locked (TVL)",
        type: "stat",
        targets: [
          {
            expr: "sum(manix_vault_tvl_total)",
            legendFormat: "Total TVL"
          }
        ],
        fieldConfig: {
          defaults: {
            unit: "currencyUSD",
            color: {
              mode: "palette-classic"
            }
          }
        },
        gridPos: { h: 8, w: 12, x: 0, y: 0 }
      },
      {
        id: 2,
        title: "Cross-Chain Transactions",
        type: "graph",
        targets: [
          {
            expr: "rate(manix_cross_chain_transactions_total[5m])",
            legendFormat: "{{chain}} - {{type}}"
          }
        ],
        gridPos: { h: 8, w: 12, x: 12, y: 0 }
      },
      {
        id: 3,
        title: "AI Recommendations",
        type: "graph",
        targets: [
          {
            expr: "rate(manix_ai_recommendations_total[5m])",
            legendFormat: "{{action}} ({{confidence}}%)"
          }
        ],
        gridPos: { h: 8, w: 24, x: 0, y: 8 }
      },
      {
        id: 4,
        title: "LayerZero Message Status",
        type: "graph",
        targets: [
          {
            expr: "rate(manix_layerzero_messages_total[5m])",
            legendFormat: "{{status}} - {{chain}}"
          }
        ],
        gridPos: { h: 8, w: 12, x: 0, y: 16 }
      },
      {
        id: 5,
        title: "DVN Validation Status",
        type: "graph",
        targets: [
          {
            expr: "rate(manix_dvn_validations_total[5m])",
            legendFormat: "{{status}} - {{chain}}"
          }
        ],
        gridPos: { h: 8, w: 12, x: 12, y: 16 }
      },
      {
        id: 6,
        title: "Vault Performance Metrics",
        type: "graph",
        targets: [
          {
            expr: "manix_vault_apy_current",
            legendFormat: "APY - {{chain}}"
          },
          {
            expr: "manix_vault_sharpe_ratio",
            legendFormat: "Sharpe Ratio - {{chain}}"
          }
        ],
        gridPos: { h: 8, w: 24, x: 0, y: 24 }
      },
      {
        id: 7,
        title: "Error Rate",
        type: "graph",
        targets: [
          {
            expr: "rate(manix_errors_total[5m])",
            legendFormat: "{{error_type}} - {{chain}}"
          }
        ],
        gridPos: { h: 8, w: 12, x: 0, y: 32 }
      },
      {
        id: 8,
        title: "Gas Usage",
        type: "graph",
        targets: [
          {
            expr: "manix_gas_usage_average",
            legendFormat: "Average Gas - {{chain}}"
          }
        ],
        gridPos: { h: 8, w: 12, x: 12, y: 32 }
      }
    ],
    time: {
      from: "now-1h",
      to: "now"
    },
    refresh: "5s"
  }
};

// Prometheus configuration
const PROMETHEUS_CONFIG = {
  global: {
    scrape_interval: "15s",
    evaluation_interval: "15s"
  },
  rule_files: [
    "manix-alerts.yml"
  ],
  scrape_configs: [
    {
      job_name: "manix-vault-manager",
      static_configs: [
        {
          targets: ["localhost:3001"]
        }
      ],
      metrics_path: "/metrics",
      scrape_interval: "5s"
    },
    {
      job_name: "manix-ai-strategy",
      static_configs: [
        {
          targets: ["localhost:3002"]
        }
      ],
      metrics_path: "/metrics",
      scrape_interval: "5s"
    },
    {
      job_name: "manix-risk-analytics",
      static_configs: [
        {
          targets: ["localhost:3003"]
        }
      ],
      metrics_path: "/metrics",
      scrape_interval: "5s"
    }
  ],
  alerting: {
    alertmanagers: [
      {
        static_configs: [
          {
            targets: ["localhost:9093"]
          }
        ]
      }
    ]
  }
};

// Alert rules
const ALERT_RULES = {
  groups: [
    {
      name: "manix-vault-alerts",
      rules: [
        {
          alert: "HighErrorRate",
          expr: "rate(manix_errors_total[5m]) > 0.1",
          for: "2m",
          labels: {
            severity: "warning"
          },
          annotations: {
            summary: "High error rate detected",
            description: "Error rate is {{ $value }} errors per second"
          }
        },
        {
          alert: "LowTVL",
          expr: "manix_vault_tvl_total < 1000000",
          for: "5m",
          labels: {
            severity: "info"
          },
          annotations: {
            summary: "Low TVL detected",
            description: "TVL is {{ $value }} USD"
          }
        },
        {
          alert: "CrossChainFailure",
          expr: "rate(manix_cross_chain_transactions_total{status=\"failed\"}[5m]) > 0.05",
          for: "1m",
          labels: {
            severity: "critical"
          },
          annotations: {
            summary: "Cross-chain transaction failures",
            description: "Failure rate is {{ $value }} failures per second"
          }
        },
        {
          alert: "DVNValidationFailure",
          expr: "rate(manix_dvn_validations_total{status=\"failed\"}[5m]) > 0.01",
          for: "1m",
          labels: {
            severity: "critical"
          },
          annotations: {
            summary: "DVN validation failures",
            description: "DVN validation failure rate is {{ $value }} failures per second"
          }
        },
        {
          alert: "AILowConfidence",
          expr: "manix_ai_recommendations_total{confidence=\"low\"} > 10",
          for: "5m",
          labels: {
            severity: "warning"
          },
          annotations: {
            summary: "High number of low-confidence AI recommendations",
            description: "{{ $value }} low-confidence recommendations in the last 5 minutes"
          }
        }
      ]
    }
  ]
};

async function setupPrometheusConfig() {
  console.log("📊 Setting up Prometheus configuration...");
  
  // Create monitoring directory
  const monitoringDir = path.join(__dirname, "../../monitoring");
  if (!fs.existsSync(monitoringDir)) {
    fs.mkdirSync(monitoringDir, { recursive: true });
  }
  
  // Write Prometheus configuration
  fs.writeFileSync(
    path.join(monitoringDir, "prometheus.yml"),
    `# Prometheus configuration for MANI X AI
${JSON.stringify(PROMETHEUS_CONFIG, null, 2)}`
  );
  
  // Write alert rules
  fs.writeFileSync(
    path.join(monitoringDir, "manix-alerts.yml"),
    `# Alert rules for MANI X AI
${JSON.stringify(ALERT_RULES, null, 2)}`
  );
  
  console.log("✅ Prometheus configuration created");
}

async function setupGrafanaDashboard() {
  console.log("📈 Setting up Grafana dashboard...");
  
  const monitoringDir = path.join(__dirname, "../../monitoring");
  const grafanaDir = path.join(monitoringDir, "grafana");
  
  if (!fs.existsSync(grafanaDir)) {
    fs.mkdirSync(grafanaDir, { recursive: true });
  }
  
  // Write Grafana dashboard
  fs.writeFileSync(
    path.join(grafanaDir, "manix-ai-dashboard.json"),
    JSON.stringify(GRAFANA_DASHBOARD, null, 2)
  );
  
  console.log("✅ Grafana dashboard created");
}

async function setupFortaAgent() {
  console.log("🛡️ Setting up Forta monitoring agent...");
  
  const monitoringDir = path.join(__dirname, "../../monitoring");
  const fortaDir = path.join(monitoringDir, "forta");
  
  if (!fs.existsSync(fortaDir)) {
    fs.mkdirSync(fortaDir, { recursive: true });
  }
  
  // Load deployment configuration
  const configPath = path.join(__dirname, "../deployments/config.json");
  const deploymentConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  
  // Update Forta agent with real addresses
  const fortaAgentPath = path.join(fortaDir, "manix-ai-agent.ts");
  let fortaAgent = fs.readFileSync(fortaAgentPath, "utf8");
  
  // Replace placeholder addresses with real ones
  for (const [chainId, config] of Object.entries(deploymentConfig)) {
    const networkName = Object.keys(MONITORING_CONFIG.networks).find(key => 
      MONITORING_CONFIG.networks[key].chainId.toString() === chainId
    );
    
    if (networkName && config.contracts) {
      fortaAgent = fortaAgent.replace(
        new RegExp(`'${chainId}': '0x0000000000000000000000000000000000000000'`, 'g'),
        `'${chainId}': '${config.contracts.vault}'`
      );
    }
  }
  
  fs.writeFileSync(fortaAgentPath, fortaAgent);
  
  console.log("✅ Forta agent updated with real addresses");
}

async function generateMonitoringScripts() {
  console.log("🔧 Generating monitoring scripts...");
  
  const monitoringDir = path.join(__dirname, "../../monitoring");
  
  // Docker Compose for monitoring stack
  const dockerCompose = `version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: manix-prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - ./manix-alerts.yml:/etc/prometheus/manix-alerts.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: manix-grafana
    ports:
      - "3000:3000"
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/manix-ai-dashboard.json:/var/lib/grafana/dashboards/manix-ai-dashboard.json
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    restart: unless-stopped

  alertmanager:
    image: prom/alertmanager:latest
    container_name: manix-alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    restart: unless-stopped

  node-exporter:
    image: prom/node-exporter:latest
    container_name: manix-node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.rootfs=/rootfs'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    restart: unless-stopped

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:
`;

  fs.writeFileSync(
    path.join(monitoringDir, "docker-compose.yml"),
    dockerCompose
  );
  
  // Alertmanager configuration
  const alertmanagerConfig = `global:
  smtp_smarthost: 'localhost:587'
  smtp_from: 'alerts@manix.ai'

route:
  group_by: ['alertname']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'

receivers:
- name: 'web.hook'
  webhook_configs:
  - url: 'http://localhost:5001/'
`;

  fs.writeFileSync(
    path.join(monitoringDir, "alertmanager.yml"),
    alertmanagerConfig
  );
  
  // Monitoring startup script
  const startupScript = `#!/bin/bash

echo "🚀 Starting MANI X AI Monitoring Stack"
echo "===================================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start monitoring stack
echo "📊 Starting Prometheus, Grafana, and Alertmanager..."
docker-compose up -d

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 30

# Check service status
echo "🔍 Checking service status..."
docker-compose ps

# Display access information
echo ""
echo "✅ Monitoring stack started successfully!"
echo ""
echo "📊 Access URLs:"
echo "   Prometheus: http://localhost:9090"
echo "   Grafana: http://localhost:3000 (admin/admin123)"
echo "   Alertmanager: http://localhost:9093"
echo "   Node Exporter: http://localhost:9100"
echo ""
echo "📈 Dashboard:"
echo "   Import the dashboard from: ./grafana/manix-ai-dashboard.json"
echo ""
echo "🛡️ Forta Agent:"
echo "   Deploy with: forta-agent deploy"
echo ""
echo "📝 Logs:"
echo "   View logs with: docker-compose logs -f"
echo "   Stop services with: docker-compose down"
`;

  fs.writeFileSync(
    path.join(monitoringDir, "start-monitoring.sh"),
    startupScript
  );
  
  // Make script executable
  fs.chmodSync(path.join(monitoringDir, "start-monitoring.sh"), 0o755);
  
  console.log("✅ Monitoring scripts generated");
}

async function main() {
  console.log("🔧 Setting up MANI X AI Monitoring Infrastructure");
  console.log("==================================================");
  
  try {
    // Set up Prometheus configuration
    await setupPrometheusConfig();
    
    // Set up Grafana dashboard
    await setupGrafanaDashboard();
    
    // Set up Forta agent
    await setupFortaAgent();
    
    // Generate monitoring scripts
    await generateMonitoringScripts();
    
    console.log("\n✅ Monitoring infrastructure setup completed!");
    console.log("\n📋 Next steps:");
    console.log("1. Start monitoring stack: cd monitoring && ./start-monitoring.sh");
    console.log("2. Import Grafana dashboard from ./grafana/manix-ai-dashboard.json");
    console.log("3. Deploy Forta agent: forta-agent deploy");
    console.log("4. Configure alert notifications in Alertmanager");
    console.log("5. Test monitoring with sample transactions");
    
  } catch (error) {
    console.error("❌ Monitoring setup failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Setup failed:", error);
    process.exit(1);
  });
