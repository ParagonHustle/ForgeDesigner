import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/lib/zustandStore';
import { useDiscordAuth } from '@/lib/discordAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  List,
  CheckCircle2,
  Clock,
  Gem,
  Flame,
  Skull,
  Shield,
  Scroll,
  Package
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

import type { BountyQuest } from '@shared/schema';

// Sample quest templates for demonstrations
const questTemplates = [
  {
    type: 'farming',
    name: 'Resource Collector',
    description: 'Gather various resources from farming missions.',
    icon: <Gem className="h-5 w-5" />,
    color: 'bg-green-700/30 text-green-400 border-green-600/30',
    requirementTypes: ['Farm any resource', 'Complete farming missions']
  },
  {
    type: 'dungeon',
    name: 'Dungeon Delver',
    description: 'Clear dungeons and defeat enemies.',
    icon: <Skull className="h-5 w-5" />,
    color: 'bg-red-700/30 text-red-400 border-red-600/30',
    requirementTypes: ['Complete dungeon runs', 'Defeat specific enemies']
  },
  {
    type: 'crafting',
    name: 'Master Craftsman',
    description: 'Craft and fuse Auras at The Forge.',
    icon: <Flame className="h-5 w-5" />,
    color: 'bg-yellow-700/30 text-yellow-400 border-yellow-600/30',
    requirementTypes: ['Craft Auras', 'Perform Aura fusion']
  },
  {
    type: 'building',
    name: 'Town Developer',
    description: 'Upgrade buildings to improve your settlement.',
    icon: <Shield className="h-5 w-5" />,
    color: 'bg-blue-700/30 text-blue-400 border-blue-600/30',
    requirementTypes: ['Upgrade buildings', 'Reach specific building levels']
  }
];

