import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { Activity, Dices, Gavel, Shield, Star } from 'lucide-react';
import { AccuseBar } from './components/AccuseBar';
import { ChausarBoard } from './components/ChausarBoard';
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

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [rulesOpen, setRulesOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [flagsmithState, setFlagsmithState] = useState<FlagsmithStateSnapshot>(() =>
    getFlagsmithSnapshot(),
  );
  const [game, dispatch] = useReducer(gameReducer, undefined, createInitialGameState);

  const abandonedThisMatchRef = useRef(false);
  const verdictTrackedRef = useRef(false);
  const activeVariantRef = useRef(flagsmithState.variant);

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
    const unsubscribe = subscribeFlagsmith(setFlagsmithState);
    void initFlagsmithExperiment();
    return unsubscribe;
  }, []);

  const isMatchActive =
    game.phase === 'player_roll' ||
    game.phase === 'player_move' ||
    game.phase === 'dealer_turn';

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

  // Automated Silas Vance turn loop
  useEffect(() => {
    if (game.phase !== 'dealer_turn') return;

    if (!game.isRolling && game.legalMoves.length === 0) {
      const startTimer = window.setTimeout(() => {
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

    if (!game.isRolling && game.legalMoves.length > 0) {
      const moveDelay = game.activeTell ? 820 : 620;
      const moveTimer = window.setTimeout(() => {
        dispatch({ type: 'DEALER_MOVE_COMPLETE' });
      }, moveDelay);
      return () => window.clearTimeout(moveTimer);
    }
  }, [game.phase, game.isRolling, game.legalMoves.length, game.activeTell]);

  // Track primary (`cheat_caught`) & guardrail (`false_accusation`) verdict metrics once per match
  useEffect(() => {
    if (game.phase !== 'verdict' || !game.verdict || verdictTrackedRef.current) return;
    verdictTrackedRef.current = true;

    if (game.verdict === 'caught') {
      trackCheatCaught(game.turn, game.proofLedger.length);
    } else if (game.verdict === 'false_accusation') {
      trackFalseAccusation(game.turn, game.proofLedger.length);
    }
  }, [game.phase, game.verdict, game.turn, game.proofLedger.length]);

  const handleStartMatch = useCallback(() => {
    abandonedThisMatchRef.current = false;
    verdictTrackedRef.current = false;
    triggerExperimentExposure();
    dispatch({ type: 'START_MATCH', now: Date.now() });
  }, []);

  const handlePlayerRoll = useCallback(() => {
    if (game.phase !== 'player_roll' || game.isRolling) return;
    dispatch({ type: 'PLAYER_ROLL_START' });
    window.setTimeout(() => {
      dispatch({
        type: 'PLAYER_ROLL_COMPLETE',
        tellVariant: activeVariantRef.current,
      });
    }, 480);
  }, [game.phase, game.isRolling]);

  const handleSelectPawn = useCallback((pawnId: string) => {
    dispatch({ type: 'PLAYER_MOVE_PAWN', pawnId });
  }, []);

  const handleCallOut = useCallback(() => {
    dispatch({ type: 'CALL_OUT_DEALER' });
  }, []);

  const handleForfeit = useCallback(() => {
    if (!abandonedThisMatchRef.current) {
      abandonedThisMatchRef.current = true;
      const elapsedMs = game.matchStartedAt ? Date.now() - game.matchStartedAt : 0;
      trackMatchAbandoned('forfeit', game.turn, elapsedMs);
    }
    dispatch({ type: 'RESET_TO_LANDING' });
  }, [game.matchStartedAt, game.turn]);

  const handlePlayAgain = useCallback(() => {
    if (game.verdict) {
      trackPlayAgain(game.verdict, game.turn);
    }
    abandonedThisMatchRef.current = false;
    verdictTrackedRef.current = false;
    triggerExperimentExposure();
    dispatch({ type: 'START_MATCH', now: Date.now() });
  }, [game.verdict, game.turn]);

  const handleSwitchIdentity = useCallback(async (nextId: string) => {
    await switchIdentity(nextId);
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-stone-100 text-stone-900 dark:bg-[#0f0b09] dark:text-stone-100">
      <Header
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onOpenRules={() => setRulesOpen(true)}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
        {game.phase === 'landing' ? (
          /* Landing Screen — Exposure is NOT fired until clicking "Pull Up a Chair · Deal In" */
          <div className="mx-auto my-auto flex max-w-2xl flex-col items-center rounded-3xl border border-amber-800/30 bg-white/90 p-7 text-center shadow-xl sm:p-10 dark:border-amber-500/20 dark:bg-[#18110d]/95">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-600 to-amber-900 text-amber-100 shadow-lg">
              <Star className="h-7 w-7 fill-amber-200/30" />
            </div>

            <span className="mt-4 rounded-full border border-amber-600/30 bg-amber-500/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-widest text-amber-800 dark:text-amber-300">
              Deadwood Saloon · High-Stakes Loaded Dice
            </span>

            <h1 className="mt-4 font-display text-3xl font-bold tracking-wider text-stone-900 sm:text-4xl dark:text-amber-100">
              DEADWOOD DICE
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-stone-600 dark:text-stone-300">
              Sit across from riverboat sharper <strong>Silas Vance</strong> for a fast
              2-minute frontier board duel. The opening turns are honest—but Silas&apos;s
              ivory bones won&apos;t stay straight for long.
            </p>

            <div className="mt-6 grid w-full gap-3 text-left sm:grid-cols-3">
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-[#110c0a]">
                <Dices className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <div className="mt-1.5 text-xs font-semibold text-stone-900 dark:text-amber-100">
                  Race 2 Riders
                </div>
                <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                  Circle the cross-track clockwise into the center Gold Vault.
                </p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-[#110c0a]">
                <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <div className="mt-1.5 text-xs font-semibold text-stone-900 dark:text-amber-100">
                  Read the Table
                </div>
                <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                  Turns 1–3 are clean. Watch for covert escapes and uncanny rolls.
                </p>
              </div>
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 dark:border-stone-800 dark:bg-[#110c0a]">
                <Gavel className="h-4 w-4 text-red-600 dark:text-red-400" />
                <div className="mt-1.5 text-xs font-semibold text-stone-900 dark:text-amber-100">
                  Call the Cheat
                </div>
                <p className="mt-0.5 text-[11px] text-stone-500 dark:text-stone-400">
                  Accuse after 2+ rigged rolls to win instantly. Call early and lose.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleStartMatch}
              className="mt-7 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 px-8 py-3.5 text-sm font-bold text-stone-950 shadow-lg transition-all hover:from-amber-500 hover:to-amber-400 active:scale-[0.99]"
            >
              <Dices className="h-4 w-4" />
              <span>Pull Up a Chair · Deal In</span>
            </button>
          </div>
        ) : (
          /* Active Match Workspace with always-visible Quick Rules below the board */
          <div className="grid items-start gap-5 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <ChausarBoard
                pawns={game.pawns}
                legalMoves={game.legalMoves}
                canSelectMove={game.phase === 'player_move'}
                onSelectPawn={handleSelectPawn}
              />
              <InGameRulesCard />
            </div>

            <div className="space-y-4 lg:col-span-5">
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

      <footer className="border-t border-stone-200/80 bg-stone-50/80 py-3 dark:border-stone-800/80 dark:bg-[#120d0a]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 text-xs text-stone-500 sm:px-6 dark:text-stone-400">
          <span>Deadwood Dice · WeMakeDevs × Flagsmith Toggle Wars</span>
          <button
            type="button"
            onClick={() => setInspectorOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 px-2.5 py-1 font-mono text-[11px] font-medium text-stone-700 transition-colors hover:bg-stone-200 dark:border-stone-800 dark:text-stone-300 dark:hover:bg-stone-900"
          >
            <Activity className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
            <span>{inspectorOpen ? 'Hide Inspector' : 'Experiment Inspector'}</span>
          </button>
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
