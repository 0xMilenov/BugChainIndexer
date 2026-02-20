"use client";

import { Hash } from "lucide-react";
import { Input } from "../ui/Input";
import { useFilters } from "@/context/FilterContext";

export function NameSearch() {
  const { filters, setName } = useFilters();
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-text-primary">
        Search by Contract Name
      </label>
      <Input
        id="name-search"
        icon={<Hash className="h-4 w-4" />}
        type="text"
        placeholder="Enter contract name..."
        value={filters.name}
        onChange={(e) => setName(e.target.value)}
      />
    </div>
  );
}
