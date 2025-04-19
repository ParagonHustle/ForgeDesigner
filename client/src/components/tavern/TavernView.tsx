import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/lib/zustandStore';
import { useAuthStore } from '@/lib/zustandStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  ArrowUp, 
  CheckCircle, 
  Shield,
  Loader2,
  Plus,
  Ticket,
  RefreshCcw,
  Users
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CountdownTimer from '../common/CountdownTimer';
import { Separator } from '@/components/ui/separator';

import type { BuildingUpgrade } from '@shared/schema';

// Tavern building definition
const tavern = {
  id: 'tavern',
  name: 'Tavern',
  description: 'Specialized trading post that offers character trades and generates energy/tickets for dungeons.',
  icon: <User className="h-6 w-6" />,
  color: 'text-[#4169E1] bg-[#4169E1]/10',
  benefits: [
    { level: 1, text: 'Basic trade options (3 common for 1 rare)' },
    { level: 2, text: 'Improved trade options (3 rare for 1 epic)' },
    { level: 3, text: 'Generate 2 dungeon tickets per day' },
    { level: 4, text: 'Generate 4 dungeon tickets per day' },
    { level: 5, text: 'Elite trade options (3 epic for 1 legendary)' }
  ],
  maxLevel: 9,
  baseUpgradeCost: { rogueCredits: 700, forgeTokens: 70 },
  upgradeTimeInMinutes: 35
};

