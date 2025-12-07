import React, { useState } from 'react';
import { ChevronLeft, Clock, Infinity } from 'lucide-react';
import { useSound } from '../context/SoundContext';
import ActiveTimer from './ActiveTimer';
import EnhancedTooltip from './common/EnhancedTooltip';
import SimpleTimerService from '../services/SimpleTimerService';

interface Props {
  strategyTimeRemaining: number;
  strategyTimerActive: boolean;
  onStartStrategyTimer: () => void;
  onPauseStrategyTimer: () => void;
  onResetStrategyTimer: () => void;
  onBackToSetup: () => void;
  strategyTimerEnabled: boolean;
  onEndPhase?: () => void;
  // level-up props
  levelUpTimeRemaining?: number;
  levelUpTimerActive?: boolean;
  onStartLevelUpTimer?: () => void;
  onPauseLevelUpTimer?: () => void;
  onResetLevelUpTimer?: () => void;
  levelUpTimerEnabled?: boolean;
  // player timer props
  playerTimeRemaining?: number;
  playerTimerActive?: boolean;
  onStartPlayerTimer?: () => void;
  onPausePlayerTimer?: () => void;
  onResetPlayerTimer?: () => void;
  playerTimerEnabled?: boolean;
  soundWarningEnabled: boolean;
  soundCompleteEnabled: boolean;
}

