/**
 * Isolated Flagsmith Experimentation SDK Wrapper for Deadwood Dice.
 *
 * Aligns with Flagsmith Experimentation JS SDK (@flagsmith/flagsmith ^12.4.0):
 *  - `enableEvents: true` enables exposure & conversion event ingestion.
 *  - `flagsmith.identify(identity)` binds a persistent anonymous UUID (or ?demo=true override ID).
 *  - `flagsmith.getValue('sharper_tell_mode')` reads the assigned variant WITHOUT recording exposure.
 *  - `flagsmith.getExperimentFlag('sharper_tell_mode')` records `$flag_exposure` ONLY when the user
 *    clicks "Deal In" / "Start Match" (never on landing page load).
 *  - `flagsmith.trackEvent(...)` records primary, secondary, and guardrail metrics:
 *      - Primary:    `cheat_caught`
 *      - Secondary:  `play_again_clicked`
 *      - Guardrail1: `false_accusation`
 *      - Guardrail2: `match_abandoned`
 */

import flagsmith from '@flagsmith/flagsmith';
import type {
  DemoIdentity,
  ExperimentEventName,
  InspectorEvent,
  TellVariant,
} from '../types';

export const FLAG_KEY = 'sharper_tell_mode';
export const ANON_ID_STORAGE_KEY = 'deadwood_anon_id';

export const VALID_VARIANTS: readonly TellVariant[] = [
  'silent_bias',
  'subtle_tells',
] as const;

const DEMO_FALLBACK_MAP: Record<DemoIdentity, TellVariant> = {
  demo_silent: 'silent_bias',
  demo_tells: 'subtle_tells',
};

interface FlagsmithExperimentClient {
  getExperimentFlag?: (featureName: string) => { value?: unknown; enabled?: boolean } | unknown;
  trackEvent?: (
    eventName: string,
    opts?: { value?: number; metadata?: Record<string, string | number | boolean> },
  ) => void;
}

const typedFlagsmith = flagsmith as typeof flagsmith & FlagsmithExperimentClient;

export interface FlagsmithStateSnapshot {
  initialized: boolean;
  connectedToCloud: boolean;
  identity: string;
  anonId: string;
  isDemoMode: boolean;
  variant: TellVariant;
  events: InspectorEvent[];
}

type StateListener = (snapshot: FlagsmithStateSnapshot) => void;

const listeners = new Set<StateListener>();

let state: FlagsmithStateSnapshot = {
  initialized: false,
  connectedToCloud: false,
  identity: '',
  anonId: '',
  isDemoMode: false,
  variant: 'silent_bias',
  events: [],
};

function notify(): void {
  const snapshot: FlagsmithStateSnapshot = {
    ...state,
    events: [...state.events],
  };
  listeners.forEach((listener) => listener(snapshot));
}

export function subscribeFlagsmith(listener: StateListener): () => void {
  listeners.add(listener);
  listener({ ...state, events: [...state.events] });
  return () => {
    listeners.delete(listener);
  };
}

export function getFlagsmithSnapshot(): FlagsmithStateSnapshot {
  return { ...state, events: [...state.events] };
}

function generateUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getOrCreateAnonId(): string {
  try {
    const existing = localStorage.getItem(ANON_ID_STORAGE_KEY);
    if (existing && existing.trim().length > 0) {
      return existing;
    }
    const created = generateUuid();
    localStorage.setItem(ANON_ID_STORAGE_KEY, created);
    return created;
  } catch {
    return generateUuid();
  }
}

export function isDemoModeUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('demo') === 'true';
}

