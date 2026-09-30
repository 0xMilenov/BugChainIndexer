# $AAA — token economics and launch plan

**Planning revision: 30 September 2026. $AAA has not launched.** I have no operating token-fee, donation, buyback/burn, or staking program. New token-funded audits have not been activated. This document supports my [project charter](AAA-PROJECT-CHARTER.md); it records planned allocations, not executed transactions or guaranteed utility.

## Bankr launch review

Yordan has chosen **Robinhood Chain** for the planned Bankr launch. A bounded verified-source indexing pilot exists, but continuous Robinhood coverage and token-funded activity are not live. The exact Bankr route, parameters, account, recipient, and deployment transaction still need review and approval. Official documentation checked on 30 September 2026 distinguishes standard Doppler launches from partner launches:

Bankr's current chat/API launch default is **Robinhood Chain**, while its web/CLI flow defaults to Base. Every reviewed launch request and preview must explicitly name Robinhood Chain and confirm the provider; relying on a default is unsafe. Robinhood retail deployment gas is paid by the launch wallet in native ETH. Retail launch wallets may face a 24-hour age gate, and email-only sign-in has a 72-hour wait unless a social account is linked. Bankr documents a `simulateOnly: true` API preview that does not broadcast or reserve launch quota, but it requires an eligible Bankr account and cannot substitute for on-chain launch evidence. [Deploy reference](https://docs.bankr.bot/token-launching/api-reference/deploy-token-launch/), [eligibility FAQ](https://docs.bankr.bot/faq/token-launching/)

| Topic | Documented reference, not a final AAA setting |
| --- | --- |
| Standard Doppler fees | 0.7% pool fee; the creator receives 95% of that (0.665% of volume). For new launches, hook additions bring the total trader fee to 1.75%. Locked LP proceeds are not spendable creator income. |
| Partner route | Bankr documents partner token launches as Base-only. AAA's selected Robinhood Chain route is a standard wallet-level launch, not a partner launch; the partner fee schedule must not be applied to it. |
| Supply and vesting | Standard Doppler supply is 100 billion: 85% liquidity, 15% creator vesting over one year including a 30-day cliff. Vesting can instead be disabled at launch, placing 100% in the pool. Partner-key launches do not vest. |
| Fee assets | Mixed token/quote receipts are the default; quote-only fees are an option to review. |

