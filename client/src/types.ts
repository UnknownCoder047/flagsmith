export type TellVariant = 'silent_bias' | 'subtle_tells';

export type DemoIdentity = 'demo_silent' | 'demo_tells';

export type ExperimentEventName =
  | 'exposure'
  | 'cheat_caught'
  | 'play_again_clicked'
  | 'false_accusation'
  | 'match_abandoned';

export interface InspectorEvent {
  id: string;
  timestamp: string;
  event: ExperimentEventName;
  identity: string;
  variant: TellVariant;
  detail?: string;
  sentToFlagsmith: boolean;
}

export type PlayerId = 'player' | 'dealer';

export interface PawnState {
  id: string;
  owner: PlayerId;
  label: string;
  /**
   * -1 = Corral (off-board)
   * 0..27 = Outer Frontier Track
   * 28..29 = Private Home Lane
   * 30 = Center Gold Vault (Home)
   */
  progress: number;
}

export interface LegalMove {
  pawnId: string;
  fromProgress: number;
  toProgress: number;
  capturedPawnId?: string;
  entersHome: boolean;
  landsOnSafe: boolean;
}

export interface RigProof {
  turn: number;
  actor: PlayerId;
  roll: number;
  reason: string;
  odds: string;
}

export interface RollRecord {
  id: string;
  turn: number;
  actor: PlayerId;
  roll: number;
  dice: [number, number, number];
  rigged: boolean;
  tellShown: boolean;
  rigReason?: string;
  odds?: string;
  moveSummary?: string;
}

export type MatchPhase =
  | 'landing'
  | 'player_roll'
  | 'player_move'
  | 'dealer_turn'
  | 'verdict';

export type VerdictType =
  | 'caught'
  | 'false_accusation'
  | 'dealer_won'
  | 'player_won';

export interface GameState {
  phase: MatchPhase;
  turn: number;
  pawns: PawnState[];
  currentRoll: number | null;
  currentDice: [number, number, number];
  isRolling: boolean;
  activeTell: boolean;
  legalMoves: LegalMove[];
  rollHistory: RollRecord[];
  proofLedger: RigProof[];
  dealerDialogue: string;
  statusBanner: string;
  lastCaptureFlash: string | null;
  verdict: VerdictType | null;
  matchStartedAt: number | null;
}
