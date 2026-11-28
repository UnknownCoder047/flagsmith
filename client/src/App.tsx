import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import gsap from 'gsap';
import { Activity } from 'lucide-react';
import { AccuseBar } from './components/AccuseBar';
import { DeadwoodBoard } from './components/DeadwoodBoard';
import { DealerBanner } from './components/DealerBanner';
import { DemoSwitcher } from './components/DemoSwitcher';
import { DiceTray } from './components/DiceTray';
import { ExperimentInspector } from './components/ExperimentInspector';
import { Header } from './components/Header';
import { InGameRulesCard } from './components/InGameRulesCard';
import { Landing } from './components/Landing';
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
  trackMatchCompleted,
  trackPlayAgain,
  triggerExperimentExposure,
  type FlagsmithStateSnapshot,
} from './lib/flagsmith';
import { prefersReducedMotion } from './lib/motion';

const HIDDEN_ABANDON_MS = 30_000;
const newSeed = () => (Math.random() * 2 ** 32) >>> 0;

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

  // GSAP entrance when transitioning from landing to the saloon table
  const isLanding = game.phase === 'landing';
  useEffect(() => {
    if (isLanding || !tableGridRef.current) return;
    const prefersReduced = prefersReducedMotion();
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
  }, [isLanding]);

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

  // Guardrail 2: abandonment = tab hidden > 30s, page closed, or forfeit (not a quick tab glance).
  const matchRef = useRef({ turn: game.turn, startedAt: game.matchStartedAt });
  useEffect(() => {
    matchRef.current = { turn: game.turn, startedAt: game.matchStartedAt };
  }, [game.turn, game.matchStartedAt]);

  useEffect(() => {
    if (!isMatchActive) return;

    let hiddenTimer: number | null = null;
    const abandon = (reason: 'tab_hidden' | 'page_closed') => {
      if (abandonedThisMatchRef.current) return;
      abandonedThisMatchRef.current = true;
      const { turn, startedAt } = matchRef.current;
      trackMatchAbandoned(reason, turn, startedAt ? Date.now() - startedAt : 0);
    };
    const clearHiddenTimer = () => {
      if (hiddenTimer !== null) window.clearTimeout(hiddenTimer);
      hiddenTimer = null;
    };
    const handleVisibilityChange = () => {
      clearHiddenTimer();
      if (document.hidden) {
        hiddenTimer = window.setTimeout(() => abandon('tab_hidden'), HIDDEN_ABANDON_MS);
      }
    };
    const handlePageHide = () => abandon('page_closed');

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    return () => {
      clearHiddenTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [isMatchActive]);

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
          seed: newSeed(),
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

    trackMatchCompleted(game.verdict, game.turn, game.proofLedger.length);

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
        seed: newSeed(),
      });
    }, 480);
  }, [game.phase, game.isRolling, clearPlayerRollTimer]);

  const handleSelectPawn = useCallback((pawnId: string) => {
    dispatch({ type: 'PLAYER_MOVE_PAWN', pawnId });
  }, []);

  const handleToggleFlag = useCallback((rollId: string) => {
    dispatch({ type: 'TOGGLE_FLAG_ROLL', rollId });
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
      // Leave browser/OS shortcuts (Cmd+1 tab switch, Ctrl+R...) and key-repeat alone.
      if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      // Space/Enter on a focused button or link must activate that control, not the shortcut.
      const onControl = Boolean(target?.closest('button, a, [role="button"]'));
      const isActivationKey = event.code === 'Space' || event.key === 'Enter';
      if (onControl && isActivationKey) return;

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
          <Landing onStart={handleStartMatch} />
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
                flaggedCount={game.flaggedRollIds.length}
                onCallOut={handleCallOut}
                onForfeit={handleForfeit}
              />

              <DealerBanner
                dialogue={game.dealerDialogue}
                rollHistory={game.rollHistory}
                flaggedRollIds={game.flaggedRollIds}
                turn={game.turn}
                onToggleFlag={handleToggleFlag}
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
        disabled={game.isRolling || isMatchActive}
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
