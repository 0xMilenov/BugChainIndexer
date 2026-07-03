"use client";

import type { ReactNode } from "react";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";

/**
 * Renders Plamen / ingest markdown (headings, lists, fenced code, inline code).
 * Scoped styles so it reads like documentation inside the audit panel.
 */
const components: Partial<Components> = {
  h1: ({ children }) => (
    <h4 className="mb-2 mt-4 border-b border-rule pb-1 text-base font-semibold text-body first:mt-0">
      {children}
    </h4>
  ),
  h2: ({ children }) => (
    <h4 className="mb-2 mt-4 border-b border-rule pb-1 text-base font-semibold text-body first:mt-0">
      {children}
    </h4>
  ),
  h3: ({ children }) => (
    <h5 className="mb-1.5 mt-3 text-sm font-semibold text-blue-text-soft first:mt-0">{children}</h5>
  ),
  h4: ({ children }) => (
    <h5 className="mb-1.5 mt-3 text-sm font-semibold text-body first:mt-0">{children}</h5>
  ),
  p: ({ children }) => (
    <p className="mb-2 text-[13px] leading-relaxed text-body/95 last:mb-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mb-2 ml-0.5 list-disc space-y-1.5 pl-4 text-[13px] leading-relaxed text-body/95 marker:text-faint">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-2 ml-0.5 list-decimal space-y-1.5 pl-4 text-[13px] leading-relaxed text-body/95 marker:text-faint">
      {children}
    </ol>
  ),
  li: ({ children }) => <li className="[&>p]:mb-1 [&>p:last-child]:mb-0">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-body">{children}</strong>,
  em: ({ children }) => <em className="italic text-body/90">{children}</em>,
  blockquote: ({ children }) => (
    <blockquote className="my-2 border-l-2 border-blue-600/40 bg-ink-0/60 py-1.5 pl-3 text-[13px] text-faint">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-rule" />,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-blue-text underline-offset-2 hover:text-blue-text-dim hover:underline"
    >
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="my-3 max-h-[min(28rem,70vh)] overflow-auto rounded-lg border border-rule bg-[#0d1117] p-3 text-[12px] leading-snug shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      {children}
    </pre>
  ),
  code: (props) => {
    const { className, children } = props as { className?: string; children?: ReactNode };
    const isFenced = Boolean(className && /language-[\w-]+/.test(className));
    if (isFenced) {
      return (
        <code
          className={`block whitespace-pre font-data text-[12px] leading-snug text-[#e6edf3] ${className || ""}`}
        >
          {children}
        </code>
      );
    }
    return (
      <code className="rounded-md bg-ink-2/90 px-1.5 py-0.5 font-data text-[12px] text-blue-text-soft [word-break:break-word]">
        {children}
      </code>
    );
  },
};

export function AuditMarkdown({ content }: { content: string }) {
  const trimmed = content?.trim();
  if (!trimmed) return null;
  return (
    <div className="audit-md [&>*:first-child]:mt-0">
      <ReactMarkdown components={components}>{trimmed}</ReactMarkdown>
    </div>
  );
}
