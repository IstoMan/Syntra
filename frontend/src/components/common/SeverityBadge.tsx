import React from 'react';
import { AlertSeverity } from '../../types';
import { Badge } from '../ui/badge';

interface SeverityBadgeProps {
  severity: AlertSeverity | string;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ severity }) => {
  const norm = (severity || 'LOW').toUpperCase();

  const getVariant = () => {
    switch (norm) {
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

  return (
    <Badge variant={getVariant()} className="font-mono text-[10.5px] font-bold">
      {norm}
    </Badge>
  );
};
