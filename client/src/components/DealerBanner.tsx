import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Flag, History } from 'lucide-react';
import type { RollRecord } from '../types';
import { prefersReducedMotion } from '../lib/motion';

interface DealerBannerProps {
  dialogue: string;
  rollHistory: RollRecord[];
  flaggedRollIds: string[];
  turn: number;
  onToggleFlag: (rollId: string) => void;
}

export function DealerBanner({
  dialogue,
  rollHistory,
  flaggedRollIds,
  turn,
  onToggleFlag,
}: DealerBannerProps) {
  const quoteRef = useRef<HTMLParagraphElement | null>(null);
  const turnBadgeRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!quoteRef.current) return;
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      quoteRef.current,
      { opacity: 0.35, y: 4 },
      { opacity: 1, y: 0, duration: 0.32, ease: 'power2.out' },
    );
  }, [dialogue]);

  useEffect(() => {
    if (!turnBadgeRef.current) return;
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      turnBadgeRef.current,
      { scale: 0.85 },
      { scale: 1, duration: 0.3, ease: 'back.out(2)' },
    );
  }, [turn]);

  return (
    <section className="plaque-3d rounded-2xl p-4">
      {/* Silas Vance Medallion + Dialogue */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/50 bg-[radial-gradient(circle_at_30%_25%,#991b1b_0%,#450a0a_65%,#1c0606_100%)] font-display text-sm font-extrabold tracking-wider text-amber-200 shadow-[0_3px_0_#2a0404,0_6px_12px_rgba(0,0,0,0.45)]">
          SV
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="type-broadsheet font-display text-xs uppercase tracking-wider text-red-900 dark:text-amber-200">
              Silas Vance · Riverboat Sharper
            </span>
            <span
              ref={turnBadgeRef}
              className="type-tabular rounded border border-amber-700/30 bg-amber-100/80 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-950 dark:border-amber-500/25 dark:bg-stone-800/90 dark:text-amber-200"
            >
              Turn {turn}
            </span>
          </div>
          <p
            ref={quoteRef}
            aria-live="polite"
            className="mt-1.5 font-serif text-[13px] italic leading-relaxed text-stone-800 dark:text-stone-200"
          >
            &ldquo;{dialogue}&rdquo;
          </p>
        </div>
      </div>

      {/* Table Roll Log — no spoiler icons so players must genuinely watch patterns & dice */}
      <div className="mt-3.5 border-t border-amber-900/15 pt-3 dark:border-amber-500/15">
        <div className="mb-2 flex items-center justify-between font-sans text-[10px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
          <span className="inline-flex items-center gap-1">
            <History className="h-3 w-3" />
            Table Roll Log
          </span>
          <span className="type-tabular font-mono">
            {flaggedRollIds.length} flagged · {rollHistory.length} rolls
          </span>
        </div>

        {rollHistory.length === 0 ? (
          <p className="py-2 text-center font-serif text-xs italic text-stone-600 dark:text-stone-400">
            Watch the rolls closely once the stakes rise…
          </p>
        ) : (
          <ul aria-label="Table roll log" className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
            {rollHistory.map((item) => {
              const isDealer = item.actor === 'dealer';
              const isFlagged = flaggedRollIds.includes(item.id);
              return (
                <li
                  key={item.id}
                  className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors ${
                    isFlagged
                      ? 'border-red-500/50 bg-red-50/90 dark:border-red-500/45 dark:bg-red-950/35'
                      : 'border-amber-900/15 bg-white/70 dark:border-stone-800 dark:bg-[#110b08]'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="type-tabular font-mono text-[10px] text-stone-500">
                      T{item.turn}
                    </span>
                    <span
                      className={`font-sans font-semibold ${
                        isDealer
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {isDealer ? 'Silas' : 'You'}
                    </span>
                    {item.moveSummary && (
                      <span className="truncate font-serif text-xs text-stone-600 dark:text-stone-400">
                        · {item.moveSummary}
                      </span>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onToggleFlag(item.id)}
                      aria-pressed={isFlagged}
                      aria-label={`Mark turn ${item.turn} roll ${item.roll} suspicious`}
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-red-500 ${
                        isFlagged
                          ? 'border-red-500/75 bg-red-600/20 text-red-700 dark:text-red-300'
                          : 'border-amber-800/30 bg-amber-50/80 text-stone-700 hover:border-red-500/60 hover:text-red-700 dark:border-amber-500/25 dark:bg-stone-900 dark:text-stone-300 dark:hover:border-red-500/60 dark:hover:text-red-300'
                      }`}
                    >
                      <Flag className={`h-3 w-3 ${isFlagged ? 'fill-current' : ''}`} />
                      <span>{isFlagged ? 'Flagged' : 'Flag'}</span>
                    </button>
                    <span className="type-tabular inline-flex items-center rounded border border-amber-800/20 bg-amber-100/80 px-1.5 py-0.5 font-mono text-[11px] font-bold text-stone-900 dark:border-amber-500/20 dark:bg-stone-800 dark:text-amber-200">
                      {item.roll}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}