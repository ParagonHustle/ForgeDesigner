import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Plus, Minus, Lock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { BuildingUpgrade } from '@shared/schema';

// Define skill tree data
export const bountySkills = [
  {
    id: 'questRewards',
    name: 'Quest Rewards',
    description: 'Increases gold rewards from bounty quests by 10% per level',
    maxLevel: 5,
    requires: [],
    position: { x: 1, y: 1 },
    color: '#FFD700',
    icon: '💰'
  },
  {
    id: 'questSlots',
    name: 'Quest Slots',
    description: 'Increases available daily quest slots by 1 per level',
    maxLevel: 3,
    requires: [],
    position: { x: 3, y: 1 },
    color: '#4169E1',
    icon: '📜'
  },
  {
    id: 'resourceBonus',
    name: 'Resource Hunter',
    description: 'Increases resource rewards from bounty quests by 15% per level',
    maxLevel: 4,
    requires: ['questRewards'],
    position: { x: 1, y: 2 },
    color: '#32CD32',
    icon: '🌿'
  },
  {
    id: 'questDuration',
    name: 'Swift Hunter',
    description: 'Decreases quest completion time by 5% per level',
    maxLevel: 3,
    requires: ['questSlots'],
    position: { x: 3, y: 2 },
    color: '#1E90FF',
    icon: '⏱️'
  },
  {
    id: 'rareQuests',
    name: 'Rare Quests',
    description: 'Increases chance to find rare quests by 10% per level',
    maxLevel: 3,
    requires: ['resourceBonus', 'questDuration'],
    position: { x: 2, y: 3 },
    color: '#9932CC',
    icon: '✨'
  },
  {
    id: 'legendaryQuests',
    name: 'Legendary Pursuit',
    description: 'Unlocks legendary quests with exceptional rewards',
    maxLevel: 1,
    requires: ['rareQuests'],
    position: { x: 2, y: 4 },
    color: '#FF4500',
    icon: '🏆'
  }
];

interface BountyBoardSkillTreeProps {
  building?: BuildingUpgrade;
  onUpgrade?: () => void;
}

