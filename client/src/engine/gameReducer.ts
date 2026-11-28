import type { GameState, LegalMove, PlayerId, RollRecord, TellVariant } from '../types';
import {
  applyMove,
  buildMovePathCoords,
  createInitialPawns,
  getCoordForProgress,
  getLegalMoves,
  hasPlayerWon,
} from './board';
import { computeDiceRoll, createRng, pickBestDealerMove } from './diceAi';

/** Flagged rolls that must be truly rigged (and outnumber wrong flags) for a valid call-out. */
export const MIN_FLAGGED_HITS = 2;

export type GameAction =
  | { type: 'START_MATCH'; now: number }
  | { type: 'PLAYER_ROLL_START' }
  | { type: 'PLAYER_ROLL_COMPLETE'; tellVariant: TellVariant; seed: number }
  | { type: 'PLAYER_MOVE_PAWN'; pawnId: string }
  | { type: 'DEALER_ROLL_START' }
  | { type: 'DEALER_ROLL_COMPLETE'; tellVariant: TellVariant; seed: number }
  | { type: 'DEALER_MOVE_COMPLETE' }
  | { type: 'TOGGLE_FLAG_ROLL'; rollId: string }
  | { type: 'CALL_OUT_DEALER' }
  | { type: 'RESET_TO_LANDING' };

export function createInitialGameState(): GameState {
  return {
    phase: 'landing',
    turn: 1,
    pawns: createInitialPawns(),
    currentRoll: null,
    currentDice: [1, 1, 1],
    isRolling: false,
    dealerHasRolled: false,
    activeTell: false,
    legalMoves: [],
    lastMove: null,
    rollHistory: [],
    flaggedRollIds: [],
    proofLedger: [],
    dealerDialogue: 'Pull up a chair, Marshal. Fresh bones, fair felt—let us play.',
    statusBanner: 'Pull up a chair to start your high-stakes match against Silas Vance.',
    lastCaptureFlash: null,
    verdict: null,
    matchStartedAt: null,
  };
}

function summarizeMove(
  actorLabel: string,
  move: LegalMove,
  pawnsBefore: GameState['pawns'],
): string {
  const pawn = pawnsBefore.find((p) => p.id === move.pawnId);
  const name = pawn?.label ?? move.pawnId;
  if (move.capturedPawnId) {
    return `${actorLabel} (${name}) knocked ${move.capturedPawnId.toUpperCase()} back to Corral!`;
  }
  if (move.entersHome) {
    return `${actorLabel} (${name}) reached the Gold Vault!`;
  }
  if (move.fromProgress === -1) {
    return `${actorLabel} rode ${name} onto the track`;
  }
  return `${actorLabel} moved ${name}`;
}

