import { useState } from 'react';
import { Shield, Vault } from 'lucide-react';
import type { LegalMove, PawnState } from '../types';
import {
  BOARD_SIZE,
  getCellKind,
  getCoordForProgress,
  HOME_PROGRESS,
} from '../engine/board';

interface ChausarBoardProps {
  pawns: PawnState[];
  legalMoves: LegalMove[];
  canSelectMove: boolean;
  onSelectPawn: (pawnId: string) => void;
}

export function ChausarBoard({
  pawns,
  legalMoves,
  canSelectMove,
  onSelectPawn,
}: ChausarBoardProps) {
  const [hoveredPawnId, setHoveredPawnId] = useState<string | null>(null);

  const legalMoveByPawn = new Map<string, LegalMove>();
  if (canSelectMove) {
    for (const move of legalMoves) {
      legalMoveByPawn.set(move.pawnId, move);
    }
  }

  const hoveredMove = hoveredPawnId ? legalMoveByPawn.get(hoveredPawnId) ?? null : null;
  const hoveredTargetCoord =
    hoveredMove && hoveredMove.toProgress < HOME_PROGRESS
      ? getCoordForProgress('player', hoveredMove.toProgress)
      : null;

  const playerCorralPawns = pawns.filter((p) => p.owner === 'player' && p.progress === -1);
  const dealerCorralPawns = pawns.filter((p) => p.owner === 'dealer' && p.progress === -1);
  const playerVaultPawns = pawns.filter((p) => p.owner === 'player' && p.progress === HOME_PROGRESS);
  const dealerVaultPawns = pawns.filter((p) => p.owner === 'dealer' && p.progress === HOME_PROGRESS);

  const pawnsByCell = new Map<string, PawnState[]>();
  for (const pawn of pawns) {
    const coord = getCoordForProgress(pawn.owner, pawn.progress);
    if (!coord) continue;
    const key = `${coord[0]},${coord[1]}`;
    const existing = pawnsByCell.get(key) ?? [];
    existing.push(pawn);
    pawnsByCell.set(key, existing);
  }

  const renderPawnToken = (pawn: PawnState, compact = false) => {
    const move = legalMoveByPawn.get(pawn.id);
    const isClickable = Boolean(move);
    const isPlayer = pawn.owner === 'player';

    const sizeClass = compact ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 sm:h-8 sm:w-8 text-[11px]';

    const colorClass = isPlayer
      ? 'bg-gradient-to-br from-emerald-500 to-emerald-800 text-white border-emerald-200/80 shadow-emerald-950/60'
      : 'bg-gradient-to-br from-red-600 to-red-950 text-amber-100 border-amber-300/70 shadow-red-950/70';

    if (isClickable) {
      return (
        <button
          key={pawn.id}
          type="button"
          onClick={() => {
            setHoveredPawnId(null);
            onSelectPawn(pawn.id);
          }}
          onMouseEnter={() => setHoveredPawnId(pawn.id)}
          onMouseLeave={() => setHoveredPawnId(null)}
          title={
            move?.capturedPawnId
              ? `Move ${pawn.label} to knock ${move.capturedPawnId.toUpperCase()} back to the Corral!`
              : move?.entersHome
                ? `Move ${pawn.label} into the Gold Vault!`
                : `Move ${pawn.label}`
          }
          className={`relative z-20 flex items-center justify-center rounded-full border-2 font-mono font-bold shadow-md transition-transform hover:scale-110 focus:outline-none animate-pawn-pulse ring-2 ring-amber-400/90 ${sizeClass} ${colorClass}`}
        >
          {pawn.label}
        </button>
      );
    }

    return (
      <div
        key={pawn.id}
        className={`relative z-10 flex items-center justify-center rounded-full border font-mono font-bold shadow-md ${sizeClass} ${colorClass}`}
      >
        {pawn.label}
      </div>
    );
  };

  return (
    <div className="relative mx-auto w-full max-w-[490px] select-none rounded-2xl border border-amber-800/35 bg-gradient-to-b from-stone-200 to-stone-300/90 p-2.5 shadow-xl sm:p-3.5 dark:border-amber-500/20 dark:from-[#211711] dark:to-[#130d0a]">
      {/* Player vs Silas scoreboard header */}
      <div className="mb-2 flex items-center justify-between px-1 text-[11px] font-medium">
        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          <span>You (Marshal)</span>
          <span className="font-mono text-[10px] opacity-75">
            {playerVaultPawns.length}/2 Vault
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
          <span className="font-mono text-[10px] opacity-75">
            {dealerVaultPawns.length}/2 Vault
          </span>
          <span>Silas (Sharper)</span>
          <span className="h-2.5 w-2.5 rounded-full bg-red-600" />
        </div>
      </div>

      {/* 9x9 Cross Grid */}
      <div className="relative grid aspect-square grid-cols-9 grid-rows-9 gap-1">
        {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, idx) => {
          const row = Math.floor(idx / BOARD_SIZE);
          const col = idx % BOARD_SIZE;
          const kind = getCellKind(row, col);

          // Center 3x3 Gold Vault
          if (kind === 'center') {
            if (row !== 3 || col !== 3) return null;
            const isHomeTarget = hoveredMove?.entersHome;
            return (
              <div
                key="gold-vault-center"
                className={`col-span-3 row-span-3 flex flex-col items-center justify-center rounded-xl border-2 bg-gradient-to-br from-amber-100 via-amber-50 to-stone-100 p-2 text-center shadow-inner transition-all dark:from-[#2f2114] dark:via-[#20160f] dark:to-[#160f0b] ${
                  isHomeTarget
                    ? 'border-emerald-400 ring-2 ring-emerald-400/60'
                    : 'border-amber-500/50'
                }`}
              >
                <Vault className="mb-0.5 h-4 w-4 text-amber-700 dark:text-amber-400" />
                <span className="font-display text-[11px] font-bold uppercase tracking-widest text-amber-900 dark:text-amber-300">
                  Gold Vault
                </span>
                <span className="text-[9px] uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Exact Roll
                </span>
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                  {playerVaultPawns.map((p) => renderPawnToken(p, true))}
                  {dealerVaultPawns.map((p) => renderPawnToken(p, true))}
                </div>
              </div>
            );
          }

          // Top-Right 3x3 corner = Silas's Corral
          if (row === 0 && col === 6) {
            return (
              <div
                key="dealer-corral"
                className="col-span-3 row-span-3 flex flex-col items-center justify-center rounded-xl border border-red-900/20 bg-red-950/10 p-2 dark:border-red-500/20 dark:bg-red-950/20"
              >
                <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-red-800 dark:text-red-300">
                  Silas&apos;s Corral
                </span>
                <div className="mt-2 flex items-center gap-1.5">
                  {dealerCorralPawns.length > 0 ? (
                    dealerCorralPawns.map((p) => renderPawnToken(p))
                  ) : (
                    <span className="text-[10px] italic text-stone-400 dark:text-stone-500">
                      On Trail
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // Bottom-Left 3x3 corner = Player Corral
          if (row === 6 && col === 0) {
            const hasPlayableCampPawn = playerCorralPawns.some((p) =>
              legalMoveByPawn.has(p.id),
            );
            return (
              <div
                key="player-corral"
                className={`col-span-3 row-span-3 flex flex-col items-center justify-center rounded-xl border p-2 transition-colors ${
                  hasPlayableCampPawn
                    ? 'border-emerald-500/60 bg-emerald-500/10'
                    : 'border-emerald-900/20 bg-emerald-950/10 dark:border-emerald-500/20 dark:bg-emerald-950/20'
                }`}
              >
                <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                  Your Corral
                </span>
                <div className="mt-2 flex items-center gap-1.5">
                  {playerCorralPawns.length > 0 ? (
                    playerCorralPawns.map((p) => renderPawnToken(p))
                  ) : (
                    <span className="text-[10px] italic text-stone-400 dark:text-stone-500">
                      On Trail
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // Top-Left 3x3 corner = Safe Outpost Legend
          if (row === 0 && col === 0) {
            return (
              <div
                key="legend-corner"
                className="col-span-3 row-span-3 flex flex-col items-center justify-center rounded-xl border border-stone-300/60 bg-stone-100/60 p-2 text-center dark:border-stone-800/70 dark:bg-stone-900/30"
              >
                <Shield className="mb-1 h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-[10px] font-semibold text-stone-700 dark:text-stone-300">
                  ★ Safe Outpost
                </span>
                <span className="mt-0.5 text-[9px] leading-tight text-stone-500 dark:text-stone-400">
                  No knockbacks here
                </span>
              </div>
            );
          }

          // Bottom-Right 3x3 corner = Direction Hint
          if (row === 6 && col === 6) {
            return (
              <div
                key="direction-corner"
                className="col-span-3 row-span-3 flex flex-col items-center justify-center rounded-xl border border-stone-300/60 bg-stone-100/60 p-2 text-center dark:border-stone-800/70 dark:bg-stone-900/30"
              >
                <span className="font-display text-[10px] font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                  Clockwise ↻
                </span>
                <span className="mt-1 text-[9px] leading-tight text-stone-500 dark:text-stone-400">
                  Race both riders to the Vault — or catch Silas cheating
                </span>
              </div>
            );
          }

          if (kind === 'empty') return null;

          const cellKey = `${row},${col}`;
          const cellPawns = pawnsByCell.get(cellKey) ?? [];
          const isHoveredTarget =
            hoveredTargetCoord !== null &&
            hoveredTargetCoord[0] === row &&
            hoveredTargetCoord[1] === col;

          let bgClass =
            'bg-stone-50 border-stone-300/90 dark:bg-[#241b15] dark:border-amber-900/30';
          if (kind === 'safe') {
            bgClass =
              'bg-amber-100/80 border-amber-500/50 dark:bg-amber-950/45 dark:border-amber-500/40';
          } else if (kind === 'player_lane') {
            bgClass =
              'bg-emerald-100/75 border-emerald-500/40 dark:bg-emerald-950/40 dark:border-emerald-500/35';
          } else if (kind === 'dealer_lane') {
            bgClass =
              'bg-red-100/75 border-red-500/40 dark:bg-red-950/40 dark:border-red-500/35';
          } else if (kind === 'player_entry') {
            bgClass =
              'bg-emerald-200/80 border-emerald-600/60 dark:bg-emerald-900/45 dark:border-emerald-400/50';
          } else if (kind === 'dealer_entry') {
            bgClass =
              'bg-red-200/80 border-red-600/60 dark:bg-red-900/45 dark:border-red-400/50';
          }

          const targetRing = isHoveredTarget
            ? hoveredMove?.capturedPawnId
              ? 'ring-2 ring-red-500 bg-red-500/25'
              : 'ring-2 ring-emerald-400 bg-emerald-400/20'
            : '';

          return (
            <div
              key={cellKey}
              className={`relative flex items-center justify-center rounded-md border transition-all ${bgClass} ${targetRing}`}
            >
              {(kind === 'safe' || kind === 'player_entry' || kind === 'dealer_entry') &&
                cellPawns.length === 0 && (
                  <span className="pointer-events-none text-xs text-amber-600/75 dark:text-amber-400/65">
                    ★
                  </span>
                )}

              {cellPawns.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-0.5">
                  {cellPawns.map((p) => renderPawnToken(p, cellPawns.length > 1))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
