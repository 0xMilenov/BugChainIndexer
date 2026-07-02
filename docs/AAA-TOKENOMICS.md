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

## 3. Fee distribution (FINAL)

Every $AAA swap pays a 1.2% fee; my creator share of that fee is split on a **fixed 45/25/15/10/5**
allocation, published before launch and verifiable on-chain after.

| % | Allocation | What it does |
|---|-----------|--------------|
| **45%** | **Audits & Infrastructure** | Funds more audits, indexing, and compute — the core of the loop. |
| **25%** | **Buyback + Burn** | I buy $AAA on the open market and burn it — usage-tied deflation. |
| **15%** | **Creator / Development** | Building and maintaining the agent. |
| **10%** | **Staking / Revenue Share** | Holders stake $AAA to earn a share of fees. |
| **5%**  | **Marketing & Growth** | Reaching more of the ecosystem. |

```
$AAA trade ──1.2% fee──► creator share (in $AAA + WETH)
   │
   ├─ 45% Audits & Infrastructure   (the audits themselves)
   ├─ 25% Buyback + Burn            (market-buy $AAA → burn)
   ├─ 15% Creator / Development
   ├─ 10% Staking / Revenue Share   (paid to stakers)
   └─  5% Marketing & Growth
```

Publish the treasury wallet address and these ratios up front. The policy *is* the product's trust story.

---

## 3b. AAA Bounty Wallet

A separate, public wallet — **distinct from the swap-fee split above** — where protocols can reward
vulnerabilities I discover for them. It's a transparent, on-chain channel for responsible-disclosure
bounties: no invoices, no gatekeeping.

- **100% of every bounty donation goes directly to the creator.**
- Address is published on the site at launch; inflows are verifiable on-chain.
- Framing: a voluntary "thank-you for the disclosure," not a fee or an obligation.

> This is intentionally simple and separate from the tokenomics so there's no ambiguity: swap fees
> follow the 45/25/15/10/5 split; bounty donations are 100% creator.

---

## 4. Sustainability model *(now using measured cost — A1 done)*

The point of this section is to show the loop can actually break even, and at what scale. The
per-audit cost is now **measured**, not assumed: the pipeline records real spend per audit
(`cost_usd`, `total_tokens` on `contract_audits`, from the Plamen v2 phase cost ledger).

**Cost side (measured — refine as more audits land):**
- **Core-mode audit: ~$23 per audit** (measured, n=2 Base: PoolFees $21.80, Clanker $24.55, avg
  $23.17, ~6M tokens each). The **`depth` phase on gpt-5.5 is ~60% of the cost** — the single cost
  driver and the main tuning lever.
- **Light mode** is materially cheaper (fewer/cheaper agents, skips the heaviest passes) — the right
  default for broad sweeps; reserve core/thorough for flagship or high-value targets.
- Fixed infra (VM, DB, RPC): **~$200 / month** *(assumption — small next to compute).*

**Revenue side (audits are funded by the 45% slice, not the whole fee):**
- AAA net fee take per $1 of volume ≈ `1.2% × creator_share`. At a 50% creator share *(confirm on
  Bankr)*, AAA nets **~0.6% of swap volume**.
- Of that, **45% funds Audits & Infrastructure** → **~0.27% of swap volume** is the audit budget.

**Break-even volume for N audits/month:**

```
monthly_volume_needed  ≈  (N × cost_per_audit  +  infra)  /  (0.012 × creator_share × 0.45)
```

*Worked example (measured cost):* at **$25/audit core**, infra $200/mo, creator_share 50%, targeting
**50 core audits/month** → (50×25 + 200) / 0.0027 ≈ **$540k monthly swap volume**. The same 50 audits
in **light mode (~$6/audit)** → (50×6 + 200) / 0.0027 ≈ **$185k/mo**. Because audits draw only the 45%
slice, the tiering matters even more: **light by default for sweeps, core/thorough for flagships.**
The other slices (buyback+burn, staking, creator, marketing) aren't overhead against this number —
they're what make holding and trading $AAA attractive enough to *generate* the volume in the first place.

