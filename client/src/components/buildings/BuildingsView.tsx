import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/lib/zustandStore';
import { useDiscordAuth } from '@/lib/discordAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  Hammer, 
  ShoppingBag, 
  User, 
  Gem, 
  List, 
  Clock, 
  Hourglass, 
  ArrowUp, 
  CheckCircle, 
  Lock, 
  Shield,
  Loader2,
  Plus,
  Wheat
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
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import CountdownTimer from '../common/CountdownTimer';

import type { BuildingUpgrade } from '@shared/schema';

// Building definitions
const buildings = [
  {
    id: 'townhall',
    name: 'Townhall',
    description: 'The central building that determines the maximum level of other buildings and unlocks additional farming and dungeon slots.',
    icon: <Building2 className="h-6 w-6" />,
    color: 'text-[#FF9D00] bg-[#FF9D00]/10',
    benefits: [
      { level: 1, text: 'Unlocks basic buildings and 3 farming slots' },
      { level: 2, text: 'Unlocks 4th farming slot' },
      { level: 3, text: 'Unlocks 5th farming slot and increase active character tasks' },
      { level: 4, text: 'Unlocks 6th farming slot' },
      { level: 5, text: 'Unlocks Guild access and all farming slots' },
      { level: 10, text: 'Allows other buildings to reach level 19' },
      { level: 20, text: 'Allows other buildings to reach level 29' },
      { level: 30, text: 'Allows other buildings to reach level 39' },
      { level: 40, text: 'Allows other buildings to reach level 49' }
    ],
    maxLevel: 9,
    baseUpgradeCost: { rogueCredits: 1000, forgeTokens: 100 },
    upgradeTimeInMinutes: 60
  },

  {
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
  },
  {
    id: 'farming',
    name: 'Farming',
    description: 'Enables resource gathering from farming tasks with improved efficiency and rewards.',
    icon: <Wheat className="h-6 w-6" />,
    color: 'text-[#8BC34A] bg-[#8BC34A]/10',
    benefits: [
      { level: 1, text: 'Basic farming efficiency (normal yields)' },
      { level: 2, text: '10% faster farming task completion' },
      { level: 3, text: '20% increased resource yield from farming' },
      { level: 4, text: '40% faster farming task completion' },
      { level: 5, text: '60% increased resource yield from farming' }
    ],
    maxLevel: 9,
    baseUpgradeCost: { rogueCredits: 650, forgeTokens: 65 },
    upgradeTimeInMinutes: 30
  }
];

