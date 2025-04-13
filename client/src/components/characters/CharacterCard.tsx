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
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CountdownTimer from '../common/CountdownTimer';

interface CharacterCardProps {
  character: Character;
}

const CharacterCard = ({ character }: CharacterCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const [equipAuraDialogOpen, setEquipAuraDialogOpen] = useState(false);
  const [selectedAuraId, setSelectedAuraId] = useState<number | null>(null);
  const [isEquipping, setIsEquipping] = useState(false);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch aura details if character has an equipped aura
  const { data: aura } = useQuery<Aura>({ 
    queryKey: character.equippedAuraId ? ['/api/auras', character.equippedAuraId] : [],
    enabled: !!character.equippedAuraId
  });

  // Fetch all available auras for equipping
  const { data: availableAuras = [] } = useQuery<Aura[]>({
    queryKey: ['/api/auras'],
    enabled: equipAuraDialogOpen
  });

  // Get auras that are not equipped by any character, sorted by level (highest first)
  const unequippedAuras = availableAuras
    .filter(a => !a.equippedByCharacterId && !a.isFusing)
    .sort((a, b) => (b.level || 0) - (a.level || 0));

  // Function to equip an aura to the character
  const equipAura = async () => {
    if (!selectedAuraId) return;

    setIsEquipping(true);
    try {
      await apiRequest('POST', `/api/characters/${character.id}/equip-aura/${selectedAuraId}`);

      // Invalidate character and aura queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/characters'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auras'] });

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
                <span className="text-green-400">Passive{character.passiveSkills.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-[#432874]/30 flex justify-between items-center">
            {character.equippedAuraId ? (
              <div className="flex items-center text-xs">
                <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mr-1"></div>
                <span className="text-[#00B9AE]">
                  {aura ? `${aura.name || (aura.element ? `${aura.element} Aura` : 'Mysterious Aura')} (Lv.${aura.level || 1})` : 'Aura Equipped'}
                </span>
              </div>
            ) : (
              <div className="text-xs text-[#C8B8DB]/60">No Aura Equipped</div>
            )}

            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 bg-transparent border-[#432874]/50 hover:bg-[#432874]/20"
                  disabled={character.isActive ? true : false}
                >
                  <Info className="h-3 w-3 mr-1" /> Details
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB]">
                <DialogHeader>
                  <DialogTitle className="text-[#FF9D00] font-cinzel text-xl flex items-center">
                    <img
                      src={character.avatarUrl}
                      alt={character.name}
                      className="w-8 h-8 rounded-full object-cover border border-[#FF9D00] mr-2"
                    />
                    {character.name}
                  </DialogTitle>
                </DialogHeader>

                <div className="py-4">
                  <div className="flex justify-between mb-4">
                    <Badge className={`${getClassColor(character.class)}`}>{character.class}</Badge>
                    <div className="text-sm text-[#C8B8DB]/80">
                      Level {character.level || 1}
                    </div>
                  </div>

                  <div className="mb-4">
                    <h4 className="font-semibold mb-3 text-[#C8B8DB] border-b border-[#432874]/30 pb-1">Character Stats</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Stat bar displays with tooltip */}
                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <div className="flex items-center">
                              <Swords className="h-3 w-3 mr-1 text-red-400" />
                              <span>Attack</span>
                            </div>
                            <span>{character.attack}</span>
                          </div>
                          <div className="h-2 bg-[#432874]/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-red-500 to-red-400" 
                              style={{ width: `${Math.min(100, ((character.attack || 0) / 100) * 100)}%` }}
                            ></div>
                          </div>
                          {character.passiveSkills && Array.isArray(character.passiveSkills) && 
                           character.passiveSkills.some(skill => 
                             typeof skill === 'object' && skill && 'name' in skill && 
                             String(skill.name).toLowerCase().includes('attack')
                           ) && (
                            <div className="text-xs text-green-500 mt-1">+Passive Bonus</div>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <div className="flex items-center">
                              <Target className="h-3 w-3 mr-1 text-yellow-400" />
                              <span>Accuracy</span>
                            </div>
                            <span>{character.accuracy}</span>
                          </div>
                          <div className="h-2 bg-[#432874]/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-yellow-500 to-yellow-400" 
                              style={{ width: `${Math.min(100, ((character.accuracy || 0) / 100) * 100)}%` }}
                            ></div>
                          </div>
                          {character.passiveSkills && Array.isArray(character.passiveSkills) && 
                           character.passiveSkills.some(skill => 
                             typeof skill === 'object' && skill && 'name' in skill && 
                             String(skill.name).toLowerCase().includes('accuracy')
                           ) && (
                            <div className="text-xs text-green-500 mt-1">+Passive Bonus</div>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <div className="flex items-center">
                              <Shield className="h-3 w-3 mr-1 text-blue-400" />
                              <span>Defense</span>
                            </div>
                            <span>{character.defense}</span>
                          </div>
                          <div className="h-2 bg-[#432874]/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-blue-400" 
                              style={{ width: `${Math.min(100, ((character.defense || 0) / 100) * 100)}%` }}
                            ></div>
                          </div>
                          {character.passiveSkills && Array.isArray(character.passiveSkills) && 
                           character.passiveSkills.some(skill => 
                             typeof skill === 'object' && skill && 'name' in skill && 
                             String(skill.name).toLowerCase().includes('defense')
                           ) && (
                            <div className="text-xs text-green-500 mt-1">+Passive Bonus</div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <div className="flex items-center">
                              <Heart className="h-3 w-3 mr-1 text-red-500" />
                              <span>Vitality</span>
                            </div>
                            <span>{character.vitality}</span>
                          </div>
                          <div className="h-2 bg-[#432874]/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-red-500 to-red-300" 
                              style={{ width: `${Math.min(100, ((character.vitality || 0) / 100) * 100)}%` }}
                            ></div>
                          </div>
                          {character.passiveSkills && Array.isArray(character.passiveSkills) && 
                           character.passiveSkills.some(skill => 
                             typeof skill === 'object' && skill && 'name' in skill && 
                             String(skill.name).toLowerCase().includes('vitality')
                           ) && (
                            <div className="text-xs text-green-500 mt-1">+Passive Bonus</div>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <div className="flex items-center">
                              <Zap className="h-3 w-3 mr-1 text-cyan-400" />
                              <span>Speed</span>
                            </div>
                            <span>{character.speed}</span>
                          </div>
                          <div className="h-2 bg-[#432874]/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400" 
                              style={{ width: `${Math.min(100, ((character.speed || 0) / 100) * 100)}%` }}
                            ></div>
                          </div>
                          {character.passiveSkills && Array.isArray(character.passiveSkills) && 
                           character.passiveSkills.some(skill => 
                             typeof skill === 'object' && skill && 'name' in skill && 
                             String(skill.name).toLowerCase().includes('speed')
                           ) && (
                            <div className="text-xs text-green-500 mt-1">+Passive Bonus</div>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <div className="flex items-center">
                              <CircleOff className="h-3 w-3 mr-1 text-purple-400" />
                              <span>Resilience</span>
                            </div>
                            <span>{character.resilience || 0}</span>
                          </div>
                          <div className="h-2 bg-[#432874]/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-purple-400" 
                              style={{ width: `${Math.min(100, ((character.resilience || 0) / 100) * 100)}%` }}
                            ></div>
                          </div>
                          {character.passiveSkills && Array.isArray(character.passiveSkills) && 
                           character.passiveSkills.some(skill => 
                             typeof skill === 'object' && skill && 'name' in skill && 
                             String(skill.name).toLowerCase().includes('resilience')
                           ) && (
                            <div className="text-xs text-green-500 mt-1">+Passive Bonus</div>
                          )}
                        </div>

                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <div className="flex items-center">
                              <Brain className="h-3 w-3 mr-1 text-purple-400" />
                              <span>Focus</span>
                            </div>
                            <span>{character.focus || 0}</span>
                          </div>
                          <div className="h-2 bg-[#432874]/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-indigo-400" 
                              style={{ width: `${Math.min(100, ((character.focus || 0) / 100) * 100)}%` }}
                            ></div>
                          </div>
                          {character.passiveSkills && Array.isArray(character.passiveSkills) && 
                           character.passiveSkills.some(skill => 
                             typeof skill === 'object' && skill && 'name' in skill && 
                             String(skill.name).toLowerCase().includes('focus')
                           ) && (
                            <div className="text-xs text-green-500 mt-1">+Passive Bonus</div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Aura Bonuses */}
                    {aura && (
                      <div className="mt-4 pt-3 border-t border-[#432874]/30">
                        <div className="flex items-center mb-2">
                          <div className="w-4 h-4 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 mr-2"></div>
                          <span className="text-sm text-[#00B9AE]">Aura Bonuses</span>
                        </div>
                        <div className="text-xs text-[#C8B8DB]/80 space-y-1">
                          {/* Display direct stat values */}
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2">
                            {aura.attack !== null && aura.attack !== undefined && aura.attack !== 0 && (
                              <div className="flex items-center">
                                <Swords className="h-3 w-3 mr-1 text-red-400" />
                                <span>
                                  Attack: <span className={aura.attack > 0 ? "text-green-400" : "text-red-400"}>
                                    {aura.attack > 0 ? "+" : ""}{aura.attack}%
                                  </span>
                                </span>
                              </div>
                            )}
                            {aura.accuracy !== null && aura.accuracy !== undefined && aura.accuracy !== 0 && (
                              <div className="flex items-center">
                                <Target className="h-3 w-3 mr-1 text-yellow-400" />
                                <span>
                                  Accuracy: <span className={aura.accuracy > 0 ? "text-green-400" : "text-red-400"}>
                                    {aura.accuracy > 0 ? "+" : ""}{aura.accuracy}%
                                  </span>
                                </span>
                              </div>
                            )}
                            {aura.defense !== null && aura.defense !== undefined && (
                              <div className="flex items-center">
                                <Shield className="h-3 w-3 mr-1 text-blue-400" />
                                <span>Defense: +{aura.defense}</span>
                              </div>
                            )}
                            {aura.vitality !== null && aura.vitality !== undefined && (
                              <div className="flex items-center">
                                <Heart className="h-3 w-3 mr-1 text-red-500" />
                                <span>Vitality: +{aura.vitality}</span>
                              </div>
                            )}
                            {aura.speed !== null && aura.speed !== undefined && (
                              <div className="flex items-center">
                                <Zap className="h-3 w-3 mr-1 text-cyan-400" />
                                <span>Speed: +{aura.speed}</span>
                              </div>
                            )}
                            {aura.focus !== null && aura.focus !== undefined && (
                              <div className="flex items-center">
                                <Brain className="h-3 w-3 mr-1 text-purple-400" />
                                <span>Focus: +{aura.focus}</span>
                              </div>
                            )}
                            {aura.resilience !== null && aura.resilience !== undefined && (
                              <div className="flex items-center">
                                <CircleOff className="h-3 w-3 mr-1 text-purple-400" />
                                <span>Resilience: +{aura.resilience}</span>
                              </div>
                            )}
                          </div>

                          {/* Note: Stat bonuses are now displayed directly in the attributes above */}
                        </div>
                      </div>
                    )}
                  </div>

                  {character.passiveSkills && Array.isArray(character.passiveSkills) && character.passiveSkills.length > 0 && (
                    <div className="bg-[#432874]/20 rounded-lg p-3 mb-4">
                      <h4 className="font-semibold mb-2 text-[#C8B8DB]">Passive Skills</h4>
                      <div className="space-y-2">
                        {character.passiveSkills.map((skill, index) => (
                          <div key={index} className="border-b border-[#432874]/30 pb-2 last:border-b-0 last:pb-0">
                            {typeof skill === 'object' && skill && 'name' in skill && 'description' in skill ? (
                              <>
                                <p className="text-sm font-medium text-[#00B9AE]">{String(skill.name)}</p>
                                <p className="text-xs text-[#C8B8DB]/80 mt-1">{String(skill.description)}</p>
                              </>
                            ) : (
                              <p className="text-sm">{typeof skill === 'string' ? skill : 'Unknown Skill'}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="bg-[#432874]/20 rounded-lg p-3">
                    <h4 className="font-semibold mb-2 text-[#C8B8DB]">Equipped Aura</h4>
                    {character.equippedAuraId ? (
                      <div className="flex items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-2 ${getAuraElementClass(aura?.element)}`}>
                          {aura && getElementIcon(aura.element)}
                        </div>
                        <div>
                          <div className="text-sm text-[#00B9AE]">
                            {aura ? `${aura.name || (aura.element ? `${aura.element} Aura` : 'Mysterious Aura')}` : 'Aura Equipped'}
                          </div>
                          <div className="text-xs text-[#C8B8DB]/60">
                            {aura ? `Level ${aura.level || 1} • Tier ${aura.tier || 1}` : 'Loading...'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-[#C8B8DB]/60">No Aura Equipped</div>
                    )}
                  </div>

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
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default CharacterCard;