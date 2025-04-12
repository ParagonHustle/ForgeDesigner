import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '@/lib/zustandStore';
import { useDiscordAuth } from '@/lib/discordAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Search, Filter, ShoppingBag, User, Sparkles, Gem, Box, Plus } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import CharacterCard from '../characters/CharacterCard';
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

  // Define character shards - now specific to each character
  const characterShards = characters.map(character => ({
    id: character.id,
    name: `${character.name} Shard`,
    quantity: Math.floor(Math.random() * 80) + 10, // Random quantity for demonstration
    required: 100,
    characterClass: character.class,
    characterName: character.name,
    rarity: character.rarity || "rare",
    avatarUrl: character.avatarUrl
  }));

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

  // Handle recruiting a new character
  const handleRecruitCharacter = async () => {
    try {
      // Generate a random character for demonstration
      const randomNames = ["Eldrin", "Lyra", "Thorne", "Seraphina", "Gideon", "Isolde"];
      const randomClasses = ["Warrior", "Mage", "Rogue", "Cleric"];
      const randomRarities = ["common", "rare", "epic"];
      const randomAvatars = [
        "https://images.unsplash.com/photo-1577095972620-2f389ca3abcd?w=150&h=150&fit=crop",
        "https://images.unsplash.com/photo-1613477564751-fc2a7c5bbb7a?w=150&h=150&fit=crop",
        "https://images.unsplash.com/photo-1578336134673-1eef9c8c5e36?w=150&h=150&fit=crop"
      ];
      
      const newCharacter = {
        name: randomNames[Math.floor(Math.random() * randomNames.length)],
        class: randomClasses[Math.floor(Math.random() * randomClasses.length)],
        rarity: randomRarities[Math.floor(Math.random() * randomRarities.length)],
        level: 1,
        avatarUrl: randomAvatars[Math.floor(Math.random() * randomAvatars.length)],
        attack: 10 + Math.floor(Math.random() * 5),
        defense: 10 + Math.floor(Math.random() * 5),
        health: 100 + Math.floor(Math.random() * 20),
        speed: 10 + Math.floor(Math.random() * 5),
        vitality: 10 + Math.floor(Math.random() * 5),
        intelligence: 10 + Math.floor(Math.random() * 5),
        luck: 10 + Math.floor(Math.random() * 5)
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
                    onClick={handleRecruitCharacter}
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
                <CharacterCard key={character.id} character={character} />
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
              {filteredAuras.map((aura) => (
                <motion.div
                  key={aura.id}
                  variants={item}
                  className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-center mb-3">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center mr-3
                        ${aura.element === 'Fire' ? 'bg-red-500/20' : 
                          aura.element === 'Water' ? 'bg-blue-500/20' : 
                          aura.element === 'Earth' ? 'bg-amber-800/20' : 
                          'bg-green-500/20'}`
                      }>
                        {aura.element === 'Fire' ? (
                          <div className="text-red-500">🔥</div>
                        ) : aura.element === 'Water' ? (
                          <div className="text-blue-500">💧</div>
                        ) : aura.element === 'Earth' ? (
                          <div className="text-amber-800">🏔️</div>
                        ) : (
                          <div className="text-green-500">🌪️</div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-cinzel font-semibold text-[#FF9D00]">
                          {aura.name || `${aura.element || 'Mysterious'} Aura`}
                        </h3>
                        <div className="text-sm text-[#C8B8DB]/80">
                          {aura.rarity} • Level {aura.level || 1}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-2 bg-[#1F1D36]/80 p-3 rounded-lg text-sm">
                      <h4 className="font-semibold mb-1">Stat Multipliers:</h4>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        {aura.statMultipliers && Object.entries(aura.statMultipliers as Record<string, number>).map(([stat, value]) => (
                          <div key={stat} className="flex justify-between">
                            <span className="capitalize">{stat}</span>
                            <span className="text-[#00B9AE]">
                              {typeof value === 'number' ? `${value.toFixed(2)}x` : '1.00x'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mt-3 text-center">
                      {aura.equippedByCharacterId ? (
                        <div className="bg-[#00B9AE]/20 text-[#00B9AE] py-1 px-2 rounded text-sm">
                          Equipped
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
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3
                    ${shard.rarity === 'common' ? 'bg-gray-600/30' : 
                      shard.rarity === 'rare' ? 'bg-blue-600/30' : 
                      shard.rarity === 'epic' ? 'bg-purple-600/30' : 
                      'bg-yellow-600/30'}`
                  }>
                    <ShoppingBag className={`h-5 w-5 
                      ${shard.rarity === 'common' ? 'text-gray-300' : 
                        shard.rarity === 'rare' ? 'text-blue-300' : 
                        shard.rarity === 'epic' ? 'text-purple-300' : 
                        'text-yellow-300'}`
                    } />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#FF9D00]">{shard.name}</h3>
                    <div className={`text-sm capitalize
                      ${shard.rarity === 'common' ? 'text-gray-300' : 
                        shard.rarity === 'rare' ? 'text-blue-300' : 
                        shard.rarity === 'epic' ? 'text-purple-300' : 
                        'text-yellow-300'}`
                    }>
                      {shard.rarity} • {shard.characterClass}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#C8B8DB]/80">Progress</span>
                    <span className="text-[#C8B8DB]">{shard.quantity}/{shard.required}</span>
                  </div>
                  <div className="h-2 bg-[#1F1D36] rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${shard.rarity === 'common' ? 'bg-gray-600' : 
                        shard.rarity === 'rare' ? 'bg-blue-600' : 
                        shard.rarity === 'epic' ? 'bg-purple-600' : 
                        'bg-yellow-600'}`
                      } 
                      style={{ width: `${(shard.quantity / shard.required) * 100}%` }}
                    ></div>
                  </div>
                </div>
                
                <div className="mt-3 text-sm text-[#C8B8DB]/70">
                  Collect {shard.required} shards to summon a {shard.rarity} {shard.characterClass} character.
                </div>
                
                <Button 
                  size="sm" 
                  className="w-full mt-3 bg-[#432874] hover:bg-[#432874]/80 text-xs"
                  disabled={shard.quantity < shard.required}
                >
                  {shard.quantity >= shard.required ? 'Summon Character' : `Need ${shard.required - shard.quantity} more`}
                </Button>
              </motion.div>
            ))}
          </motion.div>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default InventoryView;