> **✅ A1 done:** per-audit cost is instrumented (`ingest.js` parses `_v2_cost_ledger.md` → DB). Refine
> the $25/$6 figures as more audits complete; query `SELECT audit_mode, avg(cost_usd), count(*) FROM
> contract_audits WHERE cost_usd IS NOT NULL GROUP BY audit_mode`.

---

## 5. Token utility (natural to a security agent)

1. **Fee-funded audits (core).** 45% of fees pays my compute — no subscription, no paywall to read
   findings or queue a contract. The token *is* the funding.
2. **Buyback + burn.** 25% of fees market-buy $AAA and burn it — usage-tied deflation that ties token
   supply to how much auditing actually happens.
3. **Staking / revenue share.** Stake $AAA to earn 10% of all fees. Holders share directly in the work.
4. **Priority audit queue.** Holders can push a specific contract to the front of my queue instead
   of waiting for me to reach it in normal rotation.
5. **"Audited by AAA" attestation.** An on-chain badge a project can display once I've reviewed it,
   gated by $AAA — a verifiable, ecosystem-visible signal.
6. **Transparency ledger (utility as proof).** A public record of fees collected → audits funded →
   $AAA burned → vulnerabilities found. Trust compounds; the ledger is a feature, not an afterthought.

> **Sequencing:** #1 (fee-funded audits) and #2 (buyback+burn) are automatic at launch. #3 (staking)
> and #4 (priority queue) are post-launch, gated behind a holder check. #6 (ledger) ships day one,
> manual at first. Separately, the **Bounty Wallet** (§3b) is live at launch — 100% to creator.

---

## 6. Transparency ledger (day-one commitment)

Publish, and keep updated, a simple public page/section:

| Period | Fees collected (USD) | Audits funded | Contracts reviewed | Findings (C/H/M/L) | $AAA bought+burned | Bounties received |
|--------|----------------------|---------------|--------------------|--------------------|--------------------|-------------------|

Everything is verifiable on-chain (treasury + burn + bounty wallets) and against the live dashboard
(audit + finding counts already come from Postgres). No claims that can't be checked.

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

- **Volume dependence.** Audits draw only the 45% slice, so throughput scales with usage. No reserve
  buffer in this model — during lean weeks, tier down to light mode rather than stop. That's the model.
- **"Token first" skepticism.** Mitigated by leading with a *working* product and real findings, and
  by a fair launch with no stealth team bag.
- **Compute cost drift.** AI pricing changes; the per-audit cost is measured (A1) and the sweep tier
  (light/core/thorough) is the adjustable lever.
- **⚠️ Regulatory framing — needs legal review before launch.** The model now includes an explicit
  **Staking / Revenue Share (10%)** and **Creator (15%)** allocation. "Revenue share" and staking
  yield can carry securities-like characteristics in some jurisdictions. Before launch, get counsel
  on how staking rewards and the revenue-share language are described; prefer "protocol fee sharing
  to stakers" framing and avoid promising returns. This is a real open item, not boilerplate.
- **Don't over-promise utility timing.** Staking and priority queue are post-launch; label them as
  such on the site (already done). Buyback+burn and fee-funded audits are automatic at launch.

---

## 9. Decisions

| ID | Decision | Status |
|----|----------|--------|
| **D1** | Supply & allocation | ✅ **Decided** — Bankr default supply, fair launch, **no pre-mine** |
| **D2** | Fee distribution | ✅ **FINAL** — 45% audits+infra / 25% buyback+burn / 15% creator+dev / 10% staking / 5% marketing |
| **A1** | Instrument per-audit cost | ✅ **Done** — `cost_usd`/`total_tokens` recorded per audit; core ≈ $23 (measured, n=2) |
| **B1** | AAA Bounty Wallet | ✅ **Decided** — public Base wallet, 100% to creator; address published at launch |
| **D3** | Launch timing | Open — after ≥5 Base audits are live (2 done, 2 running) + costs refined |
| **D5** | Legal review of staking/revenue-share framing | Open — get counsel before launch (see Risks) |

---

*Draft owned by the AAA build. Update as decisions land; nothing here is public until it's on the site.*
