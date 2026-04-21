import type { SearchResponse } from "@/types/contract";

const getBaseUrl = () => {
  if (typeof window === "undefined") return "";
  // Always use same-origin /api/* so cookies (session) are sent. Next.js rewrites proxy to backend.
  return "";
};

export interface GetAddressesParams {
  address?: string;
  contractName?: string;
  deployedFrom?: number;
  deployedTo?: number;
  fundFrom?: number;
  fundTo?: number;
  networks?: string;
  sortBy?: string;
  hideUnnamed?: string;
  limit?: number;
  cursor?: string;
  includeTotal?: string;
}

export async function getAddressesByFilter(
  params: GetAddressesParams
): Promise<SearchResponse> {
  const base = getBaseUrl();
  const qp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") qp.set(k, String(v));
  });
  const resp = await fetch(`${base}/getAddressesByFilter?${qp.toString()}`, {
    method: "GET",
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export interface BookmarkContract {
  address: string;
  network: string;
  contract_name?: string;
}

export interface GetBookmarksResponse {
  ok: boolean;
  bookmarks: BookmarkContract[];
  error?: string;
}

export async function getBookmarks(): Promise<GetBookmarksResponse> {
  const base = getBaseUrl();
  const resp = await fetch(`${base}/bookmarks`);
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
  return data;
}

export async function addBookmarkApi(contract: BookmarkContract): Promise<{ ok: boolean; error?: string }> {
  const base = getBaseUrl();
  const resp = await fetch(`${base}/bookmarks`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      address: contract.address,
      network: contract.network,
      contract_name: contract.contract_name,
    }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
  return data;
}

export async function removeBookmarkApi(address: string, network: string): Promise<{ ok: boolean }> {
  const base = getBaseUrl();
  const encAddr = encodeURIComponent(address);
  const encNet = encodeURIComponent(network);
  const resp = await fetch(`${base}/bookmarks/${encNet}/${encAddr}`, {
    method: "DELETE",
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
  return data;
}

export async function getNetworkCounts(refresh = false): Promise<{
  ok: boolean;
  networks: Record<string, number>;
}> {
  const base = getBaseUrl();
  const url = refresh ? `${base}/networkCounts?refresh=1` : `${base}/networkCounts`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export async function getNativePrices(): Promise<{
  ok: boolean;
  prices: Record<string, number>;
}> {
  const base = getBaseUrl();
  const resp = await fetch(`${base}/nativePrices`);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

export interface SearchByCodeParams {
  codeSnippet: string;
  limit?: number;
  networks?: string;
}

export interface SearchByCodeResponse {
  ok?: boolean;
  matches: Array<{
    address: string;
    network: string;
    contract_name?: string;
    verified?: boolean;
    deployed?: number;
    fund?: number;
  }>;
  error?: string;
}

export interface ContractDetail {
  address: string;
  network: string;
  contract_name?: string;
  deployed?: number;
  fund?: number;
  native_balance?: string | number;
  first_seen?: number;
  verified?: boolean;
  is_proxy?: boolean;
  implementation_address?: string;
  proxy_contract_name?: string;
  implementation_contract_name?: string;
  deploy_tx_hash?: string;
  deployer_address?: string;
  deploy_block_number?: number;
  deployed_at_timestamp?: number;
  deployed_at?: string;
  confidence?: string;
  fetched_at?: string;
  source_code?: string;
  source_code_hash?: string;
  compiler_version?: string;
  optimization_used?: string;
  runs?: number;
  abi?: string;
  contract_file_name?: string;
  compiler_type?: string;
  evm_version?: string;
  constructor_arguments?: string;
  library?: string;
  license_type?: string;
  erc20_balances?: Array<{ symbol: string; balance: string; decimals?: number }>;
  critical_count?: number;
  high_count?: number;
  medium_count?: number;
  audit_status?: string | null;
  audit_completed_at?: number | null;
}

export interface GetContractResponse {
  ok: boolean;
  contract?: ContractDetail;
  error?: string;
}

export async function getContract(
  address: string,
  network: string
): Promise<GetContractResponse> {
  const base = getBaseUrl();
  const encAddr = encodeURIComponent(address);
  const encNet = encodeURIComponent(network);
  // Proxy path /api/contract/*; direct API uses /contract/*
  const url = base ? `${base}/contract/${encNet}/${encAddr}` : `/api/contract/${encNet}/${encAddr}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
  return data;
}

export interface AuditFinding {
  id: number;
  severity: "critical" | "high" | "medium";
  title: string;
  description?: string | null;
  location?: string | null;
  recommendation?: string | null;
  proof_of_concept?: string | null;
  finding_index?: number | null;
  created_at?: number | null;
}

export interface ContractAudit {
  id: number;
  address: string;
  network: string;
  audit_tool: string;
  audit_mode?: string | null;
  tool_version?: string | null;
  status: string;
  started_at?: number | string | null;
  completed_at?: number | string | null;
  duration_ms?: number | string | null;
  critical_count: number;
  high_count: number;
  medium_count: number;
  findings: AuditFinding[];
}

export interface GetContractAuditResponse {
  ok: boolean;
  audit?: ContractAudit;
  error?: string;
}

export async function getContractAudit(
  address: string,
  network: string
): Promise<GetContractAuditResponse | null> {
  const base = getBaseUrl();
  const encAddr = encodeURIComponent(address);
  const encNet = encodeURIComponent(network);
  const url = base
    ? `${base}/contract/${encNet}/${encAddr}/audit`
    : `/api/contract/${encNet}/${encAddr}/audit`;
  const resp = await fetch(url);
  // 404 is a valid "no audit yet" signal — callers handle it as null rather than
  // having to catch an exception.
  if (resp.status === 404) return null;
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
  return data;
}

export interface AddContractResponse {
  ok: boolean;
  contract?: ContractDetail;
  error?: string;
}

export async function addContract(
  address: string,
  network: string
): Promise<AddContractResponse> {
  const controller = new AbortController();
  const timeoutMs = 180000;
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(`/api/addContract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: address.trim(), network: network.trim() }),
      signal: controller.signal,
    });
    const responseText = await resp.text();
    const data = JSON.parse(responseText) as AddContractResponse;
    if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
    return data;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timed out while waiting for block explorer retries. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function searchByCode(
  params: SearchByCodeParams
): Promise<SearchByCodeResponse> {
  const base = getBaseUrl();
  const body = {
    codeSnippet: params.codeSnippet.trim(),
    limit: params.limit ?? 50,
    networks: params.networks || undefined,
  };
  const resp = await fetch(`${base}/searchByCode`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
  return data;
}

// Audit, fuzzing, and recon APIs removed from frontend lib to simplify the stack.
