# $AAA — Token Economics & Launch Plan

> **Status:** Draft v0.1 · 2026-07-02 · $AAA has **not** launched yet.
> This is the working economics doc for the $AAA token. Numbers marked *(assumption)* are
> illustrative and must be validated before launch — they are not commitments.

---

## 1. Thesis

AAA is the first **self-funded AI whitehat**. The token isn't a meme wrapper around a product —
it's the funding mechanism *for* the product. Swap fees on $AAA pay the real cost of running
autonomous audits (AI/API compute + infra). More usage → more fees → more audits → more findings →
more attention → more usage. The token's value is backed by a service that visibly works: **18,600+
contracts indexed, 49 audits, 424 vulnerabilities surfaced** (live, Base-first).

**One line:** *Every $AAA swap funds another audit.*

---

## 2. Launch mechanics (Bankr / Base)

| Parameter | Value | Notes |
|-----------|-------|-------|
| Chain | **Base** | Bankr launch commands deploy to Base. |
| Launch platform | **Bankr** | Token-issuance wizard; deploys a Uniswap V4 pool. |
| Pool / fee | **Uniswap V4, 1.2% swap fee** | Charged on every buy and sell. |
| Fee split | **Creator (AAA) / protocol (Bankr)** | Confirm exact bps in the Bankr terminal at launch. Fees accrue in $AAA **and** WETH. |
| Fee collection | Manual/agent claim via Bankr Terminal or the bankr agent | AAA (creator) collects its share on-chain. |
| Supply | **Bankr default** | Fair launch; confirm the exact default supply/decimals in the Bankr terminal at launch. |

> **✅ D1 — supply & allocation (DECIDED).** Bankr's standard **fair-launch** supply, **no team
> pre-mine**. A whitehat's credibility is its whole moat, so there is no stealth team bag. If any
> ops allocation is ever needed it will be small, time-locked, and disclosed on-chain — but the
> default is none.

---

## 3. Fee flow → treasury → compute

```
$AAA trade  ──1.2% fee──►  creator share (in $AAA + WETH)
                                   │
                                   ▼
                         AAA treasury wallet (Base)
                                   │
              ┌────────────────────┼────────────────────┐
              ▼                    ▼                    ▼
     Compute & infra        Reserve / runway      Growth (optional)
     (AI + API + servers)   (buffer for lean      (bounties, liquidity,
     — the core spend        weeks)                incentives)
```

**✅ D2 — treasury policy (DECIDED):**
- **70%** of collected fees → compute & infra (the audits themselves)
- **20%** → reserve (3–6 months runway so audits never stop during low-volume weeks)
- **10%** → growth (bounty matching, liquidity, or buybacks — the specific use is D4, still open)

Publish the wallet address and these ratios up front. The policy *is* the product's trust story.

---

## 4. Sustainability model *(now using measured cost — A1 done)*

The point of this section is to show the loop can actually break even, and at what scale. The
per-audit cost is now **measured**, not assumed: the pipeline records real spend per audit
(`cost_usd`, `total_tokens` on `contract_audits`, from the Plamen v2 phase cost ledger).

**Cost side (measured, n small — refine as more audits land):**
- **Core-mode audit: ~$25 per audit.** First measured Base (Clanker) core run: **$22.7 across 11
  phases / 5.84M tokens**, still finishing. The **`depth` phase on gpt-5.5 alone is ~$14 (~60%)** —
  it's the single cost driver and the main tuning lever.
- **Light mode** is materially cheaper (fewer/cheaper agents, skips the heaviest passes) — the right
  default for broad sweeps; reserve core/thorough for flagship or high-value targets.
- Fixed infra (VM, DB, RPC): **~$200 / month** *(assumption — small next to compute).*

**Revenue side:**
- AAA fee take per $1 of volume ≈ `1.2% × creator_share`. At a 50% creator share *(confirm on
  Bankr)*, AAA nets **~0.6% of swap volume**.

**Break-even volume for N audits/month:**

```
monthly_volume_needed  ≈  (N × cost_per_audit  +  infra)  /  (0.012 × creator_share)
```

*Worked example (measured cost):* at **$25/audit core**, infra $200/mo, creator_share 50%, targeting
**50 core audits/month** → (50×25 + 200) / 0.006 ≈ **$242k monthly swap volume**. The same 50 audits
in **light mode (~$6/audit)** → (50×6 + 200) / 0.006 ≈ **$83k/mo**. Takeaway: **tier the sweep** —
light by default, core for flagships — and break-even lands in a very reachable range for an active
Base token. Every audit above break-even is pure ecosystem value.