// Helper function to format time remaining
const formatTimeRemaining = (expiresAt: string) => {
  const expires = new Date(expiresAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Expired';
  
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${diffHrs}h ${diffMins}m remaining`;
};

const BountyBoardView = () => {
  const { user } = useDiscordAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Fetch bounty quests
  const { data: bountyQuests = [], isLoading, refetch: refetchQuests } = useQuery<BountyQuest[]>({
    queryKey: ['/api/bounty/quests'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Get difficulty color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return 'bg-green-700/30 text-green-400 border-green-600/30';
      case 'medium':
        return 'bg-yellow-700/30 text-yellow-400 border-yellow-600/30';
      case 'hard':
        return 'bg-orange-700/30 text-orange-400 border-orange-600/30';
      case 'epic':
        return 'bg-purple-700/30 text-purple-400 border-purple-600/30';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-600/30';
    }
  };

  // Get quest icon by type
  const getQuestIcon = (questName: string) => {
    const lowerName = questName.toLowerCase();
    
    if (lowerName.includes('resource') || lowerName.includes('farm')) {
      return <Gem className="h-5 w-5 text-green-400" />;
    } else if (lowerName.includes('dungeon') || lowerName.includes('enemy')) {
      return <Skull className="h-5 w-5 text-red-400" />;
    } else if (lowerName.includes('craft') || lowerName.includes('forge') || lowerName.includes('aura')) {
      return <Flame className="h-5 w-5 text-yellow-400" />;
    } else if (lowerName.includes('building') || lowerName.includes('upgrade')) {
      return <Shield className="h-5 w-5 text-blue-400" />;
    }
    
    return <Scroll className="h-5 w-5 text-purple-400" />;
  };

  // Calculate quest progress percentage
  const calculateProgress = (quest: BountyQuest) => {
    if (!quest.requirements || typeof quest.requirements !== 'object') return 0;
    
    let completed = 0;
    let total = 0;
    
    // Sum up all requirement progress
    Object.entries(quest.requirements).forEach(([key, requirement]) => {
      if (typeof requirement === 'object' && 'current' in requirement && 'target' in requirement) {
        completed += Math.min(requirement.current, requirement.target);
        total += requirement.target;
      }
    });
    
    return total > 0 ? Math.floor((completed / total) * 100) : 0;
  };

  // Check if quest is completed but not claimed
  const isCompletedNotClaimed = (quest: BountyQuest) => {
    return calculateProgress(quest) >= 100 && !quest.completed;
  };

  // Claim quest rewards
  const claimQuestRewards = async (questId: number) => {
    setIsSubmitting(true);
    
    try {
      // In a real implementation, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock what rewards would be received
      const claimedQuest = bountyQuests.find(q => q.id === questId);
      let rewardDescription = '';
      
      if (claimedQuest?.rewards) {
        const rewards = claimedQuest.rewards;
        if ('rogueCredits' in rewards) rewardDescription += `${rewards.rogueCredits} Rogue Credits, `;
        if ('forgeTokens' in rewards) rewardDescription += `${rewards.forgeTokens} Forge Tokens, `;
        if ('soulShards' in rewards) rewardDescription += `${rewards.soulShards} Soul Shards, `;
        if ('materials' in rewards && Array.isArray(rewards.materials)) {
          rewards.materials.forEach((mat: any) => {
            rewardDescription += `${mat.amount} ${mat.name}, `;
          });
        }
        
        // Remove trailing comma and space
        rewardDescription = rewardDescription.replace(/, $/, '');
      }
      
      toast({
        title: "Quest Rewards Claimed!",
        description: `You received: ${rewardDescription || 'various rewards'}`,
      });
      
      // Refresh quests
      refetchQuests();
    } catch (error) {
      console.error('Error claiming quest rewards:', error);
      toast({
        title: "Error",
        description: "Failed to claim quest rewards.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Animation variants
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-[#FF9D00] text-xl animate-pulse">Loading bounty quests...</div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Bounty Board</h1>
        <p className="text-[#C8B8DB]/80">
          Complete daily quests to earn valuable rewards and progress your account.
        </p>
      </div>
      
      {/* Active Quests */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
      >
        <div className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl p-6 mb-8">
          <div className="flex items-center mb-4">
            <List className="h-6 w-6 text-[#FF9D00] mr-2" />
            <h2 className="text-xl font-cinzel font-bold">Daily Quests</h2>
            <div className="ml-auto flex items-center text-sm text-[#C8B8DB]/70">
              <Clock className="h-4 w-4 mr-1" />
              <span>Resets in 12h 34m</span>
            </div>
          </div>
          
          {bountyQuests.length === 0 ? (
            <div className="bg-[#1F1D36]/50 rounded-lg p-8 text-center">
              <Scroll className="h-12 w-12 mx-auto mb-4 text-[#C8B8DB]/50" />
              <p className="text-[#C8B8DB]/80 mb-4">
                No active quests available. Check back later or upgrade your Bounty Board to unlock more quests!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {bountyQuests.map(quest => {
                const progress = calculateProgress(quest);
                const canClaim = isCompletedNotClaimed(quest);
                
                return (
                  <motion.div
                    key={quest.id}
                    variants={item}
                    className={`bg-[#1F1D36]/50 border border-[#432874]/30 rounded-lg p-4 ${
                      quest.completed ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="mr-3 mt-1">
                        {getQuestIcon(quest.name)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <h3 className="font-cinzel font-semibold text-lg">{quest.name}</h3>
                            <p className="text-sm text-[#C8B8DB]/80">{quest.description}</p>
                          </div>
                          <Badge className={getDifficultyColor(quest.difficulty)}>
                            {quest.difficulty}
                          </Badge>
                        </div>
                        
                        {/* Requirements */}
                        <div className="mt-3 space-y-2">
                          {quest.requirements && typeof quest.requirements === 'object' && Object.entries(quest.requirements).map(([key, requirement]) => {
                            if (typeof requirement === 'object' && 'current' in requirement && 'target' in requirement) {
                              const subProgress = Math.min(100, (requirement.current / requirement.target) * 100);
                              
                              return (
                                <div key={key} className="text-sm">
                                  <div className="flex justify-between mb-1">
                                    <span>{key}</span>
                                    <span>
                                      {requirement.current}/{requirement.target}
                                    </span>
                                  </div>
                                  <Progress 
                                    value={subProgress} 
                                    className="h-1.5 bg-[#1A1A2E] border-[#432874]/20" 
                                  />
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                        
                        {/* Rewards */}
                        <div className="mt-4 pt-3 border-t border-[#432874]/30">
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <Package className="h-4 w-4 text-[#00B9AE] mr-1" />
                              <span className="text-sm font-semibold">Rewards:</span>
                            </div>
                            
                            {!quest.completed && (
                              <div className="text-xs text-[#C8B8DB]/70">
                                {progress < 100 
                                  ? `Progress: ${progress}%` 
                                  : 'Completed - Claim Rewards!'
                                }
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-2 mt-2">
                            {quest.rewards && (
                              <>
                                {'rogueCredits' in quest.rewards && quest.rewards.rogueCredits > 0 && (
                                  <Badge className="bg-[#432874]/20 border-[#432874]/50">
                                    {quest.rewards.rogueCredits} Rogue Credits
                                  </Badge>
                                )}
                                {'forgeTokens' in quest.rewards && quest.rewards.forgeTokens > 0 && (
                                  <Badge className="bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30">
                                    {quest.rewards.forgeTokens} Forge Tokens
                                  </Badge>
                                )}
                                {'soulShards' in quest.rewards && quest.rewards.soulShards > 0 && (
                                  <Badge className="bg-[#00B9AE]/20 text-[#00B9AE] border-[#00B9AE]/30">
                                    {quest.rewards.soulShards} Soul Shards
                                  </Badge>
                                )}
                                {'materials' in quest.rewards && Array.isArray(quest.rewards.materials) && 
                                  quest.rewards.materials.map((mat: any, idx: number) => (
                                    <Badge key={idx} className="bg-[#C8B8DB]/20 text-[#C8B8DB] border-[#C8B8DB]/30">
                                      {mat.amount} {mat.name}
                                    </Badge>
                                  ))
                                }
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="mt-3 flex justify-end">
                          {quest.completed ? (
                            <div className="flex items-center text-sm text-[#00B9AE]">
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Claimed
                            </div>
                          ) : canClaim ? (
                            <Button
                              className="bg-[#00B9AE] hover:bg-[#00B9AE]/80"
                              onClick={() => claimQuestRewards(quest.id)}
                              disabled={isSubmitting}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              {isSubmitting ? 'Claiming...' : 'Claim Rewards'}
                            </Button>
                          ) : (
                            <div className="text-sm text-[#C8B8DB]/70">
                              {formatTimeRemaining(quest.expiresAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
      
      {/* Bounty Board Level Info */}
      <div className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl p-6">
        <h2 className="text-xl font-cinzel font-bold text-[#FF9D00] mb-4">Bounty Board Information</h2>
        
        <div className="bg-[#1F1D36]/50 rounded-lg p-4 mb-6">
          <div className="flex items-center mb-2">
            <Shield className="h-5 w-5 text-[#00B9AE] mr-2" />
            <h3 className="font-semibold">Your Bounty Board Level: {user?.bountyBoardLevel || 1}</h3>
          </div>
          <p className="text-sm text-[#C8B8DB]/80 mb-3">
            Your Bounty Board level determines the quantity and quality of daily quests available.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm font-semibold mb-1">Daily Quest Slots:</div>
              <div className="flex">
                {Array.from({ length: 7 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-5 h-5 rounded-sm mr-1 flex items-center justify-center text-xs ${
                      idx < (user?.bountyBoardLevel || 1) * 1.5
                        ? 'bg-[#432874] text-[#C8B8DB]'
                        : 'bg-[#1A1A2E] text-[#432874]/50 border border-[#432874]/30'
                    }`}
                  >
                    {idx + 1}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-semibold mb-1">Quest Rarity Chance:</div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Epic Quests:</span>
                  <span className={user?.bountyBoardLevel && user.bountyBoardLevel >= 5 ? 'text-purple-400' : 'text-[#C8B8DB]/50'}>
                    {user?.bountyBoardLevel && user.bountyBoardLevel >= 5 ? 'Guaranteed' : 'Locked'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Hard Quests:</span>
                  <span className={user?.bountyBoardLevel && user.bountyBoardLevel >= 3 ? 'text-orange-400' : 'text-[#C8B8DB]/50'}>
                    {user?.bountyBoardLevel && user.bountyBoardLevel >= 3 ? `${user.bountyBoardLevel * 10}%` : 'Locked'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Medium Quests:</span>
                  <span className={user?.bountyBoardLevel && user.bountyBoardLevel >= 2 ? 'text-yellow-400' : 'text-[#C8B8DB]/50'}>
                    {user?.bountyBoardLevel && user.bountyBoardLevel >= 2 ? `${user.bountyBoardLevel * 15}%` : 'Locked'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex">
            <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
              <span className="text-[#FF9D00] font-bold">1</span>
            </div>
            <p className="text-[#C8B8DB]/80">
              Complete daily quests to earn valuable resources, Soul Shards, and currencies.
            </p>
          </div>
          <div className="flex">
            <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
              <span className="text-[#FF9D00] font-bold">2</span>
            </div>
            <p className="text-[#C8B8DB]/80">
              Higher difficulty quests provide better rewards but are more challenging to complete.
            </p>
          </div>
          <div className="flex">
            <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
              <span className="text-[#FF9D00] font-bold">3</span>
            </div>
            <p className="text-[#C8B8DB]/80">
              Upgrade your Bounty Board building to unlock more daily quests and higher-tier quest types.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default BountyBoardView;
