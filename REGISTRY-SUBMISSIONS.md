# MCP Registry Submission Packages

Ready-to-paste content for all five target registries.
Package: `@cryptyx/mcp-server@0.2.3` — published on npm via Trusted Publishing (OIDC).
Public source repo: `cryptyx-ai/cryptyx-mcp-server` (satellite — auto-synced from private monorepo on every release).

---

## 1. Glama (glama.ai)

**Submit via:** https://glama.ai/mcp/servers/submit

| Field | Value |
|-------|-------|
| **Package name** | `@cryptyx/mcp-server` |
| **Display name** | CRYPTYX — Crypto Intelligence Engine |
| **Homepage** | https://cryptyx.ai |
| **Repository** | https://github.com/cryptyx-ai/cryptyx-mcp-server |
| **Categories** | Finance, Trading, Data & Analytics |
| **Auth type** | API Key (`CRYPTYX_API_KEY`) |

**Short description (160 chars):**
```
376 crypto metrics across 8 factor classes, multi-factor backtesting, signal persistence, and regime analysis for autonomous trading agents.
```

**Long description:**
```
CRYPTYX is the conviction engine for autonomous trading agents. It converts fragmented crypto telemetry into institutional-grade intelligence:

• 376 metrics across 8 factor classes (CORR, EFF, FLOW, FUT, OB, OPT, TR, VOL)
• Multi-factor backtest: define 2-4 metric conditions, see forward returns at 8 horizons
• Universe scan: which of 200+ assets match your conditions today?
• Signal persistence: store validated theses — the daily pipeline auto-alerts when conditions recur
• Regime analysis: trending, mean-reverting, volatile classification with confidence scores
• Competition leaderboard: AI agents competing with real CRYPTYX signals

The 6-step conviction loop: DISCOVER (top metrics by IC) → DEFINE (multi-factor thesis) → VALIDATE (backtest at 8 horizons) → SCAN (universe scan) → STORE (fork_signal) → EXECUTE (via OKX/Kraken).

Install: npx @cryptyx/mcp-server
```

**Tool list (paste as-is):**
```
get_market_snapshot, get_signal_triggers, get_signal_catalog, get_factor_scores,
get_composite_rankings, get_market_pulse, get_price_history, get_signal_explanation,
search_assets, get_regime_analysis, backtest_signal, analyze_metric,
scan_metric_universe, get_asset_liquidity, get_live_prices, get_featured_metrics,
fork_signal, simulate_signal, analyze_metrics_composite, get_competition_leaderboard,
get_competition_rounds
```

---

## 2. Smithery (smithery.ai)

**Submit via:** https://smithery.ai/submit
**Auto-indexing:** `smithery.yaml` is already in the repo root of `mcp-server/` — Smithery will pick it up automatically on index.

**For manual submission form:**

| Field | Value |
|-------|-------|
| **npm package** | `@cryptyx/mcp-server` |
| **GitHub repo** | https://github.com/cryptyx-ai/cryptyx-mcp-server |
| **Install** | `npx @cryptyx/mcp-server` |
| **Auth** | API Key — set `CRYPTYX_API_KEY` env var |

**Description:**
```
CRYPTYX — conviction engine for autonomous crypto trading agents. 21 tools covering 376 metrics across 8 factor classes, multi-factor backtesting, universe scans, signal persistence, and regime analysis. Works alongside OKX and Kraken execution toolkits.
```

**Example prompts to include:**
```
"Use CRYPTYX to find the top-performing metrics by IC, build a multi-factor thesis combining funding stress with volatility compression, backtest it on BTC, and scan the universe for matches today."

"What signals are firing today? Explain why VOL_SPIKE triggered on ETH yesterday."

"Fork the TR_PRICE_MOM_Z signal with a more aggressive z-threshold of 2.5 and backtest it over the last 90 days."
```

**Claude Desktop config (include in submission):**
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

---

## 3. Composio (composio.dev)

**Submit via:** https://composio.dev/submit-integration or open a GitHub issue on their repo.

| Field | Value |
|-------|-------|
| **Integration name** | CRYPTYX |
| **Category** | Finance / Crypto / Trading Intelligence |
| **Auth type** | API Key |
| **npm package** | `@cryptyx/mcp-server` |
| **Docs URL** | https://cryptyx.ai |

**Description:**
```
CRYPTYX provides institutional-grade crypto intelligence for AI agents — 376 metrics across 8 factor classes, multi-factor hypothesis testing, signal backtesting, and universe scanning across 200+ assets. Designed to complement exchange execution toolkits (OKX, Kraken) with a conviction layer: the agent defines its own thesis from raw metrics, backtests it, and scans the universe for live matches.
```

**Use cases:**
```
1. Autonomous trading agent: discover high-IC metrics → build thesis → backtest → scan → execute on OKX
2. Portfolio intelligence: daily regime analysis and factor score monitoring across 200+ assets
3. Signal research: backtest and fork existing signals, simulate threshold changes
4. Competition: register AI agents for the CRYPTYX Challenge leaderboard
```

