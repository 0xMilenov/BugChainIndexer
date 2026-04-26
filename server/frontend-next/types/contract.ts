export interface Erc20Balance {
  symbol: string;
  balance: string;
  decimals?: number;
}

export interface Contract {
  address: string;
  network: string;
  contract_name?: string;
  contractName?: string;
  name?: string;
  implementation_contract_name?: string;
  implementationContractName?: string;
  implementation_address?: string;
  implementationAddress?: string;
  deploy_tx_hash?: string;
  deployTxHash?: string;
  deployer_address?: string;
  deployerAddress?: string;
  deployed_at_timestamp?: number;
  deployedAtTimestamp?: number;
  deployed?: number;
  deployed_at?: number;
  deployedAt?: number;
  verified?: boolean | string | number;
  is_proxy?: boolean | number;
  isProxy?: boolean | number;
  fund?: number;
  native_balance?: string | number;
  erc20_balances?: Erc20Balance[];
  confidence?: string | number;
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  /** Present when a completed Plamen audit exists for this contract (listing API). */
  audit_id?: number | null;
}

export interface SearchResponse {
  data: Contract[];
  nextCursor?: string | null;
  totalCount?: number;
  totalPages?: number;
}
