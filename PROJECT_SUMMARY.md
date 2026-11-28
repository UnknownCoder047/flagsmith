# Project Summary — Deadwood Dice

## What it is

Browser board game plus a live Flagsmith A/B experiment. Built for the WeMakeDevs × Flagsmith "Toggle Wars" hackathon (Track 1: "Test Something Real").

The player ("Marshal") plays a 2–3 minute frontier duel against an AI riverboat sharper, **Silas Vance**. Silas secretly rigs his dice rolls. The player can call out the loaded dice at any time.

The experiment tests whether subtle "tells" help players catch the cheat without increasing false accusations.

## Stack

| Area | Choice |
| --- | --- |
| UI | React 18, TypeScript, Vite 6, Tailwind 3 |
| Animation / icons | GSAP, lucide-react |
| Experimentation | `@flagsmith/flagsmith` (client SDK) |
| Backend | None. Static bundle, deploys to Vercel or Netlify (root `client`, output `dist`) |
| Simulator | `scripts/simulate-traffic.ts`, uses `@flagsmith/nodejs`, `dotenv` |

## Layout

```
/
├── package.json        root scripts: install:all, dev, build, preview, simulate
├── README.md           setup, deploy, Flagsmith dashboard checklist
├── PLAN.md             original design plan (stale, see Notes)
├── client/
│   ├── .env.example    VITE_FLAGSMITH_ENV_KEY (optional VITE_FLAGSMITH_API_URL)
│   └── src/
│       ├── App.tsx             game shell, match lifecycle, effects, metric triggers (643 lines)
│       ├── types.ts            shared types (pawns, rolls, phases, verdicts, events)
│       ├── engine/
│       │   ├── board.ts        9x9 cross board, 28-square ring, safe squares, home lanes, legal moves
│       │   ├── diceAi.ts       fair vs rigged roll decisions, proof ledger, odds text, dealer quips
│       │   ├── gameReducer.ts  pure state machine (turns, captures, call-out, reset)
│       │   └── sound.ts        dice sound + mute
│       ├── lib/flagsmith.ts    Flagsmith wrapper, identity, fallback, event tracking
│       └── components/         DeadwoodBoard, DiceTray, DealerBanner, AccuseBar, Header,
│                               RulesModal, InGameRulesCard, VerdictModal,
│                               ExperimentInspector, DemoSwitcher
└── scripts/            traffic simulator
```

## Game rules

- 2 pawns per side. 28-square outer track, 2-square private home lane, center Gold Vault (home).
- Pawn `progress`: `-1` corral, `0..27` outer track, `28..29` home lane, `30` home.
- Landing on an opponent pawn sends it back to the corral, except on safe squares (indexes 0, 6, 13, 14, 20, 27).
- Player entry is ring index 0. Silas entry is ring index 14.
- Three dice map to a roll of 1–6.
- Match phases: `landing`, `player_roll`, `player_move`, `dealer_turn`, `verdict`.
- Reducer actions: `START_MATCH`, `PLAYER_ROLL_START`, `PLAYER_ROLL_COMPLETE`, `PLAYER_MOVE_PAWN`, `DEALER_ROLL_START`, `DEALER_ROLL_COMPLETE`, `DEALER_MOVE_COMPLETE`, `CALL_OUT_DEALER`, `RESET_TO_LANDING`.

### Rigging (`diceAi.ts`)

| Turns | Behavior |
| --- | --- |
| 1–3 | Fair, no bias |
| 4–6 | Low-profile nudges, about 32% bias, cooldown between rigs |
| 7–10 | About 50% bias, at least 2 rigs guaranteed by turn 8 |
| 11+ | Endgame, about 68% bias |

Each rigged roll goes into a proof ledger with turn, roll, reason and odds text. Rolls are scored by captures, safe squares and home entry. Silas can also nudge the player's rolls.

### Call-out outcomes

- Ledger has at least 2 rigged rolls: caught, player wins.
- Ledger has 0–1 rigged rolls: false accusation, player loses.
- Silas reaches home first: dealer won, followed by a reveal of the rigged rolls.

## Experiment

Flag: `sharper_tell_mode`, 50/50 multivariate.

- `silent_bias` (control): rigging with no tells. The player uses the roll log only.
- `subtle_tells` (treatment): brass glint on the center die, settle hesitation, dry quip from Silas.

| Event | Role | Trigger |
| --- | --- | --- |
| `$flag_exposure` | Exposure | Click "Deal In" (never on page load) |
| `cheat_caught` | Primary (up) | Valid call-out |
| `play_again_clicked` | Secondary (up) | "Play Again" after a verdict |
| `false_accusation` | Guardrail (down) | Call-out with 0–1 rigs |
| `match_abandoned` | Guardrail (down) | Forfeit, or tab hidden mid-match (`visibilitychange`) |

### `lib/flagsmith.ts`

- Anonymous UUID stored in `localStorage` (`deadwood_anon_id`) is the Flagsmith identity.
- No env key, or init failure: deterministic local fallback. The variant comes from an FNV-style hash of the identity, so each identity always gets the same variant.
- Exposure uses `getExperimentFlag` when the SDK provides it. Otherwise it falls back to `getValue`.
- Metrics go through `trackEvent`. Every event is also mirrored into an in-app inspector log (last 50).
- State is a module-level store with `subscribeFlagsmith` listeners.

### Demo tooling

- `?demo=true` shows the DemoSwitcher: `demo_silent`, `demo_tells`, or the real `anon_id`.
- ExperimentInspector shows connection status, variant, a spoiler-protected rig counter, and the event log.

### Traffic simulator

`npm run simulate [N]` creates N fake players. Per-variant probabilities are configurable via env (for example `PROB_SILENT_CAUGHT`, default 0.34). It sends exposure and outcome events so the Bayesian dashboard can be checked. Outcomes are fabricated from those rates. Every event is tagged `simulated: true`, and it also sends `match_completed`. It refuses to run until `SIM_CONFIRM_SEPARATE_ENV=yes` is set. Use a separate, non-production environment. Needs `FLAGSMITH_SERVER_KEY` in `scripts/.env`.

## Run

```bash
npm run install:all
cp client/.env.example client/.env   # set VITE_FLAGSMITH_ENV_KEY (optional)
npm run dev                          # http://localhost:5173
npm run build                        # tsc -b && vite build
npm run check                        # offline engine + variant self-check
```

## Git state

- Branch `main`. Commits: Initial commit, "DD-1 Bug Fixes and UI Improvements", merge of PR #1.

## Notes and risks

- `PLAN.md` was updated to match the code. `ChausarBoard` was renamed `DeadwoodBoard`, and `tsconfig.tsbuildinfo` is untracked.
- Tests: `npm run check` runs `scripts/game-check.ts` (variant mapping, dice AI rules, call-out verdicts). No UI tests.
- All game logic and rigging run client-side. A player could read the source to see the rigging. That is fine for a demo, not for real stakes.
- Fallback assignment is hash-based, not random, so it only approximates a 50/50 split.
