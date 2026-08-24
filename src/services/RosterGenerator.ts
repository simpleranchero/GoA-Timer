// src/services/RosterGenerator.ts
// Pure balancing algorithm for the Draft card's roster-generation buttons.
// See thoughts/requirements/refined/4-roster.md (REQ-4 R3-R9) for the rules this implements.

export type IndicatorColor = 'gray' | 'blue' | 'red';
export type IndicatorMode = 'UNO' | 'DUO' | 'ANY';
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

const heroesOf = (mode: IndicatorMode): number => (mode === 'DUO' ? 2 : 1);

function totals(assignments: Assignment[]): Record<TeamColor, number> {
  const t: Record<TeamColor, number> = { blue: 0, red: 0 };
  for (const a of assignments) {
    if (a.team) t[a.team] += heroesOf(a.mode);
  }
  return t;
}

function duoCount(assignments: Assignment[], team: TeamColor): number {
  return assignments.filter(a => a.team === team && a.mode === 'DUO').length;
}

// Returns null when no assignment satisfies R4 (equal heroes per team),
// R6 (color preference), and R8 (one DUO per team) for the given target (R9).
export function generateRoster(players: RosterPlayer[], targetHeroes: number): GeneratedRoster | null {
  if (players.length === 0) return null;
  const heroesPerTeam = targetHeroes / 2;

  const assignments: Assignment[] = players.map(p => ({
    name: p.name,
    team: p.color === 'gray' ? null : p.color,
    mode: p.mode
  }));

  // R8: fixed-color DUO players already breaking the one-DUO-per-team cap
  // make this Current Players set infeasible regardless of target.
  if (duoCount(assignments, 'blue') > 1 || duoCount(assignments, 'red') > 1) return null;

  // Caveat 5: gray players are assigned in list order to whichever team
  // currently has fewer heroes.
  for (const a of assignments) {
    if (a.team) continue;
    const t = totals(assignments);
    a.team = t.blue <= t.red ? 'blue' : 'red';
  }

  // R7: balance by converting ANY -> DUO, one at a time in list order, only
  // on the team currently short a hero, only if that team has no DUO yet (R8).
  let t = totals(assignments);
  let progressed = true;
  while (t.blue !== t.red && progressed) {
    progressed = false;
    const short: TeamColor = t.blue < t.red ? 'blue' : 'red';
    for (const a of assignments) {
      if (a.team !== short || a.mode !== 'ANY') continue;
      if (duoCount(assignments, short) >= 1) continue;
      a.mode = 'DUO';
      progressed = true;
      break;
    }
    t = totals(assignments);
  }

  // R4 + R3: must land exactly on an even split of the requested target.
  if (t.blue !== t.red || t.blue !== heroesPerTeam) return null;

  const blue: string[] = [];
  const red: string[] = [];
  for (const a of assignments) {
    const list = a.team === 'blue' ? blue : red;
    list.push(a.name);
    if (a.mode === 'DUO') list.push(a.name); // R10: DUO listed twice
  }
  return { blue, red };
}
