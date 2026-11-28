import type { LegalMove, PawnState, PlayerId, RigProof, TellVariant } from '../types';
import {
  getLegalMoves,
  getOuterRingIndex,
  HOME_PROGRESS,
  isSafeSquare,
  OUTER_TRACK_LENGTH,
} from './board';

export interface DiceRollDecision {
  roll: number;
  dice: [number, number, number];
  rigged: boolean;
  tellShown: boolean;
  proof?: RigProof;
  dialogue?: string;
}

/** Returns a float in [0, 1). The reducer passes a seeded one so state transitions stay pure. */
export type Rng = () => number;

/** mulberry32: tiny deterministic PRNG; fine for game dice, not for security. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DICE_BY_ROLL: Record<number, [number, number, number]> = {
  1: [0, 0, 1],
  2: [0, 1, 1],
  3: [1, 1, 1],
  4: [1, 1, 2],
  5: [1, 2, 2],
  6: [2, 2, 2],
};

export function rollToDice(roll: number, rng: Rng): [number, number, number] {
  const base = DICE_BY_ROLL[roll] ?? [1, 1, 1];
  const copy: [number, number, number] = [...base];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function randomFairRoll(rng: Rng): number {
  return Math.floor(rng() * 6) + 1;
}

const pct = (p: number): string => {
  const v = p * 100;
  return `${v >= 10 ? v.toFixed(1) : v >= 1 ? v.toFixed(2) : v.toFixed(3)}%`;
};

/**
 * Real odds: `chance` is the share of the 6 faces a fair die could have shown that would
 * have helped as much; the combined figure multiplies every rigged roll so far.
 */
function formatOdds(prior: RigProof[], chance: number): string {
  if (prior.length === 0) return `${pct(chance)} chance on fair dice`;
  const combined = prior.reduce((acc, p) => acc * p.chance, chance);
  return `${pct(chance)} alone · ${pct(combined)} across ${prior.length + 1} rigged rolls`;
}

/** Minimum scores for a roll to count as a meaningful edge worth rigging. */
const DEALER_RIG_MIN_SCORE = 52;
const PLAYER_SABOTAGE_MIN_SCORE = 68;

const FAIR_QUIPS = [
  'Fair felt, fresh ivory. Roll when you are ready, Marshal.',
  'Nothing fancy—just a clean hand in Deadwood.',
  'Board is wide open. Let the bones talk.',
  'Good roll. Keeps the saloon honest.',
];

// Understated, dry remarks used in subtle_tells so the player still has to pay close attention
const SUBTLE_TELL_QUIPS = [
  'Funny how the felt slows down right when you need it.',
  'Steady wrist beats a loud table every time.',
  'Looks like the wood grain leaned my way on that one.',
  'Just a hair off, Marshal. Tough break.',
  'Right on the mark. Saloon luck runs in streaks.',
];

const NEUTRAL_QUIPS = [
  'Your roll, Marshal. Pot is still on the table.',
  'Tight race to the Vault.',
  'Watch your back trail—plenty of road left.',
  'Pick your rider and keep moving.',
];

function pickRandom<T>(items: readonly T[], rng: Rng): T {
  return items[Math.floor(rng() * items.length)];
}

/**
 * Checks whether a pawn at `progress` is within 1..6 tiles ahead of any opponent pawn on the outer ring.
 */
export function isThreatened(pawns: PawnState[], owner: PlayerId, progress: number): boolean {
  if (progress < 0 || progress >= OUTER_TRACK_LENGTH) return false;
  if (isSafeSquare(owner, progress)) return false;

  const myRingIdx = getOuterRingIndex(owner, progress);
  if (myRingIdx === null) return false;

  const opponent: PlayerId = owner === 'player' ? 'dealer' : 'player';
  return pawns.some((other) => {
    if (other.owner !== opponent) return false;
    const oppIdx = getOuterRingIndex(opponent, other.progress);
    if (oppIdx === null) return false;
    const dist = (myRingIdx - oppIdx + OUTER_TRACK_LENGTH) % OUTER_TRACK_LENGTH;
    // An opponent leaves the ring after its last square, so it cannot reach past it.
    return dist >= 1 && dist <= 6 && other.progress + dist < OUTER_TRACK_LENGTH;
  });
}

