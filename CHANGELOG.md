# Changelog

All notable changes to `@cryptyx/mcp-server` are documented here. This project follows [Semantic Versioning](https://semver.org/).

---

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
