import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/zustandStore';
import { useDiscordAuth } from '@/lib/discordAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, Filter, ShoppingBag, User, Sparkles, Gem, Box, Plus,
  Info, Users, Zap, ArrowUpToLine, Activity, Sword, Droplets, Shield, 
  Heart, Footprints, Eye, CircleOff, Target
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { CharacterCard } from '../characters/CharacterCard';
import type { Character, Aura, Resource } from '@shared/schema';

const InventoryView = () => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('characters');
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [showRecruitDialog, setShowRecruitDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const { 
    characters = [], 
    auras = [], 
    resources = [],
    fetchCharacters,
    fetchAuras,
    fetchResources
  } = useGameStore();
  
  // Load inventory data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchCharacters(),
        fetchAuras(),
        fetchResources()
      ]);
      setIsLoading(false);
    };
    
    loadData();
  }, [fetchCharacters, fetchAuras, fetchResources]);

  // Define character shards - now specific to each character and persistent
  const [characterShards, setCharacterShards] = useState<Array<{
    id: number,
    name: string,
    quantity: number,
    required: number,
    characterClass: string,
    characterName: string,
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary",
    avatarUrl?: string
  }>>([
    // Explicitly add all 5 Kleos shard rarities
    {
      id: 50001,
      name: "Kleos Common Shard", 
      quantity: 25,
      required: 100,
      characterClass: "Warrior",
      characterName: "Kleos",
      rarity: "common",
      avatarUrl: "/images/kleos.jpg"
    },
    {
      id: 50002,
      name: "Kleos Uncommon Shard",
      quantity: 30,
      required: 100,
      characterClass: "Warrior",
      characterName: "Kleos",
      rarity: "uncommon",
      avatarUrl: "/images/kleos.jpg"
    },
    {
      id: 50003,
      name: "Kleos Rare Shard",
      quantity: 45,
      required: 100,
      characterClass: "Warrior",
      characterName: "Kleos",
      rarity: "rare",
      avatarUrl: "/images/kleos.jpg"
    },
    {
      id: 50004,
      name: "Kleos Epic Shard",
      quantity: 102,
      required: 100,
      characterClass: "Warrior",
      characterName: "Kleos",
      rarity: "epic",
      avatarUrl: "/images/kleos.jpg"
    },
    {
      id: 50005,
      name: "Kleos Legendary Shard",
      quantity: 5,
      required: 100,
      characterClass: "Warrior", 
      characterName: "Kleos",
      rarity: "legendary",
      avatarUrl: "/images/kleos.jpg"
    }
  ]);
  
  // Generate persistent shards based on characters with localStorage persistence
  useEffect(() => {
    // We've added Kleos shards in the initial state already
    // No need to force reset localStorage
    
    // Try to load saved shards from localStorage
    const savedShards = localStorage.getItem('characterShards');
    
    if (savedShards) {
      // Use saved shards if available
      setCharacterShards(JSON.parse(savedShards));
    } else if (characters.length > 0 && characterShards.length === 0) {
      // Generate new shards if none are saved
      const rarities: Array<"common" | "uncommon" | "rare" | "epic" | "legendary"> = [
        "common", "uncommon", "rare", "epic", "legendary"
      ];
      
      const shards = characters.flatMap(character => {
        // Create one shard of each rarity for each character
        return rarities.map(rarity => ({
          id: character.id + rarities.indexOf(rarity) * 10000, // Ensure unique IDs across rarities
          name: `${character.name} ${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Shard`,
          quantity: Math.floor(Math.random() * 80) + 10, // Random quantity, but will be saved
          required: 100,
          characterClass: character.class,
          characterName: character.name,
          rarity: rarity,
          avatarUrl: character.avatarUrl
        }));
      });
      
      // Add Kleos shards for each rarity level
      const kleosShards = rarities.map((rarity, index) => ({
        id: 50000 + index, // Unique ID range for Kleos
        name: `Kleos ${rarity.charAt(0).toUpperCase() + rarity.slice(1)} Shard`,
        quantity: Math.floor(Math.random() * 25), // Random initial amount
        required: 20 + index * 20, // Increasing requirements by rarity
        characterClass: 'Legendary Hero',
        characterName: 'Kleos',
        rarity: rarity,
        avatarUrl: '/images/kleos.jpg'
      }));
      
      // Combine regular character shards with Kleos shards
      const allShards = [...shards, ...kleosShards];
      
      setCharacterShards(allShards);
      
      // Save to localStorage
      localStorage.setItem('characterShards', JSON.stringify(allShards));
    }
  }, [characters, characterShards.length]);

  // State for selected aura detail
  const [selectedAura, setSelectedAura] = useState<Aura | null>(null);
  
  // Filter functions for each tab
  const filteredCharacters = characters.filter(character => {
    const matchesSearch = character.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'active' && character.isActive) ||
      (filter === 'idle' && !character.isActive) ||
      (filter === filter && character.class.toLowerCase() === filter);
    
    return matchesSearch && matchesFilter;
  });

  const filteredAuras = auras.filter(aura => {
    const matchesSearch = aura.element.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'equipped' && aura.equippedByCharacterId) ||
      (filter === 'available' && !aura.equippedByCharacterId) ||
      (filter === filter && aura.element.toLowerCase() === filter);
    
    return matchesSearch && matchesFilter;
  });

  const filteredResources = resources.filter(resource => {
    const matchesSearch = resource.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'materials' && resource.type === 'material') ||
      (filter === 'essences' && resource.type === 'essence') ||
      (filter === 'currencies' && resource.type === 'currency');
    
    return matchesSearch && matchesFilter;
  });

  const filteredShards = characterShards.filter(shard => {
    const matchesSearch = shard.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'common' && shard.rarity === 'common') ||
      (filter === 'uncommon' && shard.rarity === 'uncommon') ||
      (filter === 'rare' && shard.rarity === 'rare') ||
      (filter === 'epic' && shard.rarity === 'epic') ||
      (filter === 'legendary' && shard.rarity === 'legendary') ||
      (filter === filter && shard.characterClass.toLowerCase() === filter);
    
    return matchesSearch && matchesFilter;
  });

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

  // Handle shard actions (collect more or summon character)
  // Handle leveling up a character
  const handleLevelUpCharacter = async (characterId: number) => {
    try {
      // Find the character
      const character = characters.find(c => c.id === characterId);
      
      if (!character) {
        throw new Error('Character not found');
      }
      
      // API call to level up character
      const response = await apiRequest('POST', `/api/characters/${characterId}/level-up`, {
        levelIncrease: 1
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to level up character');
      }
      
      // Success message
      toast({
        title: "Character Leveled Up!",
        description: `${character.name} has reached level ${character.level + 1}!`
      });
      
      // Refresh character data
      fetchCharacters();
    } catch (error: any) {
      console.error('Error leveling up character:', error);
      toast({
        title: "Level Up Failed",
        description: error.message || "Unable to level up character at this time.",
        variant: "destructive"
      });
    }
  };

  const handleShardAction = (shard: {
    id: number,
    name: string,
    quantity: number,
    required: number,
    characterClass: string,
    characterName: string,
    rarity: "common" | "uncommon" | "rare" | "epic" | "legendary",
    avatarUrl?: string
  }) => {
    if (shard.quantity >= shard.required) {
      // Find the character
      const character = characters.find(c => c.id === (shard.id % 10000)); // Remove rarity offset
      
      if (!character) {
        toast({
          title: "Error",
          description: "Character not found for these shards.",
          variant: "destructive"
        });
        return;
      }
      
      // Level up character
      toast({
        title: "Character Level Up!",
        description: `Leveling up ${character.name} using ${shard.rarity} shards!`
      });
      
      // Update shard quantity (reset to 0)
      const updatedShards = characterShards.map(s => {
        if (s.id === shard.id) {
          return { ...s, quantity: 0 };
        }
        return s;
      });
      
      // Update state and save to localStorage
      setCharacterShards(updatedShards);
      localStorage.setItem('characterShards', JSON.stringify(updatedShards));
      
      // Level up the character
      handleLevelUpCharacter(character.id);
    } else {
      // Collect more shards
      const randomAmount = Math.floor(Math.random() * 5) + 1;
      
      // Update shard quantity
      const updatedShards = characterShards.map(s => {
        if (s.id === shard.id) {
          return { ...s, quantity: s.quantity + randomAmount };
        }
        return s;
      });
      
      // Update state and save to localStorage
      setCharacterShards(updatedShards);
      localStorage.setItem('characterShards', JSON.stringify(updatedShards));
      
      toast({
        title: "Shards Collected!",
        description: `You collected ${randomAmount} ${shard.rarity} ${shard.characterName} shards!`
      });
    }
  };

  // Handle recruiting a new character
  const handleRecruitCharacter = async (characterClass?: string, type?: string) => {
    try {
      // Generate a random character for demonstration
      const randomNames = ["Eldrin", "Lyra", "Thorne", "Seraphina", "Gideon", "Isolde"];
      const randomClasses = ["Warrior", "Mage", "Rogue", "Cleric"];
      const randomAvatars = [
        "https://images.unsplash.com/photo-1577095972620-2f389ca3abcd?w=150&h=150&fit=crop",
        "https://images.unsplash.com/photo-1613477564751-fc2a7c5bbb7a?w=150&h=150&fit=crop",
        "https://images.unsplash.com/photo-1578336134673-1eef9c8c5e36?w=150&h=150&fit=crop"
      ];
      
      const newCharacter = {
        name: randomNames[Math.floor(Math.random() * randomNames.length)],
        class: characterClass || randomClasses[Math.floor(Math.random() * randomClasses.length)],
        level: 1,
        avatarUrl: randomAvatars[Math.floor(Math.random() * randomAvatars.length)],
        attack: 10 + Math.floor(Math.random() * 5),
        defense: 10 + Math.floor(Math.random() * 5),
        health: 100 + Math.floor(Math.random() * 20),
        speed: 10 + Math.floor(Math.random() * 5),
        vitality: 10 + Math.floor(Math.random() * 5),
        accuracy: 10 + Math.floor(Math.random() * 5),
        focus: 10 + Math.floor(Math.random() * 5),
        resilience: 10 + Math.floor(Math.random() * 5)
      };
      
      const response = await apiRequest('POST', '/api/characters', newCharacter);
      const data = await response.json();
      
      toast({
        title: "Character Recruited!",
        description: `${data.name} has joined your roster.`
      });
      
      fetchCharacters();
      setShowRecruitDialog(false);
    } catch (error) {
      console.error('Error recruiting character:', error);
      toast({
        title: "Recruitment Failed",
        description: "Unable to recruit a new character at this time.",
        variant: "destructive"
      });
    }
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-[#FF9D00] text-xl animate-pulse">Loading inventory data...</div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Inventory</h1>
        <p className="text-[#C8B8DB]/80">
          Manage your characters, auras, materials, resources, and character shards.
        </p>
      </div>
      
      {/* Inventory Tabs */}
      <Tabs defaultValue="characters" value={selectedTab} onValueChange={setSelectedTab} className="w-full mb-6">
        <TabsList className="bg-[#432874]/20 mb-6">
          <TabsTrigger value="characters" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <User className="h-4 w-4 mr-2" />
            Characters
          </TabsTrigger>
          <TabsTrigger value="auras" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <Sparkles className="h-4 w-4 mr-2" />
            Auras
          </TabsTrigger>
          <TabsTrigger value="materials" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <Box className="h-4 w-4 mr-2" />
            Materials
          </TabsTrigger>
          <TabsTrigger value="resources" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <Gem className="h-4 w-4 mr-2" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="shards" className="data-[state=active]:bg-[#FF9D00] data-[state=active]:text-[#1A1A2E]">
            <ShoppingBag className="h-4 w-4 mr-2" />
            Character Shards
          </TabsTrigger>
        </TabsList>
        
        {/* Search & Filter Controls */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#C8B8DB]/50 h-4 w-4" />
            <input
              type="text"
              placeholder={`Search ${selectedTab}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full bg-[#1F1D36]/80 border border-[#432874]/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#FF9D00]"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="text-[#C8B8DB]/70 h-4 w-4" />
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="bg-[#1F1D36]/80 border-[#432874]/30 focus:border-[#FF9D00] focus:ring-0 w-32">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent className="bg-[#1A1A2E] border-[#432874]/30">
                <SelectItem value="all">All</SelectItem>
                {selectedTab === 'characters' && (
                  <>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="idle">Idle</SelectItem>
                    <SelectItem value="warrior">Warrior</SelectItem>
                    <SelectItem value="mage">Mage</SelectItem>
                    <SelectItem value="rogue">Rogue</SelectItem>
                    <SelectItem value="cleric">Cleric</SelectItem>
                  </>
                )}
                {selectedTab === 'auras' && (
                  <>
                    <SelectItem value="equipped">Equipped</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="fire">Fire</SelectItem>
                    <SelectItem value="water">Water</SelectItem>
                    <SelectItem value="earth">Earth</SelectItem>
                    <SelectItem value="wind">Wind</SelectItem>
                  </>
                )}
                {selectedTab === 'materials' && (
                  <>
                    <SelectItem value="common">Common</SelectItem>
                    <SelectItem value="rare">Rare</SelectItem>
                    <SelectItem value="epic">Epic</SelectItem>
                  </>
                )}
                {selectedTab === 'resources' && (
                  <>
                    <SelectItem value="materials">Materials</SelectItem>
                    <SelectItem value="essences">Essences</SelectItem>
                    <SelectItem value="currencies">Currencies</SelectItem>
                  </>
                )}
                {selectedTab === 'shards' && (
                  <>
                    <SelectItem value="common">Basic</SelectItem>
                    <SelectItem value="uncommon">Rare</SelectItem>
                    <SelectItem value="rare">Epic</SelectItem>
                    <SelectItem value="epic">Mythic</SelectItem>
                    <SelectItem value="legendary">Legendary</SelectItem>
                    <SelectItem value="warrior">Warrior</SelectItem>
                    <SelectItem value="mage">Mage</SelectItem>
                    <SelectItem value="rogue">Rogue</SelectItem>
                    <SelectItem value="cleric">Cleric</SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {selectedTab === 'characters' && (
            <Dialog open={showRecruitDialog} onOpenChange={setShowRecruitDialog}>
              <DialogTrigger asChild>
                <Button className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]">
                  <Plus className="h-4 w-4 mr-2" /> Recruit
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB]">
                <DialogHeader>
                  <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">Recruit a New Character</DialogTitle>
                </DialogHeader>
                
                <div className="py-4">
                  <div className="bg-[#432874]/20 rounded-lg p-4 text-center mb-4">
                    <img
                      src="https://images.unsplash.com/photo-1578336134673-1eef9c8c5e36?w=250&h=250&fit=crop"
                      alt="New Character"
                      className="w-20 h-20 rounded-full border-2 border-[#FF9D00] mx-auto mb-2"
                    />
                    <p className="text-[#C8B8DB]">
                      Recruiting a new character costs <span className="text-[#FFD700] font-bold">500</span> Rogue Credits.
                    </p>
                  </div>
                  
                  <Button 
                    className="w-full bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
                    onClick={() => handleRecruitCharacter()}
                  >
                    Recruit Random Character
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        
        {/* Characters Tab */}
        <TabsContent value="characters">
          {filteredCharacters.length === 0 ? (
            <div className="bg-[#1A1A2E] rounded-xl p-8 text-center">
              <p className="text-[#C8B8DB]/80 mb-4">
                {searchTerm 
                  ? `No characters found matching "${searchTerm}"` 
                  : "You don't have any characters yet."}
              </p>
              <Button 
                className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
                onClick={() => setShowRecruitDialog(true)}
              >
                <Plus className="h-4 w-4 mr-2" /> Recruit Your First Character
              </Button>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {filteredCharacters.map((character) => (
                <CharacterCard 
                  key={character.id} 
                  character={character} 
                  availableAuras={auras || []}
                  allAuras={auras || []}
                  refetchAura={() => fetchAuras()}
                  refetchAllAuras={() => fetchAuras()}
                  equippedAura={auras.find(aura => aura.id === character.equippedAuraId)}
                />
              ))}
            </motion.div>
          )}
        </TabsContent>
        
        {/* Auras Tab */}
        <TabsContent value="auras">
          {filteredAuras.length === 0 ? (
            <div className="bg-[#1A1A2E] rounded-xl p-8 text-center">
              <p className="text-[#C8B8DB]/80 mb-4">
                {searchTerm 
                  ? `No auras found matching "${searchTerm}"` 
                  : "You don't have any auras yet."}
              </p>
              <Button 
                className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
                onClick={() => window.location.href = "/forge"}
              >
                <Sparkles className="h-4 w-4 mr-2" /> Craft Your First Aura
              </Button>
            </div>
          ) : (
            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              variants={container}
              initial="hidden"
              animate="show"
            >
              {/* Aura Detail Dialog */}
              <Dialog open={!!selectedAura} onOpenChange={(open) => !open && setSelectedAura(null)}>
                <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB] max-w-2xl">
                  {selectedAura && (
                    <>
                      <DialogHeader>
                        <DialogTitle className="text-[#FF9D00] font-cinzel text-xl flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3
                            ${selectedAura.element === 'Fire' ? 'bg-red-500/20' : 
                              selectedAura.element === 'Water' ? 'bg-blue-500/20' : 
                              selectedAura.element === 'Earth' ? 'bg-amber-800/20' : 
                              'bg-green-500/20'}`
                          }>
                            {selectedAura.element === 'Fire' ? (
                              <div className="text-red-500">🔥</div>
                            ) : selectedAura.element === 'Water' ? (
                              <div className="text-blue-500">💧</div>
                            ) : selectedAura.element === 'Earth' ? (
                              <div className="text-amber-800">🏔️</div>
                            ) : (
                              <div className="text-green-500">🌪️</div>
                            )}
                          </div>
                          {selectedAura.name || `${selectedAura.element || 'Mysterious'} Aura`}
                        </DialogTitle>
                      </DialogHeader>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                        {/* Left Column - Stats */}
                        <div>
                          <h3 className="font-semibold text-[#FF9D00] mb-3">Stats</h3>
                          <div className="bg-[#1F1D36]/80 p-4 rounded-lg">
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                              <div className="flex justify-between">
                                <div className="flex items-center">
                                  <Sword className="h-3 w-3 mr-1 text-red-400" />
                                  <span>Attack</span>
                                </div>
                                <span className={`${selectedAura.attack && selectedAura.attack > 0 ? 'text-green-400' : selectedAura.attack && selectedAura.attack < 0 ? 'text-red-400' : 'text-[#00B9AE]'}`}>
                                  {typeof selectedAura.attack === 'number' ? `${selectedAura.attack}%` : '0%'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <div className="flex items-center">
                                  <Target className="h-3 w-3 mr-1 text-blue-400" />
                                  <span>Accuracy</span>
                                </div>
                                <span className={`${selectedAura.accuracy && selectedAura.accuracy > 0 ? 'text-green-400' : selectedAura.accuracy && selectedAura.accuracy < 0 ? 'text-red-400' : 'text-[#00B9AE]'}`}>
                                  {typeof selectedAura.accuracy === 'number' ? `${selectedAura.accuracy}%` : '0%'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <div className="flex items-center">
                                  <Shield className="h-3 w-3 mr-1 text-amber-400" />
                                  <span>Defense</span>
                                </div>
                                <span className={`${selectedAura.defense && selectedAura.defense > 0 ? 'text-green-400' : selectedAura.defense && selectedAura.defense < 0 ? 'text-red-400' : 'text-[#00B9AE]'}`}>
                                  {typeof selectedAura.defense === 'number' ? `${selectedAura.defense}%` : '0%'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <div className="flex items-center">
                                  <Heart className="h-3 w-3 mr-1 text-green-400" />
                                  <span>Vitality</span>
                                </div>
                                <span className={`${selectedAura.vitality && selectedAura.vitality > 0 ? 'text-green-400' : selectedAura.vitality && selectedAura.vitality < 0 ? 'text-red-400' : 'text-[#00B9AE]'}`}>
                                  {typeof selectedAura.vitality === 'number' ? `${selectedAura.vitality}%` : '0%'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <div className="flex items-center">
                                  <Footprints className="h-3 w-3 mr-1 text-cyan-400" />
                                  <span>Speed</span>
                                </div>
                                <span className={`${selectedAura.speed && selectedAura.speed > 0 ? 'text-green-400' : selectedAura.speed && selectedAura.speed < 0 ? 'text-red-400' : 'text-[#00B9AE]'}`}>
                                  {typeof selectedAura.speed === 'number' ? `${selectedAura.speed}%` : '0%'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <div className="flex items-center">
                                  <Eye className="h-3 w-3 mr-1 text-yellow-400" />
                                  <span>Focus</span>
                                </div>
                                <span className={`${selectedAura.focus && selectedAura.focus > 0 ? 'text-green-400' : selectedAura.focus && selectedAura.focus < 0 ? 'text-red-400' : 'text-[#00B9AE]'}`}>
                                  {typeof selectedAura.focus === 'number' ? `${selectedAura.focus}%` : '0%'}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <div className="flex items-center">
                                  <CircleOff className="h-3 w-3 mr-1 text-purple-400" />
                                  <span>Resilience</span>
                                </div>
                                <span className={`${selectedAura.resilience && selectedAura.resilience > 0 ? 'text-green-400' : selectedAura.resilience && selectedAura.resilience < 0 ? 'text-red-400' : 'text-[#00B9AE]'}`}>
                                  {typeof selectedAura.resilience === 'number' ? `${selectedAura.resilience}%` : '0%'}
                                </span>
                              </div>
                            </div>
                            
                            {/* Display Skills if any */}
                            {selectedAura.skills && Array.isArray(selectedAura.skills) && selectedAura.skills.length > 0 && (
                              <>
                                <div className="text-[#00B9AE] text-xs mt-4 mb-1">Skills:</div>
                                <div className="mt-1 space-y-2">
                                  {selectedAura.skills.map((skill: any, index: number) => (
                                    <div key={index} className="bg-[#432874]/20 p-2 rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center">
                                          <Sparkles className="h-3 w-3 mr-1 text-yellow-400 flex-shrink-0" />
                                          <span className="font-semibold text-xs">{skill.name}</span>
                                        </div>
                                        {skill.type && (
                                          <Badge className={`
                                            ${skill.type === 'Ultimate' ? 'bg-[#FF9D00]/20 text-[#FF9D00]' : 
                                              skill.type === 'Advanced' ? 'bg-[#00B9AE]/20 text-[#00B9AE]' : 
                                              'bg-[#C8B8DB]/20 text-[#C8B8DB]'}
                                          `}>
                                            {skill.type}
                                          </Badge>
                                        )}
                                      </div>
                                      
                                      {skill.description && (
                                        <div className="ml-4 mt-1 text-xs text-[#C8B8DB]/80">
                                          {skill.description}
                                        </div>
                                      )}
                                      
                                      <div className="grid grid-cols-2 gap-2 ml-4 mt-2">
                                        {/* Damage Multiplier */}
                                        {skill.damage !== undefined && (
                                          <div className="flex items-center">
                                            <Sword className="h-3 w-3 mr-1 text-red-400 flex-shrink-0" />
                                            <span className="text-xs">Damage: x{skill.damage}</span>
                                          </div>
                                        )}
                                        
                                        {/* Targets */}
                                        {skill.targets !== undefined && (
                                          <div className="flex items-center">
                                            <Target className="h-3 w-3 mr-1 text-blue-400 flex-shrink-0" />
                                            <span className="text-xs">Targets: {skill.targets}</span>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Special Effect */}
                                      {skill.effect && (
                                        <div className="flex items-start ml-4 mt-2">
                                          <Activity className="h-3 w-3 mr-1 text-purple-400 flex-shrink-0 mt-0.5" />
                                          <span className="text-xs text-[#00B9AE]">Effect: {skill.effect}</span>
                                        </div>
                                      )}
                                      
                                      {/* Cooldown if applicable */}
                                      {skill.cooldown && (
                                        <div className="flex items-center ml-4 mt-1">
                                          <Zap className="h-3 w-3 mr-1 text-yellow-400 flex-shrink-0" />
                                          <span className="text-xs">Cooldown: {skill.cooldown} turn{skill.cooldown !== 1 ? 's' : ''}</span>
                                        </div>
                                      )}
                                      
                                      {/* Level/Tier Info */}
                                      {skill.level && (
                                        <div className="flex items-center ml-4 mt-1">
                                          <ArrowUpToLine className="h-3 w-3 mr-1 text-green-400 flex-shrink-0" />
                                          <span className="text-xs">Required Level: {skill.level}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* Right Column - Forge Information */}
                        <div>
                          <h3 className="font-semibold text-[#FF9D00] mb-3">Forge Information</h3>
                          <div className="bg-[#1F1D36]/80 p-4 rounded-lg">
                            <div className="mb-3">
                              <div className="text-sm font-semibold mb-1">Element</div>
                              <Badge className={`
                                ${selectedAura.element === 'Fire' ? 'bg-red-500/20 text-red-400' : 
                                  selectedAura.element === 'Water' ? 'bg-blue-500/20 text-blue-400' : 
                                  selectedAura.element === 'Earth' ? 'bg-amber-800/20 text-amber-600' : 
                                  'bg-green-500/20 text-green-400'}
                              `}>
                                {selectedAura.element || 'Unknown'}
                              </Badge>
                            </div>
                            
                            <div className="mb-3">
                              <div className="text-sm font-semibold mb-1">Level</div>
                              <div className="text-[#FF9D00]">{selectedAura.level || 1}</div>
                            </div>
                            
                            {selectedAura.equippedByCharacterId && (
                              <div className="mb-3">
                                <div className="text-sm font-semibold mb-1">Equipped By</div>
                                <div className="text-[#00B9AE]">
                                  {characters.find(c => c.id === selectedAura.equippedByCharacterId)?.name || 'Unknown Character'}
                                </div>
                              </div>
                            )}
                            
                            {/* All source information removed as requested */}
                                  <div className="bg-[#432874]/20 p-2 rounded-lg">
                                    Origin unknown
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>
              
              {filteredAuras.map((aura) => (
                <motion.div
                  key={aura.id}
                  variants={item}
                  onClick={() => setSelectedAura(aura)}
                  className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden cursor-pointer hover:border-[#FF9D00]/50 hover:shadow-lg transition-all"
                >
                  <div className="p-4">
                    <div className="flex items-center mb-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-3
                        ${aura.element?.toLowerCase() === 'fire' ? 'bg-red-500/20' : 
                          aura.element?.toLowerCase() === 'water' ? 'bg-blue-500/20' : 
                          aura.element?.toLowerCase() === 'earth' ? 'bg-amber-800/20' : 
                          aura.element?.toLowerCase() === 'wind' ? 'bg-cyan-500/20' :
                          'bg-green-500/20'}`
                      }>
                        {aura.element?.toLowerCase() === 'fire' ? (
                          <div className="text-red-500">🔥</div>
                        ) : aura.element?.toLowerCase() === 'water' ? (
                          <div className="text-blue-500">💧</div>
                        ) : aura.element?.toLowerCase() === 'earth' ? (
                          <div className="text-amber-800">🏔️</div>
                        ) : aura.element?.toLowerCase() === 'wind' ? (
                          <div className="text-cyan-500">🌪️</div>
                        ) : (
                          <div className="text-purple-500">✨</div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-cinzel font-semibold text-[#FF9D00]">
                          {aura.name || `${aura.element || 'Mysterious'} Aura`}
                        </h3>
                        <div className="text-sm text-[#C8B8DB]/80">
                          Level {aura.level || 1}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 bg-[#1F1D36]/80 p-3 rounded-lg text-sm">
                      <h4 className="font-semibold mb-1">Stat Multipliers:</h4>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        {/* Show all stats - show 0 if not present */}
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <Sword className="h-3 w-3 mr-1 text-red-400" />
                            <span>Attack</span>
                          </div>
                          <span className="text-[#00B9AE]">
                            {typeof aura.attack === 'number' ? `${aura.attack}%` : '0%'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <Target className="h-3 w-3 mr-1 text-blue-400" />
                            <span>Accuracy</span>
                          </div>
                          <span className="text-[#00B9AE]">
                            {typeof aura.accuracy === 'number' ? `${aura.accuracy}%` : '0%'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <Shield className="h-3 w-3 mr-1 text-amber-400" />
                            <span>Defense</span>
                          </div>
                          <span className="text-[#00B9AE]">
                            {typeof aura.defense === 'number' ? `${aura.defense}%` : '0%'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <Heart className="h-3 w-3 mr-1 text-green-400" />
                            <span>Vitality</span>
                          </div>
                          <span className="text-[#00B9AE]">
                            {typeof aura.vitality === 'number' ? `${aura.vitality}%` : '0%'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <Footprints className="h-3 w-3 mr-1 text-cyan-400" />
                            <span>Speed</span>
                          </div>
                          <span className="text-[#00B9AE]">
                            {typeof aura.speed === 'number' ? `${aura.speed}%` : '0%'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <Eye className="h-3 w-3 mr-1 text-yellow-400" />
                            <span>Focus</span>
                          </div>
                          <span className="text-[#00B9AE]">
                            {typeof aura.focus === 'number' ? `${aura.focus}%` : '0%'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <div className="flex items-center">
                            <CircleOff className="h-3 w-3 mr-1 text-purple-400" />
                            <span>Resilience</span>
                          </div>
                          <span className="text-[#00B9AE]">
                            {typeof aura.resilience === 'number' ? `${aura.resilience}%` : '0%'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Note: Stat bonuses are now displayed directly in the attributes above */}
                      
                      {/* Forge information - showing which character classes were used */}
                      {(() => {
                        // Use safer type checking for sourceCharacterIds
                        const sourceIds = aura.sourceCharacterIds as number[] | undefined;
                        
                        if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
                          return null; // Removed Power Source section as requested
                        }
                        
                        // Find the source characters
                        const sourceChars = characters.filter(c => sourceIds.includes(c.id));
                        
                        return (
                          <div className="mt-3 pt-3 border-t border-[#432874]/30">
                            <h4 className="text-xs font-semibold mb-1 text-[#00B9AE]">Forged Using:</h4>
                            <div className="text-xs text-[#C8B8DB]/80">
                              {sourceChars.length === 0 
                                ? 'Unknown characters' 
                                : sourceChars.map(char => `${char.name} (${char.class})`).join(', ')
                              }
                            </div>
                          </div>
                        );
                      })()}
                      
                      {/* Skills list */}
                      {aura.skills && (typeof aura.skills === 'object' || typeof aura.skills === 'string') && (
                        <div className="mt-3 pt-3 border-t border-[#432874]/30">
                          <h4 className="text-xs font-semibold mb-1 text-[#00B9AE]">Active Skills:</h4>
                          <div className="text-xs">
                            {(() => {
                              let skills = [];
                              try {
                                skills = typeof aura.skills === 'string' 
                                  ? JSON.parse(aura.skills) 
                                  : aura.skills;
                              } catch (e) {
                                return 'No active skills';
                              }
                              
                              if (!Array.isArray(skills) || skills.length === 0) {
                                return 'No active skills';
                              }
                              
                              return (
                                <ul className="list-disc list-inside">
                                  {skills.map((skill, idx) => (
                                    <li key={idx}>
                                      <span className="font-semibold">{skill.name}</span>: {skill.description}
                                    </li>
                                  ))}
                                </ul>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3 text-center">
                      {aura.equippedByCharacterId ? (
                        <div className="bg-[#00B9AE]/20 text-[#00B9AE] py-1 px-2 rounded text-sm">
                          Equipped by {(() => {
                            const char = characters.find(c => c.id === aura.equippedByCharacterId);
                            return char ? char.name : 'a character';
                          })()}
                        </div>
                      ) : (
                        <Button 
                          size="sm" 
                          className="w-full bg-[#432874] hover:bg-[#432874]/80 text-xs"
                        >
                          Equip to Character
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </TabsContent>
        
        {/* Materials Tab */}
        <TabsContent value="materials">
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {resources.filter(r => r.type === 'material').map((material) => (
              <motion.div
                key={material.id}
                variants={item}
                className="bg-[#1A1A2E] border border-[#432874]/30 rounded-lg p-4"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-[#432874]/30 flex items-center justify-center mr-3">
                    <Box className="h-5 w-5 text-[#C8B8DB]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#FF9D00]">{material.name}</h3>
                    <div className="text-sm text-[#C8B8DB]/80">Material</div>
                  </div>
                  <div className="ml-auto bg-[#432874]/30 px-3 py-1 rounded-full">
                    <span className="text-[#C8B8DB]">{material.quantity}</span>
                  </div>
                </div>
                <div className="mt-3 text-sm text-[#C8B8DB]/70">
                  {material.description || "Used for crafting and upgrading items."}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
        
        {/* Resources Tab */}
        <TabsContent value="resources">
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {filteredResources.map((resource) => (
              <motion.div
                key={resource.id}
                variants={item}
                className="bg-[#1A1A2E] border border-[#432874]/30 rounded-lg p-4"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-[#432874]/30 flex items-center justify-center mr-3">
                    {resource.type === 'essence' ? (
                      <Sparkles className="h-5 w-5 text-[#FF9D00]" />
                    ) : resource.type === 'currency' ? (
                      <Gem className="h-5 w-5 text-[#FFD700]" />
                    ) : (
                      <Box className="h-5 w-5 text-[#C8B8DB]" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#FF9D00]">{resource.name}</h3>
                    <div className="text-sm text-[#C8B8DB]/80 capitalize">{resource.type}</div>
                  </div>
                  <div className="ml-auto bg-[#432874]/30 px-3 py-1 rounded-full">
                    <span className="text-[#C8B8DB]">{resource.quantity}</span>
                  </div>
                </div>
                <div className="mt-3 text-sm text-[#C8B8DB]/70">
                  {resource.description || `Used for ${resource.type === 'essence' ? 'crafting auras' : 
                    resource.type === 'currency' ? 'purchasing items and upgrades' : 
                    'crafting and upgrading'}.`}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
        
        {/* Character Shards Tab */}
        <TabsContent value="shards">
          <motion.div 
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            variants={container}
            initial="hidden"
            animate="show"
          >
            {filteredShards.map((shard) => (
              <motion.div
                key={shard.id}
                variants={item}
                className="bg-[#1A1A2E] border border-[#432874]/30 rounded-lg p-4"
              >
                <div className="flex items-center">
                  <div className={`w-12 h-12 rounded-full overflow-hidden border-2 flex-shrink-0 mr-3
                    ${shard.rarity === 'common' ? 'border-gray-600' : 
                      shard.rarity === 'uncommon' ? 'border-blue-600' : 
                      shard.rarity === 'rare' ? 'border-purple-600' : 
                      shard.rarity === 'epic' ? 'border-red-600' : 
                      'border-yellow-600'}`
                  }>
                    <img 
                      src={shard.avatarUrl || "/assets/default-avatar.png"}
                      alt={shard.characterName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#FF9D00]">{shard.name}</h3>
                    <div className={`text-sm capitalize
                      ${shard.rarity === 'common' ? 'text-gray-300' : 
                        shard.rarity === 'uncommon' ? 'text-blue-300' : 
                        shard.rarity === 'rare' ? 'text-purple-300' : 
                        shard.rarity === 'epic' ? 'text-red-300' : 
                        'text-yellow-300'}`
                    }>
                      {shard.rarity === 'common' ? 'Basic' : 
                        shard.rarity === 'uncommon' ? 'Rare' : 
                        shard.rarity === 'rare' ? 'Epic' : 
                        shard.rarity === 'epic' ? 'Mythic' : 
                        'Legendary'} • {shard.characterClass}
                    </div>
                    <div className="flex mt-1 text-xs text-[#C8B8DB]">
                      <span className="font-medium">{shard.quantity}</span>
                      <span className="text-[#C8B8DB]/60 mx-1">/</span>
                      <span className="font-medium">{shard.required}</span>
                    </div>
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

export default InventoryView;