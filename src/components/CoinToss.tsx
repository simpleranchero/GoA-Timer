// src/components/CoinToss.tsx
import React, { useState, useEffect } from 'react';
import { useSound } from '../context/SoundContext';

export type CoinSide = 'blue' | 'red';

interface CoinTossProps {
  result: CoinSide;
  onComplete: () => void;
}

const AUTO_DISMISS_DELAY_MS = 1000;

const CoinToss: React.FC<CoinTossProps> = ({ result, onComplete }) => {
  const [isFlipping, setIsFlipping] = useState(false);
  const { playSound } = useSound();

  useEffect(() => {
    // Start the coin flip animation
    setIsFlipping(true);

    // Play coin flip sound when component mounts
    playSound('coinFlip');

    // Land the coin after the animation duration
    const landTimer = setTimeout(() => {
      setIsFlipping(false);
    }, 3000); // Match this to the animation duration in CSS

    return () => clearTimeout(landTimer);
  }, []);

  useEffect(() => {
    if (isFlipping) return;
    // Auto-dismiss shortly after the coin lands (animation end or tap-to-skip).
    const dismissTimer = setTimeout(onComplete, AUTO_DISMISS_DELAY_MS);
    return () => clearTimeout(dismissTimer);
  }, [isFlipping, onComplete]);

  const handleSkip = () => {
    setIsFlipping(false);
  };

  return (
    <div
      className="fixed top-0 left-0 w-full h-full bg-black/80 flex flex-col items-center justify-center z-50 cursor-pointer"
      onClick={isFlipping ? handleSkip : undefined}
    >
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-8 text-white">Randomizing Tiebreaker</h2>

        <div className="coin-flip-container">
          <div className={`coin ${isFlipping ? 'flipping' : ''} ${result === 'blue' ? 'flip-blue' : 'flip-red'}`}>
            <div className="coin-face heads">
              <div className="coin-emblem">Blue</div>
              <div className="coin-shine"></div>
            </div>
            <div className="coin-face tails">
              <div className="coin-emblem">Red</div>
              <div className="coin-shine"></div>
            </div>
          </div>
        </div>

        <div className="text-2xl font-bold mt-8 text-white">
          {result === 'blue' ? 'Blue goes first!' : 'Red goes first!'}
        </div>

        {isFlipping && (
          <p className="text-gray-400 text-sm mt-4">Tap anywhere to skip</p>
        )}
      </div>

      {/* Add CSS to handle different end states based on result */}
      <style>{`
        .coin.flipping.flip-blue {
          animation: flipCoinBlue 3s ease-out forwards;
        }

        .coin.flipping.flip-red {
          animation: flipCoinRed 3s ease-out forwards;
        }

        .coin.flip-blue:not(.flipping) {
          transform: rotateY(0deg) rotateX(10deg);
        }

        .coin.flip-red:not(.flipping) {
          transform: rotateY(180deg) rotateX(10deg);
        }

        @keyframes flipCoinBlue {
          0% { transform: rotateY(0) rotateX(0); }
          20% { transform: rotateY(180deg) rotateX(10deg); }
          40% { transform: rotateY(360deg) rotateX(-10deg); }
          60% { transform: rotateY(540deg) rotateX(10deg); }
          80% { transform: rotateY(720deg) rotateX(-10deg); }
          100% { transform: rotateY(0deg) rotateX(10deg); }
        }

        @keyframes flipCoinRed {
          0% { transform: rotateY(0) rotateX(0); }
          20% { transform: rotateY(180deg) rotateX(10deg); }
          40% { transform: rotateY(360deg) rotateX(-10deg); }
          60% { transform: rotateY(540deg) rotateX(10deg); }
          80% { transform: rotateY(720deg) rotateX(-10deg); }
          100% { transform: rotateY(180deg) rotateX(10deg); }
        }
      `}</style>
    </div>
  );
};

export default CoinToss;
