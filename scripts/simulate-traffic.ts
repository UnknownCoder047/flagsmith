/**
 * Deadwood Dice Traffic Simulator for Flagsmith Experimentation
 *
 * Simulates N unique anonymous players (UUIDs) using @flagsmith/nodejs (^9.1.0):
 *  1. Evaluates the multivariate `sharper_tell_mode` flag (`silent_bias` vs `subtle_tells`)
 *  2. Records an experiment exposure (`$flag_exposure`)
 *  3. Fires realistic game outcomes:
 *       - Primary:    `cheat_caught`
 *       - Secondary:  `play_again_clicked`
 *       - Guardrail1: `false_accusation`
 *       - Guardrail2: `match_abandoned`
 *  4. Flushes buffered events cleanly before exit so Flagsmith's Bayesian dashboard
 *     can be verified end-to-end.
 *
 * SYNTHETIC DATA: outcomes come from the PROB_* env rates, not from real players. Every
 * event is tagged `simulated: true`. Run it only against a separate Flagsmith environment;
 * it refuses to start until SIM_CONFIRM_SEPARATE_ENV=yes is set.
 *
 * Usage:
 *   npm run simulate                  (from repo root)
 *   npx tsx simulate-traffic.ts 400   (override player count via CLI arg)
 */

import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { Flagsmith } from '@flagsmith/nodejs';

dotenv.config();

type TellVariant = 'silent_bias' | 'subtle_tells';

const FLAG_KEY = 'sharper_tell_mode';
const VALID_VARIANTS: readonly TellVariant[] = ['silent_bias', 'subtle_tells'];

interface VariantBehavior {
  cheatCaughtProb: number;
  falseAccusationProb: number;
  abandonProb: number;
  playAgainProb: number;
}

const BEHAVIOR_BY_VARIANT: Record<TellVariant, VariantBehavior> = {
  silent_bias: {
    cheatCaughtProb: Number(process.env.PROB_SILENT_CAUGHT ?? 0.34),
    falseAccusationProb: Number(process.env.PROB_SILENT_FALSE_ACCUSE ?? 0.14),
    abandonProb: Number(process.env.PROB_SILENT_ABANDON ?? 0.16),
    playAgainProb: Number(process.env.PROB_SILENT_PLAY_AGAIN ?? 0.42),
  },
  subtle_tells: {
    cheatCaughtProb: Number(process.env.PROB_TELLS_CAUGHT ?? 0.62),
    falseAccusationProb: Number(process.env.PROB_TELLS_FALSE_ACCUSE ?? 0.12),
    abandonProb: Number(process.env.PROB_TELLS_ABANDON ?? 0.09),
    playAgainProb: Number(process.env.PROB_TELLS_PLAY_AGAIN ?? 0.64),
  },
};

interface VariantStats {
  exposures: number;
  cheatCaught: number;
  playAgain: number;
  falseAccusation: number;
  abandoned: number;
  dealerWon: number;
}

interface FlagsmithExperimentNodeClient {
  getIdentityFlags: (identifier: string) => Promise<{
    getFeatureValue: (key: string) => unknown;
    getExperimentFlag?: (key: string) => { value?: unknown; enabled?: boolean };
  }>;
  getExperimentFlag?: (
    featureName: string,
    identifier: string,
  ) => Promise<{ value?: unknown; enabled?: boolean }>;
  trackEvent?: (
    eventName: string,
    opts: {
      identifier: string;
      value?: number;
      metadata?: Record<string, string | number | boolean>;
    },
  ) => void | Promise<void>;
  flushEvents?: () => Promise<void>;
  close?: () => Promise<void>;
}

function coerceVariant(raw: unknown): TellVariant {
  if (typeof raw === 'string' && VALID_VARIANTS.includes(raw as TellVariant)) {
    return raw as TellVariant;
  }
  return 'silent_bias';
}

