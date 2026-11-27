import { History } from 'lucide-react';
import type { RollRecord } from '../types';

interface DealerBannerProps {
  dialogue: string;
  rollHistory: RollRecord[];
  turn: number;
}

export function DealerBanner({ dialogue, rollHistory, turn }: DealerBannerProps) {
  return (
    <section className="rounded-2xl border border-amber-800/25 bg-white/90 p-4 shadow-md dark:border-amber-500/20 dark:bg-[#1a130f]/95">
      {/* Silas Vance Portrait + Dialogue */}
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-gradient-to-br from-red-900 via-stone-900 to-stone-950 font-display text-sm font-bold tracking-wider text-amber-300 shadow-inner">
          SV
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display text-xs font-bold uppercase tracking-wider text-red-800 dark:text-amber-300">
              Silas Vance · Riverboat Sharper
            </span>
            <span className="rounded bg-stone-200/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-stone-600 dark:bg-stone-800 dark:text-stone-300">
              Turn {turn}
            </span>
          </div>
          <p className="mt-1 text-xs italic leading-relaxed text-stone-700 dark:text-stone-300">
            &ldquo;{dialogue}&rdquo;
          </p>
        </div>
      </div>

      {/* Table Roll Log — no spoiler icons so players must genuinely watch patterns & dice */}
      <div className="mt-3.5 border-t border-stone-200/80 pt-3 dark:border-stone-800/80">
        <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
          <span className="inline-flex items-center gap-1">
            <History className="h-3 w-3" />
            Table Roll Log
          </span>
          <span>{rollHistory.length} rolls</span>
        </div>

        {rollHistory.length === 0 ? (
          <p className="py-2 text-center font-mono text-[11px] text-stone-400 dark:text-stone-500">
            Watch the rolls closely once the stakes rise…
          </p>
        ) : (
          <ul className="max-h-40 space-y-1.5 overflow-y-auto pr-1">
            {rollHistory.map((item) => {
              const isDealer = item.actor === 'dealer';
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-2 rounded-lg border border-stone-200/70 bg-stone-50 px-2.5 py-1.5 text-[11px] dark:border-stone-800/80 dark:bg-[#120d0a]"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-mono text-[10px] text-stone-400">
                      T{item.turn}
                    </span>
                    <span
                      className={`font-semibold ${
                        isDealer
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {isDealer ? 'Silas' : 'You'}
                    </span>
                    {item.moveSummary && (
                      <span className="truncate text-stone-500 dark:text-stone-400">
                        · {item.moveSummary}
                      </span>
                    )}
                  </div>
                  <span className="inline-flex shrink-0 items-center rounded bg-stone-200/80 px-1.5 py-0.5 font-mono text-[11px] font-bold text-stone-800 dark:bg-stone-800 dark:text-amber-200">
                    {item.roll}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
