import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/lib/zustandStore';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { BuildingUpgrade } from '@shared/schema';
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
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Hammer, 
  Flame, 
  Droplet, 
  Leaf, 
  Wind, 
  Sun, 
  Moon,
  Sparkles,
  Hourglass,
  Plus,
  Repeat,
  ScrollText,
  ArrowRight 
} from 'lucide-react';
import CountdownTimer from '../common/CountdownTimer';
import type { Aura, Resource, ForgingTask } from '@shared/schema';

// Element types for Auras - limited to the four requested elements 
const elements = [
  { id: 'fire', name: 'Fire', icon: <Flame className="h-5 w-5 text-red-400" />, color: 'bg-red-700/30 text-red-400 border-red-600/30' },
  { id: 'water', name: 'Water', icon: <Droplet className="h-5 w-5 text-blue-400" />, color: 'bg-blue-700/30 text-blue-400 border-blue-600/30' },
  { id: 'earth', name: 'Earth', icon: <Leaf className="h-5 w-5 text-green-400" />, color: 'bg-green-700/30 text-green-400 border-green-600/30' },
  { id: 'wind', name: 'Wind', icon: <Wind className="h-5 w-5 text-cyan-400" />, color: 'bg-cyan-700/30 text-cyan-400 border-cyan-600/30' }
];

