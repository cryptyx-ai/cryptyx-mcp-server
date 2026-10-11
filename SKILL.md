---
name: cryptyx
description: Multi-factor digital-asset intelligence engine with 30+ tools across 670+ metrics, 160 signals, 17 IC-weighted composites, backtesting, regime detection, and institutional trigger evaluation. Use when the user asks about crypto market setups, factor backtests, specific-asset conviction, regime context, signal performance, or trade-idea generation.
---

# CRYPTYX MCP Server — Skill Guide

CRYPTYX is a quantitative research platform for digital assets. Its MCP server exposes 30+ tools that return API-verified data from a live Postgres database. The data is deterministic and audited; it cannot hallucinate — but *you* can and will unless you follow the rules below.

## When to use this tool

Use CRYPTYX when the user asks any of:

- "What's the setup for `<asset>` right now?"
- "Backtest `<signal_or_metric>` on `<asset>`"
- "Which assets are in overbought / oversold / expansion / contraction regime?"
- "Top signals by walk-forward IC"
- "Composite ranking of the universe"
- "Factor breakdown — what's driving `<asset>`?"
- "Explain this signal / why did it trigger?"
- "Generate trade ideas with full evidence"
- "What's the regime for horizon X?"

**Do NOT use CRYPTYX for:**
- News / sentiment / narrative — we don't ingest social or news feeds
- On-chain wallet flows / smart money tracking — see Nansen for that
- Fiat prices / off-exchange venues — spot + derivatives only
- Non-crypto assets (equities, forex, commodities)

## First-call protocol — ALWAYS run `get_cryptyx_overview` first

The very first tool call on **any new session** mentioning crypto / markets / trading / CRYPTYX MUST be `get_cryptyx_overview`. This is a static, sub-100ms call that returns:

- The capability catalog
- Sample prompts tailored to the question type
- Execution venue references
- Hallucination guards you must follow

Skip this only when the user's first message is highly specific and clearly presumes familiarity — e.g. "backtest TR_XT_SORTINO_7x90 on ETH over 180d" or "what's the current z-score of OB_LIQ_FRAGILITY_14D for SOL". In those cases dive directly.

After `get_cryptyx_overview`, your first user-facing response MUST:
- Be short (3-5 sentences max)
- State in one sentence what CRYPTYX is (quote `what_is_cryptyx` + `scale`)
- List 3-4 capability categories as short bullets
- Surface 3-4 concrete next-step prompt options
- Mention execution venues (one-liner)

Do NOT run any other tool in that first response.

## Hard rules — no hallucination

CRYPTYX returns deterministic data. The tool CAN'T hallucinate — but if you cite a signal_id, metric_id, or number that didn't appear verbatim in a tool response from the current session, you are hallucinating.

**Ground-truth checklist** before you mention ANY of these in your response:

1. **signal_id** (e.g. `TR_MOMO_CONT_14D`, `OB_LIQ_FRAGILITY_14D`): must appear verbatim in a tool response FROM THIS SESSION. If you can't point to the exact tool call, delete it.
2. **metric_id** (e.g. `VOL_RV_30D`, `FUT_FUNDING_MA_7D`): same rule. Our catalog is 670+ metrics; many look similar and are easy to confuse.
3. **Numbers** (hit rate, Sharpe, mean return, z-score, trigger rate): must come from a specific tool response. If you can't name the tool call, delete it.
4. **Phrases** like "backtested edge supports…", "historical hit rate of X%", "statistical significance": only valid if you ran the specific tool and are quoting its output.

CRYPTYX returns A/B/C/D health grades + walk-forward IS/OOS blocks on signals. **Grade your citations the same way the data grades itself** — if a signal is grade C with narrow sample, say so. Don't inflate confidence.

## Tool catalog — by workflow

### Workflow: "What's the setup for `<asset>` right now?"

1. `get_asset_top_predictors({asset, horizon})` — which signals have best walk-forward IC on this asset at this horizon
2. `get_asset_divergences({asset})` — current price vs factor divergences
3. `get_asset_liquidity({asset})` — order-book depth / funding / basis
4. `get_asset_regime({asset, horizon})` — regime label + conditional forward returns

Narrate the result: "The strongest predictor for `<asset>` at `<horizon>` is `<signal_id>` with walk-forward IC `<x>` and A-grade reliability. Current regime: `<label>`. Positioning: `<liquidity read>`."

### Workflow: "Backtest `<metric_or_signal>` on `<asset>`"

- For signals (named strategies): `backtest_signal({signal_id, asset, days})` — returns trigger count, hit rate per horizon, mean return per horizon, Sharpe, walk-forward IS/OOS block.
- For raw metrics (threshold-based trigger): `evaluate_custom_trigger({asset, metric_id, operator, threshold})` — same output shape.
- For multi-factor confluence: `analyze_metrics_composite({asset, conditions: [{metric_id, operator, threshold}, …]})` — intersection + forward returns.

