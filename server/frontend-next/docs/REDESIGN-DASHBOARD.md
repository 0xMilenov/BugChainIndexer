# AAA Dashboard Redesign — applying the Dossier system to the tool

> Companion to `REDESIGN-DOSSIER.md`. Scope: UI/UX only — no functionality,
> no scanning/audit logic, no new features. Visual mockup: published artifact
> "AAA dashboard redesign". Stack unchanged (Next.js 16 + Tailwind 4 + framer-motion).

## 0. Register: this is information design, not editorial
The landing speaks in the **serif "authored"** register; the dashboard is a tool
people scan for hours, so it speaks in the **mono/sans "verified"** register. We
reuse the Dossier *tokens* (ink surfaces, `sev-*` text variants, rim-light, groove
tracks, mono labels, `--blue-text`) but keep serif to the wordmark only. Craft here
= scannability, density, and state-in-form, not display type.

## 1. Assessment of the current dashboard
**Strengths:** genuinely useful data density; the two-panel stats bar packs a lot
without feeling broken; severity columns are already color-coded; network pills are
recognizable; sort affordances exist on every column.

**Weaknesses (from the screenshot + code):**
1. **One flat surface.** `bg-bg-secondary` + `border-border` on every card, table,
   and stats panel — the same 1.09:1 flatness the landing had. Nothing sits above
   anything.
2. **Severity reads as four equal columns.** Critical `6` and Low `—` get identical
   visual weight (right-aligned colored number). The most important signal on the
   screen — "does this contract have criticals?" — requires reading four separate
   cells. `text-red-400/95` etc. are also raw Tailwind palette leaks, not the
   `sev-*` system the landing now uses.
3. **Row scannability.** `text-sm` mono at `py-3`, thin `border-border` separators,
   a barely-there `hover:bg-bg-tertiary/50`. No anchor for the eye down a 50-row list.
4. **Metadata on muted grey.** `text-text-muted #71717a` (≈4.8:1) carries the stat
   sub-lines, ERC-20 balances, timestamps — the same "too grey" issue.
5. **Network pills are loud.** Solid saturated fills (`text-white` on `bg-*-500`)
   compete with the severity colors for attention.
6. **Sidebar hierarchy is soft.** Sections separated only by whitespace; the
   `ActiveFiltersSummary` and the collapsible "Search & Filters" don't read as
   distinct zones; active filters aren't individually removable chips.

## 2. The table — the centerpiece
### 2.1 Severity spine (the single biggest scannability win)
Add a 3px left spine to every row (`ContractRow.tsx`), colored by the **highest
severity present** (crit→`--sev-crit`, else high, else med, else low, else `--ghost`).
Reused verbatim from the landing's case-file cards → instant cross-surface
consistency, and you can read the whole list's risk profile by glancing down the
left edge. Widens to 5px on row hover.

### 2.2 Weight gradient across severities
Stop rendering four identical numbers. Encode importance in **form**:
- **Critical & High → filled chips**: tinted well + border + `sev-*-text` color,
  600 weight. They visually pop off the row.
- **Medium & Low → plain colored numbers** (`--sev-med-text` / `--sev-low-text`),
  lighter weight.
- **Zero → a single dim `·`** in `--ghost`, not a `-` in muted grey and not a
  colored 0. Clean contracts read clean.

Measured legibility (on the row surface): crit chip 6.2:1, high 8.2:1, med 13:1,
low 8.5:1 — all pass AA with margin, vs. the current `/95`-alpha palette colors.

### 2.3 Group the four severity columns
Give the Crit/High/Med/Low block a subtle left inset rule (`box-shadow: inset 1px 0
0 var(--rule)`) so it reads as one **findings cluster**, not four loose columns.
Header labels use the `sev-*-text` colors so the group is self-legending.

### 2.4 Row & type refinements (`ResultsTable` + `ContractRow`)
- Surface: table on `--ink-1`, header on `--ink-2` (sticky under the 56px header),
  header rule `--rule-strong`. Rim-light on the wrapper.
- Row hover: `background: --ink-2`, spine widens, address brightens to `--blue-300`.
- Header labels: mono 10.5px `.13em` caps `--faint` (was `text-xs`); sort icon at
  0.4 opacity.