const TavernView = () => {
  const { user, fetchUser } = useAuthStore();
  const { toast } = useToast();
  const [upgradeDialog, setUpgradeDialog] = useState<boolean>(false);
  const [skillTreeDialog, setSkillTreeDialog] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  
  // Fetch building upgrades
  const { data: buildingUpgrades = [], isLoading, refetch: refetchBuildings } = useQuery<BuildingUpgrade[]>({
    queryKey: ['/api/buildings'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Get building upgrade data
  const getBuildingData = () => {
    const found = buildingUpgrades.find(upgrade => upgrade.buildingType === 'tavern');
    if (found) {
      return found;
    }
    
    // If no building data found, create a new building instance
    return {
      id: 0,
      userId: 1,
      buildingType: 'tavern',
      currentLevel: 1,
      upgradeStartTime: null,
      upgradeEndTime: null,
      upgradeInProgress: false,
      unlockedSkills: [],
      availableSkillPoints: 1,
      skillDistribution: {}
    } as unknown as BuildingUpgrade;
  };

  const buildingData = getBuildingData();
  const currentLevel = buildingData?.currentLevel || 1;
  const isBeingUpgraded = buildingData?.upgradeInProgress || false;

  // Calculate upgrade cost based on current level
  const calculateUpgradeCost = (currentLevel: number) => {
    const levelMultiplier = currentLevel;
    return {
      rogueCredits: tavern.baseUpgradeCost.rogueCredits * levelMultiplier,
      forgeTokens: tavern.baseUpgradeCost.forgeTokens * levelMultiplier
    };
  };

  // Check if user can afford upgrade
  const canAffordUpgrade = (currentLevel: number) => {
    if (!user) return false;
    
    const cost = calculateUpgradeCost(currentLevel);
    const userCredits = user.rogueCredits || 0;
    const userTokens = user.forgeTokens || 0;
    
    return userCredits >= cost.rogueCredits && userTokens >= cost.forgeTokens;
  };

  // Check if building is at max level
  const isMaxLevel = (currentLevel: number) => {
    // Get townhall level
    const townhall = buildingUpgrades.find(upgrade => upgrade.buildingType === 'townhall');
    const townhallLevel = townhall?.currentLevel || 1;
    
    // Fixed max level of 9 for Tavern
    const maxAllowedLevel = 9;
    
    return currentLevel >= maxAllowedLevel;
  };

  // Calculate upgrade progress
  const calculateUpgradeProgress = (building: BuildingUpgrade) => {
    if (!building.upgradeStartTime || !building.upgradeEndTime) return 0;
    
    const startTime = new Date(building.upgradeStartTime).getTime();
    const endTime = new Date(building.upgradeEndTime).getTime();
    const now = new Date().getTime();
    
    return Math.min(100, Math.max(0, ((now - startTime) / (endTime - startTime)) * 100));
  };

  // Define the SkillTreeData type
  type SkillTreeData = {
    currentLevel: number;
    unlockedSkills: string[];
    availableSkillTree: Array<{
      id: string;
      name: string;
      description: string;
      maxLevel: number;
      path?: string;
      requires?: Record<string, number>;
    }>;
  };

  // Fetch building skill tree data with proper typing
  const { data: skillTreeData = { 
    currentLevel: 1, 
    unlockedSkills: [], 
    availableSkillTree: [] 
  } as SkillTreeData } = useQuery<SkillTreeData>({
    queryKey: [`/api/buildings/skills/tavern`],
    enabled: skillTreeDialog
  });

  // Allocate skill point
  const allocateSkill = async (skillId: string) => {
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest('POST', `/api/buildings/skills/tavern`, {
        skillId: skillId
      });
      
      const data = await response.json();
      
      toast({
        title: "Skill Allocated",
        description: `You've allocated a skill point for Tavern.`,
      });
      
      setSelectedSkill(skillId);
      setSkillTreeDialog(false);
      
      // Continue with upgrade after skill allocation
      startUpgrade(skillId);
    } catch (error: any) {
      console.error('Error allocating skill:', error);
      toast({
        title: "Failed to Allocate Skill",
        description: error.message || "There was an error allocating the skill point.",
        variant: "destructive"
      });
      setIsSubmitting(false);
    }
  };

  // Start building upgrade
  const startUpgrade = async (allocatedSkill?: string) => {
    // Make sure we're using the correct building type
    const buildingType = 'tavern';
    
    if (isMaxLevel(currentLevel)) {
      toast({
        title: "Max Level Reached",
        description: `Tavern is already at maximum level.`,
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    if (isBeingUpgraded) {
      toast({
        title: "Already Upgrading",
        description: `Tavern is already being upgraded.`,
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    if (!canAffordUpgrade(currentLevel)) {
      toast({
        title: "Insufficient Resources",
        description: "You don't have enough resources for this upgrade.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      console.log("Starting upgrade for Tavern");
      
      // If user has selected a skill to allocate, include it in the upgrade request
      const requestData: any = {
        buildingType: buildingType,
      };
      
      if (allocatedSkill) {
        requestData.allocatedSkill = allocatedSkill;
      }
      
      // Use apiRequest instead of fetch for better error handling
      const response = await apiRequest('POST', '/api/buildings/upgrade', requestData);
      
      // apiRequest already returns the parsed JSON data
      const data = response;
      console.log("Upgrade response:", data);
      
      toast({
        title: "Upgrade Started",
        description: `Tavern is now being upgraded to level ${currentLevel + 1}.`,
      });
      
      // Reset selections and close dialog
      setUpgradeDialog(false);
      setSelectedSkill(null);
      
      // Refresh buildings and user data
      refetchBuildings();
      fetchUser();
    } catch (error: any) {
      console.error('Error starting upgrade:', error);
      toast({
        title: "Upgrade Failed",
        description: error.message || "There was an error starting the upgrade.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete building upgrade
  const completeUpgrade = async () => {
    setIsSubmitting(true);
    
    try {
      // Call API to complete upgrade
      await apiRequest('POST', `/api/buildings/complete/tavern`, {});
      
      toast({
        title: "Upgrade Complete!",
        description: `Tavern has been upgraded successfully.`,
      });
      
      // Refresh buildings and user data
      refetchBuildings();
      fetchUser();
    } catch (error) {
      console.error('Error completing upgrade:', error);
      toast({
        title: "Error",
        description: "Failed to complete the upgrade.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if there are any available skill points
  const hasAvailableSkillPoints = () => {
    if (!buildingData) {
      return false;
    }
    
    // Calculate available skill points based on building level and already allocated skills
    const totalSkillPoints = Math.max(0, buildingData.currentLevel - 1);
    const allocatedPoints = (buildingData.unlockedSkills?.length || 0);
    
    return totalSkillPoints > allocatedPoints;
  };

  // Mock data for characters available for trading
  const tradeableCharacters = [
    {
      name: 'Novice Warrior',
      level: 12,
      rarity: 'common',
      image: 'https://placehold.co/80',
      cost: 3,
      target: 'Sentinel Guardian',
      targetRarity: 'rare'
    },
    {
      name: 'Acolyte Mage',
      level: 15,
      rarity: 'common',
      image: 'https://placehold.co/80',
      cost: 3,
      target: 'Arcane Master',
      targetRarity: 'rare'
    },
    {
      name: 'Scout',
      level: 14,
      rarity: 'common',
      image: 'https://placehold.co/80',
      cost: 3,
      target: 'Shadow Hunter',
      targetRarity: 'rare'
    }
  ];

  // Mock data for rare trades (level 2+)
  const rareTradeableCharacters = [
    {
      name: 'Sentinel Guardian',
      level: 25,
      rarity: 'rare',
      image: 'https://placehold.co/80',
      cost: 3,
      target: 'Eternal Defender',
      targetRarity: 'epic'
    },
    {
      name: 'Arcane Master',
      level: 28,
      rarity: 'rare',
      image: 'https://placehold.co/80',
      cost: 3,
      target: 'Dimensional Mage',
      targetRarity: 'epic'
    }
  ];

  // Mock data for epic trades (level 5+)
  const epicTradeableCharacters = [
    {
      name: 'Eternal Defender',
      level: 40,
      rarity: 'epic',
      image: 'https://placehold.co/80',
      cost: 3,
      target: 'Celestial Protector',
      targetRarity: 'legendary'
    }
  ];

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
        <div className="text-[#4169E1] text-xl animate-pulse">Loading Tavern data...</div>
      </div>
    );
  }

  // Get available dungeon tickets per day based on level
  const getDungeonTicketsPerDay = () => {
    if (currentLevel < 3) return 0;
    if (currentLevel < 4) return 2;
    return 4;
  };

  return (
    <>
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#4169E1] mb-2">Tavern</h1>
        <p className="text-[#C8B8DB]/80">
          A place to trade characters and earn dungeon tickets to advance your journey.
        </p>
      </div>
      
      {/* Skill Tree Dialog */}
      <Dialog open={skillTreeDialog} onOpenChange={(open) => {
        setSkillTreeDialog(open);
        if (!open) setSelectedSkill(null);
      }}>
        <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB] max-w-2xl overflow-y-auto max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-[#4169E1] font-cinzel text-xl">
              Tavern Skill Tree
            </DialogTitle>
            <DialogDescription>
              Allocate skill points to enhance your Tavern's capabilities. You gain skill points each time you level up your building.
            </DialogDescription>
          </DialogHeader>
          
          {skillTreeData ? (
            <div className="py-4">
              <div className="mb-6 bg-[#432874]/20 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Available Skill Points:</span>
                  <Badge className="bg-[#4169E1] text-[#1A1A2E]">
                    {skillTreeData.currentLevel - (skillTreeData.unlockedSkills?.length || 0)}
                  </Badge>
                </div>
              </div>
              
              <div className="grid gap-4">
                {skillTreeData.availableSkillTree?.map((skill: any) => {
                  const isUnlocked = skillTreeData.unlockedSkills?.includes(skill.id);
                  
                  return (
                    <div 
                      key={skill.id}
                      className={`border p-4 rounded-lg ${isUnlocked ? 'border-[#00B9AE] bg-[#00B9AE]/10' : 'border-[#432874]/30 bg-[#432874]/5'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className={`font-semibold ${isUnlocked ? 'text-[#00B9AE]' : 'text-[#4169E1]'}`}>{skill.name}</h3>
                          <p className="text-sm mt-1">{skill.description}</p>
                        </div>
                        {isUnlocked ? (
                          <Badge className="bg-[#00B9AE]/20 text-[#00B9AE] border-[#00B9AE]/50">
                            <CheckCircle className="h-4 w-4 mr-1" /> Unlocked
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-[#4169E1] hover:bg-[#4169E1]/80 text-[#1A1A2E]"
                            onClick={() => allocateSkill(skill.id)}
                            disabled={!hasAvailableSkillPoints() || isSubmitting}
                          >
                            {isSubmitting ? (
                              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Allocating...</>
                            ) : (
                              <><Plus className="h-4 w-4 mr-1" /> Allocate Point</>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="text-[#4169E1] animate-pulse">Loading skill tree data...</div>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setSkillTreeDialog(false)}
              className="border-[#432874] text-[#C8B8DB]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={upgradeDialog} onOpenChange={setUpgradeDialog}>
        <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB]">
          <DialogHeader>
            <DialogTitle className="text-[#4169E1] font-cinzel text-xl">Upgrade Tavern</DialogTitle>
            <DialogDescription>
              Are you sure you want to upgrade your Tavern to level {currentLevel + 1}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-[#432874]/20 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-2">
                <span>Current Level:</span>
                <Badge variant="outline" className="border-[#4169E1] text-[#4169E1]">{currentLevel}</Badge>
              </div>
              
              <div className="flex justify-between items-center mb-2">
                <span>New Level:</span>
                <Badge className="bg-[#4169E1] text-[#1A1A2E]">{currentLevel + 1}</Badge>
              </div>
              
              <Separator className="my-3 bg-[#432874]/50" />
              
              <div className="flex justify-between items-center mb-2">
                <span>Cost:</span>
                <div className="flex gap-2">
                  <span className="text-[#C8B8DB]">{calculateUpgradeCost(currentLevel).rogueCredits} Credits</span>
                  <span className="text-[#C8B8DB]">{calculateUpgradeCost(currentLevel).forgeTokens} Tokens</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span>Time:</span>
                <span className="text-[#C8B8DB]">{tavern.upgradeTimeInMinutes} minutes</span>
              </div>
            </div>
            
            <div className="bg-[#432874]/20 p-4 rounded-lg">
              <h3 className="font-semibold text-[#4169E1] mb-2">Unlocks at Level {currentLevel + 1}:</h3>
              <ul className="list-disc pl-5 space-y-1">
                {tavern.benefits
                  .filter(benefit => benefit.level === currentLevel + 1)
                  .map((benefit, index) => (
                    <li key={index} className="text-sm text-[#C8B8DB]">{benefit.text}</li>
                  ))}
                {!tavern.benefits.some(benefit => benefit.level === currentLevel + 1) && (
                  <li className="text-sm text-[#C8B8DB]">General tavern improvements</li>
                )}
              </ul>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setUpgradeDialog(false)}
              className="border-[#432874] text-[#C8B8DB]"
            >
              Cancel
            </Button>
            <Button 
              className="bg-[#4169E1] hover:bg-[#4169E1]/80 text-[#1A1A2E]"
              onClick={() => {
                // Check if user has skill points to allocate
                if (hasAvailableSkillPoints()) {
                  setUpgradeDialog(false);
                  setSkillTreeDialog(true);
                } else {
                  startUpgrade();
                }
              }}
              disabled={isSubmitting || !canAffordUpgrade(currentLevel)}
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Upgrading...</>
              ) : (
                <><ArrowUp className="h-4 w-4 mr-2" /> Start Upgrade</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Main Content */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2"
      >
        {/* Tavern Card */}
        <motion.div
          variants={item}
          className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden col-span-2"
        >
          <CardHeader className={`pb-2 ${tavern.color}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                {tavern.icon}
                <CardTitle className="ml-2 font-cinzel">{tavern.name}</CardTitle>
              </div>
              <Badge variant="outline" className="border-[#4169E1] text-[#4169E1]">
                Level {currentLevel}
              </Badge>
            </div>
            <CardDescription className="mt-2">{tavern.description}</CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            {isBeingUpgraded ? (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#C8B8DB]/80">Upgrading to Level {currentLevel + 1}</span>
                  <span className="text-[#4169E1]">{Math.round(calculateUpgradeProgress(buildingData))}%</span>
                </div>
                <Progress value={calculateUpgradeProgress(buildingData)} className="h-2 bg-[#432874]/30" />
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xs text-[#C8B8DB]/60">Time remaining:</span>
                  <CountdownTimer 
                    endTime={new Date(buildingData.upgradeEndTime || Date.now()).getTime()} 
                    onComplete={() => {
                      refetchBuildings();
                      fetchUser();
                    }}
                  />
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-[#4169E1] mb-2">Current Benefits:</h3>
                <ul className="list-disc pl-5 space-y-1 mb-4">
                  {tavern.benefits
                    .filter(benefit => benefit.level <= currentLevel)
                    .map((benefit, index) => (
                      <li key={index} className="text-sm text-[#C8B8DB]">
                        <span className="text-[#00B9AE]">Level {benefit.level}:</span> {benefit.text}
                      </li>
                    ))}
                </ul>
                
                <h3 className="font-semibold text-[#4169E1] mb-2">Next Upgrade:</h3>
                {!isMaxLevel(currentLevel) ? (
                  <>
                    <ul className="list-disc pl-5 space-y-1 mb-4">
                      {tavern.benefits
                        .filter(benefit => benefit.level === currentLevel + 1)
                        .map((benefit, index) => (
                          <li key={index} className="text-sm text-[#C8B8DB]">{benefit.text}</li>
                        ))}
                      {!tavern.benefits.some(benefit => benefit.level === currentLevel + 1) && (
                        <li className="text-sm text-[#C8B8DB]">General tavern improvements</li>
                      )}
                    </ul>
                    
                    <div className="flex flex-wrap gap-2 bg-[#432874]/10 p-3 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-sm text-[#C8B8DB]/80 mr-2">Cost:</span>
                        <Badge variant="outline" className="border-[#4169E1]/30 bg-[#4169E1]/5 text-[#4169E1]">
                          {calculateUpgradeCost(currentLevel).rogueCredits} Credits
                        </Badge>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-[#C8B8DB]/80 mr-2">and</span>
                        <Badge variant="outline" className="border-[#4169E1]/30 bg-[#4169E1]/5 text-[#4169E1]">
                          {calculateUpgradeCost(currentLevel).forgeTokens} Tokens
                        </Badge>
                      </div>
                      <div className="flex items-center ml-auto">
                        <span className="text-sm text-[#C8B8DB]/80 mr-2">Time:</span>
                        <Badge variant="outline" className="border-[#C8B8DB]/30 bg-[#C8B8DB]/5 text-[#C8B8DB]">
                          {tavern.upgradeTimeInMinutes} minutes
                        </Badge>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-[#432874]/10 p-3 rounded-lg text-center text-[#C8B8DB]">
                    Maximum level reached
                  </div>
                )}
              </>
            )}
          </CardContent>
          
          <CardFooter className="pt-0 gap-2">
            {isBeingUpgraded ? (
              <Button 
                className="flex-1 bg-[#00B9AE] hover:bg-[#00B9AE]/80 text-[#1A1A2E]"
                onClick={completeUpgrade}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Completing...</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" /> Complete Now</>
                )}
              </Button>
            ) : (
              <>
                <Button 
                  className="flex-1 bg-[#4169E1] hover:bg-[#4169E1]/80 text-[#1A1A2E]"
                  onClick={() => setUpgradeDialog(true)}
                  disabled={isMaxLevel(currentLevel)}
                >
                  <ArrowUp className="h-4 w-4 mr-2" /> Upgrade
                </Button>
                <Button 
                  variant="outline" 
                  className="border-[#432874] text-[#C8B8DB]"
                  onClick={() => setSkillTreeDialog(true)}
                >
                  <Shield className="h-4 w-4 mr-2" /> Skill Tree
                </Button>
              </>
            )}
          </CardFooter>
        </motion.div>
        
        {/* Dungeon Tickets */}
        <motion.div
          variants={item}
          className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden"
        >
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Ticket className="h-5 w-5 text-[#4169E1] mr-2" />
              <CardTitle className="font-cinzel text-[#4169E1]">Dungeon Tickets</CardTitle>
            </div>
            <CardDescription>Collect tickets to enter dungeons</CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <div className="bg-[#432874]/20 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[#C8B8DB]/80">Available Tickets:</span>
                <Badge className="bg-[#4169E1] text-[#1A1A2E]">
                  {user?.dungeonTickets || 0}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-[#C8B8DB]/80">Daily Generation:</span>
                <Badge variant="outline" className="border-[#00B9AE] text-[#00B9AE]">
                  {getDungeonTicketsPerDay()} tickets
                </Badge>
              </div>
              
              <div className="mt-4">
                <Button
                  className="w-full bg-[#4169E1] hover:bg-[#4169E1]/80 text-[#1A1A2E]"
                  disabled={currentLevel < 3}
                  onClick={() => {
                    toast({
                      title: "Tickets Collected",
                      description: "You've collected your daily dungeon tickets!",
                    });
                    fetchUser();
                  }}
                >
                  <RefreshCcw className="h-4 w-4 mr-2" /> Collect Daily Tickets
                </Button>
                {currentLevel < 3 && (
                  <p className="text-xs text-[#C8B8DB]/70 text-center mt-2">
                    Unlock daily tickets at Tavern Level 3
                  </p>
                )}
              </div>
            </div>
            
            <div className="text-sm text-[#C8B8DB]">
              <p>Use tickets to enter dungeons and earn valuable rewards. Higher Tavern levels generate more tickets daily.</p>
            </div>
          </CardContent>
        </motion.div>
        
        {/* Character Trading */}
        <motion.div
          variants={item}
          className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden col-span-2"
        >
          <CardHeader className="pb-2">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-[#4169E1] mr-2" />
              <CardTitle className="font-cinzel text-[#4169E1]">Character Trading</CardTitle>
            </div>
            <CardDescription>Trade multiple characters to obtain rarer ones</CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <Tabs defaultValue="common">
              <TabsList className="grid w-full grid-cols-3 bg-[#1A1A2E]">
                <TabsTrigger value="common" className="data-[state=active]:bg-[#4169E1]/20 data-[state=active]:text-[#4169E1]">
                  Common Trades
                </TabsTrigger>
                <TabsTrigger value="rare" disabled={currentLevel < 2} className="data-[state=active]:bg-[#4169E1]/20 data-[state=active]:text-[#4169E1]">
                  Rare Trades
                </TabsTrigger>
                <TabsTrigger value="epic" disabled={currentLevel < 5} className="data-[state=active]:bg-[#4169E1]/20 data-[state=active]:text-[#4169E1]">
                  Epic Trades
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="common" className="mt-4">
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {tradeableCharacters.map((character, index) => (
                    <div 
                      key={index} 
                      className="bg-[#432874]/10 rounded-lg p-4 border border-[#432874]/30"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex space-x-3">
                          <div className="w-14 h-14 rounded-full bg-[#432874]/40 flex items-center justify-center overflow-hidden">
                            <img src={character.image} alt={character.name} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-[#C8B8DB]">{character.name}</h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <Badge variant="outline" className="border-[#C8B8DB]/30 text-[#C8B8DB]/80 text-xs">
                                Lvl {character.level}
                              </Badge>
                              <Badge variant="outline" className="border-[#4169E1]/30 bg-[#4169E1]/10 text-[#4169E1] text-xs">
                                {character.rarity}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm text-[#C8B8DB]/70">Trade {character.cost}x for:</div>
                        <Badge className="bg-[#FF9D00]/20 text-[#FF9D00] border-[#FF9D00]/30">
                          {character.targetRarity}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-[#C8B8DB] mb-4">
                        {character.target}
                      </div>
                      
                      <Button
                        className="w-full bg-[#4169E1] hover:bg-[#4169E1]/80 text-[#1A1A2E]"
                        onClick={() => {
                          toast({
                            title: "Trade Complete",
                            description: `You've traded for a ${character.target}!`,
                          });
                        }}
                      >
                        Trade Characters
                      </Button>
                    </div>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="rare" className="mt-4">
                {currentLevel >= 2 ? (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {rareTradeableCharacters.map((character, index) => (
                      <div 
                        key={index} 
                        className="bg-[#432874]/10 rounded-lg p-4 border border-[#432874]/30"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex space-x-3">
                            <div className="w-14 h-14 rounded-full bg-[#432874]/40 flex items-center justify-center overflow-hidden">
                              <img src={character.image} alt={character.name} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-[#C8B8DB]">{character.name}</h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className="border-[#C8B8DB]/30 text-[#C8B8DB]/80 text-xs">
                                  Lvl {character.level}
                                </Badge>
                                <Badge variant="outline" className="border-[#FF9D00]/30 bg-[#FF9D00]/10 text-[#FF9D00] text-xs">
                                  {character.rarity}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm text-[#C8B8DB]/70">Trade {character.cost}x for:</div>
                          <Badge className="bg-[#C70039]/20 text-[#C70039] border-[#C70039]/30">
                            {character.targetRarity}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-[#C8B8DB] mb-4">
                          {character.target}
                        </div>
                        
                        <Button
                          className="w-full bg-[#4169E1] hover:bg-[#4169E1]/80 text-[#1A1A2E]"
                          onClick={() => {
                            toast({
                              title: "Trade Complete",
                              description: `You've traded for a ${character.target}!`,
                            });
                          }}
                        >
                          Trade Characters
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-[#432874]/10 rounded-lg">
                    <Badge variant="outline" className="border-[#FF9D00] text-[#FF9D00] mb-2">Locked</Badge>
                    <p className="text-[#C8B8DB]/80">Upgrade Tavern to Level 2 to unlock Rare trades</p>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="epic" className="mt-4">
                {currentLevel >= 5 ? (
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {epicTradeableCharacters.map((character, index) => (
                      <div 
                        key={index} 
                        className="bg-[#432874]/10 rounded-lg p-4 border border-[#432874]/30"
                      >
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex space-x-3">
                            <div className="w-14 h-14 rounded-full bg-[#432874]/40 flex items-center justify-center overflow-hidden">
                              <img src={character.image} alt={character.name} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-[#C8B8DB]">{character.name}</h3>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant="outline" className="border-[#C8B8DB]/30 text-[#C8B8DB]/80 text-xs">
                                  Lvl {character.level}
                                </Badge>
                                <Badge variant="outline" className="border-[#C70039]/30 bg-[#C70039]/10 text-[#C70039] text-xs">
                                  {character.rarity}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm text-[#C8B8DB]/70">Trade {character.cost}x for:</div>
                          <Badge className="bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30">
                            {character.targetRarity}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-[#C8B8DB] mb-4">
                          {character.target}
                        </div>
                        
                        <Button
                          className="w-full bg-[#4169E1] hover:bg-[#4169E1]/80 text-[#1A1A2E]"
                          onClick={() => {
                            toast({
                              title: "Trade Complete",
                              description: `You've traded for a ${character.target}!`,
                            });
                          }}
                        >
                          Trade Characters
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-[#432874]/10 rounded-lg">
                    <Badge variant="outline" className="border-[#FFD700] text-[#FFD700] mb-2">Locked</Badge>
                    <p className="text-[#C8B8DB]/80">Upgrade Tavern to Level 5 to unlock Epic trades</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </motion.div>
      </motion.div>
    </>
  );
};

export default TavernView;