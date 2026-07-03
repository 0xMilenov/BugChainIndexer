"use client";

/**
 * Dossier v2 hero backdrop. Presentational only, no props.
 *
 * Reproduces the mockup `.hero-bg`:
 *  - a content-sized radial halo (rgba(0,82,255,.08) → transparent) anchored
 *    toward the text column (top:10%, left:-10%, 56rem × 36rem);
 *  - a 96px accent-tinted (rgba(0,82,255,.04)) grid masked toward the text
 *    column via a radial ellipse mask;
 *  - the single 14s signal sweep line (.d-sweep, self-styled in globals.css).
 *
 * The rgba() values are written without internal spaces so Tailwind's
 * arbitrary-value parser does not split them on whitespace (the original bug).
 */
export function GridBackground() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Content-sized radial halo toward the text column */}
      <div
        className="absolute"
        style={{
          top: "10%",
          left: "-10%",
          width: "56rem",
          height: "36rem",
          background:
            "radial-gradient(closest-side, rgba(0,82,255,0.08), transparent 70%)",
        }}
      />

      {/* 96px accent-tinted grid, masked toward the text column */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0,82,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,82,255,0.04) 1px, transparent 1px)",
          backgroundSize: "96px 96px",
          maskImage:
            "radial-gradient(ellipse 90% 70% at 30% 40%, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 90% 70% at 30% 40%, black 30%, transparent 75%)",
        }}
      />

      {/* 14s signal sweep line */}
      <div className="d-sweep" />
    </div>
  );
}
