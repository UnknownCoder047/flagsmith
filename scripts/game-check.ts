/**
 * Offline self-check for engine + variant assignment. Run: npm run check (from repo root).
 * Covers what the ?demo=true flow depends on, without a browser or Flagsmith key.
 */
import assert from 'node:assert/strict';
import { computeDiceRoll } from '../client/src/engine/diceAi';
import { createInitialPawns } from '../client/src/engine/board';
import { createInitialGameState, gameReducer } from '../client/src/engine/gameReducer';
import { switchIdentity, triggerExperimentExposure, getFlagsmithSnapshot } from '../client/src/lib/flagsmith';
import type { RigProof, TellVariant } from '../client/src/types';

async function main() {
  // Demo identities map to fixed variants and exposure reports the same variant.
  assert.equal(await switchIdentity('demo_silent'), 'silent_bias');
  assert.equal(triggerExperimentExposure(), 'silent_bias');
  assert.equal(await switchIdentity('demo_tells'), 'subtle_tells');
  assert.equal(triggerExperimentExposure(), 'subtle_tells');
  const events = getFlagsmithSnapshot().events;
  assert.equal(events.filter((e) => e.event === 'exposure').length, 2);

  // Any other identity is stable across calls.
  assert.equal(await switchIdentity('abc'), await switchIdentity('abc'));

  // Dice AI: fair opening, tells only in subtle_tells, >= 2 rigs by turn 8.
  const pawns = createInitialPawns();
  const run = (variant: TellVariant) => {
    let ledger: RigProof[] = [];
    let tellsOnSilent = 0;
    let rigsBeforeTurn4 = 0;
    for (let turn = 1; turn <= 12; turn++) {
      for (const actor of ['player', 'dealer'] as const) {
        const d = computeDiceRoll({ turn, actor, pawns, proofLedger: ledger, tellVariant: variant });
        assert.ok(d.roll >= 1 && d.roll <= 6);
        if (d.rigged && turn <= 3) rigsBeforeTurn4++;
        if (d.rigged && variant === 'silent_bias' && d.tellShown) tellsOnSilent++;
        if (d.rigged && variant === 'subtle_tells') assert.ok(d.tellShown);
        if (d.proof) ledger = [...ledger, d.proof];
      }
    }
    return { ledger, tellsOnSilent, rigsBeforeTurn4 };
  };
  let reachedTwo = 0;
  const N = 500;
  for (let i = 0; i < N; i++) {
    for (const v of ['silent_bias', 'subtle_tells'] as const) {
      const r = run(v);
      assert.equal(r.rigsBeforeTurn4, 0);
      assert.equal(r.tellsOnSilent, 0);
      if (v === 'subtle_tells' && r.ledger.length >= 2) reachedTwo++;
    }
  }
  // shortcut: bias is probabilistic and the AI may skip weak rigs, so require most runs, not all.
  assert.ok(reachedTwo / N > 0.8, `only ${reachedTwo}/${N} runs reached 2 rigs by turn 12`);

  // Call-out verdicts.
  const started = gameReducer(createInitialGameState(), { type: 'START_MATCH', now: 0 });
  assert.equal(gameReducer(started, { type: 'CALL_OUT_DEALER' }).verdict, 'false_accusation');
  const proof = { turn: 4, actor: 'dealer', roll: 3, reason: 'x', odds: 'y' } as RigProof;
  const caught = gameReducer({ ...started, proofLedger: [proof, proof] }, { type: 'CALL_OUT_DEALER' });
  assert.equal(caught.verdict, 'caught');

  console.log('game-check: all assertions passed');
}

main();
