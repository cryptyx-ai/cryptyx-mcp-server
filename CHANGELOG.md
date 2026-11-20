# Changelog

All notable changes to `@cryptyx/mcp-server` are documented here. This project follows [Semantic Versioning](https://semver.org/).

---

## [0.12.3] — 2026-11-21

### Changed
- Server instructions and tool descriptions (bundled from the remote connector), not previously listed for 0.12.2:
  - each lens `state` is quoted with its `state_basis` (the rule that set it), never explained from the high/low counts;
  - the asset study description lists its new readings (7- and 14-day returns, spot volume and liquidations, the 90- and 180-day returns, and a `long_term` block for the 365-day horizon), and the instructions point to `long_term` for the 365-day horizon;
  - answer vocabulary: "historical outcomes", "prior instances", "forward returns", "closest prior instances"; never "what followed", "what happened next" or "past cases"; suggested prompts use "identify", "report" or "test"; a z-score is never turned into a direction;
  - one result per question: for "similar levels" conditions are set at today's readings as returned, and a discarded or corrected call is never narrated;
  - the market scan description notes that gold-backed tokens (XAUT, PAXG) are excluded.
  
  Tool names and input schemas are unchanged.
- Server-side (no client update needed): reading names inside lens reasons, episode conditions and conviction checks now match the readings list, and several `reads_as` sentences were reworded (funding, cumulative funding, distance from moving average).
- `analyze_metrics_composite` description (bundled from the remote connector, and in the `smithery.yaml` tool list): the three example patterns are now described in plain English, with no metric IDs and no z-score thresholds. The tool says where identifiers come from instead: each `metric_id` is taken from a CRYPTYX response (`get_featured_metrics`, or the readings inside `get_coin_study`, which carry the `metric_id` next to its plain-English `_display` name), never guessed. Tool name, input schema and behaviour are unchanged. Also includes 0.12.2, which was not published to npm.

---

## [0.12.2] — 2026-11-20

### Changed
- Server instructions (bundled from the remote connector): readings are reported with the `reads_as` sentence the connector now returns beside each current z-score (and `metric_meaning` / `reading_meanings` for tables of past readings), verbatim; a generic name such as "Market reading, 30-day" is reported as given and never rebuilt from the ID; a raw ID is never shown in prose; the volatility expansion scan is described in words and points at the reading's `metric_id` field instead of naming the ID; a question describing an asset's 7-day price and open interest changes as both at negative extremes on a given date routes to the leverage-flush preset of the episode study, pinned to that date. Tool names, schemas and descriptions are unchanged. Plain names now come from the CRYPTYX plain-name registry on the server, so results from this package change with no client update.
- CLI help only: `cryptyx signals fork --params` shows `{"<param_name>": <your value>}` instead of an example parameter with a value. No tool, schema or behaviour change.

---

## [0.12.1] — 2026-11-20

### Changed
- Server instructions (bundled from the remote connector): z-scores are against each asset's trailing 365 days (`z_window_days`), and `history.label` is quoted only for how much price history an episode study or percentile covers; prose uses a reading's `label` (a scan's `metric_label`) where present, otherwise its `_display`; for BTC and ETH, implied volatility comes from the `options` block either study returns. Tool names, schemas and descriptions are unchanged.

---

## [0.12.0] — 2026-11-20

The package is supported again, and now serves exactly what the CRYPTYX remote MCP connector serves.

### Changed
- **No longer deprecated.** The 2026-12-31 sunset announced in 0.9.0 is withdrawn. The npm package is a supported way to connect, alongside the remote MCP (`https://mcp.cryptyx.ai/api/mcp`) and the agent plugin (`https://github.com/cryptyx-ai/agents`).
- **Same tools as the remote MCP connector.** The server is now a stdio front for the connector: it bundles the connector's tool list, descriptions, input schemas and instructions (generated from the connector's source, with a drift test in the CRYPTYX repo) and forwards every call to `<CRYPTYX_API_URL>/api/mcp` with your API key. Results are identical on both surfaces, including plain-English names for every metric and the attribution footer.
- With an API key set, `tools/list` returns the connector's live list; without one, or offline, the bundled list.
- Server instructions, `package.json`, `server.json`, `smithery.yaml` and the README use the count-free description: no scale numbers, "asset" rather than "coin".
- Removed the startup deprecation notice on stderr. `STANDALONE_MCP_SUPPRESS_DEPRECATION` is no longer needed (ignored if set).
- The CLI reports the package version (it said 0.4.0).
- Requires Node.js 20 or later (already true through the `ora` dependency).

### Added
- Tools the connector carries that this package did not: `get_cryptyx_overview`, `get_coin_study`, `get_episode_study`, `check_coverage`, `get_data_liveness`.
- `npm test`: builds the package and runs an offline stdio smoke test.

### Removed (breaking for callers of these tools)
- Tool names are unchanged for the 6 tools that remain: `get_price_history`, `analyze_metric`, `scan_metric_universe`, `get_live_prices`, `get_featured_metrics`, `analyze_metrics_composite`.
- These 32 tools are no longer listed. A call to one returns the remote connector's own refusal (JSON-RPC error `-32602`, `data.reason: "stale_tool_list"`), which tells the user to refresh the tool list; restarting the MCP client does that: `get_market_snapshot`, `get_signal_triggers`, `get_signal_catalog`, `get_top_signals`, `get_factor_scores`, `get_composite_rankings`, `get_market_pulse`, `get_signal_explanation`, `search_assets`, `get_regime_analysis`, `backtest_signal`, `get_asset_liquidity`, `get_asset_top_predictors`, `fork_signal`, `simulate_signal`, `get_macro_regime`, `get_divergences`, `get_asset_divergences`, `get_competition_leaderboard`, `get_competition_rounds`, `get_regime_analog`, `get_trigger_preset`, `get_trigger_z_score`, `get_trigger_z_differential`, `evaluate_custom_trigger`, `get_harness_snapshot`, `get_canonical_setups`, `get_setup_details`, `get_todays_evaluations`, `get_boundary_watchlist`, `evaluate_setup_on_demand`, `get_first_ever_fires`. The REST API and x402 still serve most of the underlying data.
- The four bundled skills (`skills/*.md`), which were built around the removed tools. Current skills ship in the agent plugin.
- The CLI `competition` command: its API endpoints no longer exist.
- The direct `zod` dependency (the MCP SDK brings its own).

## [0.11.1] — 2026-11-15

### Changed
- Copy only: "coin" is now "asset" in the package description, README, `smithery.yaml` listing and the bundled skills. No tool, schema or behaviour changes.

## [0.9.0] — 2026-07-19

### Deprecated
- **This package is entering deprecation.** The flagship CRYPTYX MCP integration is now the OAuth 2.1 Remote MCP surface at `https://cryptyx.ai/api/mcp` — no config file editing, no API key management, revocable per-app, enterprise/SOC 2 ready. Migrate at [cryptyx.ai/mcp](https://cryptyx.ai/mcp).
- Deprecation notice printed to stderr on startup. Suppress with `STANDALONE_MCP_SUPPRESS_DEPRECATION=1` in the client's env config.
- **Sunset date: 2026-12-31.** After this date the package will be moved to security-fix-only mode; no new features, no tool catalog updates. Existing `cx_*` API keys continue to work indefinitely.
- No forced migration timeline for existing users — old configs stay valid. This release is about pointing new installs at the strictly better path.

### Notes
- New tools shipped in the OAuth Remote MCP catalog (`get_regime_analog`, `get_trigger_preset`, `get_trigger_z_score`, `get_trigger_z_differential`, `evaluate_custom_trigger`, `get_macro_regime`, `get_divergences`, `get_asset_divergences`) — this stdio server now has feature parity with the flagship, but no further additions will land here.

---

## [0.6.0] — 2026-05-30

### Added
- **`get_macro_regime` tool** — market-wide macro regime classification across all horizons. Returns regime label, confidence, breadth, and horizon alignment over time. CLI: `cryptyx macro-regime [--days N] [--horizon 7d] [--json]`.
- **`get_divergences` tool** — cross-factor divergence alerts: distribution (bearish), capitulation (bullish), ignition (bullish). Detects when factor classes disagree — early warning of regime shifts. CLI: `cryptyx divergences [--horizons 7d,30d] [--json]`.
- **`/api/market-pulse/divergences` endpoint** — new REST API endpoint powering the divergence tool and x402 pay-per-call ($0.01 Standard tier).

### Changed
- **"Broad Risk-On" → "Broad Expansion"** — regime label renamed across all surfaces. The old label implied positive returns, but the regime can trigger via breadth alone (5+ of 7 factor classes expanding) without positive trend. Internal DB key `RISK_ON_BROAD` unchanged.
- **5-level supertrend vocabulary** — standardised across all surfaces: Bullish (>70), Leaning Bullish (55-70), Neutral (45-55), Leaning Bearish (30-45), Bearish (<30). Previously, HeroTimeline used a 3-level system that conflicted with the AI Edge narrative.
- Tool count updated: 22 → 25 (includes `get_asset_top_predictors` from 0.5.0).

---

## [0.4.0] — 2026-04-20

### Added
- **CRYPTYX CLI** — human-facing terminal interface as second `bin` entry (`npx cryptyx`). 13 command groups covering all 22 MCP tools with table formatting, colored output, and spinners.
- **Shared API client** — extracted `api-client.ts` from `server.ts`. Both CLI and MCP server share the same `apiFetch`/`apiPost` plumbing with unified config resolution (env > config file > defaults).
- **XDG-compliant config** — `cryptyx config set-key/show/clear` persists API keys to `~/.config/cryptyx/config.json`.
- **Global flags** — `--json` (raw output), `--api-key`, `--api-url` on every command.
- **Commands:** `snapshot`, `market`, `signals` (top/catalog/explain/backtest/fork/simulate), `factors`, `regime`, `pulse`, `prices`, `price`, `assets`, `liquidity`, `metrics` (featured/analyze/scan/composite), `competition` (rounds), `config` (set-key/show/clear).

### Dependencies
- Added `citty` (~3KB) for subcommand routing
- Added `picocolors` (~1KB) for terminal colors
- Added `ora` (~8KB) for spinners

---

## [0.3.0] — 2026-04-20

Major quality upgrade: conviction playbook embedded in tool descriptions, anti-hallucination guardrails, and mandatory data-provenance disclaimer on every tool response.

### Added
- **`get_top_signals` tool** — curated top 10 signals by 7d IC, pre-filtered to A/B health grade. New tool (22 total, was 21).
- **Data-provenance disclaimer** injected as a second content block on every tool response. Distinguishes API-verified data from AI-generated narrative.
- **Anti-hallucination guardrails** on `get_signal_triggers`, `get_top_signals` — explicit STRAT_\*/COMBO_\*/SETUP_\* rejection and "only reference IDs seen in API responses" rule.
- **Hero alpha path** in `get_composite_rankings` and `get_featured_metrics` — guides users toward multi-factor thesis building via the metric slicer.
- **Thesis pattern examples** with verified metric IDs in `analyze_metrics_composite` (capitulation reversal, efficiency breakout, stealth accumulation).

### Changed
- **All 22 tool descriptions rewritten** from generic docstrings to opinionated LLM prompts teaching the conviction loop: Ground -> Discover -> Validate -> Cross-check -> Size -> Decide.
- **`get_composite_rankings`** now marked "ALWAYS CALL FIRST" with 4-path playbook.
- **`get_regime_analysis`** elevated to critical gate — "regime must align with thesis direction before recommending action."
- **`backtest_signal`** now includes mandatory field checklist (reliability_grade, is_sample_sufficient, is_reliable, statistical_significance, caveats).
- **`get_factor_scores`** enforces all 8 factor classes in output — "A neutral reading is data, not absence of data."
- **`get_featured_metrics`** repositioned as ALPHA DISCOVERY with 4-step premium workflow.
- **`analyze_metrics_composite`** described as HIGHEST-CONVICTION TOOL with backtested thesis patterns.
- **`scan_metric_universe`** now includes mandatory health-grade checklist.

### Fixed
- **4 hallucinated metric IDs** in thesis examples corrected: FLOW_TAKER -> FLOW_TAKER_BS_RATIO, FUT_FR -> FUT_FUNDING_MA_7D, EFF_CLOSE_EFFICIENCY_14D -> EFF_ER_14D, TR_SMA_RATIO_50_200 -> TR_MA_DIST_60D.
- Removed all enabled/disabled/deactivated language from tool descriptions (was leaking internal state concepts to LLMs).

---

## [0.2.3] — 2026-04-12

Unblocks external registry submissions (Glama, Smithery) by establishing a public source mirror. No tool or API surface changes.

### Added
- **Public source mirror** at [github.com/cryptyx-ai/cryptyx-mcp-server](https://github.com/cryptyx-ai/cryptyx-mcp-server). On every `mcp-v*` tag, the publish workflow automatically force-pushes `mcp-server/` contents to the satellite repo. The main CRYPTYX monorepo stays private (contains protected metrics/signals IP); the MCP server stays public for registry verification.
- **`homepage` and `bugs`** fields in `package.json`.

### Changed
- **`repository.url`** in `package.json` now points to `cryptyx-ai/cryptyx-mcp-server` (was `cryptyx-ai/cryptyx`, which returned 404 to unauthenticated clients because the repo is private — the root cause of Glama's "repository not found or not public" rejection).
- **`mcpName`** updated to `io.github.cryptyx-ai/cryptyx-mcp-server` to match the public repo location.
- **README Source link** now points to the public satellite repo.
- **smithery.yaml** and **server.json** URLs updated accordingly.

### Infrastructure
- **Satellite sync step** added to `.github/workflows/publish-mcp-server.yml`. Runs after successful `npm publish`, uses a fine-grained PAT scoped only to the satellite repo (`SATELLITE_REPO_TOKEN` secret). Force-push model: satellite always reflects current `mcp-server/` state.

---

## [0.2.2] — 2026-04-12

First automated release via GitHub Actions + npm Trusted Publishing (OIDC). Full tool surface documented; marketing surface upgraded.

### Added
- **Full 21-tool surface documented** in README (previously only 10 tools were listed — 11 were invisible to anyone discovering the package on npm).
- **6-step conviction loop framing** (DISCOVER → DEFINE → VALIDATE → SCAN → STORE → EXECUTE) — each tool explicitly maps to a step.
- **CHANGELOG.md** for the package (this file).
- **Expanded npm keywords** for discoverability: `backtesting`, `factor-model`, `quant`, `autonomous-trading`, `conviction-engine`, `claude`, and more.

### Changed
- **Default API URL** is now `https://cryptyx.ai` (was pointing at an internal Vercel preview URL).
- **Package description** rewritten: *"CRYPTYX — the conviction engine for autonomous crypto trading agents. 21 tools across 376 metrics, multi-factor backtesting, signal persistence, and regime analysis."*
- **README** fully rewritten with tool groupings, factor class reference, daily pipeline schedule, and example agent prompts.
- **Data pipeline timings** corrected: metrics 01:20 UTC, signals 02:27 UTC (README previously said "00:00 UTC").
- Server version string aligned with package version (`0.2.2`).

### Fixed
- Stale "35 signals" and "37 signals" references removed — signal count is now dynamic in tool descriptions.
- Version drift between `package.json`, `server.json`, `smithery.yaml`, and the runtime server version string.

### Infrastructure
- **Trusted Publishing (OIDC)** replaces long-lived npm tokens. Zero secrets in CI. Automatic sigstore provenance attestations on every release.
- Releases now tied to git tags (`mcp-v*`) with automated version validation.

---

## [0.2.0] — 2026-03-20

Initial public release on npm. 21 tools covering factor discovery, signal management, market intelligence, execution context, and the CRYPTYX Challenge leaderboard. Published manually; documentation and metadata covered a subset of the tool surface.

Earlier history is tracked in [git](https://github.com/cryptyx-ai/cryptyx/commits/main/mcp-server).
