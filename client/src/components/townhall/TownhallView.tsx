import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/lib/zustandStore';
import { useAuthStore } from '@/lib/zustandStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Building2, 
  ArrowUp, 
  CheckCircle, 
  Shield,
  Loader2,
  Plus
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
import { Separator } from '@/components/ui/separator';

import type { BuildingUpgrade } from '@shared/schema';

// Townhall building definition
const townhall = {
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
};

const TownhallView = () => {
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
    const found = buildingUpgrades.find(upgrade => upgrade.buildingType === 'townhall');
    if (found) {
      return found;
    }
    
    // If no building data found, create a new building instance
    return {
      id: 0,
      userId: 1,
      buildingType: 'townhall',
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
      rogueCredits: townhall.baseUpgradeCost.rogueCredits * levelMultiplier,
      forgeTokens: townhall.baseUpgradeCost.forgeTokens * levelMultiplier
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
    // Fixed max level of 9 for Townhall
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
    queryKey: [`/api/buildings/skills/townhall`],
    enabled: skillTreeDialog
  });

  // Allocate skill point
  const allocateSkill = async (skillId: string) => {
    setIsSubmitting(true);
    
    try {
      const response = await apiRequest('POST', `/api/buildings/skills/townhall`, {
        skillId: skillId
      });
      
      const data = await response.json();
      
      toast({
        title: "Skill Allocated",
        description: `You've allocated a skill point for Townhall.`,
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
    const buildingType = 'townhall';
    
    if (isMaxLevel(currentLevel)) {
      toast({
        title: "Max Level Reached",
        description: `Townhall is already at maximum level.`,
        variant: "destructive"
      });
      setIsSubmitting(false);
      return;
    }
    
    if (isBeingUpgraded) {
      toast({
        title: "Already Upgrading",
        description: `Townhall is already being upgraded.`,
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
      console.log("Starting upgrade for Townhall");
      
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
        description: `Townhall is now being upgraded to level ${currentLevel + 1}.`,
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
      await apiRequest('POST', `/api/buildings/complete/townhall`, {});
      
      toast({
        title: "Upgrade Complete!",
        description: `Townhall has been upgraded successfully.`,
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
        <div className="text-[#FF9D00] text-xl animate-pulse">Loading Townhall data...</div>
      </div>
    );
  }

  return (
    <>
      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Townhall</h1>
        <p className="text-[#C8B8DB]/80">
          The central building that manages your town and determines the maximum level of other buildings.
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
              Townhall Skill Tree
            </DialogTitle>
            <DialogDescription>
              Allocate skill points to enhance your Townhall's capabilities. You gain skill points each time you level up your building.
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
              <div className="text-[#FF9D00] animate-pulse">Loading skill tree data...</div>
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
            <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">Upgrade Townhall</DialogTitle>
            <DialogDescription>
              Are you sure you want to upgrade your Townhall to level {currentLevel + 1}?
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="bg-[#432874]/20 p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-2">
                <span>Current Level:</span>
                <Badge variant="outline" className="border-[#FF9D00] text-[#FF9D00]">{currentLevel}</Badge>
              </div>
              
              <div className="flex justify-between items-center mb-2">
                <span>New Level:</span>
                <Badge className="bg-[#FF9D00] text-[#1A1A2E]">{currentLevel + 1}</Badge>
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
                <span className="text-[#C8B8DB]">{townhall.upgradeTimeInMinutes} minutes</span>
              </div>
            </div>
            
            <div className="bg-[#432874]/20 p-4 rounded-lg">
              <h3 className="font-semibold text-[#FF9D00] mb-2">Unlocks at Level {currentLevel + 1}:</h3>
              <ul className="list-disc pl-5 space-y-1">
                {townhall.benefits
                  .filter(benefit => benefit.level === currentLevel + 1)
                  .map((benefit, index) => (
                    <li key={index} className="text-sm text-[#C8B8DB]">{benefit.text}</li>
                  ))}
                {!townhall.benefits.some(benefit => benefit.level === currentLevel + 1) && (
                  <li className="text-sm text-[#C8B8DB]">General town management improvements</li>
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
              className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
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
        {/* Townhall Card */}
        <motion.div
          variants={item}
          className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden col-span-2"
        >
          <CardHeader className={`pb-2 ${townhall.color}`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center">
                {townhall.icon}
                <CardTitle className="ml-2 font-cinzel">{townhall.name}</CardTitle>
              </div>
              <Badge variant="outline" className="border-[#FF9D00] text-[#FF9D00]">
                Level {currentLevel}
              </Badge>
            </div>
            <CardDescription className="mt-2">{townhall.description}</CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            {isBeingUpgraded ? (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-[#C8B8DB]/80">Upgrading to Level {currentLevel + 1}</span>
                  <span className="text-[#FF9D00]">{Math.round(calculateUpgradeProgress(buildingData))}%</span>
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
                <h3 className="font-semibold text-[#FF9D00] mb-2">Benefits:</h3>
                <ul className="list-disc pl-5 space-y-1 mb-4">
                  {townhall.benefits
                    .filter(benefit => benefit.level <= currentLevel)
                    .map((benefit, index) => (
                      <li key={index} className="text-sm text-[#C8B8DB]">
                        <span className="text-[#00B9AE]">Level {benefit.level}:</span> {benefit.text}
                      </li>
                    ))}
                </ul>
                
                <h3 className="font-semibold text-[#FF9D00] mb-2">Next Upgrade:</h3>
                {!isMaxLevel(currentLevel) ? (
                  <>
                    <ul className="list-disc pl-5 space-y-1 mb-4">
                      {townhall.benefits
                        .filter(benefit => benefit.level === currentLevel + 1)
                        .map((benefit, index) => (
                          <li key={index} className="text-sm text-[#C8B8DB]">{benefit.text}</li>
                        ))}
                      {!townhall.benefits.some(benefit => benefit.level === currentLevel + 1) && (
                        <li className="text-sm text-[#C8B8DB]">General town management improvements</li>
                      )}
                    </ul>
                    
                    <div className="flex flex-wrap gap-2 bg-[#432874]/10 p-3 rounded-lg">
                      <div className="flex items-center">
                        <span className="text-sm text-[#C8B8DB]/80 mr-2">Cost:</span>
                        <Badge variant="outline" className="border-[#FF9D00]/30 bg-[#FF9D00]/5 text-[#FF9D00]">
                          {calculateUpgradeCost(currentLevel).rogueCredits} Credits
                        </Badge>
                      </div>
                      <div className="flex items-center">
                        <span className="text-sm text-[#C8B8DB]/80 mr-2">and</span>
                        <Badge variant="outline" className="border-[#FF9D00]/30 bg-[#FF9D00]/5 text-[#FF9D00]">
                          {calculateUpgradeCost(currentLevel).forgeTokens} Tokens
                        </Badge>
                      </div>
                      <div className="flex items-center ml-auto">
                        <span className="text-sm text-[#C8B8DB]/80 mr-2">Time:</span>
                        <Badge variant="outline" className="border-[#C8B8DB]/30 bg-[#C8B8DB]/5 text-[#C8B8DB]">
                          {townhall.upgradeTimeInMinutes} minutes
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
                  className="flex-1 bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
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
        
        {/* Stats and Town Info */}
        <motion.div
          variants={item}
          className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden"
        >
          <CardHeader className="pb-2">
            <CardTitle className="font-cinzel text-[#FF9D00]">Town Statistics</CardTitle>
            <CardDescription>Key metrics about your town's development</CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-[#C8B8DB]/80">Total Buildings:</span>
                <span className="font-medium text-[#C8B8DB]">6</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#C8B8DB]/80">Farming Slots:</span>
                <span className="font-medium text-[#C8B8DB]">{Math.min(currentLevel + 2, 7)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#C8B8DB]/80">Dungeon Slots:</span>
                <span className="font-medium text-[#C8B8DB]">{Math.min(currentLevel + 1, 5)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#C8B8DB]/80">Max Building Level:</span>
                <span className="font-medium text-[#C8B8DB]">{Math.min(currentLevel + 8, 50)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#C8B8DB]/80">Guild Access:</span>
                <span className="font-medium text-[#C8B8DB]">{currentLevel >= 5 ? 'Unlocked' : 'Locked'}</span>
              </div>
            </div>
          </CardContent>
        </motion.div>
        
        {/* Building Management */}
        <motion.div
          variants={item}
          className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden"
        >
          <CardHeader className="pb-2">
            <CardTitle className="font-cinzel text-[#FF9D00]">Building Management</CardTitle>
            <CardDescription>Manage your town's buildings and resources</CardDescription>
          </CardHeader>
          
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="bg-[#432874]/10 p-3 rounded-lg">
                <h3 className="font-semibold text-[#FF9D00] mb-2">Building Limits</h3>
                <p className="text-sm text-[#C8B8DB]">
                  Your Townhall (Level {currentLevel}) allows other buildings to reach a maximum of level {Math.min(currentLevel + 8, 50)}.
                </p>
              </div>
              
              <div className="bg-[#432874]/10 p-3 rounded-lg">
                <h3 className="font-semibold text-[#FF9D00] mb-2">Resource Production</h3>
                <p className="text-sm text-[#C8B8DB]">
                  Each Townhall level increases passive resource generation by 5%.
                </p>
                <div className="mt-2 flex justify-between">
                  <span className="text-xs text-[#C8B8DB]/80">Current Bonus:</span>
                  <span className="text-xs font-medium text-[#00B9AE]">+{(currentLevel - 1) * 5}%</span>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="pt-0">
            <Button 
              variant="outline" 
              className="w-full border-[#432874] text-[#C8B8DB]"
              onClick={() => window.location.href = '/buildings'}
            >
              View All Buildings
            </Button>
          </CardFooter>
        </motion.div>
      </motion.div>
    </>
  );
};

export default TownhallView;