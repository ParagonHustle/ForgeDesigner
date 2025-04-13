import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { HelpCircle, Lightbulb } from 'lucide-react';
import { gameMechanicsTooltips } from '@/lib/tooltipData';
import { GameMechanicTooltip } from '@/components/common/GameTooltip';

// Props for the MechanicsHelpModal
interface MechanicsHelpModalProps {
  initialCategory?: GameMechanicTooltip['category'];
  buttonText?: string;
  buttonVariant?: 'default' | 'outline' | 'ghost';
  buttonSize?: 'sm' | 'default' | 'lg';
  iconOnly?: boolean;
}

/**
 * A modal that displays all game mechanics tooltips, organized by category
 */
export const MechanicsHelpModal: React.FC<MechanicsHelpModalProps> = ({
  initialCategory = 'general',
  buttonText = 'Game Mechanics',
  buttonVariant = 'outline',
  buttonSize = 'sm',
  iconOnly = false,
}) => {
  // Group tooltips by category
  const tooltipsByCategory = React.useMemo(() => {
    const grouped: Record<string, GameMechanicTooltip[]> = {};
    
    gameMechanicsTooltips.forEach(tooltip => {
      if (!grouped[tooltip.category]) {
        grouped[tooltip.category] = [];
      }
      grouped[tooltip.category].push(tooltip);
    });
    
    return grouped;
  }, []);

  // Get unique categories
  const categories = React.useMemo(() => {
    return Object.keys(tooltipsByCategory) as GameMechanicTooltip['category'][];
  }, [tooltipsByCategory]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant={buttonVariant} size={buttonSize}>
          <HelpCircle className="mr-2" size={16} />
          {!iconOnly && buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-purple-900 text-white sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-yellow-400 font-semibold text-xl flex items-center gap-2">
            <Lightbulb className="text-yellow-400" size={20} />
            Game Mechanics Guide
          </DialogTitle>
          <DialogDescription className="text-gray-300">
            Learn about various mechanics and systems in The Forge.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={initialCategory} className="w-full">
          <TabsList className="grid grid-cols-4 sm:grid-cols-7 mb-4">
            {categories.map((category) => (
              <TabsTrigger 
                key={category} 
                value={category}
                className="capitalize text-xs sm:text-sm"
              >
                {category}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((category) => (
            <TabsContent key={category} value={category} className="space-y-4">
              {tooltipsByCategory[category].map((tooltip) => (
                <div key={tooltip.id} className="bg-gray-800/60 rounded-lg p-4">
                  <h3 className="text-yellow-400 font-semibold mb-2 flex items-center gap-2">
                    <Lightbulb className="text-yellow-400" size={16} />
                    {tooltip.title}
                  </h3>
                  <p className="text-gray-200 text-sm leading-relaxed">
                    {tooltip.description}
                  </p>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default MechanicsHelpModal;