export const BountyBoardSkillTree = ({ building, onUpgrade }: BountyBoardSkillTreeProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [skillDistribution, setSkillDistribution] = useState<Record<string, number>>({});
  const [availablePoints, setAvailablePoints] = useState(0);

  // Fetch bounty board data
  const { data: bountyBoard, isLoading, isError } = useQuery({
    queryKey: ['/api/buildings/bountyBoard'],
    enabled: !!building
  });

  useEffect(() => {
    if (bountyBoard) {
      // Ensure skillDistribution is a valid object
      const distribution = bountyBoard.skillDistribution || {};
      setSkillDistribution(distribution as Record<string, number>);
      
      // Initialize skill levels that aren't set
      bountySkills.forEach(skill => {
        if (!(skill.id in distribution)) {
          setSkillDistribution(prev => ({ ...prev, [skill.id]: 0 }));
        }
      });
      
      // Set available points
      setAvailablePoints(bountyBoard.availableSkillPoints || 0);
    }
  }, [bountyBoard]);

  // Mutation to update skill distribution
  const updateSkillsMutation = useMutation({
    mutationFn: async (data: { skillDistribution: Record<string, number> }) => {
      return apiRequest('POST', '/api/buildings/skills/bountyBoard', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/buildings/bountyBoard'] });
      toast({
        title: 'Skills Updated',
        description: 'Your skill points have been allocated successfully.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update skills. Please try again.',
        variant: 'destructive',
      });
    }
  });

  // Check if a skill can be allocated points
  const canAllocateSkill = (skillId: string): boolean => {
    if (availablePoints <= 0) return false;
    
    const skill = bountySkills.find(s => s.id === skillId);
    if (!skill) return false;
    
    // Check level cap
    const currentLevel = skillDistribution[skillId] || 0;
    if (currentLevel >= skill.maxLevel) return false;
    
    // Check prerequisites
    if (skill.requires.length > 0) {
      const hasPrerequisites = skill.requires.every(reqId => {
        const reqSkill = bountySkills.find(s => s.id === reqId);
        return reqSkill && (skillDistribution[reqId] || 0) > 0;
      });
      
      if (!hasPrerequisites) return false;
    }
    
    return true;
  };

  // Check if points can be removed from a skill
  const canDeallocateSkill = (skillId: string): boolean => {
    const currentLevel = skillDistribution[skillId] || 0;
    if (currentLevel <= 0) return false;
    
    // Check if any dependent skills are allocated
    const dependentSkills = bountySkills.filter(skill => 
      skill.requires.includes(skillId) && (skillDistribution[skill.id] || 0) > 0
    );
    
    return dependentSkills.length === 0;
  };

  // Handle allocating/deallocating skill points
  const handleSkillChange = (skillId: string, add: boolean) => {
    if (add && !canAllocateSkill(skillId)) return;
    if (!add && !canDeallocateSkill(skillId)) return;
    
    const newDistribution = { ...skillDistribution };
    newDistribution[skillId] = (newDistribution[skillId] || 0) + (add ? 1 : -1);
    
    // Update in the state
    setSkillDistribution(newDistribution);
    setAvailablePoints(prev => prev + (add ? -1 : 1));
    
    // Send to the server
    updateSkillsMutation.mutate({ skillDistribution: newDistribution });
  };
  
  if (isLoading) {
    return <div className="text-center p-8">Loading skill tree...</div>;
  }
  
  if (isError) {
    return <div className="text-center p-8 text-red-500">Failed to load skill tree. Please try again.</div>;
  }
  
  return (
    <div className="relative w-full">
      <Card className="bg-gradient-to-br from-[#2A1657] to-[#392179] border-[#4F3293] text-white p-6 mb-6">
        <h3 className="text-xl font-bold mb-4">Bounty Board Skill Tree</h3>
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="text-sm text-[#A390D3]">Building Level:</span>
            <span className="ml-2 font-semibold">{building?.currentLevel || 1}</span>
          </div>
          <div>
            <span className="text-sm text-[#A390D3]">Available Points:</span>
            <span className="ml-2 font-semibold text-amber-300">{availablePoints}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-3 gap-4 relative">
          {bountySkills.map(skill => {
            const currentLevel = skillDistribution[skill.id] || 0;
            const maxLevel = skill.maxLevel;
            const progress = (currentLevel / maxLevel) * 100;
            const isLocked = skill.requires.some(reqId => !(skillDistribution[reqId] || 0));
            
            return (
              <div 
                key={skill.id}
                className={`relative col-start-${skill.position.x} row-start-${skill.position.y}`}
                style={{ gridColumn: skill.position.x, gridRow: skill.position.y }}
              >
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card 
                        className={`p-3 w-full h-full flex flex-col items-center 
                          ${isLocked 
                            ? 'bg-gray-800/60 border-gray-700' 
                            : `bg-gradient-to-b from-${skill.color}/20 to-${skill.color}/5 border-${skill.color}/30`}`}
                      >
                        {isLocked && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-md z-10">
                            <Lock className="text-gray-500 w-6 h-6" />
                          </div>
                        )}
                        
                        <div className="text-2xl mb-2">{skill.icon}</div>
                        <div className="font-semibold text-center mb-1">{skill.name}</div>
                        <div className="text-xs text-center text-gray-300 mb-2">Level: {currentLevel}/{maxLevel}</div>
                        
                        <Progress value={progress} className="h-2 w-full mb-3" />
                        
                        <div className="flex justify-between w-full mt-auto">
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={!canDeallocateSkill(skill.id)}
                            onClick={() => handleSkillChange(skill.id, false)}
                            className="h-7 w-7 rounded-full"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="icon"
                            disabled={!canAllocateSkill(skill.id)}
                            onClick={() => handleSkillChange(skill.id, true)}
                            className="h-7 w-7 rounded-full"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <div className="font-bold">{skill.name}</div>
                      <div className="text-sm">{skill.description}</div>
                      <div className="text-xs mt-1">
                        {skill.requires.length > 0 && (
                          <div className="mt-1">
                            <span className="font-semibold">Requires:</span> {skill.requires.join(', ')}
                          </div>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          })}
          
          {/* Draw lines between connected skills */}
          <svg className="absolute inset-0 w-full h-full -z-10 text-white/20">
            {bountySkills.map(skill => 
              skill.requires.map(reqId => {
                const parentSkill = bountySkills.find(s => s.id === reqId);
                if (!parentSkill) return null;
                
                // Calculate line positions
                const startX = (parentSkill.position.x - 0.5) * 33.33 + '%';
                const startY = (parentSkill.position.y - 0.5) * 33.33 + '%';
                const endX = (skill.position.x - 0.5) * 33.33 + '%';
                const endY = (skill.position.y - 0.5) * 33.33 + '%';
                
                return (
                  <line 
                    key={`${skill.id}-${reqId}`}
                    x1={startX} 
                    y1={startY} 
                    x2={endX} 
                    y2={endY} 
                    stroke="currentColor" 
                    strokeWidth="2"
                    strokeDasharray={!(skillDistribution[reqId] || 0) ? "4" : "0"}
                  />
                );
              })
            )}
          </svg>
        </div>
      </Card>
    </div>
  );
};

// We use named export for consistency
// export default BountyBoardSkillTree is removed intentionally