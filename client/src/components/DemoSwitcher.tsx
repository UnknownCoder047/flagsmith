import { SlidersHorizontal } from 'lucide-react';
import type { DemoIdentity, TellVariant } from '../types';

interface DemoSwitcherProps {
  visible: boolean;
  currentIdentity: string;
  anonId: string;
  activeVariant: TellVariant;
  disabled: boolean;
  onSwitchIdentity: (identity: string) => void;
}

const DEMO_OPTIONS: Array<{ id: DemoIdentity; label: string; hint: string }> = [
  { id: 'demo_silent', label: 'demo_silent', hint: 'silent_bias' },
  { id: 'demo_tells', label: 'demo_tells', hint: 'subtle_tells' },
];

export function DemoSwitcher({
  visible,
  currentIdentity,
  anonId,
  activeVariant,
  disabled,
  onSwitchIdentity,
}: DemoSwitcherProps) {
  if (!visible) return null;

  return (
    <aside
      aria-label="Demo identity switcher"
      className="plaque-3d fixed bottom-4 right-4 z-40 w-64 rounded-xl p-3 backdrop-blur-md"
    >
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-sans text-[11px] font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
          <SlidersHorizontal className="h-3 w-3" />
          Demo Mode
        </div>
        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-900 dark:text-amber-300">
          {activeVariant}
        </span>
      </div>

      <div className="space-y-1">
        {DEMO_OPTIONS.map((option) => {
          const isActive = currentIdentity === option.id;
          return (
            <button
              key={option.id}
              type="button"
              disabled={disabled}
              onClick={() => onSwitchIdentity(option.id)}
              className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors disabled:opacity-50 ${
                isActive
                  ? 'bg-amber-600 font-semibold text-stone-950 shadow-sm'
                  : 'text-stone-700 hover:bg-amber-500/10 dark:text-stone-300 dark:hover:bg-stone-800/80'
              }`}
            >
              <span className="font-mono text-[11px]">{option.label}</span>
              <span
                className={`font-sans text-[10px] ${
                  isActive ? 'text-stone-900/80' : 'text-stone-500 dark:text-stone-500'
                }`}
              >
                {option.hint}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          disabled={disabled}
          onClick={() => onSwitchIdentity(anonId)}
          className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors disabled:opacity-50 ${
            currentIdentity === anonId
              ? 'bg-amber-600 font-semibold text-stone-950 shadow-sm'
              : 'text-stone-600 hover:bg-amber-500/10 dark:text-stone-400 dark:hover:bg-stone-800/80'
          }`}
        >
          <span className="font-mono text-[11px]">anon_id</span>
          <span className="font-sans text-[10px] opacity-75">real bucket</span>
        </button>
      </div>
    </aside>
  );
}
