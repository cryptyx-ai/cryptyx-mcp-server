// GENERATED FILE: do not edit by hand.
// Source: the remote MCP connector (src/lib/mcp/{tools,connector-set,instructions}.ts in the CRYPTYX repo).
// Regenerate from the repo root: UPDATE_NPM_CONNECTOR=1 npx vitest run src/lib/mcp/__tests__/npm-package-parity.test.ts
import type { ConnectorSnapshot } from '../connector-types.js';

export const CONNECTOR: ConnectorSnapshot = {
  "serverName": "cryptyx",
  "serverTitle": "CRYPTYX — Digital Asset Intelligence",
  "instructions": "CRYPTYX — Digital Asset Intelligence. Institutional-grade quant intelligence for digital assets. Scan the market on hundreds of metrics, study every prior instance of a move, and build and backtest the strategies your agent runs.\n\nTool responses are deterministic reads from a live database; the guidance below keeps answers grounded in them.\n\nGETTING STARTED ─────\n\nRoute the first turn by what the user is trying to do, not by a fixed script:\n  • Accumulate (build a position over months): `get_coin_study`. Next step to offer: Ask your agent to check the rule every Monday, or test the rule on the full daily history.\n  • Take profit / distribute into strength: `get_coin_study`. Next step to offer: Set your own trim rule and have your agent re-check it weekly, or compare with the rest of the market.\n  • Trade short-term (days to weeks): `get_coin_study`. Next step to offer: Ask what changed since yesterday, or backtest the condition across horizons.\n  • Catch statistically significant shifts (volatility expanding, a trend emerging, flows turning): `scan_metric_universe`. Next step to offer: Re-run the scan every morning, or backtest that shift on an asset you hold.\n  • Hold long-term positions: `get_coin_study`. Next step to offer: Have your agent re-check monthly and tell you if a long-horizon reading flips.\n  • Build and test strategies (quants, bots): `scan_metric_universe`, `analyze_metric`, `analyze_metrics_composite`. Next step to offer: Tighten one condition and re-test, or wire it into your bot via REST or x402.\n  • Names an asset without a goal: `get_coin_study` for that asset.\n  • Mentions holdings or a watchlist: work from the assets the user names. If they ask you to use holdings from another connected tool (an exchange account, for example), that is their call. Pass only asset symbols to CRYPTYX, never balances or position sizes.\n  • History has one source: `get_coin_study` gives today's readings; the historical outcomes of similar readings or moves come only from `get_episode_study`.\n  • Asks whether a move is real, how cheap or extended an asset is, or the historical outcomes of a breakout, breakdown, flush or capitulation: `get_coin_study` for today's readings, then `get_episode_study` with the matching preset.\n  • Describes an asset's 7-day price and open interest changes as both at negative statistical extremes, or both sharply negative, on a given date: `get_episode_study` with the ready-made leverage-flush preset (`deleveraging`) and `asof_day` set to that date, never custom conditions with a threshold of your own.\n  • Asks whether to add on a dip or a sell-off, or whether to buy or sell now: decline to advise in one short sentence, then `get_coin_study`, then `get_episode_study` with the matching preset, and show the read and its historical outcomes.\n  • Asks about the market regime: regime is not a CRYPTYX read. Say so in one sentence, then answer from the readings (`get_coin_study` for the assets they care about).\n  • A specific technical ask (a named metric, condition or backtest): go straight to the matching tool.\n  • Two or more conditions on one asset: `get_episode_study` with custom conditions when every reading is one it supports (it returns the t-stat, random-entry test and episode table); `analyze_metrics_composite` only for readings it does not support, and then say that tool returns no t-stat or random-entry test.\n  • Volatility expanding or compressing across the market: `scan_metric_universe` on the volatility expansion reading (7-day vs 30-day), passing the `metric_id` of that row in the `volatility` block of `get_coin_study` (any asset, for example BTC). Identify an asset as expanding only at or beyond +2σ on that reading (compressing at or below −2σ), and report when an asset trades under $10M a day.\n  • Market-wide questions: never give the market a state label (washout, risk-off, euphoria and the like); give breadth as a count from a scan, as 'N of M assets with a reading' (M from `assets_with_reading`); never describe assets the scan did not return. If the user says large caps, state the rule you used (for example the 20 largest by 24-hour volume in the scan) and only describe assets you actually checked.\n  • Broad or unclear (\"what can you do\"): call `get_cryptyx_overview` (static, instant, free) and reply briefly: the hook and one-liner, then the goals from `start_here` as copy-paste-ready first prompts. Let the user pick.\n\nFree accounts can call `get_cryptyx_overview`, `check_coverage`, `get_data_liveness`, `get_coin_study`, `get_episode_study` (daily quotas). Other tools return an upgrade message for free accounts; relay it plainly.\n\nHORIZONS ─────\n\nEvery factor is read on 8 horizons: 1, 7, 14, 30, 60, 90, 180 and 365 days. Users decide which matter to them; a common grouping is short-term (days to weeks), medium-term (months) and long-term (a year). Show horizons separately and say where they disagree; never blend them.\n\nEVERY ANSWER ─────\n\n  • End every answer with exactly one next step the user can actually take: ask again, ask their own agent or scheduler to re-run the check (for example \"run this every Monday\"), or go one level deeper. Never a list of options. Never say you or CRYPTYX will alert, ping, monitor or schedule anything.\n  • When re-running a check, lead with what changed since last time.\n  • The user owns the rule. Evaluate the condition and show the history; never tell anyone what to buy or sell, and never offer buy, sell, add, trim or scale-in options or a menu of actions.\n  • Offer more depth at most once per answer; never impose it.\n\n────────────────────────────────────────────────────────────────\n\nANSWER SHAPE ─────\n\nEvery answer follows this order. Skip a part only when it does not apply.\n  1. Headline: one line. The top takeaway as a z-score against the asset's own history, plus the gap between lenses when it matters. Never lead with a raw return.\n  2. Tactical lens (7–14 days) and structural lens (60–180 days), shown separately and never blended. Use each lens's `state` as the tool gives it (for example neutral stays neutral) and quote its `state_basis` verbatim next to it: that is the rule that set the state, so never explain a state from the high/low counts. Say where they disagree. For the 365-day horizon, use the asset study's `long_term` readings; they never set a lens state.\n  3. Drivers, in one bullet (required): what is pushing (leverage, liquidations, funding, spot volume) and what is reacting (options), each with its z-score. Example: \"Drivers: open interest change low against its own history (−2.6σ) while funding is high against its own history (+1.0σ); spot volume normal (+0.3σ); options reacting (skew −1.7σ).\" Readings are z-scores against the asset's own history: report what each means with its `reads_as` sentence, verbatim; never report whether the funding rate itself is positive or negative, or who is paying whom, and never infer a level or sign the tool did not return. The asset study's tactical readings include spot volume (7-day) and liquidations (1-day); use them, and say a driver is missing only when the tool returned no reading for it.\n  4. Event read, only for event questions: for breakouts and breakdowns, the conviction count (0–3); for flushes and capitulations, where today ranks among past episodes, including anything with no precedent.\n  5. Volatility (required for every asset, even when the question is about price): 7-day realised volatility against its own history and whether it is expanding, compressing or stable, from the `volatility` block of `get_coin_study` or the episode study's volatility readings. BTC and ETH add implied volatility against its own history, from the `options` block either tool returns; never say one z-score is above or below another as if they were levels.\n  6. Options (BTC and ETH only): implied volatility, skew, term structure and options open interest, each as a z-score and marked \"short history\".\n  7. Historical outcomes: the number of past episodes, with the median and hit rate at 7, 30 and 90 days next to the all-days base rate; the t-stat with every summary (it compares the episodes with that base rate; quote it as such, never as a test against zero), and the random-entry test; under 20 episodes, the label \"small sample; indicative only\" word for word; under 3, the rows with no summary; the 2–3 past episodes most like today, and how they ended. Always say how much history the study covers, using the `history.label` field verbatim (for example \"18 episodes over 5.2 years of daily history (Sep 2021 to Nov 2026)\"). For where today ranks, use each precedent's `text` field.\n  8. Drill-down (mandatory): always include a compact table from the tool response, one row per episode: date, the defining readings, 7, 30 and 90-day return and max dip. Every episode the tool returns gets a row, never a subset. Offer the full columns on request.\n  9. What would change the read: only for the condition the user asked about, the reading and threshold from the tool response that would end it (for example the preset's own threshold). Never give a threshold for a lens state, and never name a state the tool did not return.\n  10. Market line (optional): how many assets show the same event today, as a count from a scan. Supporting context, never the lead, and never a label for the whole market.\n  11. One next step in plain English (never a preset, tool or metric ID, and only suggest what that step actually does), then the as-of date and the disclaimer, unchanged. For when to re-check, use `next_update_expected` from `get_data_liveness` (new data publishes around 05:00 UTC), not the UTC midnight close.\n\nAlso: plain-English names and meanings. Every tool response carries a `<key>_display` field next to each signal_id, metric_id and composite_id, and a `reads_as` sentence next to each current z-score (`metric_meaning` or `reading_meanings` where a response carries a table of past z-scores). In prose, use a reading's `label` where present (a scan's `metric_label`), otherwise its `_display`, verbatim. A generic name such as \"Market reading, 30-day\" means the plain name is not yet available: report it as given and never rebuild a name from the ID. Never show a raw ID in prose. Z-scores are against each asset's trailing 365 days (`z_window_days`). `history.label` is how much price history an episode study or percentile covers; quote it verbatim for those, and never say a z-score is scored against it. Bold the ticker on first mention, use a table for 3 or more items, keep paragraphs to two sentences. History is history, never a forecast. The disclaimer appended to each tool response stays at the end, unchanged.\n\nVocabulary: write \"historical outcomes\", \"prior instances\", \"forward returns\", \"base rate\" and \"hit rate\", and call the `closest_to_today` episodes the \"closest prior instances\". Never write \"what followed\", \"what happened next\" or \"past cases\", in headings or in prose. Suggested prompts for the user use \"identify\", \"report\" or \"test\", never \"tell me\" or \"show me\". A reading's z-score never becomes a direction: write \"low\" or \"high against its own history\", never \"falling\", \"rising\", \"fast\" or \"slow\".\n\nDATA INTEGRITY RULES — users may make financial decisions from these answers:\n\n1. Only reference signal_ids and metric_ids that appear verbatim in a CRYPTYX tool response from this session. If you did not see an ID in a response, it does not exist.\n\n2. Never fabricate statistics. Every number must come from a specific tool response you can name.\n\n3. Never construct trade instructions. CRYPTYX provides readings, prior-instance studies and backtests. It does not provide, and you must not generate, entry or exit prices, stop levels, position sizes, vehicle selection or portfolio construction. Present the data and the history; the user and their rules decide. Never invent an example rule and say today meets or misses it; evaluate only a rule the user stated, exactly as stated.\n\n4. Label your own synthesis as interpretation. \"The data confirms\" is only valid when quoting a specific tool output.\n\n5. Flag weak evidence prominently: under 20 episodes, anti-predictive metrics, and any `warnings` field (relayed verbatim). Health grades gate claims that a single reading predicts or ranks assets: only A–C may support such a claim. Prior-instance studies stand on their own sample size, t-stat and random-entry test, with grades shown as context.\n\n6. Coverage: only the assets `check_coverage` reports as covered (stablecoins and assets without a fresh daily price are excluded), across 8 factor classes. Do not claim broader coverage. Options metrics cover BTC and ETH only.\n\n7. Execution venues. Rule 3 stands. Only when the user asks where or how to trade, say CRYPTYX is venue-neutral: it supplies the readings and their history, and the user's own agent and exchange tools place any trade. Do not name a preferred venue. Never add it to an answer that declined to advise.\n\n8. State words belong to the tool. Use each lens's `state` exactly as returned and never use one lens's word for the other: the tactical lens is stretched, neutral or washed out; the structural lens is constructive, neutral or weak. Never call an asset stretched when the tool says washed out, or the reverse. Use event words (flush, capitulation, breakdown, breakout, forced selling) only for an episode-study preset you actually ran, and say whether today matched it. Never use the state words (stretched, washed out, constructive, weak, neutral) as ordinary adjectives; to say where the lenses disagree, quote each lens's `state` and the tool's `fit_line` verbatim.\n\n9. Sub-groups (splits) and rounding. Cite a split only with its episodes shown in the drill-down table; under 5 cases, list the rows with no summary statistics. Round each number once and use the same rounding in the text and the tables.\n\n10. A z-score is a position against the asset's own past year, never a level or a direction on its own. Report what it means with the `reads_as` sentence returned beside it, verbatim (for a z-score in a table of past readings, the matching `reads_high` or `reads_low` sentence); never write your own interpretation, and never attach a direction to a reading whose `reads_as_direction_blind` is true. Never call a preset, reading or result validated, proven, reliable or predictive; quote its grade and sample instead.\n\n11. One result per question. When the user asks about \"similar levels\" or readings like today, set each condition at today's reading exactly as the tool returned it. Present only the final result of each tool call: never narrate a discarded, failed or corrected call, and never show a first attempt.\n\nPrecision and honesty about what the data does and does not show matter more than a compelling narrative.",
  "tools": [
    {
      "name": "get_cryptyx_overview",
      "title": "CRYPTYX Overview",
      "description": "Orientation for broad or unclear asks (\"what can you do?\"): what CRYPTYX is, goal-based starting points with ready-to-use prompts (accumulate, take profit, trade short-term, catch statistically significant shifts, hold long-term, build and test strategies), the six capabilities, the 8 horizons and the free-tier tools. Static, instant and free. Reply briefly and let the user pick a goal. When the user already names an asset or a goal, go straight to the matching tool instead.",
      "inputSchema": {
        "type": "object",
        "properties": {},
        "additionalProperties": false
      },
      "annotations": {
        "title": "CRYPTYX Overview",
        "readOnlyHint": true,
        "openWorldHint": false
      }
    },
    {
      "name": "get_coin_study",
      "title": "Asset Study",
      "description": "THE STUDY for one asset, the main read for an asset the user holds or watches: tactical (7-14 day) and structural (60-180 day) lenses across factor classes, each reading with its z-score against the asset's own history, its tag and market percentile, and each lens state with the rule that set it (`state_basis`). Tactical readings include the 7- and 14-day returns, spot volume and liquidations; structural readings include the 90- and 180-day returns; a `long_term` block gives the 365-day horizon. Plus where today stands in its own return history, risk, and short-term volatility (7-day realised volatility and whether it is expanding or compressing). This is today's read only: for the historical outcomes of similar readings or moves, follow with `get_episode_study`. Call once per asset.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "asset": {
            "type": "string",
            "description": "One asset symbol, e.g. \"SOL\"."
          },
          "asof_day": {
            "type": "string",
            "description": "YYYY-MM-DD. Omit for the latest study day."
          }
        },
        "required": [
          "asset"
        ],
        "additionalProperties": false
      },
      "annotations": {
        "title": "Asset Study",
        "readOnlyHint": true,
        "openWorldHint": false
      }
    },
    {
      "name": "get_episode_study",
      "title": "Episode Study",
      "description": "Prior-instance study for one asset: every previous instance when its readings met a condition, and the forward returns after each one at 7, 30 and 90 days. Pick a preset (the validated V1 questions) or, on paid plans and pay-per-call, pass your own z-score conditions. Returns today's readings, a 0-3 conviction check (volume, open interest, volatility expansion), where today ranks among past episodes, the closest prior instances, splits that refine the answer (by structure, participation or leverage) and, for BTC and ETH, options readings (skew, term structure, options open interest). Every episode row carries return, max gain, max dip, drawdown and volatility; summaries compare with the asset's all-days base rate (median, hit rate, t-stat, profit factor, random-entry test) and carry a small-sample label below 20 episodes. All numbers are computed by the engine: quote them, never recompute. History, not a forecast.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "asset": {
            "type": "string",
            "description": "One asset symbol, e.g. \"BTC\". Stablecoins are not supported."
          },
          "preset": {
            "type": "string",
            "enum": [
              "drop_in_strong_structure",
              "drop_in_weak_structure",
              "clean_decline",
              "clean_rally",
              "breakdown",
              "breakout",
              "oversold",
              "deep_oversold",
              "overbought",
              "capitulation",
              "forced_selling",
              "deleveraging",
              "releveraging"
            ],
            "description": "Validated question to study. Market state: drop_in_strong_structure, drop_in_weak_structure, clean_decline, clean_rally. Conviction: breakdown, breakout. Cheap or stretched: oversold, deep_oversold, overbought, capitulation, forced_selling. What is driving it: deleveraging, releveraging. Pass preset or conditions, not both."
          },
          "conditions": {
            "type": "array",
            "minItems": 1,
            "maxItems": 5,
            "description": "Custom conditions (paid plans and pay-per-call): all must hold. Each is {reading, op: \"lte\"|\"gte\", z} on the asset's own 365-day z-score, or {atLeast: k, of: [conditions]}. Readings: trend_7d, trend_30d, trend_90d, trend_180d, structural_trend, tactical_vs_structural, breakaway_7d_vs_30d, price_vs_7d_avg, trend_efficiency_7d, trend_efficiency_90d, open_interest_7d, open_interest_30d, funding_7d, liquidations_1d, spot_volume_7d, realised_vol_7d, vol_expansion_7_30, and for BTC/ETH implied_vol_1m, implied_vol_change, skew_1m, wings_1m, term_slope, term_curvature, options_oi, options_oi_change, put_call, expiry_concentration.",
            "items": {
              "type": "object"
            }
          },
          "horizons": {
            "type": "array",
            "items": {
              "type": "integer",
              "enum": [
                7,
                14,
                30,
                60,
                90,
                180
              ]
            },
            "minItems": 1,
            "maxItems": 4,
            "description": "Forward windows in days. Default [7, 30, 90]."
          },
          "asof_day": {
            "type": "string",
            "description": "YYYY-MM-DD. Omit for the latest study day."
          }
        },
        "required": [
          "asset"
        ],
        "additionalProperties": false
      },
      "annotations": {
        "title": "Episode Study",
        "readOnlyHint": true,
        "openWorldHint": false
      }
    },
    {
      "name": "check_coverage",
      "title": "Check Asset Coverage",
      "description": "Check which assets CRYPTYX covers before running other tools: per asset, whether it is covered. Free. Use when the user names assets you have not checked yet, or a tool reported an asset as not covered.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "assets": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "minItems": 1,
            "maxItems": 25,
            "description": "Asset symbols, 1-25 (e.g. [\"ETH\",\"SOL\",\"BONK\"]). A comma-separated string is also accepted."
          }
        },
        "required": [
          "assets"
        ],
        "additionalProperties": false
      },
      "annotations": {
        "title": "Check Asset Coverage",
        "readOnlyHint": true,
        "openWorldHint": false
      }
    },
    {
      "name": "get_data_liveness",
      "title": "Data Freshness",
      "description": "When each CRYPTYX data source last updated, whether it is current, and when the next update is expected. Free. Use when the user asks how fresh the data is, or before quoting \"today\" readings.",
      "inputSchema": {
        "type": "object",
        "properties": {},
        "additionalProperties": false
      },
      "annotations": {
        "title": "Data Freshness",
        "readOnlyHint": true,
        "openWorldHint": false
      }
    },
    {
      "name": "get_price_history",
      "title": "Price History",
      "description": "Daily OHLCV candles for a single asset — RAW USD prices and volume, not normalized scores. Use when the user asks about price levels, recent performance, or needs a chart. Pair with `get_coin_study` to see whether a move is extreme against the asset's own history (price gives the move; the study says whether it matters).",
      "inputSchema": {
        "type": "object",
        "properties": {
          "asset": {
            "type": "string"
          },
          "days": {
            "type": "integer",
            "minimum": 1,
            "maximum": 365
          }
        },
        "required": [
          "asset"
        ],
        "additionalProperties": false
      },
      "annotations": {
        "title": "Price History",
        "readOnlyHint": true,
        "openWorldHint": false
      }
    },
    {
      "name": "analyze_metric",
      "title": "Analyze a Metric",
      "description": "Single-metric z-score event-study backtest: \"when this metric crossed threshold X historically, what were the forward returns?\" Returns sample count, hit rate, and mean/median forward returns across 8 horizons (1d-365d). NOT a current-state read — this analyzes historical events. Core tool for testing a thesis. Each horizon carries base_median_return and base_hit_rate (the every-day result for the asset over the same period) with median_vs_base and hit_rate_vs_base: lead with those, not the raw hit rate. Report n_triggers (episodes), relay summary.warnings verbatim, and show every horizon rather than only best_horizon, which is picked after the fact. Readings pinned at the ±10 z cap are excluded as data artefacts (n_pinned_excluded). Pair with `get_featured_metrics` to find which metrics have the strongest predictive power, then drill into specific assets with this tool.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "metric_id": {
            "type": "string"
          },
          "asset": {
            "type": "string"
          },
          "operator": {
            "type": "string",
            "enum": [
              "gt",
              "lt",
              "gte",
              "lte",
              "abs_gt"
            ]
          },
          "threshold": {
            "type": "number"
          },
          "include_timeseries": {
            "type": "boolean",
            "description": "Default false. Set to true only when the full daily z-score and price history are required, for example for charting (adds roughly 100k–500k characters). The summary and recent episodes are returned either way."
          }
        },
        "required": [
          "metric_id",
          "asset",
          "operator",
          "threshold"
        ],
        "additionalProperties": false
      },
      "annotations": {
        "title": "Analyze a Metric",
        "readOnlyHint": true,
        "openWorldHint": false
      }
    },
    {
      "name": "scan_metric_universe",
      "title": "Scan Metric Universe",
      "description": "Scan a metric across every asset CRYPTYX covers (the set `check_coverage` reports; stablecoins and gold-backed tokens such as XAUT and PAXG excluded) for z-score extremes TODAY. Returns which assets currently sit at extreme z-scores relative to their own history, with each asset's rank across the market and its latest price and volume. Use to find outliers — e.g. 'which assets have the most extreme funding rate right now?'\n\nMANDATORY: read `health` before citing any predictive claim:\n• `health.grade` — A/B reliable, C marginal, D/F/U unreliable. If D/F/U, present as raw observation with caveat.\n• `health.is_anti_predictive` — if true, the metric historically predicts the OPPOSITE of what you'd expect.\n• `health.sample_sufficient` — needs n_obs_7d >= 30 to be reliable.\nIf health is poor, say 'this metric shows X at extreme levels, but the metric has limited predictive reliability' — do NOT present it as alpha.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "metric_id": {
            "type": "string"
          },
          "operator": {
            "type": "string",
            "enum": [
              "gt",
              "lt",
              "gte",
              "lte",
              "abs_gt"
            ]
          },
          "threshold": {
            "type": "number"
          }
        },
        "required": [
          "metric_id",
          "operator",
          "threshold"
        ],
        "additionalProperties": false
      },
      "annotations": {
        "title": "Scan Metric Universe",
        "readOnlyHint": true,
        "openWorldHint": false
      }
    },
    {
      "name": "get_live_prices",
      "title": "Live Prices",
      "description": "Latest spot prices (refreshed every 15 minutes). RAW USD prices, not normalized scores; `pct_1h`, `pct_24h` and `pct_7d` are percentages (5 means 5%). Pass `assets` to get only the assets you need. Use when the user asks \"what is X trading at?\" or needs current price context.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "assets": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Asset symbols to return, e.g. [\"BTC\",\"ETH\"]. Omit for every tracked asset (large)."
          }
        },
        "additionalProperties": false
      },
      "annotations": {
        "title": "Live Prices",
        "readOnlyHint": true,
        "openWorldHint": false
      }
    },
    {
      "name": "get_featured_metrics",
      "title": "Featured Metrics",
      "description": "Metric discovery — metrics ranked by information coefficient (IC). Returns the 8 highest-IC A/B-grade metrics plus the single best metric by composite IC*hit_rate score. When `asset` is specified, rankings use per-asset TIME-SERIES IC (predictive power for that specific asset) instead of cross-sectional IC (ranking power across all assets). A metric can be CS Grade F but TS Grade A for a specific asset — always specify asset when analyzing a single token.\n\nWorkflow: (1) call this tool to see which metrics have ranked highest by IC, (2) `scan_metric_universe` on a top metric to find which assets are at extremes today, (3) `analyze_metric` on a specific asset to see the historical outcomes when this metric hit extreme levels, (4) `analyze_metrics_composite` to test 2-3 top metrics together. IC is measured in-sample; treat a ranking as a lead to test, not a validated edge.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "asset": {
            "type": "string",
            "description": "Asset symbol (e.g. BTC). When provided, ranks by per-asset time-series IC instead of cross-sectional IC."
          }
        },
        "additionalProperties": false
      },
      "annotations": {
        "title": "Featured Metrics",
        "readOnlyHint": true,
        "openWorldHint": false
      }
    },
    {
      "name": "analyze_metrics_composite",
      "title": "Analyze Combined Metric Conditions",
      "description": "Multi-factor thesis tester. Define 2-4 metric conditions and see when ALL held at once in history, with forward returns across 8 horizons. Combining conditions raises specificity but shrinks the sample; test whether the combination beats each condition alone and the base rate. Each horizon carries base_median_return and base_hit_rate (the every-day result for the asset over the same period) with median_vs_base and hit_rate_vs_base: lead with those, not the raw hit rate. Report n_triggers (episodes), relay summary.warnings verbatim, and show every horizon rather than only best_horizon, which is picked after the fact. Readings pinned at the ±10 z cap are excluded as data artefacts (n_pinned_excluded).\n\nExample patterns to test (starting ideas, not results):\n• Capitulation reversal: a volatility spike with heavy taker selling and funding stress.\n• Efficiency breakout: high trend efficiency while price holds well above its longer-term moving average.\n• Stealth accumulation: net taker buying while volatility stays compressed.\n\nEach threshold is a z-score against the asset's own history; the caller sets it. Take every `metric_id` from a CRYPTYX response rather than guessing one: `get_featured_metrics` lists today's strongest metrics, and each reading inside `get_coin_study` carries its `metric_id` next to its plain-English `_display` name. Pick conditions there, then test where they hold together on one asset with this tool.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "asset": {
            "type": "string"
          },
          "conditions": {
            "type": "array",
            "minItems": 2,
            "maxItems": 4,
            "items": {
              "type": "object",
              "properties": {
                "metric_id": {
                  "type": "string"
                },
                "operator": {
                  "type": "string",
                  "enum": [
                    "gt",
                    "lt",
                    "gte",
                    "lte",
                    "abs_gt"
                  ]
                },
                "threshold": {
                  "type": "number"
                }
              },
              "required": [
                "metric_id",
                "operator",
                "threshold"
              ],
              "additionalProperties": false
            }
          },
          "include_timeseries": {
            "type": "boolean",
            "description": "Default false. Set to true only when the full daily z-score and price history are required, for example for charting (adds roughly 100k–500k characters). The summary and recent episodes are returned either way."
          }
        },
        "required": [
          "asset",
          "conditions"
        ],
        "additionalProperties": false
      },
      "annotations": {
        "title": "Analyze Combined Metric Conditions",
        "readOnlyHint": true,
        "openWorldHint": false
      }
    }
  ],
  "retiredTools": [
    "backtest_signal",
    "check_dca",
    "evaluate_custom_trigger",
    "evaluate_setup_on_demand",
    "fork_signal",
    "get_asset_divergences",
    "get_asset_liquidity",
    "get_asset_top_predictors",
    "get_boundary_watchlist",
    "get_canonical_setups",
    "get_competition_leaderboard",
    "get_competition_rounds",
    "get_composite_rankings",
    "get_divergences",
    "get_factor_scores",
    "get_first_ever_fires",
    "get_harness_snapshot",
    "get_heat_check",
    "get_macro_regime",
    "get_market_pulse",
    "get_market_snapshot",
    "get_notable_read",
    "get_regime_analog",
    "get_regime_analysis",
    "get_setup_details",
    "get_signal_catalog",
    "get_signal_explanation",
    "get_signal_triggers",
    "get_todays_evaluations",
    "get_top_signals",
    "get_trigger_preset",
    "get_trigger_z_differential",
    "get_trigger_z_score",
    "search_assets",
    "simulate_signal"
  ],
  "staleHostMessageTemplate": "Tool \"{tool}\" is no longer part of the CRYPTYX connector. Your app is using an out-of-date tool list: disconnect and reconnect the CRYPTYX connector to refresh it."
};
