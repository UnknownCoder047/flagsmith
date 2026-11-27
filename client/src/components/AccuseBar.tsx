import { AlertTriangle, Flag, Gavel } from 'lucide-react';
import type { MatchPhase } from '../types';

interface AccuseBarProps {
  phase: MatchPhase;
  turn: number;
  onCallOut: () => void;
  onForfeit: () => void;
}

export function AccuseBar({ phase, turn, onCallOut, onForfeit }: AccuseBarProps) {
  const isActiveMatch =
    phase === 'player_roll' || phase === 'player_move' || phase === 'dealer_turn';

  return (
    <section className="plaque-3d rounded-2xl border-red-900/30 p-4 dark:border-red-500/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="type-broadsheet font-display text-sm uppercase tracking-[0.14em] text-red-900 dark:text-red-300">
            Call the Table
          </h2>
          <p className="mt-1 font-serif text-xs leading-relaxed text-stone-700 dark:text-stone-300">
            Think Silas switched in loaded bones? Slam the table once you spot suspicious
            rolls.
          </p>
        </div>
        {isActiveMatch && (
          <button
            type="button"
            onClick={onForfeit}
            title="Fold match"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-stone-400/50 px-2 py-1 font-mono text-[10px] font-medium text-stone-600 transition-colors hover:border-red-500 hover:text-red-700 dark:border-stone-700 dark:text-stone-400 dark:hover:border-red-500/50 dark:hover:text-red-300"
          >
            <Flag className="h-3 w-3" />
            <span className="type-interactive">Fold</span>
          </button>
        )}
      </div>

      <button
        type="button"
        disabled={!isActiveMatch}
        onClick={onCallOut}
        className={`group mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-all ${
          isActiveMatch
            ? 'border border-red-400/50 border-b-4 border-b-red-950 bg-gradient-to-b from-red-600 via-red-700 to-red-800 text-amber-50 shadow-[0_8px_18px_-6px_rgba(185,28,28,0.65)] hover:from-red-500 hover:to-red-700 active:translate-y-0.5 active:border-b-2'
            : 'cursor-not-allowed border border-stone-300 bg-stone-200 text-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-600'
        }`}
      >
        <Gavel className="h-4 w-4 transition-transform group-hover:-rotate-12" />
        <span className="type-interactive">Call Out Loaded Dice</span>
      </button>

      <div className="mt-2.5 flex items-center gap-1.5 font-sans text-[11px] text-amber-900/90 dark:text-amber-300/85">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>
          {turn <= 3
            ? 'Hold your fire: calling out with fewer than 2 rigged rolls forfeits the pot.'
            : 'Valid catch (2+ rigged rolls) wins the pot instantly. False call loses.'}
        </span>
      </div>
    </section>
  );
}
