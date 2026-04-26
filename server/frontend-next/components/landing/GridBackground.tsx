"use client";

/**
 * Animated grid + radial-glow backdrop for the landing page hero. Pure CSS,
 * no JS. The grid is a tight dotted/lined pattern with a radial-mask centered
 * on the hero text; the glow underneath gives the "neon halo" feel.
 *
 * Sized to fill the viewport up to ~110vh so it covers the full hero without
 * jumping at section boundaries.
 */
export function GridBackground() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {/* Animated radial glow */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[80vh] w-[80vh] rounded-full bg-[radial-gradient(circle_at_center,_rgba(0,255,157,0.18)_0%,_rgba(0,255,157,0.05)_30%,_transparent_70%)] blur-3xl animate-pulse-slow" />

      {/* Secondary cyan-amber glow for depth */}
      <div className="absolute -right-32 -bottom-32 h-[40vh] w-[40vh] rounded-full bg-[radial-gradient(circle_at_center,_rgba(255,184,0,0.10)_0%,_transparent_70%)] blur-3xl" />

      {/* Subtle vertical gradient overlay so the bottom of the hero blends out */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[var(--bg-primary)]" />

      {/* Grid lines */}
      <div className="absolute inset-0 [background-image:linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

      {/* Noise overlay for texture */}
      <div className="absolute inset-0 opacity-[0.025] mix-blend-overlay [background-image:url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22><filter id=%22n%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/></filter><rect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.6%22/></svg>')]" />
    </div>
  );
}
