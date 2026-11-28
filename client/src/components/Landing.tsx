import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Dices, Gavel, Shield, Star } from 'lucide-react';
import { prefersReducedMotion } from '../lib/motion';

function InteractiveTitle({ text }: { text: string }) {
  return (
    <span aria-label={text} className="inline-flex flex-wrap gap-x-3">
      {text.split(' ').map((word, wIdx) => (
        <span key={wIdx} className="inline-flex whitespace-nowrap">
          {Array.from(word).map((ch, cIdx) => (
            <span
              key={cIdx}
              className="glyph-pop cursor-default hover:text-amber-600 dark:hover:text-amber-300"
            >
              {ch}
            </span>
          ))}
        </span>
      ))}
    </span>
  );
}

export function Landing({ onStart }: { onStart: () => void }) {
  const landingRef = useRef<HTMLDivElement | null>(null);
  const specimenRef = useRef<HTMLDivElement | null>(null);
  const rotXToRef = useRef<((v: number) => void) | null>(null);
  const rotYToRef = useRef<((v: number) => void) | null>(null);

  // GSAP entrance & 3D specimen tilt on Landing view
  useEffect(() => {
    if (!landingRef.current) return;
    const prefersReduced = prefersReducedMotion();
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      gsap.from('.landing-stagger', {
        y: 18,
        opacity: 0,
        duration: 0.55,
        stagger: 0.08,
        ease: 'power3.out',
      });

      gsap.to('.hero-die-float', {
        y: -7,
        rotationZ: 4,
        duration: 2.2,
        stagger: 0.25,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
      });

      if (specimenRef.current) {
        gsap.set(specimenRef.current, { rotateX: 12, rotateY: -8 });
        rotXToRef.current = gsap.quickTo(specimenRef.current, 'rotationX', {
          duration: 0.45,
          ease: 'power2.out',
        });
        rotYToRef.current = gsap.quickTo(specimenRef.current, 'rotationY', {
          duration: 0.45,
          ease: 'power2.out',
        });
      }
    }, landingRef);

    return () => {
      rotXToRef.current = null;
      rotYToRef.current = null;
      ctx.revert();
    };
  }, []);

  const handleSpecimenMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rotXToRef.current || !rotYToRef.current) return;
    if (prefersReducedMotion()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    rotXToRef.current(12 - ny * 16);
    rotYToRef.current(-8 + nx * 20);
  };

  const handleSpecimenLeave = () => {
    if (!rotXToRef.current || !rotYToRef.current) return;
    rotXToRef.current(12);
    rotYToRef.current(-8);
  };

  return (
  <div
    ref={landingRef}
    className="mx-auto my-auto grid w-full max-w-5xl items-center gap-8 lg:grid-cols-12"
  >
    {/* Left: Frontier Broadsheet Masthead & Deal CTA */}
    <div className="lg:col-span-7">
      <div className="landing-stagger inline-flex items-center gap-2 rounded-md border border-amber-700/35 bg-amber-500/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-amber-900 dark:border-amber-400/30 dark:text-amber-300">
        <Star className="h-3 w-3 fill-amber-500/40" />
        <span>Deadwood Territory · Assay Table No. 4</span>
      </div>

      <h1 className="landing-stagger mt-4 font-display text-5xl leading-[0.95] tracking-tight text-stone-950 sm:text-6xl dark:text-amber-50">
        <InteractiveTitle text="DEADWOOD DICE" />
      </h1>

      <p className="landing-stagger mt-4 max-w-xl font-serif text-base leading-relaxed text-stone-700 sm:text-lg dark:text-stone-300">
        Sit across from riverboat sharper{' '}
        <strong className="font-semibold text-stone-950 dark:text-amber-200">
          Silas Vance
        </strong>{' '}
        for a tight frontier board duel. The table starts square—but sooner or later
        his ivory stick-bones start hiding lead.
      </p>

      {/* Stamped Assay Ledger Steps (replaces generic 3-column SaaS card grid) */}
      <div className="landing-stagger mt-6 divide-y divide-amber-900/15 rounded-xl border border-amber-900/25 bg-white/55 backdrop-blur-sm dark:divide-amber-500/15 dark:border-amber-500/20 dark:bg-[#17100c]/85">
        <div className="flex items-start gap-3.5 px-4 py-3">
          <span className="type-tabular mt-0.5 font-mono text-xs font-bold text-amber-800 dark:text-amber-400">
            01
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-amber-100">
              <Dices className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span>Race Two Riders</span>
            </div>
            <p className="mt-0.5 font-serif text-xs text-stone-600 dark:text-stone-300">
              Roll three carved bones (1–6) and circle clockwise into the raised Gold
              Vault.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 px-4 py-3">
          <span className="type-tabular mt-0.5 font-mono text-xs font-bold text-emerald-700 dark:text-emerald-400">
            02
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-amber-100">
              <Shield className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Watch the Table</span>
            </div>
            <p className="mt-0.5 font-serif text-xs text-stone-600 dark:text-stone-300">
              Spot uncanny escapes, exact knockbacks, or a faint hesitation in the
              center bone.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 px-4 py-3">
          <span className="type-tabular mt-0.5 font-mono text-xs font-bold text-red-700 dark:text-red-400">
            03
          </span>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 font-sans text-xs font-bold uppercase tracking-wider text-stone-900 dark:text-amber-100">
              <Gavel className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
              <span>Call the Cheat</span>
            </div>
            <p className="mt-0.5 font-serif text-xs text-stone-600 dark:text-stone-300">
              Flag the rolls that smell wrong in the log, then slam the table. Flag honest
              rolls and you fold.
            </p>
          </div>
        </div>
      </div>

      <div className="landing-stagger mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={onStart}
          className="group inline-flex items-center gap-2.5 rounded-xl border border-amber-300/70 border-b-4 border-b-amber-900 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 px-7 py-3.5 text-sm text-stone-950 shadow-[0_14px_26px_-8px_rgba(217,119,6,0.6)] transition-all hover:from-amber-300 hover:to-amber-500 active:translate-y-0.5 active:border-b-2"
        >
          <Dices className="h-4 w-4 transition-transform group-hover:rotate-12" />
          <span className="type-interactive">Pull Up a Chair · Deal In</span>
        </button>
        <span className="font-mono text-[11px] text-stone-600 dark:text-stone-400">
          ~2 min duel · Keyboard ready
        </span>
      </div>
    </div>

    {/* Right: Interactive 3D Saloon Specimen Stage */}
    <div
      className="landing-stagger scene-3d lg:col-span-5"
      onMouseMove={handleSpecimenMove}
      onMouseLeave={handleSpecimenLeave}
    >
      <div
        ref={specimenRef}
        className="plaque-3d preserve-3d relative mx-auto max-w-sm rounded-2xl p-5"
      >
        <div className="flex items-center justify-between border-b border-amber-900/15 pb-3 dark:border-amber-500/20">
          <span className="font-display text-xs font-bold uppercase tracking-[0.16em] text-amber-900 dark:text-amber-300">
            Exhibit A · Loaded Ivory
          </span>
          <span className="type-tabular rounded border border-amber-700/30 bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-900 dark:text-amber-300">
            1876
          </span>
        </div>

        {/* 3D Baize Coaster Stage */}
        <div className="baize-well preserve-3d relative my-4 flex h-44 items-center justify-center gap-5 overflow-hidden rounded-xl border border-amber-900/40 px-4">
          {/* Floating 3D Stick-Dice */}
          {[2, 1, 2].map((pips, idx) => (
            <div
              key={idx}
              style={{
                transform: `translateZ(${18 + idx * 6}px) rotateX(18deg) rotateY(${(idx - 1) * 18}deg) rotateZ(${(idx - 1) * 7}deg)`,
              }}
              className="hero-die-float die-prism"
            >
              <div
                className={`die-face die-face-front flex flex-col items-center justify-evenly border bg-gradient-to-b from-[#fffaf0] via-[#f0dfc2] to-[#d9be92] ${
                  idx === 1
                    ? 'border-amber-400 ring-1 ring-amber-300/75 shadow-[0_0_20px_rgba(243,207,122,0.45)]'
                    : 'border-amber-900/50'
                }`}
              >
                {Array.from({ length: pips }, (_, pIdx) => (
                  <span
                    key={pIdx}
                    className="h-2.5 w-2.5 rounded-full bg-stone-900 shadow-inner"
                  />
                ))}
              </div>
              <div className="die-face die-face-back border border-amber-950/40 bg-[#cdb489]" />
              <div className="die-face die-face-right border border-amber-950/45 bg-[#cbb082]" />
              <div className="die-face die-face-left border border-amber-950/45 bg-[#bda070]" />
              <div className="die-face die-face-top border border-amber-900/35 bg-[#f5e7ce]" />
              <div className="die-face die-face-bottom border border-amber-950/50 bg-[#9b7a48]" />
            </div>
          ))}

          {/* 3D Marshal & Sharper Chips */}
          <div
            style={{ transform: 'translateZ(24px)' }}
            className="absolute bottom-3 left-4 flex items-center gap-2"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-200/85 bg-[radial-gradient(circle_at_30%_25%,#047857_0%,#065f46_55%,#064e3b_100%)] font-mono text-[10px] font-bold text-white shadow-[0_4px_0_#022c22,0_8px_14px_rgba(0,0,0,0.6)]">
              M1
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-300/80 bg-[radial-gradient(circle_at_30%_25%,#b91c1c_0%,#991b1b_55%,#450a0a_100%)] font-mono text-[10px] font-bold text-white shadow-[0_4px_0_#3b0707,0_8px_14px_rgba(0,0,0,0.6)]">
              S1
            </div>
          </div>

          <span className="absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-wider text-emerald-100">
            Tilt Mouse ↗
          </span>
        </div>

        <p className="font-serif text-xs italic leading-relaxed text-stone-600 dark:text-stone-300">
          &ldquo;Fresh ivory on the table, Marshal. Keep your eyes on the center bone
          once the pot warms up.&rdquo;
        </p>
      </div>
    </div>
  </div>
  );
}