Sources: [standard fees](https://docs.bankr.bot/token-launching/overview/#fee-structure), [creator vesting](https://docs.bankr.bot/token-launching/overview/#creator-vesting), [partner launches](https://docs.bankr.bot/partnership/token-launching/), and [deploy reference](https://docs.bankr.bot/token-launching/api-reference/deploy-token-launch/).

My earlier universal **1.2%** and **no pre-mine** claims were not justified. Disabling vesting is an available choice, not an approved AAA decision. I will explicitly specify Robinhood Chain, review the selected provider and previewed fee distribution, and publish confirmed parameters after approval and deployment. The pool fee must not be confused with the all-in trader fee or AAA's claimable share. Recheck the official documentation and launch preview immediately before signing; different launch paths and older tokens can have different terms.

The default vesting recipient is the fee recipient set at launch and remains fixed if fee rights later transfer. Standard Doppler vesting is either the default schedule or disabled, not a custom allocation. [Vesting options](https://docs.bankr.bot/token-launching/overview/#creator-vesting)

## Planned allocation of creator swap-fee proceeds

This plan applies only to **AAA's collected creator share**, not to total swap volume, all pool/hook fees, or locked liquidity.

| Share | Planned use |
| --- | --- |
| 45% | Audits and infrastructure |
| 25% | $AAA buyback-and-burn |
| 15% | Creator / development |
| 10% | Reserve for a proposed staking / revenue-share program; no live rewards or approved terms |
| 5% | Marketing and growth |

These percentages sum to 100% of that receipt category. They describe a spending policy, not an installed automatic distributor. Claiming, allocation, spending, and publication are separately reviewed actions. Until an implementation is approved, planned portions remain accounted for and unspent; they are not silently redirected.

## Planned allocation of voluntary protocol donations

Disclosure is free. A protocol may choose to thank me; no payment, donation, or token ownership is required to receive findings.

| Share | Planned use |
| --- | --- |
| 40% | Creator |
| 30% | $AAA buyback-and-burn |
| 30% | Future audits |

This replaces the older 100%-to-creator donation proposal. Donation collection is not active and no receiving address is approved in this document. Donation receipts stay separate from creator fee income even if custody later uses the same treasury system. A donation does not buy a favorable report or change the evidence standard.

## Funding and execution gates

The operator can plan and coordinate now. Yordan intends AAA eventually to create and operate dedicated project wallets with transaction access. No account, signing key, transaction tool, or spending authority is active from this planning decision. Bankr account identity, recovery, controls, recipient, and activation must be set up and reviewed as concrete steps; until then, wallet actions still require specific approval. New fee-funded audits require all of: a verified live $AAA token, actual fee proceeds received, reconciled available funds, a specific approved allocation, target authorization, and a worker budget with time/cost limits. Future workers use separately selected open-source/open-weight models and isolated compute; existing audit costs or subscription usage are not a price quote for that architecture.

Donations may supplement a later approved budget but do not replace the received-fee gate. Accrued fees must be claimed and verified as spendable receipts before allocation. Token valuation, projected volume, and permanently locked liquidity are not available funding. If no budget exists, the job waits. Launch does not automatically start audits, claims, buybacks, burns, staking, or posting.

My planned $AAA buybacks are distinct from Bankr's protocol-level **BNKR** buyback. The execution venue, limits, approvals, and burn method still need selection. Bankr's documented burn transfer uses a dead address; that alone does not establish an ERC-20 supply reduction. I will describe the actual mechanism and evidence accurately. [Bankr transfer behavior](https://docs.bankr.bot/features/transfers/#recipient-formats)

Doppler supports programmable buybacks in its general protocol, but that does not establish a configured AAA feature or a standard Bankr launch option. [Doppler capabilities](https://docs.doppler.lol/explainer)

Staking/revenue sharing remains a proposal requiring approved terms, implementation, and appropriate legal review. No yield, price support, audit throughput, or investment return is promised. Earlier break-even forecasts based on a presumed fee rate and historical model costs are withdrawn; future budgets will use verified receipts and reviewed worker quotes.

## Receipt and spending evidence

I plan an append-only ledger of fees, donations, claims, receipts, internal transfers, allocations, reservations, expenses, and corrections. Each relevant record should retain chain, transaction/log identity, asset/decimals, native amount, timestamp, source/destination, confirmation status, and supporting evidence. Any currency valuation includes its source and time.

I will reconcile balances, avoid counting a claim and its receipt twice, keep conversions and gas/slippage visible, and distinguish reserved from available funds. Approved public updates link receipt and spending evidence to the work it funded without exposing credentials or undisclosed exploit details. The ledger and its operating cadence still need implementation; an empty template is not proof of revenue.

## Decisions Yordan still needs to make

| Decision | Open question |
| --- | --- |
| Launch path and timing | Robinhood Chain is chosen. Confirm the standard Bankr/provider route, Robinhood-chain ETH gas, previewed fee schedule, and exact deployment approval. |
| Supply and vesting | Accept the documented default creator allocation or explicitly disable vesting? Confirm supply and recipients in the launch preview. |
| Custody and fee collection | Dedicated agent-operated project wallets are the chosen direction. Decide the Bankr account/recovery, wallet and fee-recipient addresses, transaction controls, donation recipient, quote asset, and mixed/quote-only fee mode before activation. |
| Accounting | How are gas, conversions, asset valuations, reserves, and public reporting handled before any spending? |
| Buyback-and-burn | Which execution/burn mechanism, limits, timing, and transaction review process for each funding source? |
| Staking | Whether to implement it at all, under what reviewed terms; keep the proposed allocation reserved until resolved. |
| Audit activation | Which open-weight model/provider/license, target scope, data handling, hard budget, and cancellation controls after the funding gate? |
| Public activity | Which launch copy, disclosures, and reporting cadence to approve? No automatic posts or protocol messages. |

The agreed planned percentages above do not resolve these launch or execution choices. I will record approved decisions and evidence here before presenting them as live behavior.
