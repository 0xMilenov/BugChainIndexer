# AAA Landing Redesign — "The Dossier"

> UI/UX redesign proposal for theaaa.xyz. Produced 2026-07-03 from a 9-agent design
> workflow: full component inventory → 3 competing directions (mission-control /
> editorial-dossier / obsidian-depth) → 3-lens judge panel (brand, trust, engineering).
> **"The Dossier" won unanimously** (43 / 44 / 44.5 vs. 41 / 41 / 42 and 36 / 39 / 35),
> with specific grafts absorbed from the two runners-up (noted inline).
> Visual mockup: see the published artifact "AAA — The Dossier · Redesign Mockup".
>
> Scope: UI/UX only. No security logic, no backend changes. Stack stays
> Next.js 16 + Tailwind 4 + framer-motion 12 + lucide-react. All live data used
> below (`location`, `completed_at`, `generated_at`, per-severity counts) is already
> fetched by `lib/landing.ts` — most of it is currently thrown away by the UI.

---

## 0. Ship-first bug fix: the glow layer is dead code

Six Tailwind arbitrary-value classes contain literal spaces inside `rgba(0, 82, 255, …)`.
Tailwind arbitrary values cannot contain unescaped spaces — the class splits at each
space and **silently fails to compile**. The site's entire "Base-blue glow" layer never
renders in production:

| File | What never renders |
|---|---|
| `components/landing/Hero.tsx:75` | Primary CTA glow shadow (rest + hover) |
| `components/landing/LiveStats.tsx:96` | Stat-card hover radial |
| `components/landing/HowItWorks.tsx:95` | Step icon-tile glow |
| `components/landing/FeatureBento.tsx:119` | Anchor bento tile glow |
| `components/landing/GridBackground.tsx:18` | **The main hero halo** |

Part of why the site "feels flat" is that it literally is flatter than designed.
The redesign fixes this *by construction*: all glows become CSS custom-property
tokens (`--glow-blue`, `--shadow-*`), so the whitespace-in-arbitrary-value bug class
cannot recur.

---

## 1. Diagnosis (why the current page reads generic)

1. **One surface everywhere.** `rounded-2xl border border-border/60 bg-bg-secondary/40 backdrop-blur`
   appears verbatim on ~10 different components. There is exactly one card in the
   whole design; nothing has hierarchy because everything has the same weight.
2. **One typeface, one weight-range, doing every job.** Geist `font-semibold` is the
   display face, the body face, and the data face. At 5.5rem the headline reads like
   enlarged body text. `--font-mono` is aliased to *the sans* in `globals.css:30`, so
   even the "mono" isn't mono.
3. **One motion.** Every element enters with the same fade + translateY and the same
   easing `[0.22, 1, 0.36, 1]`. Nothing on the page behaves like a *live agent* — the
   numbers could be a static screenshot. `completed_at`, `generated_at`, and finding
   `location` (file:line — the most credible string a security product can render)
   are fetched and never displayed.
4. **The tokenomics is a generic stacked bar** with a disconnected color-square legend
   and inline hex colors — the single section the brief calls "very important" for
   trust gets the least-designed visualization on the page.
5. **Severity — the product's core taxonomy — has no design tokens.** Raw
   `red-400`/`amber-400` Tailwind palette leaks, binary crit/other split in the
   marquee, ghosted zero-count pills.

---

## 2. The direction: THE DOSSIER

The site is not a SaaS landing page — it is a **classified field report, authored in
first person by the agent, declassified for the public one section at a time.**
Numbered sections (00–05), a running file reference (`AAA/FR-2026`), typeset serif
display against typewriter mono data, redaction bars that lift to reveal the
headline, findings presented as case files with severity spines.

Why it fits: AAA's entire claim is *documentary* — "I audited this contract, here is
the finding, here is the PoC that proves it." A document aesthetic makes the proof
the brand. First-person voice reads naturally as an author's voice on a report,
where it reads as a gimmick on a generic card grid.

