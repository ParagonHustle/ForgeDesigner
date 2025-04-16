import { useState, useEffect } from 'react';
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
  CalendarDays
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
import { BountyBoardSkillTree } from './BountyBoardSkillTree';

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
  const { user } = useDiscordAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [showSkillTree, setShowSkillTree] = useState<boolean>(false);
  const [showUpgradeDialog, setShowUpgradeDialog] = useState<boolean>(false);
  
  // Fetch bounty quests
  const { data: bountyQuests = [], isLoading: questsLoading, refetch: refetchQuests } = useQuery<BountyQuest[]>({
    queryKey: ['/api/bounty/quests'],
    refetchInterval: 60000 // Refresh every minute
  });
  
  // Fetch bounty board building data
  const { data: bountyBoard, isLoading: buildingLoading } = useQuery<BuildingUpgrade>({
    queryKey: ['/api/buildings/bountyBoard']
  });

  // Get frequency badge style
  const getFrequencyStyle = (frequency?: string) => {
    if (!frequency) return 'bg-blue-700/30 text-blue-400 border-blue-600/30'; // Default to daily style
    
    switch (frequency.toLowerCase()) {
      case 'daily':
        return 'bg-blue-700/30 text-blue-400 border-blue-600/30';
      case 'weekly':
        return 'bg-purple-700/30 text-purple-400 border-purple-600/30';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-600/30';
    }
  };
  
  // Get rarity badge style and color for quest cards
  const getRarityStyle = (rarity?: string) => {
    if (!rarity) return { 
      badge: 'bg-gray-700/30 text-gray-300 border-gray-600/30',
      dot: 'bg-gray-500',
      text: 'text-gray-400'
    };
    
    switch (rarity.toLowerCase()) {
      case 'legendary':
        return { 
          badge: 'bg-yellow-700/30 text-yellow-300 border-yellow-600/30',
          dot: 'bg-yellow-500',
          text: 'text-yellow-400'
        };
      case 'mythic':
        return { 
          badge: 'bg-purple-700/30 text-purple-300 border-purple-600/30',
          dot: 'bg-purple-500',
          text: 'text-purple-400'
        };
      case 'epic':
        return { 
          badge: 'bg-blue-700/30 text-blue-300 border-blue-600/30',
          dot: 'bg-blue-500',
          text: 'text-blue-400'
        };
      case 'rare':
        return { 
          badge: 'bg-green-700/30 text-green-300 border-green-600/30',
          dot: 'bg-green-500',
          text: 'text-green-400'
        };
      default: // Basic
        return { 
          badge: 'bg-gray-700/30 text-gray-300 border-gray-600/30',
          dot: 'bg-gray-500',
          text: 'text-gray-400'
        };
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
        if ('material' in rewards && rewards.material) {
          const mat = rewards.material as any;
          rewardDescription += `${mat.amount} ${mat.name}, `;
        }
        
        // Remove trailing comma and space
        rewardDescription = rewardDescription.replace(/, $/, '');
      }
      
      toast({
        title: "Quest Rewards Claimed!",
        description: `You received: ${rewardDescription || 'various rewards'}`,
      });
      
      // Refresh quests and user data
      refetchQuests();
    } catch (error) {
      console.error('Error claiming quest rewards:', error);
      toast({
        title: "Error",
        description: typeof error === 'object' && error instanceof Error ? error.message : "Failed to claim quest rewards.",
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

  // Render quest card
  const renderQuestCard = (quest: BountyQuest) => {
    const progress = calculateProgress(quest);
    const canClaim = isCompletedNotClaimed(quest);
    
    return (
      <motion.div
        key={quest.id}
        variants={item}
        className={`border rounded-lg p-4 ${
          quest.completed 
            ? 'bg-[#1F1D36]/30 border-green-700/30 shadow-[0_0_8px_rgba(34,197,94,0.1)]' 
            : 'bg-[#1F1D36]/50 border-[#432874]/30'
        }`}
      >
        <div className="flex items-start">
          <div className="mr-3 mt-1">
            {quest.completed ? 
              <div className="bg-green-500/20 p-1 rounded-full">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
              </div> : 
              getQuestIcon(quest.name)
            }
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-start mb-1">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-cinzel font-semibold text-lg ${quest.completed ? 'line-through opacity-70' : ''}`}>
                    {quest.name}
                  </h3>
                  {(quest as any).rarity && (
                    <Badge className={getRarityStyle((quest as any).rarity).badge}>
                      <div className={`w-2 h-2 rounded-full ${getRarityStyle((quest as any).rarity).dot} mr-1.5`}></div>
                      {(quest as any).rarity}
                    </Badge>
                  )}
                </div>
                <p className={`text-sm text-[#C8B8DB]/80 ${quest.completed ? 'opacity-70' : ''}`}>
                  {quest.description}
                </p>
              </div>
              <Badge className={getFrequencyStyle((quest as any).frequency)}>
                {(quest as any).frequency || 'Daily'}
              </Badge>
            </div>
            
            {/* Requirements */}
            <div className="mt-3 space-y-2">
              {quest.requirements && typeof quest.requirements === 'object' && Object.entries(quest.requirements as Record<string, any>).map(([key, requirement]) => {
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
                {quest.rewards && typeof quest.rewards === 'object' && (
                  <>
                    {'rogueCredits' in quest.rewards && (quest.rewards as any).rogueCredits > 0 && (
                      <Badge className="bg-[#432874]/20 border-[#432874]/50">
                        {(quest.rewards as any).rogueCredits} Rogue Credits
                      </Badge>
                    )}
                    {'forgeTokens' in quest.rewards && (quest.rewards as any).forgeTokens > 0 && (
                      <Badge className="bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30">
                        {(quest.rewards as any).forgeTokens} Forge Tokens
                      </Badge>
                    )}
                    {'soulShards' in quest.rewards && (quest.rewards as any).soulShards > 0 && (
                      <Badge className="bg-[#00B9AE]/20 text-[#00B9AE] border-[#00B9AE]/30">
                        {(quest.rewards as any).soulShards} Soul Shards
                      </Badge>
                    )}
                    {'material' in quest.rewards && (quest.rewards as any).material && (
                      <Badge className="bg-[#C8B8DB]/20 text-[#C8B8DB] border-[#C8B8DB]/30">
                        {((quest.rewards as any).material as any).amount} {((quest.rewards as any).material as any).name}
                      </Badge>
                    )}
                    {'materials' in quest.rewards && Array.isArray((quest.rewards as any).materials) && 
                      (quest.rewards as any).materials.map((mat: any, idx: number) => (
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
  };
  
  return (
    <>
      {/* Bounty Board Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="bg-[#1A1A2E] border-[#432874]/50 text-[#C8B8DB] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">Upgrade Bounty Board</DialogTitle>
            <DialogDescription className="text-[#C8B8DB]/80">
              Upgrading your Bounty Board unlocks better quests and increases rewards.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-semibold">Current Level: {user?.bountyBoardLevel || 1}</h4>
                <p className="text-sm text-[#C8B8DB]/70">Next Level: {(user?.bountyBoardLevel || 1) + 1}</p>
              </div>
              <div className="bg-[#432874]/30 px-3 py-1 rounded">
                <span className="text-[#FF9D00] font-semibold">Lv.{user?.bountyBoardLevel || 1}</span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="bg-[#15152C] p-3 rounded-md">
                <h4 className="font-semibold mb-2">Required Materials</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-[#432874]/30 flex items-center justify-center mr-2">
                        <Scroll className="h-4 w-4 text-[#00B9AE]" />
                      </div>
                      <span>Bounty Board Blueprint</span>
                    </div>
                    <Badge className="bg-[#15152C] border-[#432874]">
                      {(user?.bountyBoardLevel || 1) * 2} pcs
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-[#432874]/30 flex items-center justify-center mr-2">
                        <span className="text-[#FF9D00] text-xs">RC</span>
                      </div>
                      <span>Rogue Credits</span>
                    </div>
                    <Badge className="bg-[#15152C] border-[#432874]">
                      {(user?.bountyBoardLevel || 1) * 1000}
                    </Badge>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#15152C] p-3 rounded-md">
                <h4 className="font-semibold mb-2">Unlocks at Level {(user?.bountyBoardLevel || 1) + 1}</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-[#00B9AE] mr-2" />
                    {(user?.bountyBoardLevel || 1) + 1 >= 3 ? "Rare Quest Availability" : 
                     (user?.bountyBoardLevel || 1) + 1 >= 5 ? "Epic Quest Availability" :
                     (user?.bountyBoardLevel || 1) + 1 >= 7 ? "Mythic Quest Availability" :
                     (user?.bountyBoardLevel || 1) + 1 >= 10 ? "Legendary Quest Availability" :
                     "+1 Daily Quest Slot"}
                  </div>
                  <div className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-[#00B9AE] mr-2" />
                    Increased Reward Values (+10%)
                  </div>
                  <div className="flex items-center">
                    <CheckCircle2 className="h-4 w-4 text-[#00B9AE] mr-2" />
                    New Skill Point
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex justify-between items-center">
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
              onClick={() => {
                toast({
                  title: "Coming Soon",
                  description: "Bounty Board upgrade functionality will be available in a future update."
                });
                setShowUpgradeDialog(false);
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Upgrade
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Bounty Board</h1>
        <p className="text-[#C8B8DB]/80">
          Complete daily and weekly quests to earn valuable rewards and progress your account.
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
            <h2 className="text-xl font-cinzel font-bold">Active Quests</h2>
            <div className="ml-auto flex items-center text-sm text-[#C8B8DB]/70">
              <Clock className="h-4 w-4 mr-1" />
              <span>Daily Reset in 12h 34m</span>
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
            <Tabs defaultValue="daily" className="w-full">
              <TabsList className="bg-[#1A1A2E] border border-[#432874]/30 mb-4">
                <TabsTrigger value="daily" className="data-[state=active]:bg-[#432874]/30">
                  <Calendar className="h-4 w-4 mr-2" />
                  Daily Quests
                </TabsTrigger>
                <TabsTrigger value="weekly" className="data-[state=active]:bg-[#432874]/30">
                  <CalendarDays className="h-4 w-4 mr-2" />
                  Weekly Quests
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="daily" className="space-y-4">
                {dailyQuests.length > 0 ? (
                  dailyQuests.map(renderQuestCard)
                ) : (
                  <div className="bg-[#1F1D36]/50 rounded-lg p-6 text-center">
                    <p className="text-[#C8B8DB]/80">No daily quests available right now.</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="weekly" className="space-y-4">
                {weeklyQuests.length > 0 ? (
                  weeklyQuests.map(renderQuestCard)
                ) : (
                  <div className="bg-[#1F1D36]/50 rounded-lg p-6 text-center">
                    <p className="text-[#C8B8DB]/80">No weekly quests available right now.</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </motion.div>
      
      {/* Bounty Board Level Info */}
      <div className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-cinzel font-bold text-[#FF9D00]">Bounty Board Information</h2>
          
          {/* Upgrade Button */}
          <Button 
            variant="outline" 
            size="sm" 
            className="border-[#FF9D00]/50 text-[#FF9D00] hover:bg-[#FF9D00]/10"
            onClick={() => setShowUpgradeDialog(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Upgrade
          </Button>
        </div>
        
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
                  <span className="flex items-center">
                    <Badge variant="outline" className="mr-2 h-2 w-2 bg-yellow-500 border-0 rounded-full p-0"></Badge>
                    Legendary Quests:
                  </span>
                  <span className={user?.bountyBoardLevel && user.bountyBoardLevel >= 10 ? 'text-yellow-400' : 'text-[#C8B8DB]/50'}>
                    {user?.bountyBoardLevel && user.bountyBoardLevel >= 10 ? 'Unlocked' : 'Locked (Lvl 10)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center">
                    <Badge variant="outline" className="mr-2 h-2 w-2 bg-purple-500 border-0 rounded-full p-0"></Badge>
                    Mythic Quests:
                  </span>
                  <span className={user?.bountyBoardLevel && user.bountyBoardLevel >= 7 ? 'text-purple-400' : 'text-[#C8B8DB]/50'}>
                    {user?.bountyBoardLevel && user.bountyBoardLevel >= 7 ? 'Unlocked' : 'Locked (Lvl 7)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center">
                    <Badge variant="outline" className="mr-2 h-2 w-2 bg-blue-500 border-0 rounded-full p-0"></Badge>
                    Epic Quests:
                  </span>
                  <span className={user?.bountyBoardLevel && user.bountyBoardLevel >= 5 ? 'text-blue-400' : 'text-[#C8B8DB]/50'}>
                    {user?.bountyBoardLevel && user.bountyBoardLevel >= 5 ? 'Unlocked' : 'Locked (Lvl 5)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center">
                    <Badge variant="outline" className="mr-2 h-2 w-2 bg-green-500 border-0 rounded-full p-0"></Badge>
                    Rare Quests:
                  </span>
                  <span className={user?.bountyBoardLevel && user.bountyBoardLevel >= 3 ? 'text-green-400' : 'text-[#C8B8DB]/50'}>
                    {user?.bountyBoardLevel && user.bountyBoardLevel >= 3 ? 'Unlocked' : 'Locked (Lvl 3)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="flex items-center">
                    <Badge variant="outline" className="mr-2 h-2 w-2 bg-gray-500 border-0 rounded-full p-0"></Badge>
                    Basic Quests:
                  </span>
                  <span className="text-gray-400">Always Available</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bounty Board Skills Section */}
        <div className="mb-6">
          <Collapsible
            open={showSkillTree}
            onOpenChange={setShowSkillTree}
            className="w-full"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Settings className="h-5 w-5 text-[#00B9AE] mr-2" />
                <h3 className="font-semibold">Bounty Board Skill Tree</h3>
                {bountyBoard && bountyBoard.availableSkillPoints && bountyBoard.availableSkillPoints > 0 && (
                  <Badge className="ml-3 bg-amber-500/20 text-amber-300 border-amber-400/30">
                    {bountyBoard.availableSkillPoints} Points Available
                  </Badge>
                )}
              </div>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="hover:bg-[#432874]/30"
                >
                  {showSkillTree ? (
                    <div className="flex items-center">
                      <ChevronDown className="h-4 w-4 mr-1" />
                      <span className="text-sm">Hide Skill Tree</span>
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <ChevronRight className="h-4 w-4 mr-1" />
                      <span className="text-sm">Show Skill Tree</span>
                    </div>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
            
            <CollapsibleContent>
              <BountyBoardSkillTree building={bountyBoard} />
            </CollapsibleContent>
          </Collapsible>
          
          <Separator className="my-6 bg-[#432874]/30" />
        </div>
        
        {/* Tips and Information */}
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
              Weekly quests are more challenging but provide better rewards.
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
          <div className="flex">
            <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
              <span className="text-[#FF9D00] font-bold">4</span>
            </div>
            <p className="text-[#C8B8DB]/80">
              Allocate skill points in the Bounty Board Skill Tree to enhance your quest rewards and unlock special abilities.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default BountyBoardView;