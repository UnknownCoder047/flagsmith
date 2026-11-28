/**
 * Offline self-check for engine + variant assignment. Run: npm run check (from repo root).
 * Covers what the ?demo=true flow depends on, without a browser or Flagsmith key.
 */
import assert from 'node:assert/strict';
import { computeDiceRoll, createRng, isThreatened } from '../client/src/engine/diceAi';
import { createInitialPawns } from '../client/src/engine/board';
import { createInitialGameState, gameReducer } from '../client/src/engine/gameReducer';
import { switchIdentity, triggerExperimentExposure, getFlagsmithSnapshot } from '../client/src/lib/flagsmith';
import type { RigProof, RollRecord, TellVariant } from '../client/src/types';

async function main() {
  // Demo identities map to fixed variants and exposure reports the same variant.
  assert.equal(await switchIdentity('demo_silent'), 'silent_bias');
  assert.equal(triggerExperimentExposure(), 'silent_bias');
  assert.equal(await switchIdentity('demo_tells'), 'subtle_tells');
  assert.equal(triggerExperimentExposure(), 'subtle_tells');
  const events = getFlagsmithSnapshot().events;
  assert.equal(events.filter((e) => e.event === 'exposure').length, 2);
  // Exposure fires once per identity: repeating it (Play Again) adds no event.
  assert.equal(triggerExperimentExposure(), 'subtle_tells');
  assert.equal(getFlagsmithSnapshot().events.filter((e) => e.event === 'exposure').length, 2);

  // Any other identity is stable across calls.
  assert.equal(await switchIdentity('abc'), await switchIdentity('abc'));

  // Dice AI: fair opening, tells only in subtle_tells, >= 2 rigs by turn 8.
  const pawns = createInitialPawns();
  const run = (variant: TellVariant, seed: number) => {
    const rng = createRng(seed);
    let ledger: RigProof[] = [];
    let tellsOnSilent = 0;
    let rigsBeforeTurn4 = 0;
    for (let turn = 1; turn <= 12; turn++) {
      for (const actor of ['player', 'dealer'] as const) {
        const d = computeDiceRoll({ turn, actor, pawns, proofLedger: ledger, tellVariant: variant, rng });
        assert.ok(d.roll >= 1 && d.roll <= 6);
        if (d.rigged && turn <= 3) rigsBeforeTurn4++;
        if (d.rigged && variant === 'silent_bias' && d.tellShown) tellsOnSilent++;
        if (d.rigged && variant === 'subtle_tells') assert.ok(d.tellShown);
        if (d.proof) {
          assert.ok(d.proof.chance > 0 && d.proof.chance <= 1);
          assert.ok(d.proof.odds.includes('%'));
          ledger = [...ledger, d.proof];
        }
      }
    }
    return { ledger, tellsOnSilent, rigsBeforeTurn4 };
  };
  let reachedTwo = 0;
  const N = 500;
  for (let i = 0; i < N; i++) {
    for (const v of ['silent_bias', 'subtle_tells'] as const) {
      const r = run(v, i * 2 + (v === 'silent_bias' ? 0 : 1));
      assert.equal(r.rigsBeforeTurn4, 0);
      assert.equal(r.tellsOnSilent, 0);
      if (v === 'subtle_tells' && r.ledger.length >= 2) reachedTwo++;
    }
  }
  // Seeded runs make this deterministic; the AI may skip weak rigs, so require most runs, not all.
  assert.ok(reachedTwo / N > 0.8, `only ${reachedTwo}/${N} runs reached 2 rigs by turn 12`);

  // Threat: a rider 1-6 squares ahead is exposed, unless the hunter leaves the ring first.
  const at = (dealerProgress: number): ReturnType<typeof createInitialPawns> => [
    { id: 'm1', owner: 'player', label: 'M1', progress: 17 }, // ring 17
    { id: 's1', owner: 'dealer', label: 'S1', progress: dealerProgress },
  ];
  assert.equal(isThreatened(at(0), 'player', 17), true); // dealer on ring 14, 3 behind ring 17
  assert.equal(isThreatened(at(27), 'player', 17), false); // dealer on ring 13 turns into its home lane first

  // Reducer is pure: same state + action (incl. seed) gives identical output.
  const rolling = { ...gameReducer(createInitialGameState(), { type: 'START_MATCH', now: 0 }), turn: 5 };
  const rollAction = { type: 'PLAYER_ROLL_COMPLETE', tellVariant: 'subtle_tells', seed: 42 } as const;
  assert.deepEqual(gameReducer(rolling, rollAction), gameReducer(rolling, rollAction));

  const rec = (id: string, rigged: boolean) =>
    ({ id, turn: 9, actor: 'dealer', roll: 3, dice: [1, 1, 1], rigged, tellShown: false }) as RollRecord;
  // Move commit (shared by both sides): normal move, winning move, dealer win.
  const mv = (pawnId: string, from: number, to: number) =>
    ({ pawnId, fromProgress: from, toProgress: to, entersHome: to === 30, landsOnSafe: false }) as const;
  const pawnsAt = (m1: number, m2: number, s1: number, s2: number) => [
    { id: 'm1', owner: 'player', label: 'M1', progress: m1 },
    { id: 'm2', owner: 'player', label: 'M2', progress: m2 },
    { id: 's1', owner: 'dealer', label: 'S1', progress: s1 },
    { id: 's2', owner: 'dealer', label: 'S2', progress: s2 },
  ] as const;
  const base = gameReducer(createInitialGameState(), { type: 'START_MATCH', now: 0 });
  const stepped = gameReducer(
    { ...base, phase: 'player_move', pawns: [...pawnsAt(0, -1, 0, -1)], legalMoves: [mv('m1', 0, 3)], rollHistory: [rec('x', false)] },
    { type: 'PLAYER_MOVE_PAWN', pawnId: 'm1' },
  );
  assert.equal(stepped.phase, 'dealer_turn');
  assert.equal(stepped.pawns.find((p) => p.id === 'm1')?.progress, 3);
  assert.equal(stepped.lastMove?.actor, 'player');
  assert.ok(stepped.rollHistory[0].moveSummary);
  const playerWin = gameReducer(
    { ...base, phase: 'player_move', pawns: [...pawnsAt(30, 28, 5, 5)], legalMoves: [mv('m2', 28, 30)], rollHistory: [rec('x', false)] },
    { type: 'PLAYER_MOVE_PAWN', pawnId: 'm2' },
  );
  assert.equal(playerWin.verdict, 'player_won');
  const dealerWin = gameReducer(
    { ...base, phase: 'dealer_turn', dealerHasRolled: true, pawns: [...pawnsAt(5, 5, 30, 28)], legalMoves: [mv('s2', 28, 30)], rollHistory: [rec('x', false)] },
    { type: 'DEALER_MOVE_COMPLETE' },
  );
  assert.equal(dealerWin.verdict, 'dealer_won');
  const dealerStep = gameReducer(
    { ...base, phase: 'dealer_turn', dealerHasRolled: true, pawns: [...pawnsAt(5, 5, 0, -1)], legalMoves: [mv('s1', 0, 2)], rollHistory: [rec('x', false)] },
    { type: 'DEALER_MOVE_COMPLETE' },
  );
  assert.equal(dealerStep.phase, 'player_roll');
  assert.equal(dealerStep.turn, base.turn + 1);

  // Call-out verdicts.
  const started = gameReducer(createInitialGameState(), { type: 'START_MATCH', now: 0 });
  assert.equal(gameReducer(started, { type: 'CALL_OUT_DEALER' }).verdict, 'false_accusation');
  const withRolls = { ...started, rollHistory: [rec('a', true), rec('b', true), rec('c', false)] };
  const call = (flagged: string[]) =>
    gameReducer({ ...withRolls, flaggedRollIds: flagged }, { type: 'CALL_OUT_DEALER' }).verdict;
  // Blind call (nothing flagged) loses even though the dealer rigged 2 rolls.
  assert.equal(call([]), 'false_accusation');
  assert.equal(call(['a']), 'false_accusation');
  assert.equal(call(['a', 'b']), 'caught');
  assert.equal(call(['a', 'b', 'c']), 'caught');
  assert.equal(call(['a', 'c']), 'false_accusation');
  const toggled = gameReducer(started, { type: 'TOGGLE_FLAG_ROLL', rollId: 'nope' });
  assert.deepEqual(toggled.flaggedRollIds, []);

  console.log('game-check: all assertions passed');
}

main();
