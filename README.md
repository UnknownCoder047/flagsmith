# Deadwood Dice — Western Biased-Dice Game & Flagsmith A/B Test

Built for **WeMakeDevs × Flagsmith — Toggle Wars** (*Track 1: "Test Something Real"*).

**Deadwood Dice** is a fast, 2–3 minute browser-based frontier board duel against riverboat sharper **Silas Vance (AI)** featuring a covert biased-dice engine and a live **Flagsmith Experimentation** A/B test measuring whether subtle diegetic tells help players catch loaded dice without increasing false accusations.

---

## Experiment Design (`sharper_tell_mode`)

- **Multivariate Flag:** `sharper_tell_mode` (50/50 split)
  - `silent_bias` **(Control):** Silas rigs rolls covertly from Turn 4 onward; players rely solely on the **Table Roll Log** and board patterns to spot anomalies.
  - `subtle_tells` **(Treatment):** Rigged rolls include subtle diegetic tells—a faint brass glint on the center die, a slight settle hesitation, and a dry saloon remark from Silas.
- **Hypothesis:** *Adding subtle visual and narrative tells when Silas rigs the dice increases the rate of players catching the cheat (`cheat_caught`) and replaying (`play_again_clicked`), without increasing false accusations (`false_accusation`).*

### Metrics & Events
| Role | Event Name | Trigger |
| --- | --- | --- |
| Exposure | `$flag_exposure` | Player clicks **"Pull Up a Chair · Deal In"** (never on landing load) |
| Primary (`Up`) | `cheat_caught` | Player clicks **"Call Out Loaded Dice"** with `>= 2` rigged rolls logged |
| Secondary (`Up`) | `play_again_clicked` | Player clicks **"Play Again"** after any verdict |
| Guardrail 1 (`Down`) | `false_accusation` | Player accuses Silas with `0–1` rigged rolls logged |
| Guardrail 2 (`Down`) | `match_abandoned` | Player folds or switches/hides the tab mid-match (`visibilitychange`) |

---

## Local Development

```bash
# 1. Install client & simulator dependencies
npm run install:all

# 2. Configure Flagsmith Client-Side Environment Key (optional for local fallback)
cp client/.env.example client/.env
# Set VITE_FLAGSMITH_ENV_KEY=<your_client_side_key>

# 3. Start the Vite dev server
npm run dev
```

### Demo Mode & Experiment Inspector
- Open `http://localhost:5173/?demo=true` to reveal the floating **Demo Mode** switcher (`demo_silent`, `demo_tells`, and real `anon_id`).
- Events from `demo_silent` / `demo_tells` are **never sent** to Flagsmith (they show in the inspector as "demo identity: not sent"), so judge demos cannot pollute experiment results. The real `anon_id` still sends, tagged `demo: true`.
- Click **Experiment Inspector** in the footer to view live Flagsmith connection status, assigned `sharper_tell_mode` variant, spoiler-protected rigged roll counter, and chronological event log.

---

## Deploying to Vercel or Netlify (Static Zero-Backend Build)

Deploy `client/` directly as a static Vite app:

- **Root Directory:** `client`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Environment Variable:** `VITE_FLAGSMITH_ENV_KEY` (your Flagsmith Client-Side Environment Key)

---

## Flagsmith Cloud Setup Checklist

1. Get both keys from **Environment Settings → SDK Keys** of the same environment:
   - Client-side key → `client/.env` as `VITE_FLAGSMITH_ENV_KEY`.
   - Server-side key (starts with `ser.`) → `scripts/.env` as `FLAGSMITH_SERVER_KEY` (simulator only).
2. Create multivariate feature flag `sharper_tell_mode` (enabled) with string variants:
   - `silent_bias` (control, 50%)
   - `subtle_tells` (50%)
3. Create Experimentation metrics. The event name must match exactly and appears in the dropdown only after Flagsmith has received that event once (a few minutes), so play one match or run the simulator first. All are **Occurrence**:
   - `cheat_caught` — Higher is better — Primary
   - `play_again_clicked` — Higher is better — Secondary
   - `false_accusation` — Lower is better — Guardrail
   - `match_abandoned` — Lower is better — Guardrail
   
   Experiment hypothesis (paste into the experiment form):
   > If we add subtle visual and narrative tells when the dealer rigs the dice (`subtle_tells`), more players will catch the cheat (`cheat_caught`) and replay (`play_again_clicked`) than with the current silent bias (`silent_bias`), without increasing false accusations (`false_accusation`) or abandoned matches (`match_abandoned`).
3. Start the experiment on `sharper_tell_mode`.
4. Add Identity Overrides for live judge demos:
   - `demo_silent` → `silent_bias`
   - `demo_tells` → `subtle_tells`
5. *(Optional)* Verify your Bayesian dashboard end-to-end with the traffic simulator (results appear on the experiment's **Results** page; events can take a few minutes to ingest):
   ```bash
   cp scripts/.env.example scripts/.env
   # Add FLAGSMITH_SERVER_KEY=ser.xxxxx from a SEPARATE, non-production environment
   # and set SIM_CONFIRM_SEPARATE_ENV=yes
   npm run simulate
   ```
   > The simulator sends **fabricated** outcomes (the `PROB_*` rates), tagged `simulated: true`. It never reflects real player behaviour, so keep it out of the environment that holds real results.