The premium tension: **editorial warmth (serif, whitespace, footnotes) against
machine coldness (mono data, Base-blue signal light, live timestamps).** The serif
says "authored." The mono says "verified."

Judges' one-line rationale: only direction with no obvious lookalike in crypto;
tokenomics borrows the grammar of actual financial disclosure; signature moments are
the most degradation-proof to build (no WebGL, no canvas, no cursor-tracked borders).

---

## 3. Design tokens

Single source of truth in `@theme` in `globals.css` (delete the duplicated `:root`
block — Tailwind 4 generates the CSS vars from `@theme`).

### 3.1 Color — "Ink & Signal"

Backgrounds are ink-blue-black (2–3% blue cast ties the dark field to Base blue
without using blue as a background).

```css
/* paper stack */
--ink-0: #06070B;  /* page */          --ink-1: #0B0D13;  /* section alt, footer */
--ink-2: #11141C;  /* card resting */  --ink-3: #171B26;  /* raised / hover */
--ink-4: #1E2331;  /* pressed / wells */

/* hairlines — the dossier is drawn in rules, not boxes */
--rule: #1F2432;  --rule-strong: #2C3245;  --rule-accent: #0052FF52;
/* dotted leaders: 1px dotted #3A4157 */

/* text */
--paper: #F2F3F7; /* display, key numbers */   --body: #C7CBD6; /* prose — not pure white */
--dim:   #8A90A2;                              --faint: #5A6072;
--ghost: #3B4152; /* redaction fills, watermarks */

/* Base-blue ramp (the only saturated brand hue) */
--blue-950:#001233; --blue-900:#00246B; --blue-700:#0041CC;
--blue-600:#0052FF; /* core: CTA, active rules, stamps */
--blue-500:#3D7BFF; --blue-400:#7AA5FF; --blue-300:#B0C9FF;
--signal:  #57D7FF; /* cyan "live" ONLY: dots, timestamps, sweep. Never buttons. */

/* severity (new — the product's core taxonomy) */
--sev-critical:#FF4757; --sev-high:#FF8A3D; --sev-medium:#FFC24D;
--sev-low:#4DA3FF;      --sev-info:#8A90A2;   /* wells: same hex at 14 alpha */

/* tokenomics allocations */
--alloc-audit:#0052FF; --alloc-burn:#FF6B3D; /* ember — burn is fire, not blue #2 */
--alloc-dev:#7AA5FF;   --alloc-stake:#57D7FF; --alloc-growth:#8A90A2;
```

Rules: `signal` cyan never appears at rest except live indicators. Amber `#ffb800`
retires (splits into `sev-medium` + `alloc-burn`). Raw palette leaks
(`red-400`, `amber-400`) are replaced by `sev-*`.

### 3.2 Typography — three faces, three jobs

| Role | Face | Load | Job |
|---|---|---|---|
| Display serif | **Fraunces** (variable, `opsz` auto, weights 300–600, + italic) | `next/font/google` | Headlines, section titles, wordmark. The single most important change on the page. |
| UI sans | **Geist** (already loaded) | keep | Body, card titles, buttons. |
| Data mono | **Geist Mono** (400/500) | `next/font/google` — and fix the `--font-mono` alias in `globals.css:30` | Addresses, file:line, timestamps, labels, all numbers. |

Scale (name → size / leading / tracking / face):

