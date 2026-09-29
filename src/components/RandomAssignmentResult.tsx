// src/components/RandomAssignmentResult.tsx
// Displays the Draft card's "All Random" hero assignment as Blue/Red columns.
// See thoughts/requirements/refined/7.1-draft-enchant.md (REQ-7.1 Part B, R11).
import React from 'react';
import { AssignedRoster, AssignedPilot } from '../services/HeroAssignment';

interface RandomAssignmentResultProps {
  assignment: AssignedRoster;
}

const RandomAssignmentResult: React.FC<RandomAssignmentResultProps> = ({ assignment }) => {
  const renderColumn = (pilots: AssignedPilot[]) => (
    <div className="flex flex-col gap-4">
      {pilots.map((pilot, i) => (
        <div key={`${pilot.name}-${i}`} className="px-3 py-3 rounded-lg bg-gray-700">
          <div className="font-medium mb-2 text-sm">{pilot.name}</div>
          <div className="flex flex-wrap gap-4">
            {pilot.heroes.map(hero => (
              <div key={hero.id} className="text-center">
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
                <div className="mt-1 text-sm">{hero.name}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <h3 className="text-lg font-semibold mb-2 text-blue-400">Blue</h3>
        {renderColumn(assignment.blue)}
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-2 text-red-400">Red</h3>
        {renderColumn(assignment.red)}
      </div>
    </div>
  );
};

export default RandomAssignmentResult;
