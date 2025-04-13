import React from 'react';
import GameTooltip from './GameTooltip';
import { getTooltipById } from '@/lib/tooltipData';

interface TooltipWrapperProps {
  id: string;
  children?: React.ReactNode;
  iconOnly?: boolean;
  iconSize?: number;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

/**
 * A wrapper component that makes it easy to add tooltips with just an ID
 */
export const TooltipWrapper: React.FC<TooltipWrapperProps> = ({
  id,
  children,
  iconOnly = false,
  iconSize,
  side,
  align,
}) => {
  const tooltipData = getTooltipById(id);

  // If tooltip data doesn't exist, just render the children
  if (!tooltipData) {
    console.warn(`Tooltip with ID "${id}" not found`);
    return <>{children}</>;
  }

  return (
    <GameTooltip
      mechanic={tooltipData}
      iconOnly={iconOnly}
      iconSize={iconSize}
      side={side}
      align={align}
    >
      {children}
    </GameTooltip>
  );
};

export default TooltipWrapper;