- `display-xl` — `clamp(3.5rem, 8vw, 7rem)` / 0.98 / −0.015em / Fraunces 340 — hero only
- `display` — `clamp(2.25rem, 4.5vw, 3.75rem)` / 1.04 / −0.01em / Fraunces 380 — section H2
- `title` — 1.75rem / 1.15 / Fraunces 440 — panel H3
- `heading` — 1.125rem / 1.3 / Geist 600 — card titles
- `body` — 1rem / 1.65 / Geist 400, `--body` color, `max-w-[62ch]`
- `label` — 11px / 0.14em tracking / Geist Mono 500 UPPERCASE — eyebrows, metadata
- `data-lg` — `clamp(2.5rem, 4vw, 3.5rem)` / 1 / Geist Mono 500 `tabular-nums` — counters
- `data` — 13px / Geist Mono 400 `tabular-nums` — addresses, timestamps, file:line
- `footnote` — 12px / Geist Mono 400 / `--faint`

Discipline that *is* the hierarchy: serif never below `title` size; mono never for
prose; `font-variant-numeric: tabular-nums` on every numeric element.

### 3.3 Spacing, radius, elevation, motion

- Section rhythm: `--space-section: clamp(7rem, 12vh, 10rem)` (up from py-24).
  One container: `max-w-6xl` everywhere (kill the 7xl drift). 12-col grid,
  **asymmetric**: prose cols 1–7, metadata cols 9–12. Nothing centered except the
  final CTA.
- Radius: 2px (stamps/tags) · 6px (buttons/inputs) · 10px (cards) · 16px (panels).
  **`rounded-full` is banned** except the live dot. Pills become 2px-radius mono tags.
- Elevation: borders carry structure, shadows carry state.
  `--shadow-1/2/3` (rest / hover-lift / modal+nav), `--glow-blue` (CTA/active),
  `--glow-signal` (live dots), `--well` (inset recess for terminals/log bays —
  *graft from obsidian-depth*: evidence is engraved into the page, claims are raised
  above it). Higher elevation = lighter surface (`ink-2 → ink-3`).
- Motion tokens: `--dur-1..4` = 120/240/480/900ms; `--ease-out: cubic-bezier(.16,1,.3,1)`
  for entrances; `--ease-inout: cubic-bezier(.65,0,.35,1)` for slides; spring
  `{stiffness:420, damping:30}` for hover lifts. `prefers-reduced-motion`: entrances
  become opacity-only, marquee/sweep pause, counters render final instantly.

---

## 4. Section-by-section

### 4.0 Global chrome — File Header + spine
Every section opens with the same left-aligned apparatus (replaces centered
`SectionHeader`):

```
—— 01 ·· COVERAGE ————————————————————— AAA/FR-2026 ——
What I've covered so far.
```

Mono section number + name; a 1px rule that draws in on scroll (`scaleX` 0→1);
`AAA/FR-2026` file ref in `--ghost` at the right end; `display` serif heading below,
left-aligned, first-person. On ≥1360px the section numbers 00–05 also hang in a left
spine gutter as ghost mono — a table-of-contents skeleton as you scroll.

### 4.1 Nav — "the file tab" + Telemetry Rail *(graft: mission-control)*
- `h-14` compact bar. Left: `AAA` in Fraunces 440 + mono suffix `/ AUTONOMOUS AUDIT
  AGENT` + a 6px **breathing signal square** (2.4s opacity pulse — replaces
  `animate-ping`, which reads alarm-clock). Center: 5 numbered mono links with
  scroll-spy underline sliding via framer `layoutId`. Right: rectangular blue CTA.
- **Scrolled state:** background blur + hairline + shadow, and the wordmark suffix
  swaps to a live readout `LIVE · {audits.total} AUDITS · {N} MIN AGO` in signal cyan
  — the nav becomes an instrument once you leave the hero.
- **Telemetry Rail (new):** a 32px strip under the nav (scrolls away) cycling real
  data every 6s: indexed count · last audit relative time · findings/critical count ·
  snapshot UTC. Zero backend work — all fields already fetched. This is the cheapest
  possible proof of "autonomous and running right now."
- Mobile: full-screen sheet, links stacked in serif with mono numbers (fixes the
  current no-mobile-nav hole).

