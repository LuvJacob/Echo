/**
 * ECHO — Shared Type Definitions & Contracts
 * HackPerimeter 2026: Escape From Earth
 * 
 * Single Source of Truth for frontend (Person A) and backend/AI (Person B).
 * Any changes to this file must be coordinated between team members.
 */

// ==========================================
// 1. Avatar & System Status
// ==========================================

export type AvatarStatus = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface SystemStatus {
  online: boolean;
  avatarStatus: AvatarStatus;
  batteryLevel?: number; // 0 - 100
  signalStrength?: 'nominal' | 'degraded' | 'offline';
  lastPing: number;
}

// ==========================================
// 2. Chat & Conversation
// ==========================================

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  /** Optional proposed action requiring user confirmation */
  proposedAction?: EchoAction;
  /** Spoken text if different from full rendered message */
  speechText?: string;
  /** Visual indicators or metadata (e.g. emotion, urgency) */
  metadata?: {
    intent?: string;
    confidence?: number;
    urgent?: boolean;
    suggestedResponses?: string[];
  };
}

// ==========================================
// 3. Inventory Management
// ==========================================

export type ItemCategory = 
  | 'water'
  | 'food'
  | 'medical'
  | 'tool'
  | 'weapon'
  | 'fuel'
  | 'shelter'
  | 'comm'
  | 'other';

export type ItemSource = 'manual' | 'vision_scan' | 'voice_prompt' | 'system_seed';

/** [Person B] Simple drinking recommendation for water. */
export type WaterSafety = 'possible_contamination' | 'safety_unknown' | 'preferred';

export const WATER_SAFETY_LABEL: Record<WaterSafety, string> = {
  possible_contamination: 'CONTAMINATED — DO NOT DRINK',
  safety_unknown: 'Clear — test before drinking',
  preferred: 'Sealed — good for drinking',
};

/** [Person B] Display names for categories used in the UI and spoken confirmations. */
export const CATEGORY_LABEL: Partial<Record<ItemCategory, string>> = {
  water: 'Water',
  food: 'Rations',
  medical: 'Medical supplies',
};

/** How full a container is. Unset (undefined) means "not confirmed by the user". */
export type FillLevel = 'full' | 'three_quarters' | 'half' | 'quarter' | 'empty';

export interface InventoryItem {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  unit: string; // e.g., 'bottles', 'cans', 'liters', 'packs', 'units'
  source: ItemSource;
  updatedAt: number; // Unix epoch ms
  notes?: string;
  expiryDate?: string; // ISO date string if applicable
  caloriesPerUnit?: number;
  /** [Person B, additive] Capacity of ONE unit in millilitres, only if confirmed. */
  unitVolumeMl?: number;
  /** [Person B, additive] Confirmed fill level. Unset = unknown, excluded from litre totals. */
  fillLevel?: FillLevel;
  /** [Person B, additive] Free-text storage location, e.g. "locker seven". */
  location?: string;
  /** [Person B, additive] Visual observations (e.g. "liquid looks green"). */
  observations?: string[];
  /** [Person B, additive] Drinking recommendation for water items. */
  waterSafety?: WaterSafety;
}

export interface InventorySummary {
  totalItems: number;
  waterSupplyLiters: number;
  foodSupplyDays: number;
  lastUpdated: number;
}

// ==========================================
// 4. Vision & Photo Analysis
// ==========================================

