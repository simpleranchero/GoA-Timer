// src/__tests__/services/HeroAssignment.test.ts
import { describe, it, expect } from 'vitest';
import { assignRandomHeroes } from '../../services/HeroAssignment';
import { heroes } from '../../data/heroes';
import { GeneratedRoster } from '../../services/RosterGenerator';

describe('assignRandomHeroes', () => {
  it('assigns one distinct hero per roster slot', () => {
    const roster: GeneratedRoster = { blue: ['A', 'B', 'B'], red: ['C', 'D'] }; // B is DUO
    const result = assignRandomHeroes(roster, heroes);
    const allHeroNames = [
      ...result.blue.flatMap(p => p.heroes.map(h => h.name)),
      ...result.red.flatMap(p => p.heroes.map(h => h.name))
    ];
    expect(allHeroNames.length).toBe(5); // 3 blue slots + 2 red slots
    expect(new Set(allHeroNames).size).toBe(5); // all distinct
  });

  it("groups a DUO/TRI pilot's multiple slots under one entry", () => {
    const roster: GeneratedRoster = { blue: ['A', 'A', 'A'], red: ['B', 'C'] }; // A is TRI
    const result = assignRandomHeroes(roster, heroes);
    expect(result.blue.length).toBe(1);
    expect(result.blue[0].name).toBe('A');
    expect(result.blue[0].heroes.length).toBe(3);
    expect(result.red.length).toBe(2);
  });
});