// Required materials for crafting
const requiredMaterials = { 'Essence': 500 };

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

  // Check if user has enough materials for crafting
  const hasEnoughMaterials = () => {
    for (const [matName, amount] of Object.entries(requiredMaterials)) {
      const resource = resources.find(r => r.name === matName);
      if (!resource || resource.quantity! < amount) {
        return false;
      }
    }
    
    return true;
  };

  // Start aura crafting
  const startCrafting = async () => {
    // Check if the player has reached their crafting slot limit
    if (activeForgingTasks.length >= maxCraftingSlots) {
      toast({
        title: "Forge Capacity Reached",
        description: `You can only have ${maxCraftingSlots} active crafting task${maxCraftingSlots > 1 ? 's' : ''} at once. Upgrade your Forge to increase capacity.`,
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedElement) {
      toast({
        title: "Incomplete Selection",
        description: "Please select an element for your Aura.",
        variant: "destructive"
      });
      return;
    }
    
    if (!hasEnoughMaterials()) {
      toast({
        title: "Insufficient Materials",
        description: "You don't have enough Essence to craft an Aura.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Submit crafting request 
      const response = await apiRequest('POST', '/api/forge/craft', {
        taskType: 'craft',
        targetElement: selectedElement,
        requiredMaterials: requiredMaterials,
        // Crafting takes 1 minute
        endTime: new Date(new Date().getTime() + 60 * 1000)
      });
      
      toast({
        title: "Crafting Started",
        description: `Your ${selectedElement} Aura is being forged.`,
      });
      
      // Reset selections
      setSelectedElement(null);
      
      // Refresh forging tasks and resources
      fetchForgingTasks();
      fetchResources();
    } catch (error) {
      console.error('Error starting crafting:', error);
      toast({
        title: "Crafting Failed",
        description: "There was an error starting the crafting process.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Start aura fusion
  const startFusion = async () => {
    if (!primaryAura || !secondaryAura) {
      toast({
        title: "Incomplete Selection",
        description: "Please select both a primary and secondary Aura for fusion.",
        variant: "destructive"
      });
      return;
    }
    
    if (primaryAura.id === secondaryAura.id) {
      toast({
        title: "Invalid Selection",
        description: "You cannot fuse an Aura with itself.",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Submit fusion request
      const response = await apiRequest('POST', '/api/forge/fusion', {
        primaryAuraId: primaryAura.id,
        secondaryAuraId: secondaryAura.id
      });
      
      toast({
        title: "Fusion Started",
        description: `Your Auras are being fused together.`,
      });
      
      // Reset selections
      setPrimaryAura(null);
      setSecondaryAura(null);
      
      // Refresh forging tasks and auras
      fetchForgingTasks();
      fetchAuras();
    } catch (error) {
      console.error('Error starting fusion:', error);
      toast({
        title: "Fusion Failed",
        description: "There was an error starting the fusion process.",
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
      const res = await apiRequest('POST', `/api/forge/complete/${taskId}`, undefined);
      const data = await res.json();
      
      toast({
        title: `${data.aura.taskType === 'craft' ? 'Crafting' : 'Fusion'} Complete!`,
        description: `Successfully created a new Level ${data.aura.level} ${data.aura.element} Aura.`,
      });
      
      // Refresh forging tasks and auras
      fetchForgingTasks();
      fetchAuras();
    } catch (error) {
      console.error('Error completing forging task:', error);
      toast({
        title: "Error",
        description: "Failed to complete forging task.",
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
              const startTime = new Date(task.startTime).getTime();
              const endTime = new Date(task.endTime).getTime();
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
                        <CardTitle className="text-[#FF9D00] font-cinzel">
                          {task.taskType === 'craft'
                            ? `Crafting ${task.targetElement} Aura`
                            : 'Aura Fusion'
                          }
                        </CardTitle>
                        <CardDescription>
                          {task.taskType === 'craft'
                            ? 'Basic Aura'
                            : 'Enhancing Aura Level'
                          }
                        </CardDescription>
                      </div>
                      <Badge className="bg-[#FF9D00]/20 text-[#FF9D00] border-[#FF9D00]/30">
                        {isComplete ? 'Complete' : 'In Progress'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span>Progress</span>
                        <span>{!isComplete ? `${Math.round(progress)}%` : '100%'}</span>
                      </div>
                      <Progress value={progress} className="h-2 bg-[#1F1D36] border-[#432874]/20" />
                    </div>
                    
                    {!isComplete && (
                      <div className="text-sm text-[#C8B8DB]/70 flex items-center">
                        <Hourglass className="h-4 w-4 mr-1" />
                        <span>
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
              <Repeat className="h-4 w-4 mr-2" />
              Aura Fusion
            </TabsTrigger>
          </TabsList>
          
          {/* Craft Aura Tab */}
          <TabsContent value="craft" className="mt-0">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              <motion.div variants={item}>
                <h3 className="text-lg font-cinzel font-semibold mb-3">Select Element</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                  {elements.map(element => (
                    <div
                      key={element.id}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg border cursor-pointer transition-all ${
                        selectedElement === element.id
                          ? `${element.color.split(' ')[0]} border-${element.color.split(' ')[2]}`
                          : 'bg-[#1F1D36]/50 border-[#432874]/30 hover:bg-[#432874]/20'
                      }`}
                      onClick={() => setSelectedElement(element.id)}
                    >
                      <div className="h-10 w-10 rounded-full flex items-center justify-center mb-2">
                        {element.icon}
                      </div>
                      <span className={selectedElement === element.id ? element.color.split(' ')[1] : 'text-[#C8B8DB]'}>
                        {element.name}
                      </span>
                    </div>
                  ))}
                </div>
              </motion.div>
              
              <motion.div variants={item}>
                <h3 className="text-lg font-cinzel font-semibold mb-3">Required Materials</h3>
                <div className="bg-[#1F1D36]/50 border border-[#432874]/30 rounded-lg p-4">
                  <div className="text-sm">
                    <h4 className="font-semibold mb-2">Materials for Crafting:</h4>
                    <div className="space-y-1">
                      {Object.entries(requiredMaterials).map(([mat, amount]) => {
                        const resource = resources.find(r => r.name === mat);
                        const hasEnough = resource && resource.quantity! >= amount;
                        
                        return (
                          <div key={mat} className="flex justify-between">
                            <span>{mat}</span>
                            <span className={hasEnough ? 'text-green-400' : 'text-red-400'}>
                              {resource ? resource.quantity : 0}/{amount}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
              
              <motion.div variants={item} className="pt-4 border-t border-[#432874]/30">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-cinzel font-semibold">Craft Summary</h3>
                    {selectedElement ? (
                      <p className="text-sm text-[#C8B8DB]/80">
                        Creating a {selectedElement} Aura (1 minute)
                      </p>
                    ) : (
                      <p className="text-sm text-[#C8B8DB]/80">
                        Select an element to craft a new Aura
                      </p>
                    )}
                  </div>
                  
                  <Button
                    className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
                    onClick={startCrafting}
                    disabled={isSubmitting || !selectedElement || !hasEnoughMaterials()}
                  >
                    <Hammer className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Starting...' : 'Start Crafting'}
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          </TabsContent>
          
          {/* Aura Fusion Tab */}
          <TabsContent value="fusion" className="mt-0">
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              {availableAuras.length < 2 ? (
                <motion.div 
                  variants={item}
                  className="bg-[#432874]/20 p-6 rounded-lg text-center"
                >
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-[#FF9D00]/70" />
                  <h3 className="text-lg font-cinzel font-semibold mb-2">Not Enough Auras for Fusion</h3>
                  <p className="text-[#C8B8DB]/80 mb-4">
                    You need at least two Auras to perform fusion. Craft more Auras or wait for any active fusions to complete.
                  </p>
                  <Button
                    className="bg-[#432874] hover:bg-[#432874]/80"
                    onClick={() => setSelectedTab('craft')}
                  >
                    Craft New Auras
                  </Button>
                </motion.div>
              ) : (
                <>
                  <motion.div variants={item}>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Primary Aura Selection */}
                      <div>
                        <h3 className="text-lg font-cinzel font-semibold mb-3">Select Primary Aura</h3>
                        <div className="bg-[#1F1D36]/50 border border-[#432874]/30 rounded-lg p-4">
                          {primaryAura ? (
                            <div className="flex items-start">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex-shrink-0"></div>
                              <div className="ml-3 flex-1">
                                <div className="flex justify-between">
                                  <h4 className="font-semibold">
                                    {primaryAura.element} Aura (Level {primaryAura.level})
                                  </h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[#C8B8DB]/70 hover:text-[#C8B8DB] hover:bg-[#432874]/20"
                                    onClick={() => setPrimaryAura(null)}
                                  >
                                    Change
                                  </Button>
                                </div>
                                <p className="text-sm text-[#C8B8DB]/70 mt-1">
                                  {primaryAura.rarity} • {Object.entries(primaryAura.statMultipliers || {}).map(([stat, value]) => (
                                    `${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${typeof value === 'number' ? value.toFixed(2) : '0.00'}x`
                                  )).join(', ')}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" className="w-full bg-[#432874]/20 border-[#432874]/50 hover:bg-[#432874]/30">
                                  <Plus className="h-4 w-4 mr-2" />
                                  Select Primary Aura
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB]">
                                <DialogHeader>
                                  <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">
                                    Select Primary Aura
                                  </DialogTitle>
                                </DialogHeader>
                                
                                <div className="py-4 max-h-[60vh] overflow-y-auto">
                                  <div className="grid gap-2">
                                    {availableAuras.map(aura => (
                                      <div
                                        key={aura.id}
                                        className="flex items-center p-3 rounded-lg border border-[#432874]/30 bg-[#1F1D36]/50 hover:bg-[#432874]/20 cursor-pointer"
                                        onClick={() => {
                                          setPrimaryAura(aura);
                                          // If secondary is the same, clear it
                                          if (secondaryAura && secondaryAura.id === aura.id) {
                                            setSecondaryAura(null);
                                          }
                                          document.body.click(); // Close dialog
                                        }}
                                      >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex-shrink-0"></div>
                                        <div className="ml-3 flex-1">
                                          <div className="flex justify-between">
                                            <h4 className="font-semibold">
                                              {aura.element} Aura
                                            </h4>
                                            <Badge className={
                                              aura.rarity === 'common' ? 'bg-slate-700/30 text-slate-300 border-slate-600/30' :
                                              aura.rarity === 'rare' ? 'bg-blue-700/30 text-blue-300 border-blue-600/30' :
                                              aura.rarity === 'epic' ? 'bg-purple-700/30 text-purple-300 border-purple-600/30' :
                                              'bg-yellow-700/30 text-yellow-300 border-yellow-600/30'
                                            }>
                                              Level {aura.level}
                                            </Badge>
                                          </div>
                                          <p className="text-sm text-[#C8B8DB]/70 mt-1">
                                            {aura.rarity} • {Object.entries(aura.statMultipliers || {}).map(([stat, value]) => (
                                              `${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? value.toFixed(2) : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00"}x`
                                            )).join(', ')}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                      
                      {/* Secondary Aura Selection */}
                      <div>
                        <h3 className="text-lg font-cinzel font-semibold mb-3">Select Secondary Aura</h3>
                        <div className="bg-[#1F1D36]/50 border border-[#432874]/30 rounded-lg p-4">
                          {secondaryAura ? (
                            <div className="flex items-start">
                              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex-shrink-0"></div>
                              <div className="ml-3 flex-1">
                                <div className="flex justify-between">
                                  <h4 className="font-semibold">
                                    {secondaryAura.element} Aura (Level {secondaryAura.level})
                                  </h4>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[#C8B8DB]/70 hover:text-[#C8B8DB] hover:bg-[#432874]/20"
                                    onClick={() => setSecondaryAura(null)}
                                  >
                                    Change
                                  </Button>
                                </div>
                                <p className="text-sm text-[#C8B8DB]/70 mt-1">
                                  {secondaryAura.rarity} • {Object.entries(secondaryAura.statMultipliers || {}).map(([stat, value]) => (
                                    `${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? value.toFixed(2) : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00"}x`
                                  )).join(', ')}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" className="w-full bg-[#432874]/20 border-[#432874]/50 hover:bg-[#432874]/30">
                                  <Plus className="h-4 w-4 mr-2" />
                                  Select Secondary Aura
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB]">
                                <DialogHeader>
                                  <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">
                                    Select Secondary Aura
                                  </DialogTitle>
                                </DialogHeader>
                                
                                <div className="py-4 max-h-[60vh] overflow-y-auto">
                                  <div className="grid gap-2">
                                    {availableAuras.filter(aura => !primaryAura || aura.id !== primaryAura.id).map(aura => (
                                      <div
                                        key={aura.id}
                                        className="flex items-center p-3 rounded-lg border border-[#432874]/30 bg-[#1F1D36]/50 hover:bg-[#432874]/20 cursor-pointer"
                                        onClick={() => {
                                          setSecondaryAura(aura);
                                          document.body.click(); // Close dialog
                                        }}
                                      >
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex-shrink-0"></div>
                                        <div className="ml-3 flex-1">
                                          <div className="flex justify-between">
                                            <h4 className="font-semibold">
                                              {aura.element} Aura
                                            </h4>
                                            <Badge className={
                                              aura.rarity === 'common' ? 'bg-slate-700/30 text-slate-300 border-slate-600/30' :
                                              aura.rarity === 'rare' ? 'bg-blue-700/30 text-blue-300 border-blue-600/30' :
                                              aura.rarity === 'epic' ? 'bg-purple-700/30 text-purple-300 border-purple-600/30' :
                                              'bg-yellow-700/30 text-yellow-300 border-yellow-600/30'
                                            }>
                                              Level {aura.level}
                                            </Badge>
                                          </div>
                                          <p className="text-sm text-[#C8B8DB]/70 mt-1">
                                            {aura.rarity} • {Object.entries(aura.statMultipliers || {}).map(([stat, value]) => (
                                              `${stat.charAt(0).toUpperCase() + stat.slice(1)}: ${typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? value.toFixed(2) : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00"}x`
                                            )).join(', ')}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                  
                  {primaryAura && secondaryAura && (
                    <motion.div 
                      variants={item} 
                      className="bg-[#432874]/20 p-4 rounded-lg"
                    >
                      <h3 className="text-lg font-cinzel font-semibold mb-3">Fusion Result</h3>
                      <div className="flex items-center justify-center mb-4">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500"></div>
                          <span className="mt-2 text-sm">Level {primaryAura.level}</span>
                        </div>
                        <ArrowRight className="mx-6 text-[#FF9D00]" />
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 relative">
                            <Sparkles className="absolute -top-2 -right-2 text-[#FF9D00]" />
                          </div>
                          <span className="mt-2 text-sm">Level {Math.min(primaryAura.level || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 || 1 + 1, 5)}</span>
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span>Enhanced {primaryAura.element} Aura</span>
                          <span className="text-[#FF9D00]">+20% Base Stats</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Skill Transfer Chance</span>
                          <span className="text-[#00B9AE]">30%</span>
                        </div>
                      </div>
                      
                      <div className="bg-[#1F1D36]/50 p-3 rounded-md text-sm text-[#C8B8DB]/80 mb-4">
                        <p className="mb-2">
                          <span className="text-[#FF9D00]">WARNING:</span> Fusion will consume both Auras, creating a new enhanced version of the Primary Aura. The Secondary Aura will be permanently lost.
                        </p>
                        <p>
                          Fusion has a 30% chance to transfer one random skill from the Secondary Aura to the result.
                        </p>
                      </div>
                      
                      <Button
                        className="w-full bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
                        onClick={startFusion}
                        disabled={isSubmitting}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {isSubmitting ? 'Starting Fusion...' : 'Start Fusion'}
                      </Button>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Aura Collection */}
      <div className="mt-8">
        <h2 className="text-xl font-cinzel font-bold mb-4">Your Aura Collection ({availableAuras.length})</h2>
        {availableAuras.length === 0 ? (
          <div className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl p-8 text-center">
            <Sparkles className="h-12 w-12 mx-auto mb-4 text-[#C8B8DB]/50" />
            <p className="text-[#C8B8DB]/80 mb-4">
              You don't have any auras yet. Craft your first aura to get started!
            </p>
            <Button 
              className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
              onClick={() => setSelectedTab('craft')}
            >
              <Hammer className="h-4 w-4 mr-2" />
              Craft Your First Aura
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {availableAuras.map(aura => {
              const elementIcon = elements.find(e => e.id === aura.element.toLowerCase())?.icon || null;
              
              return (
                <motion.div
                  key={aura.id}
                  className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden"
                  whileHover={{ y: -5, boxShadow: '0 5px 20px rgba(67, 40, 116, 0.3)' }}
                >
                  <div className="p-4">
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center">
                          {elementIcon}
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-[#1A1A2E] rounded-full p-0.5 border border-[#432874]">
                          <div className="bg-[#432874] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                            {aura.level}
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="font-cinzel font-bold text-lg text-[#C8B8DB]">
                          {aura.element} Aura
                        </h3>
                        <Badge className={
                          aura.rarity === 'common' ? 'bg-slate-700/30 text-slate-300 border-slate-600/30' :
                          aura.rarity === 'rare' ? 'bg-blue-700/30 text-blue-300 border-blue-600/30' :
                          aura.rarity === 'epic' ? 'bg-purple-700/30 text-purple-300 border-purple-600/30' :
                          'bg-yellow-700/30 text-yellow-300 border-yellow-600/30'
                        }>
                          {aura.rarity}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="mt-4 space-y-1.5 text-xs">
                      {Object.entries(aura.statMultipliers).map(([stat, value]) => (
                        <div key={stat} className="flex justify-between">
                          <span className="capitalize">{stat} Multiplier</span>
                          <span className="text-[#00B9AE]">x{typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? typeof value === "number" ? value.toFixed(2) : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00" : "0.00"}</span>
                        </div>
                      ))}
                    </div>
                    
                    {aura.skills && aura.skills.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-[#432874]/30">
                        <h4 className="text-xs font-semibold mb-1.5">Skills:</h4>
                        <div className="space-y-1">
                          {aura.skills.map((skill, idx) => (
                            <div key={idx} className="text-xs flex items-start">
                              <Sparkles className="h-3 w-3 mr-1 mt-0.5 text-[#FF9D00]" />
                              <span>{skill.name || skill}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-4 pt-3 border-t border-[#432874]/30">
                      {aura.equippedByCharacterId ? (
                        <div className="text-xs text-[#C8B8DB]/60 flex items-center">
                          <Sparkles className="h-3 w-3 mr-1" />
                          <span>Equipped by a character</span>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-7 bg-transparent border-[#432874]/50 hover:bg-[#432874]/20"
                            onClick={() => setSelectedTab('fusion')}
                          >
                            <Repeat className="h-3 w-3 mr-1" /> Use in Fusion
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default ForgeView;
