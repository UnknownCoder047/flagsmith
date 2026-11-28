import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Dices, Gavel, Shield, Sparkles, X } from 'lucide-react';
import { prefersReducedMotion } from '../lib/motion';

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

export function RulesModal({ open, onClose }: RulesModalProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open || !cardRef.current) return;
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      cardRef.current,
      { opacity: 0, y: 20, scale: 0.94, rotateX: 10 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        rotateX: 0,
        duration: 0.34,
        ease: 'back.out(1.4)',
      },
    );
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rules-title"
      className="scene-3d fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
    >
      <div
        ref={cardRef}
        className="plaque-3d w-full max-w-md overflow-hidden rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-amber-900/20 px-5 py-4 dark:border-amber-500/20">
          <h2
            id="rules-title"
            className="type-broadsheet font-display text-lg uppercase tracking-wider text-stone-950 dark:text-amber-100"
          >
            How to Play Deadwood Dice
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close rules"
            className="rounded-md p-1 text-stone-500 transition-colors hover:bg-amber-900/10 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-amber-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5 p-5 text-xs leading-relaxed text-stone-700 dark:text-stone-300">
          <div className="flex items-start gap-3">
            <Dices className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <div>
              <p className="font-sans font-bold text-stone-950 dark:text-amber-100">
                1. Race 2 Riders to the Gold Vault
              </p>
              <p className="mt-0.5 font-serif text-[13px] text-stone-600 dark:text-stone-400">
                Roll the 3 ivory bones (total 1–6) and move clockwise around the outer
                track, then up your green home lane into the center Gold Vault on an exact
                roll.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <div>
              <p className="font-sans font-bold text-stone-950 dark:text-amber-100">
                2. Knockbacks &amp; ★ Safe Outposts
              </p>
              <p className="mt-0.5 font-serif text-[13px] text-stone-600 dark:text-stone-400">
                Landing on Silas&apos;s rider knocks it back to his Corral—except on ★
                Safe Outpost squares, where both riders are protected.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-sans font-bold text-stone-950 dark:text-amber-100">
                3. Watch for Silas&apos;s Loaded Dice
              </p>
              <p className="mt-0.5 font-serif text-[13px] text-stone-600 dark:text-stone-400">
                Turns 1–3 are 100% honest. Once the pot heats up, Silas starts quietly
                nudging the dice—slipping out of danger, landing exact knockbacks, or
                leaving you 1 tile short.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Gavel className="mt-0.5 h-4 w-4 shrink-0 text-red-700 dark:text-red-400" />
            <div>
              <p className="font-sans font-bold text-stone-950 dark:text-amber-100">
                4. Call Out Loaded Dice to Win Instantly
              </p>
              <p className="mt-0.5 font-serif text-[13px] text-stone-600 dark:text-stone-400">
                Call out Silas once at least <strong>2 rigged rolls</strong> have happened
                for an instant win. Call too early (0–1 rigged rolls) and you forfeit the
                pot!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-2 w-full rounded-xl border border-amber-300/60 border-b-4 border-b-amber-900 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 py-2.5 text-xs text-stone-950 shadow-md transition-all hover:from-amber-300 hover:to-amber-500 active:translate-y-0.5 active:border-b-2"
          >
            <span className="type-interactive">Got it — Back to the Table</span>
          </button>
        </div>
      </div>
    </div>
  );
}