### 4.2 Hero — "the cover page" (Section 00)
Asymmetric 12-col, **nothing centered**:
- Cols 1–8: mono classification line `FIELD REPORT · AAA/FR-2026 · BASE MAINNET ·
  [ACTIVE]`; headline in `display-xl` Fraunces:
  *"I hunt smart-contract bugs on Base."* / *"On my own."* — the thesis line on its
  own row in italic `--blue-500`, the only styled phrase.
- **Signature moment ① — THE UNREDACTION.** Each headline line arrives covered by a
  solid `--ghost` bar; bars retract right-to-left (`scaleX` 1→0, origin right,
  staggered 140ms) with a 1px signal hairline at the leading edge. The headline is
  *declassified*, not faded in. Reduced-motion → plain fade.
- Sub-copy `max-w-[46ch]`; CTA row = one primary rectangle (blue-600, glow on hover,
  −2px spring lift) + one **text link** secondary ("Read how I work ↓", dotted
  underline). Dominance restored — no more twin pills.
- Cols 9–12: **the Manifest** (replaces the stats strip) — a front-matter panel of
  mono key-value rows with dotted leaders: contracts / audits / findings / networks /
  `LAST ENTRY · 3 MIN AGO ●`. Values count up magnitude-aware from 90%. The live
  recency line uses `recent_audits[0].completed_at` — currently unrendered.
- Background: fixed halo (token-based, actually renders now), 96px accent-tinted
  grid masked toward the text, and a 1px signal **sweep line** traversing the
  viewport every 14s — one of exactly three ambient motions sitewide.

### 4.3 Live Coverage — Section 01
1 + 3 asymmetric grid replacing four identical cards:
- **Dominant panel "Findings on file"** (cols 1–7): total findings in `data-lg`, then
  the **severity register** *(graft: mission-control)* — one horizontal bar per
  severity over a `blue-950` track, widths proportional to real counts, tabular
  counts right-aligned, the critical numeral glowing red. Footnote `¹ every
  critical/high is PoC-verified before filing.`
- Three stacked instrument rows (cols 8–12): contracts / audits / networks — mono
  label, `data-lg` value, one context line, 28px tinted icon chip.
- Hover everywhere: border→`rule-strong`, surface→`ink-3`, −2px lift + `--shadow-2`.

### 4.4 How It Works — Section 02 "Procedure"
Kill the zig-zag and the 192px empty icon tiles. **Sticky index + scrolling
exhibits:** left (cols 1–4, sticky) three serif index entries with a sliding 2px
blue rule driven by scroll; right (cols 6–12) three steps, each with a *real
exhibit* in a recessed well instead of a lucide icon in a void:
1. **I index** — terminal panel streaming plausible index rows (looping translateY).
2. **You look up** — a search input that types itself (`steps()`), then snaps in a
   result row with severity stamps.
3. **I audit on demand** — 8 phase nodes lighting sequentially on a rule +
   `[POC-PASS] exploit reproduced · finding filed` terminal line. Engine spec
   becomes footnote `² 40–100 agents · 8 phases · PoC-verified`.

### 4.5 Capabilities — Section 03
10 paragraph-tiles become a **6-tile evidence bento** (merge the four weakest
claims). Anchor tile (7×2): a mini forge-test terminal ending in a `[POC-PASS]`
stamp. Others: 14 chain tags (base in a lit blue well), the 8-node pipeline strip,
a micro fee-ledger linking to §04, two live wire minis from `latest_findings`, the
five severity stamps. Rule: every tile *shows*; paragraphs ≤ 1 sentence. Hover
re-animates the tile's payload once.

### 4.6 $AAA Tokenomics — Section 04 "Allocation" (the trust centerpiece)
Frame: a page from the file titled **"Where the fees go."** One body line: "Every
swap of $AAA carries a 1.2% fee. I don't take a salary — the fee funds the work.
Here's the full split, on the record."

