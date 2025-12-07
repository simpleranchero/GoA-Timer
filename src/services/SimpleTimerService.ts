// SimpleTimerService.ts
// Lightweight persistence for the Simple Timer settings using localStorage.

export interface SimpleTimerState {
  strategyTime: number;
  moveTime: number;
  strategyTimerEnabled: boolean;
  moveTimerEnabled: boolean;
  levelUpTime?: number;
  levelUpTimerEnabled?: boolean;
  soundTickEnabled?: boolean;
  soundWarningEnabled?: boolean;
  soundCompleteEnabled?: boolean;
}

const STORAGE_KEY = 'goa_simple_timer_state_v2';
const LEGACY_STORAGE_KEY = 'goa_simple_timer_state_v1';

const normalizeBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback;

const normalizeNumber = (value: unknown, fallback: number) =>
  typeof value === 'number' ? value : fallback;

const normalizeState = (raw: any): SimpleTimerState | null => {
  if (typeof raw !== 'object' || raw === null) return null;
  if (typeof raw.strategyTime !== 'number' || typeof raw.moveTime !== 'number') return null;

  return {
    strategyTime: normalizeNumber(raw.strategyTime, 120),
    moveTime: normalizeNumber(raw.moveTime, 90),
    strategyTimerEnabled: normalizeBoolean(raw.strategyTimerEnabled, true),
    moveTimerEnabled: normalizeBoolean(raw.moveTimerEnabled, true),
    levelUpTime: normalizeNumber(raw.levelUpTime, 120),
    levelUpTimerEnabled: normalizeBoolean(raw.levelUpTimerEnabled, true),
    soundTickEnabled: normalizeBoolean(raw.soundTickEnabled, false),
    soundWarningEnabled: normalizeBoolean(raw.soundWarningEnabled, true),
    soundCompleteEnabled: normalizeBoolean(raw.soundCompleteEnabled, true)
  };
};

export function loadSimpleTimerState(): SimpleTimerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return normalizeState(parsed);
  } catch (e) {
    console.warn('Failed to load simple timer state', e);
    return null;
  }
}

export function saveSimpleTimerState(state: SimpleTimerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Remove legacy storage once we write v2
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to save simple timer state', e);
  }
}

export function clearSimpleTimerState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear simple timer state', e);
  }
}

export default {
  load: loadSimpleTimerState,
  save: saveSimpleTimerState,
  clear: clearSimpleTimerState
};
