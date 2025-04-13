import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { InfoIcon, Lightbulb } from 'lucide-react';

// Define the tooltip data structure
export interface GameMechanicTooltip {
  id: string;
  title: string;
  description: string;
  category: 'combat' | 'farming' | 'forge' | 'dungeons' | 'building' | 'general' | 'character' | 'aura';
}

// Props for the GameTooltip component
interface GameTooltipProps {
  mechanic: GameMechanicTooltip;
  children?: React.ReactNode;
  iconOnly?: boolean;
  iconSize?: number;
  iconColor?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
}

export const GameTooltip: React.FC<GameTooltipProps> = ({
  mechanic,
  children,
  iconOnly = false,
  iconSize = 16,
  iconColor = '#FDA643', // Golden-orange color
  side = "top",
  align = "center",
}) => {
  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger className="inline-flex items-center gap-1 cursor-help">
          {children}
          {(iconOnly || !children) && (
            <InfoIcon
              size={iconSize}
              className="text-primary-600 cursor-help"
              color={iconColor}
            />
          )}
          {!iconOnly && children && (
            <InfoIcon
              size={iconSize}
              className="ml-1 text-primary-600 cursor-help"
              color={iconColor}
            />
          )}
        </TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className="bg-gray-900/95 border-purple-900 text-white p-3 max-w-xs rounded-lg shadow-xl z-50"
        >
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Lightbulb className="text-yellow-400 mt-0.5 flex-shrink-0" size={18} />
              <h4 className="font-semibold text-yellow-400">{mechanic.title}</h4>
            </div>
            <p className="text-sm leading-relaxed">{mechanic.description}</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// Export a default function to easily get a tooltip by ID
export default GameTooltip;