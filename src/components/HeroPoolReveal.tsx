// src/components/HeroPoolReveal.tsx
// Non-interactive hero-pool grid for the Draft card's reveal.
// See thoughts/requirements/refined/5-draft.md (REQ-5 R4-R6).
import React from 'react';
import { Hero } from '../types';

interface HeroPoolRevealProps {
  heroes: Hero[];
}

const HeroPoolReveal: React.FC<HeroPoolRevealProps> = ({ heroes }) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
      {heroes.map(hero => (
        <div key={hero.id} className="p-4 rounded-lg bg-gray-800">
          <div className="text-center mb-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-300 rounded-full mx-auto overflow-hidden">
              <img
                src={hero.icon}
                alt={hero.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://via.placeholder.com/96?text=Hero';
                }}
              />
            </div>
            <div className="mt-2 font-medium text-lg">{hero.name}</div>
          </div>

          <div className="flex justify-center mb-2">
            {[...Array(hero.complexity)].map((_, i) => (
              <span key={i} className="text-yellow-400 text-base sm:text-lg">★</span>
            ))}
            {[...Array(4 - hero.complexity)].map((_, i) => (
              <span key={i + hero.complexity} className="text-gray-600 text-base sm:text-lg">★</span>
            ))}
          </div>

          <div className="text-xs sm:text-sm text-center text-gray-300">
            {hero.roles.join(', ')}
          </div>
        </div>
      ))}
    </div>
  );
};

export default HeroPoolReveal;
