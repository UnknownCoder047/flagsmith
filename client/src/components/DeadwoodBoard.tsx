import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { Box, Eye, Shield, Vault } from 'lucide-react';
import type { LastMoveTrace, LegalMove, PawnState } from '../types';
import {
  BOARD_SIZE,
  getCellKind,
  getCoordForProgress,
  HOME_PROGRESS,
} from '../engine/board';
import { prefersReducedMotion } from '../lib/motion';

interface DeadwoodBoardProps {
  pawns: PawnState[];
  legalMoves: LegalMove[];
  lastMove: LastMoveTrace | null;
  canSelectMove: boolean;
  onSelectPawn: (pawnId: string) => void;
}

const TRACK_ARROWS: Record<string, string> = {
  '7,3': '↑',
  '3,1': '→',
  '1,5': '↓',
  '5,7': '←',
  '7,4': '↑',
  '1,4': '↓',
};

export function DeadwoodBoard({
  pawns,
  legalMoves,
  lastMove,
  canSelectMove,
  onSelectPawn,
}: DeadwoodBoardProps) {
  const [hoveredPawnId, setHoveredPawnId] = useState<string | null>(null);
  const [is3DView, setIs3DView] = useState(true);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const slabRef = useRef<HTMLDivElement | null>(null);
  const rotXToRef = useRef<((val: number) => void) | null>(null);
  const rotYToRef = useRef<((val: number) => void) | null>(null);

  // Set up GSAP quickTo for silky 3D tabletop parallax tilt
  useEffect(() => {
    const slab = slabRef.current;
    if (!slab) return;
    const prefersReduced = prefersReducedMotion();
    const baseRotateX = is3DView && !prefersReduced ? 14 : 0;

    const ctx = gsap.context(() => {
      gsap.to(slab, {
        rotateX: baseRotateX,
        rotateY: 0,
        duration: 0.55,
        ease: 'power3.out',
      });
      rotXToRef.current = gsap.quickTo(slab, 'rotationX', {
        duration: 0.45,
        ease: 'power2.out',
      });
      rotYToRef.current = gsap.quickTo(slab, 'rotationY', {
        duration: 0.45,
        ease: 'power2.out',
      });
    }, stageRef);

    return () => {
      rotXToRef.current = null;
      rotYToRef.current = null;
      ctx.revert();
    };
  }, [is3DView]);

  // Animate moved pawn hop + capture board recoil via GSAP
  useEffect(() => {
    if (!lastMove) return;
    const prefersReduced = prefersReducedMotion();
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      const movedEl = stageRef.current?.querySelector(
        `[data-pawn-id="${lastMove.pawnId}"]`,
      );
      if (movedEl) {
        gsap.fromTo(
          movedEl,
          { y: -22, scale: 1.32, rotationZ: -10 },
          {
            y: 0,
            scale: 1,
            rotationZ: 0,
            duration: 0.48,
            ease: 'bounce.out',
          },
        );
      }

      if (lastMove.captured && slabRef.current) {
        gsap
          .timeline()
          .to(slabRef.current, {
            x: -4,
            y: 2,
            duration: 0.055,
            ease: 'power1.inOut',
          })
          .to(slabRef.current, {
            x: 4,
            y: -2,
            duration: 0.055,
            ease: 'power1.inOut',
          })
          .to(slabRef.current, {
            x: -2,
            y: 1,
            duration: 0.055,
            ease: 'power1.inOut',
          })
          .to(slabRef.current, {
            x: 0,
            y: 0,
            duration: 0.14,
            ease: 'power2.out',
          });
      }
    }, stageRef);

    return () => ctx.revert();
  }, [lastMove]);

  const handleStageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!is3DView || !stageRef.current || !rotXToRef.current || !rotYToRef.current) return;
    if (prefersReducedMotion()) return;
    const rect = stageRef.current.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    rotXToRef.current(14 - ny * 7);
    rotYToRef.current(nx * 8);
  };

  const handleStageMouseLeave = () => {
    if (!is3DView || !rotXToRef.current || !rotYToRef.current) return;
    rotXToRef.current(14);
    rotYToRef.current(0);
  };

  const legalMoveByPawn = new Map<string, LegalMove>();
  if (canSelectMove) {
    for (const move of legalMoves) {
      legalMoveByPawn.set(move.pawnId, move);
    }
  }

  // Auto-preview destination if only 1 legal move exists
  const activePreviewMove = hoveredPawnId
    ? legalMoveByPawn.get(hoveredPawnId) ?? null
    : canSelectMove && legalMoves.length === 1
      ? legalMoves[0]
      : null;

  const previewTargetCoord =
    activePreviewMove && activePreviewMove.toProgress < HOME_PROGRESS
      ? getCoordForProgress('player', activePreviewMove.toProgress)
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
    const isJustMoved = lastMove?.pawnId === pawn.id;

    const sizeClass = compact ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 sm:h-8 sm:w-8 text-[11px]';

    // Physical 3D stacked casino/marshal chip styling
    const chip3DClass = isPlayer
      ? 'bg-[radial-gradient(circle_at_30%_25%,#34d399_0%,#059669_55%,#064e3b_100%)] text-white border-emerald-200/85 shadow-[0_4px_0_#022c22,0_7px_12px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.6)]'
      : 'bg-[radial-gradient(circle_at_30%_25%,#f87171_0%,#b91c1c_55%,#450a0a_100%)] text-amber-100 border-amber-300/80 shadow-[0_4px_0_#3b0707,0_7px_12px_rgba(0,0,0,0.58),inset_0_1px_1px_rgba(255,230,190,0.5)]';

    if (isClickable) {
      return (
        <button
          key={pawn.id}
          data-pawn-id={pawn.id}
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
          style={{ transform: 'translateZ(14px)' }}
          className={`type-tabular relative z-20 flex items-center justify-center rounded-full border-2 font-mono font-bold transition-transform hover:-translate-y-1 hover:scale-110 active:translate-y-0.5 focus:outline-none animate-pawn-pulse ring-2 ring-amber-300 ${sizeClass} ${chip3DClass}`}
        >
          <span className="pointer-events-none absolute inset-[2px] rounded-full border border-dashed border-white/35" />
          <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.75)]">{pawn.label}</span>
        </button>
      );
    }

    return (
      <div
        key={pawn.id}
        data-pawn-id={pawn.id}
        style={{ transform: 'translateZ(8px)' }}
        className={`type-tabular relative z-10 flex items-center justify-center rounded-full border font-mono font-bold transition-transform ${sizeClass} ${chip3DClass} ${
          isJustMoved ? 'ring-2 ring-amber-300/90 scale-105' : ''
        }`}
      >
        <span className="pointer-events-none absolute inset-[2px] rounded-full border border-dashed border-white/25" />
        <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.75)]">{pawn.label}</span>
      </div>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[515px] select-none">
      {/* Top Camera & Scoreboard Bar */}
      <div className="mb-2.5 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-700/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-800 dark:border-emerald-400/25 dark:text-emerald-300">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.75)]" />
          <span className="type-interactive">You (Marshal)</span>
          <span className="type-tabular font-mono text-[10px] opacity-85">
            {playerVaultPawns.length}/2
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIs3DView((prev) => !prev)}
          title={is3DView ? 'Switch to flat top-down view' : 'Switch to 3D angled table view'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700/30 bg-amber-100/70 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-amber-900 transition-colors hover:bg-amber-200/80 dark:border-amber-500/25 dark:bg-[#221812] dark:text-amber-200 dark:hover:bg-[#2e2018]"
        >
          {is3DView ? <Eye className="h-3 w-3" /> : <Box className="h-3 w-3" />}
          <span className="type-interactive">{is3DView ? '3D Table' : 'Flat View'}</span>
        </button>

        <div className="flex items-center gap-2 rounded-lg border border-red-700/30 bg-red-500/10 px-2.5 py-1 text-[11px] font-medium text-red-800 dark:border-red-400/25 dark:text-red-300">
          <span className="type-tabular font-mono text-[10px] opacity-85">
            {dealerVaultPawns.length}/2
          </span>
          <span className="type-interactive">Silas (Sharper)</span>
          <span className="h-2.5 w-2.5 rounded-full bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.75)]" />
        </div>
      </div>

      {/* 3D Perspective Stage */}
      <div
        ref={stageRef}
        onMouseMove={handleStageMouseMove}
        onMouseLeave={handleStageMouseLeave}
        className="scene-3d py-1"
      >
        <div
          ref={slabRef}
          className="board-slab-3d relative rounded-2xl border-2 border-amber-900/45 bg-gradient-to-b from-[#d8c3a0] via-[#c7ad83] to-[#b09264] p-2.5 shadow-[0_26px_44px_-16px_rgba(20,10,4,0.62)] sm:p-3.5 dark:border-amber-500/35 dark:from-[#2d1e15] dark:via-[#1e140e] dark:to-[#130c08]"
        >
          {/* Extruded Mahogany Thickness Lip */}
          <div
            aria-hidden="true"
            className="board-edge-lip absolute inset-0 rounded-2xl border border-amber-950/60 bg-gradient-to-b from-[#785732] to-[#4a3219] dark:border-amber-900/40 dark:from-[#120b08] dark:to-[#070403]"
          />

          {/* Brass Corner Plates */}
          <span className="pointer-events-none absolute left-1.5 top-1.5 h-2.5 w-2.5 rounded-tl border-l-2 border-t-2 border-amber-400/70" />
          <span className="pointer-events-none absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-tr border-r-2 border-t-2 border-amber-400/70" />
          <span className="pointer-events-none absolute bottom-1.5 left-1.5 h-2.5 w-2.5 rounded-bl border-b-2 border-l-2 border-amber-400/70" />
          <span className="pointer-events-none absolute bottom-1.5 right-1.5 h-2.5 w-2.5 rounded-br border-b-2 border-r-2 border-amber-400/70" />

          {/* 9x9 Cross Grid */}
          <div className="preserve-3d relative grid aspect-square grid-cols-9 grid-rows-9 gap-1 rounded-xl bg-amber-950/15 p-1 shadow-[inset_0_3px_10px_rgba(0,0,0,0.35)] dark:bg-black/45">
            {Array.from({ length: BOARD_SIZE * BOARD_SIZE }, (_, idx) => {
              const row = Math.floor(idx / BOARD_SIZE);
              const col = idx % BOARD_SIZE;
              const kind = getCellKind(row, col);

              // Center 3x3 Raised 3D Gold Vault Pedestal
              if (kind === 'center') {
                if (row !== 3 || col !== 3) return null;
                const isHomeTarget = activePreviewMove?.entersHome;
                return (
                  <div
                    key="gold-vault-center"
                    style={{ transform: 'translateZ(10px)' }}
                    className={`preserve-3d col-span-3 row-span-3 flex flex-col items-center justify-center rounded-xl border-2 bg-gradient-to-br from-amber-100 via-amber-50 to-amber-200/80 p-2 text-center shadow-[0_8px_16px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.85)] transition-all dark:from-[#3a2816] dark:via-[#261a0f] dark:to-[#181009] ${
                      isHomeTarget
                        ? 'border-emerald-400 ring-2 ring-emerald-400/80'
                        : 'border-amber-500/70'
                    }`}
                  >
                    <Vault className="mb-0.5 h-4 w-4 text-amber-700 dark:text-amber-300" />
                    <span className="type-broadsheet font-display text-xs uppercase tracking-wider text-amber-950 dark:text-amber-200">
                      Gold Vault
                    </span>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-stone-600 dark:text-amber-400/70">
                      Exact Roll
                    </span>
                    <div className="preserve-3d mt-2 flex flex-wrap items-center justify-center gap-1">
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
                    className="preserve-3d col-span-3 row-span-3 flex flex-col items-center justify-center rounded-xl border border-red-900/30 bg-red-950/15 p-2 shadow-[inset_0_4px_10px_rgba(0,0,0,0.28)] dark:border-red-500/25 dark:bg-red-950/30"
                  >
                    <span className="font-display text-[11px] font-bold uppercase tracking-wider text-red-900 dark:text-red-300">
                      Silas&apos;s Corral
                    </span>
                    <div className="preserve-3d mt-2 flex items-center gap-1.5">
                      {dealerCorralPawns.length > 0 ? (
                        dealerCorralPawns.map((p) => renderPawnToken(p))
                      ) : (
                        <span className="font-serif text-[11px] italic text-stone-500 dark:text-stone-400">
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
                    className={`preserve-3d col-span-3 row-span-3 flex flex-col items-center justify-center rounded-xl border p-2 shadow-[inset_0_4px_10px_rgba(0,0,0,0.28)] transition-colors ${
                      hasPlayableCampPawn
                        ? 'border-emerald-500/75 bg-emerald-500/15'
                        : 'border-emerald-900/25 bg-emerald-950/10 dark:border-emerald-500/25 dark:bg-emerald-950/25'
                    }`}
                  >
                    <span className="font-display text-[11px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                      Your Corral
                    </span>
                    <div className="preserve-3d mt-2 flex items-center gap-1.5">
                      {playerCorralPawns.length > 0 ? (
                        playerCorralPawns.map((p) => renderPawnToken(p))
                      ) : (
                        <span className="font-serif text-[11px] italic text-stone-500 dark:text-stone-400">
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
                    className="col-span-3 row-span-3 flex flex-col items-center justify-center rounded-xl border border-stone-400/45 bg-stone-100/65 p-2 text-center shadow-[inset_0_2px_6px_rgba(0,0,0,0.12)] dark:border-amber-500/15 dark:bg-[#16100c]/80"
                  >
                    <Shield className="mb-1 h-4 w-4 text-amber-700 dark:text-amber-400" />
                    <span className="font-display text-[11px] font-bold text-stone-800 dark:text-amber-100">
                      ★ Safe Outpost
                    </span>
                    <span className="mt-0.5 font-serif text-[10px] italic leading-tight text-stone-600 dark:text-stone-400">
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
                    className="col-span-3 row-span-3 flex flex-col items-center justify-center rounded-xl border border-stone-400/45 bg-stone-100/65 p-2 text-center shadow-[inset_0_2px_6px_rgba(0,0,0,0.12)] dark:border-amber-500/15 dark:bg-[#16100c]/80"
                  >
                    <span className="font-display text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                      Clockwise ↻
                    </span>
                    <span className="mt-1 font-mono text-[9px] leading-tight text-stone-600 dark:text-stone-400">
                      Space: Roll · 1/2: Move
                    </span>
                  </div>
                );
              }

              if (kind === 'empty') return null;

              const cellKey = `${row},${col}`;
              const cellPawns = pawnsByCell.get(cellKey) ?? [];
              const arrow = TRACK_ARROWS[cellKey];

              const isPreviewTarget =
                previewTargetCoord !== null &&
                previewTargetCoord[0] === row &&
                previewTargetCoord[1] === col;

              const isLastFrom =
                lastMove?.fromCoord !== null &&
                lastMove?.fromCoord !== undefined &&
                lastMove.fromCoord[0] === row &&
                lastMove.fromCoord[1] === col;

              const isLastTo =
                lastMove?.toCoord !== null &&
                lastMove?.toCoord !== undefined &&
                lastMove.toCoord[0] === row &&
                lastMove.toCoord[1] === col;

              let bgClass =
                'bg-[#faf3e6] border-amber-900/25 shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_2px_3px_rgba(0,0,0,0.18)] dark:bg-[#2a1f18] dark:border-amber-700/30 dark:shadow-[inset_0_1px_0_rgba(255,225,180,0.08),0_2px_4px_rgba(0,0,0,0.45)]';
              if (kind === 'safe') {
                bgClass =
                  'bg-amber-100/95 border-amber-600/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_2px_4px_rgba(0,0,0,0.2)] dark:bg-amber-950/55 dark:border-amber-500/45';
              } else if (kind === 'player_lane') {
                bgClass =
                  'bg-emerald-100/85 border-emerald-600/45 dark:bg-emerald-950/50 dark:border-emerald-500/40';
              } else if (kind === 'dealer_lane') {
                bgClass =
                  'bg-red-100/85 border-red-600/45 dark:bg-red-950/50 dark:border-red-500/40';
              } else if (kind === 'player_entry') {
                bgClass =
                  'bg-emerald-200/90 border-emerald-700/60 dark:bg-emerald-900/55 dark:border-emerald-400/55';
              } else if (kind === 'dealer_entry') {
                bgClass =
                  'bg-red-200/90 border-red-700/60 dark:bg-red-900/55 dark:border-red-400/55';
              }

              const highlightRing = isPreviewTarget
                ? activePreviewMove?.capturedPawnId
                  ? 'ring-2 ring-red-500 bg-red-500/25'
                  : 'ring-2 ring-emerald-400 bg-emerald-400/20'
                : isLastTo
                  ? lastMove?.actor === 'dealer'
                    ? 'ring-1 ring-red-400/80'
                    : 'ring-1 ring-emerald-400/80'
                  : isLastFrom
                    ? 'border-dashed border-amber-500/70'
                    : '';

              return (
                <div
                  key={cellKey}
                  className={`preserve-3d relative flex items-center justify-center rounded-md border transition-all ${bgClass} ${highlightRing}`}
                >
                  {cellPawns.length === 0 &&
                    (kind === 'safe' || kind === 'player_entry' || kind === 'dealer_entry') && (
                      <span className="pointer-events-none text-xs text-amber-700/80 dark:text-amber-300/75">
                        ★
                      </span>
                    )}

                  {cellPawns.length === 0 &&
                    kind !== 'safe' &&
                    kind !== 'player_entry' &&
                    kind !== 'dealer_entry' &&
                    arrow && (
                      <span className="pointer-events-none font-mono text-[10px] text-stone-500/75 dark:text-amber-200/35">
                        {arrow}
                      </span>
                    )}

                  {cellPawns.length > 0 && (
                    <div className="preserve-3d flex flex-wrap items-center justify-center gap-0.5">
                      {cellPawns.map((p) => renderPawnToken(p, cellPawns.length > 1))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
