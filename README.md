# @cryptyx/mcp-server

**CRYPTYX — the intelligence layer for digital assets.**

Institutional-grade digital asset intelligence delivered via the [Model Context Protocol](https://modelcontextprotocol.io). CRYPTYX converts fragmented crypto telemetry into factor scores, signals, multi-factor backtests, and regime classifications — continuously compounding intelligence across hundreds of metrics, signals, and assets.

**Not a data proxy.** A quant research platform. 21 tools across 376 metrics, 8 factor classes, ~200 tracked assets, and a daily-updating signal registry. Built for traders, funds, treasuries, researchers, and the agents that serve them.

**Execution is complementary.** Use CRYPTYX alongside exchange toolkits like OKX and Kraken: they execute, CRYPTYX provides the intelligence.

---

## Install

```bash
npx @cryptyx/mcp-server
```

### Claude Desktop / Claude Code

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

## Tool reference (21 tools)

### Factor discovery — the IP moat

The core value of CRYPTYX. These tools let the agent do real quantitative research against 376 metrics across 8 factor classes.

| Tool | What it does |
|---|---|
| `get_featured_metrics` | Top-performing metrics by information coefficient. Returns the 8 highest-conviction metrics with A/B grades. **Best starting point.** |
| `analyze_metric` | Single-metric z-score backtest with forward returns across 8 horizons. The core factor discovery tool. |
| `analyze_metrics_composite` | **Multi-factor intersection backtest.** Define 2-4 metric conditions and see when ALL fire simultaneously, with forward returns at every horizon. This is where theses are born. |
| `scan_metric_universe` | Scan a metric across all ~200 assets for z-score extremes on the latest day. Ranked results with forward-return backtests at 1d/7d/30d. |
| `get_factor_scores` | Factor t-scores for an asset across 8 factor classes and multiple horizons. |

### Signal engine — parameterised conviction

A signal is a persistent, versioned, parameterised thesis. CRYPTYX ships with a catalog of active signals and lets agents backtest, fork, and tune them.

| Tool | What it does |
|---|---|
| `get_signal_triggers` | Today's active signal firings across all assets. Atomic signals + composite rollups with confidence scores. |
| `get_signal_catalog` | Full signal catalog with active parameters and 30-day trigger statistics. |
| `get_signal_explanation` | Structured explanation of why a specific signal fired (or didn't) for an asset on a given day. Returns factor scores and composite context. |
| `backtest_signal` | Backtest a signal over any date range. Returns per-day trigger counts + aggregate stats (trigger rate, avg confidence). |
| `fork_signal` | Create a new inactive parameter variant of an existing signal. The fork is tracked forever but doesn't affect the live signal. Human approval required to activate. |
| `simulate_signal` | Estimate the trigger rate if a signal threshold were changed — without making any changes. Cheap what-ifs. |

### Market intelligence — state of the universe

| Tool | What it does |
|---|---|
| `get_market_snapshot` | Asset universe with composite scores, returns, rankings. Latest or time series. |
| `get_market_pulse` | Factor breadth across the universe. Shows how many assets are positive / negative / neutral per factor class. |
| `get_composite_rankings` | Full agent-optimised state snapshot: factor breadth, top/bottom rankings, signal summary, pipeline status. Ideal grounding context before reasoning. |
| `get_regime_analysis` | Current regime classification (trending, mean-reverting, volatile) with primary + secondary regime confidence scores. |
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

- **376 metrics** defined across 8 factor classes
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
> Fork the TR_MOMO_CONT_14D signal with a stricter t_thr of 1.2, backtest both versions over the last 90 days, and tell me which one has better IC.

**Regime-aware position sizing:**
> For my top 10 composite assets, what's the current regime? Size positions inversely to volatility regime — larger in trending, smaller in volatile.

---

## Links

- **Homepage:** [cryptyx.ai](https://cryptyx.ai)
- **Source:** [github.com/cryptyx-ai/cryptyx-mcp-server](https://github.com/cryptyx-ai/cryptyx-mcp-server)
- **OpenAPI spec:** [cryptyx.ai/openapi.yaml](https://cryptyx.ai/openapi.yaml)
- **AI plugin manifest:** [cryptyx.ai/.well-known/ai-plugin.json](https://cryptyx.ai/.well-known/ai-plugin.json)
- **AI reference:** [cryptyx.ai/llms-full.txt](https://cryptyx.ai/llms-full.txt)
- **Changelog:** [CHANGELOG.md](./CHANGELOG.md)

## License

MIT
