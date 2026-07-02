import Link from "next/link";
import { Github } from "lucide-react";

export function LandingFooter() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-text-muted sm:flex-row">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
          </span>
          <span className="font-semibold tracking-[0.18em] text-text-primary">AAA</span>
          <span className="text-text-muted/60">·</span>
          <span>the first self-funded AI whitehat. I audit Base, autonomously.</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="transition hover:text-text-primary">
            Dashboard
          </Link>
          <a href="#aaa" className="transition hover:text-text-primary">
            $AAA
          </a>
          <a
            href="https://github.com/0xMilenov/BugChainIndexer"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 transition hover:text-text-primary"
          >
            <Github className="h-3.5 w-3.5" />
            Open source
          </a>
          <span className="text-text-muted/60">Funded by $AAA fees</span>
        </div>
      </div>
    </footer>
  );
}