**Signature moment ② — THE ALLOCATION LEDGER** (replaces the flat 20px bar + legend):
- Row 0: full-width `INFLOW · 1.2% SWAP FEE · 100%` source bar (`blue-950` well,
  `blue-600` top rule). A trunk + elbow connectors draw down to five rows on scroll.
- Rows 1–5, largest first, each a full-width ledger line: **the percentage's type
  size is proportional to its share** (45% at 3.5rem down to 5% at 1.75rem — big
  money literally looks big, ~2× ratio so it stays honest); allocation name + one
  purpose line; a fill bar in the allocation color growing `scaleX` 0→pct staggered
  top→bottom. The burn row's ember bar gets the only pulse — the allocation that
  *destroys* supply gets the only living treatment.
- **Arithmetic-transparency hover** *(graft: mission-control — the judges' single
  highest-yield trust move)*: hovering/focusing a row reveals
  `45% of 1.2% = 0.54% of every swap`. Rows are keyboard-focusable.
- Below: the **flywheel drawn as an actual loop** (4 nodes + a dashed return arc
  labeled `↺ audits → credibility → volume`); utility as a 5-row dotted-leader
  ledger list (kills the 2-col grid with an orphan); **Bounty Wallet as a manifest
  exhibit** (address well + copy affordance + `Goes to creator 100% / Chain Base /
  Separate from fee split` key-values); and an **honest** outlined "Buy $AAA on
  Bankr `[ SOON ]`" button instead of the washed fake-primary.

### 4.7 Live Findings — Section 05 "The Wire + Case Files"
- **The Wire:** full-bleed newswire strip (not uniform rectangles): each entry =
  mono timestamp in signal + severity **stamp** (full 5-tier color, not binary) +
  title + **`location` file:line** (finally rendered — the most credible string on
  the site) + short address · network, separated by dotted `··`. 48s linear; hover
  pauses and dims siblings so entries are actually clickable; fixed `● LIVE` tag at
  the left edge.
- **Case Files:** featured 6-col card + 3-col cards. Card anatomy: mono file id
  `CASE · BASE · 0x…`, contract name, `completed_at` relative time (signal dot if
  <1h), a 3px **severity spine** on the left edge colored by highest severity
  (instant triage read across the grid; widens to 5px on hover), segmented severity
  micro-bar with **zero-count severities omitted** — clean audits look clean.

### 4.8 Sign-off + Colophon
The one deliberately centered moment: `END OF BRIEFING · AAA/FR-2026`, serif
"I'm already working. Come watch.", the live contract count as an inline mono stat
stamp, primary CTA + text link. Footer as a colophon: wordmark + first-person
tagline + `FUNDED BY $AAA FEES` stamp / section index 00–05 / record column
(GitHub, Basescan, `$AAA CONTRACT · 0x… (at launch)`, `Not financial advice.`,
`AAA/FR-2026 · BUILD {commit}`).

---

## 5. Motion language — five rules

1. **Reveal, don't just fade.** Headlines unredact, rules draw, bars fill, connectors
   trace. Fade+rise is the fallback for body copy only.
2. **One easing per job.** Expo-out for entrances, ease-in-out for slides/moves,
   spring for hover lifts. Never mixed.
3. **Hover always rewards:** −2/−3px lift + shadow + border-strengthen; payload tiles
   re-animate once.
4. **Live things breathe; the rest is still.** Exactly three ambient motions
   sitewide: the breathing signal dot, the 14s sweep line, the data loops
   (wire/index stream). Scarcity is what makes "live" read as live.
5. **Numbers earn their count.** Tabular-nums everywhere, magnitude-aware duration,
   count from 90% of value, `once: true`, reduced-motion renders final instantly.
   ("Data is the last thing to move and the first thing to be true.")

---

## 6. What we delete

