import type { Contract, Erc20Balance } from "@/types/contract";
import { NETWORK_NATIVE_CONFIG } from "./constants";

export function getContractName(row: Contract): string {
  const candidates = [row?.contract_name, row?.contractName, row?.name];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "Unnamed Contract";
}

export function getCanonicalContractName(row: Contract): string {
  const implementationCandidates = [
    row?.implementation_contract_name,
    row?.implementationContractName,
  ];
  for (const value of implementationCandidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return getContractName(row);
}

export function isVerifiedContract(row: Contract): boolean {
  return (
    row?.verified === true ||
    row?.verified === "true" ||
    row?.verified === 1
  );
}

export function isProxyContract(row: Contract): boolean {
  return (
    row?.is_proxy === true ||
    row?.isProxy === true ||
    row?.is_proxy === 1 ||
    row?.isProxy === 1
  );
}

export function getImplementationAddress(row: Contract): string | null {
  return row?.implementation_address || row?.implementationAddress || null;
}

export function getDeployTxHash(row: Contract): string | null {
  return row?.deploy_tx_hash || row?.deployTxHash || null;
}

export function getDeployerAddress(row: Contract): string | null {
  return row?.deployer_address || row?.deployerAddress || null;
}

export function getContractTimestamp(row: Contract): number | null {
  const raw =
    row?.deployed_at_timestamp ??
    row?.deployedAtTimestamp ??
    row?.deployed ??
    row?.deployed_at ??
    row?.deployedAt;
  let ts = Number(raw);
  if ((!Number.isFinite(ts) || ts <= 0) && typeof raw === "string") {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      ts = Math.floor(parsed / 1000);
    }
  }
  return Number.isFinite(ts) && ts > 0 ? ts : null;
}

export function formatContractDate(row: Contract): string {
  const ts = getContractTimestamp(row);
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Convert wei to display value using BigInt (avoids precision loss for large values). */
export function weiToDisplay(balance: string, decimals: number): number {
  try {
    const b = BigInt(balance || "0");
    const d = decimals ?? 18;
    const div = BigInt(10) ** BigInt(d);
    const whole = Number(b / div);
    const remainder = b % div;
    const frac2 = Number((remainder * BigInt(100)) / div);
    return whole + frac2 / 100;
  } catch {
    return Number(balance || 0) / Math.pow(10, decimals ?? 18);
  }
}

/** Sorted balance with symbol and display value. */
export interface Erc20BalanceWithValue {
  symbol: string;
  balance: string;
  decimals: number;
  value: number;
}

/** Sort balances by value (largest first), return with computed values. */
export function getSortedErc20Balances(balances: Erc20Balance[] | undefined): Erc20BalanceWithValue[] {
  if (!Array.isArray(balances) || !balances.length) return [];
  return balances
    .map((b) => ({
      ...b,
      decimals: b.decimals ?? 18,
      value: weiToDisplay(b.balance, b.decimals ?? 18),
    }))
    .sort((a, b) => b.value - a.value);
}

export function formatErc20Balances(
  balances: Erc20Balance[] | undefined,
  maxShow = 5
): string {
  if (!Array.isArray(balances) || !balances.length) return "-";
  const parts = balances.slice(0, maxShow).map((b) => {
    const val = weiToDisplay(b.balance, b.decimals ?? 18);
    return `${b.symbol}: ${val.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  });
  const more = balances.length > maxShow ? ` +${balances.length - maxShow} more` : "";
  return parts.join(" | ") + more;
}

export function formatFund(
  row: Contract,
  nativePrices: Record<string, number>
): string {
  const network = (row?.network || "").toLowerCase();
  const nativeCfg = NETWORK_NATIVE_CONFIG[network];
  const ETH_WEI = BigInt(10) ** BigInt(18);

  const formatNativeBalance = (rawFund: string | number | undefined, symbol: string) => {
    try {
      const wei = BigInt(String(rawFund ?? "0"));
      const wholeNative = wei / ETH_WEI;
      if (wholeNative < BigInt(1)) return `0 ${symbol}`;
      return `${wholeNative.toLocaleString("en-US")} ${symbol}`;
    } catch {
      return `0 ${symbol}`;
    }
  };

  const fmtUsdShort = (v: number) => {
    if (v == null || !Number.isFinite(v)) return "";
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
    return `$${Math.round(v)}`;
  };

  if (nativeCfg?.symbol) {
    const weiSource =
      row?.native_balance != null && row.native_balance !== ""
        ? row.native_balance
        : row?.fund != null &&
          Number(row.fund) >= 1e15 &&
          Number.isInteger(Number(row.fund))
        ? row.fund
        : null;
    return formatNativeBalance(weiSource ?? undefined, nativeCfg.symbol);
  }

  const rawValue = Number(row.fund);
  if (!Number.isFinite(rawValue)) return "-";
  if (nativeCfg && rawValue >= 1e15 && Number.isInteger(rawValue)) {
    const nativeAmount = rawValue / Math.pow(10, nativeCfg.decimals);
    const price = nativePrices[network];
    if (Number.isFinite(nativeAmount) && Number.isFinite(price) && price > 0) {
      return fmtUsdShort(nativeAmount * price);
    }
  }
  return fmtUsdShort(rawValue);
}

/**
 * True when the contract has a *completed* audit (the only state where
 * severity counts are meaningful). The listing endpoint now returns rows
 * for in-flight / failed audits too — those must NOT be treated as audited
 * for the purposes of the dashboard severity cells.
 */
export function hasCompletedAuditListing(row: Contract): boolean {
  if (row.audit_status === "completed") return true;
  // Fallback for older cached responses where audit_status wasn't sent yet:
  // a non-zero severity count is a reliable proxy for completion.
  const c = Number(row.critical_count);
  const h = Number(row.high_count);
  const m = Number(row.medium_count);
  if (
    (Number.isFinite(c) && c > 0) ||
    (Number.isFinite(h) && h > 0) ||
    (Number.isFinite(m) && m > 0)
  ) {
    return true;
  }
  return false;
}

/** One of the audit-row states surfaced inline on the dashboard. */
export type RowAuditState =
  | "completed"
  | "running"
  | "pending"
  | "failed"
  | "stalled"
  | "none";

/** Classify a row for inline rendering — see RowAuditState. */
export function getRowAuditState(row: Contract): RowAuditState {
  if (hasCompletedAuditListing(row)) return "completed";
  const s = (row.audit_status || "").toLowerCase();
  if (s === "running") return "running";
  if (s === "pending") return "pending";
  if (s === "failed") return "failed";
  if (s === "stalled") return "stalled";
  return "none";
}

/**
 * Dashboard cell: "-" if not audited; if audited, show count or "-" when zero for that severity.
 */
export function formatAuditSeverityCell(
  row: Contract,
  severity: "critical" | "high" | "medium"
): string {
  if (!hasCompletedAuditListing(row)) return "-";
  const n =
    severity === "critical"
      ? Number(row.critical_count)
      : severity === "high"
        ? Number(row.high_count)
        : Number(row.medium_count);
  const v = Number.isFinite(n) ? n : 0;
  return v > 0 ? String(v) : "-";
}
