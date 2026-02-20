import type { Contract } from "@/types/contract";
import {
  getContractName,
  getContractTimestamp,
} from "./contract-utils";

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
      case "deployed":
        valA = getContractTimestamp(a) || 0;
        valB = getContractTimestamp(b) || 0;
        break;
      case "fund":
        valA = Number(a.native_balance ?? a.fund) || 0;
        valB = Number(b.native_balance ?? b.fund) || 0;
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
