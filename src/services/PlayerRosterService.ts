// PlayerRosterService.ts
// Lightweight persistence for the Draft card's player roster using localStorage.

export interface RosterEntry {
  name: string;
  pickCount: number;
}

const STORAGE_KEY = 'goa_player_roster_v1';

const sortRoster = (entries: RosterEntry[]): RosterEntry[] =>
  [...entries].sort((a, b) => b.pickCount - a.pickCount || a.name.localeCompare(b.name));

const normalizeEntries = (raw: unknown): RosterEntry[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e): e is RosterEntry => typeof e?.name === 'string' && typeof e?.pickCount === 'number')
    .map(e => ({ name: e.name, pickCount: e.pickCount }));
};

export function loadRoster(): RosterEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return sortRoster(normalizeEntries(JSON.parse(raw)));
  } catch (e) {
    console.warn('Failed to load player roster', e);
    return [];
  }
}

function saveRoster(entries: RosterEntry[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.warn('Failed to save player roster', e);
  }
}

// Upserts a pick for `name` (trimmed, case-insensitive match) and persists.
// Returns the full roster, re-sorted by pick count.
export function recordPick(name: string): RosterEntry[] {
  const trimmed = name.trim();
  if (!trimmed) return loadRoster();

  const entries = loadRoster();
  const existing = entries.find(e => e.name.toLowerCase() === trimmed.toLowerCase());
  if (existing) {
    existing.pickCount += 1;
  } else {
    entries.push({ name: trimmed, pickCount: 1 });
  }

  const sorted = sortRoster(entries);
  saveRoster(sorted);
  return sorted;
}

export default {
  load: loadRoster,
  recordPick
};
