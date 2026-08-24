import React, { useEffect, useState } from 'react';
import { Hero, Player, Team, GameLength } from '../types';
import TimerInput from './TimerInput';
import DraftPlayerRoster from './DraftPlayerRoster';
import HeroPoolReveal from './HeroPoolReveal';
import { ChevronDown, ChevronUp } from 'lucide-react';
import EnhancedTooltip from './common/EnhancedTooltip';
import TimerPhaseCard from './common/TimerPhaseCard';
import { useSound } from '../context/SoundContext';
import dbService from '../services/DatabaseService';
import SimpleTimerService from '../services/SimpleTimerService';
import { heroes } from '../data/heroes';
import { sampleRandomHeroes } from '../services/HeroPool';
import { GeneratedRoster } from '../services/RosterGenerator';

interface GameSetupProps {
  strategyTime: number;
  moveTime: number;
  gameLength: GameLength;
  onStrategyTimeChange: (time: number) => void;
  onMoveTimeChange: (time: number) => void;
  onGameLengthChange: (length: GameLength) => void;
  players: Player[];
  onAddPlayer: (team: Team) => void;
  onRemovePlayer: (playerId: number) => void;
  onDraftHeroes: () => void;
  selectedExpansions: string[];
  onToggleExpansion: (expansion: string) => void;
  onPlayerNameChange: (playerId: number, name: string) => void;
  duplicateNames: string[];
  canStartDrafting: boolean;
  heroCount: number;
  maxComplexity: number;
  onMaxComplexityChange: (complexity: number) => void;
  // Timer enabling props
  strategyTimerEnabled: boolean;
  moveTimerEnabled: boolean;
  onStrategyTimerEnabledChange: (enabled: boolean) => void;
  onMoveTimerEnabledChange: (enabled: boolean) => void;
  // NEW: Double lane option for 6 players
  useDoubleLaneFor6Players: boolean;
  onUseDoubleLaneFor6PlayersChange: (useDouble: boolean) => void;
  // NEW: View matches button handler
  onViewMatches: () => void;
  // Start a simple timer game using the configured timers
  onStartSimpleTimer: () => void;
  // Simple timer sound toggles
  simpleSoundTickEnabled: boolean;
  simpleSoundWarningEnabled: boolean;
  simpleSoundCompleteEnabled: boolean;
  onSimpleSoundTickEnabledChange: (enabled: boolean) => void;
  onSimpleSoundWarningEnabledChange: (enabled: boolean) => void;
  onSimpleSoundCompleteEnabledChange: (enabled: boolean) => void;
}