**Tool summary (21 tools):**
```
Market data: get_market_snapshot, get_price_history, get_live_prices, search_assets
Factor intelligence: get_factor_scores, get_composite_rankings, get_market_pulse, get_regime_analysis
Signal management: get_signal_triggers, get_signal_catalog, get_signal_explanation, backtest_signal, fork_signal, simulate_signal
Metric slicer: get_featured_metrics, analyze_metric, scan_metric_universe, analyze_metrics_composite
Competition: get_competition_leaderboard, get_competition_rounds
Asset liquidity: get_asset_liquidity
```

---

## 4. LangChain Hub

**Submit via:** https://smith.langchain.com/hub (create a tool/integration listing)
**Also:** Open a PR to langchain-ai/langchain adding CRYPTYX to the integrations list.

**Package description:**
```
CRYPTYX MCP — crypto conviction engine for AI agents. 376 metrics, multi-factor backtesting, signal persistence, regime analysis.
```

**Python integration example (LangChain + MCP):**
```python
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain.agents import create_react_agent
from langchain_anthropic import ChatAnthropic

# Connect to CRYPTYX MCP server
async with MultiServerMCPClient({
    "cryptyx": {
        "command": "npx",
        "args": ["@cryptyx/mcp-server"],
        "env": {"CRYPTYX_API_KEY": "your-key"},
        "transport": "stdio",
    }
}) as client:
    tools = client.get_tools()

    llm = ChatAnthropic(model="claude-sonnet-4-6")
    agent = create_react_agent(llm, tools)

    result = await agent.ainvoke({
        "messages": [{
            "role": "user",
            "content": "Find the top metrics by IC, build a multi-factor thesis on BTC combining trend momentum with funding accumulation, backtest it, then scan the universe for assets matching both conditions today."
        }]
    })
```

**Key capabilities to highlight in listing:**
- 21 tools covering the full conviction loop: discover → define → validate → scan → execute
- `analyze_metrics_composite`: multi-factor intersection backtest at 8 time horizons
- `scan_metric_universe`: cross-asset z-score scans across 200+ assets
- `fork_signal`: persist validated strategies — daily pipeline auto-evaluates them
- Compatible with OKX and Kraken agent toolkits for end-to-end autonomous trading

---

## 5. LlamaIndex Hub

**Submit via:** https://llamahub.ai/submit
**Also:** PR to run-llama/llama_index adding a CRYPTYX tool spec.

**Package description:**
```
CRYPTYX Tool Spec — institutional crypto intelligence for AI agents. Wraps the CRYPTYX MCP server (npx @cryptyx/mcp-server) exposing 21 tools across market data, factor analysis, signal management, metric backtesting, and regime classification.
```

**Python integration example (LlamaIndex + MCP):**
```python
from llama_index.tools.mcp import MCPToolSpec
from llama_index.agent.openai import OpenAIAgent
from llama_index.llms.anthropic import Anthropic

# Load CRYPTYX tools via MCP
cryptyx_spec = MCPToolSpec(
    server_params={
        "command": "npx",
        "args": ["@cryptyx/mcp-server"],
        "env": {"CRYPTYX_API_KEY": "your-key"},
    }
)
tools = cryptyx_spec.to_tool_list()

# Create agent
llm = Anthropic(model="claude-sonnet-4-6")
agent = OpenAIAgent.from_tools(tools, llm=llm, verbose=True)

response = agent.chat(
    "Use CRYPTYX to find assets with extreme funding rate z-scores above 2.0 "
    "AND realized volatility compression below -1.0. "
    "Show me the backtest results for this thesis on BTC at all available horizons."
)
print(response)
```

**Tool categories to list:**
```
Metric Slicer (hero features):
  - get_featured_metrics       # top metrics by IC — start here
  - analyze_metric             # single-metric backtest, 8 horizons
  - analyze_metrics_composite  # multi-factor intersection backtest
  - scan_metric_universe       # universe-wide z-score scan

Signal Intelligence:
  - get_signal_triggers        # today's active signals
  - get_signal_catalog         # full signal catalog with stats
  - backtest_signal            # signal backtest over date range
  - get_signal_explanation     # why did this signal fire?
  - fork_signal                # persist a new strategy variant
  - simulate_signal            # estimate trigger rate changes

Market Context:
  - get_market_snapshot        # composite rankings
  - get_factor_scores          # 8-class factor t-scores
  - get_market_pulse           # factor breadth analysis
  - get_regime_analysis        # trending/mean-reverting/volatile
  - get_asset_liquidity        # OB depth for execution sizing
  - get_price_history          # OHLCV candles
  - get_live_prices            # 15-minute spot prices
  - search_assets              # 200+ asset universe

Competition:
  - get_competition_leaderboard
  - get_competition_rounds
```

---

## Summary Checklist

- [ ] **Glama** — submit at glama.ai/mcp/servers/submit
- [ ] **Smithery** — `smithery.yaml` already in repo; submit URL at smithery.ai/submit
- [ ] **Composio** — submit integration at composio.dev or open GitHub issue
- [ ] **LangChain Hub** — create listing at smith.langchain.com/hub + PR to langchain-ai/langchain
- [ ] **LlamaIndex Hub** — create listing at llamahub.ai/submit + PR to run-llama/llama_index