function deterministicFallbackVariant(identity: string): TellVariant {
  if (identity in DEMO_FALLBACK_MAP) {
    return DEMO_FALLBACK_MAP[identity as DemoIdentity];
  }
  let hash = 2166136261;
  for (let i = 0; i < identity.length; i++) {
    hash ^= identity.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return VALID_VARIANTS[Math.abs(hash) % VALID_VARIANTS.length];
}

function coerceVariant(raw: unknown, fallbackIdentity: string): TellVariant {
  if (typeof raw === 'string' && VALID_VARIANTS.includes(raw as TellVariant)) {
    return raw as TellVariant;
  }
  return deterministicFallbackVariant(fallbackIdentity);
}

function pushInspectorEvent(
  event: ExperimentEventName,
  sentToFlagsmith: boolean,
  detail?: string,
): void {
  const entry: InspectorEvent = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toLocaleTimeString([], {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    event,
    identity: state.identity,
    variant: state.variant,
    detail,
    sentToFlagsmith,
  };
  state = {
    ...state,
    events: [entry, ...state.events].slice(0, 50),
  };
  notify();
}

export async function initFlagsmithExperiment(): Promise<FlagsmithStateSnapshot> {
  const anonId = getOrCreateAnonId();
  const demoMode = isDemoModeUrl();
  const envKey = (import.meta.env.VITE_FLAGSMITH_ENV_KEY as string | undefined)?.trim() || '';
  const apiUrl = (import.meta.env.VITE_FLAGSMITH_API_URL as string | undefined)?.trim();

  state = {
    ...state,
    anonId,
    identity: anonId,
    isDemoMode: demoMode,
    variant: deterministicFallbackVariant(anonId),
  };
  notify();

  if (!envKey) {
    state = {
      ...state,
      initialized: true,
      connectedToCloud: false,
      variant: deterministicFallbackVariant(anonId),
    };
    notify();
    return getFlagsmithSnapshot();
  }

  try {
    await flagsmith.init({
      environmentID: envKey,
      identity: anonId,
      ...(apiUrl ? { api: apiUrl } : {}),
      ...({ enableEvents: true } as Record<string, unknown>),
      defaultFlags: {
        [FLAG_KEY]: { enabled: true, value: deterministicFallbackVariant(anonId) },
      },
    });

    const resolved = coerceVariant(flagsmith.getValue(FLAG_KEY), anonId);
    state = {
      ...state,
      initialized: true,
      connectedToCloud: true,
      variant: resolved,
    };
    notify();
  } catch (err) {
    console.warn('[Deadwood/Flagsmith] Init failed, running in local fallback mode:', err);
    state = {
      ...state,
      initialized: true,
      connectedToCloud: false,
      variant: deterministicFallbackVariant(anonId),
    };
    notify();
  }

  return getFlagsmithSnapshot();
}

export async function switchIdentity(nextIdentity: string): Promise<TellVariant> {
  if (state.connectedToCloud) {
    try {
      await flagsmith.identify(nextIdentity);
      const resolved = coerceVariant(flagsmith.getValue(FLAG_KEY), nextIdentity);
      state = {
        ...state,
        identity: nextIdentity,
        variant: resolved,
      };
      notify();
      return resolved;
    } catch (err) {
      console.warn('[Deadwood/Flagsmith] identify() failed, falling back locally:', err);
    }
  }

  const fallback = deterministicFallbackVariant(nextIdentity);
  state = {
    ...state,
    identity: nextIdentity,
    variant: fallback,
  };
  notify();
  return fallback;
}

export function triggerExperimentExposure(): TellVariant {
  let sentToCloud = false;
  let activeVariant = state.variant;

  if (state.connectedToCloud) {
    try {
      if (typeof typedFlagsmith.getExperimentFlag === 'function') {
        const result = typedFlagsmith.getExperimentFlag(FLAG_KEY);
        const rawValue =
          result && typeof result === 'object' && 'value' in result
            ? (result as { value?: unknown }).value
            : result;
        activeVariant = coerceVariant(rawValue ?? flagsmith.getValue(FLAG_KEY), state.identity);
        sentToCloud = true;
      } else {
        activeVariant = coerceVariant(flagsmith.getValue(FLAG_KEY), state.identity);
      }
    } catch (err) {
      console.warn('[Deadwood/Flagsmith] getExperimentFlag failed:', err);
    }
  }

  if (activeVariant !== state.variant) {
    state = { ...state, variant: activeVariant };
  }

  pushInspectorEvent(
    'exposure',
    sentToCloud,
    `flag=${FLAG_KEY} variant=${activeVariant}`,
  );
  return activeVariant;
}

function sendMetricEvent(
  eventName: Exclude<ExperimentEventName, 'exposure'>,
  metadata: Record<string, string | number | boolean>,
  detail: string,
): void {
  let sentToCloud = false;

  if (state.connectedToCloud && typeof typedFlagsmith.trackEvent === 'function') {
    try {
      typedFlagsmith.trackEvent(eventName, {
        metadata: {
          variant: state.variant,
          ...metadata,
        },
      });
      sentToCloud = true;
    } catch (err) {
      console.warn(`[Deadwood/Flagsmith] trackEvent(${eventName}) failed:`, err);
    }
  }

  pushInspectorEvent(eventName, sentToCloud, detail);
}

export function trackCheatCaught(turn: number, riggedCount: number): void {
  sendMetricEvent(
    'cheat_caught',
    { turn, rigged_count: riggedCount },
    `turn=${turn} rigged=${riggedCount}`,
  );
}

export function trackPlayAgain(previousVerdict: string, turn: number): void {
  sendMetricEvent(
    'play_again_clicked',
    { previous_verdict: previousVerdict, turn },
    `after=${previousVerdict} turn=${turn}`,
  );
}

export function trackFalseAccusation(turn: number, riggedCount: number): void {
  sendMetricEvent(
    'false_accusation',
    { turn, rigged_count: riggedCount },
    `turn=${turn} rigged=${riggedCount}`,
  );
}

export function trackMatchAbandoned(
  reason: 'tab_hidden' | 'forfeit',
  turn: number,
  elapsedMs: number,
): void {
  sendMetricEvent(
    'match_abandoned',
    { reason, turn, elapsed_ms: elapsedMs },
    `reason=${reason} turn=${turn} after=${(elapsedMs / 1000).toFixed(1)}s`,
  );
}

export function clearInspectorEvents(): void {
  state = { ...state, events: [] };
  notify();
}
