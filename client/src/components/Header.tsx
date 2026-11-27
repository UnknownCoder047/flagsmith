import { BookOpen, Moon, Star, Sun, Volume2, VolumeX } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  muted: boolean;
  onToggleTheme: () => void;
  onToggleMute: () => void;
  onOpenRules: () => void;
}

export function Header({
  theme,
  muted,
  onToggleTheme,
  onToggleMute,
  onOpenRules,
}: HeaderProps) {
  return (
    <header className="border-b border-amber-900/25 bg-[#f7eedc]/90 shadow-sm backdrop-blur-md dark:border-amber-500/20 dark:bg-[#130c09]/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-400/50 bg-gradient-to-b from-amber-500 to-amber-800 text-amber-50 shadow-[0_3px_0_#451a03,0_4px_10px_rgba(0,0,0,0.35)]">
            <Star className="h-4 w-4 fill-amber-200/40" />
          </div>
          <div className="flex items-baseline gap-3">
            <span className="type-broadsheet font-display text-lg uppercase tracking-wider text-stone-950 dark:text-amber-100">
              Deadwood Dice
            </span>
            <span className="hidden font-serif text-xs italic text-stone-600 sm:inline dark:text-stone-400">
              Saloon Stakes · Catch the Sharper&apos;s Loaded Bones
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenRules}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-800/30 border-b-2 bg-amber-100/80 px-3 py-1.5 text-xs text-amber-950 transition-all hover:bg-amber-200/80 active:translate-y-px dark:border-amber-500/30 dark:bg-amber-950/45 dark:text-amber-200 dark:hover:bg-amber-900/55"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="type-interactive">Full Rules</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={muted ? 'Unmute saloon audio' : 'Mute saloon audio'}
            title={muted ? 'Unmute audio' : 'Mute audio'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-900/25 border-b-2 bg-white/70 text-stone-700 transition-colors hover:bg-amber-100 hover:text-stone-950 dark:border-amber-500/20 dark:bg-[#1e1510] dark:text-stone-300 dark:hover:bg-[#2a1d16] dark:hover:text-amber-200"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle color theme"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-900/25 border-b-2 bg-white/70 text-stone-700 transition-colors hover:bg-amber-100 hover:text-stone-950 dark:border-amber-500/20 dark:bg-[#1e1510] dark:text-stone-300 dark:hover:bg-[#2a1d16] dark:hover:text-amber-200"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
