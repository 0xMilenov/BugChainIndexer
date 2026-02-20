"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { NETWORK_KEYS, NETWORK_DISPLAY_NAMES } from "@/lib/constants";

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

function isValidAddress(addr: string): boolean {
  const trimmed = addr.trim();
  return trimmed.length > 0 && EVM_ADDRESS_REGEX.test(trimmed);
}

export interface AddContractModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onSubmit: (address: string, network: string) => Promise<void>;
  showToast: (msg: string, type: "success" | "error" | "info") => void;
}

export function AddContractModal({
  open,
  onClose,
  onSuccess,
  onSubmit,
  showToast,
}: AddContractModalProps) {
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState(NETWORK_KEYS[0] || "ethereum");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError(null);
      const trimmedAddr = address.trim();
      if (!isValidAddress(trimmedAddr)) {
        setError("Enter a valid contract address (0x + 40 hex characters)");
        return;
      }
      if (!network) {
        setError("Select a network");
        return;
      }
      setLoading(true);
      try {
        await onSubmit(trimmedAddr, network);
        showToast("Contract added successfully.", "success");
        setAddress("");
        setNetwork(NETWORK_KEYS[0] || "ethereum");
        onSuccess();
        onClose();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to add contract";
        setError(msg);
        showToast(msg, "error");
      } finally {
        setLoading(false);
      }
    },
    [address, network, onSubmit, onSuccess, onClose, showToast]
  );

  const handleClose = useCallback(() => {
    if (!loading) {
      setError(null);
      onClose();
    }
  }, [loading, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-md rounded-xl border border-border bg-bg-secondary p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-text-primary mb-4">
          Add Verified Contract
        </h2>
        <p className="text-sm text-text-muted mb-4">
          Enter a verified smart contract address and select the chain. The
          contract must be verified on the block explorer with source code
          available.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="add-contract-address"
              className="block text-sm font-medium text-text-muted mb-1"
            >
              Contract Address
            </label>
            <Input
              id="add-contract-address"
              type="text"
              placeholder="0x..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </div>
          <div>
            <label
              htmlFor="add-contract-network"
              className="block text-sm font-medium text-text-muted mb-1"
            >
              Network
            </label>
            <select
              id="add-contract-network"
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
            >
              {NETWORK_KEYS.map((key) => (
                <option key={key} value={key}>
                  {NETWORK_DISPLAY_NAMES[key] || key}
                </option>
              ))}
            </select>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={loading}>
              {loading ? "Adding..." : "Add Contract"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
