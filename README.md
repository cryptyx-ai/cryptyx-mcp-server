# @cryptyx/mcp-server

> ## 🔔 Deprecation notice (2026-07)
>
> **This package is entering deprecation.** The flagship CRYPTYX MCP integration is now the OAuth 2.1 Remote MCP surface at `https://cryptyx.ai/api/mcp` — no config file editing, no API key management, revocable per-app, enterprise/SOC 2 ready.
>
> **Migrate at [cryptyx.ai/mcp](https://cryptyx.ai/mcp).** Paste one URL into Claude.ai, Cursor, or any MCP-compatible client and go.
>
> This npm package remains supported through **2026-12-31** for clients that don't yet support OAuth MCP (older Cursor releases, some enterprise agent platforms). Your existing `cx_*` API key continues to work throughout — no forced migration timeline for existing users.
>
> **New users**: use the OAuth path from day one.
> **Existing users**: migrate on your schedule. See [migration guide](https://cryptyx.ai/docs/mcp#migration) (or just re-add via `cryptyx.ai/mcp` — takes 30 seconds).

---

**CRYPTYX — the intelligence layer for digital assets.**

Institutional-grade digital asset intelligence delivered via the [Model Context Protocol](https://modelcontextprotocol.io) and a human-facing CLI. CRYPTYX converts fragmented crypto telemetry into factor scores, signals, multi-factor backtests, and regime classifications — continuously compounding intelligence across hundreds of metrics, signals, and assets.

**Not a data proxy.** A quant research platform. 30 tools across 670+ metrics, 8 factor classes, 160 signals, 17 IC-weighted composites, ~200 tracked assets, and a daily-updating signal registry — now including **institutional trigger evaluation** (Sortino, MDD, profit factor, walk-forward IS/OOS) as of v0.8.0. Built for traders, funds, treasuries, researchers, and the agents that serve them.

**Execution is complementary — and venue-neutral.** Use CRYPTYX alongside any exchange execution rail. Reference handshakes shipped for [Coinbase](https://github.com/cryptyx-ai/cryptyx/blob/main/integrations/coinbase/trigger-handshake.ts), [OKX](https://github.com/cryptyx-ai/cryptyx/blob/main/integrations/okx/trigger-handshake.ts), [Kraken](https://github.com/cryptyx-ai/cryptyx/blob/main/integrations/kraken/trigger-handshake.ts), [Binance](https://github.com/cryptyx-ai/cryptyx/blob/main/integrations/binance/trigger-handshake.ts), and [Hyperliquid](https://github.com/cryptyx-ai/cryptyx/blob/main/integrations/hyperliquid/trigger-handshake.ts) — each ~150 lines, one three-step pattern: pay CRYPTYX → apply institutional gate → execute on the venue. Fork any of them for your target venue.

---

## Install

### MCP Server (for AI agents)

```bash
npx @cryptyx/mcp-server
```

### CLI (for humans and scripts)

```bash
npx cryptyx --help
```

Or install globally:

```bash
npm install -g @cryptyx/mcp-server
cryptyx snapshot
```

Both entry points ship from the same package — one install, two interfaces.

---

## CLI Quick Start

```bash
# Save your API key (persists to ~/.config/cryptyx/config.json)
cryptyx config set-key cx_your_api_key

# Full state snapshot — factor breadth, rankings, signal summary
cryptyx snapshot

# Market data for all assets
cryptyx market

# Factor scores for a single asset
cryptyx factors BTC

# Today's signal firings
cryptyx signals

# Top 10 signals by information coefficient
cryptyx signals top

# Backtest a signal over the last year
cryptyx signals backtest TR_WIN_RATE_60D_THR --from 2025-05-28 --to 2026-05-28

# Scan a metric across the universe for z-score extremes
cryptyx metrics scan VOL_RV_7D --operator gt --threshold 2

# Raw JSON output (pipe to jq, scripts, cron)
cryptyx market --json | jq '.[] | select(.composite_rank <= 10)'
```

Every command supports `--json` for raw output and `--api-key` / `--api-url` overrides.

### CLI Commands

| Command | Description |
|---|---|
| `cryptyx snapshot` | Full state snapshot: factor breadth, rankings, signal summary |
| `cryptyx market` | Asset universe with composite scores and returns |
| `cryptyx signals` | Today's active signal triggers |
| `cryptyx signals top` | Top 10 signals by 7d IC |
| `cryptyx signals catalog` | All signals with parameters and 30d stats |
| `cryptyx signals explain SIG ASSET DAY` | Why a signal fired (or didn't) |
| `cryptyx signals backtest SIG --from --to` | Signal backtest over date range |
| `cryptyx signals fork SIG --params '{}'` | Fork a signal with new parameters |
| `cryptyx signals simulate SIG --key --value` | Estimate trigger rate for threshold change |
| `cryptyx factors ASSET` | Factor t-scores across 8 classes |
| `cryptyx regime ASSET` | Regime classification with confidence |
| `cryptyx macro-regime` | Market-wide macro regime classification across all horizons |
| `cryptyx divergences` | Cross-factor divergence alerts (distribution, capitulation, ignition) |
| `cryptyx pulse` | Factor breadth across the universe |
| `cryptyx prices` | Live spot prices (15m refresh) |
| `cryptyx price ASSET` | Daily OHLCV candles |
| `cryptyx assets` | Full tracked universe with tags |
| `cryptyx liquidity ASSET` | Order book depth at 50/100/200bp |
| `cryptyx metrics featured` | Top metrics by IC |
| `cryptyx metrics analyze METRIC ASSET --operator --threshold` | Single-metric z-score backtest |
| `cryptyx metrics scan METRIC --operator --threshold` | Universe-wide z-score scan |
| `cryptyx metrics composite ASSET --conditions '[...]'` | Multi-factor intersection backtest |
| `cryptyx competition` | Competition leaderboard |
| `cryptyx competition rounds` | All competition rounds |
| `cryptyx config set-key KEY` | Save API key |
| `cryptyx config show` | Show current config |
| `cryptyx config clear` | Clear saved config |

---

## MCP Configuration

### Claude Desktop

```json
{
  "mcpServers": {
    "cryptyx": {
      "command": "npx",
      "args": ["@cryptyx/mcp-server"],
      "env": {
        "CRYPTYX_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Claude Code

```bash
claude mcp add cryptyx -- npx @cryptyx/mcp-server
export CRYPTYX_API_KEY=cx_your_key
```

### Remote HTTP (Claude.ai Connectors)

```
Endpoint:  https://cryptyx.ai/api/mcp
Transport: Streamable HTTP (JSON-RPC 2.0 over POST)
Auth:      Bearer token (cx_* API key)
```

### Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `CRYPTYX_API_KEY` | Yes | — | API key from [cryptyx.ai](https://cryptyx.ai) |
| `CRYPTYX_API_URL` | No | `https://cryptyx.ai` | Override for self-hosted deployments |

---

## The 6-step conviction loop

CRYPTYX is designed for a specific agentic workflow. Most tools map to a step in this loop:

```
DISCOVER  →  DEFINE  →  VALIDATE  →  SCAN  →  STORE  →  EXECUTE
```

1. **DISCOVER** — `get_featured_metrics` surfaces the current top-performing metrics by information coefficient (IC). Start here.
2. **DEFINE** — `analyze_metric` or `analyze_metrics_composite` lets the agent build a multi-factor thesis (e.g. "trend momentum z > 1.5 AND funding stress z > 2.0").
3. **VALIDATE** — The same tools return forward returns at 8 horizons (1d to 365d). The agent sees whether the thesis has edge, not just vibes.
4. **SCAN** — `scan_metric_universe` runs the validated thesis across ~200 assets on the latest day. Which assets match the conditions right now?
5. **STORE** — `fork_signal` persists the thesis as a new inactive signal variant. The daily pipeline will track it forever.
6. **EXECUTE** — CRYPTYX doesn't execute. Hand off to OKX, Kraken, or whatever execution layer your agent uses.

---

## Tool reference (30 tools)

### Factor discovery — the IP moat

The core value of CRYPTYX. These tools let the agent do real quantitative research against 670+ metrics across 8 factor classes.

| Tool | What it does |
|---|---|
| `get_featured_metrics` | Top-performing metrics by information coefficient. Returns the 8 highest-conviction metrics with A/B grades. **Best starting point.** |
| `get_asset_top_predictors` | Per-asset predictive power — metrics ranked by time-series IC for a specific asset. Surfaces hidden alpha (CS Grade F but TS Grade A). |
| `analyze_metric` | Single-metric z-score backtest with forward returns across 8 horizons. The core factor discovery tool. |
| `analyze_metrics_composite` | **Multi-factor intersection backtest.** Define 2-4 metric conditions and see when ALL fire simultaneously, with forward returns at every horizon. This is where theses are born. |
| `scan_metric_universe` | Scan a metric across all ~200 assets for z-score extremes on the latest day. Ranked results with forward-return backtests at 1d/7d/30d. |
| `get_factor_scores` | Factor t-scores for an asset across 8 factor classes and multiple horizons. |

### Signal engine — parameterised conviction

A signal is a persistent, versioned, parameterised thesis. CRYPTYX ships with a catalog of active signals and lets agents backtest, fork, and tune them.

| Tool | What it does |
|---|---|
| `get_signal_triggers` | Today's active signal firings across all assets. Atomic signals + composite rollups with confidence scores. |
| `get_top_signals` | **Curated top 10 signals** ranked by 7d information coefficient (IC). Pre-filtered to A/B health grade with proven predictive power. |
| `get_signal_catalog` | Full signal catalog with active parameters and 30-day trigger statistics. |
| `get_signal_explanation` | Structured explanation of why a specific signal fired (or didn't) for an asset on a given day. Returns factor scores and composite context. |
| `backtest_signal` | Backtest a signal over any date range. Returns per-day trigger counts + aggregate stats (trigger rate, avg confidence). |
| `fork_signal` | Create a new inactive parameter variant of an existing signal. The fork is tracked forever but doesn't affect the live signal. Human approval required to activate. |
| `simulate_signal` | Estimate the trigger rate if a signal threshold were changed — without making any changes. Cheap what-ifs. |

### Institutional trigger evaluation — the risk-desk answer, in one call

Added in v0.8.0. Each tool returns the full institutional evidence envelope: sample size, hit rate, Sharpe, Sortino, max drawdown, profit factor, walk-forward IS/OOS, regime-conditional performance, and rolling 30/90-day hit rates. Designed so an agent can answer *"is this signal real enough to act on right now?"* from one response — no risk desk in the loop.

| Tool | What it does |
|---|---|
| `get_trigger_preset` | Evaluate one of 5 curated institutional-grade presets against an asset: `mean_reversion_price`, `vol_expansion_alert`, `vol_regime_break`, `flow_inflection`, `treasury_manager_classic`. Cached (fastest). |
| `get_trigger_z_score` | Single-metric z-score threshold trigger. Pass any of 440+ metrics + operator + threshold. Full envelope in ~50ms. |
| `get_trigger_z_differential` | **The generalized crossover primitive** — fires on the delta `z(metric_a) − z(metric_b)`. Works across every factor family (TR / VOL / FLOW / FUT / OB / CORR) for regime-shift detection. |
| `evaluate_custom_trigger` | Arbitrary trigger definition — pass any `z_score / z_differential / composite` predicate and get the full evidence envelope. Runs a live 5-year backtest per request. **Extensibility endpoint.** |

**Discipline gate CRYPTYX uses internally** before promoting a trigger to preset tier — happy to reuse in your agent:
- OOS IC ≥ 0.05 at ≥1 of 14d/30d horizons AND positive at both
- Walk-forward reliability grade = green (`oos_ic > 0.02 AND overfit_ratio > 0.5`)
- Sample size ≥ 100 historical triggers
- Statistically significant Sharpe (95% CI upper bound > 0)
- Held up across ≥2 macro regimes

### Market intelligence — state of the universe

| Tool | What it does |
|---|---|
| `get_market_snapshot` | Asset universe with composite scores, returns, rankings. Latest or time series. |
| `get_market_pulse` | Factor breadth across the universe. Shows how many assets are positive / negative / neutral per factor class. |
| `get_composite_rankings` | Full agent-optimised state snapshot: factor breadth, top/bottom rankings, signal summary, pipeline status. Ideal grounding context before reasoning. |
| `get_regime_analysis` | Current regime classification (trending, mean-reverting, volatile) with primary + secondary regime confidence scores. |
| `get_macro_regime` | Market-wide macro regime classification across all horizons. Returns regime label, confidence, breadth, and horizon alignment over time. |
| `get_divergences` | Cross-factor divergence alerts: distribution (bearish), capitulation (bullish), ignition (bullish). Detects when factor classes disagree — early warning of regime shifts. |
| `get_price_history` | Daily OHLCV candles for a single asset. |
| `get_live_prices` | 15-minute refresh spot prices across all tracked assets. |
| `search_assets` | Full tracked universe with universe tags. |

### Execution context

| Tool | What it does |
|---|---|
| `get_asset_liquidity` | Order book depth at 50 / 100 / 200 bp from mid, spot and optionally futures. Critical for sizing real-world execution. |

### CRYPTYX Challenge

An open, public leaderboard where AI trading agents compete using real CRYPTYX signals. Used by the community, and a great source of benchmarking context.

| Tool | What it does |
|---|---|
| `get_competition_rounds` | List all competition rounds with rules, asset universe, and entry counts. |
| `get_competition_leaderboard` | Live leaderboard — ranked entries with Sharpe ratio, total return, max drawdown, composite score. |

---

## Factor classes

| Code | Name | What it captures |
|---|---|---|
| **CORR** | Correlation | Cross-asset correlation dynamics, regime coupling |
| **EFF** | Efficiency | Market efficiency, mean reversion, trend exhaustion |
| **FLOW** | Flow | Capital flow, fund movement, stablecoin rotation |
| **FUT** | Futures | Derivatives positioning, funding rates, open interest, sentiment |
| **OB** | Order Book | Spot and futures depth, bid/ask imbalance, microstructure |
| **OPT** | Options | Implied volatility, skew, term structure (BTC/ETH scope) |
| **TR** | Trend | Price momentum, trend strength, regime transitions |
| **VOL** | Volatility | Realized and implied volatility dynamics, compression/expansion |

---

## Scale & data freshness

- **670+ metrics** defined across 8 factor classes
- **160 signals** (4 geometry types) + **17 IC-weighted composites**
- **~200 digital assets** tracked daily (target: 500+)
- **8 horizons**: 1d, 7d, 14d, 30d, 60d, 90d, 180d, 365d
- **Daily pipelines:**
  - Metrics: 01:20 UTC
  - Signals: 02:27 UTC
  - Evaluation scorecards: 02:45 UTC
  - Agent optimisation: 03:00 UTC
- **15-minute refresh** for spot prices and order book snapshots
- **Weekly** data source discovery agent scans 12+ providers for new signals

---

## Example prompts

**Build a thesis from scratch:**
> Use CRYPTYX to find the top metrics by IC, build a multi-factor thesis combining trend momentum with funding stress, backtest it on BTC, then scan the universe for assets matching both conditions today.

**Explain a signal firing:**
> What signals fired today? Pick the highest-confidence one and explain why it fired on that specific asset.

**Fork and tune:**
> Fork the TR_WIN_RATE_60D_THR signal with a stricter z_threshold of 2.5, backtest both versions over the last 90 days, and tell me which one has better IC.

**Regime-aware position sizing:**
> For my top 10 composite assets, what's the current regime? Size positions inversely to volatility regime — larger in trending, smaller in volatile.

**Institutional trigger evaluation before acting (v0.8.0):**
> Evaluate the treasury_manager_classic preset on BTC. Only recommend acting if fires_now is true AND the evidence packet passes: Sharpe > 0.3, profit_factor > 1.5, sample_size > 50, walk-forward reliability grade = green. If it passes, tell me the recommended horizon; if not, tell me which condition failed.

**Cross-factor regime shift detection (v0.8.0):**
> Run get_trigger_z_differential with metric_a_id=VOL_RV_7D, metric_b_id=VOL_RV_30D, operator=abs_gt, threshold=1.0 on ETH. If the differential is firing, cross-check the regime_context and rolling_30d_hit_rate before recommending any action.

---

## x402 Pay-Per-Call

CRYPTYX also supports the [x402 protocol](https://www.x402.org) for pay-per-call access — no API key, no signup. Your agent pays in USDC on Base per request.

```
Agent → GET /api/signals/catalog → 402 Payment Required (price + wallet)
Agent → signs gasless USDC transfer → retries with X-PAYMENT header
Server → verifies via CDP facilitator → settles on-chain → returns data
```

60 endpoints across 4 tiers: **$0.01** (market data, signals, grounding), **$0.05** (backtesting, conviction, trigger evaluation), **$0.10** (trade ideas, heatmap), **$0.25** (custom triggers, custom composites, natural-language intelligence query).

Full typed SDK: [`@cryptyx/x402-client`](https://www.npmjs.com/package/@cryptyx/x402-client) — framework-agnostic wallet, budget enforcement, `_next.hints` chain helper. Framework adapters: [`@cryptyx/tool-schemas`](https://www.npmjs.com/package/@cryptyx/tool-schemas) (OpenAI + Anthropic), [`@cryptyx/langchain-tools`](https://www.npmjs.com/package/@cryptyx/langchain-tools), [`@cryptyx/agentkit-tools`](https://www.npmjs.com/package/@cryptyx/agentkit-tools).

- **Pricing manifest:** [cryptyx.ai/.well-known/x402-manifest.json](https://cryptyx.ai/.well-known/x402-manifest.json)
- **Documentation:** [cryptyx.ai/docs/x402](https://cryptyx.ai/docs/x402)
- **Client SDK:** [`x402`](https://www.npmjs.com/package/x402) + [`viem`](https://www.npmjs.com/package/viem)

---

## Links

- **Homepage:** [cryptyx.ai](https://cryptyx.ai)
- **Documentation:** [cryptyx.ai/docs/mcp](https://cryptyx.ai/docs/mcp)
- **Source:** [github.com/cryptyx-ai/cryptyx](https://github.com/cryptyx-ai/cryptyx)
- **MCP Registry:** [registry.modelcontextprotocol.io — search: cryptyx](https://registry.modelcontextprotocol.io/v0.1/servers?search=cryptyx)
- **OpenAPI spec:** [cryptyx.ai/openapi.yaml](https://cryptyx.ai/openapi.yaml)
- **AI plugin manifest:** [cryptyx.ai/.well-known/ai-plugin.json](https://cryptyx.ai/.well-known/ai-plugin.json)
- **AI reference:** [cryptyx.ai/llms-full.txt](https://cryptyx.ai/llms-full.txt)
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

## License

MIT
