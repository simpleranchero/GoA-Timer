// src/__tests__/services/RosterGenerator.test.ts
import { describe, it, expect } from 'vitest';
import { generateRoster, RosterPlayer } from '../../services/RosterGenerator';

function player(name: string, mode: RosterPlayer['mode'], color: RosterPlayer['color'] = 'gray'): RosterPlayer {
  return { name, mode, color };
}

function countOccurrences(list: string[], name: string): number {
  return list.filter(n => n === name).length;
}

describe('generateRoster', () => {
  it('generates a 6-hero roster from 4 players with exactly 2 ANY', () => {
    const players = [
      player('A', 'ANY'),
      player('B', 'UNO'),
      player('C', 'ANY'),
      player('D', 'UNO')
    ];
    const result = generateRoster(players, 6);
    expect(result).not.toBeNull();
    expect(result!.blue.length).toBe(3);
    expect(result!.red.length).toBe(3);
  });

  it('generates a 6-hero roster from 4 players with exactly 3 ANY', () => {
    const players = [
      player('A', 'ANY'),
      player('B', 'ANY'),
      player('C', 'ANY'),
      player('D', 'UNO')
    ];
    const result = generateRoster(players, 6);
    expect(result).not.toBeNull();
    expect(result!.blue.length).toBe(3);
    expect(result!.red.length).toBe(3);
  });

  it('generates a 6-hero roster from 4 players all ANY', () => {
    const players = [
      player('A', 'ANY'),
      player('B', 'ANY'),
      player('C', 'ANY'),
      player('D', 'ANY')
    ];
    const result = generateRoster(players, 6);
    expect(result).not.toBeNull();
    expect(result!.blue.length).toBe(3);
    expect(result!.red.length).toBe(3);
  });

  it('succeeds even when the only two ANY players would land on the same team via strict alternation', () => {
    // Positions 1 and 3 (both "odd" in list order) — under pure greedy
    // alternation these both land on the same side, stranding the other
    // team with no promotable player. The search must find another split.
    const players = [
      player('A', 'ANY'),
      player('B', 'UNO'),
      player('C', 'ANY'),
      player('D', 'UNO')
    ];
    const result = generateRoster(players, 6);
    expect(result).not.toBeNull();
    expect(result!.blue.length).toBe(3);
    expect(result!.red.length).toBe(3);
    // Exactly one DUO per team (a name appearing twice in that team's list).
    const blueDoubled = result!.blue.filter(n => countOccurrences(result!.blue, n) === 2);
    const redDoubled = result!.red.filter(n => countOccurrences(result!.red, n) === 2);
    expect(new Set(blueDoubled).size).toBe(1);
    expect(new Set(redDoubled).size).toBe(1);
  });

  it('returns null for a 4-player, 6-hero target with no ANY or DUO players', () => {
    const players = [
      player('A', 'UNO'),
      player('B', 'UNO'),
      player('C', 'UNO'),
      player('D', 'UNO')
    ];
    expect(generateRoster(players, 6)).toBeNull();
  });

  it('picks the promoted DUO player randomly when multiple ANY candidates exist', () => {
    const players = [
      player('A', 'ANY'),
      player('B', 'ANY'),
      player('C', 'ANY'),
      player('D', 'ANY')
    ];
    const outcomes = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const result = generateRoster(players, 6)!;
      const duoBlue = result.blue.find(n => countOccurrences(result.blue, n) === 2);
      const duoRed = result.red.find(n => countOccurrences(result.red, n) === 2);
      outcomes.add(`${duoBlue}-${duoRed}`);
    }
    expect(outcomes.size).toBeGreaterThan(1);
  });

  // Regression coverage for previously-passing behavior (thoughts/plan/5-roster.md Step 4).
  it('splits 4 all-UNO players evenly for a 4-hero target', () => {
    const players = [
      player('A', 'UNO'),
      player('B', 'UNO'),
      player('C', 'UNO'),
      player('D', 'UNO')
    ];
    const result = generateRoster(players, 4);
    expect(result).not.toBeNull();
    expect(result!.blue.length).toBe(2);
    expect(result!.red.length).toBe(2);
  });

  it('splits 6 all-UNO players evenly for a 6-hero target', () => {
    const players = Array.from({ length: 6 }, (_, i) => player(`P${i}`, 'UNO'));
    const result = generateRoster(players, 6);
    expect(result).not.toBeNull();
    expect(result!.blue.length).toBe(3);
    expect(result!.red.length).toBe(3);
  });

  it('honors one fixed DUO with 2 UNO players for a 4-hero target', () => {
    const players = [
      player('A', 'DUO'),
      player('B', 'UNO'),
      player('C', 'UNO')
    ];
    const result = generateRoster(players, 4);
    expect(result).not.toBeNull();
    expect(countOccurrences([...result!.blue, ...result!.red], 'A')).toBe(2);
  });

  it('returns null when color preferences make the target unreachable', () => {
    const players = [
      player('A', 'UNO', 'blue'),
      player('B', 'UNO', 'blue'),
      player('C', 'UNO', 'blue'),
      player('D', 'UNO', 'red')
    ];
    expect(generateRoster(players, 4)).toBeNull();
  });

  it('returns null when two fixed DUO players share the same color', () => {
    const players = [
      player('A', 'DUO', 'blue'),
      player('B', 'DUO', 'blue'),
      player('C', 'UNO', 'red'),
      player('D', 'UNO', 'red')
    ];
    expect(generateRoster(players, 4)).toBeNull();
  });

  it('forces TRI when DUO alone cannot close the gap (10-Player, 4 ANY players)', () => {
    // 2 players/team, baseline 1 each -> needs 5, DUO alone only reaches 4.
    const players = [
      player('A', 'ANY'),
      player('B', 'ANY'),
      player('C', 'ANY'),
      player('D', 'ANY')
    ];
    const result = generateRoster(players, 10);
    expect(result).not.toBeNull();
    expect(result!.blue.length).toBe(5);
    expect(result!.red.length).toBe(5);
    const triCount = (list: string[]) =>
      new Set(list.filter(n => countOccurrences(list, n) === 3)).size;
    const duoCount = (list: string[]) =>
      new Set(list.filter(n => countOccurrences(list, n) === 2)).size;
    expect(triCount(result!.blue)).toBe(1);
    expect(duoCount(result!.blue)).toBe(1);
    expect(triCount(result!.red)).toBe(1);
    expect(duoCount(result!.red)).toBe(1);
  });

  it('still prefers DUO alone when it is sufficient, even with TRI available as a mode', () => {
    // Regression: 6-Player target should never touch TRI.
    const players = [
      player('A', 'ANY'),
      player('B', 'UNO'),
      player('C', 'ANY'),
      player('D', 'UNO')
    ];
    const result = generateRoster(players, 6);
    expect(result).not.toBeNull();
    expect(result!.blue.some(n => countOccurrences(result!.blue, n) === 3)).toBe(false);
    expect(result!.red.some(n => countOccurrences(result!.red, n) === 3)).toBe(false);
  });

  it('allows one DUO and one TRI on the same team simultaneously', () => {
    // blue: DUO(2) + TRI(3) = 5. red: UNO+UNO+UNO(3) + DUO(2) = 5. Target 10 -> 5/team.
    const players = [
      player('A', 'DUO', 'blue'),
      player('B', 'TRI', 'blue'),
      player('C', 'UNO', 'red'),
      player('D', 'UNO', 'red'),
      player('E', 'UNO', 'red'),
      player('F', 'DUO', 'red')
    ];
    const result = generateRoster(players, 10);
    expect(result).not.toBeNull();
    expect(result!.blue.length).toBe(5);
    expect(result!.red.length).toBe(5);
  });

  it('returns null when two fixed TRI players share the same team', () => {
    const players = [
      player('A', 'TRI', 'blue'),
      player('B', 'TRI', 'blue'),
      player('C', 'UNO', 'red'),
      player('D', 'UNO', 'red')
    ];
    expect(generateRoster(players, 8)).toBeNull();
  });

  it('returns null when a lone fixed-TRI player leaves their team short with no one left to promote', () => {
    // blue has only player A, already TRI (max contribution 3); target needs 4 per team
    // and there's no ANY player on blue to promote further.
    const players = [player('A', 'TRI', 'blue'), player('B', 'UNO', 'red')];
    expect(generateRoster(players, 8)).toBeNull();
  });
});
