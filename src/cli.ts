#!/usr/bin/env node
/**
 * CRYPTYX CLI — human-facing interface to the CRYPTYX intelligence engine.
 * Shares the same REST API client as the MCP server.
 */
import { defineCommand, runMain } from 'citty';

import snapshot from './commands/snapshot.js';
import market from './commands/market.js';
import signals from './commands/signals.js';
import factors from './commands/factors.js';
import regime from './commands/regime.js';
import pulse from './commands/pulse.js';
import prices from './commands/prices.js';
import price from './commands/price.js';
import assets from './commands/assets.js';
import liquidity from './commands/liquidity.js';
import metrics from './commands/metrics.js';
import competition from './commands/competition.js';
import config from './commands/config.js';

const main = defineCommand({
  meta: {
    name: 'cryptyx',
    version: '0.4.0',
    description: 'CRYPTYX — the conviction engine for digital asset intelligence',
  },
  subCommands: {
    snapshot,
    market,
    signals,
    factors,
    regime,
    pulse,
    prices,
    price,
    assets,
    liquidity,
    metrics,
    competition,
    config,
  },
});

runMain(main);
