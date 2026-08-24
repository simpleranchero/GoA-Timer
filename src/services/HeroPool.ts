// src/services/HeroPool.ts
// Pure sampling helper for the Draft card's hero-pool reveal.
// See thoughts/requirements/refined/5-draft.md (REQ-5 R3, Decision 6).

import { Hero } from '../types';

export function sampleRandomHeroes(pool: Hero[], count: number): Hero[] {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length));
}
