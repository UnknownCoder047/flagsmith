# Deadwood Dice — Western Biased-Dice Game & Flagsmith A/B Test Plan

**Hackathon:** WeMakeDevs x Flagsmith — Toggle Wars (Track 1: *"Test Something Real"*)
**Concept:** A browser-based frontier board duel against riverboat sharper **Silas Vance (AI)**. Silas covertly rigs his dice. A live Flagsmith Experimentation A/B test measures whether subtle diegetic tells help players catch the cheat.

> History: the project began as a `WaitWise (Diff2PR)` scaffold, then a Mahabharata concept (Dyuta / Chausar / Shakuni). It was re-themed to Western / Deadwood Dice. The engine's board shape keeps the Chausar lineage.

---

## 1. Core Game Design

### Goal & Match Pacing
A fast **2–3 minute match** so players finish games, discover the twist, and replay. That produces real conversion and retention events for Flagsmith.

- **Board:** 9x9 cross-shaped saloon board. 28-square clockwise outer track, 2-square private home lane per side, 3x3 center **Gold Vault** (home).
- **Pieces:** 2 pawns per side (Marshal `M1`/`M2` vs. Silas `S1`/`S2`). `M1` and `S1` start on their entry squares. `M2` and `S2` start in the corral.
- **Pawn `progress`:** `-1` corral, `0..27` outer track, `28..29` home lane, `30` Gold Vault (home).
- **Entry squares:** Marshal at ring index 0, Silas at ring index 14. Silas's progress maps to ring index `(14 + progress) % 28`.
- **Corral exit:** a roll of `n` moves a corral pawn to `progress = n - 1`.
- **Overshoot:** a move past `30` is illegal.
- **Safe squares ("Sheriff Stars"):** ring indices `0, 6, 13, 14, 20, 27`. Home lane and vault are always safe. Landing on an opponent pawn on an unsafe square sends it to the corral.
- **Dice:** three dice (`DICE_BY_ROLL` in `diceAi.ts`) that sum to a roll of `1..6`, shuffled for display.

### Biased Dice AI (`engine/diceAi.ts` → `computeDiceRoll`)

| Turns | Behavior |
| --- | --- |
| 1–3 | Fair opening. Pure RNG, 0% bias. |
| 4–6 | Low-profile nudges. About 34% bias. Cooldown prevents back-to-back rigs. Prefers plausible 2–5 rolls. |
| 7–10 | Calculated rigging. About 50% bias. |
| 11+ | Endgame pressure. About 68% bias. |

- **Guaranteed window:** at turn 7, if no rig has happened and Silas is rolling, bias is 88%. From turn 8, while fewer than 2 rigs are logged, bias is 85%. Observant players always get at least 2 catchable rigs.
- **Cooldown exception:** the cooldown is skipped once a Marshal pawn is within reach of the vault (`progress >= 26`).
- **Dealer rigs:** Silas picks the roll that scores best. Targets are exact captures, safe squares, home entry, and escapes from threat. The subtle preference avoids blatant 6s early.
- **Player-side rigs:** the player's roll can be nudged 1 tile short of a capture or safe square, or into a vault overshoot.
- **Proof Ledger:** every rigged roll is a `RigProof` (`turn`, `actor`, `roll`, `reason`, `odds`). Odds text compounds per prior rig, for example `16.7% (exact roll)`, `2.8% combined odds`, `0.46% streak odds`.

### "Call Out Loaded Dice" (always available in the HUD)
- **Valid catch (ledger has `>= 2` rigs):** instant win. The verdict modal lists every rigged roll with its odds.
- **False accusation (`0–1` rigs):** instant loss. This blocks button-mashing on turn 1.
- **Silas reaches home first:** loss, followed by a reveal of how many rolls were rigged. **Play Again** is prominent.
- **Player reaches home first:** `player_won` verdict.
- **Fold:** `AccuseBar` also offers **Fold**, which forfeits the match and fires `match_abandoned`.

