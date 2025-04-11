import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useDiscordAuth } from '@/lib/discordAuth';
import { useToast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TreeDeciduous,
  ChevronRight,
  Plus,
  Minus,
  Info,
  Lock,
  Target,
  Clock,
  Coins,
  Zap,
  Award,
  Sparkles,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type { BuildingUpgrade } from '@shared/schema';

// Define skill tree skills for the Bounty Board
const bountySkills = [
  {
    id: 'questSlots',
    name: 'Quest Slots',
    description: 'Increases maximum number of active quests',
    maxLevel: 5,
    icon: <Target className="h-5 w-5" />,
    color: 'text-[#00B9AE]',
    benefits: [
      '+1 quest slot',
      '+2 quest slots',
      '+3 quest slots',
      '+4 quest slots',
      '+5 quest slots',
    ],
    requires: null,
  },
  {
    id: 'questDuration',
    name: 'Improved Duration',
    description: 'Increases quest duration time',
    maxLevel: 3,
    icon: <Clock className="h-5 w-5" />,
    color: 'text-[#9B59B6]',
    benefits: [
      '+4 hours to quest duration',
      '+8 hours to quest duration',
      '+12 hours to quest duration',
    ],
    requires: 'questSlots',
    requiredLevel: 2,
  },
  {
    id: 'rewardBonus',
    name: 'Reward Multiplier',
    description: 'Increases rewards from completed quests',
    maxLevel: 5,
    icon: <Coins className="h-5 w-5" />,
    color: 'text-[#FFD700]',
    benefits: [
      '+10% increased rewards',
      '+20% increased rewards',
      '+30% increased rewards',
      '+40% increased rewards',
      '+50% increased rewards',
    ],
    requires: 'questSlots',
    requiredLevel: 3,
  },
  {
    id: 'rareQuests',
    name: 'Rare Quests',
    description: 'Chance to discover rare quests with special rewards',
    maxLevel: 3,
    icon: <Sparkles className="h-5 w-5" />,
    color: 'text-[#FF9D00]',
    benefits: [
      '10% chance for rare quests',
      '20% chance for rare quests',
      '30% chance for rare quests',
    ],
    requires: 'rewardBonus',
    requiredLevel: 2,
  },
  {
    id: 'progressionSpeed',
    name: 'Faster Progression',
    description: 'Tasks in quests progress faster',
    maxLevel: 3,
    icon: <Zap className="h-5 w-5" />,
    color: 'text-[#3498DB]',
    benefits: [
      '+15% faster progression',
      '+30% faster progression',
      '+45% faster progression',
    ],
    requires: 'questDuration',
    requiredLevel: 2,
  },
  {
    id: 'legendaryQuests',
    name: 'Legendary Quests',
    description: 'Chance to discover legendary quests with powerful rewards',
    maxLevel: 1,
    icon: <Award className="h-5 w-5" />,
    color: 'text-[#E74C3C]',
    benefits: [
      'Unlocks legendary quests with unique rewards',
    ],
    requires: 'rareQuests',
    requiredLevel: 3,
  },
];

interface SkillNodeProps {
  skill: typeof bountySkills[0];
  currentLevel: number;
  availablePoints: number;
  skillDistribution: Record<string, number>;
  canAllocate: (skillId: string) => boolean;
  onAllocate: (skillId: string, add: boolean) => void;
}

// Skill Node Component
const SkillNode: React.FC<SkillNodeProps> = ({
  skill,
  currentLevel,
  availablePoints,
  skillDistribution,
  canAllocate,
  onAllocate,
}) => {
  const skillLevel = skillDistribution[skill.id] || 0;
  const isMaxed = skillLevel >= skill.maxLevel;
  const canAdd = !isMaxed && availablePoints > 0 && canAllocate(skill.id);
  const hasPoints = skillLevel > 0;
  const isLocked = !canAllocate(skill.id) && skillLevel === 0;
  
  return (
    <div className={`relative ${isLocked ? 'opacity-60' : ''}`}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div 
              className={`
                flex flex-col items-center justify-center w-20 h-20 rounded-lg p-2
                ${hasPoints ? 'bg-[#432874]/50 border-2 border-[#FF9D00]' : 'bg-[#1F1D36]/80 border border-[#432874]/50'}
                ${canAdd ? 'cursor-pointer hover:bg-[#432874]/70' : 'cursor-default'}
                transition-all duration-200
              `}
              onClick={() => canAdd && onAllocate(skill.id, true)}
            >
              <div className={`${skill.color} mb-1`}>
                {skill.icon}
              </div>
              <div className="text-xs font-semibold text-center">{skill.name}</div>
              {skillLevel > 0 && (
                <Badge className="bg-[#FF9D00]/80 text-[#1A1A2E] mt-1 text-xs px-2 py-0">
                  {skillLevel}/{skill.maxLevel}
                </Badge>
              )}
              {isLocked && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#000]/50 rounded-lg">
                  <Lock className="h-6 w-6 text-[#C8B8DB]/70" />
                </div>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="w-64 p-3 bg-[#1A1A2E] border border-[#432874]">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <div className={`${skill.color} mr-2`}>
                    {skill.icon}
                  </div>
                  <h4 className="font-semibold">{skill.name}</h4>
                </div>
                <Badge className={isMaxed ? 'bg-[#00B9AE]' : 'bg-[#432874]/80'}>
                  {skillLevel}/{skill.maxLevel}
                </Badge>
              </div>
              
              <p className="text-sm text-[#C8B8DB]/80">{skill.description}</p>
              
              {skill.requires && (
                <div className="text-xs text-[#C8B8DB]/70 flex items-center mt-1">
                  <Info className="h-3 w-3 mr-1" />
                  Requires {bountySkills.find(s => s.id === skill.requires)?.name} Lv.{skill.requiredLevel}
                </div>
              )}
              
              <div className="mt-2">
                <div className="text-xs font-semibold mb-1">Current Benefit:</div>
                <div className="text-sm text-[#FF9D00]">
                  {skillLevel > 0 ? skill.benefits[skillLevel - 1] : 'None'}
                </div>
              </div>
              
              {!isMaxed && (
                <div className="mt-1">
                  <div className="text-xs font-semibold mb-1">Next Level:</div>
                  <div className="text-sm text-[#C8B8DB]/80">
                    {skillLevel < skill.maxLevel ? skill.benefits[skillLevel] : 'Maxed'}
                  </div>
                </div>
              )}
              
              {hasPoints && (
                <div className="flex justify-between mt-2 pt-2 border-t border-[#432874]/30">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 bg-transparent border-[#432874]/50 hover:bg-[#432874]/20"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAllocate(skill.id, false);
                    }}
                    disabled={skillLevel <= 0}
                  >
                    <Minus className="h-3 w-3" />
                    <span className="ml-1">Remove</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 bg-[#FF9D00]/20 border-[#FF9D00]/50 hover:bg-[#FF9D00]/30 text-[#FF9D00]"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAllocate(skill.id, true);
                    }}
                    disabled={!canAdd}
                  >
                    <Plus className="h-3 w-3" />
                    <span className="ml-1">Upgrade</span>
                  </Button>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Lines connecting skills in the tree */}
      {bountySkills.filter(s => s.requires === skill.id).map(childSkill => (
        <div 
          key={`${skill.id}-${childSkill.id}`}
          className={`absolute top-1/2 right-0 h-0.5 w-8 
            ${skillDistribution[childSkill.id] > 0 ? 'bg-[#FF9D00]/70' : 'bg-[#432874]/50'}`}
          style={{ 
            transform: 'translateY(-50%)', 
            left: '100%' 
          }}
        />
      ))}
    </div>
  );
};

// Main Skill Tree Component
const BountyBoardSkillTree = () => {
  const { user } = useDiscordAuth();
  const { toast } = useToast();
  const [availableSkillPoints, setAvailableSkillPoints] = useState<number>(0);
  const [skillDistribution, setSkillDistribution] = useState<Record<string, number>>({});
  const [pendingChanges, setPendingChanges] = useState<boolean>(false);
  
  // Fetch bounty board building data
  const { data: bountyBoard, isLoading } = useQuery<BuildingUpgrade>({
    queryKey: ['/api/buildings/bountyBoard'],
    enabled: !!user,
  });
  
  // Allocate skill point mutation
  const allocatePointMutation = useMutation({
    mutationFn: async (data: { skillDistribution: Record<string, number> }) => {
      const response = await apiRequest('POST', '/api/buildings/skills/bountyBoard', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to allocate skill points');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/buildings/bountyBoard'] });
      setPendingChanges(false);
      toast({
        title: 'Skills Updated',
        description: 'Your Bounty Board skill points have been allocated.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to allocate skill points',
        variant: 'destructive',
      });
    }
  });
  
  // Update local state when data loads
  useEffect(() => {
    if (bountyBoard) {
      setAvailableSkillPoints(bountyBoard.availableSkillPoints || 0);
      setSkillDistribution(bountyBoard.skillDistribution as Record<string, number> || {});
    }
  }, [bountyBoard]);
  
  // Function to check if a skill can be allocated points
  const canAllocateToSkill = (skillId: string): boolean => {
    const skill = bountySkills.find(s => s.id === skillId);
    if (!skill) return false;
    
    // If no prerequisites, can always allocate
    if (!skill.requires) return true;
    
    // Check if prerequisite skill has required level
    const prerequisiteSkill = skill.requires;
    const requiredLevel = skill.requiredLevel || 1;
    return (skillDistribution[prerequisiteSkill] || 0) >= requiredLevel;
  };
  
  // Allocate or deallocate points
  const handleAllocatePoint = (skillId: string, add: boolean) => {
    const newDistribution = { ...skillDistribution };
    
    if (add) {
      // Add point
      const currentLevel = newDistribution[skillId] || 0;
      const skill = bountySkills.find(s => s.id === skillId);
      
      if (availableSkillPoints <= 0) return;
      if (!skill) return;
      if (currentLevel >= skill.maxLevel) return;
      if (!canAllocateToSkill(skillId)) return;
      
      newDistribution[skillId] = currentLevel + 1;
      setAvailableSkillPoints(prev => prev - 1);
    } else {
      // Remove point
      const currentLevel = newDistribution[skillId] || 0;
      if (currentLevel <= 0) return;
      
      // Check if any skills depend on this one
      const dependentSkills = bountySkills.filter(s => s.requires === skillId);
      const canRemove = dependentSkills.every(s => {
        const requiredLevel = s.requiredLevel || 1;
        return (skillDistribution[s.id] || 0) === 0 || currentLevel - 1 >= requiredLevel;
      });
      
      if (!canRemove) {
        toast({
          title: 'Cannot Remove Point',
          description: 'This skill is required by other allocated skills.',
          variant: 'destructive'
        });
        return;
      }
      
      newDistribution[skillId] = currentLevel - 1;
      setAvailableSkillPoints(prev => prev + 1);
    }
    
    setSkillDistribution(newDistribution);
    setPendingChanges(true);
  };
  
  // Save changes
  const saveChanges = () => {
    allocatePointMutation.mutate({ skillDistribution });
  };
  
  // Get the level of the bounty board
  const getBountyBoardLevel = (): number => {
    return bountyBoard?.currentLevel || 1;
  };
  
  // Calculate total skill points based on building level
  const getTotalSkillPoints = (): number => {
    const level = getBountyBoardLevel();
    // Formula: (level - 1) * 2 points
    return Math.max(0, (level - 1) * 2);
  };
  
  // Calculate points allocated
  const getAllocatedPoints = (): number => {
    return Object.values(skillDistribution).reduce((sum, level) => sum + level, 0);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="text-[#FF9D00] text-xl animate-pulse">Loading skill tree...</div>
      </div>
    );
  }
  
  const totalPoints = getTotalSkillPoints();
  const allocatedPoints = getAllocatedPoints();
  
  return (
    <Card className="bg-[#1A1A2E] border border-[#432874]/30 shadow-md mt-8">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <TreeDeciduous className="h-6 w-6 text-[#FF9D00] mr-2" />
            <CardTitle className="font-cinzel">Bounty Board Skill Tree</CardTitle>
          </div>
          <Badge className="bg-[#432874]/70 text-white">
            Level {getBountyBoardLevel()}
          </Badge>
        </div>
        <CardDescription>
          Allocate skill points to unlock and enhance bounty board capabilities.
          Upgrade your Bounty Board to earn more skill points.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex justify-between items-center mb-4 p-3 bg-[#1F1D36] rounded-lg">
          <div className="text-sm text-[#C8B8DB]/90">
            <span className="font-semibold">Available Skill Points:</span> {availableSkillPoints}/{totalPoints}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent border-[#432874]/50 hover:bg-[#432874]/20"
              onClick={() => {
                setSkillDistribution(bountyBoard?.skillDistribution as Record<string, number> || {});
                setAvailableSkillPoints(bountyBoard?.availableSkillPoints || 0);
                setPendingChanges(false);
              }}
              disabled={!pendingChanges || allocatePointMutation.isPending}
            >
              Reset Changes
            </Button>
            <Button
              className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
              size="sm"
              onClick={saveChanges}
              disabled={!pendingChanges || allocatePointMutation.isPending}
            >
              {allocatePointMutation.isPending ? 'Saving...' : 'Save Skill Points'}
            </Button>
          </div>
        </div>
        
        <div className="mt-8 relative">
          <motion.div 
            className="flex items-center justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* First Layer - Root Skills */}
            <div className="flex flex-col space-y-8">
              {bountySkills.filter(skill => !skill.requires).map(skill => (
                <SkillNode 
                  key={skill.id}
                  skill={skill}
                  currentLevel={getBountyBoardLevel()}
                  availablePoints={availableSkillPoints}
                  skillDistribution={skillDistribution}
                  canAllocate={canAllocateToSkill}
                  onAllocate={handleAllocatePoint}
                />
              ))}
            </div>
            
            {/* Second Layer - Tier 2 Skills */}
            <div className="flex flex-col space-y-8 ml-12">
              {bountySkills.filter(skill => skill.requires === 'questSlots').map(skill => (
                <SkillNode 
                  key={skill.id}
                  skill={skill}
                  currentLevel={getBountyBoardLevel()}
                  availablePoints={availableSkillPoints}
                  skillDistribution={skillDistribution}
                  canAllocate={canAllocateToSkill}
                  onAllocate={handleAllocatePoint}
                />
              ))}
            </div>
            
            {/* Third Layer - Tier 3 Skills */}
            <div className="flex flex-col space-y-8 ml-12">
              {bountySkills.filter(skill => 
                skill.requires === 'rewardBonus' || skill.requires === 'questDuration'
              ).map(skill => (
                <SkillNode 
                  key={skill.id}
                  skill={skill}
                  currentLevel={getBountyBoardLevel()}
                  availablePoints={availableSkillPoints}
                  skillDistribution={skillDistribution}
                  canAllocate={canAllocateToSkill}
                  onAllocate={handleAllocatePoint}
                />
              ))}
            </div>
            
            {/* Fourth Layer - Tier 4 Skills */}
            <div className="flex flex-col space-y-8 ml-12">
              {bountySkills.filter(skill => skill.requires === 'rareQuests').map(skill => (
                <SkillNode 
                  key={skill.id}
                  skill={skill}
                  currentLevel={getBountyBoardLevel()}
                  availablePoints={availableSkillPoints}
                  skillDistribution={skillDistribution}
                  canAllocate={canAllocateToSkill}
                  onAllocate={handleAllocatePoint}
                />
              ))}
            </div>
          </motion.div>
        </div>
        
        <div className="mt-8 p-4 bg-[#1F1D36]/70 rounded-lg text-sm text-[#C8B8DB]/70">
          <div className="flex items-start">
            <Info className="h-5 w-5 mr-2 text-[#FF9D00] flex-shrink-0 mt-0.5" />
            <div>
              <p className="mb-2">Upgrade your Bounty Board to gain more skill points. Each level beyond the first grants 2 skill points.</p>
              <p className="text-xs">Allocated: {allocatedPoints} / Total Available: {totalPoints}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BountyBoardSkillTree;