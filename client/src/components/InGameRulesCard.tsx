import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronUp, Dices, Gavel, Shield, Vault } from 'lucide-react';

export function InGameRulesCard() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <section className="plaque-3d mx-auto mt-4 w-full max-w-[515px] rounded-2xl p-3.5">
      <button
        type="button"
        onClick={() => setCollapsed((prev) => !prev)}
        className="group flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-amber-700 dark:text-amber-400" />
          <span className="type-broadsheet font-display text-xs uppercase tracking-wider text-stone-950 dark:text-amber-200">
            Saloon Rules — Quick Guide
          </span>
        </div>
        <span className="type-interactive inline-flex items-center gap-1 font-mono text-[11px] text-stone-600 dark:text-stone-400">
          {collapsed ? 'Show' : 'Hide'}
          {collapsed ? (
            <ChevronDown className="h-3.5 w-3.5" />
          ) : (
            <ChevronUp className="h-3.5 w-3.5" />
          )}
        </span>
      </button>

      {!collapsed && (
        <div className="mt-3 grid gap-2.5 border-t border-amber-900/15 pt-3 font-serif text-xs leading-relaxed text-stone-700 sm:grid-cols-2 dark:border-amber-500/15 dark:text-stone-300">
          <div className="flex items-start gap-2">
            <Dices className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-700 dark:text-amber-400" />
            <div>
              <span className="font-sans text-[11px] font-bold text-stone-950 dark:text-amber-100">
                1. Roll &amp; Ride Clockwise:
              </span>{' '}
              Roll 1–6 and click any glowing rider (even from Your Corral) to advance.
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <div>
              <span className="font-sans text-[11px] font-bold text-stone-950 dark:text-amber-100">
                2. Knockbacks &amp; ★ Safe:
              </span>{' '}
              Land on Silas to send him back to his Corral. ★ Outposts protect both sides.
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Vault className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-sans text-[11px] font-bold text-stone-950 dark:text-amber-100">
                3. Enter the Gold Vault:
              </span>{' '}
              Ride up your green lane and land inside the center Vault on an exact roll.
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Gavel className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-700 dark:text-red-400" />
            <div>
              <span className="font-sans text-[11px] font-bold text-stone-950 dark:text-amber-100">
                4. Catch the Cheat:
              </span>{' '}
              Turns 1–3 are honest. Call out loaded dice after <strong>2+ rigged rolls</strong> to win instantly—accuse too early and you lose!
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
