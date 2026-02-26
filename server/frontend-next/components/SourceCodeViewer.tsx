"use client";

import dynamic from "next/dynamic";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

const SyntaxHighlighter = dynamic(
  () => import("react-syntax-highlighter").then((mod) => mod.Prism),
  { ssr: false }
);

interface SourceCodeViewerProps {
  code: string;
}

export function SourceCodeViewer({ code }: SourceCodeViewerProps) {
  return (
    <SyntaxHighlighter
      language="solidity"
      style={oneDark}
      customStyle={{
        margin: 0,
        padding: "1rem",
        background: "var(--bg-secondary)",
        fontSize: "0.75rem",
        lineHeight: 1.5,
      }}
      codeTagProps={{ style: { fontFamily: "var(--font-geist-sans)" } }}
      showLineNumbers
    >
      {code}
    </SyntaxHighlighter>
  );
}
