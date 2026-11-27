# Dyuta (Chausar) — Mahabharata Biased-Dice Game & Flagsmith A/B Test Plan

**Hackathon:** WeMakeDevs x Flagsmith — Toggle Wars (Track 1: *"Test Something Real"*)  
**Pivot:** Replacing the initial `WaitWise (Diff2PR)` scaffold with **Dyuta (Chausar)**—a browser-based Mahabharata dice game against **Shakuni (AI)** featuring loaded-dice detection and a live Flagsmith Experimentation A/B test.

---

## 1. Core Game Design & "Catch Shakuni" Mechanic

### Goal & Match Pacing
Deliver a fast, tense **2–3 minute match** so players finish games, discover the twist, and replay—generating real conversion and retention events for Flagsmith.

- **Board & Pieces:** Classic cross-shaped Chausar board with **2 pawns per player** (You vs. Shakuni), outer movement track, safe squares (*Chira*), capture rules (landing on an opponent's pawn sends it back to start), and a center home goal.
- **Dice (*Pasa*):** 3 traditional elongated stick dice yielding rolls from `1` to `6` with crisp roll animations.

### 3-Stage Biased Dice AI (`diceAi.ts`)
1. **Turns 1–3 — Fair Opening (0% bias):** Pure RNG so the player learns the board and trusts the dice.
2. **Turns 4–7 — Subtle Rigging (~45% bias):** Shakuni's loaded dice quietly activate—nudging his rolls toward exact captures, safe squares, or home entries, while subtly nudging the player's rolls 1 tile short of captures or safe zones.
3. **Turns 8+ — Escalating Rigging (~70% bias):** Bias ramps up so that if the player fails to catch Shakuni, they will inevitably lose—mirroring the Sabha Parva narrative.

Every rigged roll is recorded in an internal **Proof Ledger** with turn number, outcome, and statistical improbability (e.g., *"Turn 6: Shakuni rolled exact 4 to capture your pawn — 0.8% odds"*).

### "Call Out Rigged Dice" Mechanic (Always Available in HUD)
- **Valid Catch (`>= 2` rigged rolls have occurred):** **Instant Victory!** Ends the match immediately and opens the **"Sabha Exposed"** verdict modal showing every rigged roll, statistical odds, and Shakuni's reaction.
- **False Accusation (`0–1` rigged rolls so far):** **Instant Defeat** (*"You accused a royal guest without proof"*). Prevents blind button-mashing on Turn 1 and rewards real observation.
- **Never Caught (Shakuni reaches Home first):** **Defeat**, followed by a post-match reveal (*"Shakuni rigged 6 rolls against you — spot the tells next time!"*) with a prominent **Play Again** button.

---

## 2. Flagsmith Experimentation Architecture

A **2-variant (50/50) split** is used to reach meaningful Bayesian confidence quickly within the hackathon window.

- **Multivariate Flag:** `shakuni_tell_mode`
  - `silent_bias` **(Control):** Shakuni rigs rolls silently; players rely solely on the **Roll History** strip to spot anomalies.
  - `subtle_tells` **(Treatment):** Rigged rolls include subtle diegetic tells—a brief golden glint on the *Pasa* dice, a slight hesitation before settling, and a sly Shakuni dialogue quip.
- **Hypothesis:** *Adding subtle visual and narrative tells when Shakuni rigs the dice increases the rate of players catching the cheat and replaying, without increasing false accusations.*

### Events & Metrics
| Metric | Event Name | Aggregation | Direction | Trigger |
| --- | --- | --- | --- | --- |
| Exposure | `$flag_exposure` | Auto (`getExperimentFlag`) | — | User clicks **"Start Match"** (never on landing page load) |
| Primary | `cheat_caught` | Occurrence | `Up` | Player calls out Shakuni with `>= 2` rigged rolls |
| Secondary | `play_again_clicked` | Occurrence | `Up` | Player clicks **"Play Again"** after any verdict |
| Guardrail 1 | `false_accusation` | Occurrence | `Down` | Player accuses Shakuni during the fair opening (`< 2` rigged rolls) |
| Guardrail 2 | `match_abandoned` | Occurrence | `Down` | Player forfeits or switches/hides the tab (`visibilitychange`) mid-match |

### Demo & Judge Instrumentation
- **Demo Mode (`?demo=true`):** Floating bottom-right switcher toggling Flagsmith identities between `demo_silent`, `demo_tells`, and the real `anon_id`.
- **Experiment Inspector Drawer:** Toggleable footer drawer (off by default) showing `anon_id`, assigned `shakuni_tell_mode` variant, live rigged-roll counter (toggleable/spoiler-protected), and chronological Flagsmith event log.

---

## 3. Target Folder Architecture (Zero-Backend Static Web App)

Because all board rules and dice AI run client-side, the Express backend is removed. The app deploys as a static Vite bundle to **Vercel or Netlify** in ~2 minutes.

```text
flagsmith/
├── package.json                      # Root scripts (install:all, dev, build, simulate)
├── PLAN.md                           # This plan & refactor roadmap
├── README.md                         # Setup, deployment & Flagsmith dashboard checklist
├── client/                           # React + TypeScript + Vite + TailwindCSS game app
│   ├── .env.example
│   └── src/
│       ├── App.tsx                   # Game shell, match lifecycle, visibilitychange guardrail
│       ├── types.ts                  # Board, Pawn, RollRecord, Verdict, Experiment types
│       ├── engine/
│       │   ├── board.ts              # Cross-board coordinates, safe squares, move/capture logic
│       │   ├── diceAi.ts             # 3-stage Fair vs. Rigged Pasa AI + Proof Ledger
│       │   └── gameReducer.ts        # Pure state machine for turns, captures, accusation & win/loss
│       ├── lib/
│       │   └── flagsmith.ts          # Isolated Flagsmith SDK wrapper (refactored from WaitWise)
│       └── components/
│           ├── Header.tsx            # Sabha Parva header, rules modal trigger & theme/audio toggle
│           ├── ChausarBoard.tsx      # Interactive SVG/CSS cross-board with valid-move highlights
│           ├── DiceTray.tsx          # Animated Pasa stick dice (+ golden glint tell in treatment)
│           ├── ShakuniBanner.tsx     # Shakuni portrait, reactive dialogue & Roll History strip
│           ├── AccuseBar.tsx         # High-stakes "Call Out Rigged Dice" control & turn status
│           ├── VerdictModal.tsx      # Caught / False Accusation / Defeated proof breakdown + Play Again
│           ├── RulesModal.tsx        # 15-second quick-start rules card
│           ├── DemoSwitcher.tsx      # ?demo=true switcher (demo_silent / demo_tells)
│           └── ExperimentInspector.tsx
└── scripts/
    ├── .env.example
    └── simulate-traffic.ts           # @flagsmith/nodejs simulator for shakuni_tell_mode
```

---

## 4. Refactor Plan (WaitWise / Diff2PR → Dyuta / Chausar)

### A. Delete (No Longer Needed)
| Path | Reason |
| --- | --- |
| `server/` (entire directory) | Game engine & biased dice AI run 100% client-side; removing Express enables instant static hosting on Vercel/Netlify. |
| `client/src/lib/api.ts` | SSE streaming client for `/api/generate` is unused. |
| `client/src/data/samples.ts` | Diff2PR sample diffs are unused. |
| `client/src/components/InputPanel.tsx` | Replaced by interactive Chausar board & DiceTray. |
| `client/src/components/OutputPanel.tsx` | Replaced by ShakuniBanner, AccuseBar & VerdictModal. |
| `client/src/components/MarkdownView.tsx` | PR markdown renderer is unused. |
| `client/src/components/ThinkingSteps.tsx` | Perceived-latency progress steps are unused. |

### B. Reuse & Refactor
| Path | Refactor Changes |
| --- | --- |
| `package.json` | Remove `dev:server` and `concurrently` backend task; point `dev` and `build` directly to `client/`. Keep `simulate` pointing to `scripts/`. |
| `client/vite.config.ts` | Remove `/api` localhost:3001 proxy block. |
| `client/index.html` | Update title to `Dyuta — Catch Shakuni's Loaded Dice` and load serif display font (e.g., *Cinzel*) alongside *Inter* / *JetBrains Mono* for Sabha Parva atmosphere. |
| `client/tailwind.config.js` | Add Sabha Parva gold/crimson accent tokens and dice-roll / subtle-glint keyframe animations. |
| `client/src/types.ts` | Replace `LatencyVariant` / SSE types with `TellVariant` (`'silent_bias' \| 'subtle_tells'`), `PawnState`, `RollRecord`, `RigProof`, `MatchPhase`, and `VerdictType`. |
| `client/src/lib/flagsmith.ts` | Keep UUID persistence (`dyuta_anon_id`), `init`, `identify`, `getExperimentFlag`, `trackEvent`, and inspector event log. Swap `FLAG_KEY` to `'shakuni_tell_mode'`, demo map to `demo_silent`/`demo_tells`, and event helpers to `trackCheatCaught`, `trackPlayAgain`, `trackFalseAccusation`, and `trackMatchAbandoned`. |
| `client/src/components/DemoSwitcher.tsx` | Update options from 3 latency IDs to `demo_silent` (`silent_bias`), `demo_tells` (`subtle_tells`), and `anon_id`. |
| `client/src/components/ExperimentInspector.tsx` | Display `shakuni_tell_mode`, match turn/phase, and the 4 game events (`exposure`, `cheat_caught`, `play_again_clicked`, `false_accusation`, `match_abandoned`). |
| `client/src/components/Header.tsx` | Rebrand from `Diff2PR` to `Dyuta (Chausar)` with a compact **How to Play** button. |
| `scripts/simulate-traffic.ts` & `scripts/.env.example` | Switch `FLAG_KEY` to `shakuni_tell_mode` and simulate `cheat_caught`, `play_again_clicked`, `false_accusation`, and `match_abandoned` probabilities across `silent_bias` vs `subtle_tells`. |
| `README.md` | Replace Diff2PR instructions with Dyuta setup, Vercel/Netlify deployment steps, and updated Flagsmith dashboard checklist. |

### C. Create New
- `client/src/engine/board.ts`
- `client/src/engine/diceAi.ts`
- `client/src/engine/gameReducer.ts`
- `client/src/components/ChausarBoard.tsx`
- `client/src/components/DiceTray.tsx`
- `client/src/components/ShakuniBanner.tsx`
- `client/src/components/AccuseBar.tsx`
- `client/src/components/VerdictModal.tsx`
- `client/src/components/RulesModal.tsx`

---

## 5. Phased Execution Checklist

### Phase 1: Cleanup & Core Game Engine
- [x] Delete `/server` and unused Diff2PR client files (`api.ts`, `samples.ts`, `InputPanel`, `OutputPanel`, `MarkdownView`, `ThinkingSteps`).
- [x] Update root `package.json`, `client/vite.config.ts`, and `client/src/types.ts`.
- [x] Implement `engine/board.ts` (cross-board path, safe squares, legal moves, captures, home completion).
- [x] Implement `engine/diceAi.ts` (3-stage Fair → Subtle → Escalating bias + Proof Ledger).
- [x] Implement `engine/gameReducer.ts` (turn loop, AI auto-turn timing, accusation evaluation, win/loss states).

### Phase 2: Sabha Parva UI & Playable Experience
- [x] Build `ChausarBoard.tsx` with clear pawn tokens, safe square markers, and clickable move highlights.
- [x] Build `DiceTray.tsx` with animated *Pasa* stick dice and the conditional `subtle_tells` golden glint / settle hesitation.
- [x] Build `ShakuniBanner.tsx` (dialogue quips + compact Roll History strip) and `AccuseBar.tsx` (**"Call Out Rigged Dice"**).
- [x] Build `VerdictModal.tsx` (proof ledger breakdown + **Play Again**) and `RulesModal.tsx`.
- [x] Wire complete game flow inside `App.tsx` including landing screen ("Enter the Sabha") and `visibilitychange` abandonment listener.

### Phase 3: Flagsmith Experimentation & Traffic Simulator
- [x] Refactor `client/src/lib/flagsmith.ts`, `DemoSwitcher.tsx`, and `ExperimentInspector.tsx` for `shakuni_tell_mode`.
- [x] Refactor `scripts/simulate-traffic.ts` and `scripts/.env.example` for end-to-end Bayesian dashboard verification.
- [ ] Verify local build (`npm run build`) and test both `?demo=true` identities end-to-end.

### Phase 4: Flagsmith Cloud, Deployment & Submission
- [ ] Create `shakuni_tell_mode` multivariate flag (`silent_bias`, `subtle_tells`), metrics (`cheat_caught`, `play_again_clicked`, `false_accusation`, `match_abandoned`), and active experiment in Flagsmith Cloud.
- [ ] Set Flagsmith identity overrides for `demo_silent` and `demo_tells`.
- [ ] Deploy `client/` to Vercel/Netlify with `VITE_FLAGSMITH_ENV_KEY` configured.
- [ ] Share live URL for real player sessions, inspect Flagsmith Bayesian results, and record the demo video.