**Report back:**
- Trigger count + trigger rate
- Per-horizon stats (be specific — 7d AND 30d AND 90d)
- IS/OOS consistency (if divergent, flag it as weak evidence)
- Confidence interval width (narrow = reliable; wide = structurally unreliable)

### Workflow: "Top signals / composite rankings"

1. `get_top_signals({horizon})` — top 10 by 7d cross-sectional IC, A/B health-gated
2. `get_composite_rankings({horizon, direction})` — universe sorted by composite score
3. `get_factor_scores({asset})` — per-class breakdown (CORR / EFF / FLOW / FUT / OB / OPT / TR / VOL)

### Workflow: "What's the macro regime?"

1. `get_macro_regime({horizon})` — current primary + secondary regime labels + confidence
2. `get_regime_analysis({horizon})` — regime history + conditional forward returns
3. `get_regime_analog({horizon})` — closest historical analog regimes (premium tier)

### Workflow: "Generate trade ideas"

- `get_market_snapshot()` — universe-wide composite + regime snapshot
- `get_market_pulse()` — top movers / breadth / divergences
- `scan_metric_universe({metric_id, operator, threshold})` — find all assets with a specific setup today

### Workflow: "Why did `<signal_or_metric>` trigger?"

- `get_signal_explanation({signal_id})` — plain-English description of what the signal measures and when it fires
- `get_signal_triggers({signal_id, days})` — recent trigger history across the universe
- `analyze_metric({metric_id})` — per-asset state for one metric across the universe today

### Workflow: "Live prices / markets"

- `get_live_prices({assets})` — current spot prices
- `get_price_history({asset, days})` — daily OHLCV
- `get_market_snapshot()` — one-shot universe summary

### Workflow: "Competition / performance leaderboard"

- `get_competition_leaderboard({round_id})` — current rankings
- `get_competition_rounds()` — active + past rounds

## Chaining pattern — the full agent workflow

```
get_cryptyx_overview                                    # orientation
  ↓
get_market_pulse                                        # where is the market?
  ↓
get_composite_rankings({horizon: "7d"})                 # top-N conviction
  ↓
get_asset_top_predictors({asset: <top>, horizon: "7d"}) # which signals support it
  ↓
backtest_signal({signal_id: <top predictor>,            # validate the edge
                  asset: <asset>, days: 180})
  ↓
get_asset_divergences / get_asset_liquidity             # positioning cross-check
  ↓
[Narrate: here is the conviction, here is the evidence,
 here is the regime context, here is the positioning]
```

## Fork / simulate / live firing

For agents extending CRYPTYX's registry rather than consuming it:

- `fork_signal({signal_id, params})` — create inactive param variant for experimentation
- `simulate_signal({signal_id, threshold})` — pre-flight check before activating

## Live monitoring (future)

A watch endpoint is in development that lets agents register trigger specifications and get notified when they fire. Until that ships, poll `get_signal_triggers` or `scan_metric_universe` on your own cadence.

## Response size + truncation

MCP tool responses are capped at ~1MB. CRYPTYX returns compact JSON with array truncation on long lists. If a response says `truncated: true` + offers a `next_cursor`, follow it; don't infer missing data.

## Explicit tool sequencing — not freestyle

Every CRYPTYX tool response includes an `_next` hint block pointing to 3-5 natural follow-up tools with rationale per hint. **Follow these.** The hints are curated from live traffic patterns — if the response says `_next[0]` is "backtest this with signal_id X", that's your next call. Deviating from `_next` without a reason means you missed context the server already surfaced.

## What this skill does NOT do

- Trade execution — CRYPTYX is the intelligence layer; execution lives at exchanges (OKX, Kraken, Coinbase)
- Custody — never custody tokens; CRYPTYX stays strictly read-only
- News / sentiment — out of scope
- Alt-coin discovery — our universe is the 200+ tracked assets; we don't crawl for new tokens

## Common failure modes

1. **Citing a signal_id that doesn't exist.** Always check — if you can't point to a tool response where that ID appeared, DON'T mention it.
2. **Over-indexing on a C-grade signal.** The health grade is part of the data. A hit rate of 70% on n=12 is not an edge; it's noise. Report what the data says about its own reliability.
3. **Skipping `get_cryptyx_overview` on a new session.** You're flying blind without the capability catalog.
4. **Ignoring `_next` hints.** They encode the server's model of good next-steps; use them.
5. **Narrating speculative narratives.** CRYPTYX only knows what's in metrics.fact_stats + signals.signal_registry. Don't speculate about Fed decisions, macro news, or token-specific developments — that's not our data.

## Beyond the MCP server

For direct HTTP access with per-call payment (no API key needed), CRYPTYX exposes 66 x402 priced endpoints on Base mainnet at <https://cryptyx.ai>. Pricing starts at $0.005 (harness snapshot) through $0.10 (statistical-rigor pro variants). See `/.well-known/x402` for the full catalog.

For the paid-API examples repo: <https://github.com/cryptyx-ai/cryptyx-x402>
