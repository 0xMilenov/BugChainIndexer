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
  getrecon?: boolean;
  getrecon_url?: string;
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

export interface AddContractResponse {
  ok: boolean;
  contract?: ContractDetail;
  error?: string;
}

export async function addContract(
  address: string,
  network: string
): Promise<AddContractResponse> {
  const base = getBaseUrl();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000); // 90s - Etherscan can be slow under rate limits
  try {
    const resp = await fetch(`${base}/addContract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ address: address.trim(), network: network.trim() }),
      signal: controller.signal,
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
    return data;
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

export interface AuditReport {
  id: number;
  address: string;
  network: string;
  status: "pending" | "completed" | "failed";
  model?: string;
  report_json?: {
    manual?: boolean;
    markdown?: string;
    vulnerabilities?: Array<{
      title: string;
      severity: string;
      summary: string;
      description: Array<{ file: string; line_start: number; line_end: number; desc: string }>;
      impact: string;
      proof_of_concept?: string;
      remediation?: string;
    }>;
  };
  raw_output?: string;
  evmbench_job_id?: string;
  triggered_at: string;
  completed_at?: string;
}

export interface FuzzReport {
  id: number;
  address: string;
  network: string;
  status: "pending" | "completed" | "failed";
  report_json?: {
    manual?: boolean;
    markdown?: string;
    [key: string]: unknown;
  };
  raw_output?: string;
  campaign_id?: string;
  triggered_at: string;
  completed_at?: string;
}

export interface EvmbenchJob {
  status?: string;
  model?: string;
  file_name?: string;
  created_at?: string;
  started_at?: string;
  queue_position?: number;
}

export interface GetContractReportsResponse {
  ok: boolean;
  auditReport: AuditReport | null;
  fuzzReport: FuzzReport | null;
  evmbenchJob?: EvmbenchJob | null;
}

export async function getContractReports(
  address: string,
  network: string
): Promise<GetContractReportsResponse> {
  const base = getBaseUrl();
  const encAddr = encodeURIComponent(address);
  const encNet = encodeURIComponent(network);
  const url = base ? `${base}/contract/${encNet}/${encAddr}/reports` : `/api/contract/${encNet}/${encAddr}/reports`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
  return data;
}

export interface StartAuditResponse {
  ok: boolean;
  auditReport?: AuditReport;
  error?: string;
}

export interface ImportEvmbenchJobResponse {
  ok: boolean;
  auditReport?: AuditReport;
  error?: string;
}

export async function importEvmbenchJob(
  address: string,
  network: string,
  evmbenchJobId: string
): Promise<ImportEvmbenchJobResponse> {
  const base = getBaseUrl();
  const encAddr = encodeURIComponent(address);
  const encNet = encodeURIComponent(network);
  const url = base ? `${base}/contract/${encNet}/${encAddr}/audit/import` : `/api/contract/${encNet}/${encAddr}/audit/import`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ evmbench_job_id: evmbenchJobId }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
  return data;
}

export async function startAudit(
  address: string,
  network: string,
  openaiKey: string,
  model?: string
): Promise<StartAuditResponse> {
  const base = getBaseUrl();
  const encAddr = encodeURIComponent(address);
  const encNet = encodeURIComponent(network);
  const url = base ? `${base}/contract/${encNet}/${encAddr}/audit/start` : `/api/contract/${encNet}/${encAddr}/audit/start`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ openai_key: openaiKey, model: model || "codex-gpt-5.2" }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
  return data;
}

export interface SaveManualAuditReportResponse {
  ok: boolean;
  auditReport?: AuditReport;
  error?: string;
}

export async function saveManualAuditReport(
  address: string,
  network: string,
  markdown: string
): Promise<SaveManualAuditReportResponse> {
  const base = getBaseUrl();
  const encAddr = encodeURIComponent(address);
  const encNet = encodeURIComponent(network);
  const url = base ? `${base}/contract/${encNet}/${encAddr}/audit/manual` : `/api/contract/${encNet}/${encAddr}/audit/manual`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown: markdown.trim() }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
  return data;
}

export interface SaveManualReconReportResponse {
  ok: boolean;
  fuzzReport?: FuzzReport;
  error?: string;
}

export async function saveManualReconReport(
  address: string,
  network: string,
  markdown: string
): Promise<SaveManualReconReportResponse> {
  const base = getBaseUrl();
  const encAddr = encodeURIComponent(address);
  const encNet = encodeURIComponent(network);
  const url = base ? `${base}/contract/${encNet}/${encAddr}/recon/manual` : `/api/contract/${encNet}/${encAddr}/recon/manual`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ markdown: markdown.trim() }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
  return data;
}

export interface ScaffoldReconResponse {
  ok: boolean;
  repoUrl?: string;
  error?: string;
}

export async function scaffoldRecon(
  address: string,
  network: string
): Promise<ScaffoldReconResponse> {
  const base = getBaseUrl();
  const encAddr = encodeURIComponent(address);
  const encNet = encodeURIComponent(network);
  const url = base ? `${base}/contract/${encNet}/${encAddr}/recon/scaffold` : `/api/contract/${encNet}/${encAddr}/recon/scaffold`;
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data?.error || `HTTP ${resp.status}`);
  return data;
}
