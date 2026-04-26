"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "border-b border-border/60 bg-bg-primary/80 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
        <Link href="/" className="group flex items-center gap-2">
          <div className="relative h-8 w-8 overflow-hidden rounded-md ring-1 ring-border/60 transition group-hover:ring-accent/40">
            <Image
              src="/logo-black2.png"
              alt="Visualisa"
              width={32}
              height={32}
              className="object-cover"
              priority
            />
          </div>
          <span className="font-semibold tracking-tight text-text-primary">
            Visualisa
          </span>
          <span className="ml-1 rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-accent">
            secure
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-sm md:flex">
          <a href="#stats" className="text-text-muted transition hover:text-text-primary">
            Coverage
          </a>
          <a href="#how" className="text-text-muted transition hover:text-text-primary">
            How it works
          </a>
          <a href="#features" className="text-text-muted transition hover:text-text-primary">
            Features
          </a>
          <a href="#findings" className="text-text-muted transition hover:text-text-primary">
            Findings
          </a>
        </nav>

        <Link
          href="/dashboard"
          className="group inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-bg-primary shadow-[0_0_24px_-2px_rgba(0,255,157,0.6)] transition hover:bg-accent-soft hover:shadow-[0_0_32px_-2px_rgba(0,255,157,0.8)]"
        >
          Open Dashboard
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </header>
  );
}
