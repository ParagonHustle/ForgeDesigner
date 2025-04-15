import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useGameStore } from '@/lib/zustandStore';
import { motion } from 'framer-motion';
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
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Skull, Swords, Shield, Zap, Heart, Plus, Clock, ScrollText } from 'lucide-react';
import type { Character, DungeonRun } from '@shared/schema';
import BattleLog from '@/components/battles/BattleLog';

const dungeons = [
  {
    id: 1,
    name: "Shadow Depths",
    level: 12,
    description: "A dark cavern filled with shadowy creatures and hidden treasures.",
    difficulty: "Medium",
    rewards: "Celestial Ore, Soul Shards, Rogue Credits",
    image: "https://images.unsplash.com/photo-1553481187-be93c21490a9?w=400&h=250&fit=crop",
    recommendedLevel: 10,
    duration: 120 // in seconds
  },
  {
    id: 2,
    name: "Fire Caves",
    level: 8,
    description: "Blazing hot volcanic caves home to fire elementals and dragons.",
    difficulty: "Easy",
    rewards: "Phoenix Feathers, Dragon Scales, Rogue Credits",
    image: "https://images.unsplash.com/photo-1566041510639-8d95a2490bfb?w=400&h=250&fit=crop",
    recommendedLevel: 6,
    duration: 90 // in seconds
  },
  {
    id: 3,
    name: "Enchanted Forest",
    level: 16,
    description: "A mystical forest where ancient spirits and magical creatures dwell.",
    difficulty: "Hard",
    rewards: "Spirit Essence, Moonsilver, Soul Shards",
    image: "https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&h=250&fit=crop",
    recommendedLevel: 14,
    duration: 180 // in seconds
  }
];

const getClassColor = (characterClass: string) => {
  switch (characterClass.toLowerCase()) {
    case 'warrior':
      return 'bg-red-900/20 text-red-400 border-red-500/30';
    case 'mage':
      return 'bg-blue-900/20 text-blue-400 border-blue-500/30';
    case 'rogue':
      return 'bg-green-900/20 text-green-400 border-green-500/30';
    default:
      return 'bg-purple-900/20 text-purple-400 border-purple-500/30';
  }
};

