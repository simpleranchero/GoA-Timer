import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import PlayerRosterService, { RosterEntry } from '../services/PlayerRosterService';
import {
  IndicatorColor,
  IndicatorMode,
  RosterPlayer,
  GeneratedRoster,
  generateRoster
} from '../services/RosterGenerator';
import { useSound } from '../context/SoundContext';
import type { CoinSide } from './CoinToss';

const CoinToss = lazy(() => import('./CoinToss'));

type CurrentPlayerRow = RosterPlayer;

const COLOR_CLASS: Record<IndicatorColor, string> = {
  gray: 'bg-gray-500',
  blue: 'bg-blue-600',
  red: 'bg-red-600'
};

const NEXT_COLOR: Record<IndicatorColor, IndicatorColor> = {
  gray: 'blue',
  blue: 'red',
  red: 'gray'
};

const NEXT_MODE: Record<IndicatorMode, IndicatorMode> = {
  UNO: 'DUO',
  DUO: 'ANY',
  ANY: 'UNO'
};

interface DraftPlayerRosterProps {
  onRosterGenerated?: (roster: GeneratedRoster | null) => void;
  onCurrentPlayersChange?: (players: RosterPlayer[]) => void;
  onCoinResultChange?: (coin: CoinSide | null) => void;
  initialShare?: {
    players: RosterPlayer[];
    roster: GeneratedRoster;
    coin: CoinSide | null;
  } | null;
}

