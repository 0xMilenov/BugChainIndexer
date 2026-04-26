import type { Contract } from "@/types/contract";
import { getContractName } from "./contract-utils";

export function sortResults(
  rows: Contract[],
  column: string,
  direction: "asc" | "desc"
): Contract[] {
  const sorted = [...rows];
  sorted.sort((a, b) => {
    let valA: string | number;
    let valB: string | number;

    switch (column) {
      case "address":
        valA = (a.address || "").toLowerCase();
        valB = (b.address || "").toLowerCase();
        break;
      case "name":
        valA = getContractName(a).toLowerCase();
        valB = getContractName(b).toLowerCase();
        break;
      case "network":
        valA = (a.network || "").toLowerCase();
        valB = (b.network || "").toLowerCase();
        break;
      case "fund":
        valA = Number(a.native_balance ?? a.fund) || 0;
        valB = Number(b.native_balance ?? b.fund) || 0;
        break;
      case "critical":
        valA = Number(a.critical_count) || 0;
        valB = Number(b.critical_count) || 0;
        break;
      case "high":
        valA = Number(a.high_count) || 0;
        valB = Number(b.high_count) || 0;
        break;
      case "medium":
        valA = Number(a.medium_count) || 0;
        valB = Number(b.medium_count) || 0;
        break;
      default:
        return 0;
    }

    if (valA < valB) return direction === "asc" ? -1 : 1;
    if (valA > valB) return direction === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}