const GameSetup: React.FC<GameSetupProps> = ({
  strategyTime,
  moveTime,
  onStrategyTimeChange,
  onMoveTimeChange,
  players,
  canStartDrafting,
  heroCount,
  // Timer props
  strategyTimerEnabled,
  moveTimerEnabled,
  onStrategyTimerEnabledChange,
  onMoveTimerEnabledChange,
  // Start simple timer handler
  onStartSimpleTimer,
  // Simple timer sound toggles
  simpleSoundTickEnabled,
  simpleSoundWarningEnabled,
  simpleSoundCompleteEnabled,
  onSimpleSoundTickEnabledChange,
  onSimpleSoundWarningEnabledChange,
  onSimpleSoundCompleteEnabledChange
}) => {
  const { playSound } = useSound();
  // Default: Simple Timer open, Tracked Game collapsed
  const [collapsed, setCollapsed] = useState<boolean>(true);
  const [simpleCollapsed, setSimpleCollapsed] = useState<boolean>(false);
  const [levelUpTime, setLevelUpTime] = useState<number>(120);

  // Set default values when component mounts if they're not already set
  useEffect(() => {
    // Try to load persisted Simple Timer state first
    const stored = SimpleTimerService.load();
    if (stored) {
      onStrategyTimeChange(stored.strategyTime);
      onMoveTimeChange(stored.moveTime);
      onStrategyTimerEnabledChange(stored.strategyTimerEnabled);
      onMoveTimerEnabledChange(stored.moveTimerEnabled);
      // Load level up timer if present
      if (typeof stored.levelUpTime === 'number') setLevelUpTime(stored.levelUpTime);
      if (typeof stored.soundTickEnabled === 'boolean') onSimpleSoundTickEnabledChange(stored.soundTickEnabled);
      if (typeof stored.soundWarningEnabled === 'boolean') onSimpleSoundWarningEnabledChange(stored.soundWarningEnabled);
      if (typeof stored.soundCompleteEnabled === 'boolean') onSimpleSoundCompleteEnabledChange(stored.soundCompleteEnabled);
    } else {
      if (strategyTime !== 120) {
        onStrategyTimeChange(120);
      }
      if (moveTime !== 90) {
        onMoveTimeChange(90);
      }
      setLevelUpTime(120);
      onSimpleSoundTickEnabledChange(false);
      onSimpleSoundWarningEnabledChange(true);
      onSimpleSoundCompleteEnabledChange(true);
    }
    
    // Check if we have match data to enable View Matches button
    // This was previously setting hasMatchData state which is not being used
    // Since the View Matches button is now always clickable (per the comment),
    // we can just call the async check but don't need to store the result
    dbService.hasMatchData();
  }, []);

  // Persist simple timer settings whenever they change
  useEffect(() => {
    SimpleTimerService.save({
      strategyTime,
      moveTime,
      strategyTimerEnabled,
      moveTimerEnabled,
      levelUpTime,
      soundTickEnabled: simpleSoundTickEnabled,
      soundWarningEnabled: simpleSoundWarningEnabled,
      soundCompleteEnabled: simpleSoundCompleteEnabled
    });
  }, [strategyTime, moveTime, strategyTimerEnabled, moveTimerEnabled, levelUpTime, simpleSoundTickEnabled, simpleSoundWarningEnabled, simpleSoundCompleteEnabled]);

  // Calculate player count by team
  const titanCount = players.filter(p => p.team === Team.Titans).length;
  const atlanteanCount = players.filter(p => p.team === Team.Atlanteans).length;
  const totalPlayers = titanCount + atlanteanCount;

  // Draft card's Blue/Red roster, lifted from DraftPlayerRoster (REQ-4/REQ-5)
  const [generatedRoster, setGeneratedRoster] = useState<GeneratedRoster | null>(null);
  const [revealedHeroes, setRevealedHeroes] = useState<Hero[] | null>(null);

  // R1: Draft Heroes is enabled once a Blue/Red roster has been generated.
  const canDraft = generatedRoster !== null;

  // Clear a stale reveal if the roster gets invalidated (e.g. Current Players changed).
  useEffect(() => {
    if (!generatedRoster) setRevealedHeroes(null);
  }, [generatedRoster]);

  const handleSoundToggle = (type: 'tick' | 'warning' | 'complete') => {
    playSound('toggleSwitch');
    if (type === 'tick') {
      onSimpleSoundTickEnabledChange(!simpleSoundTickEnabled);
    } else if (type === 'warning') {
      onSimpleSoundWarningEnabledChange(!simpleSoundWarningEnabled);
    } else {
      onSimpleSoundCompleteEnabledChange(!simpleSoundCompleteEnabled);
    }
  };

  const handleDraftHeroes = () => {
    if (!canDraft) return;
    playSound('buttonClick');
    setRevealedHeroes(sampleRandomHeroes(heroes, 15));
  };

  return (
    <>
    {/* Simple Timer card - minimal timer-only collapsible UI */}
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Simple Timer</h2>
        <button
          aria-expanded={!simpleCollapsed}
          onClick={() => {
            playSound('buttonClick');
            setSimpleCollapsed(prev => {
              const next = !prev;
              // If opening Simple Timer, ensure Tracked Game is closed
              if (!next) setCollapsed(true);
              return next;
            });
          }}
          className="ml-3 p-2 rounded bg-gray-700 hover:bg-gray-600"
        >
          {simpleCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      <div className={`transition-all duration-300 ${simpleCollapsed ? 'max-h-0 overflow-hidden' : 'max-h-[800px]'}`}>
        <div className="grid grid-cols-1 gap-4 sm:gap-6 mb-0">
          {/* Level Up Timer */}
          <TimerPhaseCard
            title="Level Up Phase"
            className="bg-gray-700 p-4"
          >
            <TimerInput
              value={levelUpTime}
              onChange={(t) => setLevelUpTime(t)}
              tooltip="This is the time players have to spend gold and level up between rounds"
              minValue={10}
              maxValue={300}
              step={10}
            />
          </TimerPhaseCard>

          {/* Strategy Timer */}
          <TimerPhaseCard
            title="Strategy Phase"
            className="bg-gray-700 p-4"
          >
            <TimerInput
              value={strategyTime}
              onChange={onStrategyTimeChange}
              tooltip="This is the amount of time teams will have to publicly discuss what cards to play"
              minValue={30}
              maxValue={300}
              step={10}
            />
          </TimerPhaseCard>

          {/* Player Phase */}
          <TimerPhaseCard
            title="Player Phase"
            className="bg-gray-700 p-4"
          >
            <TimerInput
              value={moveTime}
              onChange={onMoveTimeChange}
              tooltip="This is the time each player will have to resolve their cards once revealed"
              minValue={10}
              maxValue={300}
              step={10}
            />
          </TimerPhaseCard>

          {/* Sound toggles for Simple Timer */}
          <div className="bg-gray-700 p-4 rounded-md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl mb-0">Sound Options</h3>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: 'Tick sound',
                  enabled: simpleSoundTickEnabled,
                  onToggle: () => handleSoundToggle('tick'),
                  helper: 'Per-second ticking while the timer runs'
                },
                {
                  label: 'Warning sound',
                  enabled: simpleSoundWarningEnabled,
                  onToggle: () => handleSoundToggle('warning'),
                  helper: 'Plays at 10 seconds remaining'
                },
                {
                  label: 'Complete sound',
                  enabled: simpleSoundCompleteEnabled,
                  onToggle: () => handleSoundToggle('complete'),
                  helper: 'Repeats when the timer reaches zero'
                }
              ].map(({ label, enabled, onToggle, helper }) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-gray-300">{helper}</p>
                  </div>
                  <div
                    className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${
                      enabled ? 'bg-green-600 justify-end' : 'bg-gray-600 justify-start'
                    }`}
                    onClick={onToggle}
                  >
                    <div className="bg-white w-4 h-4 rounded-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Game Start button for Simple Timer */}
          <div className="mt-2 flex justify-end">
            <button
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
              onClick={() => {
                playSound('buttonClick');
                onStartSimpleTimer();
              }}
            >
              Game Start
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Draft card */}
    <div className="bg-gray-800 rounded-lg p-4 sm:p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Draft</h2>
        <button
          aria-expanded={!collapsed}
          onClick={() => {
            playSound('buttonClick');
            setCollapsed(prev => {
              const next = !prev;
              // If opening Draft, ensure Simple Timer is closed
              if (!next) setSimpleCollapsed(true);
              return next;
            });
          }}
          className="ml-3 p-2 rounded bg-gray-700 hover:bg-gray-600"
        >
          {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
      </div>

      <div className={`transition-all duration-300 ${collapsed ? 'max-h-0 overflow-hidden' : 'max-h-[2000px]'}`}>
      <div className="mb-8">
        <DraftPlayerRoster onRosterGenerated={setGeneratedRoster} />
      </div>
      {/* Action Buttons */}
<div className="flex flex-col sm:flex-row items-center justify-center gap-4">
  {/* Draft Heroes Button */}
  <div className="relative">
    <EnhancedTooltip
      text="Click to select heroes for each player and start the game."
      position="top"
      disableMobileTooltip={true}
    >
      <button
        className={`px-6 py-3 rounded-lg font-medium text-white ${
          canDraft
            ? 'bg-blue-600 hover:bg-blue-500'
            : 'bg-gray-600 cursor-not-allowed'
        }`}
        onClick={handleDraftHeroes}
        disabled={!canDraft}
      >
        Draft Heroes
      </button>
    </EnhancedTooltip>
  </div>
</div>

  {revealedHeroes && (
    <div className="mt-6">
      <HeroPoolReveal heroes={revealedHeroes} />
    </div>
  )}

  {/* Hero count info */}
  <div className="text-sm text-center w-full mt-4">
    <div className="flex flex-wrap justify-center gap-4">
      <span className="text-blue-300">Available heroes: {heroCount}</span>
      {totalPlayers > 0 && (
        <span className="text-yellow-300">
          {canStartDrafting 
            ? "✓ Enough heroes for drafting" 
            : "✗ Not enough heroes for drafting"}
        </span>
      )}
    </div>
  </div>
      
     <p className="mt-4 text-xs text-gray-300 text-center mb-2">
        Disclaimer: This is not a professional product and it is always recommended you back up your data (View Matches&gt;Export Data). This is not an official product and has not been approved by Wolff Designa. All game content is the sole property of Wolff Designa. 
      </p>
    </div>
    </div>
    </>
  );
};

export default GameSetup;