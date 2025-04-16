import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/lib/zustandStore';
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
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Lock, 
  Clock, 
  CheckCircle2, 
  UserX, 
  Gem, 
  Timer, 
  HelpCircle,
  ArrowUp
} from 'lucide-react';
import CountdownTimer from '../common/CountdownTimer';
import type { Character, FarmingTask } from '@shared/schema';

// Available farming resources
const farmingResources = [
  { 
    id: 1, 
    name: "Celestial Ore", 
    description: "A rare material used in forging and crafting high-level Auras.",
    image: "https://images.unsplash.com/photo-1518709594023-6ebd2b555f4e?w=150&h=150&fit=crop",
    type: "rare",
    baseTime: 60 * 45 // 45 minutes in seconds
  },
  { 
    id: 2, 
    name: "Moonsilver", 
    description: "A shimmering metallic material that enhances the power of water Auras.",
    image: "https://images.unsplash.com/photo-1505356822725-08ad25f3ffe4?w=150&h=150&fit=crop",
    type: "common",
    baseTime: 60 * 30 // 30 minutes in seconds
  },
  { 
    id: 3, 
    name: "Dragon Scale", 
    description: "Tough scales from fallen dragons, essential for crafting fire Auras.",
    image: "https://images.unsplash.com/photo-1563589425059-d2524a5a1dfc?w=150&h=150&fit=crop",
    type: "rare",
    baseTime: 60 * 45 // 45 minutes in seconds
  },
  { 
    id: 4, 
    name: "Phoenix Feather", 
    description: "Brilliant feathers from phoenixes, used in creating powerful Auras.",
    image: "https://images.unsplash.com/photo-1592364395653-83e648b22fa4?w=150&h=150&fit=crop",
    type: "epic",
    baseTime: 60 * 60 // 60 minutes in seconds
  }
];

