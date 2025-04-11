import { useState } from 'react';
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
  Shield
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
  DialogFooter
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
      { level: 5, text: 'Unlocks Guild access and all farming slots' }
    ],
    maxLevel: 5,
    baseUpgradeCost: { rogueCredits: 1000, forgeTokens: 100 },
    upgradeTimeInMinutes: 60
  },
  {
    id: 'forge',
    name: 'Forge',
    description: 'Determines the maximum level of your characters and allows crafting and fusion of Auras.',
    icon: <Hammer className="h-6 w-6" />,
    color: 'text-[#DC143C] bg-[#DC143C]/10',
    benefits: [
      { level: 1, text: 'Craft level 1 Auras' },
      { level: 2, text: 'Characters can reach level 10' },
      { level: 3, text: 'Unlock Aura fusion up to level 5' },
      { level: 4, text: 'Characters can reach level 25' },
      { level: 5, text: 'Aura fusion up to level 10, characters can reach level 49' }
    ],
    maxLevel: 5,
    baseUpgradeCost: { rogueCredits: 800, forgeTokens: 80 },
    upgradeTimeInMinutes: 45
  },
  {
    id: 'blackmarket',
    name: 'Black Market',
    description: 'Enables purchasing of premium items and eventually listing your own items for sale.',
    icon: <ShoppingBag className="h-6 w-6" />,
    color: 'text-[#00B9AE] bg-[#00B9AE]/10',
    benefits: [
      { level: 1, text: 'Access to basic market offers' },
      { level: 2, text: 'Unlock 1 personal listing slot' },
      { level: 3, text: 'Unlock 2 personal listing slots' },
      { level: 4, text: 'Unlock 4 personal listing slots' },
      { level: 5, text: 'Unlock all 6 personal listing slots' }
    ],
    maxLevel: 5,
    baseUpgradeCost: { rogueCredits: 750, forgeTokens: 75 },
    upgradeTimeInMinutes: 40
  },
  {
    id: 'bountyboard',
    name: 'Bounty Board',
    description: 'Provides daily quests and missions that reward valuable resources and Soul Shards.',
    icon: <List className="h-6 w-6" />,
    color: 'text-[#228B22] bg-[#228B22]/10',
    benefits: [
      { level: 1, text: '3 daily quests (common)' },
      { level: 2, text: '4 daily quests (chance for rare)' },
      { level: 3, text: '5 daily quests (chance for epic)' },
      { level: 4, text: '6 daily quests (higher chance for epic)' },
      { level: 5, text: '7 daily quests (guaranteed epic)' }
    ],
    maxLevel: 5,
    baseUpgradeCost: { rogueCredits: 600, forgeTokens: 60 },
    upgradeTimeInMinutes: 30
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
    maxLevel: 5,
    baseUpgradeCost: { rogueCredits: 700, forgeTokens: 70 },
    upgradeTimeInMinutes: 35
  }
];

const BuildingsView = () => {
  const { user, fetchUser } = useDiscordAuth();
  const { toast } = useToast();
  const [selectedBuilding, setSelectedBuilding] = useState<any>(null);
  const [upgradeDialog, setUpgradeDialog] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Fetch building upgrades
  const { data: buildingUpgrades = [], isLoading, refetch: refetchBuildings } = useQuery<BuildingUpgrade[]>({
    queryKey: ['/api/buildings'],
    refetchInterval: 60000 // Refresh every minute
  });

  // Get building upgrade by type
  const getBuildingByType = (buildingType: string) => {
    return buildingUpgrades.find(upgrade => upgrade.buildingType === buildingType);
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
    return user.rogueCredits >= cost.rogueCredits && user.forgeTokens >= cost.forgeTokens;
  };

  // Check if building is at max level
  const isMaxLevel = (building: any, currentLevel: number) => {
    return currentLevel >= building.maxLevel;
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

  // Start building upgrade
  const startUpgrade = async () => {
    if (!selectedBuilding) return;
    
    const buildingData = getBuildingByType(selectedBuilding.id);
    if (!buildingData) return;
    
    const currentLevel = buildingData.currentLevel;
    
    if (isMaxLevel(selectedBuilding, currentLevel)) {
      toast({
        title: "Max Level Reached",
        description: `${selectedBuilding.name} is already at maximum level.`,
        variant: "destructive"
      });
      return;
    }
    
    if (isUpgrading(selectedBuilding.id)) {
      toast({
        title: "Already Upgrading",
        description: `${selectedBuilding.name} is already being upgraded.`,
        variant: "destructive"
      });
      return;
    }
    
    if (!canAffordUpgrade(selectedBuilding, currentLevel)) {
      toast({
        title: "Insufficient Resources",
        description: "You don't have enough resources for this upgrade.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Call the API to start the upgrade
      const response = await apiRequest('POST', '/api/buildings/upgrade', {
        buildingType: selectedBuilding.id
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start upgrade');
      }
      
      toast({
        title: "Upgrade Started",
        description: `${selectedBuilding.name} is now being upgraded to level ${currentLevel + 1}.`,
      });
      
      // Reset selections and close dialog
      setSelectedBuilding(null);
      setUpgradeDialog(false);
      
      // Refresh buildings and user data
      refetchBuildings();
      fetchUser();
    } catch (error) {
      console.error('Error starting upgrade:', error);
      toast({
        title: "Upgrade Failed",
        description: "There was an error starting the upgrade.",
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
      // Call API to complete upgrade
      const response = await apiRequest('POST', `/api/buildings/complete/${buildingType}`, {});
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete upgrade');
      }
      
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

  // Check if a building is locked (requires higher townhall level)
  const isBuildingLocked = (buildingType: string) => {
    if (buildingType === 'townhall') return false;
    
    const townhall = getBuildingByType('townhall');
    if (!townhall) return true;
    
    // All buildings require townhall to be at least their level
    const building = getBuildingByType(buildingType);
    return !building || building.currentLevel >= townhall.currentLevel;
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

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Buildings</h1>
        <p className="text-[#C8B8DB]/80">
          Upgrade your buildings to unlock new features and increase your capabilities.
        </p>
      </div>
      
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
                ) : (
                  <Dialog open={upgradeDialog && selectedBuilding?.id === building.id} onOpenChange={(open) => {
                    setUpgradeDialog(open);
                    if (!open) setSelectedBuilding(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button
                        className="w-full bg-[#432874] hover:bg-[#432874]/80"
                        onClick={() => setSelectedBuilding(building)}
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
                                    <div className={`text-xs ${user && user.rogueCredits >= calculateUpgradeCost(building, currentLevel).rogueCredits ? 'text-green-400' : 'text-red-400'}`}>
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
                                    <div className={`text-xs ${user && user.forgeTokens >= calculateUpgradeCost(building, currentLevel).forgeTokens ? 'text-green-400' : 'text-red-400'}`}>
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
                          onClick={startUpgrade}
                          disabled={!canAffordUpgrade(building, currentLevel) || isSubmitting}
                        >
                          {isSubmitting 
                            ? 'Starting Upgrade...' 
                            : canAffordUpgrade(building, currentLevel)
                              ? 'Start Upgrade'
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
              Prioritize upgrading the <span className="text-[#FF9D00] font-semibold">Townhall</span> first to unlock higher levels for other buildings.
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
