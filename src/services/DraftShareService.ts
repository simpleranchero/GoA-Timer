// src/services/DraftShareService.ts
// Encodes/decodes the Draft card's shareable state (Current Players, generated
// roster, coin result, revealed hero pool) into a `share` URL query parameter.
// See thoughts/requirements/refined/7-share.md (REQ-7).

import { Hero } from '../types';
import { heroes } from '../data/heroes';
import { IndicatorColor, IndicatorMode, RosterPlayer, GeneratedRoster } from './RosterGenerator';
import type { CoinSide } from '../components/CoinToss';

// Distinct from the unrelated `share` param used by the Supabase-backed
// Cloud Sync "view someone's stats" feature (ViewModeContext.tsx /
// services/supabase/ShareService.ts) — reusing `share` collides with that
// flow's app-wide URL check and its own error UI.
const SHARE_PARAM = 'draftShare';
const SHARE_VERSION = 1;
const SHARE_ERROR_MESSAGE = 'This share link could not be loaded.';

export interface DraftSharePayload {
  players: RosterPlayer[];
  roster: GeneratedRoster;
  coin: CoinSide | null;
  heroes: Hero[] | null;
}

export type ParsedShare =
  | { payload: DraftSharePayload; error: null }
  | { payload: null; error: string };

const COLORS: IndicatorColor[] = ['gray', 'blue', 'red'];
const MODES: IndicatorMode[] = ['UNO', 'DUO', 'ANY'];

function isValidPlayer(p: any): p is { n: string; c: IndicatorColor; m: IndicatorMode } {
  return !!p && typeof p.n === 'string' && p.n.trim() !== '' &&
    COLORS.includes(p.c) && MODES.includes(p.m);
}

// R6/R10: reads window.location.search. Returns null when there's no `share`
// param at all (nothing to hydrate); returns {error} when one is present but
// unusable (Decision 9); returns {payload} when it decodes cleanly.
export function parseShareFromSearch(search: string): ParsedShare | null {
  const raw = new URLSearchParams(search).get(SHARE_PARAM);
  if (!raw) return null;

  try {
    const data = JSON.parse(raw);
    if (data?.v !== SHARE_VERSION) {
      return { payload: null, error: SHARE_ERROR_MESSAGE };
    }
    if (!Array.isArray(data.players) || data.players.length === 0 || !data.players.every(isValidPlayer)) {
      return { payload: null, error: SHARE_ERROR_MESSAGE };
    }
    if (
      !data.roster ||
      !Array.isArray(data.roster.blue) ||
      !Array.isArray(data.roster.red) ||
      data.roster.blue.length === 0 ||
      data.roster.blue.length !== data.roster.red.length
    ) {
      return { payload: null, error: SHARE_ERROR_MESSAGE };
    }
    if (data.coin !== null && data.coin !== 'blue' && data.coin !== 'red') {
      return { payload: null, error: SHARE_ERROR_MESSAGE };
    }

    let resolvedHeroes: Hero[] | null = null;
    if (data.heroes !== null && data.heroes !== undefined) {
      if (!Array.isArray(data.heroes)) {
        return { payload: null, error: SHARE_ERROR_MESSAGE };
      }
      resolvedHeroes = data.heroes.map((id: unknown) => heroes.find(h => h.id === id) ?? null) as Hero[];
      if (resolvedHeroes.some(h => !h)) {
        return { payload: null, error: SHARE_ERROR_MESSAGE };
      }
    }

    return {
      error: null,
      payload: {
        players: data.players.map((p: { n: string; c: IndicatorColor; m: IndicatorMode }) => ({
          name: p.n,
          color: p.c,
          mode: p.m
        })),
        roster: { blue: data.roster.blue, red: data.roster.red },
        coin: data.coin,
        heroes: resolvedHeroes
      }
    };
  } catch {
    return { payload: null, error: SHARE_ERROR_MESSAGE };
  }
}

// R3/R5: encodes the given live state into a full, absolute URL.
export function buildShareUrl(payload: DraftSharePayload): string {
  const compact = {
    v: SHARE_VERSION,
    players: payload.players.map(p => ({ n: p.name, c: p.color, m: p.mode })),
    roster: payload.roster,
    coin: payload.coin,
    heroes: payload.heroes ? payload.heroes.map(h => h.id) : null
  };
  const params = new URLSearchParams();
  params.set(SHARE_PARAM, JSON.stringify(compact));
  return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
}

// Shortens a URL via TinyURL's free, unauthenticated, CORS-enabled endpoint —
// confirmed (2026-08-25) to send Access-Control-Allow-Origin reflecting the
// caller's origin, unlike is.gd/v.gd (no CORS headers) and bit.ly (requires
// an OAuth token, which can't be embedded client-side safely). Returns null
// on any failure (network error, non-OK response, or a non-URL response
// body) so the caller can fall back to the un-shortened link.
export async function shortenUrl(longUrl: string): Promise<string | null> {
  try {
    const res = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
    if (!res.ok) return null;
    const text = (await res.text()).trim();
    return text.startsWith('http') ? text : null;
  } catch {
    return null;
  }
}
