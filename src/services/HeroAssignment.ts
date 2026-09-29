// src/services/HeroAssignment.ts
// Pure random hero-assignment for the Draft card's "All Random" button.
// See thoughts/requirements/refined/7.1-draft-enchant.md (REQ-7.1 Part B, R10).

import { Hero } from '../types';
import { sampleRandomHeroes } from './HeroPool';
import { GeneratedRoster } from './RosterGenerator';

export interface AssignedPilot {
  name: string;
  heroes: Hero[];
}

export interface AssignedRoster {
  blue: AssignedPilot[];
  red: AssignedPilot[];
}

// A pilot's slots are consecutive equal-name entries in `names` — RosterGenerator
// pushes all of one player's copies back-to-back — so grouping by "same name as
// the previous entry" recovers per-pilot groupings without re-deriving UNO/DUO/TRI.
function assignSide(names: string[], sample: Hero[], cursor: { i: number }): AssignedPilot[] {
  const grouped: AssignedPilot[] = [];
  for (const name of names) {
    const hero = sample[cursor.i++];
    const last = grouped[grouped.length - 1];
    if (last && last.name === name) {
      last.heroes.push(hero);
    } else {
      grouped.push({ name, heroes: [hero] });
    }
  }
  return grouped;
}

// R10: one distinct random hero per roster slot, no player interaction.
export function assignRandomHeroes(roster: GeneratedRoster, allHeroes: Hero[]): AssignedRoster {
  const totalSlots = roster.blue.length + roster.red.length;
  const sample = sampleRandomHeroes(allHeroes, totalSlots);
  const cursor = { i: 0 };
  return {
    blue: assignSide(roster.blue, sample, cursor),
    red: assignSide(roster.red, sample, cursor)
  };
}
