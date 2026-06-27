import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { useSound } from '../context/SoundContext';
import ActiveTimer from './ActiveTimer';
import TimerPhaseCard from './common/TimerPhaseCard';
import { useTap } from '../hooks/useTap';

type Phase = 'levelUp' | 'strategy' | 'player';

interface Props {
  strategyTimeRemaining: number;
  strategyTimerActive: boolean;
  onStartStrategyTimer: () => void;
  onPauseStrategyTimer: () => void;
  onResetStrategyTimer: () => void;
  onBackToSetup: () => void;
  onEndPhase?: () => void;
  levelUpTimeRemaining?: number;
  levelUpTimerActive?: boolean;
  onStartLevelUpTimer?: () => void;
  onPauseLevelUpTimer?: () => void;
  onResetLevelUpTimer?: () => void;
  playerTimeRemaining?: number;
  playerTimerActive?: boolean;
  onStartPlayerTimer?: () => void;
  onPausePlayerTimer?: () => void;
  onResetPlayerTimer?: () => void;
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
  onEndPhase,
  levelUpTimeRemaining,
  levelUpTimerActive,
  onStartLevelUpTimer,
  onPauseLevelUpTimer,
  onResetLevelUpTimer,
  playerTimeRemaining,
  playerTimerActive,
  onStartPlayerTimer,
  onPausePlayerTimer,
  onResetPlayerTimer,
  soundWarningEnabled,
  soundCompleteEnabled,
}) => {
  const { playSound } = useSound();
  const [currentPhase, setCurrentPhase] = React.useState<Phase>('levelUp');

  React.useEffect(() => {
    if (levelUpTimerActive) { setCurrentPhase('levelUp'); return; }
    if (strategyTimerActive) { setCurrentPhase('strategy'); return; }
    if (playerTimerActive) { setCurrentPhase('player'); return; }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pausePhase = (phase: Phase) => {
    if (phase === 'levelUp') onPauseLevelUpTimer?.();
    else if (phase === 'strategy') onPauseStrategyTimer();
    else onPausePlayerTimer?.();
  };

  const resetPhase = (phase: Phase) => {
    if (phase === 'levelUp') onResetLevelUpTimer?.();
    else if (phase === 'strategy') onResetStrategyTimer();
    else onResetPlayerTimer?.();
  };

  const startPhase = (phase: Phase) => {
    if (phase === 'levelUp') onStartLevelUpTimer?.();
    else if (phase === 'strategy') onStartStrategyTimer();
    else onStartPlayerTimer?.();
  };

  const isRunning = (phase: Phase) =>
    phase === 'levelUp' ? (levelUpTimerActive ?? false)
    : phase === 'strategy' ? strategyTimerActive
    : (playerTimerActive ?? false);

  const switchToPhase = (phase: Phase) => {
    pausePhase(currentPhase);
    resetPhase(currentPhase);
    setCurrentPhase(phase);
  };

  const switchAndStart = (phase: Phase) => {
    if (currentPhase !== phase) {
      pausePhase(currentPhase);
      resetPhase(currentPhase);
    }
    setCurrentPhase(phase);
    startPhase(phase);
  };

  const handleEndPhaseFor = (phase: Phase) => {
    pausePhase(phase);
    resetPhase(phase);
    if (phase === 'strategy') onEndPhase?.();
    const next: Phase = phase === 'levelUp' ? 'strategy' : phase === 'strategy' ? 'player' : 'levelUp';
    setCurrentPhase(next);
  };

  const makeTapHandlers = (phase: Phase) => ({
    onSingleTap: currentPhase === phase
      ? () => { isRunning(phase) ? pausePhase(phase) : startPhase(phase); }
      : () => switchToPhase(phase),
    onDoubleTap: currentPhase === phase
      ? () => {
          const running = isRunning(phase);
          pausePhase(phase);
          resetPhase(phase);
          if (running) startPhase(phase);
        }
      : () => switchToPhase(phase),
  });

  const lu = makeTapHandlers('levelUp');
  const st = makeTapHandlers('strategy');
  const pl = makeTapHandlers('player');

  const levelUpTap = useTap(lu.onSingleTap, lu.onDoubleTap);
  const strategyTap = useTap(st.onSingleTap, st.onDoubleTap);
  const playerTap = useTap(pl.onSingleTap, pl.onDoubleTap);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-900">
      <header className="flex-shrink-0 z-40 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            aria-label="Back to Setup"
            className="px-3 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white font-medium flex items-center gap-2"
            onClick={() => {
              playSound('buttonClick');
              pausePhase('levelUp'); resetPhase('levelUp');
              pausePhase('strategy'); resetPhase('strategy');
              pausePhase('player'); resetPhase('player');
              onBackToSetup();
            }}
          >
            <ChevronLeft size={16} />
            Back to Setup
          </button>
          <h2 className="text-lg font-semibold text-gray-100">Simple Timer</h2>
        </div>
      </header>

      <div className="flex flex-col flex-1 gap-2 p-2 overflow-hidden">
        <div
          className="flex-1 min-h-0 cursor-pointer select-none touch-manipulation"
          onPointerUp={levelUpTap.onPointerUp}
        >
          <TimerPhaseCard
            title="Level Up Phase"
            isActive={currentPhase === 'levelUp'}
            className="bg-gray-800 p-4 h-full flex flex-col"
          >
            <div className="flex-1 min-h-0 flex flex-col justify-center">
              <ActiveTimer
                name="Level Up"
                timeRemaining={levelUpTimeRemaining ?? 150}
                isActive={levelUpTimerActive ?? false}
                onStart={() => switchAndStart('levelUp')}
                onPause={() => pausePhase('levelUp')}
                onReset={() => resetPhase('levelUp')}
                onEndPhase={() => handleEndPhaseFor('levelUp')}
                soundWarningEnabled={soundWarningEnabled}
                soundCompleteEnabled={soundCompleteEnabled}
              />
            </div>
          </TimerPhaseCard>
        </div>

        <div
          className="flex-1 min-h-0 cursor-pointer select-none touch-manipulation"
          onPointerUp={strategyTap.onPointerUp}
        >
          <TimerPhaseCard
            title="Strategy Phase"
            isActive={currentPhase === 'strategy'}
            className="bg-gray-800 p-4 h-full flex flex-col"
          >
            <div className="flex-1 min-h-0 flex flex-col justify-center">
              <ActiveTimer
                name="Strategy"
                timeRemaining={strategyTimeRemaining}
                isActive={strategyTimerActive}
                onStart={() => switchAndStart('strategy')}
                onPause={() => pausePhase('strategy')}
                onReset={() => resetPhase('strategy')}
                onEndPhase={() => handleEndPhaseFor('strategy')}
                soundWarningEnabled={soundWarningEnabled}
                soundCompleteEnabled={soundCompleteEnabled}
              />
            </div>
          </TimerPhaseCard>
        </div>

        <div
          className="flex-1 min-h-0 cursor-pointer select-none touch-manipulation"
          onPointerUp={playerTap.onPointerUp}
        >
          <TimerPhaseCard
            title="Player Phase"
            isActive={currentPhase === 'player'}
            className="bg-gray-800 p-4 h-full flex flex-col"
          >
            <div className="flex-1 min-h-0 flex flex-col justify-center">
              <ActiveTimer
                name="Player"
                timeRemaining={playerTimeRemaining ?? 30}
                isActive={playerTimerActive ?? false}
                onStart={() => switchAndStart('player')}
                onPause={() => pausePhase('player')}
                onReset={() => resetPhase('player')}
                onEndPhase={() => handleEndPhaseFor('player')}
                soundWarningEnabled={soundWarningEnabled}
                soundCompleteEnabled={soundCompleteEnabled}
              />
            </div>
          </TimerPhaseCard>
        </div>
      </div>
    </div>
  );
};

export default SimpleGameTimer;
