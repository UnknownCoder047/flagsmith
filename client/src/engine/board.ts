import type { LegalMove, PawnState, PlayerId } from '../types';

export const BOARD_SIZE = 9;
export const OUTER_TRACK_LENGTH = 28;
export const HOME_PROGRESS = 30;

/**
 * 28-square clockwise outer track around the 9x9 cross-shaped saloon board.
 * Index 0 is Player's entry (South arm left); Index 14 is Silas's entry (North arm right).
 */
export const OUTER_RING_COORDS: ReadonlyArray<[number, number]> = [
  [8, 3], // 0  - Marshal Entry (Safe)
  [7, 3], // 1
  [6, 3], // 2
  [5, 2], // 3
  [5, 1], // 4
  [5, 0], // 5
  [4, 0], // 6  - West Outpost (Safe)
  [3, 0], // 7
  [3, 1], // 8
  [3, 2], // 9
  [2, 3], // 10
  [1, 3], // 11
  [0, 3], // 12
  [0, 4], // 13 - North Outpost (Safe)
  [0, 5], // 14 - Sharper Entry (Safe)
  [1, 5], // 15
  [2, 5], // 16
  [3, 6], // 17
  [3, 7], // 18
  [3, 8], // 19
  [4, 8], // 20 - East Outpost (Safe)
  [5, 8], // 21
  [5, 7], // 22
  [5, 6], // 23
  [6, 5], // 24
  [7, 5], // 25
  [8, 5], // 26
  [8, 4], // 27 - South Outpost (Safe)
];

/** Safe Sheriff-Star squares where no rider can be knocked back to the corral */
export const SAFE_RING_INDICES = new Set<number>([0, 6, 13, 14, 20, 27]);

/** Private home lanes (progress 28 and 29) leading into the 3x3 center Gold Vault */
export const PLAYER_HOME_LANE: ReadonlyArray<[number, number]> = [
  [7, 4], // progress 28
  [6, 4], // progress 29
];

export const DEALER_HOME_LANE: ReadonlyArray<[number, number]> = [
  [1, 4], // progress 28
  [2, 4], // progress 29
];

export function createInitialPawns(): PawnState[] {
  return [
    { id: 'm1', owner: 'player', label: 'M1', progress: 0 },
    { id: 'm2', owner: 'player', label: 'M2', progress: -1 },
    { id: 's1', owner: 'dealer', label: 'S1', progress: 0 },
    { id: 's2', owner: 'dealer', label: 'S2', progress: -1 },
  ];
}

export function getOuterRingIndex(owner: PlayerId, progress: number): number | null {
  if (progress < 0 || progress >= OUTER_TRACK_LENGTH) return null;
  return owner === 'player' ? progress : (14 + progress) % OUTER_TRACK_LENGTH;
}

export function isSafeSquare(owner: PlayerId, progress: number): boolean {
  if (progress >= OUTER_TRACK_LENGTH) return true;
  const ringIdx = getOuterRingIndex(owner, progress);
  return ringIdx !== null && SAFE_RING_INDICES.has(ringIdx);
}

export function getCoordForProgress(
  owner: PlayerId,
  progress: number,
): [number, number] | null {
  if (progress < 0 || progress >= HOME_PROGRESS) return null;
  if (progress < OUTER_TRACK_LENGTH) {
    const ringIdx = getOuterRingIndex(owner, progress);
    return ringIdx !== null ? OUTER_RING_COORDS[ringIdx] : null;
  }
  const laneIdx = progress - OUTER_TRACK_LENGTH;
  const lane = owner === 'player' ? PLAYER_HOME_LANE : DEALER_HOME_LANE;
  return lane[laneIdx] ?? null;
}

export function getTargetProgress(currentProgress: number, roll: number): number | null {
  if (currentProgress >= HOME_PROGRESS) return null;
  if (currentProgress === -1) {
    return roll - 1;
  }
  const next = currentProgress + roll;
  if (next > HOME_PROGRESS) return null;
  return next;
}

export function getLegalMoves(
  pawns: PawnState[],
  owner: PlayerId,
  roll: number,
): LegalMove[] {
  const moves: LegalMove[] = [];
  const opponent: PlayerId = owner === 'player' ? 'dealer' : 'player';

  for (const pawn of pawns) {
    if (pawn.owner !== owner) continue;
    const toProgress = getTargetProgress(pawn.progress, roll);
    if (toProgress === null) continue;

    let capturedPawnId: string | undefined;
    const targetRingIdx = getOuterRingIndex(owner, toProgress);
    const landsOnSafe = isSafeSquare(owner, toProgress);

    if (targetRingIdx !== null && !landsOnSafe) {
      const victim = pawns.find(
        (other) =>
          other.owner === opponent &&
          getOuterRingIndex(other.owner, other.progress) === targetRingIdx,
      );
      if (victim) {
        capturedPawnId = victim.id;
      }
    }

    moves.push({
      pawnId: pawn.id,
      fromProgress: pawn.progress,
      toProgress,
      capturedPawnId,
      entersHome: toProgress === HOME_PROGRESS,
      landsOnSafe,
    });
  }

  return moves;
}

export function applyMove(pawns: PawnState[], move: LegalMove): PawnState[] {
  return pawns.map((pawn) => {
    if (pawn.id === move.pawnId) {
      return { ...pawn, progress: move.toProgress };
    }
    if (move.capturedPawnId && pawn.id === move.capturedPawnId) {
      return { ...pawn, progress: -1 };
    }
    return pawn;
  });
}

export function hasPlayerWon(pawns: PawnState[], owner: PlayerId): boolean {
  return pawns.filter((p) => p.owner === owner).every((p) => p.progress === HOME_PROGRESS);
}

export function getCellKind(
  row: number,
  col: number,
):
  | 'empty'
  | 'center'
  | 'track'
  | 'safe'
  | 'player_lane'
  | 'dealer_lane'
  | 'player_entry'
  | 'dealer_entry' {
  if (row >= 3 && row <= 5 && col >= 3 && col <= 5) return 'center';

  const inCross = (row >= 3 && row <= 5) || (col >= 3 && col <= 5);
  if (!inCross) return 'empty';

  if (col === 4 && (row === 6 || row === 7)) return 'player_lane';
  if (col === 4 && (row === 1 || row === 2)) return 'dealer_lane';
  if (row === 8 && col === 3) return 'player_entry';
  if (row === 0 && col === 5) return 'dealer_entry';

  const ringIdx = OUTER_RING_COORDS.findIndex(([r, c]) => r === row && c === col);
  if (ringIdx !== -1 && SAFE_RING_INDICES.has(ringIdx)) return 'safe';

  return 'track';
}