const DraftPlayerRoster: React.FC<DraftPlayerRosterProps> = ({
  onRosterGenerated,
  onCurrentPlayersChange,
  onCoinResultChange,
  initialShare
}) => {
  const { playSound } = useSound();
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [currentPlayers, setCurrentPlayers] = useState<CurrentPlayerRow[]>(initialShare?.players ?? []);
  const [newName, setNewName] = useState('');
  const [generatedRoster, setGeneratedRoster] = useState<GeneratedRoster | null>(initialShare?.roster ?? null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [coinResult, setCoinResult] = useState<CoinSide | null>(initialShare?.coin ?? null);
  const [showCoinFlip, setShowCoinFlip] = useState(false);

  // REQ-7 Decision 8: the clearing effect below fires on mount too. When
  // hydrating from a share link, its first run must not wipe the roster/coin
  // state just seeded above. A plain "skip once" flag isn't enough: React 18
  // StrictMode (main.tsx) double-invokes mount effects in dev, and the flag
  // would be consumed by the first phantom invocation, letting the second one
  // clear everything for real. Guard on identity instead — skip whenever this
  // effect sees the same `currentPlayers` reference it already handled.
  const skipNextClearRef = useRef(!!initialShare);
  const lastHandledPlayersRef = useRef<CurrentPlayerRow[] | null>(null);

  useEffect(() => {
    let loaded = PlayerRosterService.load();
    if (initialShare) {
      // REQ-7 R7: add shared players missing from the master roster, gated on
      // absence so re-hydrating never bumps an existing player's pick count.
      const known = new Set(loaded.map(e => e.name.toLowerCase()));
      for (const p of initialShare.players) {
        if (!known.has(p.name.toLowerCase())) {
          loaded = PlayerRosterService.recordPick(p.name);
          known.add(p.name.toLowerCase());
        }
      }
    }
    setRoster(loaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (lastHandledPlayersRef.current === currentPlayers) {
      // Same array reference as last time this effect ran — a StrictMode
      // phantom re-invocation, not a real change. Nothing to do.
      return;
    }
    lastHandledPlayersRef.current = currentPlayers;

    if (skipNextClearRef.current) {
      skipNextClearRef.current = false;
      return;
    }
    setGeneratedRoster(null);
    setGenerationError(null);
    setCoinResult(null);
    setShowCoinFlip(false);
    onRosterGenerated?.(null);
  }, [currentPlayers]);

  useEffect(() => {
    onCurrentPlayersChange?.(currentPlayers);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPlayers]);

  useEffect(() => {
    onCoinResultChange?.(coinResult);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coinResult]);

  const isCurrent = (name: string) =>
    currentPlayers.some(p => p.name.toLowerCase() === name.toLowerCase());

  const addToCurrent = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed || isCurrent(trimmed)) return;
    setCurrentPlayers(prev => [...prev, { name: trimmed, color: 'gray', mode: 'UNO' }]);
    setRoster(PlayerRosterService.recordPick(trimmed));
    playSound('buttonClick');
  };

  const handleAddPlayerClick = () => {
    if (!newName.trim()) return;
    addToCurrent(newName);
    setNewName('');
  };

  const handleRemoveCurrent = (name: string) => {
    setCurrentPlayers(prev => prev.filter(p => p.name !== name));
    playSound('buttonClick');
  };

  const cycleColor = (name: string) => {
    setCurrentPlayers(prev =>
      prev.map(p => (p.name === name ? { ...p, color: NEXT_COLOR[p.color] } : p))
    );
    playSound('buttonClick');
  };

  const cycleMode = (name: string) => {
    setCurrentPlayers(prev =>
      prev.map(p => (p.name === name ? { ...p, mode: NEXT_MODE[p.mode] } : p))
    );
    playSound('buttonClick');
  };

  const handleGenerate = (targetHeroes: number) => {
    const result = generateRoster(currentPlayers, targetHeroes);
    if (result) {
      setGeneratedRoster(result);
      setGenerationError(null);
      onRosterGenerated?.(result);
      setCoinResult(Math.random() < 0.5 ? 'blue' : 'red');
      setShowCoinFlip(true);
    } else {
      setGeneratedRoster(null);
      setGenerationError(
        `Could not generate a ${targetHeroes}-hero roster from the current players' color and UNO/DUO/ANY settings.`
      );
      setCoinResult(null);
      setShowCoinFlip(false);
      onRosterGenerated?.(null);
    }
    playSound('buttonClick');
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Players (master roster), sorted by pick count */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Players</h3>
        {roster.length === 0 ? (
          <div className="p-3 text-sm text-gray-400 bg-gray-700 rounded-md">No players yet — add one below.</div>
        ) : (
          <div className="grid grid-rows-3 grid-flow-col auto-cols-[minmax(160px,1fr)] gap-2 overflow-x-auto bg-gray-700 rounded-md p-2">
            {roster.map(entry => (
              <button
                key={entry.name}
                onClick={() => addToCurrent(entry.name)}
                className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-600 flex justify-between items-center bg-gray-800 ${
                  isCurrent(entry.name) ? 'font-bold bg-gray-600' : ''
                }`}
              >
                <span>{entry.name}</span>
                <span className="text-xs text-gray-400">{entry.pickCount}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Add player */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') handleAddPlayerClick();
          }}
          placeholder="Player name"
          className="flex-1 px-3 py-2 rounded bg-gray-700 text-sm outline-none"
        />
        <button
          onClick={handleAddPlayerClick}
          disabled={!newName.trim()}
          className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-sm font-medium"
        >
          Add Player
        </button>
      </div>

      {/* Current players */}
      <div>
        <h3 className="text-lg font-semibold mb-2">Current Players</h3>
        {currentPlayers.length === 0 ? (
          <div className="text-sm text-gray-400">No players selected yet.</div>
        ) : (
          <div className="grid grid-rows-3 grid-flow-col auto-cols-[minmax(160px,1fr)] gap-2 overflow-x-auto">
            {currentPlayers.map(p => (
              <div key={p.name} className="flex items-center gap-3">
                <button
                  aria-label="Cycle color indicator"
                  onClick={() => cycleColor(p.name)}
                  style={{ width: '2ch', height: '2ch' }}
                  className={`shrink-0 rounded-sm ${COLOR_CLASS[p.color]}`}
                />
                <button
                  aria-label="Cycle UNO/DUO/ANY"
                  onClick={() => cycleMode(p.name)}
                  style={{ fontSize: '1.2em' }}
                  className="shrink-0 leading-none font-semibold text-gray-400"
                >
                  {p.mode}
                </button>
                <button
                  onClick={() => handleRemoveCurrent(p.name)}
                  className="text-sm flex-1 text-left hover:underline"
                >
                  {p.name}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Roster generation */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => handleGenerate(4)}
            className="px-6 py-3 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-500"
          >
            Generate 4-Player Roster
          </button>
          <button
            onClick={() => handleGenerate(6)}
            className="px-6 py-3 rounded-lg font-medium text-white bg-purple-600 hover:bg-purple-500"
          >
            Generate 6-Player Roster
          </button>
        </div>

        {generationError && (
          <div className="text-sm text-red-400">{generationError}</div>
        )}

        {generatedRoster && (
          <div className="flex flex-col gap-3">
            {coinResult && (
              <div className="text-center text-sm font-medium">
                Landed on:{' '}
                <span className={coinResult === 'blue' ? 'text-blue-400' : 'text-red-400'}>
                  {coinResult === 'blue' ? 'Blue' : 'Red'}
                </span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 text-blue-400">Blue</h3>
                <div className="flex flex-col gap-1">
                  {generatedRoster.blue.map((name, i) => (
                    <div key={`blue-${i}`} className="px-3 py-1.5 rounded bg-gray-700 text-sm">
                      {name}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 text-red-400">Red</h3>
                <div className="flex flex-col gap-1">
                  {generatedRoster.red.map((name, i) => (
                    <div key={`red-${i}`} className="px-3 py-1.5 rounded bg-gray-700 text-sm">
                      {name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showCoinFlip && coinResult && (
        <Suspense fallback={null}>
          <CoinToss result={coinResult} onComplete={() => setShowCoinFlip(false)} />
        </Suspense>
      )}
    </div>
  );
};

export default DraftPlayerRoster;
