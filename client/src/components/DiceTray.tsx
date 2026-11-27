import { Dices } from 'lucide-react';
import type { MatchPhase } from '../types';

interface DiceTrayProps {
  phase: MatchPhase;
  currentRoll: number | null;
  dice: [number, number, number];
  isRolling: boolean;
  activeTell: boolean;
  statusBanner: string;
  lastCaptureFlash: string | null;
  onRoll: () => void;
}

export function DiceTray({
  phase,
  currentRoll,
  dice,
  isRolling,
  activeTell,
  statusBanner,
  lastCaptureFlash,
  onRoll,
}: DiceTrayProps) {
  const canRoll = phase === 'player_roll' && !isRolling;

  return (
    <section className="rounded-2xl border border-amber-800/25 bg-white/90 p-4 shadow-md dark:border-amber-500/20 dark:bg-[#1a130f]/95">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-xs font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-300">
          Saloon Bones
        </span>
        {currentRoll !== null && !isRolling && (
          <span className="rounded-full border border-amber-500/35 bg-amber-100/80 px-2.5 py-0.5 font-mono text-xs font-bold text-amber-900 dark:bg-amber-950/60 dark:text-amber-200">
            Total: {currentRoll}
          </span>
        )}
      </div>

      {/* 3 Ivory Frontier Dice */}
      <div className="relative flex items-center justify-center gap-3 rounded-xl border border-stone-200 bg-stone-100/80 px-4 py-4 dark:border-stone-800 dark:bg-[#110c0a]">
        {dice.map((pips, index) => {
          const animClass = isRolling
            ? 'animate-dice-roll'
            : activeTell
              ? 'animate-dice-hesitate'
              : '';

          return (
            <div
              key={`${index}-${pips}-${isRolling ? 'rolling' : 'idle'}-${activeTell ? 'tell' : 'plain'}`}
              style={{ animationDelay: `${index * 45}ms` }}
              className={`relative flex h-14 w-12 flex-col items-center justify-evenly overflow-hidden rounded-lg border border-amber-800/40 bg-gradient-to-b from-amber-50 via-stone-100 to-amber-100/90 shadow-md dark:border-amber-400/30 dark:from-[#f3e6cf] dark:via-[#e6d2b0] dark:to-[#d2b483] ${animClass}`}
            >
              {/* Faint brass glint ONLY on the middle die when subtle_tells fires on a rigged roll */}
              {activeTell && !isRolling && index === 1 && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-amber-300/75 to-transparent animate-brass-glint"
                />
              )}

              {pips === 0 ? (
                <span className="h-1.5 w-3 rounded-full bg-amber-900/15" />
              ) : (
                Array.from({ length: pips }, (_, pipIdx) => (
                  <span
                    key={pipIdx}
                    className="h-2.5 w-2.5 rounded-full bg-stone-900 shadow-inner ring-1 ring-amber-800/30"
                  />
                ))
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs font-medium text-stone-700 dark:text-stone-300">
        {statusBanner}
      </p>

      {lastCaptureFlash && (
        <div className="mt-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-center text-xs font-semibold text-red-700 dark:text-red-300">
          {lastCaptureFlash}
        </div>
      )}

      <button
        type="button"
        disabled={!canRoll}
        onClick={onRoll}
        className={`mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all ${
          canRoll
            ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-stone-950 hover:from-amber-500 hover:to-amber-400 active:scale-[0.99]'
            : 'cursor-not-allowed bg-stone-200 text-stone-400 dark:bg-stone-800/80 dark:text-stone-500'
        }`}
      >
        <Dices className={`h-4 w-4 ${isRolling ? 'animate-spin' : ''}`} />
        <span>
          {isRolling
            ? 'Rolling Bones…'
            : phase === 'player_move'
              ? 'Click a Highlighted Rider'
              : phase === 'dealer_turn'
                ? "Silas's Turn…"
                : 'Roll the Bones'}
        </span>
      </button>
    </section>
  );
}
