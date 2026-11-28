import type { LegalMove, PawnState } from '../types';

interface PawnTokenProps {
  pawn: PawnState;
  /** Set when the player may move this pawn now. */
  move?: LegalMove;
  compact?: boolean;
  isJustMoved: boolean;
  onSelect: (pawnId: string) => void;
  onHover: (pawnId: string | null) => void;
}

export function PawnToken({
  pawn,
  move,
  compact = false,
  isJustMoved,
  onSelect,
  onHover,
}: PawnTokenProps) {
  const isClickable = Boolean(move);
  const isPlayer = pawn.owner === 'player';

  const sizeClass = compact ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 sm:h-8 sm:w-8 text-[11px]';

  // Physical 3D stacked casino/marshal chip styling
  const chip3DClass = isPlayer
    ? 'bg-[radial-gradient(circle_at_30%_25%,#047857_0%,#065f46_55%,#064e3b_100%)] text-white border-emerald-200/85 shadow-[0_4px_0_#022c22,0_7px_12px_rgba(0,0,0,0.55),inset_0_1px_1px_rgba(255,255,255,0.6)]'
    : 'bg-[radial-gradient(circle_at_30%_25%,#b91c1c_0%,#991b1b_55%,#450a0a_100%)] text-white border-amber-300/80 shadow-[0_4px_0_#3b0707,0_7px_12px_rgba(0,0,0,0.58),inset_0_1px_1px_rgba(255,230,190,0.5)]';

  if (isClickable) {
    return (
      <button
        data-pawn-id={pawn.id}
        type="button"
        onClick={() => {
          onHover(null);
          onSelect(pawn.id);
        }}
        onMouseEnter={() => onHover(pawn.id)}
        onMouseLeave={() => onHover(null)}
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
}