- The six broken `rgba(0, 82, 255,…)` arbitrary classes → glow/shadow tokens.
- The single card recipe (~10 sites) → ink surface scale + rule system.
- `rounded-full` everywhere → 2px mono tags (live dot excepted).
- Centered `SectionHeader` → left File Header (centering reserved for sign-off).
- Zig-zag HowItWorks + empty icon tiles → sticky index + exhibits.
- Flat tokenomics bar + disconnected legend + inline hexes → Allocation Ledger.
- 10-tile paragraph bento → 6-tile evidence bento.
- `animate-ping`, the amber corner glow, raw palette leaks → signal square + `sev-*`.
- `--font-mono` aliased to sans → real Geist Mono. `font-semibold` display → Fraunces.
- Ghosted zero-count pills, the washed fake-primary "Buy" button, `max-w-7xl` drift.

---

## 7. Guardrails (from the judge panel)

1. **Ration the costume.** Stamps, file refs, redactions: the dossier grammar tips
   into spy-theme-park if used more than once or twice per viewport. The props list
   is fixed: classification line (hero), file refs (section rules), stamps
   (severity + SOON only), redaction (hero once).
2. **Liveness is load-bearing.** Without the telemetry rail, nav live readout, wire
   timestamps, and manifest recency line, a document aesthetic reads *archival*.
   These grafts are not optional.
3. **No staged exhibits with fake precision.** Wire entries, case files, and the
   terminal demos must render real rows from `latest_findings` / `recent_audits` in
   production. A security audience screenshots fabricated exhibits.
4. **Fraunces is a discipline bet.** Serif never below `title` size, three-face
   separation strictly enforced, `WONK 0` / `SOFT 0` axes. If the ratio slips, the
   direction degrades to "dark blog with a serif."
5. **Proportional percentages must stay honest** (~2× visual ratio 45%→5%), and the
   ledger animation must never gate comprehension — numbers legible immediately,
   choreography as garnish.
6. **Reduced-motion is a first-class complete render** — pre-drawn ledger, static
   signal — stated as a brand-values position for a security product.

---

## 8. Implementation order

1. **Day 1 — tokens + fonts + bug fix.** New `@theme` block, Fraunces + Geist Mono
   via `next/font`, kill the 6 broken classes, severity tokens. Transforms every
   page including the dashboard.
2. **Telemetry Rail + nav.** Highest trust-per-line-of-code component; needs only
   already-fetched fields.
3. **Hero** (unredaction + manifest + rebuilt GridBackground).
4. **Coverage** (1+3 grid + severity register).
5. **Allocation Ledger** — highest-effort, highest-payoff; everything it needs
   (scaleX draws, scroll choreography) is framer-motion native.
6. **Wire + Case Files**, then **Procedure** exhibits, then **bento consolidation**,
   sign-off, colophon.

Each step is independently shippable; the token layer (step 1) is the only
prerequisite for the rest.

---

## 9. v2 — Readability & contrast calibration (2026-07-03)

Second pass after the v1 mockup shipped. Client feedback: text too small/grey,
strains the eyes over long reads; still slightly flat. Produced by 3 lens critics
(typography, contrast, depth) + a discipline skeptic. All discipline rules from §7
preserved. Every number below is a measured WCAG ratio.

### 9.1 Text tier tokens (the core fix)
The v1 problem was not the tokens but that information-carrying text sat on tiers
that fail AA. New ramp (values are contrast on the card surface):

| Token | v1 | v2 | v1 → v2 on card |
|---|---|---|---|
| `--body` | `#C7CBD6` | `#DDE1EA` | 11.4:1 → **13.8:1** |
| `--dim` | `#8A90A2` | `#B0B6C7` | 5.8:1 → **8.9:1** |
| `--faint` | `#5A6072` (AA fail) | `#828AA0` | 2.9:1 → **5.25:1** |
| `--ghost` | `#3B4152` | unchanged, **decoration only** | — |