async function runSimulation(): Promise<void> {
  const serverKey = process.env.FLAGSMITH_SERVER_KEY?.trim();
  const cliCount = Number(process.argv[2]);
  const totalUsers =
    Number.isFinite(cliCount) && cliCount > 0
      ? Math.floor(cliCount)
      : Number(process.env.SIM_USERS ?? 300);
  const concurrency = Math.max(1, Number(process.env.SIM_CONCURRENCY ?? 10));

  if (!serverKey) {
    console.error(
      'Missing FLAGSMITH_SERVER_KEY in scripts/.env.\n' +
        'Copy scripts/.env.example to scripts/.env and add your Flagsmith Server-Side SDK Key (starts with "ser.").',
    );
    process.exit(1);
  }

  if (process.env.SIM_CONFIRM_SEPARATE_ENV !== 'yes') {
    console.error(
      'Refusing to run: this script sends FABRICATED outcomes (PROB_* rates) as events.\n' +
        'Point FLAGSMITH_SERVER_KEY at a separate, non-production Flagsmith environment,\n' +
        'then set SIM_CONFIRM_SEPARATE_ENV=yes in scripts/.env.',
    );
    process.exit(1);
  }

  console.log(`\n[Deadwood Simulator] Starting simulation for N=${totalUsers} unique players...`);

  const clientOptions: Record<string, unknown> = {
    environmentKey: serverKey,
    enableEvents: true,
    enableLocalEvaluation: true,
  };
  if (process.env.FLAGSMITH_API_URL) {
    clientOptions.apiUrl = process.env.FLAGSMITH_API_URL;
  }
  if (process.env.FLAGSMITH_EVENTS_URL) {
    clientOptions.eventsUrl = process.env.FLAGSMITH_EVENTS_URL;
  }

  const flagsmith = new Flagsmith(
    clientOptions as ConstructorParameters<typeof Flagsmith>[0],
  ) as unknown as FlagsmithExperimentNodeClient;

  const rawTrackEvent = flagsmith.trackEvent?.bind(flagsmith);
  if (rawTrackEvent) {
    flagsmith.trackEvent = (eventName, opts) =>
      rawTrackEvent(eventName, {
        ...opts,
        metadata: { ...opts.metadata, simulated: true },
      });
  }

  const stats: Record<TellVariant, VariantStats> = {
    silent_bias: {
      exposures: 0,
      cheatCaught: 0,
      playAgain: 0,
      falseAccusation: 0,
      abandoned: 0,
      dealerWon: 0,
    },
    subtle_tells: {
      exposures: 0,
      cheatCaught: 0,
      playAgain: 0,
      falseAccusation: 0,
      abandoned: 0,
      dealerWon: 0,
    },
  };

  const userIds = Array.from({ length: totalUsers }, () => `deadwood-sim-${crypto.randomUUID()}`);

  async function simulateSinglePlayer(identifier: string): Promise<void> {
    let rawValue: unknown;

    if (typeof flagsmith.getExperimentFlag === 'function') {
      const expFlag = await flagsmith.getExperimentFlag(FLAG_KEY, identifier);
      rawValue = expFlag?.value;
    } else {
      const identityFlags = await flagsmith.getIdentityFlags(identifier);
      if (typeof identityFlags.getExperimentFlag === 'function') {
        const expFlag = identityFlags.getExperimentFlag(FLAG_KEY);
        rawValue = expFlag?.value;
      } else {
        rawValue = identityFlags.getFeatureValue(FLAG_KEY);
      }
    }

    const variant = coerceVariant(rawValue);
    const behavior = BEHAVIOR_BY_VARIANT[variant];
    stats[variant].exposures += 1;

    const roll = Math.random();

    if (roll < behavior.abandonProb) {
      stats[variant].abandoned += 1;
      const reason = Math.random() < 0.7 ? 'tab_hidden' : 'forfeit';
      if (typeof flagsmith.trackEvent === 'function') {
        await flagsmith.trackEvent('match_abandoned', {
          identifier,
          metadata: {
            variant,
            reason,
            turn: 2 + Math.floor(Math.random() * 6),
            elapsed_ms: 15000 + Math.floor(Math.random() * 65000),
          },
        });
      }
      return;
    }

    let verdict: 'caught' | 'false_accusation' | 'dealer_won' = 'dealer_won';
    let endTurn = 9 + Math.floor(Math.random() * 5);

    if (roll < behavior.abandonProb + behavior.falseAccusationProb) {
      verdict = 'false_accusation';
      endTurn = 1 + Math.floor(Math.random() * 3);
      stats[variant].falseAccusation += 1;
      if (typeof flagsmith.trackEvent === 'function') {
        await flagsmith.trackEvent('false_accusation', {
          identifier,
          metadata: {
            variant,
            turn: endTurn,
            rigged_count: Math.random() < 0.75 ? 0 : 1,
          },
        });
      }
    } else if (
      roll <
      behavior.abandonProb + behavior.falseAccusationProb + behavior.cheatCaughtProb
    ) {
      verdict = 'caught';
      endTurn = 6 + Math.floor(Math.random() * 5);
      stats[variant].cheatCaught += 1;
      if (typeof flagsmith.trackEvent === 'function') {
        await flagsmith.trackEvent('cheat_caught', {
          identifier,
          metadata: {
            variant,
            turn: endTurn,
            rigged_count: 2 + Math.floor(Math.random() * 4),
          },
        });
      }
    } else {
      stats[variant].dealerWon += 1;
    }

    if (typeof flagsmith.trackEvent === 'function') {
      await flagsmith.trackEvent('match_completed', {
        identifier,
        metadata: { variant, verdict, turn: endTurn, rigged_count: 2 + Math.floor(Math.random() * 4) },
      });
    }

    if (Math.random() < behavior.playAgainProb) {
      stats[variant].playAgain += 1;
      if (typeof flagsmith.trackEvent === 'function') {
        await flagsmith.trackEvent('play_again_clicked', {
          identifier,
          metadata: {
            variant,
            previous_verdict: verdict,
            turn: endTurn,
          },
        });
      }
    }
  }

  for (let i = 0; i < userIds.length; i += concurrency) {
    const batch = userIds.slice(i, i + concurrency);
    await Promise.all(batch.map((id) => simulateSinglePlayer(id)));
    const done = Math.min(i + concurrency, userIds.length);
    if (done % 50 === 0 || done === userIds.length) {
      console.log(`[Deadwood Simulator] Processed ${done}/${totalUsers} matches...`);
    }
  }

  if (typeof flagsmith.flushEvents === 'function') {
    await flagsmith.flushEvents();
  }
  if (typeof flagsmith.close === 'function') {
    await flagsmith.close();
  }

  console.log('\n=== Deadwood Dice Simulation Summary ===');
  console.table(
    VALID_VARIANTS.map((v) => {
      const s = stats[v];
      const pct = (n: number) =>
        s.exposures ? `${((n / s.exposures) * 100).toFixed(1)}%` : '0.0%';
      return {
        Variant: v,
        Exposures: s.exposures,
        'cheat_caught': `${s.cheatCaught} (${pct(s.cheatCaught)})`,
        'play_again': `${s.playAgain} (${pct(s.playAgain)})`,
        'false_accuse': `${s.falseAccusation} (${pct(s.falseAccusation)})`,
        'abandoned': `${s.abandoned} (${pct(s.abandoned)})`,
        'dealer_won': s.dealerWon,
      };
    }),
  );
  console.log('Events flushed to Flagsmith (tagged simulated=true). Refresh your Flagsmith Experiment results dashboard.\n');
}

runSimulation().catch((err) => {
  console.error('[Deadwood Simulator] Fatal error:', err);
  process.exit(1);
});