export interface DetectedObject {
  name: string;
  category: ItemCategory;
  quantity: number;
  unit: string;
  confidence: number; // 0.0 - 1.0
  notes?: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface VisionResult {
  detectedObjects: DetectedObject[];
  rawDescription: string;
  uncertaintyNotes: string[];
  safetyConcerns: string[];
  suggestedAction?: EchoAction;
  processedAt: number;
}

// ==========================================
// 5. Locations, Navigation & Hazards
// ==========================================

export interface SavedLocation {
  id: string;
  label: string;
  notes: string;
  latitude: number;
  longitude: number;
  createdAt: number;
  category?: 'shelter' | 'water_source' | 'supply_cache' | 'rendezvous' | 'danger_zone';
}

export type HazardType = 
  | 'radiation'
  | 'chemical'
  | 'structural'
  | 'biohazard'
  | 'extreme_weather'
  | 'hostile';

export interface HazardReport {
  id: string;
  title: string;
  type: HazardType;
  latitude: number;
  longitude: number;
  reportedAt: number;
  verificationStatus: 'verified' | 'unverified' | 'demo_only';
  isDemo: boolean;
  severity?: 'low' | 'moderate' | 'critical';
  details?: string;
}

// ==========================================
// 6. ECHO Actions (Discriminated Union)
// ==========================================

export type InventoryUpdateAction = {
  type: 'inventory_update';
  operation: 'add' | 'remove' | 'set' | 'clear';
  item: Omit<InventoryItem, 'id' | 'updatedAt'> & { id?: string };
  reason?: string;
  confidence?: number;
  /** [Person B, additive] When set, applying this action twice is a no-op (idempotent). */
  proposalId?: string;
};

export type SaveLocationAction = {
  type: 'save_location';
  location: Omit<SavedLocation, 'id' | 'createdAt'> & { id?: string };
  reason?: string;
};

export type RecallMemoryAction = {
  type: 'recall_memory';
  query: string;
  context?: string;
};

export type AlertHazardAction = {
  type: 'alert_hazard';
  hazard: Omit<HazardReport, 'id' | 'reportedAt'> & { id?: string };
};

export type EchoAction =
  | InventoryUpdateAction
  | SaveLocationAction
  | RecallMemoryAction
  | AlertHazardAction;

// ==========================================
// 7. API Request / Response Contracts
// ==========================================

// --- POST /api/chat ---
export interface ChatApiRequest {
  message: string;
  history?: ChatMessage[];
  inventorySnapshot?: InventoryItem[];
  currentLocation?: { latitude: number; longitude: number };
  systemPromptOverride?: string;
}

export interface ChatApiResponse {
  success: boolean;
  reply: string;
  speechText?: string;
  avatarStatus?: AvatarStatus;
  proposedAction?: EchoAction;
  error?: string;
}

// --- POST /api/vision ---
export interface VisionApiRequest {
  /** Base64 data URL or image binary reference */
  image: string;
  mimeType?: string;
  prompt?: string;
  inventorySnapshot?: InventoryItem[];
}

export interface VisionApiResponse {
  success: boolean;
  result?: VisionResult;
  proposedAction?: EchoAction;
  error?: string;
  /** [Person B, additive] Validated, editable proposal. Prefer this over `result`. */
  proposal?: InventoryProposal;
  /** [Person B, additive] Machine-readable error code. */
  errorCode?: EchoErrorCode;
  /** [Person B, additive] True when served by the labelled offline fixture (no API key). */
  mock?: boolean;
}

// ==========================================
// 8. [Person B, additive] Proposals, receipts, errors
// ==========================================

export type EchoErrorCode =
  | 'no_api_key'
  | 'mic_denied'
  | 'mic_unavailable'
  | 'playback_failed'
  | 'connection_failed'
  | 'provider_error'
  | 'invalid_model_output'
  | 'invalid_request'
  | 'save_failed'
  | 'proposal_not_found'
  | 'unknown';

export interface EchoError {
  code: EchoErrorCode;
  message: string; // human-readable, safe to show in UI
}

/** One line of a proposal. Nullable fields are UNKNOWN until the user fills them in. */
export interface ProposedItem {
  name: string;
  category: ItemCategory;
  quantity: number;
  unit: string;
  unitVolumeMl: number | null;
  fillLevel: FillLevel | null;
  location: string | null;
  observations: string[];
  /** Legacy field, always 'undetermined'. Use waterSafety for the recommendation. */
  drinkability: 'undetermined';
  /** Water only: contaminated (tint/cloudy) / clear-test-first / sealed-good. */
  waterSafety?: WaterSafety;
  confidence: number; // 0..1
}

export interface InventoryProposal {
  id: string; // idempotency key
  source: ItemSource;
  operation: 'add';
  items: ProposedItem[];
  summary: string;
  uncertaintyNotes: string[];
  createdAt: number;
  status: 'pending' | 'confirmed' | 'rejected';
}

/** Returned ONLY after the write to the canonical store succeeded and was read back. */
export interface InventoryReceipt {
  proposalId: string;
  appliedAt: number;
  itemIds: string[];
  /** True when this proposal had already been applied; nothing was written twice. */
  duplicate: boolean;
  totals: InventoryTotals;
}

export interface InventoryTotals {
  /** Litres from water items with confirmed quantity, unitVolumeMl AND fillLevel. */
  waterLiters: number;
  waterContainers: number;
  /** Water containers missing volume or fill level (not counted in waterLiters). */
  waterContainersUnknownVolume: number;
  totalItems: number;
}

export type EchoResult<T> = { ok: true; value: T } | { ok: false; error: EchoError };

// --- POST /api/voice ---
export interface VoiceApiRequest {
  /** Audio blob base64 or audio format specifier */
  audioData?: string;
  textToSpeak?: string;
  action?: 'transcribe' | 'synthesize';
}

export interface VoiceApiResponse {
  success: boolean;
  transcription?: string;
  audioUrl?: string;
  speechDurationMs?: number;
  error?: string;
}
