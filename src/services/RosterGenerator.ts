// src/services/RosterGenerator.ts
// Pure balancing algorithm for the Draft card's roster-generation buttons.
// See thoughts/requirements/refined/4-roster.md (REQ-4 R3-R9) and
// thoughts/requirements/refined/7.1-draft-enchant.md (REQ-7.1 Part A) for the
// rules this implements.

export type IndicatorColor = 'gray' | 'blue' | 'red';
export type IndicatorMode = 'UNO' | 'DUO' | 'TRI' | 'ANY';
export type TeamColor = 'blue' | 'red';

export interface RosterPlayer {
  name: string;
  color: IndicatorColor;
  mode: IndicatorMode;
}

export interface GeneratedRoster {
  blue: string[];
  red: string[];
}

interface Assignment {
  name: string;
  team: TeamColor | null;
  mode: IndicatorMode;
}

const heroesOf = (mode: IndicatorMode): number => {
  if (mode === 'DUO') return 2;
  if (mode === 'TRI') return 3;
  return 1; // UNO, and ANY before any promotion
};

function totals(assignments: Assignment[]): Record<TeamColor, number> {
  const t: Record<TeamColor, number> = { blue: 0, red: 0 };
  for (const a of assignments) {
    if (a.team) t[a.team] += heroesOf(a.mode);
  }
  return t;
}

function modeCount(assignments: Assignment[], team: TeamColor, mode: 'DUO' | 'TRI'): number {
  return assignments.filter(a => a.team === team && a.mode === mode).length;
}

function pickRandom<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

// Greedy gray placement per REQ-4 Caveat 5: list order, onto whichever team
// currently has fewer heroes (fixed-color players' hero weight already in).
function greedyGraySides(assignments: Assignment[], grayIndices: number[]): TeamColor[] {
  const working = assignments.map(a => ({ ...a }));
  const sides: TeamColor[] = [];
  for (const idx of grayIndices) {
    const t = totals(working);
    const side: TeamColor = t.blue <= t.red ? 'blue' : 'red';
    working[idx].team = side;
    sides.push(side);
  }
  return sides;
}

// Tries one full team placement (all gray players resolved to a side) and
// checks whether it can be closed out to satisfy R4/R6 (equal split, color
// preference) via at most one ANY -> DUO and, if `allowTri`, at most one
// ANY -> TRI promotion per team (REQ-7.1 R4-R6). A team's gap to its target
// is 0, 1 (DUO alone: +1), 2 (TRI alone: +2) or 3 (DUO + TRI: +3) — DUO alone
// can never close a 2 or 3 gap and TRI alone can never close a 1 gap, so
// which promotion(s) a team takes falls straight out of the gap size *within
// one placement*. But different gray-player placements can produce different
// gaps for the same Current Players set, and some of those alternate
// placements might be closable without any TRI at all — so "prefer DUO to
// TRI" (REQ-7.1 Caveat 3) has to be enforced by trying every placement with
// `allowTri: false` first (generateRoster below), not just within a single
// placement's branch logic.
function tryPlacement(
  assignments: Assignment[],
  heroesPerTeam: number,
  allowTri: boolean
): Assignment[] | null {
  const t = totals(assignments);
  const result = assignments.map(a => ({ ...a }));

  for (const team of ['blue', 'red'] as TeamColor[]) {
    const needed = heroesPerTeam - t[team];
    if (needed < 0 || needed > (allowTri ? 3 : 1)) return null;
    if (needed === 0) continue;

    const hasDuo = modeCount(result, team, 'DUO') >= 1;
    const hasTri = modeCount(result, team, 'TRI') >= 1;
    const anyOnTeam = () => result.filter(a => a.team === team && a.mode === 'ANY');

    if (needed === 1) {
      if (hasDuo) return null;
      const candidates = anyOnTeam();
      if (candidates.length === 0) return null;
      pickRandom(candidates).mode = 'DUO';
    } else if (needed === 2) {
      if (hasTri) return null;
      const candidates = anyOnTeam();
      if (candidates.length === 0) return null;
      pickRandom(candidates).mode = 'TRI';
    } else {
      // needed === 3: one ANY -> DUO and a different ANY -> TRI (REQ-7.1 R6:
      // one DUO AND one TRI is allowed on the same team).
      if (hasDuo || hasTri) return null;
      const candidates = anyOnTeam();
      if (candidates.length < 2) return null;
      const shuffled = [...candidates].sort(() => Math.random() - 0.5);
      shuffled[0].mode = 'DUO';
      shuffled[1].mode = 'TRI';
    }
  }

  return result;
}

// Returns null when no assignment satisfies R4 (equal heroes per team), R6
// (color preference), and the one-DUO/one-TRI-per-team caps (REQ-7.1 R6) for
// the given target.
export function generateRoster(players: RosterPlayer[], targetHeroes: number): GeneratedRoster | null {
  if (players.length === 0) return null;
  const heroesPerTeam = targetHeroes / 2;

  const base: Assignment[] = players.map(p => ({
    name: p.name,
    team: p.color === 'gray' ? null : p.color,
    mode: p.mode
  }));

  // Fixed-color DUO/TRI players already breaking a per-team cap make this
  // Current Players set infeasible regardless of target (REQ-7.1 R6).
  if (
    modeCount(base, 'blue', 'DUO') > 1 || modeCount(base, 'red', 'DUO') > 1 ||
    modeCount(base, 'blue', 'TRI') > 1 || modeCount(base, 'red', 'TRI') > 1
  ) return null;

  const grayIndices = base.reduce<number[]>((acc, a, i) => {
    if (a.team === null) acc.push(i);
    return acc;
  }, []);

  // Try the Caveat-5 greedy gray placement first, so every case that already
  // worked keeps producing the same result. If it can't be closed out to hit
  // the target via the promotions tryPlacement allows, search the remaining
  // gray-team placements — needed because greedy list-order alternation can
  // strand the ANY players a placement needs on the wrong team.
  const greedySides = greedyGraySides(base, grayIndices);
  const total = 1 << grayIndices.length;
  const placements: (TeamColor[] | null)[] = [null];
  for (let mask = 0; mask < total; mask++) {
    placements.push(grayIndices.map((_, i) => ((mask & (1 << i)) ? 'red' : 'blue')));
  }

  // REQ-7.1 Caveat 3: try every placement without TRI before allowing any
  // placement to use it, so a TRI-requiring placement never wins just because
  // it happens to be enumerated before a TRI-free one.
  for (const allowTri of [false, true]) {
    for (const sides of placements) {
      const attempt = base.map(a => ({ ...a }));
      const resolvedSides = sides ?? greedySides;
      grayIndices.forEach((idx, i) => {
        attempt[idx].team = resolvedSides[i];
      });
      const resolved = tryPlacement(attempt, heroesPerTeam, allowTri);
      if (!resolved) continue;

      const blue: string[] = [];
      const red: string[] = [];
      for (const a of resolved) {
        const list = a.team === 'blue' ? blue : red;
        const copies = heroesOf(a.mode);
        for (let i = 0; i < copies; i++) list.push(a.name); // R8: TRI listed 3x, DUO 2x
      }
      return { blue, red };
    }
  }

  return null;
}
