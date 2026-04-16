> **Multi-blockchain contract analysis and indexing system**

**Fork of [kismp123/BugChainIndexer](https://github.com/kismp123/BugChainIndexer)** · Significantly improved by **0xMilenov**

> ⚠️ **Note:** This project is still in active development.
>
> **Planned:** [Solodit](https://solodit.cyfrin.io) API integration (50,000+ vulnerabilities); one-click fuzz campaigns via [getrecon](https://getrecon.xyz/).

BugChainIndexer is a comprehensive blockchain analysis platform that monitors, analyzes, and indexes contract data across 14+ blockchain networks. The original project by [@kismp123](https://github.com/kismp123) provides the core indexing engine and multi-chain scanning. This fork adds: **Etherscan API v2** support; **source code storage** and a **query-based search** to search and compare across stored contracts; a significantly improved UI with **dedicated contract pages**; and production deployment tooling.

---

## ✨ Key Features

### 🔍 Multi-Chain Analysis
- **14+ Blockchain Networks**: Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, Avalanche, Gnosis, Linea, Scroll, Mantle, opBNB, Unichain, Berachain
- **Unified Processing**: Single codebase handles all networks with consistent data structures
- **Parallel Execution**: Process multiple networks simultaneously
- **Network-Specific Token Decimals**: 1,254+ tokens across 18 networks

### 🚀 High-Performance Scanning
- **50,000+ addresses/hour** per network
- **5-in-1 Pipeline**: Transfer events → Address filtering → EOA detection → Contract verification → Database storage
- **UnifiedScanner**: Main pipeline with ERC-20 balance checking
- **FundUpdater**: Portfolio tracking with PostgreSQL advisory locks
- **ERC20TokenBalanceScanner**: ERC-20 balances for verified contracts
- **DataRevalidator**: Data validation and reclassification

### 💰 Asset & Fund Tracking
- **BalanceHelper Contracts**: Batch balance queries (550M gas limit optimized)
- **Alchemy Prices API**: Real-time token prices with 7-day update cycle
- **PostgreSQL Advisory Locks**: Concurrent-safe fund updates
- **Dynamic Batch Sizing**: Adaptive chunk sizes (50-1000 addresses)

### 🌐 Fast Backend API
- **Sub-second Response**: Optimized queries with composite indexes
- **4-Hour Network Counts Cache**: Eliminates expensive GROUP BY queries
- **REST API**: Filtering, pagination, contract details, and bookmarks
- **Source Code Search**: Full-text search across verified contract sources

### 📋 Contract Management
- **Add Contract**: Manually add contracts by address and network
- **Bookmarks**: Save and manage favorite contracts
- **Contract Details**: Verified source, deployment info, token balances

---

## 🏗️ Architecture

```
BugChainIndexer/
├── scanners/                      # Core blockchain analysis engine
│   ├── common/                    # Shared utilities (core.js, database.js, alchemyRpc.js)
│   ├── core/                      # UnifiedScanner, FundUpdater, DataRevalidator, ERC20TokenBalanceScanner
│   ├── config/networks.js         # 18 network configurations
│   ├── tokens/                    # Token configs (ethereum.json, binance.json, ...)
│   ├── cron/                      # Cron scripts for automation
│   └── run.sh                     # Main scanner runner
├── server/
│   ├── backend/                   # Express.js REST API
│   │   ├── controllers/           # address, bookmark
│   │   ├── services/              # address, bookmark, addContract, db
│   │   └── routes/public.js       # API routes
│   ├── frontend-next/             # Next.js 16 web interface
│   └── services/                  # systemd units + install script
├── contract/                      # BalanceHelper & validator contracts (Foundry)
├── deploy.sh                      # Deployment script
├── run-local-ui.sh                # Local dev: backend + frontend
└── docs/                          # Documentation
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js (v18+)
- PostgreSQL (v12+)
- Alchemy API key
- Etherscan API keys

### 1. Clone

```bash
git clone https://github.com/0xMilenov/BugChainIndexer.git
cd BugChainIndexer
```

### 2. Configure Environment

```bash
# Scanners
cp scanners/.env.example scanners/.env

# Backend
cp server/backend/.env_example server/backend/.env

# Frontend (optional)
cp server/frontend-next/.env.example server/frontend-next/.env
```

**Required variables:**
- `scanners/.env`: `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `DEFAULT_ETHERSCAN_KEYS`, `ALCHEMY_API_KEY`
- `server/backend/.env`: `DATABASE_URL`, `PORT=8000`

**GitHub OAuth (optional, for "Log in with GitHub"):**
1. Create an OAuth app at [github.com/settings/applications/new](https://github.com/settings/applications/new)
2. Set **Authorization callback URL** to `http://localhost:3000/auth/github/callback` (or your frontend URL + `/auth/github/callback`)
3. Add `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `AUTH_JWT_SECRET`, and `FRONTEND_URL` to `server/backend/.env`
4. Restart the backend. If not configured, clicking "Log in" shows a setup guide at `/auth/setup`.

**Local OAuth testing:** See [docs/LOCAL-AUTH-SETUP.md](docs/LOCAL-AUTH-SETUP.md) for using `.env.local` to test auth locally alongside production config.

### 3. Install & Run

```bash
# Scanners
cd scanners && npm install && cd ..

# Backend
cd server/backend && npm install && cd ../..

# Frontend
cd server/frontend-next && npm install && npm run build && cd ../..

# Start backend + frontend (local dev)
./run-local-ui.sh start
```

- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:3000

### 4. Run Scanner

```bash
cd scanners
NETWORK=ethereum ./run.sh unified    # Single network
./run.sh unified parallel            # All networks
NETWORK=ethereum ./run.sh funds     # Update balances
./run.sh erc20-balances             # ERC-20 balances
```

---

## 🚢 Deployment

### Using deploy.sh

```bash
./deploy.sh
```

This script:
1. Pulls latest code
2. Installs backend/frontend deps and builds
3. Restarts BugChainIndexer services (systemd or run-local-ui)

### Systemd (Production)

```bash
sudo server/services/install-systemd.sh
systemctl start postgresql bugchain-backend bugchain-frontend
```

Services **bugchain-backend** and **bugchain-frontend** are enabled for boot (PostgreSQL should be enabled separately).

---

## 🔍 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Health check |
| GET | `/getAddressesByFilter` | Addresses with filters (networks, address, contractName, fund, deployed, cursor) |
| GET | `/getContractCount` | Contract count |
| GET | `/networkCounts` | Network statistics (4-hour cache) |
| GET | `/nativePrices` | Native token prices |
| GET | `/contract/:network/:address` | Contract details |
| POST | `/addContract` | Add contract manually |
| GET/POST | `/searchByCode` | Source code search |
| GET/POST | `/bookmarks` | Get/add bookmarks |
| DELETE | `/bookmarks/:network/:address` | Remove bookmark |

---

## 🤖 Automation

```bash
cd scanners/cron
./setup-cron.sh --auto-setup
```

**Default schedule:**
- Unified analysis: Every 4 hours
- Fund updates: Every 6 hours
- ERC-20 balances: Every 2 hours (off-peak)
- Data validation: Weekly (Sunday 2 AM)
- DB optimization: Daily

---

## 📈 Database Optimization

```bash
cd scanners
./run.sh db-optimize-fast    # Daily (fast)
./run.sh db-optimize         # Weekly (with VACUUM)
./run.sh db-optimize-large   # Monthly (10GB+)
./run.sh db-analyze          # Performance analysis
```

---

## 📋 Requirements

- **RAM**: 4GB+ (8GB+ for parallel processing)
- **Storage**: 50GB+ for database
- **Docker**: Optional, if you containerize services yourself

---

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

**Original:** [kismp123/BugChainIndexer](https://github.com/kismp123/BugChainIndexer) · **Fork:** VISUALISA · Built for scale · Optimized for performance