const FarmingView = () => {
  const { characters, fetchFarmingTasks } = useGameStore();
  const { toast } = useToast();
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedResource, setSelectedResource] = useState<any>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [upgradeSlot, setUpgradeSlot] = useState<number | null>(null);
  // State for tracking which skill path is selected (1: quantity path, 2: quality/speed path)
  const [selectedUpgradePath, setSelectedUpgradePath] = useState<number>(1);
  
  // Get all building upgrades for current user
  const { data: userBuildingUpgrades = { farmSlots: [], forgeSlots: [], marketUpgrades: [], buildings: [] } } = useQuery<any>({
    queryKey: ['/api/buildings/upgrades'],
  });
  
  // Get farming tasks
  const { data: farmingTasks = [], isLoading, refetch: refetchFarmingTasks } = useQuery<FarmingTask[]>({ 
    queryKey: ['/api/farming/tasks'],
    refetchInterval: 5000, // Refresh even more frequently (every 5 seconds)
    staleTime: 1000, // Mark data as stale after 1 second
  });
  
  // Get truly available characters (not assigned to any active tasks)
  const availableCharacters = characters.filter(char => {
    // Check if character is assigned to any active forging task
    const isInForgingTask = useGameStore.getState().forgingTasks.some(task => 
      !task.completed && task.characterId === char.id
    );
    
    // Check if character is assigned to any active farming task
    const isInFarmingTask = farmingTasks.some(task => 
      !task.completed && task.characterId === char.id
    );
    
    // Check if character is in a dungeon run
    const isInDungeonRun = useGameStore.getState().dungeonRuns.some(run => 
      !run.completed && run.characterIds && run.characterIds.includes(char.id)
    );
    
    // Character is available if not assigned to any active task
    return !isInForgingTask && !isInFarmingTask && !isInDungeonRun;
  });
  
  // Calculate available farming slots based on townhall level (for MVP, we'll use 3)
  const maxFarmingSlots = 3;
  
  // Create slots array
  const farmingSlots = Array.from({ length: maxFarmingSlots }, (_, index) => {
    const slot = index + 1;
    const task = farmingTasks.find(t => t.slotIndex === slot && !t.completed);
    return { slot, task };
  });

  const startFarmingTask = async () => {
    if (!selectedResource || !selectedCharacter || selectedSlot === null) {
      toast({
        title: "Incomplete Selection",
        description: "Please select a resource, character, and farming slot.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Calculate farming duration (based on character level and resource type)
      const character = characters.find(c => c.id === selectedCharacter);
      
      if (!character) {
        throw new Error("Selected character not found");
      }
      
      // Adjust time based on character's level (higher level = faster farming)
      const levelMultiplier = Math.max(0.6, 1 - (character.level || 1) * 0.02); // 2% reduction per level, min 40% reduction
      const farmingDuration = selectedResource.baseTime * levelMultiplier;
      
      // Calculate end time
      const now = new Date();
      const endTime = new Date(now.getTime() + farmingDuration * 1000);
      
      console.log('Sending farming request with endTime:', endTime.toISOString());
      
      // Send request to start farming task
      const response = await apiRequest('POST', '/api/farming/tasks', {
        characterId: selectedCharacter,
        resourceName: selectedResource.name,
        endTime: endTime.toISOString(), // Convert Date to ISO string
        slotIndex: selectedSlot
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start farming task");
      }
      
      // Show success message
      toast({
        title: "Farming Started",
        description: `${character.name} is now farming ${selectedResource.name}.`,
      });
      
      // Reset selections
      setSelectedSlot(null);
      setSelectedResource(null);
      setSelectedCharacter(null);
      
      // Refresh farming tasks immediately
      fetchFarmingTasks();
      // Also update the query cache immediately
      refetchFarmingTasks();
    } catch (error: any) {
      console.error('Error starting farming task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start farming task.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCollectResources = async (taskId: number) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', `/api/farming/complete/${taskId}`, undefined);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to collect resources");
      }
      
      const data = await response.json();
      
      toast({
        title: "Resources Collected",
        description: `Gained ${data.amount} ${data.resource}.`,
      });
      
      // Refresh farming tasks immediately
      fetchFarmingTasks();
      // Also update the query cache immediately
      refetchFarmingTasks();
    } catch (error) {
      console.error('Error collecting resources:', error);
      toast({
        title: "Error",
        description: "Failed to collect resources.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTypeStyles = (type: string) => {
    switch (type) {
      case 'common':
        return 'bg-slate-700/30 text-slate-300 border-slate-600/30';
      case 'rare':
        return 'bg-blue-700/30 text-blue-300 border-blue-600/30';
      case 'epic':
        return 'bg-purple-700/30 text-purple-300 border-purple-600/30';
      case 'legendary':
        return 'bg-yellow-700/30 text-yellow-300 border-yellow-600/30';
      default:
        return 'bg-slate-700/30 text-slate-300 border-slate-600/30';
    }
  };
  
  // Calculate bonuses for a given farming slot based on its upgrades
  const calculateSlotBonuses = (slotIndex: number) => {
    // Find the upgrade for this slot
    const slotUpgrades = userBuildingUpgrades?.farmSlots || [];
    const slotUpgrade = slotUpgrades.find((upgrade: any) => upgrade.slotId === slotIndex + 1);
    
    // Default values if no upgrades found
    const defaultBonuses = {
      level: 1,
      path: "Not Upgraded",
      yieldBonus: 0,
      speedBonus: 0,
      qualityBonus: 0,
      bonusChance: 0
    };
    
    if (!slotUpgrade) return defaultBonuses;
    
    // Get upgrade level and path
    const level = slotUpgrade.level || 1;
    const path = slotUpgrade.pathName || "Not Upgraded";
    
    // Calculate different bonuses based on the path and level
    const isBountifulPath = path === "Bountiful Harvest";
    
    // Base bonuses
    const baseYieldBonus = isBountifulPath ? level * 5 : level * 2;
    const baseSpeedBonus = isBountifulPath ? level * 2 : level * 4;
    const baseQualityBonus = isBountifulPath ? level * 1 : level * 3;
    const baseBonusChance = isBountifulPath ? level * 3 : level * 1;
    
    // Enhanced bonuses based on path specialization
    const yieldBonus = isBountifulPath ? baseYieldBonus + level * 3 : baseYieldBonus;
    const speedBonus = !isBountifulPath ? baseSpeedBonus + level * 2 : baseSpeedBonus;
    const qualityBonus = !isBountifulPath ? baseQualityBonus + level * 2 : baseQualityBonus;
    const bonusChance = isBountifulPath ? baseBonusChance + level * 2 : baseBonusChance;
    
    return {
      level,
      path,
      yieldBonus,
      speedBonus,
      qualityBonus,
      bonusChance
    };
  };

  const handleUpgradeSlot = async (slot: number) => {
    setIsSubmitting(true);
    try {
      // In a real implementation, this would be an API call to upgrade the slot
      const response = await apiRequest('POST', '/api/buildings/upgrade', {
        buildingType: 'farmingSlot',
        slotId: slot,
        upgradePath: selectedUpgradePath,
        pathName: selectedUpgradePath === 1 ? 'Bountiful Harvest' : 'Swift Cultivation'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upgrade farming slot");
      }
      
      toast({
        title: "Slot Upgraded",
        description: `Farming Slot ${slot} has been upgraded with ${selectedUpgradePath === 1 ? 'Bountiful Harvest' : 'Swift Cultivation'} path.`,
      });
      
      // Close the upgrade dialog
      setUpgradeSlot(null);
      // Reset selected path for next time
      setSelectedUpgradePath(1);
      
      // Refresh data to show the upgraded slot
      fetchFarmingTasks();
      refetchFarmingTasks();
    } catch (error: any) {
      console.error('Error upgrading farming slot:', error);
      toast({
        title: "Upgrade Failed",
        description: error.message || "Could not upgrade the farming slot.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render content based on loading state and prepare main UI
  const renderMainContent = () => {
    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <div className="text-[#FF9D00] text-xl">Loading farming data...</div>
        </div>
      );
    }

    return (
      <>
        <div className="mb-6">
          <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Farming</h1>
          <p className="text-[#C8B8DB]/80">
            Gather valuable materials for crafting Auras and upgrading your characters.
          </p>
        </div>
        
        {/* Farming Slots */}
        <div className="grid gap-4 md:grid-cols-3 mb-8">
          {farmingSlots.map(({ slot, task }) => {
            // Find character if a task is active
            const character = task ? characters.find(c => c.id === task.characterId) : null;
            
            return (
              <motion.div
                key={`slot-${slot}`}
                whileHover={{ scale: 1.02 }}
                className={`bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden ${!task && 'cursor-pointer'}`}
                onClick={() => !task && setSelectedSlot(slot)}
              >
                {task ? (
                  // Active farming task
                  <div>
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-cinzel font-bold text-lg text-[#C8B8DB]">
                              Farming Slot {slot}
                            </h3>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-6 px-2 py-0 text-xs bg-[#228B22]/10 border-[#228B22]/30 text-[#228B22] hover:bg-[#228B22]/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                setUpgradeSlot(slot);
                              }}
                            >
                              Upgrade
                            </Button>
                          </div>
                          <Badge className="bg-[#228B22]/20 text-[#228B22] border-[#228B22]/30">
                            Active
                          </Badge>
                        </div>
                        {/* Countdown timer */}
                        <div className="text-sm text-[#C8B8DB]/70 flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <CountdownTimer 
                            endTime={task.endTime} 
                            onComplete={() => task && handleCollectResources(task.id)}
                          />
                        </div>
                      </div>
                      
                      {/* Farm Plot Bonuses */}
                      {(() => {
                        const bonuses = calculateSlotBonuses(slot - 1);
                        
                        // Only show if there are any bonuses (slot level > 1)
                        if (bonuses.level > 1) {
                          const isBountifulPath = bonuses.path === 'Bountiful Harvest';
                          return (
                            <div className={`mb-3 p-2 rounded-md text-xs ${
                              isBountifulPath ? 'bg-[#228B22]/10 border border-[#228B22]/20' : 'bg-[#00B9AE]/10 border border-[#00B9AE]/20'
                            }`}>
                              <div className="flex justify-between items-center mb-1">
                                <div className="flex items-center">
                                  {isBountifulPath ? (
                                    <Gem className="h-3 w-3 mr-1 text-[#228B22]" />
                                  ) : (
                                    <Timer className="h-3 w-3 mr-1 text-[#00B9AE]" />
                                  )}
                                  <span className={isBountifulPath ? 'text-[#228B22]' : 'text-[#00B9AE]'}>
                                    {bonuses.path} (Level {bonuses.level})
                                  </span>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[#C8B8DB]/80">
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full ${isBountifulPath ? 'bg-[#228B22]/50' : 'bg-[#00B9AE]/50'} mr-1`}></div>
                                  <span>+{bonuses.yieldBonus}% Yield</span>
                                </div>
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full ${isBountifulPath ? 'bg-[#228B22]/50' : 'bg-[#00B9AE]/50'} mr-1`}></div>
                                  <span>+{bonuses.speedBonus}% Speed</span>
                                </div>
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full ${isBountifulPath ? 'bg-[#228B22]/50' : 'bg-[#00B9AE]/50'} mr-1`}></div>
                                  <span>+{bonuses.qualityBonus}% Quality</span>
                                </div>
                                <div className="flex items-center">
                                  <div className={`w-2 h-2 rounded-full ${isBountifulPath ? 'bg-[#228B22]/50' : 'bg-[#00B9AE]/50'} mr-1`}></div>
                                  <span>+{bonuses.bonusChance}% Bonus</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                      
                      {/* Resource and character info */}
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center">
                          <img
                            src={farmingResources.find(r => r.name === task.resourceName)?.image || "https://via.placeholder.com/40"}
                            alt={task.resourceName}
                            className="w-12 h-12 rounded-full object-cover border-2 border-[#228B22]/50"
                          />
                          <div className="ml-2">
                            <div className="text-sm font-semibold">{task.resourceName}</div>
                            <div className="text-xs text-[#C8B8DB]/70">
                              {farmingResources.find(r => r.name === task.resourceName)?.type || "common"}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex flex-col items-end">
                          <div className="text-sm font-semibold">{character?.name || "Character"}</div>
                          <div className="text-xs text-[#C8B8DB]/70">Level {character?.level || "?"}</div>
                        </div>
                      </div>
                      
                      {/* Collect button (only shown if task is complete) */}
                      {new Date(task.endTime) <= new Date() && (
                        <Button 
                          className="w-full bg-[#228B22] hover:bg-[#228B22]/80"
                          onClick={() => handleCollectResources(task.id)}
                          disabled={isSubmitting}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          {isSubmitting ? "Collecting..." : "Collect Resources"}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  // Empty farming slot
                  <Dialog>
                    <DialogTrigger asChild>
                      <div className="h-full min-h-[200px] flex flex-col items-center justify-center p-6">
                        <div className="w-16 h-16 rounded-full bg-[#432874]/20 flex items-center justify-center mb-3">
                          <Plus className="h-8 w-8 text-[#C8B8DB]/70" />
                        </div>
                        <h3 className="font-cinzel font-bold text-lg text-[#C8B8DB] mb-1">
                          Farming Slot {slot}
                        </h3>
                        
                        {/* Farm Plot Bonuses */}
                        {(() => {
                          const bonuses = calculateSlotBonuses(slot - 1);
                          
                          // Only show if there are any bonuses (slot level > 1)
                          if (bonuses.level > 1) {
                            const isBountifulPath = bonuses.path === 'Bountiful Harvest';
                            return (
                              <div className={`mb-2 p-2 rounded-md text-xs ${
                                isBountifulPath ? 'bg-[#228B22]/10 border border-[#228B22]/20' : 'bg-[#00B9AE]/10 border border-[#00B9AE]/20'
                              }`}>
                                <div className="flex justify-between items-center mb-1">
                                  <div className="flex items-center">
                                    {isBountifulPath ? (
                                      <Gem className="h-3 w-3 mr-1 text-[#228B22]" />
                                    ) : (
                                      <Timer className="h-3 w-3 mr-1 text-[#00B9AE]" />
                                    )}
                                    <span className={isBountifulPath ? 'text-[#228B22]' : 'text-[#00B9AE]'}>
                                      {bonuses.path} (Level {bonuses.level})
                                    </span>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[#C8B8DB]/80">
                                  <div className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full ${isBountifulPath ? 'bg-[#228B22]/50' : 'bg-[#00B9AE]/50'} mr-1`}></div>
                                    <span>+{bonuses.yieldBonus}% Yield</span>
                                  </div>
                                  <div className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full ${isBountifulPath ? 'bg-[#228B22]/50' : 'bg-[#00B9AE]/50'} mr-1`}></div>
                                    <span>+{bonuses.speedBonus}% Speed</span>
                                  </div>
                                  <div className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full ${isBountifulPath ? 'bg-[#228B22]/50' : 'bg-[#00B9AE]/50'} mr-1`}></div>
                                    <span>+{bonuses.qualityBonus}% Quality</span>
                                  </div>
                                  <div className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full ${isBountifulPath ? 'bg-[#228B22]/50' : 'bg-[#00B9AE]/50'} mr-1`}></div>
                                    <span>+{bonuses.bonusChance}% Bonus</span>
                                  </div>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-6 px-2 py-0 mb-2 text-xs bg-[#228B22]/10 border-[#228B22]/30 text-[#228B22] hover:bg-[#228B22]/20"
                          onClick={(e) => {
                            e.stopPropagation();
                            setUpgradeSlot(slot);
                          }}
                        >
                          Upgrade
                        </Button>
                        <p className="text-sm text-[#C8B8DB]/70 text-center">
                          Click to assign a character to farm resources.
                        </p>
                      </div>
                    </DialogTrigger>
                    
                    <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB]">
                      <DialogHeader>
                        <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">
                          Start Farming - Slot {slot}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="py-4">
                        {/* Select Resource */}
                        <h3 className="font-semibold mb-2">Select Resource to Farm</h3>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {farmingResources.map(resource => (
                            <div
                              key={resource.id}
                              className={`flex items-center p-2 rounded-md border cursor-pointer ${
                                selectedResource?.id === resource.id
                                  ? 'bg-[#432874]/40 border-[#228B22]/50'
                                  : 'bg-[#1F1D36]/50 border-[#432874]/30'
                              }`}
                              onClick={() => setSelectedResource(resource)}
                            >
                              <img
                                src={resource.image}
                                alt={resource.name}
                                className="w-10 h-10 rounded-full object-cover border border-[#432874]/50"
                              />
                              <div className="ml-2">
                                <div className="text-sm font-semibold">{resource.name}</div>
                                <Badge className={`text-xs ${getTypeStyles(resource.type)}`}>
                                  {resource.type}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {/* Resource Details (if selected) */}
                        {selectedResource && (
                          <div className="bg-[#432874]/20 p-3 rounded-md mb-4">
                            <h4 className="text-sm font-semibold mb-1">{selectedResource.name}</h4>
                            <p className="text-xs text-[#C8B8DB]/80 mb-2">{selectedResource.description}</p>
                            <div className="flex items-center text-xs">
                              <Timer className="h-3 w-3 mr-1 text-[#C8B8DB]/70" />
                              <span>Base Time: {Math.floor(selectedResource.baseTime / 60)} minutes</span>
                            </div>
                          </div>
                        )}
                        
                        {/* Select Character */}
                        <h3 className="font-semibold mb-2">Select Character</h3>
                        {availableCharacters.length === 0 ? (
                          <div className="bg-[#432874]/20 p-4 rounded-md text-center mb-4">
                            <UserX className="h-8 w-8 mx-auto mb-2 text-[#DC143C]" />
                            <p className="text-[#C8B8DB]/80 text-sm">
                              All characters are currently busy. Wait for them to complete their current tasks or recruit new ones.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto mb-4">
                            {availableCharacters.map(character => (
                              <div
                                key={character.id}
                                className={`flex items-center p-2 rounded-md border cursor-pointer ${
                                  selectedCharacter === character.id
                                    ? 'bg-[#432874]/40 border-[#228B22]/50'
                                    : 'bg-[#1F1D36]/50 border-[#432874]/30'
                                }`}
                                onClick={() => setSelectedCharacter(character.id)}
                              >
                                <img
                                  src={character.avatarUrl}
                                  alt={character.name}
                                  className="w-10 h-10 rounded-full object-cover border border-[#432874]/50"
                                />
                                <div className="ml-2 flex-1">
                                  <div className="flex justify-between">
                                    <span className="text-sm font-semibold">{character.name}</span>
                                    <span className="text-xs">Lvl {character.level}</span>
                                  </div>
                                  <div className="text-xs text-[#C8B8DB]/70">
                                    {/* Character can farm faster based on level */}
                                    Farming Efficiency: +{Math.min(40, (character.level || 1) * 2)}%
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Farming Time Estimate */}
                        {selectedResource && selectedCharacter && (
                          <div className="bg-[#228B22]/10 p-3 rounded-md border border-[#228B22]/30 mb-4">
                            <div className="flex justify-between items-center">
                              <h4 className="text-sm font-semibold flex items-center">
                                <Clock className="h-4 w-4 mr-1 text-[#228B22]" />
                                Estimated Farming Time
                              </h4>
                              <HelpCircle className="h-4 w-4 text-[#C8B8DB]/50" />
                            </div>
                            <div className="text-sm mt-1">
                              {(() => {
                                const character = characters.find(c => c.id === selectedCharacter);
                                const levelMultiplier = Math.max(0.6, 1 - (character?.level || 1) * 0.02);
                                const minutes = Math.ceil((selectedResource.baseTime * levelMultiplier) / 60);
                                return `${minutes} minutes`;
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <DialogFooter>
                        <Button
                          className="bg-[#228B22] hover:bg-[#228B22]/80"
                          onClick={startFarmingTask}
                          disabled={isSubmitting || !selectedResource || !selectedCharacter || availableCharacters.length === 0}
                        >
                          <Gem className="h-4 w-4 mr-2" />
                          {isSubmitting ? "Starting..." : "Start Farming"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </motion.div>
            );
          })}
        </div>
        
        {/* Tips Section */}
        <div className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl p-6">
          <h2 className="text-xl font-cinzel font-bold text-[#FF9D00] mb-4">Farming Tips</h2>
          <div className="space-y-3">
            <div className="flex">
              <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-[#FF9D00] font-bold">1</span>
              </div>
              <p className="text-[#C8B8DB]/80">
                Higher-level characters farm resources faster, with up to 40% reduction in farming time.
              </p>
            </div>
            <div className="flex">
              <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-[#FF9D00] font-bold">2</span>
              </div>
              <p className="text-[#C8B8DB]/80">
                Rare and epic resource types take longer to farm but provide better materials for crafting higher-quality Auras.
              </p>
            </div>
            <div className="flex">
              <div className="bg-[#432874]/30 rounded-full w-8 h-8 flex items-center justify-center mr-3 flex-shrink-0">
                <span className="text-[#FF9D00] font-bold">3</span>
              </div>
              <p className="text-[#C8B8DB]/80">
                Upgrade your Townhall to unlock additional farming slots and increase your material production.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  };
  
  // Store the main content in a variable
  const mainContent = renderMainContent();
  
  // Render the upgrade dialog
  return (
    <>
      {/* Render the main component content */}
      {mainContent}
      
      {/* Upgrade Slot Dialog */}
      <Dialog open={upgradeSlot !== null} onOpenChange={(open) => !open && setUpgradeSlot(null)}>
        <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB]">
          <DialogHeader>
            <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">
              Upgrade Farming Slot {upgradeSlot}
            </DialogTitle>
            <DialogDescription className="text-[#C8B8DB]/80">
              Enhance your farming capabilities with upgraded slots.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {/* Upgrade path selection */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Path 1: Quantity Focus */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer ${
                  selectedUpgradePath === 1 
                    ? 'bg-[#432874]/30 border-[#228B22]' 
                    : 'bg-[#432874]/10 border-[#432874]/30 hover:bg-[#432874]/20'
                }`}
                onClick={() => setSelectedUpgradePath(1)}
              >
                <h3 className="font-semibold mb-2 flex items-center">
                  <Gem className="h-4 w-4 mr-2 text-[#228B22]" />
                  Bountiful Harvest
                </h3>
                <p className="text-xs mb-2 text-[#C8B8DB]/80">Focus on increasing the quantity of resources gathered from each farming session.</p>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center">
                    <span className="bg-[#228B22]/20 text-[#228B22] w-5 h-5 rounded-full flex items-center justify-center mr-2">+</span>
                    <span>15% increase in resource yield</span>
                  </li>
                  <li className="flex items-center">
                    <span className="bg-[#228B22]/20 text-[#228B22] w-5 h-5 rounded-full flex items-center justify-center mr-2">+</span>
                    <span>Chance for bonus materials</span>
                  </li>
                </ul>
              </div>
              
              {/* Path 2: Speed/Quality Focus */}
              <div 
                className={`p-4 rounded-lg border-2 cursor-pointer ${
                  selectedUpgradePath === 2 
                    ? 'bg-[#432874]/30 border-[#00B9AE]' 
                    : 'bg-[#432874]/10 border-[#432874]/30 hover:bg-[#432874]/20'
                }`}
                onClick={() => setSelectedUpgradePath(2)}
              >
                <h3 className="font-semibold mb-2 flex items-center">
                  <Timer className="h-4 w-4 mr-2 text-[#00B9AE]" />
                  Swift Cultivation
                </h3>
                <p className="text-xs mb-2 text-[#C8B8DB]/80">Focus on reducing farming time and improving the quality of gathered resources.</p>
                <ul className="space-y-1 text-sm">
                  <li className="flex items-center">
                    <span className="bg-[#00B9AE]/20 text-[#00B9AE] w-5 h-5 rounded-full flex items-center justify-center mr-2">+</span>
                    <span>20% reduction in farming time</span>
                  </li>
                  <li className="flex items-center">
                    <span className="bg-[#00B9AE]/20 text-[#00B9AE] w-5 h-5 rounded-full flex items-center justify-center mr-2">+</span>
                    <span>Increased chance for rare resources</span>
                  </li>
                </ul>
              </div>
            </div>
            
            {/* Current upgrade level and benefits */}
            <div className="bg-[#432874]/20 p-4 rounded-lg mb-4">
              <h3 className="font-semibold mb-2 flex items-center">
                <ArrowUp className="h-4 w-4 mr-2 text-[#FF9D00]" />
                Current Level Benefits
              </h3>
              <div className="text-sm mb-3">
                <span className="font-medium">Current Level:</span> 
                <span className="ml-2 bg-[#FF9D00]/20 text-[#FF9D00] px-2 py-0.5 rounded">Level 2</span>
                <span className="ml-2 text-[#C8B8DB]/70">(Max Level: 5 - Limited by Townhall)</span>
              </div>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center">
                  <span className={`${selectedUpgradePath === 1 ? 'bg-[#228B22]/20 text-[#228B22]' : 'bg-[#00B9AE]/20 text-[#00B9AE]'} w-5 h-5 rounded-full flex items-center justify-center mr-2`}>+</span>
                  <span>{selectedUpgradePath === 1 ? '15% increase in resource yield' : '20% reduction in farming time'}</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-[#1F1D36] p-4 rounded-lg border border-[#432874]/30">
              <div className="flex justify-between items-center mb-2">
                <span className="font-semibold">Cost:</span>
                <div className="flex items-center">
                  <Gem className="h-4 w-4 mr-1 text-[#FF9D00]" />
                  <span className="text-[#FF9D00]">500 Forge Tokens</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Required Townhall Level:</span>
                <span>3</span>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              className="bg-[#432874] hover:bg-[#432874]/80 text-white"
              onClick={() => setUpgradeSlot(null)}
            >
              Cancel
            </Button>
            <Button
              className={`${selectedUpgradePath === 1 
                ? 'bg-[#228B22] hover:bg-[#228B22]/80' 
                : 'bg-[#00B9AE] hover:bg-[#00B9AE]/80'}`}
              onClick={() => upgradeSlot !== null && handleUpgradeSlot(upgradeSlot)}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Upgrading...</>
              ) : (
                <>
                  <ArrowUp className="h-4 w-4 mr-2" />
                  Upgrade Slot
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FarmingView;