const DungeonView = () => {
  const { characters, fetchDungeonRuns } = useGameStore();
  const { toast } = useToast();
  const [selectedDungeon, setSelectedDungeon] = useState<any>(null);
  const [selectedCharacters, setSelectedCharacters] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBattleLog, setShowBattleLog] = useState(false);
  const [currentBattleLog, setCurrentBattleLog] = useState<any[]>([]);

  // Get active characters (not assigned to other tasks)
  const availableCharacters = characters.filter(char => {
    // Check if character is in any active task
    const isInDungeon = char.isActive && char.activityType === 'dungeon';
    const isInForge = char.isActive && char.activityType === 'forging';
    const isInFarming = char.isActive && char.activityType === 'farming';
    return !isInDungeon && !isInForge && !isInFarming;
  });
  const activeDungeons = useQuery<DungeonRun[]>({ 
    queryKey: ['/api/dungeons/runs'],
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  const toggleCharacterSelection = (characterId: number) => {
    if (selectedCharacters.includes(characterId)) {
      setSelectedCharacters(prev => prev.filter(id => id !== characterId));
    } else if (selectedCharacters.length < 4) {
      setSelectedCharacters(prev => [...prev, characterId]);
    } else {
      toast({
        title: "Party Limit Reached",
        description: "You can only select up to 4 characters for a dungeon run.",
        variant: "destructive"
      });
    }
  };

  const startDungeonRun = async () => {
    if (selectedCharacters.length === 0) {
      toast({
        title: "No Characters Selected",
        description: "Please select at least one character for the dungeon run.",
        variant: "destructive"
      });
      return;
    }

    if (!selectedDungeon) return;

    setIsSubmitting(true);

    try {
      // Calculate end time based on dungeon duration
      const endTime = new Date(new Date().getTime() + selectedDungeon.duration * 1000);

      // Get the selected character objects to check if they have auras equipped
      const selectedChars = characters.filter(char => selectedCharacters.includes(char.id));

      // Check if all selected characters have auras equipped
      const unequippedChars = selectedChars.filter(char => !char.equippedAuraId);
      if (unequippedChars.length > 0) {
        throw new Error(`${unequippedChars.map(c => c.name).join(', ')} ${unequippedChars.length === 1 ? 'needs' : 'need'} an aura equipped to enter dungeons`);
      }

      // Check for any characters with very low health (treat all as healthy for now)
      // In the future, when currentHealth is added to the character schema, we can enable this check
      const damagedCharacters: any[] = [];
      
      // Commented out implementation for when currentHealth property is added
      /*
      const damagedCharacters = selectedChars.filter(char => {
        // Calculate max health (vitality * 8)
        const maxHealth = (char.vitality || 100) * 8;
        // If currentHealth exists and is too low, flag this character
        return (char.currentHealth !== null && 
                char.currentHealth !== undefined && 
                char.currentHealth < (maxHealth * 0.3));
      });
      */
      
      if (damagedCharacters.length > 0) {
        const charNames = damagedCharacters.map(c => c.name).join(', ');
        throw new Error(`${charNames} ${damagedCharacters.length === 1 ? 'is' : 'are'} too damaged to enter the dungeon. Please heal or select different characters.`);
      }

      console.log("Sending dungeon request:", {
        dungeonName: selectedDungeon.name,
        dungeonLevel: selectedDungeon.level,
        characterIds: selectedCharacters,
        endTime: endTime
      });

      const response = await apiRequest('POST', '/api/dungeons/start', {
        dungeonName: selectedDungeon.name,
        dungeonLevel: selectedDungeon.level,
        characterIds: selectedCharacters,
        endTime: endTime.toISOString(), // Convert to ISO string
        dungeonTypeId: selectedDungeon.id,
        elementalType: selectedDungeon.elementalType || 'fire'  // Default to fire if not specified
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to start dungeon run");
      }

      toast({
        title: "Dungeon Run Started!",
        description: `Your party has entered ${selectedDungeon.name}.`,
      });

      // Refresh dungeon runs
      fetchDungeonRuns();
      activeDungeons.refetch();

      // Reset selections
      setSelectedCharacters([]);
      setSelectedDungeon(null);
    } catch (error: any) {
      console.error('Error starting dungeon run:', error);
      toast({
        title: "Failed to Start Dungeon Run",
        description: error.message || "There was an error starting the dungeon run.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteDungeon = async (runId: number) => {
    setIsSubmitting(true);
    try {
      const res = await apiRequest('POST', `/api/dungeons/complete/${runId}`, undefined);
      const data = await res.json();

      // Show battle log immediately
      setCurrentBattleLog(data.battleLog || []);
      setShowBattleLog(true);

      // Refresh the list of dungeons
      activeDungeons.refetch();
    } catch (error) {
      console.error('Error completing dungeon:', error);
      toast({
        title: "Error",
        description: "Failed to complete dungeon run.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewBattleLog = (battleLog: any) => {
    // Display battle log in dialog
    console.log(battleLog);
    setCurrentBattleLog(battleLog || []);
    setShowBattleLog(true);
  };

  return (
    <>
      <div className="mb-6">
        <h1 className="text-3xl font-cinzel font-bold text-[#FF9D00] mb-2">Dungeon</h1>
        <p className="text-[#C8B8DB]/80">
          Send your heroes on dangerous dungeon runs to collect valuable rewards.
        </p>
      </div>

      {/* Active Dungeon Runs */}
      {activeDungeons.data && activeDungeons.data.filter(run => !run.completed).length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-cinzel font-bold mb-4">Active Dungeon Runs</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {activeDungeons.data
              .filter(run => !run.completed)
              .map(run => {
                const endTime = new Date(run.endTime);
                const isCompleted = endTime <= new Date();

                return (
                  <Card key={run.id} className="bg-[#1A1A2E] border-[#432874]/30">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-[#FF9D00] font-cinzel">{run.dungeonName}</CardTitle>
                          <CardDescription>Level {run.dungeonLevel}</CardDescription>
                        </div>
                        <Badge className="bg-[#DC143C]/20 text-[#DC143C] border-[#DC143C]/30">
                          {isCompleted ? "Ready to Collect" : "In Progress"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <div className="flex space-x-2 mb-2">
                        {run.characterIds.map((charId) => {
                          const character = characters.find(c => c.id === charId);
                          return (
                            <img 
                              key={charId}
                              src={character?.avatarUrl || "https://via.placeholder.com/40"}
                              alt={character?.name || "Character"}
                              className="w-8 h-8 rounded-full border border-[#432874]"
                            />
                          );
                        })}
                      </div>
                      {!isCompleted && (
                        <div className="flex items-center text-sm text-[#C8B8DB]/70">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>
                            Completes in {Math.ceil((endTime.getTime() - new Date().getTime()) / 60000)} minutes
                          </span>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      {isCompleted ? (
                        <Button 
                          className="w-full bg-[#DC143C] hover:bg-[#DC143C]/80"
                          onClick={() => handleCompleteDungeon(run.id)}
                          disabled={isSubmitting}
                        >
                          <Skull className="h-4 w-4 mr-2" />
                          {isSubmitting ? "Retrieving Party..." : "Retrieve Party"}
                        </Button>
                      ) : (
                        <Button 
                          className="w-full bg-[#432874]/50 hover:bg-[#432874]/70 cursor-not-allowed"
                          disabled
                        >
                          <Clock className="h-4 w-4 mr-2" />
                          Party is exploring...
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                );
              })}
          </div>
        </div>
      )}


      {/* Available Dungeons */}
      <div>
        <h2 className="text-xl font-cinzel font-bold mb-4">Available Dungeons</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {dungeons.map(dungeon => (
            <Dialog key={dungeon.id}>
              <DialogTrigger asChild>
                <motion.div 
                  className="bg-[#1A1A2E] border border-[#432874]/30 rounded-xl overflow-hidden cursor-pointer"
                  whileHover={{ y: -5, boxShadow: '0 5px 20px rgba(67, 40, 116, 0.3)' }}
                  onClick={() => setSelectedDungeon(dungeon)}
                >
                  <div className="relative h-40">
                    <img 
                      src={dungeon.image} 
                      alt={dungeon.name} 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] to-transparent"></div>
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <h3 className="text-xl font-cinzel font-bold text-[#FF9D00]">{dungeon.name}</h3>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-[#C8B8DB]">Level {dungeon.level}</span>
                        <Badge className={
                          dungeon.difficulty === "Easy" ? "bg-green-700/30 text-green-400" :
                          dungeon.difficulty === "Medium" ? "bg-yellow-700/30 text-yellow-400" :
                          "bg-red-700/30 text-red-400"
                        }>
                          {dungeon.difficulty}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-[#C8B8DB]/80 mb-2">{dungeon.description}</p>
                    <div className="text-xs text-[#C8B8DB]/70">
                      <div className="flex items-center mb-1">
                        <Swords className="h-3 w-3 mr-1 text-[#FF9D00]" />
                        <span>Recommended Level: {dungeon.recommendedLevel}+</span>
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-3 w-3 mr-1 text-[#C8B8DB]/80" />
                        <span>Duration: {Math.floor(dungeon.duration / 60)} minutes</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </DialogTrigger>

              <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB] max-w-3xl">
                <DialogHeader>
                  <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">
                    {dungeon.name} - Level {dungeon.level}
                  </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4 md:grid-cols-2">
                  <div>
                    <div className="rounded-lg overflow-hidden mb-4">
                      <img src={dungeon.image} alt={dungeon.name} className="w-full h-48 object-cover" />
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h3 className="text-sm font-bold mb-1">Description</h3>
                        <p className="text-sm text-[#C8B8DB]/80">{dungeon.description}</p>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold mb-1">Rewards</h3>
                        <p className="text-sm text-[#C8B8DB]/80">{dungeon.rewards}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-[#432874]/20 rounded-md p-2">
                          <h3 className="text-xs font-bold mb-1 text-[#C8B8DB]/70">Difficulty</h3>
                          <Badge className={
                            dungeon.difficulty === "Easy" ? "bg-green-700/30 text-green-400" :
                            dungeon.difficulty === "Medium" ? "bg-yellow-700/30 text-yellow-400" :
                            "bg-red-700/30 text-red-400"
                          }>
                            {dungeon.difficulty}
                          </Badge>
                        </div>

                        <div className="bg-[#432874]/20 rounded-md p-2">
                          <h3 className="text-xs font-bold mb-1 text-[#C8B8DB]/70">Duration</h3>
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1 text-[#C8B8DB]/80" />
                            <span className="text-sm">{Math.floor(dungeon.duration / 60)} minutes</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold mb-2">Select Party Members (Up to 4)</h3>
                    <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                      {characters
                        .sort((a, b) => {
                          // Sort function to put available characters first
                          const aUnavailable = (a.isActive && (a.activityType === 'dungeon' || a.activityType === 'forging' || a.activityType === 'farming')) || !a.equippedAuraId;
                          const bUnavailable = (b.isActive && (b.activityType === 'dungeon' || b.activityType === 'forging' || b.activityType === 'farming')) || !b.equippedAuraId;
                          return Number(aUnavailable) - Number(bUnavailable);
                        })
                        .map(character => {
                          const isInDungeon = character.isActive && character.activityType === 'dungeon';
                          const isInForge = character.isActive && character.activityType === 'forging';
                          const isInFarming = character.isActive && character.activityType === 'farming';
                          const hasNoAura = !character.equippedAuraId;
                          const isUnavailable = isInDungeon || isInForge || isInFarming || hasNoAura;

                          return (
                          <div 
                            key={character.id}
                            className={`flex items-center p-2 rounded-md border ${
                              isUnavailable 
                                ? 'border-red-500/30 bg-red-900/10 cursor-not-allowed opacity-70' 
                                : selectedCharacters.includes(character.id)
                                  ? 'bg-[#432874]/40 border-[#FF9D00]/50 cursor-pointer'
                                  : 'bg-[#1F1D36]/50 border-[#432874]/30 cursor-pointer'
                            }`}
                            onClick={() => !isUnavailable && toggleCharacterSelection(character.id)}
                          >
                            <div className="absolute right-2 top-2 flex items-center gap-2">
                              {isUnavailable ? (
                                <Badge variant="outline" className="bg-red-900/20 text-red-400 border-red-500/30">
                                  {hasNoAura ? 'No Aura' : character.activityType}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-green-900/20 text-green-400 border-green-500/30">
                                  Available
                                </Badge>
                              )}
                              {!isUnavailable && (
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="h-6 bg-transparent border-[#432874]/50 hover:bg-[#432874]/20 text-xs"
                                    >
                                      View
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB]">
                                    <DialogHeader>
                                      <DialogTitle className="text-[#FF9D00] font-cinzel">
                                        {character.name} - Level {character.level}
                                      </DialogTitle>
                                    </DialogHeader>
                                    <div className="py-4">
                                      <div className="flex items-center gap-4 mb-4">
                                        <img
                                          src={character.avatarUrl}
                                          alt={character.name}
                                          className="w-16 h-16 rounded-full object-cover border-2 border-[#432874]"
                                        />
                                        <div>
                                          <Badge className={`font-normal ${getClassColor(character.class)}`}>
                                            {character.class}
                                          </Badge>
                                          <div className="mt-2 text-sm text-[#C8B8DB]/80">
                                            Level {character.level}
                                          </div>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="flex items-center">
                                          <Swords className="h-4 w-4 mr-2 text-red-400" />
                                          <span>ATK: {character.attack}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <Shield className="h-4 w-4 mr-2 text-blue-400" />
                                          <span>DEF: {character.defense}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <Heart className="h-4 w-4 mr-2 text-red-500" />
                                          <span>HP: {character.health}</span>
                                        </div>
                                        <div className="flex items-center">
                                          <Zap className="h-4 w-4 mr-2 text-yellow-400" />
                                          <span>SPD: {character.speed}</span>
                                        </div>
                                      </div>

                                      {character.equippedAuraId && (
                                        <div className="mt-4 p-3 bg-[#432874]/20 rounded-lg">
                                          <h4 className="font-semibold mb-2">Equipped Aura</h4>
                                          <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mr-2"></div>
                                            <div>
                                              <div className="text-sm text-[#00B9AE]">
                                                {character.equippedAura?.name || 'Mysterious Aura'}
                                              </div>
                                              <div className="text-xs text-[#C8B8DB]/60">
                                                Level {character.equippedAura?.level || 1}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              )}
                            </div>
                            <img 
                              src={character.avatarUrl}
                              alt={character.name}
                              className={`w-10 h-10 rounded-full object-cover border-2 ${
                                selectedCharacters.includes(character.id) ? 'border-[#FF9D00]' : 'border-[#432874]/50'
                              }`}
                            />
                            <div className="ml-2 flex-1">
                              <div className="flex justify-between">
                                <span className="font-semibold">{character.name}</span>
                                <span className="text-sm">Lvl {character.level}</span>
                              </div>
                              <div className="flex items-center text-xs mt-1">
                                <Swords className="h-3 w-3 mr-1 text-red-400" />
                                <span className="mr-2">ATK: {character.attack}</span>
                                <Shield className="h-3 w-3 mr-1 text-blue-400" />
                                <span className="mr-2">DEF: {character.defense}</span>
                                <Heart className="h-3 w-3 mr-1 text-red-500" />
                                <span className="mr-2">HP: {character.health}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-4">
                      <h3 className="text-sm font-bold mb-2">Selected Party ({selectedCharacters.length}/4)</h3>
                      <div className="flex flex-wrap gap-2">
                        {selectedCharacters.map(charId => {
                          const character = characters.find(c => c.id === charId);
                          return character ? (
                            <img 
                              key={charId}
                              src={character.avatarUrl}
                              alt={character.name}
                              className="w-12 h-12 rounded-full object-cover border-2 border-[#FF9D00]"
                              title={character.name}
                            />
                          ) : null;
                        })}
                        {selectedCharacters.length < 4 && (
                          <div className="w-12 h-12 rounded-full border-2 border-dashed border-[#432874]/50 flex items-center justify-center text-[#432874]/70">
                            <Plus className="h-5 w-5" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
                    onClick={startDungeonRun}
                    disabled={isSubmitting || selectedCharacters.length === 0 || availableCharacters.length === 0}
                  >
                    {isSubmitting ? "Starting Dungeon Run..." : "Start Dungeon Run"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      </div>

      {/* Battle Log Dialog */}
      <BattleLog 
        isOpen={showBattleLog}
        onClose={() => {
          setShowBattleLog(false);
          // Clear battle log when closing to prevent stale data in future battles
          setCurrentBattleLog([]);
        }}
        battleLog={currentBattleLog}
        runId={null}
        onCompleteDungeon={handleCompleteDungeon}
      />
    </>
  );
};

export default DungeonView;