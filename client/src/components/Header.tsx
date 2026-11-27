import { BookOpen, Moon, Star, Sun } from 'lucide-react';

interface HeaderProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenRules: () => void;
}

export function Header({ theme, onToggleTheme, onOpenRules }: HeaderProps) {
  return (
    <header className="border-b border-amber-900/20 bg-stone-50/90 backdrop-blur-sm dark:border-amber-500/15 dark:bg-[#120d0a]/90">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/40 bg-gradient-to-br from-amber-600 to-amber-900 text-amber-100 shadow-sm">
            <Star className="h-4 w-4 fill-amber-200/30" />
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="font-display text-base font-bold tracking-wider text-stone-900 dark:text-amber-100">
              DEADWOOD DICE
            </span>
            <span className="hidden text-xs text-stone-500 sm:inline dark:text-stone-400">
              Saloon Stakes · Catch the Sharper&apos;s Loaded Bones
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenRules}
            className="inline-flex items-center gap-1.5 rounded-md border border-amber-700/25 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-100 dark:border-amber-500/25 dark:bg-amber-950/40 dark:text-amber-200 dark:hover:bg-amber-900/50"
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span>Full Rules</span>
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle color theme"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-stone-300 text-stone-600 transition-colors hover:bg-stone-200 hover:text-stone-900 dark:border-stone-800 dark:text-stone-400 dark:hover:bg-stone-900 dark:hover:text-amber-100"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
