import { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/zustandStore';
import { useDiscordAuth } from '@/lib/discordAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Star, 
  Sparkles, 
  Swords, 
  Zap, 
  Shield, 
  Flame,
  Wind,
  Droplets,
  Mountain,
  Activity,
  BrainCircuit,
  Lightbulb
} from 'lucide-react';

const CollectionsView = () => {
  const [selectedTab, setSelectedTab] = useState('collections');
  const gameStore = useGameStore();
  const { user } = useDiscordAuth();
  const { toast } = useToast();
  
  // Mock account power calculation
  const accountPower = 8750; // This would be calculated based on characters, auras and buildings
  const skillPoints = Math.floor(accountPower / 1000);
  
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

  // Mock perks data (for skill tree)
  const perks = [
    {
      id: 1,
      name: "Essence Harvester",
      description: "Increases Essence gain by 10%",
      level: 2,
      maxLevel: 5,
      icon: <Zap className="h-8 w-8 text-[#4CAF50]" />,
      effect: "+10% Essence per level",
      cost: "1 Skill Point",
      position: { x: 1, y: 1 }
    },
    {
      id: 2,
      name: "Combat Specialist",
      description: "Increases all character stats by 5%",
      level: 1,
      maxLevel: 5,
      icon: <Swords className="h-8 w-8 text-[#DC143C]" />,
      effect: "+5% Character Stats per level",
      cost: "1 Skill Point",
      position: { x: 2, y: 1 }
    },
    {
      id: 3,
      name: "Forge Master",
      description: "Reduces Aura forging time by 10%",
      level: 0,
      maxLevel: 3,
      icon: <Flame className="h-8 w-8 text-[#FF9D00]" />,
      effect: "-10% Forging Time per level",
      cost: "1 Skill Point",
      position: { x: 3, y: 1 }
    },
    {
      id: 4,
      name: "Resilient Mind",
      description: "Increases Focus stat by 15%",
      level: 0,
      maxLevel: 3,
      icon: <BrainCircuit className="h-8 w-8 text-[#9C27B0]" />,
      effect: "+15% Focus per level",
      cost: "1 Skill Point",
      position: { x: 2, y: 2 }
    },
    {
      id: 5,
      name: "Vital Energies",
      description: "Increases Vitality stat by 15%",
      level: 0,
      maxLevel: 3,
      icon: <Activity className="h-8 w-8 text-[#F44336]" />,
      effect: "+15% Vitality per level",
      cost: "1 Skill Point",
      position: { x: 1, y: 2 }
    },
    {
      id: 6,
      name: "Strategic Mind",
      description: "Increases Defense stat by 15%",
      level: 0,
      maxLevel: 3,
      icon: <Shield className="h-8 w-8 text-[#2196F3]" />,
      effect: "+15% Defense per level",
      cost: "1 Skill Point",
      position: { x: 3, y: 2 }
    },
    {
      id: 7,
      name: "Enlightened Spirit",
      description: "Increases all resource gathering by 20%",
      level: 0,
      maxLevel: 2,
      icon: <Lightbulb className="h-8 w-8 text-[#FFD700]" />,
      effect: "+20% Resource Gathering per level",
      cost: "2 Skill Points",
      position: { x: 2, y: 3 }
    }
  ];

  // Mock aura collection data
  const auraCollection = [
    // Basic Collection - Fire, Water, Earth, Wind
    {
      id: 1,
      type: "Fire",
      discovered: true,
      icon: <Flame className="h-12 w-12 text-[#FF4500]" />,
      description: "Fiery auras enhance attack power and focus.",
      unlockMethod: "Automatically unlocked",
      collection: "basic"
    },
    {
      id: 2,
      type: "Water",
      discovered: true,
      icon: <Droplets className="h-12 w-12 text-[#1E90FF]" />,
      description: "Water auras enhance defense and resilience.",
      unlockMethod: "Automatically unlocked",
      collection: "basic"
    },
    {
      id: 3,
      type: "Earth",
      discovered: true,
      icon: <Mountain className="h-12 w-12 text-[#8B4513]" />,
      description: "Earth auras enhance vitality and defense.",
      unlockMethod: "Automatically unlocked",
      collection: "basic"
    },
    {
      id: 4,
      type: "Wind",
      discovered: true,
      icon: <Wind className="h-12 w-12 text-[#32CD32]" />,
      description: "Wind auras enhance speed and accuracy.",
      unlockMethod: "Automatically unlocked",
      collection: "basic"
    },
    
    // Rare Collection - Mystery Auras
    {
      id: 5,
      type: "Aura of Growth",
      discovered: false,
      icon: <Sparkles className="h-12 w-12 text-[#9C27B0]" />,
      description: "A mysterious aura that enhances growth and resource collection. 'From earth and sky, abundance flows, when patient hands plant what they know.'",
      unlockMethod: "Complete 20 farming tasks with Level 5+ Characters",
      collection: "rare"
    },
    {
      id: 6,
      type: "Wrath of Nature",
      discovered: false,
      icon: <Activity className="h-12 w-12 text-[#8BC34A]" />,
      description: "A powerful nature-based aura with devastating effects. 'When mountains tremble and waters part, nature's fury finds its mark.'",
      unlockMethod: "Clear 10 Elite Dungeons with Earth Aura-equipped Characters",
      collection: "rare"
    },
    {
      id: 7,
      type: "Ethereal Whisper",
      discovered: false,
      icon: <BrainCircuit className="h-12 w-12 text-[#7B68EE]" />,
      description: "A mystical aura that enhances magical abilities. 'Secrets whispered on ancient winds, heard only by the enlightened mind.'",
      unlockMethod: "Collect all basic elemental auras and reach Account Power 5000+",
      collection: "rare"
    }
  ];

  // Mock titles data
  const titles = [
    {
      id: 1,
      name: "The Collector",
      description: "Collect 50 unique items",
      progress: 70,
      icon: <Star className="h-8 w-8 text-[#FFD700]" />,
      requirements: "50/50 unique items collected",
      status: "Unlocked"
    },
    {
      id: 2,
      name: "Dungeon Conqueror",
      description: "Complete all legendary dungeons",
      progress: 25,
      icon: <Swords className="h-8 w-8 text-[#DC143C]" />,
      requirements: "2/8 legendary dungeons completed",
      status: "Locked"
    },
    {
      id: 3,
      name: "Forge Grandmaster",
      description: "Create 10 legendary Auras",
      progress: 40,
      icon: <Flame className="h-8 w-8 text-[#FF9D00]" />,
      requirements: "4/10 legendary Auras created",
      status: "Locked"
    }
  ];

  const handleUpgradePerk = (perkId: number) => {
    // API call to upgrade a perk would go here
    toast({
      title: "Skill Allocated",
      description: "Your account-wide bonus has been increased.",
    });
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Collections</h1>
        <p className="text-[#C8B8DB]/80">
          Discover elemental auras, unlock account-wide bonuses, and earn exclusive titles.
        </p>
      </div>
      
      {/* Account Power Display */}
      <div className="mb-8 bg-[#1A1A2E] border border-[#432874]/30 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-cinzel font-bold text-[#FF9D00]">Account Power</h2>
          <div className="bg-[#432874]/30 px-4 py-2 rounded-lg">
            <span className="text-2xl font-bold text-[#FF9D00]">{accountPower}</span>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-2">
          <span className="text-[#C8B8DB]/80">Available Skill Points</span>
          <span className="text-[#00B9AE] font-semibold">{skillPoints}</span>
        </div>
        
        <div className="h-2 bg-[#1F1D36] rounded-full overflow-hidden mb-4">
          <div 
            className="h-full bg-[#FF9D00]" 
            style={{ width: `${((accountPower % 1000) / 1000) * 100}%` }}
          ></div>
        </div>
        
        <p className="text-[#C8B8DB]/80 text-sm">
          Account Power combines the total stats of all Characters with their Aura Stat Multipliers plus 100 points for each building Level. Earn 1 Skill Point for every 1,000 Account Power.
        </p>
      </div>
      
      {/* Collection Tabs */}
      <Tabs defaultValue="collections" value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="bg-[#432874]/20 mb-6">
          <TabsTrigger value="collections" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <Star className="h-4 w-4 mr-2" />
            Collections
          </TabsTrigger>
          <TabsTrigger value="perks" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <Sparkles className="h-4 w-4 mr-2" />
            Account Perks
          </TabsTrigger>
          <TabsTrigger value="titles" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <Shield className="h-4 w-4 mr-2" />
            Titles
          </TabsTrigger>
        </TabsList>
        
        {/* Collections Tab */}
        <TabsContent value="collections">
          <div className="mb-6">
            <h3 className="text-xl font-cinzel font-bold text-[#FF9D00] mb-4">Aura Collection</h3>
            <p className="text-[#C8B8DB]/80 mb-6">
              Discover and collect elemental auras to enhance your power and unlock special abilities.
            </p>
          </div>
          
          {/* Basic Collection Section */}
          <div className="mb-10">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-cinzel font-bold text-[#FF9D00]">Basic Collection</h4>
              
              <Button 
                className="bg-[#FFD700]/20 hover:bg-[#FFD700]/30 text-[#FFD700] border border-[#FFD700]/30"
                size="sm"
              >
                <Star className="h-4 w-4 mr-2" />
                Claim Reward
              </Button>
            </div>
            
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-6 md:grid-cols-2"
            >
              {auraCollection.filter(aura => aura.collection === "basic").map(aura => (
                <motion.div
                  key={aura.id}
                  variants={item}
                  className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden"
                >
                  <div className="flex items-stretch">
                    <div className="bg-[#1F1D36] p-6 flex items-center justify-center">
                      <div className="bg-[#432874]/30 p-4 rounded-full">
                        {aura.icon}
                      </div>
                    </div>
                    
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-cinzel font-bold text-[#FF9D00]">{aura.type} Aura</h4>
                        <Badge className={`${aura.discovered ? 'bg-[#432874]/30 text-[#C8B8DB]' : 'bg-[#FF9D00]/30 text-[#FF9D00]'} border-[#432874]/50`}>
                          {aura.discovered ? 'Discovered' : 'Locked'}
                        </Badge>
                      </div>
                      
                      <p className="text-[#C8B8DB]/80 mb-4 text-sm">
                        {aura.description}
                      </p>
                      
                      {aura.discovered && (
                        <div className="bg-[#432874]/20 p-3 rounded-lg">
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-[#FFD700] mr-2 flex-shrink-0" />
                            <p className="text-sm text-[#C8B8DB]/90">
                              Collection Reward: Collect all 4 elemental auras to earn 5 Basic Kleos Shards
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
          
          {/* Rare Collection Section */}
          <div>
            <h4 className="text-lg font-cinzel font-bold text-[#FF9D00] mb-4">Rare Collection</h4>
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-6 md:grid-cols-2"
            >
              {auraCollection.filter(aura => aura.collection === "rare").map(aura => (
                <motion.div
                  key={aura.id}
                  variants={item}
                  className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden"
                >
                  <div className="flex items-stretch">
                    <div className="bg-[#1F1D36] p-6 flex items-center justify-center">
                      <div className="bg-[#432874]/30 p-4 rounded-full">
                        {aura.icon}
                      </div>
                    </div>
                    
                    <div className="p-6 flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="text-lg font-cinzel font-bold text-[#FF9D00]">
                          {aura.discovered ? `${aura.type} Aura` : "Mystery Aura"}
                        </h4>
                        <Badge className={`${aura.discovered ? 'bg-[#432874]/30 text-[#C8B8DB]' : 'bg-[#FF9D00]/30 text-[#FF9D00]'} border-[#432874]/50`}>
                          {aura.discovered ? 'Discovered' : 'Locked'}
                        </Badge>
                      </div>
                      
                      <p className="text-[#C8B8DB]/80 mb-4 text-sm">
                        {aura.discovered 
                          ? aura.description 
                          : aura.description.match(/'([^']+)'/)?.[1] + "..." || "A mysterious aura waiting to be discovered..."}
                      </p>
                      
                      <div className="bg-[#432874]/20 p-3 rounded-lg">
                        <div className="flex items-center">
                          {aura.discovered ? (
                            <>
                              <Star className="h-4 w-4 text-[#FFD700] mr-2 flex-shrink-0" />
                              <p className="text-sm text-[#C8B8DB]/90">
                                Special Aura with unique abilities
                              </p>
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 text-[#FF9D00] mr-2 flex-shrink-0" />
                              <p className="text-sm text-[#C8B8DB]/90">
                                Unlock Method: {aura.unlockMethod}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </TabsContent>
        
        {/* Account Perks Tab - Skill Tree */}
        <TabsContent value="perks">
          <div className="mb-6">
            <h3 className="text-xl font-cinzel font-bold text-[#FF9D00] mb-2">Account Perks</h3>
            <p className="text-[#C8B8DB]/80 mb-2">
              Allocate your Skill Points to enhance your account-wide abilities.
            </p>
            <div className="flex justify-between items-center bg-[#1F1D36] p-3 rounded-lg">
              <span className="text-[#C8B8DB]">Available Skill Points:</span>
              <span className="text-[#00B9AE] font-bold">{skillPoints}</span>
            </div>
          </div>
          
          {/* Skill Tree Grid */}
          <div className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl p-6 mb-6">
            <div className="relative" style={{ minHeight: '500px' }}>
              {/* Skill connections (lines) */}
              <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0 }}>
                {/* Tier 1 to Tier 2 connections */}
                <line x1="25%" y1="25%" x2="25%" y2="50%" stroke="#432874" strokeWidth="2" />
                <line x1="50%" y1="25%" x2="25%" y2="50%" stroke="#432874" strokeWidth="2" />
                <line x1="50%" y1="25%" x2="50%" y2="50%" stroke="#432874" strokeWidth="2" />
                <line x1="50%" y1="25%" x2="75%" y2="50%" stroke="#432874" strokeWidth="2" />
                <line x1="75%" y1="25%" x2="75%" y2="50%" stroke="#432874" strokeWidth="2" />
                
                {/* Tier 2 to Tier 3 connections */}
                <line x1="25%" y1="50%" x2="50%" y2="75%" stroke="#432874" strokeWidth="2" />
                <line x1="50%" y1="50%" x2="50%" y2="75%" stroke="#432874" strokeWidth="2" />
                <line x1="75%" y1="50%" x2="50%" y2="75%" stroke="#432874" strokeWidth="2" />
              </svg>
              
              {/* Skill Nodes */}
              <div className="grid grid-rows-3 gap-8" style={{ position: 'relative', zIndex: 1 }}>
                {/* Row 1 */}
                <div className="flex justify-around">
                  {perks.filter(p => p.position.y === 1).map(perk => (
                    <motion.div
                      key={perk.id}
                      whileHover={{ scale: 1.05 }}
                      className="bg-[#1F1D36] border border-[#432874]/50 rounded-xl p-4 shadow-lg w-64"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <div className="bg-[#432874]/30 p-2 rounded-full">
                            {perk.icon}
                          </div>
                          <div className="ml-3">
                            <h4 className="text-md font-cinzel font-semibold text-[#FF9D00]">{perk.name}</h4>
                            <p className="text-xs text-[#C8B8DB]/70">{perk.description}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#C8B8DB]/80">Level</span>
                          <span className="text-[#FF9D00]">{perk.level}/{perk.maxLevel}</span>
                        </div>
                        <div className="h-1.5 bg-[#1A1A2E] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#FF9D00]" 
                            style={{ width: `${(perk.level / perk.maxLevel) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        {perk.level < perk.maxLevel ? (
                          <Button
                            size="sm"
                            className="w-full bg-[#432874] hover:bg-[#432874]/80 text-xs"
                            onClick={() => handleUpgradePerk(perk.id)}
                            disabled={skillPoints < 1}
                          >
                            <Star className="h-3 w-3 mr-1" />
                            Upgrade ({perk.cost})
                          </Button>
                        ) : (
                          <div className="w-full flex items-center justify-center bg-[#00B9AE]/20 py-1.5 rounded-lg text-xs text-[#00B9AE]">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Maximum Level
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {/* Row 2 */}
                <div className="flex justify-around">
                  {perks.filter(p => p.position.y === 2).map(perk => (
                    <motion.div
                      key={perk.id}
                      whileHover={{ scale: 1.05 }}
                      className="bg-[#1F1D36] border border-[#432874]/50 rounded-xl p-4 shadow-lg w-64"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <div className="bg-[#432874]/30 p-2 rounded-full">
                            {perk.icon}
                          </div>
                          <div className="ml-3">
                            <h4 className="text-md font-cinzel font-semibold text-[#FF9D00]">{perk.name}</h4>
                            <p className="text-xs text-[#C8B8DB]/70">{perk.description}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#C8B8DB]/80">Level</span>
                          <span className="text-[#FF9D00]">{perk.level}/{perk.maxLevel}</span>
                        </div>
                        <div className="h-1.5 bg-[#1A1A2E] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#FF9D00]" 
                            style={{ width: `${(perk.level / perk.maxLevel) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        {perk.level < perk.maxLevel ? (
                          <Button
                            size="sm"
                            className="w-full bg-[#432874] hover:bg-[#432874]/80 text-xs"
                            onClick={() => handleUpgradePerk(perk.id)}
                            disabled={skillPoints < 1}
                          >
                            <Star className="h-3 w-3 mr-1" />
                            Upgrade ({perk.cost})
                          </Button>
                        ) : (
                          <div className="w-full flex items-center justify-center bg-[#00B9AE]/20 py-1.5 rounded-lg text-xs text-[#00B9AE]">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Maximum Level
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
                
                {/* Row 3 */}
                <div className="flex justify-center">
                  {perks.filter(p => p.position.y === 3).map(perk => (
                    <motion.div
                      key={perk.id}
                      whileHover={{ scale: 1.05 }}
                      className="bg-[#1F1D36] border border-[#432874]/50 rounded-xl p-4 shadow-lg w-64"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center">
                          <div className="bg-[#432874]/30 p-2 rounded-full">
                            {perk.icon}
                          </div>
                          <div className="ml-3">
                            <h4 className="text-md font-cinzel font-semibold text-[#FF9D00]">{perk.name}</h4>
                            <p className="text-xs text-[#C8B8DB]/70">{perk.description}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#C8B8DB]/80">Level</span>
                          <span className="text-[#FF9D00]">{perk.level}/{perk.maxLevel}</span>
                        </div>
                        <div className="h-1.5 bg-[#1A1A2E] rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[#FF9D00]" 
                            style={{ width: `${(perk.level / perk.maxLevel) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        {perk.level < perk.maxLevel ? (
                          <Button
                            size="sm"
                            className="w-full bg-[#432874] hover:bg-[#432874]/80 text-xs"
                            onClick={() => handleUpgradePerk(perk.id)}
                            disabled={skillPoints < 2}
                          >
                            <Star className="h-3 w-3 mr-1" />
                            Upgrade ({perk.cost})
                          </Button>
                        ) : (
                          <div className="w-full flex items-center justify-center bg-[#00B9AE]/20 py-1.5 rounded-lg text-xs text-[#00B9AE]">
                            <Sparkles className="h-3 w-3 mr-1" />
                            Maximum Level
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl p-4">
            <p className="text-[#C8B8DB]/80 text-sm">
              <span className="text-[#FF9D00] font-semibold">Note:</span> Account Perks apply to all characters and activities in your account. Higher tier perks require investing points in prerequisite perks.
            </p>
          </div>
        </TabsContent>
        
        {/* Titles Tab */}
        <TabsContent value="titles">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-1"
          >
            {titles.map(title => (
              <motion.div
                key={title.id}
                variants={item}
                className={`bg-[#1A1A2E] border ${title.status === 'Unlocked' ? 'border-[#FFD700]/50' : 'border-[#432874]/30'} rounded-xl overflow-hidden`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 flex items-center justify-center md:w-1/4 bg-[#1F1D36]">
                    <div className="bg-[#432874]/30 p-4 rounded-full">
                      {title.icon}
                    </div>
                  </div>
                  
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-cinzel font-bold text-[#FF9D00]">{title.name}</h3>
                      <Badge className={`${title.status === 'Unlocked' ? 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30' : 'bg-[#432874]/30 text-[#C8B8DB] border-[#432874]/50'}`}>
                        {title.status}
                      </Badge>
                    </div>
                    
                    <p className="text-[#C8B8DB]/80 mb-4">{title.description}</p>
                    
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-[#C8B8DB]/80">Progress</span>
                        <span className="text-[#FF9D00]">{title.progress}%</span>
                      </div>
                      <Progress 
                        value={title.progress} 
                        className="h-2 bg-[#1F1D36] border-[#432874]/20" 
                      />
                    </div>
                    
                    <div className="bg-[#432874]/20 p-3 rounded-lg">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-[#FFD700] mr-2 flex-shrink-0" />
                        <p className="text-sm text-[#C8B8DB]/90">
                          {title.requirements}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6 flex items-center justify-center md:w-1/5">
                    {title.status === 'Unlocked' ? (
                      <Button
                        className="w-full bg-[#FFD700]/20 hover:bg-[#FFD700]/30 text-[#FFD700] border border-[#FFD700]/30"
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        Equip Title
                      </Button>
                    ) : (
                      <div className="w-full text-center text-[#C8B8DB]/60">
                        <p className="text-sm">Complete requirements to unlock</p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default CollectionsView;