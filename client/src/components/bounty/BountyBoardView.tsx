import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/lib/zustandStore';
import { useAuthStore } from '@/lib/zustandStore';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Package,
  ChevronDown,
  ChevronRight,
  Settings,
  Calendar,
  CalendarDays,
  Gift as GiftIcon,
  Coins,
  Calculator as Coin,
  Diamond,
  Zap,
  BookOpen,
  Loader2
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import type { BountyQuest, BuildingUpgrade } from '@shared/schema';

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
const formatTimeRemaining = (expiresAt: string | Date) => {
  const expires = typeof expiresAt === 'string' ? new Date(expiresAt) : expiresAt;
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Expired';
  
  const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  return `${diffHrs}h ${diffMins}m remaining`;
};

const BountyBoardView = () => {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState<boolean>(false);
  
  // Fetch bounty quests
  const { data: originalQuests = [], isLoading: questsLoading, refetch: refetchQuests } = useQuery<BountyQuest[]>({
    queryKey: ['/api/bounty/quests'],
    refetchInterval: 60000 // Refresh every minute
  });
  
  // Add different rarities to quests for demonstration
  const bountyQuests = React.useMemo(() => {
    return originalQuests.map((quest, index) => {
      const enhancedQuest = {...quest};
      
      // Assign different rarities based on index
      if (index % 4 === 1) {
        (enhancedQuest as any).rarity = 'Rare';
      } else if (index % 4 === 2) {
        (enhancedQuest as any).rarity = 'Epic';
      } else if (index % 4 === 3) {
        (enhancedQuest as any).rarity = 'Legendary';
      } else {
        (enhancedQuest as any).rarity = 'Common';
      }
      
      return enhancedQuest;
    });
  }, [originalQuests]);
  
  // Fetch bounty board building data
  const { data: bountyBoard, isLoading: buildingLoading } = useQuery<BuildingUpgrade>({
    queryKey: ['/api/buildings/bountyBoard']
  });

  // Get frequency badge style
  const getFrequencyStyle = (frequency?: string) => {
    if (!frequency) return 'bg-[#432874]/30 text-[#C8B8DB]'; // Default to daily style
    
    switch (frequency.toLowerCase()) {
      case 'daily':
        return 'bg-[#432874]/30 text-[#C8B8DB]';
      case 'weekly':
        return 'bg-[#00B9AE]/20 text-[#00B9AE]';
      case 'monthly':
        return 'bg-[#FF9D00]/20 text-[#FF9D00]';
      default:
        return 'bg-[#432874]/30 text-[#C8B8DB]';
    }
  };
  
  // Get rarity color
  const getRarityColor = (rarity: string) => {
    switch (rarity?.toLowerCase()) {
      case 'common':
        return { text: 'text-[#4CAF50]', bg: 'bg-[#4CAF50]' };
      case 'rare':
        return { text: 'text-[#2196F3]', bg: 'bg-[#2196F3]' };
      case 'epic':
        return { text: 'text-[#9C27B0]', bg: 'bg-[#9C27B0]' };
      case 'legendary':
        return { text: 'text-[#FF9D00]', bg: 'bg-[#FF9D00]' };
      default:
        return { text: 'text-[#4CAF50]', bg: 'bg-[#4CAF50]' };
    }
  };

  // Rarity Badge Component
  const RarityBadge = ({ rarity }: { rarity: string }) => {
    const rarityClass = {
      common: 'bg-[#4CAF50]/20 text-[#4CAF50] border-[#4CAF50]/30',
      rare: 'bg-[#2196F3]/20 text-[#2196F3] border-[#2196F3]/30',
      epic: 'bg-[#9C27B0]/20 text-[#9C27B0] border-[#9C27B0]/30',
      legendary: 'bg-[#FF9D00]/20 text-[#FF9D00] border-[#FF9D00]/30',
    }[rarity.toLowerCase()] || 'bg-[#4CAF50]/20 text-[#4CAF50] border-[#4CAF50]/30';
    
    return (
      <Badge className={`${rarityClass} text-xs py-0 px-1.5 border`}>
        {rarity}
      </Badge>
    );
  };

  // Get icon for quest based on name or type
  const getQuestIcon = (questName: string) => {
    const questLower = questName.toLowerCase();
    
    if (questLower.includes('farm') || questLower.includes('resource') || questLower.includes('gather')) {
      return <Gem className="h-4 w-4 text-green-400" />;
    } else if (questLower.includes('dungeon') || questLower.includes('enemy') || questLower.includes('slay')) {
      return <Skull className="h-4 w-4 text-red-400" />;
    } else if (questLower.includes('craft') || questLower.includes('forge') || questLower.includes('aura')) {
      return <Flame className="h-4 w-4 text-yellow-400" />;
    } else if (questLower.includes('build') || questLower.includes('upgrade')) {
      return <Shield className="h-4 w-4 text-blue-400" />;
    } else if (questLower.includes('collect') || questLower.includes('gather')) {
      return <Package className="h-4 w-4 text-purple-400" />;
    } else if (questLower.includes('learn') || questLower.includes('skill')) {
      return <BookOpen className="h-4 w-4 text-teal-400" />;
    } else {
      return <Scroll className="h-4 w-4 text-[#C8B8DB]" />;
    }
  };

  // Calculate overall progress for a quest
  const calculateProgress = (quest: BountyQuest) => {
    if (quest.completed) return 100;
    
    if (!quest.requirements || typeof quest.requirements !== 'object') {
      return 0;
    }
    
    const requirements = quest.requirements as Record<string, any>;
    let totalProgress = 0;
    let requirementCount = 0;
    
    Object.values(requirements).forEach((requirement) => {
      if (typeof requirement === 'object' && 'current' in requirement && 'target' in requirement) {
        const progress = Math.min(100, (requirement.current / requirement.target) * 100);
        totalProgress += progress;
        requirementCount++;
      }
    });
    
    return requirementCount > 0 ? Math.round(totalProgress / requirementCount) : 0;
  };

  // Check if quest is completed but not claimed
  const isCompletedNotClaimed = (quest: BountyQuest) => {
    if (quest.completed) return false;
    
    const progress = calculateProgress(quest);
    return progress >= 100;
  };

  // Handle start quest
  const handleStartQuest = async (questId: number) => {
    setIsSubmitting(true);
    
    try {
      // Call API to start quest
      const response = await apiRequest('POST', `/api/bounty/quests/${questId}/start`, {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start quest');
      }
      
      toast({
        title: "Quest Started",
        description: "The quest has been started. Complete the objectives to earn rewards!",
      });
      
      // Refresh quests
      refetchQuests();
    } catch (error: any) {
      console.error('Error starting quest:', error);
      toast({
        title: "Failed to Start Quest",
        description: error.message || "There was an error starting the quest.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Claim quest rewards
  const claimQuestRewards = async (questId: number) => {
    setIsSubmitting(true);
    
    try {
      // Call the API to claim the quest
      const response = await apiRequest('POST', `/api/bounty/quests/${questId}/claim`, {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to claim quest rewards');
      }
      
      const data = await response.json();
      
      // Generate reward description from API response
      const claimedQuest = bountyQuests.find(q => q.id === questId);
      let rewardDescription = '';
      
      if (claimedQuest?.rewards && typeof claimedQuest.rewards === 'object') {
        const rewards = claimedQuest.rewards as Record<string, any>;
        if ('rogueCredits' in rewards && rewards.rogueCredits) {
          rewardDescription += `${rewards.rogueCredits} Rogue Credits, `;
        }
        if ('forgeTokens' in rewards && rewards.forgeTokens) {
          rewardDescription += `${rewards.forgeTokens} Forge Tokens, `;
        }
        if ('soulShards' in rewards && rewards.soulShards) {
          rewardDescription += `${rewards.soulShards} Soul Shards, `;
        }
        if ('experience' in rewards && rewards.experience) {
          rewardDescription += `${rewards.experience} XP, `;
        }
      }
      
      // Remove trailing comma and space
      rewardDescription = rewardDescription.replace(/,\s*$/, '');
      
      toast({
        title: "Quest Completed!",
        description: `You've received ${rewardDescription || 'rewards'}!`,
      });
      
      // Refresh quests
      refetchQuests();
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      toast({
        title: "Failed to Claim Rewards",
        description: error.message || "There was an error claiming the rewards.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle complete bounty
  const handleCompleteBounty = (questId: number) => {
    claimQuestRewards(questId);
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

  const isLoading = questsLoading || buildingLoading;
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-[#FF9D00] text-xl animate-pulse">Loading bounty board data...</div>
      </div>
    );
  }

  // Filter quests by frequency
  const dailyQuests = bountyQuests.filter(quest => !quest.frequency || (quest.frequency as any)?.toLowerCase() === 'daily');
  const weeklyQuests = bountyQuests.filter(quest => (quest.frequency as any)?.toLowerCase() === 'weekly');

  // Render quest card with tech-style NFT appearance
  const renderQuestCard = (quest: BountyQuest) => {
    const progress = calculateProgress(quest);
    const canClaim = isCompletedNotClaimed(quest);
    const rarityColor = getRarityColor((quest as any).rarity || 'Common');
    
    return (
      <motion.div
        key={quest.id}
        variants={item}
        className={`relative overflow-hidden rounded-lg ${
          quest.completed 
            ? 'border border-green-700/40 shadow-[0_0_10px_rgba(34,197,94,0.15)]' 
            : 'border border-[#432874]/30'
        }`}
        style={{
          background: quest.completed 
            ? 'linear-gradient(135deg, rgba(20, 20, 35, 0.9) 0%, rgba(34, 90, 50, 0.4) 100%)' 
            : 'linear-gradient(135deg, rgba(20, 20, 35, 0.9) 0%, rgba(67, 40, 116, 0.3) 100%)',
          maxWidth: '280px'
        }}
      >
        {/* Tech pattern background */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" 
          style={{
            backgroundImage: 'radial-gradient(circle at 10px 10px, rgba(255,255,255,0.1) 2px, transparent 0)',
            backgroundSize: '20px 20px'
          }}>
        </div>
        
        {/* Top Rarity Bar */}
        <div className={`h-1.5 w-full ${rarityColor.bg}`}></div>
        
        <div className="p-3">
          {/* Header with title and badges */}
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center">
              {quest.completed ? 
                <div className="bg-green-500/20 p-1 rounded-full mr-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                </div> : 
                <div className="mr-2">
                  {getQuestIcon(quest.name)}
                </div>
              }
              <h3 className={`font-cinzel font-semibold text-sm ${quest.completed ? 'text-green-400/80' : rarityColor.text}`}>
                {quest.name}
              </h3>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <RarityBadge rarity={(quest as any).rarity || 'Common'} />
              <Badge className={`${getFrequencyStyle((quest as any).frequency)} text-[0.65rem] py-0 px-1.5`}>
                {(quest as any).frequency || 'Daily'}
              </Badge>
            </div>
          </div>
          
          {/* Description */}
          <p className={`text-xs text-[#C8B8DB]/80 mb-3 ${quest.completed ? 'opacity-70' : ''}`}>
            {String(quest.description)}
          </p>
          
          {/* Progress bar */}
          {!quest.completed && (
            <div className="mb-3">
              <div className="flex justify-between mb-1 text-xs">
                <span className="text-[#C8B8DB]/70">Progress</span>
                <span className="text-[#00B9AE]">{progress}%</span>
              </div>
              <div className="h-1.5 bg-[#1A1A2E] rounded-full overflow-hidden">
                <div 
                  className={`h-full ${canClaim ? 'bg-[#00B9AE]' : 'bg-[#432874]'}`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          {/* Compact Requirements */}
          {quest.requirements && typeof quest.requirements === 'object' && Object.entries(quest.requirements as Record<string, any>).length > 0 && (
            <div className="mb-3 px-2 py-1.5 bg-[#1A1A2E]/60 rounded border border-[#432874]/20">
              {Object.entries(quest.requirements as Record<string, any>).map(([key, requirement]) => {
                if (typeof requirement === 'object' && 'current' in requirement && 'target' in requirement) {
                  const subProgress = Math.min(100, (requirement.current / requirement.target) * 100);
                  
                  return (
                    <div key={key} className="text-[0.65rem] mb-1 last:mb-0">
                      <div className="flex justify-between">
                        <span className="text-[#C8B8DB]/90">{key}</span>
                        <span className={requirement.current >= requirement.target ? 'text-green-400' : 'text-[#C8B8DB]/70'}>
                          {requirement.current}/{requirement.target}
                        </span>
                      </div>
                    </div>
                  );
                }
                return null;
              }) as React.ReactNode}
            </div>
          )}
          
          {/* Rewards section */}
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <GiftIcon className="h-3 w-3 text-[#FFD700] mr-1" />
              <span className="text-xs font-semibold text-[#FFD700]">Rewards</span>
            </div>
            
            {quest.completed && (
              <span className="text-[0.65rem] text-green-400">
                Completed {new Date((quest as any).completedAt || Date.now()).toLocaleDateString()}
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[0.65rem] mb-3">
            {quest.rewards && typeof quest.rewards === 'object' && Object.entries(quest.rewards as Record<string, any>).map(([key, value]) => (
              <div key={key} className="flex items-center">
                <div className="w-2 h-2 rounded-full bg-[#432874]/70 mr-1"></div>
                <span className="text-[#C8B8DB]/90">{key}: </span>
                <span className="ml-1 text-[#FFD700]">{typeof value === 'object' ? JSON.stringify(value) : value}</span>
              </div>
            )) as React.ReactNode}
          </div>
          
          {/* Claim button */}
          {!quest.completed && canClaim && (
            <Button 
              size="sm"
              className="w-full bg-[#00B9AE] hover:bg-[#00B9AE]/80 text-black text-xs py-1 h-7"
              onClick={() => handleCompleteBounty(quest.id)}
              disabled={isSubmitting}
            >
              {isSubmitting ? 
                <Loader2 className="h-3 w-3 animate-spin mr-1" /> : 
                <CheckCircle2 className="h-3 w-3 mr-1" />
              }
              Claim Rewards
            </Button>
          )}
        </div>
      </motion.div>
    )
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Bounty Board</h1>
        <p className="text-[#C8B8DB]/80">
          Complete bounties to earn valuable rewards including Forge Tokens, Rogue Credits, and Soul Shards.
        </p>
      </div>
      
      {/* Stats and Building Info */}
      <div className="bg-gradient-to-r from-[#432874]/60 to-[#1A1A2E] rounded-xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FF9D00]/10 rounded-full -mr-32 -mt-32 blur-md"></div>
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-[#00B9AE]/10 rounded-full blur-md"></div>
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4 z-10">
          <div>
            <h2 className="text-xl font-cinzel font-bold text-[#FF9D00] mb-1">Bounty Board Level {bountyBoard?.currentLevel || 1}</h2>
            
            <div className="text-sm text-[#C8B8DB]/80 mb-2">
              Complete bounties to earn valuable rewards and increase your character's renown.
            </div>
            
            <div className="flex items-center text-[#C8B8DB]/70 mt-2">
              <CalendarDays className="h-4 w-4 mr-1" />
              <span className="text-sm">Daily reset in {formatTimeRemaining(new Date(new Date().setHours(24, 0, 0, 0)))}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="bg-[#1A1A2E]/50 px-3 py-2 rounded-lg flex items-center">
              <div className="mr-2 bg-[#432874]/30 p-1.5 rounded-full">
                <List className="h-4 w-4 text-[#00B9AE]" />
              </div>
              <div>
                <div className="text-xs text-[#C8B8DB]/70">Active Quests</div>
                <div className="font-semibold text-[#C8B8DB]">{bountyQuests.filter(q => !q.completed).length}</div>
              </div>
            </div>
            
            <div className="bg-[#1A1A2E]/50 px-3 py-2 rounded-lg flex items-center">
              <div className="mr-2 bg-[#432874]/30 p-1.5 rounded-full">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
              </div>
              <div>
                <div className="text-xs text-[#C8B8DB]/70">Completed</div>
                <div className="font-semibold text-[#C8B8DB]">{bountyQuests.filter(q => q.completed).length}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Quest Tabs */}
      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="bg-[#432874]/20 mb-6">
          <TabsTrigger value="daily" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <Calendar className="h-4 w-4 mr-2" />
            Daily Quests
          </TabsTrigger>
          <TabsTrigger value="weekly" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <CalendarDays className="h-4 w-4 mr-2" />
            Weekly Quests
          </TabsTrigger>
          <TabsTrigger value="all" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <List className="h-4 w-4 mr-2" />
            All Quests
          </TabsTrigger>
        </TabsList>
        
        {/* Daily Quests Tab */}
        <TabsContent value="daily">
          <h2 className="text-lg font-cinzel font-bold text-[#FF9D00] mb-4">Daily Quests</h2>
          
          {dailyQuests.length === 0 ? (
            <div className="bg-[#1F1D36]/50 rounded-lg p-8 text-center">
              <List className="h-12 w-12 mx-auto mb-4 text-[#C8B8DB]/50" />
              <p className="text-[#C8B8DB]/80 mb-4">
                No daily quests are available at the moment. Upgrade your Bounty Board to unlock more quests!
              </p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            >
              {dailyQuests.map((quest) => renderQuestCard(quest))}
            </motion.div>
          )}
        </TabsContent>
        
        {/* Weekly Quests Tab */}
        <TabsContent value="weekly">
          <h2 className="text-lg font-cinzel font-bold text-[#FF9D00] mb-4">Weekly Quests</h2>
          
          {weeklyQuests.length === 0 ? (
            <div className="bg-[#1F1D36]/50 rounded-lg p-8 text-center">
              <CalendarDays className="h-12 w-12 mx-auto mb-4 text-[#C8B8DB]/50" />
              <p className="text-[#C8B8DB]/80 mb-4">
                No weekly quests are available at the moment. Weekly quests become available at Bounty Board Level 2.
              </p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            >
              {weeklyQuests.map((quest) => renderQuestCard(quest))}
            </motion.div>
          )}
        </TabsContent>
        
        {/* All Quests Tab */}
        <TabsContent value="all">
          <h2 className="text-lg font-cinzel font-bold text-[#FF9D00] mb-4">All Quests</h2>
          
          {bountyQuests.length === 0 ? (
            <div className="bg-[#1F1D36]/50 rounded-lg p-8 text-center">
              <List className="h-12 w-12 mx-auto mb-4 text-[#C8B8DB]/50" />
              <p className="text-[#C8B8DB]/80 mb-4">
                No quests are available at the moment. Upgrade your Bounty Board to unlock more quests!
              </p>
            </div>
          ) : (
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-6 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4"
            >
              {bountyQuests.map((quest) => renderQuestCard(quest))}
            </motion.div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
};

export default BountyBoardView;