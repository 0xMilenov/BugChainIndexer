"use client";

export function LoadingSkeleton() {
  const skeletonRows = Array(10)
    .fill(0)
    .map((_, i) => (
      <tr key={i} className="border-b border-border">
        <td className="px-4 py-3">
          <div className="skeleton h-4 w-32" />
        </td>
        <td className="px-4 py-3">
          <div className="skeleton h-4 w-48" />
        </td>
        <td className="px-4 py-3">
          <div className="skeleton h-6 w-24" />
        </td>
        <td className="px-4 py-3">
          <div className="skeleton h-4 w-28" />
        </td>
        <td className="px-4 py-3">
          <div className="skeleton ml-auto h-4 w-20" />
        </td>
        <td className="px-4 py-3">
          <div className="skeleton h-4 w-24" />
        </td>
        <td className="px-4 py-3">
          <div className="skeleton mx-auto h-4 w-4 rounded" />
        </td>
        <td className="px-4 py-3">
          <div className="skeleton mx-auto h-4 w-4 rounded" />
        </td>
      </tr>
    ));

  const skeletonCards = Array(6)
    .fill(0)
    .map((_, i) => (
      <div key={i} className="rounded-xl border border-border bg-bg-secondary p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-6 w-24" />
        </div>
        <div className="mt-2">
          <div className="skeleton h-4 w-40" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="skeleton h-8 w-full" />
          <div className="skeleton h-8 w-full" />
        </div>
      </div>
    ));

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-secondary">
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-full text-sm">
          <thead className="bg-bg-tertiary text-text-muted">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Address
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Contract Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                Network
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                Deployed
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider">
                Native
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider">
                ERC-20 Tokens
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                EVMBENCH
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider">
                GETRECON
              </th>
            </tr>
          </thead>
          <tbody>{skeletonRows}</tbody>
        </table>
      </div>
      <div className="grid grid-cols-1 gap-3 p-3 sm:hidden">{skeletonCards}</div>
    </div>
  );
}