### State machine (`engine/gameReducer.ts`)
- **Phases:** `landing` → `player_roll` → `player_move` → `dealer_turn` → `verdict`
- **Verdicts:** `caught`, `false_accusation`, `dealer_won`, `player_won`
- **Actions:** `START_MATCH`, `PLAYER_ROLL_START`, `PLAYER_ROLL_COMPLETE`, `PLAYER_MOVE_PAWN`, `DEALER_ROLL_START`, `DEALER_ROLL_COMPLETE`, `DEALER_MOVE_COMPLETE`, `CALL_OUT_DEALER`, `RESET_TO_LANDING`
- `createInitialGameState()` builds the starting state. The reducer is pure.

---

## 2. Flagsmith Experimentation Architecture

A **2-variant (50/50) split** reaches meaningful Bayesian confidence quickly.

- **Multivariate flag:** `sharper_tell_mode`
  - `silent_bias` **(control):** Silas rigs silently. Players rely on the **Table Roll Log** and board patterns.
  - `subtle_tells` **(treatment):** rigged rolls show a faint brass glint on the center die, a slight settle hesitation, and a dry saloon quip from Silas.
- **Hypothesis:** adding subtle tells when Silas rigs the dice increases `cheat_caught` and `play_again_clicked`, without increasing `false_accusation`.

### Events & Metrics
| Metric | Event Name | Aggregation | Direction | Trigger |
| --- | --- | --- | --- | --- |
| Exposure | `$flag_exposure` | Auto (`getExperimentFlag`) | n/a | Click **"Pull Up a Chair · Deal In"** (never on landing load) |
| Primary | `cheat_caught` | Occurrence | Up | Call out with `>= 2` rigged rolls |
| Secondary | `play_again_clicked` | Occurrence | Up | Click **"Play Again"** after any verdict |
| Guardrail 1 | `false_accusation` | Occurrence | Down | Call out with `0–1` rigged rolls |
| Guardrail 2 | `match_abandoned` | Occurrence | Down | **Fold**, or tab hidden mid-match (`visibilitychange`) |

### SDK wrapper (`lib/flagsmith.ts`)
- Anonymous UUID persists in `localStorage` under `deadwood_anon_id` and is the Flagsmith identity.
- `VITE_FLAGSMITH_ENV_KEY` (optional `VITE_FLAGSMITH_API_URL`) enables cloud mode.
- With no key, or if init fails, a deterministic hash of the identity picks the variant (local fallback).
- `triggerExperimentExposure()` uses `getExperimentFlag`. Metric helpers: `trackCheatCaught`, `trackPlayAgain`, `trackFalseAccusation`, `trackMatchAbandoned`. These call `trackEvent` when connected.
- Every event is mirrored to an in-app inspector log (last 50). `subscribeFlagsmith` exposes the state to React.

### Demo & Judge Instrumentation
- **Demo Mode (`?demo=true`):** floating switcher for identities `demo_silent`, `demo_tells`, and the real `anon_id`.
- **Experiment Inspector:** footer drawer (off by default) showing connection status, identity, assigned variant, a spoiler-protected rigged-roll counter, and the chronological event log.

---

## 3. Folder Architecture (Zero-Backend Static Web App)

All board rules and dice AI run client-side. The app deploys as a static Vite bundle to **Vercel or Netlify**.

