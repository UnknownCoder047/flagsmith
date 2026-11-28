import { useState } from 'react';
import { Activity, Cloud, CloudOff, Eye, EyeOff, RotateCcw, X } from 'lucide-react';
import type { FlagsmithStateSnapshot } from '../lib/flagsmith';
import type { MatchPhase } from '../types';

interface ExperimentInspectorProps {
  open: boolean;
  snapshot: FlagsmithStateSnapshot;
  turn: number;
  phase: MatchPhase;
  riggedCount: number;
  onClose: () => void;
  onClearLog: () => void;
}

const EVENT_BADGE_STYLES: Record<string, string> = {
  exposure:
    'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/70 dark:bg-blue-950/60 dark:text-blue-300',
  cheat_caught:
    'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/70 dark:bg-emerald-950/60 dark:text-emerald-300',
  play_again_clicked:
    'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/70 dark:bg-violet-950/60 dark:text-violet-300',
  false_accusation:
    'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/70 dark:bg-amber-950/60 dark:text-amber-300',
  match_completed:
    'border-stone-300 bg-stone-100 text-stone-700 dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300',
  match_abandoned:
    'border-red-200 bg-red-50 text-red-700 dark:border-red-900/70 dark:bg-red-950/60 dark:text-red-300',
};

export function ExperimentInspector({
  open,
  snapshot,
  turn,
  phase,
  riggedCount,
  onClose,
  onClearLog,
}: ExperimentInspectorProps) {
  const [revealRigCount, setRevealRigCount] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-amber-800/30 bg-[#f6ebd7]/95 shadow-2xl backdrop-blur dark:border-amber-500/25 dark:bg-[#120b08]/95">
      <div className="mx-auto max-w-6xl px-4 py-3.5 sm:px-6">
        <div className="mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Activity className="h-4 w-4 text-amber-700 dark:text-amber-400" />
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-amber-100">
              Experiment Inspector
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-sans text-[10px] font-medium ${
                snapshot.connectedToCloud
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300'
                  : 'border-stone-300 bg-stone-100 text-stone-600 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400'
              }`}
            >
              {snapshot.connectedToCloud ? (
                <>
                  <Cloud className="h-3 w-3" />
                  Flagsmith Cloud
                </>
              ) : (
                <>
                  <CloudOff className="h-3 w-3" />
                  Local Fallback (set VITE_FLAGSMITH_ENV_KEY)
                </>
              )}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {snapshot.events.length > 0 && (
              <button
                type="button"
                onClick={onClearLog}
                className="inline-flex items-center gap-1 rounded px-2 py-1 font-sans text-[11px] text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-200"
              >
                <RotateCcw className="h-3 w-3" />
                Clear log
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Experiment Inspector"
              className="rounded p-1 text-stone-500 transition-colors hover:bg-stone-200 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-stone-200"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-12">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:col-span-6">
            <div className="rounded-lg border border-amber-900/20 bg-white/75 p-2.5 dark:border-stone-800 dark:bg-stone-900/70">
              <div className="font-sans text-[10px] uppercase tracking-wider text-stone-500">
                Identity
              </div>
              <div
                title={snapshot.identity}
                className="mt-1 truncate font-mono text-xs font-medium text-stone-900 dark:text-stone-200"
              >
                {snapshot.identity || '—'}
              </div>
            </div>

            <div className="rounded-lg border border-amber-900/20 bg-white/75 p-2.5 dark:border-stone-800 dark:bg-stone-900/70">
              <div className="font-sans text-[10px] uppercase tracking-wider text-stone-500">
                sharper_tell_mode
              </div>
              <div className="mt-1 truncate font-mono text-xs font-semibold text-amber-800 dark:text-amber-300">
                {snapshot.variant}
              </div>
            </div>

            <div className="rounded-lg border border-amber-900/20 bg-white/75 p-2.5 dark:border-stone-800 dark:bg-stone-900/70">
              <div className="font-sans text-[10px] uppercase tracking-wider text-stone-500">
                Match State
              </div>
              <div className="type-tabular mt-1 truncate font-mono text-xs font-medium text-stone-900 dark:text-stone-200">
                T{turn} · {phase}
              </div>
            </div>

            <div className="rounded-lg border border-amber-900/20 bg-white/75 p-2.5 dark:border-stone-800 dark:bg-stone-900/70">
              <div className="flex items-center justify-between font-sans text-[10px] uppercase tracking-wider text-stone-500">
                <span>Rigged Rolls</span>
                <button
                  type="button"
                  onClick={() => setRevealRigCount((prev) => !prev)}
                  title={revealRigCount ? 'Hide spoiler' : 'Reveal spoiler'}
                  className="text-stone-400 hover:text-amber-500"
                >
                  {revealRigCount ? (
                    <EyeOff className="h-3 w-3" />
                  ) : (
                    <Eye className="h-3 w-3" />
                  )}
                </button>
              </div>
              <div className="type-tabular mt-1 font-mono text-xs font-semibold text-stone-900 dark:text-stone-200">
                {revealRigCount ? `${riggedCount} logged` : 'Hidden'}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-amber-900/20 bg-white/75 p-2.5 md:col-span-6 dark:border-stone-800 dark:bg-stone-900/70">
            <div className="mb-1.5 flex items-center justify-between font-sans text-[10px] uppercase tracking-wider text-stone-500">
              <span>Live Experiment Events ({snapshot.events.length})</span>
              <span className="hidden sm:inline">
                exposure · cheat_caught · play_again · guardrails
              </span>
            </div>

            {snapshot.events.length === 0 ? (
              <p className="py-2 font-mono text-[11px] text-stone-500">
                No events fired yet. Click &quot;Pull Up a Chair · Deal In&quot; to record
                exposure.
              </p>
            ) : (
              <ul className="max-h-24 space-y-1 overflow-y-auto pr-1">
                {snapshot.events.map((evt) => (
                  <li
                    key={evt.id}
                    className="flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-stone-500">{evt.timestamp}</span>
                      <span
                        className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${
                          EVENT_BADGE_STYLES[evt.event] || ''
                        }`}
                      >
                        {evt.event}
                      </span>
                      {evt.detail && (
                        <span className="text-stone-700 dark:text-stone-400">
                          {evt.detail}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-stone-500">
                      {evt.sentToFlagsmith ? 'cloud' : 'local'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