**Usage law (enforced):** paragraphs never below `body`; sentences/sub-copy on
`dim`; ≤1-line metadata on `faint`; `ghost` may never touch a glyph the reader must
read. Every v1 spot where `faint`/`ghost` carried information (ledger purpose lines,
manifest keys, footnotes, pipeline phase names, finding file:line, case addresses,
flywheel copy) was promoted a tier. Body is capped at 15.4:1 on the darkest surface
to avoid white-hot glare — brighter is not better on OLED.

### 9.2 New semantic tokens
- `--sev-crit-text #FF6B78`, `--sev-low-text #66B1FF` — legible glyph variants
  (v1 `#FF4757` crit failed AA on its own tint at stamp size). **Bar/spine fills keep
  the saturated hexes**; only text splits off.
- `--blue-text #5E90FF` — for sub-14px blue (section numbers, eyebrows); v1
  `--blue-500` was 4.8:1 at 11px. Large blue (hero thesis line) keeps blue-500.
- `--track #070910` — **achromatic** bar track replacing `--blue-950`. The v1 blue
  track read as a competing second data series (the 21-count CRIT row looked like an
  8%-red / 92%-blue bar). Tracks now use `--groove` (inset shadow) so empty = a carved
  channel, and the only chromatic pixel in any bar is the fill.

### 9.3 Type scale (larger + looser, not heavier)
Prose 16→17px / lh 1.65→1.7 on `body`. Hero lede 17→18px. Card notes/context lines
13–13.5→14px on `dim` (500 weight below 14px where Geist thins on dark). Data/mono
13→14px. `.label` 11→12px. Pipeline phase labels 9.5px ghost → 10.5px `dim` (they're
the product's core pipeline, not decoration). Footnotes: **mono → sans** (they're
sentences — mono-for-prose violation fixed); the ¹/² marker stays mono via `.fmark`.
Procedure index promoted to title size on desktop, becomes sans chips on mobile
(serif now never appears below title size — a v1 violation).

### 9.4 Depth & rhythm (the "still flat" fix)
- Surfaces lifted: `--ink-2 #11141C → #121620` (card-vs-page separation 1.09 → 1.11);
  `--rule` brightened `#1F2432 → #242B3B` (1.42:1 edge). Rim-light `--rim` (inset top
  highlight) added to every raised card. Cards now visibly sit above the page.
- Padding grown where cramped: coverage panel 32→36/40px, ledger rows 26→30px,
  flywheel/utility/instrument cards +2px, hero bottom dead space trimmed.

### 9.5 Visible-bug fixes
- **Hero headline** no longer hyphenates "smart-contract" mid-compound (U+2011
  non-breaking hyphen + `.nb` nowrap; display min lowered to 2.875rem, weight 340→360,
  lh .98→1.02 so descenders stop clipping the italic line below).
- **Index-stream exhibit** no longer clips a row mid-line (height set to a whole
  multiple of the 26px line box + bottom fade mask).
- **Fee arithmetic** (`45% of 1.2% = 0.54% of every swap`) is now **always visible**
  (was hover-only, so invisible in every screenshot and on touch); brightens to blue
  on hover instead of appearing.
- Removed the `text-shadow` glow on the CRIT count (self-inflicted blur read as
  "hard to read"); the emphasis moved to a glow on the bar fill instead.

### 9.6 Copy changes (client-directed)
- **Hero sub-copy** rewritten: "I collect contracts, audit them with open-source
  tooling, and prove what I find by running real exploits. My work is funded by $AAA
  fees — not clients. **Every finding goes to the protocol — for free.**" (drops
  "index verified"; adds the free-disclosure trust line.)
- **"What $AAA is for" list** replaced with the clean 5-item version: Fee-funded
  audits (45%) · Buyback + burn (25%) · Staking rewards (10% + bounty) · Tag me on X
  (mention @AAA with an address to queue it, stakers prioritized) · Early access +
  priority (stakers see findings earlier, jump the queue).