/** Shared by both sides: apply a move and build the state fields every move changes. */
function commitMove(state: GameState, actor: PlayerId, move: LegalMove) {
  const pawns = applyMove(state.pawns, move);
  const summary = summarizeMove(actor === 'player' ? 'You' : 'Silas', move, state.pawns);
  const patch = {
    pawns,
    legalMoves: [],
    dealerHasRolled: false,
    rollHistory: state.rollHistory.map((item, idx) =>
      idx === 0 ? { ...item, moveSummary: summary } : item,
    ),
    lastMove: {
      actor,
      pawnId: move.pawnId,
      fromCoord: getCoordForProgress(actor, move.fromProgress),
      toCoord: getCoordForProgress(actor, move.toProgress),
      pathCoords: buildMovePathCoords(actor, move.fromProgress, move.toProgress),
      captured: Boolean(move.capturedPawnId),
    },
  } satisfies Partial<GameState>;
  return { patch, summary, won: hasPlayerWon(pawns, actor) };
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_MATCH': {
      return {
        ...createInitialGameState(),
        phase: 'player_roll',
        matchStartedAt: action.now,
        dealerDialogue: 'Fresh ivory on the table. You get first roll, Marshal.',
        statusBanner: 'Turn 1 — Your turn to roll the bones.',
      };
    }

    case 'PLAYER_ROLL_START': {
      if (state.phase !== 'player_roll' || state.isRolling) return state;
      return {
        ...state,
        isRolling: true,
        activeTell: false,
        lastCaptureFlash: null,
        statusBanner: 'Rolling the ivory bones…',
      };
    }

    case 'PLAYER_ROLL_COMPLETE': {
      if (state.phase !== 'player_roll') return state;

      const decision = computeDiceRoll({
        turn: state.turn,
        actor: 'player',
        pawns: state.pawns,
        proofLedger: state.proofLedger,
        tellVariant: action.tellVariant,
        rng: createRng(action.seed),
      });

      const legalMoves = getLegalMoves(state.pawns, 'player', decision.roll);

      const record: RollRecord = {
        id: `r-${state.turn}-p`,
        turn: state.turn,
        actor: 'player',
        roll: decision.roll,
        dice: decision.dice,
        rigged: decision.rigged,
        tellShown: decision.tellShown,
        rigReason: decision.proof?.reason,
        odds: decision.proof?.odds,
        moveSummary: legalMoves.length === 0 ? 'No legal move (overshoot)' : undefined,
      };

      const nextProofs = decision.proof
        ? [...state.proofLedger, decision.proof]
        : state.proofLedger;

      const nextHistory = [record, ...state.rollHistory];

      if (legalMoves.length === 0) {
        return {
          ...state,
          isRolling: false,
          dealerHasRolled: false,
          currentRoll: decision.roll,
          currentDice: decision.dice,
          activeTell: decision.tellShown,
          legalMoves: [],
          rollHistory: nextHistory,
          proofLedger: nextProofs,
          dealerDialogue:
            decision.dialogue ?? 'Overshot the Vault—looks like the bones pass to me.',
          statusBanner: `You rolled ${decision.roll}, but no rider can move. Silas's turn.`,
          phase: 'dealer_turn',
        };
      }

      return {
        ...state,
        isRolling: false,
        currentRoll: decision.roll,
        currentDice: decision.dice,
        activeTell: decision.tellShown,
        legalMoves,
        rollHistory: nextHistory,
        proofLedger: nextProofs,
        dealerDialogue: decision.dialogue ?? state.dealerDialogue,
        statusBanner: `You rolled ${decision.roll} — click a highlighted rider (or press 1 / 2).`,
        phase: 'player_move',
      };
    }

    case 'PLAYER_MOVE_PAWN': {
      if (state.phase !== 'player_move') return state;
      const chosen = state.legalMoves.find((m) => m.pawnId === action.pawnId);
      if (!chosen) return state;

      const { patch, summary, won } = commitMove(state, 'player', chosen);

      if (won) {
        return {
          ...state,
          ...patch,
          phase: 'verdict',
          verdict: 'player_won',
          statusBanner: 'Both of your riders reached the Gold Vault!',
          dealerDialogue: 'Well played, Marshal. You beat the house clean.',
        };
      }

      return {
        ...state,
        ...patch,
        lastCaptureFlash: chosen.capturedPawnId
          ? `Knocked Silas's ${chosen.capturedPawnId.toUpperCase()} back to the Corral!`
          : null,
        phase: 'dealer_turn',
        statusBanner: `${summary}. Silas reaches for the dice…`,
      };
    }

    case 'DEALER_ROLL_START': {
      if (state.phase !== 'dealer_turn' || state.isRolling || state.dealerHasRolled) {
        return state;
      }
      return {
        ...state,
        isRolling: true,
        activeTell: false,
        statusBanner: 'Silas shakes the dice cup…',
      };
    }

    case 'DEALER_ROLL_COMPLETE': {
      if (state.phase !== 'dealer_turn') return state;

      const decision = computeDiceRoll({
        turn: state.turn,
        actor: 'dealer',
        pawns: state.pawns,
        proofLedger: state.proofLedger,
        tellVariant: action.tellVariant,
        rng: createRng(action.seed),
      });

      const bestMove = pickBestDealerMove(state.pawns, decision.roll);

      const record: RollRecord = {
        id: `r-${state.turn}-d`,
        turn: state.turn,
        actor: 'dealer',
        roll: decision.roll,
        dice: decision.dice,
        rigged: decision.rigged,
        tellShown: decision.tellShown,
        rigReason: decision.proof?.reason,
        odds: decision.proof?.odds,
        moveSummary: bestMove ? undefined : 'No legal move (overshoot)',
      };

      const nextProofs = decision.proof
        ? [...state.proofLedger, decision.proof]
        : state.proofLedger;

      const nextHistory = [record, ...state.rollHistory];

      return {
        ...state,
        isRolling: false,
        dealerHasRolled: true,
        currentRoll: decision.roll,
        currentDice: decision.dice,
        activeTell: decision.tellShown,
        legalMoves: bestMove ? [bestMove] : [],
        rollHistory: nextHistory,
        proofLedger: nextProofs,
        dealerDialogue: decision.dialogue ?? state.dealerDialogue,
        statusBanner: bestMove
          ? `Silas rolled ${decision.roll}…`
          : `Silas rolled ${decision.roll} — overshot the Vault.`,
      };
    }

    case 'DEALER_MOVE_COMPLETE': {
      if (state.phase !== 'dealer_turn' || !state.dealerHasRolled) return state;
      const move = state.legalMoves[0] ?? null;

      if (!move) {
        return {
          ...state,
          turn: state.turn + 1,
          phase: 'player_roll',
          dealerHasRolled: false,
          legalMoves: [],
          statusBanner: `Turn ${state.turn + 1} — Silas had no move. Your roll.`,
        };
      }

      const { patch, summary, won } = commitMove(state, 'dealer', move);

      if (won) {
        return {
          ...state,
          ...patch,
          phase: 'verdict',
          verdict: 'dealer_won',
          statusBanner: 'Silas reached the Gold Vault first and took the pot.',
          dealerDialogue: 'Pot is mine, Marshal. Never did notice those weighted bones, did you?',
        };
      }

      return {
        ...state,
        ...patch,
        lastCaptureFlash: move.capturedPawnId
          ? `Silas knocked your ${move.capturedPawnId.toUpperCase()} back to the Corral!`
          : null,
        turn: state.turn + 1,
        phase: 'player_roll',
        statusBanner: `Turn ${state.turn + 1} — ${summary}. Your turn to roll.`,
      };
    }

    case 'TOGGLE_FLAG_ROLL': {
      if (state.phase === 'landing' || state.phase === 'verdict') return state;
      if (!state.rollHistory.some((r) => r.id === action.rollId)) return state;
      return {
        ...state,
        flaggedRollIds: state.flaggedRollIds.includes(action.rollId)
          ? state.flaggedRollIds.filter((id) => id !== action.rollId)
          : [...state.flaggedRollIds, action.rollId],
      };
    }

    case 'CALL_OUT_DEALER': {
      if (state.phase === 'landing' || state.phase === 'verdict') return state;
      // Evidence-based: judged on the rolls the player flagged, not on the hidden rig count.
      const flagged = state.rollHistory.filter((r) => state.flaggedRollIds.includes(r.id));
      const hits = flagged.filter((r) => r.rigged).length;
      const isValidCatch = hits >= MIN_FLAGGED_HITS && hits > flagged.length - hits;
      return {
        ...state,
        isRolling: false,
        dealerHasRolled: false,
        legalMoves: [],
        phase: 'verdict',
        verdict: isValidCatch ? 'caught' : 'false_accusation',
        statusBanner: isValidCatch
          ? 'Sharper Exposed! You caught Silas using loaded dice.'
          : 'Bad Call! You accused a clean table without enough proof.',
        dealerDialogue: isValidCatch
          ? 'Alright, alright—hands up. Sharp eyes, Marshal… the bones were weighted.'
          : 'Big talk with empty hands! House rules say the pot is mine.',
      };
    }

    case 'RESET_TO_LANDING': {
      return createInitialGameState();
    }

    default:
      return state;
  }
}