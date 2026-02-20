# Verified Contract + Source Code Improvements

This document summarizes all changes made to ensure BugChainIndexer **only collects, stores, and displays** verified smart contracts that have source code available.

---

## Problem Summary

Before these improvements:

1. **Empty `contract_sources`** – Despite 93+ verified contracts in `addresses`, source code was not being stored.
2. **Unverified contracts in UI** – The API returned all contracts (verified and unverified), so the UI showed "Unnamed Contract Unverified" entries.
3. **Source extraction failures** – Etherscan returns multi-file format `{{ "sources": { "path.sol": { "content": "..." } } }}`; extraction was failing on this format.
4. **Cached contracts had no source** – When using `alreadyVerified` cache, Etherscan was skipped and `sourceCode` stayed `null`.
5. **Schema gaps** – Missing ABI, ContractFileName, CompilerType, EVMVersion, and other Etherscan metadata.

---

## Design Principle

**Store and show only addresses that are BOTH:**
- Verified (have contract name from Etherscan)
- Have source code (successfully extracted from Etherscan)

EOAs, unverified contracts, and verified contracts without source are never stored.

---

## Changes Implemented

### 1. Source Code Extraction (`scanners/common/core.js`)

**`extractSourceCodeText(sourceData)`** – Handles all Etherscan formats:

| Format | Example |
|--------|---------|
| Single-file | `SourceCode` = plain Solidity string |
| Multi-file (standard-json) | `SourceCode` = `{{ "language": "Solidity", "sources": { "path.sol": { "content": "..." } } }}` |
| Legacy multi-file | `SourceCode` = `{ "sources": { "path.sol": "content" } }` |

- Strips outer `{{` and `}}` when present.
- Parses inner JSON, extracts `sources`, concatenates content.
- Adds `// File: path.sol` comments for searchability.
- Falls back to raw string if parsing fails.

---

### 2. Etherscan Enrichment (`scanners/common/core.js`)

**`getContractEtherscanEnrichment`** – Returns full metadata:

| Etherscan Field | Our Field |
|-----------------|-----------|
| SourceCode | sourceCode (extracted text) |
| ABI | abi |
| ContractName | contractName |
| CompilerVersion | compilerVersion |
| CompilerType | compilerType |
| OptimizationUsed | optimizationUsed |
| Runs | runs |
| ConstructorArguments | constructorArguments |
| EVMVersion | evmVersion |
| Library | library |
| ContractFileName | contractFileName |
| LicenseType | licenseType |

For proxies, implementation source/metadata is used.

---

### 3. Database Schema (`scanners/common/database.js`)

**`contract_sources` table** – New columns:

```sql
ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS abi TEXT;
ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS contract_file_name TEXT;
ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS compiler_type TEXT;
ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS evm_version TEXT;
ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS constructor_arguments TEXT;
ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS library TEXT;
ALTER TABLE contract_sources ADD COLUMN IF NOT EXISTS license_type TEXT;
```

**`batchUpsertContractSources`** – Accepts and persists all new fields.

---

### 4. UnifiedScanner – Verified + Source Only (`scanners/core/UnifiedScanner.js`)

**`storeResults`** – Only stores contracts that have BOTH verified and source:

```javascript
const withSource = verifiedOnly.filter(c => c.sourceCode != null && c.sourceCode.length > 0);
```

- Skips verified contracts without source (e.g. cached, or Etherscan returned empty).
- Stores addresses and `contract_sources` together.
- Logs: `"Storing X verified contracts with source (skipping Y verified-but-no-source)..."`

**`verifyContracts`** – Passes full metadata (abi, compilerType, evmVersion, etc.) to enrichment result.

---

### 5. API – Only Show Addresses With Source (`server/backend/services/address.service.js`)

**`CONTRACT_LIST_WHERE`** – Requires existence in `contract_sources`:

```sql
(tags IS NULL OR NOT 'EOA' = ANY(tags)) 
AND verified = true 
AND EXISTS (SELECT 1 FROM contract_sources cs 
            WHERE cs.address = addresses.address AND cs.network = addresses.network)
```

Applied to:
- `getAddressesByFilter` (data and count)
- `getContractCount`
- `getNetworkCounts`

---

### 6. Purge Script (`scanners/utils/purge-eoas-unverified.js`)

Extended to remove:
- EOAs
- Unverified contracts
- **Verified contracts without source** (no row in `contract_sources`)

```bash
node utils/purge-eoas-unverified.js           # Dry run
node utils/purge-eoas-unverified.js --execute # Execute
NETWORK=ethereum node utils/purge-eoas-unverified.js --execute  # Per network
```

---

### 7. DataRevalidator (`scanners/core/DataRevalidator.js`)

- Only updates addresses that are **verified AND have source code**.
- Calls `batchUpsertContractSources` to store source.
- Deletes unverified and verified-without-source during reclassification.
- Imports `batchUpsertContractSources` from common.

---

### 8. Tests (`scanners/tests/test-source-code-extraction.js`)

- `extractSourceCodeText` for multi-file, single-file, legacy formats.
- Mock enrichment for LPGPVault-style response.
- Optional real Etherscan test for `0x2Ce47888334F76ca2fFDBa4896C509A695197b17` when API keys are set.

---

### 9. Documentation

- **`docs/source-code-storage.md`** – Updated to state verified+source-only policy.
- **`docs/verified-source-improvements.md`** – This file.

---

## Pipeline Flow (Current)

1. **Transfer events** → Extract unique addresses.
2. **Filter existing** → Skip addresses already in DB.
3. **Contract vs EOA** → Bytecode check; EOAs skipped.
4. **Balance check** → Split by funds (optimization only).
5. **Verification + source** → One Etherscan `getsourcecode` call per contract.
6. **Store only when both** → Verified AND source present → store in `addresses` + `contract_sources`.
7. **UI** → API returns only addresses that have a `contract_sources` row.

---

## Multi-Chain Support

Works for all **EVM chains** in config:
- Uses Etherscan v2 API (`api.etherscan.io/v2/api`) with `chainid`.
- One `DEFAULT_ETHERSCAN_KEYS` covers Ethereum, BSC, Polygon, Arbitrum, Optimism, Base, Avalanche, Gnosis, Linea, Scroll, Mantle, Berachain, MegaETH, etc.
- **Sui** is Move-based and uses a different flow (not affected).

---

## Files Modified

| File | Changes |
|------|---------|
| `scanners/common/core.js` | `extractSourceCodeText` fix; `getContractEtherscanEnrichment` full metadata |
| `scanners/common/database.js` | `contract_sources` columns; `batchUpsertContractSources` |
| `scanners/core/UnifiedScanner.js` | `storeResults` verified+source only; pass full metadata |
| `scanners/core/DataRevalidator.js` | Verified+source only; store source; delete others |
| `server/backend/services/address.service.js` | `CONTRACT_LIST_WHERE` with `EXISTS contract_sources` |
| `scanners/utils/purge-eoas-unverified.js` | Delete verified-without-source |
| `docs/source-code-storage.md` | Policy update |

## New Files

| File | Purpose |
|------|---------|
| `scanners/tests/test-source-code-extraction.js` | Tests for source extraction |
| `docs/verified-source-improvements.md` | This document |

---

## Verification

After changes:
- `addresses` count = `contract_sources` count (1:1).
- UI shows only verified contracts with source.
- Code search (`POST /searchByCode`) works on stored source.
