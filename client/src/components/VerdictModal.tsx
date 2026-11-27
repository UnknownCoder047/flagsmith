import { Award, RotateCcw, ShieldAlert, Skull, Sparkles } from 'lucide-react';
import type { RigProof, VerdictType } from '../types';

interface VerdictModalProps {
  verdict: VerdictType | null;
  turn: number;
  proofLedger: RigProof[];
  dealerDialogue: string;
  onPlayAgain: () => void;
}

const VERDICT_META: Record<
  VerdictType,
  {
    title: string;
    subtitle: string;
    badge: string;
    accentClass: string;
    icon: typeof Award;
  }
> = {
  caught: {
    title: 'Sharper Exposed — Instant Victory!',
    subtitle: 'You caught Silas Vance sliding weighted bones onto the table.',
    badge: 'Cheat Caught',
    accentClass:
      'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
    icon: Award,
  },
  player_won: {
    title: 'Gold Vault Cleared — Victory!',
    subtitle: 'Even against loaded dice, you got both riders into the Vault first.',
    badge: 'Board Victory',
    accentClass:
      'border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    icon: Sparkles,
  },
  false_accusation: {
    title: 'Bad Call — Instant Defeat',
    subtitle: 'You accused a clean table before enough rigged rolls were on the books.',
    badge: 'False Accusation',
    accentClass:
      'border-amber-600/40 bg-amber-500/10 text-amber-800 dark:text-amber-300',
    icon: ShieldAlert,
  },
  dealer_won: {
    title: 'Silas Took the Pot',
    subtitle: 'Silas reached the Gold Vault before you exposed his loaded dice.',
    badge: 'Never Caught',
    accentClass: 'border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300',
    icon: Skull,
  },
};

export function VerdictModal({
  verdict,
  turn,
  proofLedger,
  dealerDialogue,
  onPlayAgain,
}: VerdictModalProps) {
  if (!verdict) return null;

  const meta = VERDICT_META[verdict];
  const Icon = meta.icon;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="verdict-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-amber-500/35 bg-stone-50 shadow-2xl dark:bg-[#17110e]">
        <div className="border-b border-amber-900/15 bg-gradient-to-r from-amber-500/15 via-transparent to-red-900/15 p-5 dark:border-amber-500/15">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${meta.accentClass}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {meta.badge}
            </span>
            <span className="font-mono text-xs text-stone-500 dark:text-stone-400">
              Ended on Turn {turn}
            </span>
          </div>
          <h2
            id="verdict-title"
            className="mt-3 font-display text-xl font-bold text-stone-900 dark:text-amber-100"
          >
            {meta.title}
          </h2>
          <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">
            {meta.subtitle}
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-stone-200 bg-white p-3 text-xs italic text-stone-700 dark:border-stone-800 dark:bg-[#110c0a] dark:text-stone-300">
            <span className="font-semibold not-italic text-red-700 dark:text-amber-300">
              Silas Vance:{' '}
            </span>
            &ldquo;{dealerDialogue}&rdquo;
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-stone-500 dark:text-stone-400">
              <span>Loaded Dice Proof Ledger</span>
              <span className="font-mono">
                {proofLedger.length} rigged {proofLedger.length === 1 ? 'roll' : 'rolls'}
              </span>
            </div>

            {proofLedger.length === 0 ? (
              <div className="rounded-xl border border-stone-200 bg-stone-100/80 p-3 text-xs text-stone-600 dark:border-stone-800 dark:bg-stone-900/50 dark:text-stone-400">
                No rigged rolls had happened yet! Silas plays completely straight during
                the opening 3 turns—wait until you spot suspicious rolls before calling
                him out.
              </div>
            ) : (
              <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                {proofLedger.map((proof, idx) => (
                  <li
                    key={`${proof.turn}-${proof.actor}-${idx}`}
                    className="rounded-xl border border-amber-700/20 bg-amber-50/70 px-3 py-2 text-xs dark:border-amber-500/20 dark:bg-amber-950/25"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-amber-900 dark:text-amber-300">
                        Turn {proof.turn} · Roll {proof.roll}
                      </span>
                      <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-red-700 dark:text-red-300">
                        {proof.odds}
                      </span>
                    </div>
                    <p className="mt-1 text-stone-700 dark:text-stone-300">
                      {proof.reason}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {verdict === 'dealer_won' && proofLedger.length > 0 && (
              <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-300">
                Silas rigged {proofLedger.length} rolls against you—watch the table closer
                and call him out next hand!
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onPlayAgain}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-4 py-3 text-sm font-bold text-stone-950 shadow-md transition-all hover:from-amber-500 hover:to-amber-400 active:scale-[0.99]"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Play Again</span>
          </button>
        </div>
      </div>
    </div>
  );
}
