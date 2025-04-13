import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Character, Aura } from '@shared/schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Lock,
  Shield, 
  Swords, 
  Heart, 
  Zap, 
  Brain, 
  Flower2, 
  Clock, 
  Info,
  Flame,
  Droplet,
  Leaf,
  Wind,
  Check,
  Target,
  CircleOff
} from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import CountdownTimer from '../common/CountdownTimer';

interface CharacterCardProps {
  character: Character;
  availableAuras: Aura[];
  refetchAura?: () => void;
  refetchAllAuras?: () => void;
  showDetailed?: boolean;
  allAuras: Aura[];
  equippedAura?: Aura | null;
}

const CharacterCard = ({ 
  character, 
  availableAuras, 
  refetchAura, 
  refetchAllAuras,
  showDetailed = false,
  allAuras = [],
  equippedAura
}: CharacterCardProps) => {
  const [equipAuraDialogOpen, setEquipAuraDialogOpen] = useState(false);
  const [selectedAuraId, setSelectedAuraId] = useState<number | null>(null);
  const [isEquipping, setIsEquipping] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Find aura equipped by this character
  const aura = allAuras.find(a => a.id === character.equippedAuraId);

  // Get skills from aura
  let auraSkills: any[] = [];
  if (aura && aura.skills) {
    try {
      if (typeof aura.skills === 'string') {
        auraSkills = JSON.parse(aura.skills);
      } else if (Array.isArray(aura.skills)) {
        auraSkills = aura.skills;
      }
    } catch (e) {
      console.error('Failed to parse aura skills:', e);
    }
  }

  // Function to calculate status text based on a stat's multiplier
  const getStatModifierText = (statValue: number | null) => {
    if (!statValue) return <span className="text-gray-500">±0%</span>;
    
    if (statValue > 0) {
      return <span className="text-green-500">+{statValue}%</span>;
    } else if (statValue < 0) {
      return <span className="text-red-500">{statValue}%</span>;
    } else {
      return <span className="text-gray-500">±0%</span>;
    }
  };

  const unequippedAuras = availableAuras
    .filter(a => !a.equippedByCharacterId && !a.isFusing)
    .sort((a, b) => (b.level || 0) - (a.level || 0));

  // Function to equip an aura to the character
  const equipAura = async () => {
    if (!selectedAuraId) return;

    setIsEquipping(true);
    try {
      const response = await apiRequest('POST', `/api/characters/${character.id}/equip-aura/${selectedAuraId}`);
      console.log("Equip aura response:", response);
      
      // Update character in place with the new equippedAuraId
      // This ensures we don't have to wait for the query invalidation
      character.equippedAuraId = selectedAuraId;
      
      // Force immediate refresh of ALL related data
      queryClient.invalidateQueries({ queryKey: ['/api/characters'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auras'] });
      queryClient.refetchQueries({ queryKey: ['/api/characters'] });
      queryClient.refetchQueries({ queryKey: ['/api/auras'] });
      
      // We also need to directly refetch the specific aura data
      if (refetchAura) refetchAura();
      if (refetchAllAuras) refetchAllAuras();
      
      // Force fetch for the newly equipped aura
      queryClient.fetchQuery({ 
        queryKey: [`/api/auras/${selectedAuraId}`]
      });
      
      // Wait a moment and then perform a second round of refreshes
      // This handles any potential race conditions
      setTimeout(() => {
        if (refetchAura) refetchAura();
        if (refetchAllAuras) refetchAllAuras();
        queryClient.refetchQueries({ queryKey: ['/api/characters'] });
        console.log("Completed second round of data refreshes");
        
        // Create a simulated cache update for immediate UI feedback
        // This makes the UI show the new aura right away
        const auraToEquip = allAuras.find(a => a.id === selectedAuraId);
        if (auraToEquip) {
          console.log("Using cached aura data for immediate display:", auraToEquip);
          queryClient.setQueryData([`/api/auras/${selectedAuraId}`], auraToEquip);
        }
      }, 500);

      toast({
        title: "Aura equipped",
        description: "The aura has been successfully equipped to your character.",
      });

      setEquipAuraDialogOpen(false);
    } catch (error) {
      console.error('Failed to equip aura:', error);
      toast({
        title: "Failed to equip aura",
        description: "There was an error equipping the aura. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsEquipping(false);
    }
  };

  // Function to get element icon
  const getElementIcon = (element?: string) => {
    if (!element) return null;
    switch (element.toLowerCase()) {
      case 'fire': return <Flame className="h-4 w-4 text-red-500" />;
      case 'water': return <Droplet className="h-4 w-4 text-blue-500" />;
      case 'earth': return <Leaf className="h-4 w-4 text-green-500" />;
      case 'wind': return <Wind className="h-4 w-4 text-cyan-400" />;
      default: return <Flame className="h-4 w-4 text-red-500" />;
    }
  };

  const getClassColor = (characterClass: string) => {
    const classColors: Record<string, string> = {
      'warrior': 'bg-red-700/30 text-red-400',
      'mage': 'bg-blue-700/30 text-blue-400',
      'rogue': 'bg-green-700/30 text-green-400',
      'cleric': 'bg-yellow-700/30 text-yellow-400',
    };

    return classColors[characterClass.toLowerCase()] || 'bg-gray-700/30 text-gray-400';
  };

  // Removed rarity-related function as per new requirements

  const getActivityText = () => {
    if (!character.isActive) return null;

    return (
      <div className="absolute top-2 right-2 flex items-center space-x-1">
        <Badge variant="outline" className="bg-[#DC143C]/20 text-[#DC143C] border-[#DC143C]/30 flex items-center">
          <Lock className="h-3 w-3 mr-1" />
          {character.activityType === 'farming' ? 'Farming' : 'Dungeon'}
          {character.activityEndTime && (
            <>
              <span className="mx-1">•</span>
              <CountdownTimer endTime={character.activityEndTime} />
            </>
          )}
        </Badge>
      </div>
    );
  };

  const getAuraElementClass = (element?: string) => {
    if (!element) return 'bg-gradient-to-r from-gray-500 to-gray-700';
    switch (element.toLowerCase()) {
      case 'fire': return 'bg-gradient-to-r from-red-500 to-orange-500';
      case 'water': return 'bg-gradient-to-r from-blue-500 to-cyan-500';
      case 'earth': return 'bg-gradient-to-r from-green-500 to-lime-500';
      case 'wind': return 'bg-gradient-to-r from-sky-500 to-cyan-500';
      default: return 'bg-gradient-to-r from-purple-500 to-pink-500';
    }
  };

  return (
    <>
      {/* Equip Aura Dialog */}
      <Dialog open={equipAuraDialogOpen} onOpenChange={setEquipAuraDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB]">
          <DialogHeader>
            <DialogTitle className="text-[#FF9D00] font-cinzel">
              Equip Aura to {character.name}
            </DialogTitle>
            <DialogDescription className="text-[#C8B8DB]/80">
              Select an aura to equip to your character. Only unequipped auras are shown.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4">
            {unequippedAuras.length === 0 ? (
              <div className="py-8 text-center text-[#C8B8DB]/60">
                No available auras to equip. Craft new auras in the Forge.
              </div>
            ) : (
              <Select onValueChange={(value) => setSelectedAuraId(Number(value))}>
                <SelectTrigger className="w-full bg-[#1A1A2E] border-[#432874]">
                  <SelectValue placeholder="Select an aura to equip" />
                </SelectTrigger>
                <SelectContent className="bg-[#1A1A2E] border-[#432874]">
                  {unequippedAuras.map((aura) => (
                    <SelectItem key={aura.id} value={aura.id.toString()}>
                      <div className="flex items-center">
                        {getElementIcon(aura.element)} 
                        <span className="ml-2">{aura.name} (Lv.{aura.level})</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedAuraId && (
              <div className="mt-4 p-3 bg-[#432874]/20 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">Selected Aura Details</h4>
                {(() => {
                  const selectedAura = unequippedAuras.find(a => a.id === selectedAuraId);
                  if (!selectedAura) return <div>No aura selected</div>;

                  // Parse skills if they exist
                  const skills = selectedAura.skills ? 
                    typeof selectedAura.skills === 'string' ? 
                      JSON.parse(selectedAura.skills as string) : 
                      selectedAura.skills : 
                    [];

                  return (
                    <div className="text-sm">
                      <div className="flex items-center mb-1">
                        {getElementIcon(selectedAura.element)} 
                        <span className="ml-2 text-[#00B9AE]">{selectedAura.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                        <div>Element: {selectedAura.element}</div>
                        <div>Level: {selectedAura.level}</div>
                        <div>Tier: {selectedAura.tier}</div>
                      </div>

                      {skills && skills.length > 0 && (
                        <div className="mt-2">
                          <h5 className="font-semibold text-xs mb-1">Skills:</h5>
                          <ul className="list-disc pl-4 text-xs space-y-1">
                            {skills.map((skill: any, index: number) => (
                              <li key={index}>{skill.name} - {skill.description}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {(selectedAura.attack !== 0 || selectedAura.accuracy !== 0 || selectedAura.defense !== 0 || 
                        selectedAura.vitality !== 0 || selectedAura.speed !== 0 || selectedAura.focus !== 0 || 
                        selectedAura.resilience !== 0) && (
                        <div className="mt-2">
                          <h5 className="font-semibold text-xs mb-1">Stat Bonuses:</h5>
                          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                            {selectedAura.attack !== 0 && (
                              <div className="flex justify-between">
                                <span>Attack:</span>
                                <span className={selectedAura.attack > 0 ? "text-green-400" : "text-red-400"}>
                                  {selectedAura.attack}%
                                </span>
                              </div>
                            )}
                            {selectedAura.accuracy !== 0 && (
                              <div className="flex justify-between">
                                <span>Accuracy:</span>
                                <span className={selectedAura.accuracy > 0 ? "text-green-400" : "text-red-400"}>
                                  {selectedAura.accuracy}%
                                </span>
                              </div>
                            )}
                            {selectedAura.defense !== 0 && (
                              <div className="flex justify-between">
                                <span>Defense:</span>
                                <span className={selectedAura.defense > 0 ? "text-green-400" : "text-red-400"}>
                                  {selectedAura.defense}%
                                </span>
                              </div>
                            )}
                            {selectedAura.vitality !== 0 && (
                              <div className="flex justify-between">
                                <span>Vitality:</span>
                                <span className={selectedAura.vitality > 0 ? "text-green-400" : "text-red-400"}>
                                  {selectedAura.vitality}%
                                </span>
                              </div>
                            )}
                            {selectedAura.speed !== 0 && (
                              <div className="flex justify-between">
                                <span>Speed:</span>
                                <span className={selectedAura.speed > 0 ? "text-green-400" : "text-red-400"}>
                                  {selectedAura.speed}%
                                </span>
                              </div>
                            )}
                            {selectedAura.focus !== 0 && (
                              <div className="flex justify-between">
                                <span>Focus:</span>
                                <span className={selectedAura.focus > 0 ? "text-green-400" : "text-red-400"}>
                                  {selectedAura.focus}%
                                </span>
                              </div>
                            )}
                            {selectedAura.resilience !== 0 && (
                              <div className="flex justify-between">
                                <span>Resilience:</span>
                                <span className={selectedAura.resilience > 0 ? "text-green-400" : "text-red-400"}>
                                  {selectedAura.resilience}%
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setEquipAuraDialogOpen(false)}
              className="bg-transparent border-[#432874]/50 hover:bg-[#432874]/20"
            >
              Cancel
            </Button>
            <Button 
              onClick={equipAura} 
              disabled={!selectedAuraId || isEquipping}
              className="bg-[#432874] hover:bg-[#432874]/80"
            >
              {isEquipping ? "Equipping..." : "Equip Aura"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <motion.div
        className="bg-[#1A1A2E] rounded-xl overflow-hidden border border-[#432874]/30 relative"
        whileHover={{ y: -5, boxShadow: '0 5px 20px rgba(67, 40, 116, 0.3)' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Activity Indicator */}
        {getActivityText()}

        <div className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={character.avatarUrl}
                alt={character.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-[#432874]"
              />
              <div className="absolute -bottom-1 -right-1 bg-[#1A1A2E] rounded-full p-0.5 border border-[#432874]">
                <div className="bg-[#432874] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                  {character.level}
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-cinzel font-bold text-lg text-[#C8B8DB]">
                {character.name}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <Badge className={`font-normal ${getClassColor(character.class)}`}>
                  {character.class}
                </Badge>
                <span className="text-xs text-[#C8B8DB]/80">
                  Level {character.level || 1}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-xs">
            <div className="flex items-center">
              <Swords className="h-3 w-3 mr-1 text-red-400" />
              <span>ATK: {character.attack}</span>
            </div>
            <div className="flex items-center">
              <Target className="h-3 w-3 mr-1 text-yellow-400" />
              <span>ACC: {character.accuracy}</span>
            </div>
            <div className="flex items-center">
              <Shield className="h-3 w-3 mr-1 text-blue-400" />
              <span>DEF: {character.defense}</span>
            </div>
            <div className="flex items-center">
              <Heart className="h-3 w-3 mr-1 text-red-500" />
              <span>VIT: {character.vitality}</span>
            </div>
            <div className="flex items-center">
              <Zap className="h-3 w-3 mr-1 text-cyan-400" />
              <span>SPD: {character.speed}</span>
            </div>
            <div className="flex items-center">
              <Brain className="h-3 w-3 mr-1 text-purple-400" />
              <span>FOC: {character.focus || 0}</span>
            </div>
            <div className="flex items-center">
              <CircleOff className="h-3 w-3 mr-1 text-purple-400" />
              <span>RES: {character.resilience || 0}</span>
            </div>
            {character.passiveSkills && Array.isArray(character.passiveSkills) && character.passiveSkills.length > 0 && (
              <div className="flex items-center">
                <Check className="h-3 w-3 mr-1 text-green-400" />
                <span>
                  {character.passiveSkills.length} passive{character.passiveSkills.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {showDetailed && (
            <div className="mt-4 space-y-4">
              <div className="space-y-4">
                {aura || equippedAura ? (
                  <>
                    {/* Equipped Aura Details */}
                    <div className="bg-[#432874]/20 rounded-lg p-3 mb-4">
                      <h4 className="font-semibold text-sm mb-2 text-[#00B9AE]">Aura Skills</h4>
                      <div className="space-y-2">
                        {auraSkills.length > 0 ? (
                          auraSkills.map((skill, index) => (
                            <div key={index} className="border-b border-[#432874]/30 pb-2 last:border-b-0 last:pb-0">
                              <div className="text-xs font-medium text-[#00B9AE]">{skill.name}</div>
                              <div className="text-xs text-[#C8B8DB]/80">{skill.description}</div>
                              <div className="flex justify-between mt-1 text-xs text-[#C8B8DB]/60">
                                <span>Type: {skill.type}</span>
                                <span>Targets: {skill.targets || 1}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-[#C8B8DB]/60">No skills available</div>
                        )}
                      </div>
                    </div>

                    {/* Equipped Aura Stats */}
                    <div className="bg-[#432874]/20 rounded-lg p-3">
                      <h4 className="font-semibold text-sm mb-2">Equipped Aura</h4>
                      <div>
                        <div className="flex items-center mb-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${getAuraElementClass((aura || equippedAura)?.element)}`}>
                            {getElementIcon((aura || equippedAura)?.element)}
                          </div>
                          <div>
                            <div className="text-sm text-[#00B9AE]">
                              {(aura || equippedAura)?.name}
                            </div>
                            <div className="text-xs text-[#C8B8DB]/60">
                              {(aura || equippedAura)?.element} • 
                              Level {(aura || equippedAura)?.level} • 
                              Tier {(aura || equippedAura)?.tier || 1}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 border-t border-[#432874]/30 pt-2">
                          <div className="text-xs font-medium text-[#00B9AE] mb-1">Stats:</div>
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Swords className="h-3 w-3 mr-1 text-red-400" />
                                  <span className="text-xs">Attack</span>
                                </div>
                                <div className="text-xs">
                                  {getStatModifierText((aura || equippedAura)?.attack)}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Target className="h-3 w-3 mr-1 text-yellow-400" />
                                  <span className="text-xs">Accuracy</span>
                                </div>
                                <div className="text-xs">
                                  {getStatModifierText((aura || equippedAura)?.accuracy)}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Shield className="h-3 w-3 mr-1 text-blue-400" />
                                  <span className="text-xs">Defense</span>
                                </div>
                                <div className="text-xs">
                                  {getStatModifierText((aura || equippedAura)?.defense)}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Heart className="h-3 w-3 mr-1 text-red-500" />
                                  <span className="text-xs">Vitality</span>
                                </div>
                                <div className="text-xs">
                                  {getStatModifierText((aura || equippedAura)?.vitality)}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Zap className="h-3 w-3 mr-1 text-cyan-400" />
                                  <span className="text-xs">Speed</span>
                                </div>
                                <div className="text-xs">
                                  {getStatModifierText((aura || equippedAura)?.speed)}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <Brain className="h-3 w-3 mr-1 text-purple-400" />
                                  <span className="text-xs">Focus</span>
                                </div>
                                <div className="text-xs">
                                  {getStatModifierText((aura || equippedAura)?.focus)}
                                </div>
                              </div>

                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <CircleOff className="h-3 w-3 mr-1 text-purple-400" />
                                  <span className="text-xs">Resilience</span>
                                </div>
                                <div className="text-xs">
                                  {getStatModifierText((aura || equippedAura)?.resilience)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-[#C8B8DB]/60">No Aura Equipped</div>
                )}

                <div className="mt-4 flex justify-end space-x-2">
                  {!character.isActive && (
                    <>
                      <Button 
                        variant="outline" 
                        className="bg-transparent border-[#432874]/50 hover:bg-[#432874]/20"
                        onClick={() => setEquipAuraDialogOpen(true)}
                      >
                        Equip Aura
                      </Button>
                      <Button className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]">
                        Assign Task
                      </Button>
                    </>
                  )}
                  {character.isActive && (
                    <div className="flex items-center text-[#DC143C]">
                      <Lock className="h-4 w-4 mr-1" />
                      <span>
                        Busy: {character.activityType} 
                        {character.activityEndTime && (
                          <span className="ml-1">
                            (<CountdownTimer endTime={character.activityEndTime} />)
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
};

export default CharacterCard;