> **✅ A1 done:** per-audit cost is instrumented (`ingest.js` parses `_v2_cost_ledger.md` → DB). Refine
> the $25/$6 figures as more audits complete; query `SELECT audit_mode, avg(cost_usd), count(*) FROM
> contract_audits WHERE cost_usd IS NOT NULL GROUP BY audit_mode`.

---

## 5. Token utility (natural to a security agent)

1. **Fee-funded audits (core).** No subscription, no paywall to read findings or queue a contract.
   The token *is* the funding — this is the primary, non-negotiable utility.
2. **Priority audit queue.** Holders can push a specific contract to the front of my queue instead
   of waiting for me to reach it in normal rotation.
3. **Bounty escrow.** A project locks an $AAA bounty for a contract; I audit it and report back with
   PoC-verified findings; escrow releases on delivery.
4. **"Audited by AAA" attestation.** An on-chain badge a project can display once I've reviewed it,
   gated by $AAA — turns the audit into a verifiable, ecosystem-visible signal.
5. **Transparency ledger (utility as proof).** A public record of fees collected → audits funded →
   vulnerabilities found. Trust compounds; the ledger is a feature, not an afterthought.

> **Sequencing:** ship #1 at launch (it's automatic). #2–#4 are post-launch features gated behind
> a holder check. #5 should exist from day one, even if manual at first.

---

## 6. Transparency ledger (day-one commitment)

Publish, and keep updated, a simple public page/section:

| Period | Fees collected (USD) | Audits funded | Contracts reviewed | Findings (C/H/M/L) | Treasury balance |
|--------|----------------------|---------------|--------------------|--------------------|------------------|

Everything is verifiable on-chain (treasury wallet) and against the live dashboard (audit + finding
counts already come from Postgres). No claims that can't be checked.

---

## 7. Launch-day plan

**Pre-launch checklist:**
- [ ] ≥5 real **Base** audits ingested and visible on the dashboard (in progress — closes the Base
      proof gap so "Base-first" is backed by findings, not just copy).
- [ ] Treasury wallet created; fee-collection flow tested on Bankr.
- [ ] Supply/allocation decided (D1); treasury policy decided (D2).
- [ ] Real per-audit cost measured (A1) → economics section finalized.
- [ ] Website `$AAA` section flips from "Soon" to live: contract address, buy-on-Bankr link, price widget.
- [ ] X account live with the pinned thread below.

**Launch-day X thread (outline, first person):**
1. *"I'm AAA. I've already indexed 18,600+ contracts and run 49 audits — 424 real vulnerabilities
   found, PoC-verified. Today I'm launching the token that pays for my work: $AAA."*
2. *"Here's the loop: you trade $AAA → 1.2% swap fees come to me → I spend them on audit compute →
   I find more bugs on Base. A whitehat that funds itself."*
3. *"Proof, not promises: [link to N live Base findings on the dashboard]."*
4. *"$AAA is live on Bankr: [contract]. Treasury: [wallet]. I'll publish every fee I collect and
   what it paid for."*
5. *"What I'll do with the fees: fund more Base audits, open a priority queue and bounty escrow for
   holders, and keep the whole ledger public. Come watch me work."*

---

## 8. Risks & honest caveats

- **Volume dependence.** If swap volume dries up, audits slow. The reserve (§3) buffers this; be
  honest that throughput scales with usage — that's the model, not a bug.
- **"Token first" skepticism.** Mitigated by leading with a *working* product and real findings, and
  by no stealth team bag.
- **Compute cost drift.** AI pricing changes; keep X measured and the treasury policy adjustable.
- **Regulatory/positioning.** $AAA is a utility/funding token for an audit service, not a security or
  a claim on revenue. Keep messaging about *funding the service*, not *profit-sharing*.
- **Don't over-promise utility timing.** #2–#4 are post-launch; label them as such on the site.

---

## 9. Decisions

| ID | Decision | Status |
|----|----------|--------|
| **D1** | Supply & allocation | ✅ **Decided** — Bankr default supply, fair launch, **no pre-mine** |
| **D2** | Treasury split | ✅ **Decided** — 70% compute / 20% reserve / 10% growth |
| **A1** | Instrument per-audit cost | ✅ **Done** — `cost_usd`/`total_tokens` recorded per audit; core ≈ $25 (measured) |
| **D3** | Launch timing | Open — after ≥5 Base audits are live (in progress) + costs refined |
| **D4** | Growth-bucket use | Open — buybacks vs. liquidity vs. bounty matching (decide near launch) |

---

*Draft owned by the AAA build. Update as decisions land; nothing here is public until it's on the site.*
