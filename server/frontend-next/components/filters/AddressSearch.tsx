"use client";

import { Search } from "lucide-react";
import { Input } from "../ui/Input";
import { useFilters } from "@/context/FilterContext";

export function AddressSearch() {
  const { filters, setAddress } = useFilters();
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-text-primary">
        Search by Address
      </label>
      <Input
        id="address-search"
        icon={<Search className="h-4 w-4" />}
        type="text"
        placeholder="Enter contract address..."
        value={filters.address}
        onChange={(e) => setAddress(e.target.value)}
      />
    </div>
  );
}
