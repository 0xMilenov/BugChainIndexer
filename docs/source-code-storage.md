# Contract Source Code Storage and Code Search

## Overview

BugChainIndexer stores **only** verified smart contracts that have source code. Both `addresses` and `contract_sources` are populated together; the UI shows only addresses that have source code stored.

## Schema

### contract_sources Table

```sql
CREATE TABLE contract_sources (
  address TEXT NOT NULL,
  network TEXT NOT NULL,
  source_code TEXT NOT NULL,
  source_code_hash TEXT,
  compiler_version TEXT,
  optimization_used TEXT,
  runs INTEGER,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (address, network),
  FOREIGN KEY (address, network) REFERENCES addresses(address, network) ON DELETE CASCADE
);
```

- **address**: Contract address (lowercase)
- **network**: Network name (ethereum, polygon, etc.)
- **source_code**: Full Solidity source (single-file or concatenated multi-file)
- **source_code_hash**: Optional SHA256 for deduplication
- **compiler_version**: Solidity compiler version from Etherscan
- **optimization_used**: "1" or "0"
- **runs**: Optimization runs

PostgreSQL TOAST automatically handles large `source_code` values.

## Storage Flow

1. **UnifiedScanner** verifies contracts via Etherscan `getsourcecode`
2. For verified contracts, `getContractEtherscanEnrichment` returns `sourceCode` (and compiler metadata)
3. For proxies, implementation's source is stored (the proxy address links to implementation logic)
4. `batchUpsertContractSources` persists to `contract_sources` after addresses are upserted

## Code Search API

### POST /searchByCode

Search contracts by code snippet (substring match).

**Request (JSON body or query params):**
```json
{
  "codeSnippet": "function deposit(uint256 amount)",
  "limit": 50,
  "networks": ["ethereum", "arbitrum"]
}
```

**Response:**
```json
{
  "ok": true,
  "matches": [
    {
      "address": "0x...",
      "network": "ethereum",
      "contract_name": "Vault",
      "verified": true,
      "deployed": 1234567890,
      "fund": "1000000"
    }
  ]
}
```

**GET /searchByCode** is also supported with `codeSnippet` and `limit` as query params.

### Example: Find deposit functions

```bash
curl -X POST http://localhost:443/searchByCode \
  -H "Content-Type: application/json" \
  -d '{"codeSnippet": "function deposit(", "limit": 20}'
```

## Backfill

For existing verified contracts without source code:

```bash
cd scanners
NETWORK=ethereum LIMIT=100 node utils/backfill-contract-sources.js
```

Environment variables:
- `NETWORK`: Optional; omit for all networks
- `LIMIT`: Max contracts to process (default 100)
- `DELAY_MS`: Delay between Etherscan calls (default 1500)

## Purge EOAs and Unverified

The API and UI show only **verified** contracts (`verified = true`). Unverified contracts and EOAs in the database are hidden from listing but still consume storage. To remove them:

```bash
cd scanners
node utils/purge-eoas-unverified.js           # Dry run (shows counts)
node utils/purge-eoas-unverified.js --execute # Execute delete
NETWORK=ethereum node utils/purge-eoas-unverified.js --execute  # Per network
```

Run after migrating to verified-only storage, or whenever you want to reclaim space from legacy unverified data.

## Indexes

- `idx_contract_sources_network`: Network filter
- `idx_contract_sources_source_trgm`: GIN trigram index on `source_code` (for pg_trgm similarity; ILIKE substring search uses sequential scan on large tables but is acceptable for typical snippet lengths)

## Etherscan Source Format

- **Single-file**: `SourceCode` is plain Solidity text
- **Multi-file**: `SourceCode` is JSON-wrapped, e.g. `{{"sources":{"path.sol":{"content":"..."}}}}`. The `extractSourceCodeText` utility parses and concatenates all file contents.
