import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import gsap from 'gsap';
import { Activity, Dices, Gavel, Shield, Star } from 'lucide-react';
import { AccuseBar } from './components/AccuseBar';
import { DeadwoodBoard } from './components/DeadwoodBoard';
import { DealerBanner } from './components/DealerBanner';
import { DemoSwitcher } from './components/DemoSwitcher';
import { DiceTray } from './components/DiceTray';
import { ExperimentInspector } from './components/ExperimentInspector';
import { Header } from './components/Header';
import { InGameRulesCard } from './components/InGameRulesCard';
import { RulesModal } from './components/RulesModal';
import { VerdictModal } from './components/VerdictModal';
import { createInitialGameState, gameReducer } from './engine/gameReducer';
import {
  playCapture,
  playDiceRoll,
  playGavel,
  playLoadedTell,
  playMove,
  playVerdict,
  setSoundMuted,
} from './engine/sound';
import {
  clearInspectorEvents,
  getFlagsmithSnapshot,
  initFlagsmithExperiment,
  subscribeFlagsmith,
  switchIdentity,
  trackCheatCaught,
  trackFalseAccusation,
  trackMatchAbandoned,
  trackPlayAgain,
  triggerExperimentExposure,
  type FlagsmithStateSnapshot,
} from './lib/flagsmith';

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

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [muted, setMuted] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [flagsmithState, setFlagsmithState] = useState<FlagsmithStateSnapshot>(() =>
    getFlagsmithSnapshot(),
  );
  const [game, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);

  const abandonedThisMatchRef = useRef(false);
  const verdictTrackedRef = useRef(false);
  const activeVariantRef = useRef(flagsmithState.variant);
  const playerRollTimerRef = useRef<number | null>(null);

  const landingRef = useRef<HTMLDivElement | null>(null);
  const specimenRef = useRef<HTMLDivElement | null>(null);
  const rotXToRef = useRef<((v: number) => void) | null>(null);
  const rotYToRef = useRef<((v: number) => void) | null>(null);
  const tableGridRef = useRef<HTMLDivElement | null>(null);

  const clearPlayerRollTimer = useCallback(() => {
    if (playerRollTimerRef.current !== null) {
      window.clearTimeout(playerRollTimerRef.current);
      playerRollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearPlayerRollTimer();
  }, [clearPlayerRollTimer]);

  useEffect(() => {
    activeVariantRef.current = flagsmithState.variant;
  }, [flagsmithState.variant]);

  useEffect(() => {
    document.title = "Deadwood Dice — Catch the Sharper's Loaded Bones";
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    setSoundMuted(muted);
  }, [muted]);

  useEffect(() => {
    const unsubscribe = subscribeFlagsmith(setFlagsmithState);
    void initFlagsmithExperiment();
    return unsubscribe;
  }, []);

  // GSAP entrance & 3D specimen tilt on Landing view
  useEffect(() => {
    if (game.phase !== 'landing' || !landingRef.current) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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
  }, [game.phase]);

  // GSAP entrance when transitioning from landing to the saloon table
  useEffect(() => {
    if (game.phase === 'landing' || !tableGridRef.current) return;
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const ctx = gsap.context(() => {
      gsap.from('.table-enter', {
        y: 16,
        opacity: 0,
        duration: 0.48,
        stagger: 0.07,
        ease: 'power3.out',
        clearProps: 'transform',
      });
    }, tableGridRef);

    return () => ctx.revert();
  }, [game.phase === 'landing']);

  const handleSpecimenMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!rotXToRef.current || !rotYToRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
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

  const isMatchActive =
    game.phase === 'player_roll' ||
    game.phase === 'player_move' ||
    game.phase === 'dealer_turn';

  // Play subtle metallic tell audio when subtle_tells fires after a roll finishes
  useEffect(() => {
    if (!game.isRolling && game.activeTell) {
      playLoadedTell();
    }
  }, [game.isRolling, game.activeTell, game.rollHistory.length]);

  // Play board tap or capture sound on move
  useEffect(() => {
    if (!game.lastMove) return;
    if (game.lastMove.captured) {
      playCapture();
    } else {
      playMove();
    }
  }, [game.lastMove]);

  // Guardrail 2: visibilitychange listener for mid-match tab abandonment
  useEffect(() => {
    if (!isMatchActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden && !abandonedThisMatchRef.current) {
        abandonedThisMatchRef.current = true;
        const elapsedMs = game.matchStartedAt ? Date.now() - game.matchStartedAt : 0;
        trackMatchAbandoned('tab_hidden', game.turn, elapsedMs);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isMatchActive, game.matchStartedAt, game.turn]);

  // Fixed Silas Vance turn loop (prevents infinite re-roll on Vault overshoot)
  useEffect(() => {
    if (game.phase !== 'dealer_turn') return;

    if (!game.isRolling && !game.dealerHasRolled) {
      const startTimer = window.setTimeout(() => {
        playDiceRoll();
        dispatch({ type: 'DEALER_ROLL_START' });
      }, 520);
      return () => window.clearTimeout(startTimer);
    }

    if (game.isRolling) {
      const finishRollTimer = window.setTimeout(() => {
        dispatch({
          type: 'DEALER_ROLL_COMPLETE',
          tellVariant: activeVariantRef.current,
        });
      }, 540);
      return () => window.clearTimeout(finishRollTimer);
    }

    if (!game.isRolling && game.dealerHasRolled) {
      const moveDelay = game.activeTell ? 850 : 620;
      const moveTimer = window.setTimeout(() => {
        dispatch({ type: 'DEALER_MOVE_COMPLETE' });
      }, moveDelay);
      return () => window.clearTimeout(moveTimer);
    }
  }, [game.phase, game.isRolling, game.dealerHasRolled, game.activeTell]);

  // Track primary (`cheat_caught`) & guardrail (`false_accusation`) verdict metrics once per match
  useEffect(() => {
    if (game.phase !== 'verdict' || !game.verdict || verdictTrackedRef.current) return;
    verdictTrackedRef.current = true;

    playVerdict(game.verdict === 'caught' || game.verdict === 'player_won');

    if (game.verdict === 'caught') {
      trackCheatCaught(game.turn, game.proofLedger.length);
    } else if (game.verdict === 'false_accusation') {
      trackFalseAccusation(game.turn, game.proofLedger.length);
    }
  }, [game.phase, game.verdict, game.turn, game.proofLedger.length]);

  const handleStartMatch = useCallback(() => {
    clearPlayerRollTimer();
    abandonedThisMatchRef.current = false;
    verdictTrackedRef.current = false;
    triggerExperimentExposure();
    dispatch({ type: 'START_MATCH', now: Date.now() });
  }, [clearPlayerRollTimer]);

  const handlePlayerRoll = useCallback(() => {
    if (game.phase !== 'player_roll' || game.isRolling) return;
    clearPlayerRollTimer();
    playDiceRoll();
    dispatch({ type: 'PLAYER_ROLL_START' });
    playerRollTimerRef.current = window.setTimeout(() => {
      playerRollTimerRef.current = null;
      dispatch({
        type: 'PLAYER_ROLL_COMPLETE',
        tellVariant: activeVariantRef.current,
      });
    }, 480);
  }, [game.phase, game.isRolling, clearPlayerRollTimer]);

  const handleSelectPawn = useCallback((pawnId: string) => {
    dispatch({ type: 'PLAYER_MOVE_PAWN', pawnId });
  }, []);

  const handleCallOut = useCallback(() => {
    clearPlayerRollTimer();
    playGavel();
    dispatch({ type: 'CALL_OUT_DEALER' });
  }, [clearPlayerRollTimer]);

  const handleForfeit = useCallback(() => {
    clearPlayerRollTimer();
    if (!abandonedThisMatchRef.current) {
      abandonedThisMatchRef.current = true;
      const elapsedMs = game.matchStartedAt ? Date.now() - game.matchStartedAt : 0;
      trackMatchAbandoned('forfeit', game.turn, elapsedMs);
    }
    dispatch({ type: 'RESET_TO_LANDING' });
  }, [clearPlayerRollTimer, game.matchStartedAt, game.turn]);

  const handlePlayAgain = useCallback(() => {
    clearPlayerRollTimer();
    if (game.verdict) {
      trackPlayAgain(game.verdict, game.turn);
    }
    abandonedThisMatchRef.current = false;
    verdictTrackedRef.current = false;
    triggerExperimentExposure();
    dispatch({ type: 'START_MATCH', now: Date.now() });
  }, [clearPlayerRollTimer, game.verdict, game.turn]);

  const handleSwitchIdentity = useCallback(async (nextId: string) => {
    await switchIdentity(nextId);
  }, []);

  // Keyboard shortcuts: Space to roll, 1 / 2 to move M1 / M2, Enter if 1 move
  useEffect(() => {
    if (rulesOpen || game.phase === 'landing' || game.phase === 'verdict') return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (event.code === 'Space' && game.phase === 'player_roll' && !game.isRolling) {
        event.preventDefault();
        handlePlayerRoll();
      } else if (game.phase === 'player_move') {
        if (event.key === '1' && game.legalMoves.some((m) => m.pawnId === 'm1')) {
          handleSelectPawn('m1');
        } else if (event.key === '2' && game.legalMoves.some((m) => m.pawnId === 'm2')) {
          handleSelectPawn('m2');
        } else if (event.key === 'Enter' && game.legalMoves.length === 1) {
          handleSelectPawn(game.legalMoves[0].pawnId);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    rulesOpen,
    game.phase,
    game.isRolling,
    game.legalMoves,
    handlePlayerRoll,
    handleSelectPawn,
  ]);

  return (
    <div className="saloon-table-bg flex min-h-screen flex-col text-stone-900 dark:text-stone-100">
      <Header
        theme={theme}
        muted={muted}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onToggleMute={() => setMuted((prev) => !prev)}
        onOpenRules={() => setRulesOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
        {game.phase === 'landing' ? (
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
                for a tight frontier board duel. Turns 1–3 are dead honest—after that, his
                ivory stick-bones start hiding lead.
              </p>

              {/* Stamped Assay Ledger Steps (replaces generic 3-column SaaS card grid) */}
              <div className="landing-stagger mt-6 divide-y divide-amber-900/15 rounded-xl border border-amber-900/25 bg-white/55 backdrop-blur-sm dark:divide-amber-500/15 dark:border-amber-500/20 dark:bg-[#17100c]/85">
                <div className="flex items-start gap-3.5 px-4 py-3">
                  <span className="type-tabular mt-0.5 font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
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
                      Slam the table after 2+ rigged rolls to take the pot immediately. Call
                      early and fold.
                    </p>
                  </div>
                </div>
              </div>

              <div className="landing-stagger mt-6 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={handleStartMatch}
                  className="group inline-flex items-center gap-2.5 rounded-xl border border-amber-300/70 border-b-4 border-b-amber-900 bg-gradient-to-b from-amber-400 via-amber-500 to-amber-600 px-7 py-3.5 text-sm text-stone-950 shadow-[0_14px_26px_-8px_rgba(217,119,6,0.6)] transition-all hover:from-amber-300 hover:to-amber-500 active:translate-y-0.5 active:border-b-2"
                >
                  <Dices className="h-4 w-4 transition-transform group-hover:rotate-12" />
                  <span className="type-interactive">Pull Up a Chair · Deal In</span>
                </button>
                <span className="font-mono text-[11px] text-stone-500 dark:text-stone-400">
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-emerald-200/85 bg-[radial-gradient(circle_at_30%_25%,#34d399_0%,#059669_55%,#064e3b_100%)] font-mono text-[10px] font-bold text-white shadow-[0_4px_0_#022c22,0_8px_14px_rgba(0,0,0,0.6)]">
                      M1
                    </div>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-amber-300/80 bg-[radial-gradient(circle_at_30%_25%,#f87171_0%,#b91c1c_55%,#450a0a_100%)] font-mono text-[10px] font-bold text-amber-100 shadow-[0_4px_0_#3b0707,0_8px_14px_rgba(0,0,0,0.6)]">
                      S1
                    </div>
                  </div>

                  <span className="absolute bottom-3 right-3 font-mono text-[10px] uppercase tracking-wider text-emerald-200/70">
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
        ) : (
          <div ref={tableGridRef} className="grid items-start gap-6 lg:grid-cols-12">
            <div className="table-enter lg:col-span-7">
              <DeadwoodBoard
                pawns={game.pawns}
                legalMoves={game.legalMoves}
                lastMove={game.lastMove}
                canSelectMove={game.phase === 'player_move'}
                onSelectPawn={handleSelectPawn}
              />
              <InGameRulesCard />
            </div>

            <div className="table-enter space-y-4 lg:col-span-5">
              <DiceTray
                phase={game.phase}
                currentRoll={game.currentRoll}
                dice={game.currentDice}
                isRolling={game.isRolling}
                activeTell={game.activeTell}
                statusBanner={game.statusBanner}
                lastCaptureFlash={game.lastCaptureFlash}
                onRoll={handlePlayerRoll}
              />

              <AccuseBar
                phase={game.phase}
                turn={game.turn}
                onCallOut={handleCallOut}
                onForfeit={handleForfeit}
              />

              <DealerBanner
                dialogue={game.dealerDialogue}
                rollHistory={game.rollHistory}
                turn={game.turn}
              />
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-amber-900/20 bg-stone-100/80 py-3 dark:border-amber-500/15 dark:bg-[#110b08]/85">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-xs text-stone-600 sm:px-6 dark:text-stone-400">
          <span className="font-serif italic">
            Deadwood Dice · WeMakeDevs × Flagsmith Toggle Wars
          </span>
          {flagsmithState.isDemoMode && (
            <button
              type="button"
              onClick={() => setInspectorOpen((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-800/30 px-2.5 py-1 font-mono text-[11px] font-medium text-stone-700 transition-colors hover:bg-amber-100/70 dark:border-amber-500/25 dark:text-amber-200/90 dark:hover:bg-[#1e1510]"
            >
              <Activity className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              <span className="type-interactive">
                {inspectorOpen ? 'Hide Inspector' : 'Experiment Inspector'}
              </span>
            </button>
          )}
        </div>
      </footer>

      <VerdictModal
        verdict={game.verdict}
        turn={game.turn}
        proofLedger={game.proofLedger}
        dealerDialogue={game.dealerDialogue}
        onPlayAgain={handlePlayAgain}
      />

      <RulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} />

      <DemoSwitcher
        visible={flagsmithState.isDemoMode}
        currentIdentity={flagsmithState.identity}
        anonId={flagsmithState.anonId}
        activeVariant={flagsmithState.variant}
        disabled={game.isRolling}
        onSwitchIdentity={handleSwitchIdentity}
      />

      <ExperimentInspector
        open={inspectorOpen}
        snapshot={flagsmithState}
        turn={game.turn}
        phase={game.phase}
        riggedCount={game.proofLedger.length}
        onClose={() => setInspectorOpen(false)}
        onClearLog={clearInspectorEvents}
      />
    </div>
  );
}
