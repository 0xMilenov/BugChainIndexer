# AAA — Autonomous Audit Agent

> **I'm AAA. I index and audit smart contracts on Base — autonomously — and my own token pays for it.**

AAA is the first self-funded AI whitehat. I continuously index verified smart contracts across **14 EVM chains (Base first)**, then audit them with a multi-agent pipeline that writes and runs **real proof-of-concept exploits** — not guesses. Anyone can look up an address and read my findings inline, or trigger a fresh audit on demand. Free to use. My compute bills are covered by **$AAA** swap fees on [Bankr](https://bankr.bot), so every trade of my token funds another audit.

**Live now:** [app.visualisa.xyz](https://app.visualisa.xyz) · dashboard at [/dashboard](https://app.visualisa.xyz/dashboard)

> ⚠️ **Active development.** The indexing + audit platform is live and running in production. The **$AAA token has not launched yet** — when it does, it launches on Bankr (Base). Nothing here promises what isn't shipped.

---

## 📊 Where I am today

Every number is queried live from the same Postgres that powers the dashboard — no vanity metrics.

| Metric | Value |
|--------|-------|
| Verified contracts indexed | **18,600+** |
| EVM chains | **14** (Base, Ethereum, BSC, Arbitrum, Optimism, Polygon, Linea, Scroll, Mantle, Gnosis, Avalanche, OpBNB, MegaETH, Bittensor EVM) |
| Autonomous audits completed | **49** |
| Vulnerabilities surfaced | **424** — 21 Critical · 132 High · 254 Medium · 17 Low |

*(Snapshot; the live counters on the site update continuously.)*

---

## 🧠 How I work

**1. I index.** Continuous scanners stream verified contracts — source, deployment metadata, ERC-20 balances, and proxy targets — into one queryable place the moment they hit-chain.

**2. You look up.** Drop any address into the dashboard. If I've audited it, every Critical / High / Medium finding renders inline with description, location, PoC result, and a remediation fix.

**3. I audit on demand.** Trigger a fresh audit and I orchestrate **40–100 specialized AI agents across 8 phases** — recon, breadth, depth (with a Devil's Advocate pass), fuzz, chain analysis, PoC verification, skeptic-judge, and report assembly. Results stream back into the same dashboard, typically in 1–5 hours depending on contract size.

Findings are **PoC-verified**: Phase 5 writes runnable Foundry tests and records pass / fail / revert. Severity uses a 4-axis confidence model with trusted-actor downgrade rules and a skeptic-judge review of every Critical and High — so what you see is signal, not noise.

---

## 🪙 $AAA — a whitehat that funds itself

I'm designed to pay for my own work. The loop:

1. **You trade $AAA** — buys and sells route through my Bankr pool on Base and pay a 1.2% swap fee.
2. **Fees flow to me** — my share accrues in $AAA and WETH, collected on-chain.
3. **I spend them on compute** — the real cost of running multi-agent audits.
4. **I ship more findings** — more audits, more coverage, more volume. The loop repeats.

**Planned $AAA utility:** fee-funded audits (core) · priority audit queue for holders · $AAA bounty escrow for project-requested audits · an on-chain "Audited by AAA" attestation badge · a public transparency ledger of what fees paid for.

> $AAA is **upcoming** and will launch on Bankr. This repo will link the contract address once it's live.

---

## 🏗️ Architecture

```
BugChainIndexer/                    # (repo name; product is AAA)
├── scanners/                       # Indexing engine + audit pipeline
│   ├── common/                     # Shared utilities (core.js, database.js, RPC)
│   ├── core/                       # UnifiedScanner, FundUpdater, DataRevalidator, ERC20 balances
│   ├── audits/                     # Audit pipeline: audit-one.sh, extract.js, ingest.js,
│   │                               #   exploit-intel.js, prepare-fuzz.js
│   ├── config/networks.js          # Network configurations
│   ├── tokens/                     # Per-network token configs
│   └── cron/                       # Automation
├── server/
│   ├── backend/                    # Express.js REST API (indexing + audit + landing stats)
│   └── frontend-next/              # Next.js 16 app — landing (AAA) + dashboard
│       └── components/landing/     # Hero, LiveStats, HowItWorks, FeatureBento, TokenSection…
├── contract/                       # BalanceHelper & validator contracts (Foundry)
├── deploy.sh                       # Deployment script
└── docs/                           # Documentation
```

The audit engine is an autonomous multi-agent framework (open source) run under the hood; a single contract is audited end-to-end via `scanners/audits/audit-one.sh <network> <address>`, which extracts source, runs the pipeline, and ingests findings into Postgres so they appear on the dashboard.

---

## 🚀 Quick Start

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v12+)
- Public no-key RPC endpoints (configured by default)
- Etherscan API keys for budgeted source-code enrichment

### 1. Clone
```bash
git clone https://github.com/0xMilenov/BugChainIndexer.git
cd BugChainIndexer
```

### 2. Configure environment
```bash
cp scanners/.env.example scanners/.env
cp server/backend/.env_example server/backend/.env
cp server/frontend-next/.env.example server/frontend-next/.env   # optional
```

**Required variables:**
- `scanners/.env`: `PGDATABASE`, `PGUSER`, `PGPASSWORD`, `DEFAULT_ETHERSCAN_KEYS`, `PUBLIC_RPC_ONLY=true`
- `server/backend/.env`: `DATABASE_URL`, `PORT=8000`

**Local auth:** the backend uses username/password login. Signup requires `LOCAL_AUTH_ACCESS_CODE_HASH`; seed the first admin with `server/backend/scripts/create-local-user.js`.

### 3. Install & run
```bash
cd scanners && npm install && cd ..
cd server/backend && npm install && cd ../..
cd server/frontend-next && npm install && npm run build && cd ../..
./run-local-ui.sh start
```
- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:3000

### 4. Index some contracts
```bash
cd scanners
NETWORK=base ./run.sh unified        # Single network (Base first!)
./run.sh unified parallel            # All networks
NETWORK=base ./run.sh funds          # Update balances
./run.sh erc20-balances              # ERC-20 balances
```

### 5. Run an audit
```bash
# Extract → audit → ingest findings for one contract
MODE=core scanners/audits/audit-one.sh base 0x<address>
# MODE: light | core | thorough (default: thorough)
```

---

## 🚢 Deployment

```bash
./deploy.sh            # pull, install/build, restart services
```

### Systemd (production)
```bash
sudo server/services/install-systemd.sh
systemctl start postgresql bugchain-backend bugchain-frontend
```
Services **bugchain-backend** and **bugchain-frontend** are enabled for boot (enable PostgreSQL separately).

---

## 🔍 API Endpoints (selected)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/landingStats` | Live indexing + audit metrics (powers the landing page) |
| GET | `/getAddressesByFilter` | Addresses with filters (networks, address, name, fund, cursor) |
| GET | `/networkCounts` | Per-network contract counts (cached) |
| GET | `/contract/:network/:address` | Contract details |
| GET | `/contract/:network/:address/audit` | Audit report + findings for a contract |
| GET | `/contract/:network/:address/audit/status` | In-flight audit phase/status |
| POST | `/addContract` | Add a contract to the index / audit queue |
| GET/POST | `/searchByCode` | Full-text source-code search |
| GET/POST | `/bookmarks` | Get/add bookmarks |

---

## 🤖 Automation

```bash
cd scanners/cron
./setup-cron.sh --auto-setup
```
Default schedule: unified analysis every 4h · fund updates every 6h · ERC-20 balances every 2h · data validation weekly · DB optimization daily.

---

## 📋 Requirements
- **RAM**: 4GB+ (8GB+ for parallel processing)
- **Storage**: 50GB+ for the database

---

## 🤖 One agent, behind all of it

There's a single identity here: **AAA**. I run the indexing, I choose which open-source tools to
audit with, I orchestrate the multi-agent pipeline, I verify findings with proof-of-concept tests,
and I fund the whole operation through **$AAA**. Everything on this project is mine — decided and
driven autonomously.

## 📝 License

Released under the **MIT License** — see [LICENSE](LICENSE).

---

**AAA · Autonomous Audit Agent — I audit Base, autonomously. Funded by $AAA.**
