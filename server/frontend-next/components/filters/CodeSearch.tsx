"use client";

import { Code2 } from "lucide-react";
import { Button } from "../ui/Button";

interface CodeSearchProps {
  codeSnippet: string;
  onCodeSnippetChange: (value: string) => void;
  onCodeSearch: () => void;
  codeSearchLoading: boolean;
}

export function CodeSearch({
  codeSnippet,
  onCodeSnippetChange,
  onCodeSearch,
  codeSearchLoading,
}: CodeSearchProps) {
  const canSearch = codeSnippet.trim().length >= 5;

  return (
    <div>
      <label
        htmlFor="code-search"
        className="mb-2 block text-sm font-medium text-text-primary"
      >
        Search by Code
      </label>
      <textarea
        id="code-search"
        value={codeSnippet}
        onChange={(e) => onCodeSnippetChange(e.target.value)}
        placeholder="Paste Solidity/source snippet (min 5 chars)..."
        rows={4}
        className="w-full rounded-lg border border-border bg-bg-secondary px-4 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50 resize-y min-h-[80px]"
      />
      {codeSnippet.length > 0 && codeSnippet.length < 5 && (
        <p className="mt-1 text-xs text-text-muted">
          Enter at least 5 characters to search.
        </p>
      )}
      <Button
        variant="primary"
        className="mt-2 w-full"
        onClick={onCodeSearch}
        disabled={!canSearch || codeSearchLoading}
      >
        <Code2 className="h-4 w-4" />
        {codeSearchLoading ? "Searching..." : "Search by Code"}
      </Button>
    </div>
  );
}
