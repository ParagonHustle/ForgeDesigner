import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGameStore } from "@/lib/zustandStore";
import { motion } from "framer-motion";
import { Clock, Flame, Hammer, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Aura, BuildingUpgrade, ForgingTask } from "@shared/schema";
import CountdownTimer from "../common/CountdownTimer";

const ForgeView = () => {
  const { auras = [], resources = [], fetchAuras, fetchResources, fetchForgingTasks } = useGameStore();
  const { toast } = useToast();
  
  // Get forge building level
  const { data: buildingUpgrades = [] } = useQuery<BuildingUpgrade[]>({ 
    queryKey: ['/api/buildings/upgrades'], 
  });
  
  // Determine available crafting slots based on forge level (1 by default, +1 per level)
  const forgeUpgrade = buildingUpgrades.find(u => u.buildingType === 'forge');
  const forgeLevel = forgeUpgrade?.currentLevel || 1;
  const maxCraftingSlots = forgeLevel;
  const [selectedTab, setSelectedTab] = useState('craft');
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [primaryAura, setPrimaryAura] = useState<Aura | null>(null);
  const [secondaryAura, setSecondaryAura] = useState<Aura | null>(null);
  
  // Get forging tasks
  const { data: forgingTasks = [], isLoading: isTasksLoading } = useQuery<ForgingTask[]>({ 
    queryKey: ['/api/forge/tasks'],
    refetchInterval: 10000 // Refresh every 10 seconds
  });

  // Filter auras that are not currently being used in fusion
  const availableAuras = auras.filter(aura => !aura.isFusing);
  const activeForgingTasks = forgingTasks.filter(task => !task.completed);
  
  // Reset aura selections when changing tabs
  useEffect(() => {
    setPrimaryAura(null);
    setSecondaryAura(null);
    setSelectedElement(null);
  }, [selectedTab]);
  
  // Start crafting a new aura
  const startCrafting = async () => {
    if (!selectedElement) {
      toast({
        title: "Element Required",
        description: "Please select an element for your new aura.",
        variant: "destructive"
      });
      return;
    }
    
    // Check if there are available slots
    if (activeForgingTasks.length >= maxCraftingSlots) {
      toast({
        title: "No Available Slots",
        description: `You can only have ${maxCraftingSlots} active crafting tasks. Upgrade your Forge to unlock more slots.`,
        variant: "destructive"
      });
      return;
    }
    
    // Check if user has enough materials (essence)
    const essence = resources.find(r => r.name === 'Essence');
    if (!essence || (essence.quantity || 0) < 500) {
      toast({
        title: "Insufficient Materials",
        description: `You need 500 Essence to craft a new aura. You have ${essence?.quantity || 0}.`,
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Create task with required materials
      // Let the server handle the start/end times
      const response = await apiRequest('POST', '/api/forge/craft', {
        targetElement: selectedElement,
        requiredMaterials: {
          'Essence': 500
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start crafting");
      }
      
      const data = await response.json();
      
      toast({
        title: "Crafting Started",
        description: `You've started crafting a new ${selectedElement} Aura. It will be ready in 5 minutes.`,
      });
      
      // Refresh resources and forging tasks
      fetchResources();
      fetchForgingTasks();
      setSelectedElement(null);
    } catch (error: any) {
      console.error('Error starting craft:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start crafting.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Complete a forging task
  const completeForging = async (taskId: number) => {
    setIsSubmitting(true);
    try {
      const response = await apiRequest('POST', `/api/forge/complete/${taskId}`, undefined);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to complete forging task");
      }
      
      const data = await response.json();
      
      toast({
        title: `${data.taskType === 'craft' ? 'Crafting' : 'Fusion'} Complete!`,
        description: `Successfully created a new Level ${data.aura.level} ${data.aura.element} Aura.`,
      });
      
      // Refresh forging tasks and auras
      fetchForgingTasks();
      fetchAuras();
    } catch (error: any) {
      console.error('Error completing forging task:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to complete forging task.",
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
  
  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">The Forge</h1>
        <p className="text-[#C8B8DB]/80">
          Craft new Auras and fuse existing ones to create more powerful versions.
        </p>
      </div>
      
      {/* Active Tasks */}
      {activeForgingTasks.length > 0 && (
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-xl font-cinzel font-bold mb-4">Active Forging</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {activeForgingTasks.map(task => {
              // Calculate progress percentage
              const startTime = new Date(task.startTime || Date.now()).getTime();
              const endTime = new Date(task.endTime || Date.now()).getTime();
              const now = new Date().getTime();
              const progress = Math.min(
                100,
                Math.max(0, ((now - startTime) / (endTime - startTime)) * 100)
              );
              
              // Check if task is complete
              const isComplete = now >= endTime;
              
              return (
                <Card key={task.id} className="bg-[#1A1A2E] border-[#432874]/30">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">
                          {task.taskType === 'craft' ? 'Crafting' : 'Fusion'}
                        </CardTitle>
                        <CardDescription>
                          {task.taskType === 'craft' 
                            ? `New ${task.targetElement} Aura` 
                            : 'Fusing Auras'
                          }
                        </CardDescription>
                      </div>
                      <Badge 
                        className={task.taskType === 'craft' 
                          ? 'bg-purple-700/30 text-purple-300 border-purple-600/30'
                          : 'bg-orange-700/30 text-orange-300 border-orange-600/30'
                        }
                      >
                        {task.taskType === 'craft' ? 'New' : 'Fusion'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <Progress value={progress} max={100} className="h-2 bg-[#432874]/20" />
                    </div>
                    
                    {isComplete ? (
                      <div className="flex justify-center items-center py-2">
                        <span className="text-green-400 flex items-center">
                          <Sparkles className="h-4 w-4 mr-1" />
                          Ready to claim!
                        </span>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-[#C8B8DB]/80 flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          Completes in <CountdownTimer 
                            endTime={task.endTime} 
                            onComplete={() => completeForging(task.id)}
                          />
                        </span>
                      </div>
                    )}
                  </CardContent>
                  {isComplete && (
                    <CardFooter>
                      <Button
                        className="w-full bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
                        onClick={() => completeForging(task.id)}
                        disabled={isSubmitting}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Completing...' : 'Complete Forging'}
                      </Button>
                    </CardFooter>
                  )}
                </Card>
              );
            })}
          </div>
        </motion.div>
      )}
      
      {/* Forge Interface */}
      <div className="bg-[#1A1A2E] rounded-xl border border-[#432874]/30 p-6">
        <Tabs defaultValue="craft" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="bg-[#432874]/20 mb-6">
            <TabsTrigger value="craft" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
              <Hammer className="h-4 w-4 mr-2" />
              Craft Aura
            </TabsTrigger>
            <TabsTrigger value="fusion" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
              <Flame className="h-4 w-4 mr-2" />
              Aura Fusion
            </TabsTrigger>
          </TabsList>
          
          {/* Crafting Interface */}
          <TabsContent value="craft" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left side: Element selection */}
              <div className="bg-[#15152C] rounded-lg border border-[#432874]/20 p-4">
                <h3 className="text-lg font-semibold mb-4">Choose Element</h3>
                
                <Select value={selectedElement || ''} onValueChange={setSelectedElement}>
                  <SelectTrigger className="bg-[#1A1A2E] border-[#432874]/30">
                    <SelectValue placeholder="Select element" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fire">Fire</SelectItem>
                    <SelectItem value="water">Water</SelectItem>
                    <SelectItem value="earth">Earth</SelectItem>
                    <SelectItem value="wind">Wind</SelectItem>
                    <SelectItem value="light">Light</SelectItem>
                    <SelectItem value="dark">Dark</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="mt-8">
                  <h4 className="text-md font-semibold mb-3">Required Materials:</h4>
                  <div className="flex justify-between items-center p-3 bg-[#1A1A2E] rounded border border-[#432874]/20">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full bg-purple-800/50 flex items-center justify-center mr-3">
                        <span className="text-purple-300">E</span>
                      </div>
                      <span>Essence</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm">500</span>
                      <span className="text-xs text-[#C8B8DB]/60">
                        You have: {resources.find(r => r.name === 'Essence')?.quantity || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right side: Crafting summary */}
              <div className="bg-[#15152C] rounded-lg border border-[#432874]/20 p-4">
                <h3 className="text-lg font-semibold mb-4">Crafting Summary</h3>
                
                <div className="mb-6">
                  <div className="flex items-center mb-2">
                    <div className={`w-3 h-3 rounded-full mr-2 ${selectedElement 
                      ? selectedElement === 'fire' ? 'bg-red-500' 
                      : selectedElement === 'water' ? 'bg-blue-500'
                      : selectedElement === 'earth' ? 'bg-green-500' 
                      : selectedElement === 'wind' ? 'bg-cyan-500'
                      : selectedElement === 'light' ? 'bg-yellow-500'
                      : 'bg-purple-500'
                      : 'bg-gray-500'}`} 
                    />
                    <span className="capitalize">
                      {selectedElement || 'No element selected'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-[#C8B8DB]/70">
                    Crafting a new Aura with random stat multipliers.
                  </p>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-md font-semibold mb-2">Crafting Time:</h4>
                  <div className="flex items-center text-[#C8B8DB]/80">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>5 minutes</span>
                  </div>
                </div>
                
                <div className="mb-6">
                  <h4 className="text-md font-semibold mb-2">Forge Capacity:</h4>
                  <div className="text-sm">
                    <div className="flex justify-between mb-1">
                      <span>Active Tasks:</span>
                      <span className={activeForgingTasks.length >= maxCraftingSlots ? 'text-red-400' : 'text-green-400'}>
                        {activeForgingTasks.length} / {maxCraftingSlots}
                      </span>
                    </div>
                    <p className="text-xs text-[#C8B8DB]/60">
                      Upgrade your Forge building to increase capacity.
                    </p>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
                  onClick={startCrafting}
                  disabled={
                    isSubmitting || 
                    !selectedElement || 
                    activeForgingTasks.length >= maxCraftingSlots
                  }
                >
                  <Hammer className="h-4 w-4 mr-2" />
                  {isSubmitting ? 'Starting...' : 'Start Crafting'}
                </Button>
              </div>
            </div>
          </TabsContent>
          
          {/* Fusion Interface */}
          <TabsContent value="fusion" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left side: Aura selection */}
              <div className="bg-[#15152C] rounded-lg border border-[#432874]/20 p-4">
                <h3 className="text-lg font-semibold mb-4">Choose Auras to Fuse</h3>
                
                <div className="mb-6">
                  <h4 className="text-md font-semibold mb-3">Primary Aura:</h4>
                  <div className="grid grid-cols-1 gap-3 max-h-[200px] overflow-y-auto">
                    {availableAuras.length === 0 ? (
                      <div className="text-center py-4 text-[#C8B8DB]/70">
                        No available auras to use as primary.
                      </div>
                    ) : (
                      availableAuras.map(aura => (
                        <div 
                          key={`primary-${aura.id}`}
                          className={`p-3 rounded border ${primaryAura?.id === aura.id 
                            ? 'bg-[#432874]/30 border-[#432874]' 
                            : 'bg-[#1A1A2E] border-[#432874]/20 hover:border-[#432874]/40 cursor-pointer'
                          }`}
                          onClick={() => setPrimaryAura(aura)}
                        >
                          <div className="flex justify-between items-center">
                            <div className="flex items-center">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                aura.element === 'fire' ? 'bg-red-500/30 text-red-300' 
                                : aura.element === 'water' ? 'bg-blue-500/30 text-blue-300'
                                : aura.element === 'earth' ? 'bg-green-500/30 text-green-300' 
                                : aura.element === 'wind' ? 'bg-cyan-500/30 text-cyan-300'
                                : aura.element === 'light' ? 'bg-yellow-500/30 text-yellow-300'
                                : 'bg-purple-500/30 text-purple-300'
                              }`}>
                                {aura.element?.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h4 className="font-medium capitalize">
                                  {aura.name || `${aura.element} Aura`}
                                </h4>
                                <Badge className='bg-purple-700/30 text-purple-300 border-purple-600/30'>
                                  Level {aura.level}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <p className="text-sm text-[#C8B8DB]/70 mt-1">
                            {Object.entries(aura.statMultipliers || {}).map(([stat, value]) => (
                              `${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${typeof value === 'number' ? value.toFixed(2) : '0.00'}x`
                            )).join(', ')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-md font-semibold mb-3">Secondary Aura:</h4>
                  <div className="grid grid-cols-1 gap-3 max-h-[200px] overflow-y-auto">
                    {availableAuras.filter(a => a.id !== primaryAura?.id).length === 0 ? (
                      <div className="text-center py-4 text-[#C8B8DB]/70">
                        No available auras to use as secondary.
                      </div>
                    ) : (
                      availableAuras
                        .filter(a => a.id !== primaryAura?.id)
                        .map(aura => (
                          <div 
                            key={`secondary-${aura.id}`}
                            className={`p-3 rounded border ${secondaryAura?.id === aura.id 
                              ? 'bg-[#432874]/30 border-[#432874]' 
                              : 'bg-[#1A1A2E] border-[#432874]/20 hover:border-[#432874]/40 cursor-pointer'
                            }`}
                            onClick={() => setSecondaryAura(aura)}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${
                                  aura.element === 'fire' ? 'bg-red-500/30 text-red-300' 
                                  : aura.element === 'water' ? 'bg-blue-500/30 text-blue-300'
                                  : aura.element === 'earth' ? 'bg-green-500/30 text-green-300' 
                                  : aura.element === 'wind' ? 'bg-cyan-500/30 text-cyan-300'
                                  : aura.element === 'light' ? 'bg-yellow-500/30 text-yellow-300'
                                  : 'bg-purple-500/30 text-purple-300'
                                }`}>
                                  {aura.element?.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <h4 className="font-medium capitalize">
                                    {aura.name || `${aura.element} Aura`}
                                  </h4>
                                  <Badge className='bg-purple-700/30 text-purple-300 border-purple-600/30'>
                                    Level {aura.level}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-[#C8B8DB]/70 mt-1">
                              {Object.entries(aura.statMultipliers || {}).map(([stat, value]) => (
                                `${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${typeof value === 'number' ? value.toFixed(2) : '0.00'}x`
                              )).join(', ')}
                            </p>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
              
              {/* Right side: Fusion summary */}
              <div className="bg-[#15152C] rounded-lg border border-[#432874]/20 p-4">
                <h3 className="text-lg font-semibold mb-4">Fusion Summary</h3>
                
                {primaryAura && secondaryAura ? (
                  <>
                    <div className="bg-[#1A1A2E] rounded-lg border border-[#432874]/30 p-4 mb-6">
                      <h4 className="text-md font-semibold mb-2">Result Preview:</h4>
                      <div className="flex items-center mb-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 ${
                          primaryAura.element === 'fire' ? 'bg-red-500/30 text-red-300' 
                          : primaryAura.element === 'water' ? 'bg-blue-500/30 text-blue-300'
                          : primaryAura.element === 'earth' ? 'bg-green-500/30 text-green-300' 
                          : primaryAura.element === 'wind' ? 'bg-cyan-500/30 text-cyan-300'
                          : primaryAura.element === 'light' ? 'bg-yellow-500/30 text-yellow-300'
                          : 'bg-purple-500/30 text-purple-300'
                        }`}>
                          {primaryAura.element?.charAt(0).toUpperCase()}
                        </div>
                        <span className="capitalize">
                          Enhanced {primaryAura.element} Aura
                        </span>
                        <Badge className="ml-2 bg-purple-700/30 text-purple-300 border-purple-600/30">
                          Level {(primaryAura.level || 1) + 1}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-[#C8B8DB]/80 mb-3">
                        Fusion will create an enhanced version of the primary aura with improved stats.
                      </p>
                      
                      <div className="text-xs text-[#C8B8DB]/70">
                        <div className="grid grid-cols-2 gap-1">
                          <div>• Primary element retained</div>
                          <div>• Level increased by 1</div>
                          <div>• Stats enhanced by ~20%</div>
                          <div>• Secondary aura consumed</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <h4 className="text-md font-semibold mb-2">Fusion Time:</h4>
                      <div className="flex items-center text-[#C8B8DB]/80">
                        <Clock className="h-4 w-4 mr-2" />
                        <span>10 minutes</span>
                      </div>
                    </div>
                    
                    <div className="mb-6">
                      <h4 className="text-md font-semibold mb-2">Forge Capacity:</h4>
                      <div className="text-sm">
                        <div className="flex justify-between mb-1">
                          <span>Active Tasks:</span>
                          <span className={activeForgingTasks.length >= maxCraftingSlots ? 'text-red-400' : 'text-green-400'}>
                            {activeForgingTasks.length} / {maxCraftingSlots}
                          </span>
                        </div>
                        <p className="text-xs text-[#C8B8DB]/60">
                          Upgrade your Forge building to increase capacity.
                        </p>
                      </div>
                    </div>
                    
                    <Button 
                      className="w-full bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
                      onClick={() => {
                        console.log("Fusion not yet implemented");
                        toast({
                          title: "Feature Coming Soon",
                          description: "Fusion functionality will be available in a future update.",
                        });
                      }}
                      disabled={true}
                    >
                      <Flame className="h-4 w-4 mr-2" />
                      Fusion Coming Soon
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8 text-[#C8B8DB]/70">
                    Select two auras to see fusion details
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default ForgeView;