- Address: mono 13px 500 `--blue-text` (6.3:1, was `text-xs` accent).
- Name: sans 14px 600 `--paper` with truncation; the Verified/Proxy badges become
  2px-radius mono `tag`s (`--sev-*`-tinted) instead of pill `Badge`s.
- Network: **tinted mono chip** (dot + name on `--ink-2` + `--rule-strong`) replacing
  the solid saturated pill — recognizable but quiet, so it stops competing with
  severity color.
- Native: mono tabular right-aligned; `0 X` in `--faint`, positive balances in
  `--body` 500 (the number that matters gets the weight).
- ERC-20: mono `--faint`; empty state a single `—` in `--ghost`.
- Row density: `padding:13px 16px` (up from cramped `py-3` at the new sizes).
- The no-completed-audit `RunAuditCell` (colSpan 4) becomes a compact mono
  "Run audit →" button in `--blue-text`, right-aligned in the findings cluster.

## 3. Instrument bay (the stats sections)
Replace the two flat `bg-bg-secondary` sections with a 12-col card row matching the
landing's instrument treatment:
- Cards on `--ink-2` + `--rim` + `--shadow-1`; labels mono `.14em` caps `--faint`;
  primary values mono tabular `1.75rem` `--paper`; sub-lines `--dim` (not muted
  grey), the least-important tail in `--faint`.
- Icon chips are 26px tinted squares (`blue`/`amber`/`idle`/`live`), 2px radius —
  matching the landing's `.chip`.
- Scanner status carries a **state dot**: breathing `--signal` square when running,
  static `--faint` when idle. Error counts render in `--sev-high-text` so "69 errors"
  is visible without shouting.
- Layout: Today (3) · Largest (3) · Scanner+Last-run+RPC (6). Same information,
  same compactness, real hierarchy.

## 4. Sidebar & filters (`Sidebar.tsx`)
- Zone the panel with `border-top` + mono section labels (SEARCH BY CODE / NETWORK /
  ACTIVE FILTERS / advanced), so each block is a legible unit.
- Code-search input as a recessed **groove well** (`--ink-0` + `--groove`) with a
  blinking `--signal` caret — echoes the landing's terminal exhibits and signals
  "this is where machine input goes."
- Primary "Search contracts" is the one blue-filled button; everything else is a
  ghost button (`--ink-2` + `--rule`). One clear action per panel.
- **Active filters become individually removable chips** (`net base ✕`, `native ≥ 1
  ETH ✕`) instead of a summary string — each is mono, 2px radius, with an ✕ that
  reddens on hover. The empty state is a quiet `--faint` line.
- Network selector and advanced rows get real hover states (border + surface step).
- Surface the existing `/` and `N` keyboard shortcuts as `kbd` hints on the section
  headers (they already work in `page.tsx`).

## 5. Header (`Header.tsx`)
Compact to match the landing nav: 56px, wordmark `AAA` (Fraunces) + mono suffix
`/ CONTRACT INDEX`, and the Log in / Bookmarks / Filters actions as mono ghost
buttons with `--blue-950` count pips (replacing the loud red filter badge). Blur +
`--rule` bottom border on scroll.

## 6. Token migration (the enabling change)
The dashboard currently uses the *old* `globals.css` tokens (`--bg-secondary
#12121a`, `--text-muted #71717a`, raw `red-400/amber-400`). Adopt the Dossier v2
`@theme` block (§3/§9 of `REDESIGN-DOSSIER.md`): ink surface scale, brighter text
tiers, `--sev-*` + `--sev-*-text`, `--rim`, `--groove`, `--blue-text`. One shared
token layer means the tool and the marketing site finally look like one product.

## 7. How it should feel
Today the dashboard reads as a competent-but-generic dark data table. After: a
**precision instrument** — you glance down the severity spine to triage 50 contracts
in one sweep, Critical/High chips jump out, the stats read like a telemetry panel,
and every surface has a clear place in the depth stack. Denser where it counts,
calmer everywhere else, and unmistakably the same product as the landing page.