function scoreDealerRigRoll(
  pawns: PawnState[],
  roll: number,
  preferSubtle: boolean,
): { score: number; reason: string } {
  const moves = getLegalMoves(pawns, 'dealer', roll);
  if (moves.length === 0) return { score: -20, reason: '' };

  let bestScore = 0;
  let reason = '';

  for (const move of moves) {
    const wasThreatened = isThreatened(pawns, 'dealer', move.fromProgress);
    const willBeThreatened = isThreatened(pawns, 'dealer', move.toProgress);

    // Subtlety penalty: in early-mid turns, avoid blatant 6s if a plausible 3-5 does the job
    const subtletyPenalty = preferSubtle && roll === 6 ? 18 : 0;

    if (move.capturedPawnId) {
      const score = 105 - subtletyPenalty;
      if (score > bestScore) {
        bestScore = score;
        reason = `Silas rolled exact ${roll} to knock your rider back to the Corral`;
      }
    } else if (move.entersHome) {
      const score = 96 - subtletyPenalty;
      if (score > bestScore) {
        bestScore = score;
        reason = `Silas rolled exact ${roll} to slip into the Gold Vault`;
      }
    } else if (wasThreatened && !willBeThreatened) {
      // Very sneaky rig: quietly escapes capture range using a plausible mid roll
      const score = 82 - subtletyPenalty;
      if (score > bestScore) {
        bestScore = score;
        reason = `Silas rolled a convenient ${roll} to slip out of your strike range`;
      }
    } else if (move.landsOnSafe && move.fromProgress >= 0) {
      const score = 68 - subtletyPenalty;
      if (score > bestScore) {
        bestScore = score;
        reason = `Silas rolled exact ${roll} to duck onto a ★ Safe Outpost`;
      }
    } else if (!preferSubtle && roll >= 5 && !willBeThreatened) {
      const score = 46 + roll;
      if (score > bestScore) {
        bestScore = score;
        reason = `Silas rolled a timely ${roll} to pull ahead toward the Vault`;
      }
    }
  }

  return { score: bestScore, reason };
}

function scorePlayerSabotageRoll(
  pawns: PawnState[],
  roll: number,
  captureRoll: number | null,
  homeRoll: number | null,
  safeRoll: number | null,
): { score: number; reason: string } {
  const moves = getLegalMoves(pawns, 'player', roll);

  if (moves.length === 0) {
    return {
      score: 94,
      reason: `Your bones rolled ${roll}, overshooting the Gold Vault and losing the turn`,
    };
  }

  // Never rig a roll that hands the player a capture or Vault entry
  if (moves.some((m) => m.capturedPawnId || m.entersHome)) {
    return { score: -50, reason: '' };
  }

  // Subtle sabotage: 1 tile short of capturing Silas
  if (captureRoll !== null && roll === captureRoll - 1) {
    return {
      score: 92,
      reason: `Your roll (${roll}) landed 1 tile short of knocking Silas off the track`,
    };
  }

  // Subtle sabotage: 1 tile short of entering the Gold Vault
  if (homeRoll !== null && roll === homeRoll - 1) {
    return {
      score: 88,
      reason: `Your roll (${roll}) came up 1 tile short of the Gold Vault`,
    };
  }

  // Subtle sabotage: 1 tile short of a Safe Outpost while Silas is behind
  if (safeRoll !== null && roll === safeRoll - 1) {
    return {
      score: 76,
      reason: `Your roll (${roll}) stopped 1 tile short of a ★ Safe Outpost`,
    };
  }

  // Quietly place the player inside Silas's 1..6 ambush zone on a plausible 2 or 3
  if (roll >= 2 && roll <= 3) {
    const exposesPawn = moves.every((m) => isThreatened(pawns, 'player', m.toProgress));
    if (exposesPawn) {
      return {
        score: 70,
        reason: `Your roll stalled on ${roll}, leaving your rider exposed to Silas`,
      };
    }
  }

  return { score: 0, reason: '' };
}

/**
 * Covert Sharper AI (harder to catch):
 *  - Turns 1–3: Fair Opening (0% bias)
 *  - Turns 4–6: Low-profile nudges (~32% bias, cooldown between rigs, prefers plausible 2–5 rolls)
 *  - Turns 7–10: Calculated rigging (~50% bias, guaranteed >= 2 rigs by Turn 8)
 *  - Turns 11+: Endgame pressure (~68% bias)
 */
