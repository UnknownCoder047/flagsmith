import { useEffect, useRef } from 'react';
import gsap from 'gsap';
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

function renderPips(pips: number, muted = false) {
  if (pips === 0) {
    return (
      <span
        className={`h-1 w-4 rounded-full ${
          muted ? 'bg-amber-950/20' : 'bg-amber-950/25 shadow-inner'
        }`}
      />
    );
  }
  return Array.from({ length: pips }, (_, idx) => (
    <span
      key={idx}
      className={`h-2.5 w-2.5 rounded-full ${
        muted
          ? 'bg-stone-800/40'
          : 'bg-gradient-to-br from-stone-800 to-stone-950 shadow-[inset_0_1px_2px_rgba(0,0,0,0.85),0_1px_0_rgba(255,255,255,0.45)] ring-1 ring-amber-900/40'
      }`}
    />
  ));
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
  const trayRef = useRef<HTMLDivElement | null>(null);
  const dieRefs = useRef<Array<HTMLDivElement | null>>([]);
  const shadowRefs = useRef<Array<HTMLDivElement | null>>([]);
  const rollBadgeRef = useRef<HTMLSpanElement | null>(null);
  const wasRollingRef = useRef(false);

  // GSAP 3D physics roll + weighted center-bone hesitation tell
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const ctx = gsap.context(() => {
      if (isRolling) {
        wasRollingRef.current = true;
        dieRefs.current.forEach((die, idx) => {
          if (!die) return;
          gsap.killTweensOf(die);
          if (prefersReduced) {
            gsap.to(die, { y: -4, duration: 0.2, yoyo: true, repeat: 1 });
            return;
          }
          const spinX = 360 * (2 + idx) + (idx === 1 ? 180 : 0);
          const spinY = 360 * (idx % 2 === 0 ? 2 : -2);
          const spinZ = (idx - 1) * 95 + 140;

          const tl = gsap.timeline({ delay: idx * 0.045 });
          tl.fromTo(
            die,
            {
              y: 0,
              z: 0,
              rotationX: 12,
              rotationY: -8 + idx * 8,
              rotationZ: 0,
            },
            {
              y: -26 - idx * 3,
              z: 42,
              rotationX: spinX * 0.55,
              rotationY: spinY * 0.55,
              rotationZ: spinZ * 0.5,
              duration: 0.24,
              ease: 'power2.out',
            },
          ).to(die, {
            y: 2,
            z: 4,
            rotationX: spinX + 14,
            rotationY: spinY + (idx - 1) * 10,
            rotationZ: spinZ,
            duration: 0.24,
            ease: 'bounce.out',
          });
        });

        shadowRefs.current.forEach((shadow, idx) => {
          if (!shadow || prefersReduced) return;
          gsap.killTweensOf(shadow);
          const tl = gsap.timeline({ delay: idx * 0.045 });
          tl.to(shadow, {
            scale: 0.65,
            opacity: 0.3,
            duration: 0.24,
            ease: 'power2.out',
          }).to(shadow, {
            scale: 1.05,
            opacity: 0.72,
            duration: 0.24,
            ease: 'bounce.out',
          });
        });
      } else {
        // Settle onto readable resting 3D angle
        dieRefs.current.forEach((die, idx) => {
          if (!die) return;
          gsap.killTweensOf(die);
          const restRotX = 14;
          const restRotY = (idx - 1) * 9;
          const restRotZ = (idx - 1) * 2.5;

          if (prefersReduced) {
            gsap.set(die, {
              y: 0,
              z: 0,
              rotationX: restRotX,
              rotationY: restRotY,
              rotationZ: restRotZ,
            });
            return;
          }

          if (activeTell && idx === 1) {
            // Uncanny weighted hesitation double-rock on the center loaded bone
            const tellTl = gsap.timeline();
            tellTl
              .to(die, {
                y: -4,
                z: 10,
                rotationX: 26,
                rotationY: 6,
                rotationZ: 11,
                duration: 0.14,
                ease: 'power2.out',
              })
              .to(die, {
                y: 0,
                z: 2,
                rotationX: 8,
                rotationY: -5,
                rotationZ: -7.5,
                duration: 0.16,
                ease: 'power1.inOut',
              })
              .to(die, {
                y: -1.5,
                z: 4,
                rotationX: 18,
                rotationY: 3,
                rotationZ: 4,
                duration: 0.15,
                ease: 'power1.inOut',
              })
              .to(die, {
                y: 0,
                z: 0,
                rotationX: restRotX,
                rotationY: restRotY,
                rotationZ: restRotZ,
                duration: 0.22,
                ease: 'elastic.out(1, 0.5)',
              });
          } else if (wasRollingRef.current) {
            gsap.to(die, {
              y: 0,
              z: 0,
              rotationX: restRotX,
              rotationY: restRotY,
              rotationZ: restRotZ,
              duration: 0.34,
              ease: 'back.out(1.7)',
            });
          } else {
            gsap.set(die, {
              y: 0,
              z: 0,
              rotationX: restRotX,
              rotationY: restRotY,
              rotationZ: restRotZ,
            });
          }
        });

        shadowRefs.current.forEach((shadow) => {
          if (!shadow) return;
          gsap.to(shadow, { scale: 1, opacity: 0.65, duration: 0.28, ease: 'power2.out' });
        });

        wasRollingRef.current = false;
      }
    }, trayRef);

    return () => ctx.revert();
  }, [isRolling, activeTell, dice]);

  // Pop the Martian Mono roll total badge when a roll lands
  useEffect(() => {
    if (!isRolling && currentRoll !== null && rollBadgeRef.current) {
      gsap.fromTo(
        rollBadgeRef.current,
        { scale: 0.72, y: -4 },
        { scale: 1, y: 0, duration: 0.36, ease: 'back.out(2.2)' },
      );
    }
  }, [isRolling, currentRoll]);

  const handleDieHover = (idx: number, entering: boolean) => {
    const die = dieRefs.current[idx];
    if (!die || isRolling) return;
    gsap.to(die, {
      y: entering ? -6 : 0,
      z: entering ? 14 : 0,
      rotationX: entering ? 24 : 14,
      rotationY: entering ? (idx - 1) * 14 : (idx - 1) * 9,
      duration: 0.26,
      ease: 'power2.out',
    });
  };

  return (
    <section ref={trayRef} className="plaque-3d rounded-2xl p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.75)]" />
          <span className="type-broadsheet font-display text-sm uppercase tracking-[0.14em] text-amber-900 dark:text-amber-200">
            Saloon Bones
          </span>
        </div>
        {currentRoll !== null && !isRolling && (
          <span
            ref={rollBadgeRef}
            className="type-tabular rounded-md border border-amber-600/40 bg-amber-100/90 px-2.5 py-0.5 font-mono text-xs text-amber-950 shadow-sm dark:border-amber-400/35 dark:bg-amber-950/75 dark:text-amber-200"
          >
            TOTAL · {currentRoll}
          </span>
        )}
      </div>

      {/* Recessed Green Baize Felt Dice Pit */}
      <div className="baize-well relative flex min-h-[118px] items-center justify-center gap-6 overflow-hidden rounded-xl border border-amber-900/40 px-4 py-5">
        {/* Subtle brass pit rim corner rivets */}
        <span className="pointer-events-none absolute left-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-300/45" />
        <span className="pointer-events-none absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-amber-300/45" />
        <span className="pointer-events-none absolute bottom-2 left-2 h-1.5 w-1.5 rounded-full bg-amber-300/45" />
        <span className="pointer-events-none absolute bottom-2 right-2 h-1.5 w-1.5 rounded-full bg-amber-300/45" />

        {dice.map((pips, index) => {
          const isCenterTell = activeTell && !isRolling && index === 1;
          const altSidePips = (pips + 1) % 3;
          const backPips = (pips + 2) % 3;

          return (
            <div
              key={index}
              onMouseEnter={() => handleDieHover(index, true)}
              onMouseLeave={() => handleDieHover(index, false)}
              className="die-scene relative flex flex-col items-center cursor-pointer"
            >
              <div
                ref={(el) => {
                  dieRefs.current[index] = el;
                }}
                className="die-prism"
              >
                {/* Front Face (active rolled pips) */}
                <div
                  className={`die-face die-face-front flex flex-col items-center justify-evenly overflow-hidden border bg-gradient-to-b from-[#fffaf0] via-[#f0dfc2] to-[#d9be92] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] ${
                    isCenterTell
                      ? 'border-amber-400 ring-1 ring-amber-300/80 shadow-[0_0_18px_rgba(243,207,122,0.5)]'
                      : 'border-amber-900/45'
                  }`}
                >
                  {isCenterTell && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 left-0 w-3/4 bg-gradient-to-r from-transparent via-white/95 to-transparent animate-brass-glint"
                    />
                  )}
                  {renderPips(pips)}
                </div>

                {/* Back Face */}
                <div className="die-face die-face-back flex flex-col items-center justify-evenly border border-amber-950/40 bg-gradient-to-b from-[#dfcaa5] to-[#b89a6a]">
                  {renderPips(backPips, true)}
                </div>

                {/* Right Thickness Side */}
                <div className="die-face die-face-right flex items-center justify-center border border-amber-950/45 bg-gradient-to-b from-[#e4d0ae] to-[#b59460]">
                  <span className="h-4 w-0.5 rounded-full bg-amber-950/20" />
                </div>

                {/* Left Thickness Side */}
                <div className="die-face die-face-left flex items-center justify-center border border-amber-950/45 bg-gradient-to-b from-[#d8c19a] to-[#a98653]">
                  <span className="h-4 w-0.5 rounded-full bg-amber-950/20" />
                </div>

                {/* Top Bevel Face */}
                <div className="die-face die-face-top flex items-center justify-center border border-amber-900/35 bg-[#f5e7ce]">
                  {renderPips(altSidePips, true)}
                </div>

                {/* Bottom Bevel Face */}
                <div className="die-face die-face-bottom border border-amber-950/50 bg-[#9b7a48]" />
              </div>

              {/* Cast Shadow on Baize Felt */}
              <div
                ref={(el) => {
                  shadowRefs.current[index] = el;
                }}
                aria-hidden="true"
                className="mt-3 h-2 w-11 rounded-full bg-black/60 blur-[3px]"
              />
            </div>
          );
        })}
      </div>

      <p className="mt-3 text-center font-serif text-sm italic leading-snug text-stone-700 dark:text-stone-300">
        {statusBanner}
      </p>

      {lastCaptureFlash && (
        <div className="mt-2 rounded-lg border border-red-500/40 bg-red-600/15 px-3 py-1.5 text-center font-sans text-xs font-semibold text-red-800 dark:text-red-200">
          {lastCaptureFlash}
        </div>
      )}

      <button
        type="button"
        disabled={!canRoll}
        onClick={onRoll}
        className={`group mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm transition-all ${
          canRoll
            ? 'border border-amber-300/60 border-b-4 border-b-amber-900 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 text-stone-950 shadow-[0_8px_18px_-6px_rgba(217,119,6,0.65)] hover:from-amber-300 hover:to-amber-500 active:translate-y-0.5 active:border-b-2'
            : 'cursor-not-allowed border border-stone-300 bg-stone-200/80 text-stone-500 dark:border-stone-800 dark:bg-stone-900/80 dark:text-stone-500'
        }`}
      >
        <Dices className={`h-4 w-4 ${isRolling ? 'animate-spin' : ''}`} />
        <span className="type-interactive">
          {isRolling
            ? 'Rolling Bones…'
            : phase === 'player_move'
              ? 'Select Highlighted Rider'
              : phase === 'dealer_turn'
                ? "Silas's Turn…"
                : 'Roll the Bones (Space)'}
        </span>
      </button>
    </section>
  );
}