const SimpleGameTimer: React.FC<Props> = ({
  strategyTimeRemaining,
  strategyTimerActive,
  onStartStrategyTimer,
  onPauseStrategyTimer,
  onResetStrategyTimer,
  onBackToSetup,
  strategyTimerEnabled,
  onEndPhase,
  levelUpTimeRemaining,
  levelUpTimerActive,
  onStartLevelUpTimer,
  onPauseLevelUpTimer,
  onResetLevelUpTimer,
  levelUpTimerEnabled
  ,
  playerTimeRemaining,
  playerTimerActive,
  onStartPlayerTimer,
  onPausePlayerTimer,
  onResetPlayerTimer,
  playerTimerEnabled,
  soundWarningEnabled,
  soundCompleteEnabled
}) => {
  const { playSound } = useSound();
  const [strategyEnabled, setStrategyEnabled] = useState<boolean>(strategyTimerEnabled);
  const [levelUpEnabled, setLevelUpEnabled] = useState<boolean>(levelUpTimerEnabled ?? true);
  const [playerEnabled, setPlayerEnabled] = useState<boolean>(playerTimerEnabled ?? true);
  // currentPhase controls which phase is considered active for UI/flow
  // 'levelUp' | 'strategy' | 'player'
  const [currentPhase, setCurrentPhase] = React.useState<'levelUp' | 'strategy' | 'player'>('levelUp');

  // Load saved enabled state from SimpleTimerService on mount if present
  React.useEffect(() => {
    const stored = SimpleTimerService.load();
    if (stored) {
      if (typeof stored.strategyTimerEnabled === 'boolean') setStrategyEnabled(stored.strategyTimerEnabled);
      if (typeof stored.moveTimerEnabled === 'boolean') setPlayerEnabled(stored.moveTimerEnabled);
      if (typeof stored.levelUpTimerEnabled === 'boolean') setLevelUpEnabled(stored.levelUpTimerEnabled);
    }
  }, []);

  // Ensure only one phase is selected at a time on mount (do not auto-start)
  React.useEffect(() => {
    // If any phase is already active (from app state), pick the first active in order
    if (levelUpTimerActive) {
      setCurrentPhase('levelUp');
      // pause others
      onPauseStrategyTimer();
      onPausePlayerTimer && onPausePlayerTimer();
      return;
    }
    if (strategyTimerActive) {
      setCurrentPhase('strategy');
      onPauseLevelUpTimer && onPauseLevelUpTimer();
      onPausePlayerTimer && onPausePlayerTimer();
      return;
    }
    if (playerTimerActive) {
      setCurrentPhase('player');
      onPauseLevelUpTimer && onPauseLevelUpTimer();
      onPauseStrategyTimer();
      return;
    }

    // Default selection: levelUp if enabled, but do NOT auto-start timers
    if (levelUpEnabled) {
      setCurrentPhase('levelUp');
    } else if (strategyEnabled) {
      setCurrentPhase('strategy');
    } else if (playerEnabled) {
      setCurrentPhase('player');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // (removed unused getNextEnabledPhase helper)

  // Wrapper start functions that ensure mutual exclusion
  const startLevelUp = () => {
    if (!levelUpEnabled) return;
    // Ensure mutual exclusion: pause others, enable levelUp and disable others
    onPauseStrategyTimer();
    onPausePlayerTimer && onPausePlayerTimer();
    setLevelUpEnabled(true);
    setStrategyEnabled(false);
    setPlayerEnabled(false);
    persistEnabledFlags(false, false, true);
    onStartLevelUpTimer && onStartLevelUpTimer();
    setCurrentPhase('levelUp');
  };

  const startStrategy = () => {
    if (!strategyEnabled) return;
    onPauseLevelUpTimer && onPauseLevelUpTimer();
    onPausePlayerTimer && onPausePlayerTimer();
    // Ensure mutual exclusion: enable strategy and disable other timers, persist
    setStrategyEnabled(true);
    setLevelUpEnabled(false);
    setPlayerEnabled(false);
    persistEnabledFlags(true, false, false);
    onStartStrategyTimer();
    setCurrentPhase('strategy');
  };

  const startPlayer = () => {
    if (!playerEnabled) return;
    onPauseLevelUpTimer && onPauseLevelUpTimer();
    onPauseStrategyTimer();
    // Ensure mutual exclusion: enable player and disable other timers, persist
    setPlayerEnabled(true);
    setStrategyEnabled(false);
    setLevelUpEnabled(false);
    persistEnabledFlags(false, true, false);
    onStartPlayerTimer && onStartPlayerTimer();
    setCurrentPhase('player');
  };

  // End-phase handlers: disable current timer and enable the next one in sequence (do NOT auto-start)
  const handleEndPhaseFor = (phase: 'levelUp' | 'strategy' | 'player') => {
    // pause current
    if (phase === 'levelUp') {
      onPauseLevelUpTimer && onPauseLevelUpTimer();
      // reset level up timer
      onResetLevelUpTimer && onResetLevelUpTimer();
      // disable levelUp, enable strategy
      setLevelUpEnabled(false);
      setStrategyEnabled(true);
      setPlayerEnabled(false);
      persistEnabledFlags(true, false, false);
      setCurrentPhase('strategy');
    } else if (phase === 'strategy') {
      onPauseStrategyTimer();
      // reset strategy timer
      onResetStrategyTimer && onResetStrategyTimer();
      // call external end-phase handler if provided (for strategy)
      onEndPhase && onEndPhase();
      // disable strategy, enable player
      setStrategyEnabled(false);
      setPlayerEnabled(true);
      setLevelUpEnabled(false);
      persistEnabledFlags(false, true, false);
      setCurrentPhase('player');
    } else {
      onPausePlayerTimer && onPausePlayerTimer();
      // reset player timer
      onResetPlayerTimer && onResetPlayerTimer();
      // disable player, enable levelUp (wrap)
      setPlayerEnabled(false);
      setLevelUpEnabled(true);
      setStrategyEnabled(false);
      persistEnabledFlags(false, false, true);
      setCurrentPhase('levelUp');
    }
  };

  // Helper to persist enabled flags (merge with existing stored values)
  const persistEnabledFlags = (sEnabled: boolean, mEnabled: boolean, lEnabled: boolean) => {
    const stored = SimpleTimerService.load();
    const toSave = {
      strategyTime: stored?.strategyTime ?? 120,
      moveTime: stored?.moveTime ?? 90,
      strategyTimerEnabled: sEnabled,
      moveTimerEnabled: mEnabled,
      levelUpTime: stored?.levelUpTime ?? 120,
      levelUpTimerEnabled: lEnabled,
      soundTickEnabled: stored?.soundTickEnabled ?? false,
      soundWarningEnabled: stored?.soundWarningEnabled ?? true,
      soundCompleteEnabled: stored?.soundCompleteEnabled ?? true
    };
    SimpleTimerService.save(toSave);
  };

  const handleStrategyToggle = () => {
    playSound('toggleSwitch');
    // if timer is active and we're disabling it, pause first
    if (strategyTimerActive && strategyEnabled) {
      onPauseStrategyTimer();
    }
    // If enabling strategy, disable others. If disabling, just disable it.
    const next = !strategyEnabled;
    if (next) {
      // enable strategy only
      onPauseLevelUpTimer && onPauseLevelUpTimer();
      onPausePlayerTimer && onPausePlayerTimer();
      setStrategyEnabled(true);
      setPlayerEnabled(false);
      setLevelUpEnabled(false);
      persistEnabledFlags(true, false, false);
      setCurrentPhase('strategy');
    } else {
      setStrategyEnabled(false);
      persistEnabledFlags(false, playerEnabled, levelUpEnabled);
    }
  };

  const handleLevelUpToggle = () => {
    playSound('toggleSwitch');
    if (levelUpTimerActive && levelUpEnabled && onPauseLevelUpTimer) {
      onPauseLevelUpTimer();
    }
    const next = !levelUpEnabled;
    if (next) {
      onPauseStrategyTimer();
      onPausePlayerTimer && onPausePlayerTimer();
      setLevelUpEnabled(true);
      setStrategyEnabled(false);
      setPlayerEnabled(false);
      persistEnabledFlags(false, false, true);
      setCurrentPhase('levelUp');
    } else {
      setLevelUpEnabled(false);
      persistEnabledFlags(strategyEnabled, playerEnabled, false);
    }
  };

  const handlePlayerToggle = () => {
    playSound('toggleSwitch');
    if (playerTimerActive && playerEnabled && onPausePlayerTimer) {
      onPausePlayerTimer();
    }
    const next = !playerEnabled;
    if (next) {
      onPauseLevelUpTimer && onPauseLevelUpTimer();
      onPauseStrategyTimer();
      setPlayerEnabled(true);
      setStrategyEnabled(false);
      setLevelUpEnabled(false);
      persistEnabledFlags(false, true, false);
      setCurrentPhase('player');
    } else {
      setPlayerEnabled(false);
      persistEnabledFlags(strategyEnabled, false, levelUpEnabled);
    }
  };

  return (
    <div className="space-y-4">
      <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              aria-label="Back to Setup"
              className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium flex items-center gap-2"
              onClick={() => { 
                playSound('buttonClick');
                // Stop and reset all timers
                onPauseStrategyTimer();
                onResetStrategyTimer();
                if (onPauseLevelUpTimer) onPauseLevelUpTimer();
                if (onResetLevelUpTimer) onResetLevelUpTimer();
                if (onPausePlayerTimer) onPausePlayerTimer();
                if (onResetPlayerTimer) onResetPlayerTimer();
                onBackToSetup();
              }}
            >
              <ChevronLeft size={16} />
              Back to Setup
            </button>
            <h2 className="text-lg font-semibold text-gray-100">Simple Timer</h2>
          </div>
          <div />
        </div>
      </header>
      {/* Level Up Timer box (on top) */}
      <div className={`bg-gray-800 rounded-lg p-6 ${currentPhase === 'levelUp' ? 'ring-2 ring-emerald-400 shadow-lg' : ''}`}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl mb-0 flex-1 pr-4 min-w-0 truncate order-1">Level Up Phase</h3>
          <div className="flex items-center ml-4 flex-shrink-0 order-2">
            <EnhancedTooltip
              text={levelUpEnabled ? 'Disable level-up timer' : 'Enable level-up timer'}
              position="top"
            >
              <div
                className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${
                  levelUpEnabled ? 'bg-green-600 justify-end' : 'bg-gray-600 justify-start'
                }`}
                onClick={handleLevelUpToggle}
              >
                <div className="bg-white w-4 h-4 rounded-full"></div>
              </div>
            </EnhancedTooltip>
            <div className="ml-2">
              {levelUpEnabled ? <Clock size={16} /> : <Infinity size={16} />}
            </div>
          </div>
        </div>

        <div className={levelUpEnabled ? 'py-2' : 'py-2 opacity-50'}>
          <ActiveTimer
            name="Level Up"
            timeRemaining={levelUpTimeRemaining ?? 150}
            isActive={levelUpTimerActive ?? false}
            onStart={startLevelUp}
            onPause={() => onPauseLevelUpTimer && onPauseLevelUpTimer()}
            onReset={() => onResetLevelUpTimer && onResetLevelUpTimer()}
            onEndPhase={() => handleEndPhaseFor('levelUp')}
            enabled={levelUpEnabled}
            soundWarningEnabled={soundWarningEnabled}
            soundCompleteEnabled={soundCompleteEnabled}
          />
        </div>
      </div>

      {/* Strategy Timer box */}
      <div className={`bg-gray-800 rounded-lg p-6 ${currentPhase === 'strategy' ? 'ring-2 ring-emerald-400 shadow-lg' : ''}`}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl mb-0 flex-1 pr-4 min-w-0 truncate order-1">Strategy Phase</h3>
          <div className="flex items-center ml-4 flex-shrink-0 order-2">
            <EnhancedTooltip
              text={strategyEnabled ? 'Disable timer (unlimited time)' : 'Enable timer (timed phase)'}
              position="top"
            >
              <div
                className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${
                  strategyEnabled ? 'bg-green-600 justify-end' : 'bg-gray-600 justify-start'
                }`}
                onClick={handleStrategyToggle}
              >
                <div className="bg-white w-4 h-4 rounded-full"></div>
              </div>
            </EnhancedTooltip>
            <div className="ml-2">
              {strategyEnabled ? <Clock size={16} /> : <Infinity size={16} />}
            </div>
          </div>

          {/* Back button moved to top of screen */}
        </div>

        <div className={strategyEnabled ? 'py-2' : 'py-2 opacity-50'}>
          <ActiveTimer
            name="Strategy"
            timeRemaining={strategyTimeRemaining}
            isActive={strategyTimerActive}
            onStart={startStrategy}
            onPause={onPauseStrategyTimer}
            onReset={onResetStrategyTimer}
            onEndPhase={() => handleEndPhaseFor('strategy')}
            enabled={strategyEnabled}
            soundWarningEnabled={soundWarningEnabled}
            soundCompleteEnabled={soundCompleteEnabled}
          />
        </div>
      </div>

      {/* Player Timer box */}
      <div className={`bg-gray-800 rounded-lg p-6 ${currentPhase === 'player' ? 'ring-2 ring-emerald-400 shadow-lg' : ''}`}>
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-xl mb-0 flex-1 pr-4 min-w-0 truncate order-1">Player Phase</h3>
          <div className="flex items-center ml-4 flex-shrink-0 order-2">
            <EnhancedTooltip
              text={playerEnabled ? 'Disable player timer' : 'Enable player timer'}
              position="top"
            >
              <div
                className={`w-12 h-6 rounded-full flex items-center p-1 cursor-pointer transition-colors ${
                  playerEnabled ? 'bg-green-600 justify-end' : 'bg-gray-600 justify-start'
                }`}
                onClick={handlePlayerToggle}
              >
                <div className="bg-white w-4 h-4 rounded-full"></div>
              </div>
            </EnhancedTooltip>
            <div className="ml-2">
              {playerEnabled ? <Clock size={16} /> : <Infinity size={16} />}
            </div>
          </div>
        </div>

        <div className={playerEnabled ? 'py-2' : 'py-2 opacity-50'}>
          <ActiveTimer
            name="Player"
            timeRemaining={playerTimeRemaining ?? 30}
            isActive={playerTimerActive ?? false}
            onStart={startPlayer}
            onPause={() => onPausePlayerTimer && onPausePlayerTimer()}
            onReset={() => onResetPlayerTimer && onResetPlayerTimer()}
            onEndPhase={() => handleEndPhaseFor('player')}
            enabled={playerEnabled}
            soundWarningEnabled={soundWarningEnabled}
            soundCompleteEnabled={soundCompleteEnabled}
          />
        </div>
      </div>
    </div>
  );
};

export default SimpleGameTimer;