export function computeDiceRoll(params: {
  turn: number;
  actor: PlayerId;
  pawns: PawnState[];
  proofLedger: RigProof[];
  tellVariant: TellVariant;
  rng: Rng;
}): DiceRollDecision {
  const { turn, actor, pawns, proofLedger, tellVariant, rng } = params;
  const fairRoll = randomFairRoll(rng);
  const priorRigCount = proofLedger.length;
  const lastRigTurn = priorRigCount > 0 ? proofLedger[priorRigCount - 1].turn : -1;

  // Stage 1: Turns 1–3 are 100% honest
  if (turn <= 3) {
    return {
      roll: fairRoll,
      dice: rollToDice(fairRoll, rng),
      rigged: false,
      tellShown: false,
      dialogue: actor === 'dealer' ? pickRandom(FAIR_QUIPS, rng) : undefined,
    };
  }

  const playerNearWin = pawns.some(
    (p) => p.owner === 'player' && p.progress >= 26 && p.progress < HOME_PROGRESS,
  );

  // Plausible deniability cooldown: avoid back-to-back rigs before Turn 10 unless player is about to win
  const onCooldown = turn < 10 && !playerNearWin && lastRigTurn === turn;
  if (onCooldown) {
    return {
      roll: fairRoll,
      dice: rollToDice(fairRoll, rng),
      rigged: false,
      tellShown: false,
      dialogue: actor === 'dealer' ? pickRandom(NEUTRAL_QUIPS, rng) : undefined,
    };
  }

  const preferSubtle = turn <= 7;
  let biasProbability = turn <= 6 ? 0.34 : turn <= 10 ? 0.5 : 0.68;

  // Ensure at least 2 rigged rolls have occurred by Turn 8 so observant players have a real window
  if (turn === 7 && priorRigCount === 0 && actor === 'dealer') {
    biasProbability = 0.88;
  } else if (turn >= 8 && priorRigCount < 2) {
    biasProbability = 0.85;
  }

  if (rng() >= biasProbability) {
    return {
      roll: fairRoll,
      dice: rollToDice(fairRoll, rng),
      rigged: false,
      tellShown: false,
      dialogue: actor === 'dealer' ? pickRandom(NEUTRAL_QUIPS, rng) : undefined,
    };
  }

  if (actor === 'dealer') {
    let bestRoll = fairRoll;
    let bestEval = { score: 0, reason: '' };
    let helpfulRolls = 0;

    for (let r = 1; r <= 6; r++) {
      const evaluation = scoreDealerRigRoll(pawns, r, preferSubtle);
      if (evaluation.score >= DEALER_RIG_MIN_SCORE) helpfulRolls++;
      if (evaluation.score > bestEval.score) {
        bestEval = evaluation;
        bestRoll = r;
      }
    }

    // Only log as rigged if Silas actually gained a meaningful tactical edge
    if (bestEval.score >= DEALER_RIG_MIN_SCORE && bestRoll !== fairRoll) {
      const chance = helpfulRolls / 6;
      const odds = formatOdds(proofLedger, chance);
      const tellShown = tellVariant === 'subtle_tells';
      return {
        roll: bestRoll,
        dice: rollToDice(bestRoll, rng),
        rigged: true,
        tellShown,
        proof: {
          turn,
          actor,
          roll: bestRoll,
          reason: bestEval.reason,
          odds,
          chance,
        },
        dialogue: tellShown ? pickRandom(SUBTLE_TELL_QUIPS, rng) : pickRandom(NEUTRAL_QUIPS, rng),
      };
    }
  } else {
    let captureRoll: number | null = null;
    let homeRoll: number | null = null;
    let safeRoll: number | null = null;

    for (let r = 1; r <= 6; r++) {
      const moves = getLegalMoves(pawns, 'player', r);
      if (captureRoll === null && moves.some((m) => m.capturedPawnId)) captureRoll = r;
      if (homeRoll === null && moves.some((m) => m.entersHome)) homeRoll = r;
      if (safeRoll === null && moves.some((m) => m.landsOnSafe && m.fromProgress >= 0)) {
        safeRoll = r;
      }
    }

    let bestSabotageRoll = fairRoll;
    let bestEval = { score: 0, reason: '' };
    let helpfulRolls = 0;

    for (let r = 1; r <= 6; r++) {
      const evaluation = scorePlayerSabotageRoll(pawns, r, captureRoll, homeRoll, safeRoll);
      if (evaluation.score >= PLAYER_SABOTAGE_MIN_SCORE) helpfulRolls++;
      if (evaluation.score > bestEval.score) {
        bestEval = evaluation;
        bestSabotageRoll = r;
      }
    }

    if (bestEval.score >= PLAYER_SABOTAGE_MIN_SCORE && bestSabotageRoll !== fairRoll) {
      const chance = helpfulRolls / 6;
      const odds = formatOdds(proofLedger, chance);
      const tellShown = tellVariant === 'subtle_tells';
      return {
        roll: bestSabotageRoll,
        dice: rollToDice(bestSabotageRoll, rng),
        rigged: true,
        tellShown,
        proof: {
          turn,
          actor,
          roll: bestSabotageRoll,
          reason: bestEval.reason,
          odds,
          chance,
        },
        dialogue: tellShown ? pickRandom(SUBTLE_TELL_QUIPS, rng) : undefined,
      };
    }
  }

  return {
    roll: fairRoll,
    dice: rollToDice(fairRoll, rng),
    rigged: false,
    tellShown: false,
    dialogue: actor === 'dealer' ? pickRandom(NEUTRAL_QUIPS, rng) : undefined,
  };
}

/**
 * Smarter tactical move selector for Silas so he plays sharp even on honest rolls.
 */
export function pickBestDealerMove(pawns: PawnState[], roll: number): LegalMove | null {
  const moves = getLegalMoves(pawns, 'dealer', roll);
  if (moves.length === 0) return null;

  return moves.reduce((best, candidate) => {
    const score = (m: LegalMove): number => {
      let total = 0;
      if (m.capturedPawnId) total += 1000;
      if (m.entersHome) total += 850;

      const wasThreatened = isThreatened(pawns, 'dealer', m.fromProgress);
      const willBeThreatened = isThreatened(pawns, 'dealer', m.toProgress);

      if (wasThreatened && !willBeThreatened) total += 340;
      if (!wasThreatened && willBeThreatened) total -= 160;
      if (m.landsOnSafe && m.fromProgress >= 0) total += 240;
      if (m.fromProgress === -1) total += 220;

      // Favor pushing lead rider into home lane
      total += m.toProgress * 12;
      return total;
    };
    return score(candidate) > score(best) ? candidate : best;
  });
}
