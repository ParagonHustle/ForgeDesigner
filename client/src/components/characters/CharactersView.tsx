import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { CharacterCard } from './CharacterCard';
import type { Character, Aura } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Filter, Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const CharactersView = () => {
  const { data: characters = [], isLoading: loadingCharacters, refetch: refetchCharacters } = useQuery<Character[]>({ 
    queryKey: ['/api/characters']
  });
  const { data: auras = [], isLoading: loadingAuras, refetch: refetchAuras } = useQuery<Aura[]>({ 
    queryKey: ['/api/auras']
  });
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const { toast } = useToast();
  
  const isLoading = loadingCharacters || loadingAuras;

  const filteredCharacters = characters.filter(character => {
    // Apply search filter
    const matchesSearch = character.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply category filter
    const matchesFilter = 
      filter === 'all' ||
      (filter === 'active' && character.isActive) ||
      (filter === 'idle' && !character.isActive) ||
      (filter === filter && character.class.toLowerCase() === filter);
    
    return matchesSearch && matchesFilter;
  });

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

  // Default avatar mapping
  const characterAvatars: Record<string, string> = {
    "Kleos": "/images/kleos.jpg",
    "Brawler Frank": "/images/brawlerfrank.jpg",
    "G-Wolf": "/images/gwolf.jpg",
    "Seraphina": "/images/seraphina.jpg",
    "Dumbleboom": "/images/dumbleboom.jpg",
    "Gideon": "/images/gideon.jpg",
  };

  const handleRecruitCharacter = async () => {
    try {
      // Generate a random character for demonstration
      const randomNames = ["Eldrin", "Lyra", "Thorne", "Seraphina", "Gideon", "Isolde"];
      const randomClasses = ["Warrior", "Mage", "Rogue", "Cleric"];
      const defaultAvatar = "/images/default-avatar.jpg";
      
      const newCharacter = {
        name: randomNames[Math.floor(Math.random() * randomNames.length)],
        class: randomClasses[Math.floor(Math.random() * randomClasses.length)],
        level: 1,
        avatarUrl: characterAvatars[name] || defaultAvatar,
        attack: 10 + Math.floor(Math.random() * 5),
        defense: 10 + Math.floor(Math.random() * 5),
        vitality: 100 + Math.floor(Math.random() * 20),
        speed: 10 + Math.floor(Math.random() * 5),
        focus: 10 + Math.floor(Math.random() * 5),
        resilience: 10 + Math.floor(Math.random() * 5),
        accuracy: 10 + Math.floor(Math.random() * 5)
      };
      
      const response = await apiRequest('POST', '/api/characters', newCharacter);
      const data = await response.json();
      
      toast({
        title: "Character Recruited!",
        description: `${data.name} has joined your roster.`
      });
      
      setShowDialog(false);
    } catch (error) {
      console.error('Error recruiting character:', error);
      toast({
        title: "Recruitment Failed",
        description: "Unable to recruit a new character at this time.",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-[#FF9D00] text-xl">Loading characters...</div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Characters</h1>
        <p className="text-[#C8B8DB]/80">
          Manage your heroes, equip Auras, and assign them to tasks.
        </p>
      </div>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#C8B8DB]/50 h-4 w-4" />
          <input
            type="text"
            placeholder="Search characters..."
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
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="idle">Idle</SelectItem>
              <SelectItem value="warrior">Warrior</SelectItem>
              <SelectItem value="mage">Mage</SelectItem>
              <SelectItem value="rogue">Rogue</SelectItem>
              <SelectItem value="cleric">Cleric</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
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
      </div>
      
      {filteredCharacters.length === 0 ? (
        <div className="bg-[#1A1A2E] rounded-xl p-8 text-center">
          <p className="text-[#C8B8DB]/80 mb-4">
            {searchTerm 
              ? `No characters found matching "${searchTerm}"` 
              : "You don't have any characters yet."}
          </p>
          <Button 
            className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
            onClick={() => setShowDialog(true)}
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
              character={{
                ...character,
                avatarUrl: characterAvatars[character.name] || "/images/default-avatar.jpg"
              }} 
              availableAuras={auras}
              allAuras={auras}
              refetchAura={() => refetchAuras()}
              refetchAllAuras={() => refetchAuras()}
              equippedAura={auras.find(aura => aura.id === character.equippedAuraId)}
            />
          ))}
        </motion.div>
      )}
    </>
  );
};

export default CharactersView;
