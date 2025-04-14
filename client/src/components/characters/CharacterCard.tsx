import { motion } from 'framer-motion';
import { useState } from 'react';
import type { Character, Aura } from '@shared/schema';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import TooltipWrapper from '@/components/common/TooltipWrapper';
import { 
  Lock,
  Shield, 
  Swords, 
  Heart, 
  Zap, 
  Brain, 
  Flower2, 
  Clock,
  Star,
  Bolt,
  Flame, 
  Info,
  Droplet,
  Leaf,
  Wind,
  Check,
  Target,
  ChevronRight,
  Sparkles,
  Loader2,
  CircleOff,
  Eye,
  Anchor,
  Droplets
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
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [duplicatesDialogOpen, setDuplicatesDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [selectedAuraId, setSelectedAuraId] = useState<number | null>(null);
  const [isEquipping, setIsEquipping] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  
  // Mock data for character duplicates and soul shards - will need to be updated with real data later
  const [duplicateCount, setDuplicateCount] = useState(Math.floor(Math.random() * 5)); // Placeholder
  const [soulShardCount, setSoulShardCount] = useState(Math.floor(Math.random() * 100)); // Placeholder
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
  
  // Calculate stat values with aura modifiers applied
  const getAdjustedStat = (baseStat: number | null, auraStat: number | null): number => {
    if (!baseStat) return 0;
    if (!auraStat) return baseStat;
    
    // Apply percentage modifier from aura
    const adjustedValue = Math.round(baseStat * (1 + auraStat / 100));
    return adjustedValue;
  };

  const unequippedAuras = availableAuras 
    ? availableAuras
        .filter(a => !a.equippedByCharacterId && !a.isFusing)
        .sort((a, b) => (b.level || 0) - (a.level || 0))
    : [];

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

  // Function to get activity text
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
  
  // Function to generate skill logic text from skill properties
  const generateSkillLogic = (skill: any): string => {
    let logic = '';
    
    // Special case for Soothing Current
    if (skill.name === "Soothing Current") {
      return `${skill.damage}x Damage to 1 Target and Heal the lowest HP Ally for ${skill.healing || 5}% of the Caster's Max Health`;
    }
    
    // Damage component
    if (skill.damage) {
      logic += `${skill.damage}x Damage to ${skill.targets || 1} Target${skill.targets > 1 ? 's' : ''}`;
    }
    
    // Healing component
    if (skill.healing) {
      if (logic) logic += ' and ';
      
      let healingText = `Heal `;
      if (skill.healTargetType === "lowest") {
        healingText += "the lowest HP Ally";
      } else if (skill.healTargetType === "all") {
        healingText += "all Allies";
      } else {
        healingText += `${skill.healTargets || 1} Target${(skill.healTargets || 1) > 1 ? 's' : ''}`;
      }
      
      healingText += ` for ${skill.healing}% of `;
      healingText += "the Caster's Max Health";
      
      logic += healingText;
    }
    
    // Effect component
    if (skill.effect) {
      if (logic) logic += ' and ';
      logic += `Apply ${skill.effect}`;
      if (skill.effectStacks) logic += ` (${skill.effectStacks} stacks)`;
      if (skill.effectChance && skill.effectChance < 100) logic += ` with ${skill.effectChance}% chance`;
    }
    

    
    // Special case for known skills that need hardcoded logic
    if (skill.name === "Soothing Current" && !logic) {
      return `${skill.damage || 0.8}x Damage to 1 Target and Heal the lowest HP Ally for ${skill.healing || 5}% of the Caster's Max Health`;
    }
    
    // If we couldn't generate logic, use description as fallback
    if (!logic && skill.description) {
      return skill.description;
    }
    
    return logic || 'Attack a single target';
  };
  
  // Function to upgrade character level
  const upgradeCharacter = async () => {
    setIsUpgrading(true);
    try {
      // Calculate requirements based on character level
      const currentLevel = character.level || 1;
      const requiredShards = currentLevel * 5;
      const requiredEssence = currentLevel * 100;
      
      // Mock API call for now - will be replaced with actual API endpoint
      console.log(`Upgrading character ${character.name} from level ${currentLevel} to ${currentLevel + 1}`);
      console.log(`Required: ${requiredShards} Soul Shards, ${requiredEssence} Essence`);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Update character level locally for immediate feedback
      character.level = currentLevel + 1;
      
      // Update local state for soul shards
      setSoulShardCount(prev => prev - requiredShards);
      
      // Force refresh of characters data
      queryClient.invalidateQueries({ queryKey: ['/api/characters'] });
      
      toast({
        title: "Character Upgraded",
        description: `${character.name} is now level ${character.level}!`,
      });
      
      setUpgradeDialogOpen(false);
    } catch (error) {
      console.error('Failed to upgrade character:', error);
      toast({
        title: "Upgrade Failed",
        description: "There was an error upgrading the character. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <>
      {/* Equip Aura Dialog */}
      <Dialog open={equipAuraDialogOpen} onOpenChange={setEquipAuraDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB] max-w-5xl max-h-[90vh] overflow-y-auto">
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {unequippedAuras.map((aura) => (
                  <div
                    key={aura.id}
                    className={`p-4 rounded-lg border transition-all cursor-pointer ${
                      selectedAuraId === aura.id
                        ? "border-[#FF9D00] bg-[#432874]/40"
                        : "border-[#432874]/40 bg-[#1A1A2E] hover:bg-[#432874]/20"
                    }`}
                    onClick={() => setSelectedAuraId(aura.id)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        {getElementIcon(aura.element)} 
                        <span className="ml-2 font-semibold text-[#FF9D00]">{aura.name}</span>
                      </div>
                      <span className="text-xs px-2 py-0.5 bg-[#432874]/60 rounded-full">Level {aura.level}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs mt-3">
                      {aura.attack !== null && aura.attack !== 0 && (
                        <div className="flex items-center">
                          <Swords className="h-3 w-3 mr-1 text-red-400" />
                          <span>ATK: {aura.attack && aura.attack > 0 ? '+' : ''}{aura.attack}%</span>
                        </div>
                      )}
                      {aura.vitality !== null && aura.vitality !== 0 && (
                        <div className="flex items-center">
                          <Heart className="h-3 w-3 mr-1 text-red-400" />
                          <span>VIT: {aura.vitality && aura.vitality > 0 ? '+' : ''}{aura.vitality}%</span>
                        </div>
                      )}
                      {aura.speed !== null && aura.speed !== 0 && (
                        <div className="flex items-center">
                          <Zap className="h-3 w-3 mr-1 text-yellow-400" />
                          <span>SPD: {aura.speed && aura.speed > 0 ? '+' : ''}{aura.speed}%</span>
                        </div>
                      )}
                      {aura.accuracy !== null && aura.accuracy !== 0 && (
                        <div className="flex items-center">
                          <Target className="h-3 w-3 mr-1 text-blue-400" />
                          <span>ACC: {aura.accuracy && aura.accuracy > 0 ? '+' : ''}{aura.accuracy}%</span>
                        </div>
                      )}
                      {aura.defense !== null && aura.defense !== 0 && (
                        <div className="flex items-center">
                          <Shield className="h-3 w-3 mr-1 text-green-400" />
                          <span>DEF: {aura.defense && aura.defense > 0 ? '+' : ''}{aura.defense}%</span>
                        </div>
                      )}
                      {aura.focus !== null && aura.focus !== 0 && (
                        <div className="flex items-center">
                          <Eye className="h-3 w-3 mr-1 text-indigo-400" />
                          <span>FOC: {aura.focus && aura.focus > 0 ? '+' : ''}{aura.focus}%</span>
                        </div>
                      )}
                      {aura.resilience !== null && aura.resilience !== 0 && (
                        <div className="flex items-center">
                          <Anchor className="h-3 w-3 mr-1 text-purple-400" />
                          <span>RES: {aura.resilience && aura.resilience > 0 ? '+' : ''}{aura.resilience}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
                                <span className={selectedAura.attack && selectedAura.attack > 0 ? "text-green-400" : "text-red-400"}>
                                  {selectedAura.attack}%
                                </span>
                              </div>
                            )}
                            {selectedAura.accuracy !== 0 && (
                              <div className="flex justify-between">
                                <span>Accuracy:</span>
                                <span className={selectedAura.accuracy && selectedAura.accuracy > 0 ? "text-green-400" : "text-red-400"}>
                                  {selectedAura.accuracy}%
                                </span>
                              </div>
                            )}
                            {selectedAura.defense !== 0 && (
                              <div className="flex justify-between">
                                <span>Defense:</span>
                                <span className={selectedAura.defense && selectedAura.defense > 0 ? "text-green-400" : "text-red-400"}>
                                  {selectedAura.defense}%
                                </span>
                              </div>
                            )}
                            {selectedAura.vitality !== 0 && (
                              <div className="flex justify-between">
                                <span>Vitality:</span>
                                <span className={selectedAura.vitality && selectedAura.vitality > 0 ? "text-green-400" : "text-red-400"}>
                                  {selectedAura.vitality}%
                                </span>
                              </div>
                            )}
                            {selectedAura.speed !== 0 && (
                              <div className="flex justify-between">
                                <span>Speed:</span>
                                <span className={selectedAura.speed && selectedAura.speed > 0 ? "text-green-400" : "text-red-400"}>
                                  {selectedAura.speed}%
                                </span>
                              </div>
                            )}
                            {selectedAura.focus !== 0 && (
                              <div className="flex justify-between">
                                <span>Focus:</span>
                                <span className={selectedAura.focus && selectedAura.focus > 0 ? "text-green-400" : "text-red-400"}>
                                  {selectedAura.focus}%
                                </span>
                              </div>
                            )}
                            {selectedAura.resilience !== 0 && (
                              <div className="flex justify-between">
                                <span>Resilience:</span>
                                <span className={selectedAura.resilience && selectedAura.resilience > 0 ? "text-green-400" : "text-red-400"}>
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

      {/* Character Details Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB] max-w-3xl">
          <DialogHeader>
            <DialogTitle className="text-[#FF9D00] font-cinzel">
              {character.name} - Level {character.level} {character.class}
            </DialogTitle>
            <DialogDescription className="text-[#C8B8DB]/80">
              Character details and equipped aura information
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4 space-y-6">
            {/* Character stats and details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <img
                      src={character.avatarUrl}
                      alt={character.name}
                      className="w-24 h-24 rounded-full object-cover border-2 border-[#432874]"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-[#1A1A2E] rounded-full p-0.5 border border-[#432874]">
                      <div className="bg-[#432874] text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                        {character.level}
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-cinzel font-bold text-xl text-[#C8B8DB]">
                      {character.name}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={`font-normal ${getClassColor(character.class)}`}>
                        {character.class}
                      </Badge>
                      <span className="text-sm text-[#C8B8DB]/80">
                        Level {character.level || 1}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 bg-[#432874]/20 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Swords className="h-4 w-4 text-red-400" />
                    <div className="flex flex-col">
                      <span className="text-xs text-[#C8B8DB]/60">Attack</span>
                      <span className="font-medium">
                        {aura ? getAdjustedStat(character.attack, aura.attack) : character.attack}
                        {aura && aura.attack !== 0 && (
                          <span className="ml-1 text-xs text-[#C8B8DB]/60">
                            ({getStatModifierText(aura.attack)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-yellow-400" />
                    <div className="flex flex-col">
                      <span className="text-xs text-[#C8B8DB]/60">Accuracy</span>
                      <span className="font-medium">
                        {aura ? getAdjustedStat(character.accuracy, aura.accuracy) : character.accuracy}
                        {aura && aura.accuracy !== 0 && (
                          <span className="ml-1 text-xs text-[#C8B8DB]/60">
                            ({getStatModifierText(aura.accuracy)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <div className="flex flex-col">
                      <span className="text-xs text-[#C8B8DB]/60">Defense</span>
                      <span className="font-medium">
                        {aura ? getAdjustedStat(character.defense, aura.defense) : character.defense}
                        {aura && aura.defense !== 0 && (
                          <span className="ml-1 text-xs text-[#C8B8DB]/60">
                            ({getStatModifierText(aura.defense)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <div className="flex flex-col">
                      <span className="text-xs text-[#C8B8DB]/60">Vitality</span>
                      <span className="font-medium">
                        {aura ? getAdjustedStat(character.vitality, aura.vitality) : character.vitality}
                        {aura && aura.vitality !== 0 && (
                          <span className="ml-1 text-xs text-[#C8B8DB]/60">
                            ({getStatModifierText(aura.vitality)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4 text-cyan-400" />
                    <div className="flex flex-col">
                      <span className="text-xs text-[#C8B8DB]/60">Speed</span>
                      <span className="font-medium">
                        {aura ? getAdjustedStat(character.speed, aura.speed) : character.speed}
                        {aura && aura.speed !== 0 && (
                          <span className="ml-1 text-xs text-[#C8B8DB]/60">
                            ({getStatModifierText(aura.speed)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Brain className="h-4 w-4 text-purple-400" />
                    <div className="flex flex-col">
                      <span className="text-xs text-[#C8B8DB]/60">Focus</span>
                      <span className="font-medium">
                        {aura ? getAdjustedStat(character.focus || 0, aura.focus) : character.focus || 0}
                        {aura && aura.focus !== 0 && (
                          <span className="ml-1 text-xs text-[#C8B8DB]/60">
                            ({getStatModifierText(aura.focus)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <CircleOff className="h-4 w-4 text-purple-400" />
                    <div className="flex flex-col">
                      <span className="text-xs text-[#C8B8DB]/60">Resilience</span>
                      <span className="font-medium">
                        {aura ? getAdjustedStat(character.resilience || 0, aura.resilience) : character.resilience || 0}
                        {aura && aura.resilience !== 0 && (
                          <span className="ml-1 text-xs text-[#C8B8DB]/60">
                            ({getStatModifierText(aura.resilience)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-4">
                {aura || equippedAura ? (
                  <>
                    <div className="bg-[#432874]/20 rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-2 text-[#00B9AE]">Equipped Aura</h4>
                      <div className="flex items-center mb-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${getAuraElementClass((aura || equippedAura)?.element)}`}>
                          {getElementIcon((aura || equippedAura)?.element)}
                        </div>
                        <div>
                          <div className="text-[#00B9AE] font-semibold">{(aura || equippedAura)?.name}</div>
                          <div className="text-xs text-[#C8B8DB]/80">
                            Level {(aura || equippedAura)?.level} • Tier {(aura || equippedAura)?.tier} • {(aura || equippedAura)?.element}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Swords className="h-3 w-3 mr-1 text-red-400" />
                            <span className="text-xs">Attack</span>
                          </div>
                          <div className="text-xs">
                            {getStatModifierText((aura || equippedAura)?.attack || null)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Target className="h-3 w-3 mr-1 text-yellow-400" />
                            <span className="text-xs">Accuracy</span>
                          </div>
                          <div className="text-xs">
                            {getStatModifierText((aura || equippedAura)?.accuracy || null)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Shield className="h-3 w-3 mr-1 text-blue-400" />
                            <span className="text-xs">Defense</span>
                          </div>
                          <div className="text-xs">
                            {getStatModifierText((aura || equippedAura)?.defense || null)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Heart className="h-3 w-3 mr-1 text-red-500" />
                            <span className="text-xs">Vitality</span>
                          </div>
                          <div className="text-xs">
                            {getStatModifierText((aura || equippedAura)?.vitality || null)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Zap className="h-3 w-3 mr-1 text-cyan-400" />
                            <span className="text-xs">Speed</span>
                          </div>
                          <div className="text-xs">
                            {getStatModifierText((aura || equippedAura)?.speed || null)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <Brain className="h-3 w-3 mr-1 text-purple-400" />
                            <span className="text-xs">Focus</span>
                          </div>
                          <div className="text-xs">
                            {getStatModifierText((aura || equippedAura)?.focus || null)}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex items-center">
                            <CircleOff className="h-3 w-3 mr-1 text-purple-400" />
                            <span className="text-xs">Resilience</span>
                          </div>
                          <div className="text-xs">
                            {getStatModifierText((aura || equippedAura)?.resilience || null)}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-[#432874]/20 rounded-lg p-4">
                      <h4 className="font-semibold text-sm mb-2 text-[#00B9AE]">Aura Skills</h4>
                      <div className="space-y-2">
                        {auraSkills.length > 0 ? (
                          auraSkills.map((skill: any, index) => (
                            <div key={index} className="border-b border-[#432874]/30 pb-3 last:border-b-0 last:pb-0">
                              <div className="flex justify-between items-center">
                                <div className="text-xs font-medium text-[#00B9AE]">{skill.name}</div>
                                <div className="text-xs px-2 py-0.5 rounded-full bg-[#432874]/40 text-[#00B9AE]">
                                  Level {skill.level || 1}
                                </div>
                              </div>

                              {/* Full skill logic */}
                              <div className="text-xs text-amber-300 mt-1 italic">
                                "{skill.logic || generateSkillLogic(skill)}"
                              </div>
                              
                              <div className="text-xs text-[#C8B8DB]/80 mt-1">{skill.description}</div>
                              
                              {/* Enhanced skill details */}
                              <div className="mt-2 text-xs">
                                {skill.damage && (
                                  <div className="flex items-center">
                                    <Swords className="h-3 w-3 mr-1 text-red-400" />
                                    <span className="text-[#C8B8DB]/80">
                                      Damage Multiplier: <span className="text-amber-400">{skill.damage}x</span> (Deals {skill.damage}x of Attack as damage)
                                    </span>
                                  </div>
                                )}
                                
                                {skill.effect && (
                                  <div className="flex items-center mt-1">
                                    <Flame className="h-3 w-3 mr-1 text-orange-400" />
                                    <span className="text-[#C8B8DB]/80">
                                      Effect: <span className="text-purple-400">{skill.effect}</span>
                                      {skill.effectChance && <span className="ml-1 text-yellow-400">({skill.effectChance}% chance)</span>}
                                      {skill.effectStacks && <span className="ml-1 text-blue-400">({skill.effectStacks} stacks)</span>}
                                    </span>
                                  </div>
                                )}
                                
                                {skill.healing && (
                                  <div className="flex items-center mt-1">
                                    <Heart className="h-3 w-3 mr-1 text-green-400" />
                                    <span className="text-[#C8B8DB]/80">
                                      Healing: <span className="text-green-400">{skill.healing}%</span> of max health
                                      {skill.healTargets && <span className="ml-1 text-blue-400">({skill.healTargets > 1 ? `${skill.healTargets} targets` : '1 target'})</span>}
                                    </span>
                                  </div>
                                )}
                                
                                {skill.cooldown && (
                                  <div className="flex items-center mt-1">
                                    <Clock className="h-3 w-3 mr-1 text-blue-400" />
                                    <span className="text-[#C8B8DB]/80">
                                      Cooldown: <span className="text-blue-400">{skill.cooldown} turns</span>
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex justify-between mt-2 text-xs text-[#C8B8DB]/60">
                                <span>Type: 
                                  <span className={
                                    skill.type === "Ultimate" ? " text-amber-500" : 
                                    skill.type === "Advanced" ? " text-blue-500" : 
                                    " text-green-500"
                                  }>
                                    {" "}{skill.type}
                                  </span>
                                </span>
                                <span>Targets: {skill.targets || 1}</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-[#C8B8DB]/60">No skills available</div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-[#432874]/20 rounded-lg p-6 text-center">
                    <Info className="h-8 w-8 text-[#C8B8DB]/60 mx-auto mb-2" />
                    <p className="text-sm text-[#C8B8DB]/80">No Aura Equipped</p>
                    <p className="text-xs text-[#C8B8DB]/60 mt-1">Equip an aura to enhance your character's abilities</p>
                  </div>
                )}
              </div>
            </div>
            
            {/* Character management section */}
            <div className="flex flex-col space-y-4">
              {/* Soul shard & duplicate info */}
              <div className="bg-[#432874]/20 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Star className="h-4 w-4 text-purple-400" />
                    <span className="text-sm">Soul Shards: <span className="text-purple-400 font-semibold">{soulShardCount}</span></span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Duplicates: <span className="text-blue-400 font-semibold">{duplicateCount}</span></span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end space-x-3">
                {!character.isActive && (
                  <>
                    <Button
                      variant="outline"
                      className="bg-transparent border-[#432874]/50 hover:bg-[#432874]/20"
                      onClick={() => setDuplicatesDialogOpen(true)}
                    >
                      View Duplicates
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-transparent border-[#432874]/50 hover:bg-[#432874]/20"
                      onClick={() => setUpgradeDialogOpen(true)}
                    >
                      Upgrade Level
                    </Button>
                    <Button
                      variant="outline"
                      className="bg-transparent border-[#432874]/50 hover:bg-[#432874]/20"
                      onClick={() => {
                        setDetailDialogOpen(false);
                        setEquipAuraDialogOpen(true);
                      }}
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
        </DialogContent>
      </Dialog>

      {/* Duplicates Dialog */}
      <Dialog open={duplicatesDialogOpen} onOpenChange={setDuplicatesDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#FF9D00] font-cinzel">
              {character.name} - Duplicates
            </DialogTitle>
            <DialogDescription className="text-[#C8B8DB]/80">
              View and manage character duplicates to obtain Soul Shards
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4 space-y-4">
            {/* Soul Shard Summary */}
            <div className="flex items-center justify-between bg-[#432874]/20 p-3 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center">
                  <Star className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <div className="text-sm text-[#C8B8DB]/80">Total Soul Shards</div>
                  <div className="text-xl font-bold text-purple-400">{soulShardCount}</div>
                </div>
              </div>
              
              <div className="text-sm text-[#C8B8DB]/60">
                Soul Shards are used to upgrade character levels.<br />
                Convert duplicates to gain more Soul Shards.
              </div>
            </div>
            
            {/* Character Duplicates List */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-[#C8B8DB]">
                Character Duplicates ({duplicateCount})
              </h3>
              
              {duplicateCount > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                  {/* This would be mapped from actual duplicates - using example for now */}
                  {Array.from({ length: duplicateCount }).map((_, index) => (
                    <div key={index} className="bg-[#432874]/10 p-3 rounded-lg border border-[#432874]/20">
                      {/* Header with image and basic info */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <img
                            src={character.avatarUrl}
                            alt={character.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-[#432874]"
                          />
                          <div>
                            <div className="font-medium">{character.name}</div>
                            <div className="flex items-center space-x-2 text-xs text-[#C8B8DB]/80">
                              <Badge className={`font-normal ${getClassColor(character.class)}`}>
                                {character.class}
                              </Badge>
                              <span>Level {character.level}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Set as primary button */}
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-transparent border-[#FF9D00]/30 hover:bg-[#FF9D00]/20 text-[#FF9D00]"
                          onClick={() => {
                            // Logic to set this duplicate as primary character
                            toast({
                              title: "Primary Character Changed",
                              description: `${character.name} has been set as your primary character.`,
                              variant: "default",
                            });
                          }}
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Set as Primary
                        </Button>
                      </div>
                      
                      {/* Character stats summary */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 my-2 text-sm text-[#C8B8DB]/90">
                        <div className="flex justify-between">
                          <span>Attack:</span> 
                          <span className="text-[#FF9D00]">{character.attack || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Defense:</span> 
                          <span className="text-[#00B9AE]">{character.defense || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Vitality:</span> 
                          <span className="text-green-500">{character.vitality || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Accuracy:</span> 
                          <span className="text-blue-400">{character.accuracy || 0}</span>
                        </div>
                      </div>
                      
                      {/* Passive skills if available */}
                      {character.passiveSkills && character.passiveSkills.length > 0 && (
                        <div className="mb-2 text-sm">
                          <div className="text-xs font-semibold text-[#C8B8DB]/90 mb-1">Passive Skills:</div>
                          <div className="flex flex-wrap gap-1">
                            {character.passiveSkills?.map((skill, i) => (
                              <Badge key={i} variant="outline" className="bg-[#432874]/20 text-[#C8B8DB]">
                                {typeof skill === 'string' ? skill : 'Passive Skill'}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Convert button */}
                      <div className="flex justify-end mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="bg-transparent border-purple-500/30 hover:bg-purple-900/20 text-purple-400"
                          onClick={() => {
                            // Logic to convert duplicate to soul shards
                            // Temporary implementation
                            toast({
                              title: "Character Converted",
                              description: `Gained +${20 + ((character.level || 1) * 5)} Soul Shards from conversion.`,
                              variant: "default",
                            });
                          }}
                        >
                          <Sparkles className="h-4 w-4 mr-1" />
                          Convert to Shards
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-[#C8B8DB]/60 bg-[#432874]/10 rounded-lg">
                  No duplicates available for this character.
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDuplicatesDialogOpen(false)}
              className="bg-transparent border-[#432874]/50 hover:bg-[#432874]/20"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Upgrade Character Dialog */}
      <Dialog open={upgradeDialogOpen} onOpenChange={setUpgradeDialogOpen}>
        <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB] max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[#FF9D00] font-cinzel">
              Upgrade {character.name}
            </DialogTitle>
            <DialogDescription className="text-[#C8B8DB]/80">
              Upgrade your character to increase their stats and abilities
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4 space-y-5">
            {/* Current Level */}
            <div className="flex items-center justify-center space-x-4">
              <div className="flex flex-col items-center">
                <div className="text-[#C8B8DB]/60 text-sm">Current Level</div>
                <div className="bg-[#432874]/40 h-16 w-16 rounded-full flex items-center justify-center border border-[#432874]/60">
                  <span className="text-2xl font-bold">{character.level}</span>
                </div>
              </div>
              
              <ChevronRight className="h-6 w-6 text-[#C8B8DB]/40" />
              
              <div className="flex flex-col items-center">
                <div className="text-[#C8B8DB]/60 text-sm">Next Level</div>
                <div className="bg-gradient-to-br from-[#432874] to-[#9370DB] h-16 w-16 rounded-full flex items-center justify-center shadow-lg shadow-purple-900/30">
                  <span className="text-2xl font-bold text-white">{(character.level || 1) + 1}</span>
                </div>
              </div>
            </div>
            
            {/* Resource Requirements */}
            <div className="bg-[#432874]/20 p-4 rounded-lg space-y-3">
              <h3 className="text-sm font-semibold text-[#C8B8DB]">Upgrade Requirements</h3>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Star className="h-5 w-5 text-purple-400" />
                  <span>Soul Shards</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className={soulShardCount >= (character.level || 1) * 5 ? "text-green-400" : "text-red-400"}>
                    {soulShardCount}
                  </span>
                  <span className="text-[#C8B8DB]/60">/</span>
                  <span>{(character.level || 1) * 5}</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-blue-400" />
                  <span>Essence</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-blue-400">???</span>
                  <span className="text-[#C8B8DB]/60">/</span>
                  <span>{(character.level || 1) * 100}</span>
                </div>
              </div>
            </div>
            
            {/* Stat Improvements */}
            <div className="bg-[#432874]/20 p-4 rounded-lg">
              <h3 className="text-sm font-semibold text-[#C8B8DB] mb-2">Stat Improvements</h3>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Swords className="h-4 w-4 text-red-400" />
                    <span className="text-sm">Attack</span>
                  </div>
                  <div className="text-sm text-green-400">+{Math.ceil((character.attack || 0) * 0.1)}</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <span className="text-sm">Defense</span>
                  </div>
                  <div className="text-sm text-green-400">+{Math.ceil((character.defense || 0) * 0.1)}</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="text-sm">Vitality</span>
                  </div>
                  <div className="text-sm text-green-400">+{Math.ceil((character.vitality || 0) * 0.1)}</div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm">Accuracy</span>
                  </div>
                  <div className="text-sm text-green-400">+{Math.ceil((character.accuracy || 0) * 0.1)}</div>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setUpgradeDialogOpen(false)}
              className="bg-transparent border-[#432874]/50 hover:bg-[#432874]/20"
            >
              Cancel
            </Button>
            <Button 
              onClick={upgradeCharacter}
              disabled={isUpgrading || soulShardCount < (character.level || 1) * 5}
              className="bg-gradient-to-r from-[#432874] to-[#9370DB] text-white hover:from-[#9370DB] hover:to-[#432874]"
            >
              {isUpgrading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Upgrading...
                </>
              ) : (
                "Upgrade Character"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* The clickable character card */}
      <div onClick={() => setDetailDialogOpen(true)}>
        <motion.div
          className="bg-[#1A1A2E] rounded-xl overflow-hidden border border-[#432874]/30 relative cursor-pointer"
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
                            auraSkills.map((skill: any, index) => (
                              <div key={index} className="border-b border-[#432874]/30 pb-3 last:border-b-0 last:pb-0">
                                <div className="flex justify-between items-center">
                                  <div className="text-xs font-medium text-[#00B9AE]">{skill.name}</div>
                                  <div className="text-xs px-2 py-0.5 rounded-full bg-[#432874]/40 text-[#00B9AE]">
                                    Level {skill.level || 1}
                                  </div>
                                </div>

                                {/* Full skill logic */}
                                <div className="text-xs text-amber-300 mt-1 italic">
                                  "{skill.logic || generateSkillLogic(skill)}"
                                </div>
                                
                                <div className="text-xs text-[#C8B8DB]/80 mt-1">{skill.description}</div>
                                
                                {/* Enhanced skill details */}
                                <div className="mt-2 text-xs">
                                  {skill.damage && (
                                    <div className="flex items-center">
                                      <Swords className="h-3 w-3 mr-1 text-red-400" />
                                      <span className="text-[#C8B8DB]/80">
                                        Damage Multiplier: <span className="text-amber-400">{skill.damage}x</span> (Deals {skill.damage}x of Attack as damage)
                                      </span>
                                    </div>
                                  )}
                                  
                                  {skill.effect && (
                                    <div className="flex items-center mt-1">
                                      <Flame className="h-3 w-3 mr-1 text-orange-400" />
                                      <span className="text-[#C8B8DB]/80">
                                        Effect: <span className="text-purple-400">{skill.effect}</span>
                                        {skill.effectChance && <span className="ml-1 text-yellow-400">({skill.effectChance}% chance)</span>}
                                        {skill.effectStacks && <span className="ml-1 text-blue-400">({skill.effectStacks} stacks)</span>}
                                      </span>
                                    </div>
                                  )}
                                  
                                  {skill.healing && (
                                    <div className="flex items-center mt-1">
                                      <Heart className="h-3 w-3 mr-1 text-green-400" />
                                      <span className="text-[#C8B8DB]/80">
                                        Healing: <span className="text-green-400">{skill.healing}%</span> of max health
                                        {skill.healTargets && <span className="ml-1 text-blue-400">({skill.healTargets > 1 ? `${skill.healTargets} targets` : '1 target'})</span>}
                                      </span>
                                    </div>
                                  )}

                                  {skill.cooldown && (
                                    <div className="flex items-center mt-1">
                                      <Clock className="h-3 w-3 mr-1 text-blue-400" />
                                      <span className="text-[#C8B8DB]/80">
                                        Cooldown: <span className="text-blue-400">{skill.cooldown} turns</span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                                
                                <div className="flex justify-between mt-2 text-xs text-[#C8B8DB]/60">
                                  <span>Type: 
                                    <span className={
                                      skill.type === "Ultimate" ? " text-amber-500" : 
                                      skill.type === "Advanced" ? " text-blue-500" : 
                                      " text-green-500"
                                    }>
                                      {" "}{skill.type}
                                    </span>
                                  </span>
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
                              <div className="text-[#00B9AE] text-sm">{(aura || equippedAura)?.name}</div>
                              <div className="text-xs text-[#C8B8DB]/80">
                                Level {(aura || equippedAura)?.level} • Tier {(aura || equippedAura)?.tier}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Swords className="h-3 w-3 mr-1 text-red-400" />
                                <span className="text-xs">Attack</span>
                              </div>
                              <div className="text-xs">
                                {getStatModifierText((aura || equippedAura)?.attack || null)}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Target className="h-3 w-3 mr-1 text-yellow-400" />
                                <span className="text-xs">Accuracy</span>
                              </div>
                              <div className="text-xs">
                                {getStatModifierText((aura || equippedAura)?.accuracy || null)}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Shield className="h-3 w-3 mr-1 text-blue-400" />
                                <span className="text-xs">Defense</span>
                              </div>
                              <div className="text-xs">
                                {getStatModifierText((aura || equippedAura)?.defense || null)}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Heart className="h-3 w-3 mr-1 text-red-500" />
                                <span className="text-xs">Vitality</span>
                              </div>
                              <div className="text-xs">
                                {getStatModifierText((aura || equippedAura)?.vitality || null)}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Zap className="h-3 w-3 mr-1 text-cyan-400" />
                                <span className="text-xs">Speed</span>
                              </div>
                              <div className="text-xs">
                                {getStatModifierText((aura || equippedAura)?.speed || null)}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Brain className="h-3 w-3 mr-1 text-purple-400" />
                                <span className="text-xs">Focus</span>
                              </div>
                              <div className="text-xs">
                                {getStatModifierText((aura || equippedAura)?.focus || null)}
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <CircleOff className="h-3 w-3 mr-1 text-purple-400" />
                                <span className="text-xs">Resilience</span>
                              </div>
                              <div className="text-xs">
                                {getStatModifierText((aura || equippedAura)?.resilience || null)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-[#C8B8DB]/60">No Aura Equipped</div>
                  )}

                  {/* Character Passive Skills Section */}
                  {character.passiveSkills && Array.isArray(character.passiveSkills) && character.passiveSkills.length > 0 && (
                    <div className="bg-[#432874]/20 rounded-lg p-3 mt-4">
                      <h4 className="font-semibold text-sm mb-2 text-[#00B9AE]">Character Passive Skills</h4>
                      <div className="space-y-2">
                        {character.passiveSkills.map((passive: any, index) => (
                          <div key={index} className="border-b border-[#432874]/30 pb-2 last:border-b-0 last:pb-0">
                            <div className="text-xs font-medium text-[#00B9AE]">{passive.name}</div>
                            <div className="text-xs text-[#C8B8DB]/80">{passive.description}</div>
                            
                            <div className="mt-2 text-xs">
                              {passive.effect && (
                                <div className="flex items-center">
                                  <Star className="h-3 w-3 mr-1 text-amber-400" />
                                  <span className="text-[#C8B8DB]/80">
                                    Effect: <span className="text-purple-400">{passive.effect}</span>
                                  </span>
                                </div>
                              )}
                              
                              {passive.trigger && (
                                <div className="flex items-center mt-1">
                                  <Bolt className="h-3 w-3 mr-1 text-yellow-400" />
                                  <span className="text-[#C8B8DB]/80">
                                    Trigger: <span className="text-blue-400">{passive.trigger}</span>
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
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
      </div>
    </>
  );
};

export { CharacterCard };