const BuildingsView = () => {
  const { user, fetchUser } = useDiscordAuth();
  const { toast } = useToast();
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [upgradeDialog, setUpgradeDialog] = useState<boolean>(false);
  const [skillTreeDialog, setSkillTreeDialog] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  
  // Fetch building upgrades
  const { data: buildingUpgrades = [], isLoading, refetch: refetchBuildings } = useQuery<BuildingUpgrade[]>({
    queryKey: ['/api/buildings'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Get building upgrade by type
  const getBuildingByType = (buildingType: string) => {
    console.log("All building upgrades:", buildingUpgrades);
    
    // Map building IDs to the correct buildingType for the server
    const buildingTypeMap: Record<string, string> = {
      'townhall': 'townhall',
      'forge': 'forge',
      'blackmarket': 'blackmarket',
      'bountyboard': 'bountyBoard',
      'tavern': 'tavern',
      'farming': 'farming'
    };
    
    const normalizedType = buildingTypeMap[buildingType] || buildingType;
    console.log("Mapped building type:", buildingType, "->", normalizedType);
    
    // Check if we have a building of this type
    const found = buildingUpgrades.find(upgrade => upgrade.buildingType === normalizedType);
    if (found) {
      console.log("Found building data for:", normalizedType, found);
      return found;
    }
    
    // If no building data found, create a new building instance
    console.log("Creating new building data for:", normalizedType);
    return {
      id: 0,
      userId: 1,
      buildingType: normalizedType,
      currentLevel: 1,
      upgradeStartTime: null,
      upgradeEndTime: null,
      upgradeInProgress: false,
      unlockedSkills: [],
      availableSkillPoints: 1,
      skillDistribution: {}
    } as unknown as BuildingUpgrade;
  };

  // Calculate upgrade cost based on current level
  const calculateUpgradeCost = (building: any, currentLevel: number) => {
    const levelMultiplier = currentLevel;
    return {
      rogueCredits: building.baseUpgradeCost.rogueCredits * levelMultiplier,
      forgeTokens: building.baseUpgradeCost.forgeTokens * levelMultiplier
    };
  };

  // Check if user can afford upgrade
  const canAffordUpgrade = (building: any, currentLevel: number) => {
    if (!user) return false;
    
    const cost = calculateUpgradeCost(building, currentLevel);
    const userCredits = user.rogueCredits || 0;
    const userTokens = user.forgeTokens || 0;
    
    return userCredits >= cost.rogueCredits && userTokens >= cost.forgeTokens;
  };

  // Check if building is at max level based on townhall level
  const isMaxLevel = (building: any, currentLevel: number) => {
    // Get townhall level
    const townhall = getBuildingByType('townhall');
    const townhallLevel = townhall?.currentLevel || 1;
    
    // Fixed max level of 9 for all buildings regardless of Townhall level
    const maxAllowedLevel = 9;
    
    // For all buildings, check against the max allowed level (including townhall)
    return currentLevel >= maxAllowedLevel;
  };

  // Check if building is currently upgrading
  const isUpgrading = (buildingType: string) => {
    const building = getBuildingByType(buildingType);
    return building ? building.upgradeInProgress : false;
  };

  // Calculate upgrade progress
  const calculateUpgradeProgress = (building: BuildingUpgrade) => {
    if (!building.upgradeStartTime || !building.upgradeEndTime) return 0;
    
    const startTime = new Date(building.upgradeStartTime).getTime();
    const endTime = new Date(building.upgradeEndTime).getTime();
    const now = new Date().getTime();
    
    return Math.min(100, Math.max(0, ((now - startTime) / (endTime - startTime)) * 100));
  };

  // Import the TownhallSkillTree component
  const TownhallSkillTree = React.lazy(() => import('./TownhallSkillTree'));
  
  // Start building upgrade
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
    queryKey: selectedBuilding ? [`/api/buildings/skills/${selectedBuilding.buildingType}`] : [],
    enabled: !!selectedBuilding && skillTreeDialog
  });

  // Debug log for skill tree query with console logs
  if (selectedBuilding && skillTreeDialog) {
    console.log("Skill tree query for building:", selectedBuilding);
    console.log("Building type for skill tree:", selectedBuilding.buildingType);
    
    // Log error if undefined
    if (!selectedBuilding.buildingType) {
      console.error("Building type is undefined for:", selectedBuilding);
    }
  }

  // Allocate skill point
  const allocateSkill = async (skillId: string) => {
    if (!selectedBuilding) return;
    
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest('POST', `/api/buildings/skills/${selectedBuilding.buildingType}`, {
        skillId: skillId
      });
      
      const data = await response.json();
      
      toast({
        title: "Skill Allocated",
        description: `You've allocated a skill point for ${selectedBuilding.name}.`,
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
    if (!selectedBuilding) return;
    
    // Make sure we're using the correct building type mapping
    const buildingTypeMap: Record<string, string> = {
      'townhall': 'townhall',
      'forge': 'forge',
      'blackmarket': 'blackmarket',
      'bountyboard': 'bountyBoard',
      'tavern': 'tavern',
      'farming': 'farming'
    };
    const normalizedType = buildingTypeMap[selectedBuilding.id] || selectedBuilding.id;
    
    // Always use the normalized type for consistency
    selectedBuilding.buildingType = normalizedType;
    console.log("Upgrade using buildingType:", selectedBuilding.buildingType);
    
    const buildingData = getBuildingByType(selectedBuilding.id);
    if (!buildingData) return;
    
    const currentLevel = buildingData.currentLevel;
    
    if (isMaxLevel(selectedBuilding, currentLevel)) {
      toast({
        title: "Max Level Reached",
        description: `${selectedBuilding.name} is already at maximum level.`,
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    if (isUpgrading(selectedBuilding.id)) {
      toast({
        title: "Already Upgrading",
        description: `${selectedBuilding.name} is already being upgraded.`,
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    if (!canAffordUpgrade(selectedBuilding, currentLevel)) {
      toast({
        title: "Insufficient Resources",
        description: "You don't have enough resources for this upgrade.",
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      console.log("Starting upgrade for building:", selectedBuilding.id);
      
      // If user has selected a skill to allocate, include it in the upgrade request
      const requestData: any = {
        buildingType: selectedBuilding.buildingType,
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
        description: `${selectedBuilding.name} is now being upgraded to level ${currentLevel + 1}.`,
      });
      
      // Reset selections and close dialog
      setSelectedBuilding(null);
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
  const completeUpgrade = async (buildingType: string) => {
    setIsSubmitting(true);
    
    try {
      // Map building IDs to the correct buildingType for the server
      const buildingTypeMap: Record<string, string> = {
        'townhall': 'townhall',
        'forge': 'forge', 
        'blackmarket': 'blackmarket',
        'bountyboard': 'bountyBoard',
        'tavern': 'tavern',
        'farming': 'farming'
      };
      
      const normalizedType = buildingTypeMap[buildingType] || buildingType;
      console.log(`Completing upgrade for building type: ${buildingType} -> ${normalizedType}`);
      
      // Call API to complete upgrade
      await apiRequest('POST', `/api/buildings/complete/${normalizedType}`, {});
      
      const building = buildings.find(b => b.id === buildingType);
      
      toast({
        title: "Upgrade Complete!",
        description: `${building?.name || buildingType} has been upgraded successfully.`,
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

  // Check if a building is locked
  const isBuildingLocked = (buildingType: string) => {
    // No buildings should be locked - they can all be upgraded up to level 9
    return false;
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
        <div className="text-[#FF9D00] text-xl animate-pulse">Loading buildings data...</div>
      </div>
    );
  }

  // Check if there are any available skill points for a building
  const hasAvailableSkillPoints = (building: any) => {
    if (!building) {
      console.log("No building provided to hasAvailableSkillPoints");
      return false;
    }
    
    const buildingData = getBuildingByType(building.id);
    if (!buildingData) {
      console.log("No building data found for:", building.id);
      return false;
    }
    
    // Calculate available skill points based on building level and already allocated skills
    const totalSkillPoints = Math.max(0, buildingData.currentLevel - 1);
    const allocatedPoints = (buildingData.unlockedSkills?.length || 0);
    
    console.log("Building:", building.id);
    console.log("Current level:", buildingData.currentLevel);
    console.log("Total skill points:", totalSkillPoints);
    console.log("Allocated points:", allocatedPoints);
    console.log("Has available points:", totalSkillPoints > allocatedPoints);
    
    // Always return true for testing
    return true;
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Buildings</h1>
        <p className="text-[#C8B8DB]/80">
          Upgrade your buildings to unlock new features and increase your capabilities.
        </p>
      </div>
      
      {/* Skill Tree Dialog */}
      <Dialog open={skillTreeDialog} onOpenChange={(open) => {
        setSkillTreeDialog(open);
        if (!open) setSelectedSkill(null);
      }}>
        <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB] max-w-2xl overflow-y-auto max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">
              {selectedBuilding?.name} Skill Tree
            </DialogTitle>
            <DialogDescription>
              Allocate skill points to enhance your building's capabilities. You gain skill points each time you level up your building.
            </DialogDescription>
          </DialogHeader>
          
          {skillTreeData ? (
            <div className="py-4">
              <div className="mb-6 bg-[#432874]/20 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Available Skill Points:</span>
                  <Badge className="bg-[#FF9D00] text-[#1A1A2E]">
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
                          <h3 className={`font-semibold ${isUnlocked ? 'text-[#00B9AE]' : 'text-[#FF9D00]'}`}>{skill.name}</h3>
                          <p className="text-sm mt-1">{skill.description}</p>
                        </div>
                        {isUnlocked ? (
                          <Badge className="bg-[#00B9AE]/20 text-[#00B9AE] border-[#00B9AE]/50">
                            <CheckCircle className="h-4 w-4 mr-1" /> Unlocked
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
                            onClick={() => allocateSkill(skill.id)}
                            disabled={!hasAvailableSkillPoints(selectedBuilding) || isSubmitting}
                          >
                            {isSubmitting ? (
                              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Allocating...</>
                            ) : (
                              <><Plus className="h-4 w-4 mr-1" /> Allocate Point</>
                            )}
                          </Button>
                        )}
                      </div>
                      {skill.maxLevel > 1 && (
                        <div className="mt-3 flex items-center">
                          <span className="text-xs mr-2">Level: 1/{skill.maxLevel}</span>
                          <Progress 
                            value={(1 / skill.maxLevel) * 100} 
                            className="h-1 flex-1 bg-[#1F1D36]" 
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="py-8 text-center">
              <Loader2 className="h-8 w-8 mx-auto animate-spin text-[#FF9D00]" />
              <p className="mt-4">Loading skill tree data...</p>
            </div>
          )}
          
          <DialogFooter>
            <Button 
              className="bg-[#432874] hover:bg-[#432874]/80"
              onClick={() => setSkillTreeDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Buildings Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
      >
        {buildings.map(building => {
          const buildingData = getBuildingByType(building.id);
          const currentLevel = buildingData?.currentLevel || 1;
          const isBeingUpgraded = buildingData?.upgradeInProgress || false;
          const locked = isBuildingLocked(building.id) && building.id !== 'townhall';
          
          return (
            <motion.div
              key={building.id}
              variants={item}
              className={`bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden ${
                locked ? 'opacity-50' : ''
              }`}
            >
              <CardHeader className={`pb-2 ${building.color}`}>
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    {building.icon}
                    <CardTitle className="ml-2 font-cinzel">{building.name}</CardTitle>
                  </div>
                  <Badge className="bg-[#432874]/30 text-[#C8B8DB] border-[#432874]/50">
                    Level {currentLevel}/{building.maxLevel}
                  </Badge>
                </div>
                <CardDescription>{building.description}</CardDescription>
              </CardHeader>
              
              <CardContent className="pt-4">
                {/* Current Benefits */}
                <div className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">Current Benefits:</h3>
                  <div className="bg-[#432874]/20 p-3 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-[#00B9AE] mr-2 flex-shrink-0" />
                      <p className="text-sm text-[#C8B8DB]/90">
                        {building.benefits[currentLevel - 1]?.text || 'Basic functionality'}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Next Level Benefits */}
                {!isMaxLevel(building, currentLevel) && (
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold mb-2">Next Level Unlocks:</h3>
                    <div className="bg-[#432874]/10 p-3 rounded-lg">
                      <div className="flex items-center">
                        <ArrowUp className="h-4 w-4 text-[#FF9D00] mr-2 flex-shrink-0" />
                        <p className="text-sm text-[#C8B8DB]/80">
                          {building.benefits[currentLevel]?.text || 'Advanced functionality'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Upgrade In Progress */}
                {isBeingUpgraded && buildingData?.upgradeEndTime && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-[#FF9D00] flex items-center">
                        <Hourglass className="h-4 w-4 mr-1" /> Upgrade in Progress
                      </span>
                      <CountdownTimer
                        endTime={buildingData.upgradeEndTime}
                        onComplete={() => completeUpgrade(building.id)}
                      />
                    </div>
                    <Progress 
                      value={calculateUpgradeProgress(buildingData)} 
                      className="h-2 bg-[#1F1D36] border-[#432874]/20" 
                    />
                    
                    {new Date(buildingData.upgradeEndTime) <= new Date() && (
                      <Button
                        className="w-full mt-3 bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
                        onClick={() => completeUpgrade(building.id)}
                        disabled={isSubmitting}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Completing...' : 'Complete Upgrade'}
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
              
              <CardFooter>
                {locked ? (
                  <div className="w-full flex items-center justify-center bg-[#432874]/20 py-2 rounded-lg text-sm text-[#C8B8DB]/70">
                    <Lock className="h-4 w-4 mr-2" />
                    Requires Townhall Upgrade
                  </div>
                ) : isBeingUpgraded ? (
                  <div className="w-full flex items-center justify-center bg-[#432874]/20 py-2 rounded-lg text-sm text-[#C8B8DB]/70">
                    <Hourglass className="h-4 w-4 mr-2" />
                    Upgrade in Progress
                  </div>
                ) : isMaxLevel(building, currentLevel) ? (
                  <div className="w-full flex items-center justify-center bg-[#00B9AE]/20 py-2 rounded-lg text-sm text-[#00B9AE]">
                    <Shield className="h-4 w-4 mr-2" />
                    Maximum Level Reached
                  </div>
                ) : hasAvailableSkillPoints(building) ? (
                  <Button
                    className="w-full bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
                    onClick={() => {
                      // Ensure buildingType is set correctly with proper mapping
                      const buildingTypeMap: Record<string, string> = {
                        'townhall': 'townhall',
                        'forge': 'forge',
                        'blackmarket': 'blackmarket',
                        'bountyboard': 'bountyBoard',
                        'tavern': 'tavern',
      'farming': 'farming'
                      };
                      const normalizedType = buildingTypeMap[building.id] || building.id;
                      console.log(`Opening skill tree for ${building.name}, type: ${normalizedType}`);
                      
                      setSelectedBuilding({
                        ...building,
                        buildingType: normalizedType  // Map the UI ID to the backend buildingType
                      });
                      setSkillTreeDialog(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Choose Skill Upgrade
                  </Button>
                ) : (
                  <Dialog open={upgradeDialog && selectedBuilding?.id === building.id} onOpenChange={(open) => {
                    setUpgradeDialog(open);
                    if (!open) setSelectedBuilding(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full bg-[#432874] hover:bg-[#432874]/80"
                        onClick={() => setSelectedBuilding({
                          ...building,
                          buildingType: building.id
                        })}
                      >
                        <ArrowUp className="h-4 w-4 mr-2" />
                        Upgrade to Level {currentLevel + 1}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB]">
                      <DialogHeader>
                        <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">
                          Upgrade {building.name}
                        </DialogTitle>
                      </DialogHeader>
                      
                      {building.id === 'townhall' ? (
                        <div className="py-4">
                          <React.Suspense fallback={<div className="py-4 text-center">Loading Townhall upgrades...</div>}>
                            <TownhallSkillTree 
                              building={buildingData} 
                              currentLevel={currentLevel}
                              onUpgrade={(skillId) => {
                                allocateSkill(skillId);
                              }} 
                            />
                          </React.Suspense>
                        </div>
                      ) : (
                        <div className="py-4">
                          <div className="mb-4">
                            <h3 className="font-semibold mb-2">Upgrade to Level {currentLevel + 1}</h3>
                            <div className="bg-[#432874]/20 p-4 rounded-lg">
                              <p className="text-sm mb-3">
                                This upgrade will unlock:
                              </p>
                              <div className="flex items-center text-[#FF9D00] mb-4">
                                <ArrowUp className="h-4 w-4 mr-2 flex-shrink-0" />
                                <p className="text-sm">
                                  {building.benefits[currentLevel]?.text || 'Advanced functionality'}
                                </p>
                              </div>
                            
                              <div className="border-t border-[#432874]/30 pt-3">
                                <h4 className="text-sm font-semibold mb-2">Cost:</h4>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="flex items-center">
                                    <img 
                                      src="https://images.unsplash.com/photo-1543486958-d783bfbf7f8e?w=250&h=250&fit=crop" 
                                      alt="Rogue Credits" 
                                      className="w-5 h-5 rounded-full mr-2"
                                    />
                                    <div>
                                      <div className="text-sm">
                                        {calculateUpgradeCost(building, currentLevel).rogueCredits} Rogue Credits
                                      </div>
                                      <div className={`text-xs ${user && (user.rogueCredits || 0) >= calculateUpgradeCost(building, currentLevel).rogueCredits ? 'text-green-400' : 'text-red-400'}`}>
                                        You have: {user?.rogueCredits || 0}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center">
                                    <img 
                                      src="https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=250&h=250&fit=crop" 
                                      alt="Forge Tokens" 
                                      className="w-5 h-5 rounded-full mr-2"
                                    />
                                    <div>
                                      <div className="text-sm">
                                        {calculateUpgradeCost(building, currentLevel).forgeTokens} Forge Tokens
                                      </div>
                                      <div className={`text-xs ${user && (user.forgeTokens || 0) >= calculateUpgradeCost(building, currentLevel).forgeTokens ? 'text-green-400' : 'text-red-400'}`}>
                                        You have: {user?.forgeTokens || 0}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="border-t border-[#432874]/30 pt-3 mt-3">
                                <div className="flex items-center">
                                  <Clock className="h-4 w-4 mr-2 text-[#C8B8DB]/70" />
                                  <span className="text-sm">
                                    Upgrade Time: {building.upgradeTimeInMinutes} minutes
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <DialogFooter className="flex justify-end space-x-2">
                        <Button 
                          variant="outline" 
                          className="bg-transparent border-[#432874]/50 hover:bg-[#432874]/20"
                          onClick={() => {
                            setSelectedBuilding(null);
                            setUpgradeDialog(false);
                          }}
                          disabled={isSubmitting}
                        >
                          Cancel
                        </Button>
                        <Button
                          className={`${
                            canAffordUpgrade(building, currentLevel)
                              ? 'bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]'
                              : 'bg-[#432874]/50 text-[#C8B8DB]/50 cursor-not-allowed'
                          }`}
                          onClick={() => {
                            // Set the selected building first with the correct mapped buildingType
                            const buildingTypeMap: Record<string, string> = {
                              'townhall': 'townhall',
                              'forge': 'forge',
                              'blackmarket': 'blackmarket',
                              'bountyboard': 'bountyBoard',
                              'tavern': 'tavern',
                              'farming': 'farming'
                            };
                            const normalizedType = buildingTypeMap[building.id] || building.id;
                            console.log(`Setting building for upgrade: ${building.name}, type: ${normalizedType}`);
                            
                            setSelectedBuilding({
                              ...building,
                              buildingType: normalizedType
                            });
                            
                            if (hasAvailableSkillPoints(building)) {
                              console.log("Opening skill tree for:", building.id);
                              // Close the upgrade dialog and open the skill tree dialog
                              setUpgradeDialog(false);
                              setTimeout(() => {
                                setSkillTreeDialog(true);
                              }, 100);
                            } else {
                              console.log("Starting upgrade directly for:", building.id);
                              // If no available skill points, start upgrade directly
                              startUpgrade();
                            }
                          }}
                          disabled={!canAffordUpgrade(building, currentLevel) || isSubmitting}
                        >
                          {isSubmitting 
                            ? 'Starting Upgrade...' 
                            : canAffordUpgrade(building, currentLevel)
                              ? hasAvailableSkillPoints(building)
                                ? 'Choose Skill Upgrade'
                                : 'Start Upgrade'
                              : 'Not Enough Resources'
                          }
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </CardFooter>
            </motion.div>
          );
        })}
      </motion.div>
      
      {/* Building Strategy Tips */}
      <div className="mt-12 bg-[#1A1A2E] border border-[#432874]/30 rounded-xl p-6">
        <h2 className="text-xl font-cinzel font-bold text-[#FF9D00] mb-4">Building Strategy Tips</h2>
        <div className="space-y-4">
          <div className="flex">
            <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
              <span className="text-[#FF9D00] font-bold">1</span>
            </div>
            <p className="text-[#C8B8DB]/80">
              Prioritize upgrading the <span className="text-[#FF9D00] font-semibold">Townhall</span> first as it serves as the foundation of your base and unlocks other buildings.
            </p>
          </div>
          <div className="flex">
            <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
              <span className="text-[#FF9D00] font-bold">2</span>
            </div>
            <p className="text-[#C8B8DB]/80">
              The <span className="text-[#DC143C] font-semibold">Forge</span> should be your second priority as it controls your character level cap and Aura capabilities.
            </p>
          </div>
          <div className="flex">
            <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
              <span className="text-[#FF9D00] font-bold">3</span>
            </div>
            <p className="text-[#C8B8DB]/80">
              The <span className="text-[#00B9AE] font-semibold">Black Market</span> is essential for trading and acquiring rare items at higher levels.
            </p>
          </div>
          <div className="flex">
            <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
              <span className="text-[#FF9D00] font-bold">4</span>
            </div>
            <p className="text-[#C8B8DB]/80">
              Balance your upgrades to maintain an optimal progression pace - having multiple low-level buildings is often better than a single high-level one.
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export default BuildingsView;