```text
flagsmith/
├── package.json                      # Root scripts: install:all, dev, build, preview, simulate
├── PLAN.md                           # This plan
├── PROJECT_SUMMARY.md                # Code review summary
├── README.md                         # Setup, deployment & Flagsmith dashboard checklist
├── client/                           # React + TypeScript + Vite + Tailwind game app
│   ├── .env.example
│   └── src/
│       ├── App.tsx                   # Game shell, match lifecycle, metric triggers, visibilitychange guardrail
│       ├── types.ts                  # Pawn, RollRecord, RigProof, MatchPhase, VerdictType, experiment types
│       ├── engine/
│       │   ├── board.ts              # Ring coordinates, safe squares, home lanes, legal moves, captures
│       │   ├── diceAi.ts             # Fair vs. rigged roll AI + Proof Ledger + quips
│       │   ├── gameReducer.ts        # Pure state machine
│       │   └── sound.ts              # Dice roll sound + mute
│       ├── lib/
│       │   └── flagsmith.ts          # Flagsmith SDK wrapper
│       └── components/
│           ├── Header.tsx            # Branding, rules trigger, audio toggle
│           ├── DeadwoodBoard.tsx     # Interactive board with valid-move highlights
│           ├── DiceTray.tsx          # Animated dice (+ brass glint tell in treatment)
│           ├── DealerBanner.tsx      # Silas portrait, reactive dialogue, Table Roll Log
│           ├── AccuseBar.tsx         # "Call Out Loaded Dice" + Fold + turn status
│           ├── VerdictModal.tsx      # Proof breakdown + Play Again
│           ├── RulesModal.tsx        # Quick-start rules
│           ├── InGameRulesCard.tsx   # In-match rules reminder
│           ├── DemoSwitcher.tsx      # ?demo=true identity switcher
│           └── ExperimentInspector.tsx
└── scripts/
    ├── .env.example
    └── simulate-traffic.ts           # @flagsmith/nodejs simulator for sharper_tell_mode
```

---

## 4. Phased Execution Checklist

### Phase 1: Cleanup & Core Game Engine
- [x] Delete `/server` and unused Diff2PR client files (`api.ts`, `samples.ts`, `InputPanel`, `OutputPanel`, `MarkdownView`, `ThinkingSteps`).
- [x] Update root `package.json`, `client/vite.config.ts`, and `client/src/types.ts`.
- [x] Implement `engine/board.ts` (ring path, safe squares, legal moves, captures, home completion).
- [x] Implement `engine/diceAi.ts` (fair opening → low-profile → calculated → endgame bias + Proof Ledger).
- [x] Implement `engine/gameReducer.ts` (turn loop, dealer auto-turn, call-out evaluation, win/loss states).

### Phase 2: Deadwood UI & Playable Experience
- [x] Build `DeadwoodBoard.tsx` with pawn tokens, safe-square markers, and clickable move highlights.
- [x] Build `DiceTray.tsx` with animated dice and the `subtle_tells` brass glint / settle hesitation.
- [x] Build `DealerBanner.tsx` (quips + Table Roll Log) and `AccuseBar.tsx` (**Call Out Loaded Dice**, **Fold**).
- [x] Build `VerdictModal.tsx`, `RulesModal.tsx`, `InGameRulesCard.tsx`.
- [x] Wire the full game flow in `App.tsx`, including the landing screen ("Pull Up a Chair · Deal In") and the `visibilitychange` abandonment listener.
- [x] DD-1 bug fixes and UI improvements (merged, PR #1).

### Phase 3: Flagsmith Experimentation & Traffic Simulator
- [x] `lib/flagsmith.ts`, `DemoSwitcher.tsx`, and `ExperimentInspector.tsx` use `sharper_tell_mode`.
- [x] `scripts/simulate-traffic.ts` and `scripts/.env.example` support end-to-end Bayesian dashboard verification.
- [x] `npm run build` passes (`tsc -b` + Vite).
- [x] `npm run check` (`scripts/game-check.ts`) verifies `demo_silent` → `silent_bias`, `demo_tells` → `subtle_tells`, exposure events, dice-AI rules and call-out verdicts offline.
- [ ] Manually click through both `?demo=true` identities in a browser (not automated; browser extension was unavailable).

### Phase 4: Flagsmith Cloud, Deployment & Submission
- [ ] Create the `sharper_tell_mode` multivariate flag (`silent_bias`, `subtle_tells`), the four metrics, and an active experiment in Flagsmith Cloud.
- [ ] Set identity overrides for `demo_silent` and `demo_tells`.
- [ ] Deploy `client/` to Vercel/Netlify with `VITE_FLAGSMITH_ENV_KEY` set.
- [ ] Share the live URL for real player sessions, inspect Flagsmith Bayesian results, and record the demo video.

---

## 5. Known Gaps
- Tests are one offline script (`npm run check`), not a full suite. The UI has no tests.
- Phase 4 Flagsmith Cloud steps need dashboard access and are still manual.
