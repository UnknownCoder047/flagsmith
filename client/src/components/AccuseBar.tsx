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
    <section className="rounded-2xl border border-red-800/30 bg-gradient-to-br from-red-50/90 via-white to-amber-50/60 p-4 shadow-md dark:border-red-500/25 dark:from-[#241210] dark:via-[#1a120f] dark:to-[#1e1510]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xs font-bold uppercase tracking-widest text-red-800 dark:text-red-300">
            Call the Table
          </h2>
          <p className="mt-1 text-[11px] leading-relaxed text-stone-600 dark:text-stone-400">
            Think Silas switched in loaded bones? Call him out once you spot suspicious
            rolls.
          </p>
        </div>
        {isActiveMatch && (
          <button
            type="button"
            onClick={onForfeit}
            title="Fold match"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-stone-300 px-2 py-1 text-[10px] font-medium text-stone-500 transition-colors hover:border-red-400 hover:text-red-700 dark:border-stone-800 dark:text-stone-400 dark:hover:border-red-500/40 dark:hover:text-red-300"
          >
            <Flag className="h-3 w-3" />
            Fold
          </button>
        )}
      </div>

      <button
        type="button"
        disabled={!isActiveMatch}
        onClick={onCallOut}
        className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${
          isActiveMatch
            ? 'border-red-500/60 bg-gradient-to-r from-red-700 to-red-800 text-amber-50 hover:from-red-600 hover:to-red-700 active:scale-[0.99]'
            : 'cursor-not-allowed border-stone-300 bg-stone-200 text-stone-400 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-600'
        }`}
      >
        <Gavel className="h-4 w-4" />
        <span>Call Out Loaded Dice</span>
      </button>

      <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-amber-800/90 dark:text-amber-300/80">
        <AlertTriangle className="h-3 w-3 shrink-0" />
        <span>
          {turn <= 3
            ? 'Hold your fire: calling out with fewer than 2 rigged rolls forfeits the pot.'
            : 'Valid catch (2+ rigged rolls) wins the pot instantly. False call loses.'}
        </span>
      </div>
    </section>
  );
}
