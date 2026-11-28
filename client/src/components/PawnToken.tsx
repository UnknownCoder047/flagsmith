import type { LegalMove, PawnState } from '../types';

interface PawnTokenProps {
  pawn: PawnState;
  move?: LegalMove;
  compact?: boolean;
  is3DView: boolean;
  isJustMoved: boolean;
  onSelect: (pawnId: string) => void;
  onHover: (pawnId: string | null) => void;
}

export function PawnToken({
  pawn,
  move,
  compact = false,
  is3DView,
  isJustMoved,
  onSelect,
  onHover,
}: PawnTokenProps) {
  const isClickable = Boolean(move);
  const isPlayer = pawn.owner === 'player';

  const sizeClass = compact ? 'h-6 w-6 text-[10px]' : 'h-7 w-7 sm:h-8 sm:w-8 text-[11px]';

  const chip3DClass = isPlayer
    ? 'bg-[radial-gradient(circle_at_30%_22%,#10b981_0%,#047857_48%,#064e3b_100%)] text-white border-emerald-200/90 shadow-[0_5px_0_#022c22,0_8px_12px_rgba(0,0,0,0.55),inset_0_1px_2px_rgba(255,255,255,0.65)]'
    : 'bg-[radial-gradient(circle_at_30%_22%,#dc2626_0%,#991b1b_48%,#450a0a_100%)] text-amber-50 border-amber-300/85 shadow-[0_5px_0_#3b0707,0_8px_12px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,230,190,0.55)]';

  const standClass = is3DView
    ? isClickable
      ? 'pawn-stand-3d-playable'
      : 'pawn-stand-3d'
    : '';

  return (
    <div data-pawn-id={pawn.id} className="preserve-3d relative flex items-center justify-center">
      {/* Grounded cast shadow flat on the tile */}
      <span
        aria-hidden="true"
        style={{ transform: 'translateZ(1px)' }}
        className={`pointer-events-none absolute -bottom-1 rounded-full bg-black/55 blur-[2px] transition-all ${
          compact ? 'h-2.5 w-5' : 'h-3 w-7'
        } ${isClickable ? 'scale-110 opacity-75' : 'opacity-65'}`}
      />

      {isClickable ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onHover(null);
            onSelect(pawn.id);
          }}
          onMouseEnter={() => onHover(pawn.id)}
          onMouseLeave={() => onHover(null)}
          aria-label={
            move?.capturedPawnId
              ? `Move ${pawn.label} to knock ${move.capturedPawnId.toUpperCase()} back to the Corral`
              : move?.entersHome
                ? `Move ${pawn.label} into the Gold Vault`
                : `Move ${pawn.label}`
          }
          title={
            move?.capturedPawnId
              ? `Move ${pawn.label} to knock ${move.capturedPawnId.toUpperCase()} back to the Corral!`
              : move?.entersHome
                ? `Move ${pawn.label} into the Gold Vault!`
                : `Move ${pawn.label}`
          }
          className={`type-tabular relative z-30 flex cursor-pointer items-center justify-center rounded-full border-2 font-mono font-bold transition-transform focus:outline-none focus-visible:ring-4 focus-visible:ring-white animate-pawn-pulse ring-2 ring-amber-300 ${sizeClass} ${chip3DClass} ${standClass}`}
        >
          <span className="pointer-events-none absolute inset-[2px] rounded-full border border-dashed border-white/40" />
          <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">{pawn.label}</span>
        </button>
      ) : (
        <div
          className={`type-tabular relative z-10 flex items-center justify-center rounded-full border font-mono font-bold transition-transform ${sizeClass} ${chip3DClass} ${standClass} ${
            isJustMoved ? 'ring-2 ring-amber-300/90' : ''
          }`}
        >
          <span className="pointer-events-none absolute inset-[2px] rounded-full border border-dashed border-white/25" />
          <span className="relative drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">{pawn.label}</span>
        </div>
      )}
    </div>
  );
}