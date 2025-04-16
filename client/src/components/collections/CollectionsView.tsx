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
  Lightbulb,
  Lock
} from 'lucide-react';

const CollectionsView = () => {
  const [selectedTab, setSelectedTab] = useState('active-collections');
  const [collectionsSubTab, setCollectionsSubTab] = useState('active-collections');
  const [equippedTitle, setEquippedTitle] = useState<number | null>(1); // Default to first title
  
  const gameStore = useGameStore();
  const { user } = useDiscordAuth();
  const { toast } = useToast();
  
  // Mock perks data (for skill tree)
  const [perks, setPerks] = useState([
    {
      id: 1,
      name: "Essence Harvester",
      description: "Increases Essence gain by 10%",
      level: 2,
      maxLevel: 5,
      icon: <Zap className="h-8 w-8 text-[#4CAF50]" />,
      effect: "+10% Essence per level",
      cost: 1,
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
      cost: 1, 
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
      cost: 1,
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
      cost: 1,
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
      cost: 1,
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
      cost: 1,
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
      cost: 2,
      position: { x: 2, y: 3 }
    }
  ]);
  
  // Mock account power calculation
  const accountPower = 8750; // This would be calculated based on characters, auras and buildings
  const skillPoints = Math.floor(accountPower / 1000) - perks.reduce((total, perk) => total + perk.level, 0);
  
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

  // Collection Sets with Themes
  const [collectionSets, setCollectionSets] = useState([
    {
      id: 1,
      name: "Elemental Acolyte",
      description: "Master the four basic elements to gain elemental mastery",
      completed: false,
      claimed: false,
      auras: [
        {
          id: 1,
          name: "Inferno's Embrace",
          type: "Fire",
          discovered: true,
          imageUrl: "https://images.unsplash.com/photo-1519930439097-f5ed5657cb4f?w=150&h=150&fit=crop",
          icon: <Flame className="h-12 w-12 text-[#FF4500]" />,
          description: "Fiery auras enhance attack power and focus.",
          unlockMethod: "Automatically unlocked",
          element: "Fire"
        },
        {
          id: 2,
          name: "Ocean's Mercy",
          type: "Water",
          discovered: true,
          imageUrl: "https://images.unsplash.com/photo-1551525212-a1f3d3b8e242?w=150&h=150&fit=crop",
          icon: <Droplets className="h-12 w-12 text-[#1E90FF]" />,
          description: "Water auras enhance defense and resilience.",
          unlockMethod: "Automatically unlocked",
          element: "Water"
        },
        {
          id: 3,
          name: "Stoneguard's Pact",
          type: "Earth",
          discovered: false,
          imageUrl: "https://images.unsplash.com/photo-1523567353982-bd9af0d8383c?w=150&h=150&fit=crop",
          icon: <Mountain className="h-12 w-12 text-[#8B4513]" />,
          description: "Earth auras enhance vitality and defense.",
          unlockMethod: "Complete Earth Cavern Dungeon",
          element: "Earth"
        },
        {
          id: 4,
          name: "Zephyr's Whisper",
          type: "Wind",
          discovered: false,
          imageUrl: "https://images.unsplash.com/photo-1533551037358-c8f7182cdb79?w=150&h=150&fit=crop",
          icon: <Wind className="h-12 w-12 text-[#32CD32]" />,
          description: "Wind auras enhance speed and accuracy.",
          unlockMethod: "Complete Wind Temple Dungeon",
          element: "Wind"
        }
      ],
      reward: {
        name: "Elemental Harmony",
        description: "Increases all elemental damage by 15%",
        type: "Passive Skill"
      }
    },
    {
      id: 2,
      name: "Experimental Fusion",
      description: "Combine rare experimental auras to unlock advanced fusion techniques",
      completed: false,
      claimed: false,
      auras: [
        {
          id: 5,
          name: "Aura of Growth",
          type: "Plant",
          discovered: false,
          imageUrl: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=150&h=150&fit=crop",
          icon: <Sparkles className="h-12 w-12 text-[#9C27B0]" />,
          description: "A mysterious aura that enhances growth and resource collection. 'From earth and sky, abundance flows, when patient hands plant what they know.'",
          unlockMethod: "Complete 20 farming tasks with Level 5+ Characters",
          element: "Nature"
        },
        {
          id: 6,
          name: "Typhoon Aura",
          type: "Storm",
          discovered: false,
          imageUrl: "https://images.unsplash.com/photo-1610741083757-1ae88e1a17f7?w=150&h=150&fit=crop",
          icon: <Activity className="h-12 w-12 text-[#8BC34A]" />,
          description: "A powerful storm-based aura with devastating effects. 'When mountains tremble and waters part, nature's fury finds its mark.'",
          unlockMethod: "Clear 10 Elite Dungeons with Wind Aura-equipped Characters",
          element: "Wind"
        },
        {
          id: 7,
          name: "Sentinel Aura",
          type: "Guardian",
          discovered: false,
          imageUrl: "https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=150&h=150&fit=crop",
          icon: <BrainCircuit className="h-12 w-12 text-[#7B68EE]" />,
          description: "A mysterious aura that enhances protective prowess. 'In silent vigilance, guardians stand as the last line of defense.'",
          unlockMethod: "Successfully defend your base from 5 raid attacks",
          element: "Earth"
        }
      ],
      reward: {
        name: "Experimental Mastery",
        description: "Reduces aura fusion costs by 25%",
        type: "Passive Skill"
      }
    }
  ]);
  
  // Completed collections for the Claimed tab
  const [claimedCollections, setClaimedCollections] = useState([
    {
      id: 3,
      name: "Arcane Artificer",
      description: "Collect all arcane-based auras to unlock magical potential",
      completed: true,
      claimed: true,
      auras: [
        {
          id: 8,
          name: "Mana Weaver",
          discovered: true,
          imageUrl: "https://images.unsplash.com/photo-1589254065878-42c9da997008?w=150&h=150&fit=crop",
        },
        {
          id: 9,
          name: "Spellbinder",
          discovered: true,
          imageUrl: "https://images.unsplash.com/photo-1518542331925-4e91e9aa0074?w=150&h=150&fit=crop",
        },
        {
          id: 10,
          name: "Arcane Sight",
          discovered: true,
          imageUrl: "https://images.unsplash.com/photo-1629976801555-c12db8b3a330?w=150&h=150&fit=crop",
        }
      ],
      reward: {
        name: "Arcane Efficiency",
        description: "Reduces all ability cooldowns by 15%",
        type: "Passive Skill"
      },
      dateCompleted: "2025-03-12"
    }
  ]);

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
    setPerks(perks.map(perk => {
      if (perk.id === perkId && perk.level < perk.maxLevel) {
        return { ...perk, level: perk.level + 1 };
      }
      return perk;
    }));
    
    toast({
      title: "Skill Allocated",
      description: "Your account-wide bonus has been increased.",
    });
  };
  
  const handleClaimReward = (collectionId: number) => {
    // In a real implementation, this would make an API call to claim the collection reward
    // Update the collection to mark it as claimed
    setCollectionSets(prev => 
      prev.map(collection => 
        collection.id === collectionId 
          ? { ...collection, claimed: true } 
          : collection
      )
    );
    
    // Find the collection to get its reward info
    const collection = collectionSets.find(c => c.id === collectionId);
    
    // Move the claimed collection to the claimed collections list
    if (collection) {
      setClaimedCollections(prev => [
        ...prev, 
        { 
          ...collection, 
          claimed: true, 
          completed: true,
          dateCompleted: new Date().toISOString().split('T')[0]
        }
      ]);
      
      toast({
        title: `${collection.name} Reward Claimed!`,
        description: `You received the ${collection.reward.name} passive skill: ${collection.reward.description}`,
      });
    }
  };
  
  const handleEquipTitle = (titleId: number) => {
    // API call to equip a title would go here
    setEquippedTitle(titleId);
    const title = titles.find(t => t.id === titleId);
    
    toast({
      title: "Title Equipped",
      description: `You are now known as ${title?.name}.`,
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
            <h3 className="text-xl font-cinzel font-bold text-[#FF9D00] mb-4">Aura Collections</h3>
            <p className="text-[#C8B8DB]/80 mb-4">
              Discover and collect elemental auras to enhance your power and unlock special abilities.
            </p>
            
            {/* Collections Sub-Tabs */}
            <Tabs value={collectionsSubTab} onValueChange={setCollectionsSubTab} className="mt-2">
              <TabsList className="bg-[#432874]/20 mb-6">
                <TabsTrigger 
                  value="active-collections" 
                  className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]"
                >
                  <Star className="h-4 w-4 mr-2" />
                  Active Collections
                </TabsTrigger>
                <TabsTrigger 
                  value="claimed-collections" 
                  className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Claimed Collections
                </TabsTrigger>
              </TabsList>
              
              {/* Active Collections Tab */}
              <TabsContent value="active-collections">
                {collectionSets.map((collection) => (
                  <motion.div
                    key={collection.id}
                    variants={container}
                    initial="hidden"
                    animate="show"
                    className="mb-10 bg-[#1A1A2E] border border-[#432874]/30 rounded-xl p-6"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h4 className="text-xl font-cinzel font-bold text-[#FF9D00] mb-1">{collection.name}</h4>
                        <p className="text-[#C8B8DB]/80 text-sm">{collection.description}</p>
                      </div>
                      
                      {/* Check if all auras are discovered */}
                      {collection.auras.every(aura => aura.discovered) && !collection.claimed ? (
                        <Button 
                          className="bg-[#FFD700]/20 hover:bg-[#FFD700]/30 text-[#FFD700] border border-[#FFD700]/30"
                          size="sm"
                          onClick={() => handleClaimReward(collection.id)}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          Claim Reward
                        </Button>
                      ) : collection.claimed ? (
                        <Badge className="bg-[#00B9AE]/20 text-[#00B9AE]">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Reward Claimed
                        </Badge>
                      ) : (
                        <Badge className="bg-[#432874]/30 text-[#C8B8DB]/80 border border-[#432874]/50">
                          <Star className="h-4 w-4 mr-2" />
                          {collection.auras.filter(aura => aura.discovered).length}/{collection.auras.length} Collected
                        </Badge>
                      )}
                    </div>
                    
                    {/* Aura Circles */}
                    <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-6">
                      {collection.auras.map((aura) => (
                        <motion.div
                          key={aura.id}
                          variants={item}
                          className="flex flex-col items-center"
                        >
                          <div className={`relative rounded-full overflow-hidden w-24 h-24 mb-3 ${!aura.discovered ? 'filter grayscale opacity-50' : ''}`}>
                            <img 
                              src={aura.imageUrl} 
                              alt={aura.discovered ? aura.name : "Mystery Aura"} 
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E]/80 to-transparent"></div>
                            
                            {/* Show icon on the circle */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              {aura.discovered ? (
                                <div className="bg-[#432874]/40 p-2 rounded-full">
                                  {aura.icon}
                                </div>
                              ) : (
                                <div className="bg-[#1A1A2E]/60 p-2 rounded-full">
                                  <Lock className="h-8 w-8 text-[#C8B8DB]/60" />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <h5 className="text-center font-cinzel font-bold text-sm mb-1">
                            {aura.discovered ? aura.name : "???"}
                          </h5>
                          
                          <Badge className={`${aura.discovered ? 'bg-[#432874]/30 text-[#C8B8DB]' : 'bg-[#FF9D00]/30 text-[#FF9D00]'} border-[#432874]/50`}>
                            {aura.discovered ? 'Discovered' : 'Locked'}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                    
                    {/* Reward Info */}
                    <div className="bg-[#432874]/20 p-4 rounded-lg">
                      <div className="flex items-center mb-3">
                        <Sparkles className="h-5 w-5 text-[#FFD700] mr-2 flex-shrink-0" />
                        <h5 className="font-cinzel font-bold text-[#FFD700]">Collection Reward</h5>
                      </div>
                      <div className="ml-7">
                        <p className="text-sm text-[#C8B8DB] font-semibold mb-1">{collection.reward.name}</p>
                        <p className="text-xs text-[#C8B8DB]/80">{collection.reward.description}</p>
                        <p className="text-xs text-[#C8B8DB]/80 mt-1">Type: {collection.reward.type}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </TabsContent>
              
              {/* Claimed Collections Tab */}
              <TabsContent value="claimed-collections">
                {claimedCollections.length === 0 ? (
                  <div className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl p-8 text-center">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-[#C8B8DB]/50" />
                    <p className="text-[#C8B8DB]/80 mb-4">
                      You haven't claimed any collection rewards yet. Complete collection sets to earn powerful rewards!
                    </p>
                  </div>
                ) : (
                  claimedCollections.map((collection) => (
                    <motion.div
                      key={collection.id}
                      variants={container}
                      initial="hidden"
                      animate="show"
                      className="mb-10 bg-[#1A1A2E] border border-[#00B9AE]/30 rounded-xl p-6"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h4 className="text-xl font-cinzel font-bold text-[#00B9AE] mb-1">{collection.name}</h4>
                          <p className="text-[#C8B8DB]/80 text-sm">{collection.description}</p>
                        </div>
                        
                        <div className="flex items-center">
                          <Badge className="bg-[#00B9AE]/20 text-[#00B9AE] mr-3">
                            <Sparkles className="h-4 w-4 mr-2" />
                            Reward Claimed
                          </Badge>
                          
                          <div className="text-xs text-[#C8B8DB]/70">
                            Completed: {collection.dateCompleted}
                          </div>
                        </div>
                      </div>
                      
                      {/* Aura Circles */}
                      <div className="flex flex-wrap justify-center gap-6 md:gap-8 mb-6">
                        {collection.auras.map((aura) => (
                          <motion.div
                            key={aura.id}
                            variants={item}
                            className="flex flex-col items-center"
                          >
                            <div className="relative rounded-full overflow-hidden w-24 h-24 mb-3">
                              <img 
                                src={aura.imageUrl} 
                                alt={aura.name || "Aura"} 
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E]/80 to-transparent"></div>
                            </div>
                            
                            <h5 className="text-center font-cinzel font-bold text-sm mb-1">
                              {aura.name}
                            </h5>
                            
                            <Badge className="bg-[#00B9AE]/20 text-[#00B9AE] border-[#00B9AE]/30">
                              Collected
                            </Badge>
                          </motion.div>
                        ))}
                      </div>
                      
                      {/* Reward Info */}
                      <div className="bg-[#00B9AE]/10 p-4 rounded-lg">
                        <div className="flex items-center mb-3">
                          <Sparkles className="h-5 w-5 text-[#00B9AE] mr-2 flex-shrink-0" />
                          <h5 className="font-cinzel font-bold text-[#00B9AE]">Claimed Reward</h5>
                        </div>
                        <div className="ml-7">
                          <p className="text-sm text-[#C8B8DB] font-semibold mb-1">{collection.reward.name}</p>
                          <p className="text-xs text-[#C8B8DB]/80">{collection.reward.description}</p>
                          <p className="text-xs text-[#C8B8DB]/80 mt-1">Type: {collection.reward.type}</p>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </TabsContent>
            </Tabs>
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
                            disabled={skillPoints < perk.cost}
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
                            disabled={skillPoints < perk.cost}
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
                            disabled={skillPoints < perk.cost}
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
                className={`bg-[#1A1A2E] border ${
                  title.status === 'Unlocked' 
                    ? equippedTitle === title.id 
                      ? 'border-[#00B9AE]/50' 
                      : 'border-[#FFD700]/50' 
                    : 'border-[#432874]/30'
                } rounded-xl overflow-hidden`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 flex items-center justify-center md:w-1/4 bg-[#1F1D36]">
                    <div className={`${
                      equippedTitle === title.id 
                        ? 'bg-[#00B9AE]/30' 
                        : 'bg-[#432874]/30'
                    } p-4 rounded-full`}>
                      {title.icon}
                    </div>
                  </div>
                  
                  <div className="flex-1 p-6">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-cinzel font-bold text-[#FF9D00]">{title.name}</h3>
                      {equippedTitle === title.id ? (
                        <Badge className="bg-[#00B9AE]/20 text-[#00B9AE] border-[#00B9AE]/30">
                          Equipped
                        </Badge>
                      ) : (
                        <Badge className={`${title.status === 'Unlocked' ? 'bg-[#FFD700]/20 text-[#FFD700] border-[#FFD700]/30' : 'bg-[#432874]/30 text-[#C8B8DB] border-[#432874]/50'}`}>
                          {title.status}
                        </Badge>
                      )}
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
                        className={`w-full ${
                          equippedTitle === title.id
                            ? 'bg-[#00B9AE]/20 hover:bg-[#00B9AE]/30 text-[#00B9AE] border border-[#00B9AE]/30'
                            : 'bg-[#FFD700]/20 hover:bg-[#FFD700]/30 text-[#FFD700] border border-[#FFD700]/30'
                        }`}
                        disabled={equippedTitle === title.id}
                        onClick={() => handleEquipTitle(title.id)}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {equippedTitle === title.id ? 'Equipped' : 'Equip Title'}
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