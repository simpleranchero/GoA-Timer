import React, { useEffect, useRef } from 'react';
import { Play, Pause, RefreshCw, ArrowRightCircle } from 'lucide-react';
import { useSound } from '../context/SoundContext';

interface Props {
  name: string;
  timeRemaining: number;
  isActive: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onEndPhase?: () => void;
  enabled?: boolean;
  soundWarningEnabled?: boolean;
  soundCompleteEnabled?: boolean;
}

const formatTime = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const ActiveTimer: React.FC<Props> = ({
  name,
  timeRemaining,
  isActive,
  onStart,
  onPause,
  onReset,
  onEndPhase,
  enabled = true,
  soundWarningEnabled = true,
  soundCompleteEnabled = true
}) => {
  const { playSound } = useSound();
  const audioRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningRef = useRef<boolean>(false);
  const hasPlayedRef = useRef(false);
  const completionTimeRef = useRef<number | null>(null);

  // Play timer warning when 10 seconds or less remain
  useEffect(() => {
    if (timeRemaining > 0 && timeRemaining <= 10 && isActive && !warningRef.current && soundWarningEnabled) {
      warningRef.current = true;
      playSound('timerWarning');
    } else if (timeRemaining > 10) {
      warningRef.current = false;
    }
  }, [timeRemaining, isActive, playSound, soundWarningEnabled]);

  // Play repeating completion audio when timer reaches 0
  useEffect(() => {
    if (timeRemaining === 0 && isActive && soundCompleteEnabled) {
      // If we haven't started the repeating sound yet, start it
      if (!hasPlayedRef.current) {
        hasPlayedRef.current = true;
        completionTimeRef.current = Date.now();
        // Play initial sound
        playSound('timerDone');
        
        // Set up repeating audio every second while timer is at 0
        audioRef.current = setInterval(() => {
          // Check if 10 seconds have passed since completion
          if (completionTimeRef.current && Date.now() - completionTimeRef.current >= 10000) {
            // Stop after 10 seconds
            if (audioRef.current) {
              clearInterval(audioRef.current);
              audioRef.current = null;
            }
            return;
          }
          playSound('timerDone');
        }, 1000);
      }
    } else {
      // Reset when timer is no longer at 0 or not active
      hasPlayedRef.current = false;
      completionTimeRef.current = null;
      if (audioRef.current) {
        clearInterval(audioRef.current);
        audioRef.current = null;
      }
    }

    return () => {
      if (audioRef.current) {
        clearInterval(audioRef.current);
      }
    };
  }, [timeRemaining, isActive, playSound, soundCompleteEnabled]);

  const isTimerComplete = timeRemaining === 0;

  // Stop repeating sound when any button is pressed
  const stopRepeatSound = () => {
    if (audioRef.current) {
      clearInterval(audioRef.current);
      audioRef.current = null;
      hasPlayedRef.current = false;
      completionTimeRef.current = null;
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <div className={`text-5xl font-mono font-bold my-4 ${isTimerComplete ? 'timer-complete' : ''}`}>{formatTime(timeRemaining)}</div>

      <div className="flex justify-center gap-3">
        {isActive ? (
          <button
            className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 flex items-center gap-2"
            onClick={() => { 
              stopRepeatSound();
              playSound('buttonClick'); 
              onPause(); 
            }}
            disabled={!enabled}
          >
            <Pause size={16} /> Pause
          </button>
        ) : (
          <button
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2"
            onClick={() => { 
              stopRepeatSound();
              playSound('buttonClick'); 
              onStart(); 
            }}
            disabled={!enabled}
          >
            <Play size={16} /> Start
          </button>
        )}

        <button
          className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center gap-2"
          onClick={() => {
            stopRepeatSound();
            playSound('buttonClick');
            // Preserve prior running state: if timer was active, reset then restart;
            // if it was paused, keep it paused after reset.
            if (isActive) {
              onReset();
              onStart();
            } else {
              onPause();
              onReset();
            }
          }}
        >
          <RefreshCw size={16} /> Reset
        </button>

        {onEndPhase && (
          <button
            className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center gap-2"
            onClick={() => { 
              stopRepeatSound();
              playSound('buttonClick'); 
              onEndPhase(); 
            }}
            aria-label={`End ${name} phase`}
          >
            <ArrowRightCircle size={16} /> End Phase
          </button>
        )}
      </div>
    </div>
  );
};

export default ActiveTimer;
