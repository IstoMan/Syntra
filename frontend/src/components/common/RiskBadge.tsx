import React from 'react';
import { RiskLevel } from '../../types';
import { Badge } from '../ui/badge';

interface RiskBadgeProps {
  level: RiskLevel | string;
  size?: 'sm' | 'md' | 'lg';
  showPulse?: boolean;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level, size = 'md', showPulse = false }) => {
  const normLevel = (level || 'LOW').toUpperCase();

  const getVariant = () => {
    switch (normLevel) {
      case 'CRITICAL':
        return 'critical';
      case 'HIGH':
        return 'high';
      case 'MEDIUM':
        return 'medium';
      case 'LOW':
      default:
        return 'low';
    }
  };

  const getDotColor = () => {
    switch (normLevel) {
      case 'CRITICAL':
        return 'bg-red-400';
      case 'HIGH':
        return 'bg-rose-400';
      case 'MEDIUM':
        return 'bg-amber-400';
      case 'LOW':
      default:
        return 'bg-emerald-400';
    }
  };

  const sizeClasses = size === 'sm' 
    ? 'text-[10px] px-2 py-0.5' 
    : size === 'lg' 
    ? 'text-sm px-3 py-1 font-bold' 
    : 'text-xs px-2.5 py-0.5 font-bold';

  return (
    <Badge 
      variant={getVariant()} 
      dotColor={getDotColor()} 
      pulse={showPulse && normLevel !== 'LOW'}
      className={sizeClasses}
    >
      {normLevel}
    </Badge>
  );
};
