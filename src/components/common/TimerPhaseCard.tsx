import React from 'react';

interface Props {
  title: string;
  isActive?: boolean;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

const TimerPhaseCard: React.FC<Props> = ({
  title,
  isActive = false,
  headerActions,
  children,
  className = '',
}) => (
  <div className={`rounded-lg ${isActive ? 'ring-2 ring-emerald-400 shadow-lg' : ''} ${className}`}>
    <div className="flex items-start justify-between mb-3 flex-shrink-0">
      <h3 className="text-xl mb-0 flex-1 pr-4 min-w-0 truncate">{title}</h3>
      {headerActions && (
        <div className="flex items-center ml-4 flex-shrink-0">{headerActions}</div>
      )}
    </div>
    {children}
  </div>
);

export default TimerPhaseCard;
