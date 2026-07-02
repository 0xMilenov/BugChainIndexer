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
| Supply | **TBD** *(assumption: use Bankr default)* | Confirm Bankr's current default supply/decimals; don't hand-set unless there's a reason. |

> **Open decision D1 — supply & allocation.** Recommended: take Bankr's standard fair-launch supply
> with **no team pre-mine** (or a small, transparently-disclosed, time-locked ops allocation). A
> whitehat's credibility is its whole moat — a stealth team bag undermines the entire pitch.

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

**Recommended treasury policy (Open decision D2):**
- **~70%** of collected fees → compute & infra (the audits themselves)
- **~20%** → reserve (3–6 months runway so audits never stop during low-volume weeks)
- **~10%** → growth (bounty matching, liquidity, or buybacks — decide later)

Publish the wallet address and these ratios up front. The policy *is* the product's trust story.

---

## 4. Sustainability model *(illustrative — validate before quoting publicly)*

The point of this section is to show the loop can actually break even, and at what scale.

**Cost side (assumptions):**
- Core-mode audit compute: **$X per audit** *(assumption — measure from real Codex/gpt-5.4 runs;
  track token usage per audit to replace X with a real number).*
- Fixed infra (VM, DB, RPC): **$Y / month** *(assumption).*

**Revenue side:**
- AAA fee take per $1 of volume ≈ `1.2% × creator_share`. If creator share is 50% *(assumption)*,
  AAA nets **~0.6% of swap volume**.

**Break-even volume for N audits/month:**

```
monthly_volume_needed  ≈  (N × X  +  Y)  /  (0.012 × creator_share)
```

*Worked example (assumptions only):* if X = $8/audit, Y = $200/mo, creator_share = 50%, and the goal
is **50 audits/month**, then monthly_volume_needed ≈ (50×8 + 200) / 0.006 = **$100,000 in monthly
swap volume**. That is a very reachable target for an active Base token — and every audit above
break-even is pure ecosystem value.

> **Action A1:** instrument `audit-one.sh` / the pipeline to log real per-audit token spend, so we
> replace X and Y with measured numbers before publishing any economics.

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

## 9. Open decisions (need your call)

| ID | Decision | Recommendation |
|----|----------|----------------|
| **D1** | Supply & allocation | Bankr default supply, fair launch, no pre-mine (or small locked+disclosed ops bag) |
| **D2** | Treasury split | ~70% compute / ~20% reserve / ~10% growth |
| **D3** | Launch timing | After ≥5 Base audits are live + costs measured |
| **D4** | Growth-bucket use | Decide later: buybacks vs. liquidity vs. bounty matching |
| **A1** | Instrument per-audit cost | Add token-spend logging to the pipeline (blocks final economics) |

---

*Draft owned by the AAA build. Update as decisions land; nothing here is public until it's on the site.*
