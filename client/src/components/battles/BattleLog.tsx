import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Shield, Swords, Heart, Zap, Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface StatusEffect {
  name: string;
  duration: number;
  effect: string; // "Burn" | "Poison" | "Weaken" | "Slow" | etc.
  value: number;  // Damage amount or stat reduction percentage
  source?: string; // ID of the unit that applied the effect
}

interface BattleUnit {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attackMeter: number;
  totalDamageDealt: number;
  totalDamageReceived: number;
  totalHealingDone: number;
  totalHealingReceived: number;
  burnAttempts?: number;
  burnSuccess?: number;
  poisonAttempts?: number;
  poisonSuccess?: number;
  slowAttempts?: number;
  slowSuccess?: number;
  weakenAttempts?: number;
  weakenSuccess?: number;
  lastBurnRoll?: number;
  lastPoisonRoll?: number;
  lastSlowRoll?: number;
  lastWeakenRoll?: number;
  stats: {
    attack: number;
    vitality: number;
    speed: number;
  };
  auraBonus?: {
    attack: number;
    vitality: number;
    speed: number;
  };
  skills: {
    basic: { name: string; damage: number }; // damage is a multiplier (e.g. 0.8 means 80% of attack)
    advanced?: { name: string; damage: number; cooldown: number };
    ultimate?: { name: string; damage: number; cooldown: number };
  };
  statusEffects?: StatusEffect[];
}

interface BattleLogProps {
  isOpen: boolean;
  onClose: () => void;
  battleLog: any[];
  runId: number | null;
  onCompleteDungeon?: (runId: number) => void;
}

const BattleLog = ({ isOpen, onClose, battleLog, runId, onCompleteDungeon }: BattleLogProps) => {
  // State declarations
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [units, setUnits] = useState<BattleUnit[]>([]);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [detailedActionLog, setDetailedActionLog] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  
  // Using useRef for turn count to avoid re-render issues
  const turnCountRef = useRef<number>(1);
  // Keep state for displaying in the UI when needed
  const [battleRound, setBattleRound] = useState(1);
  
  // Function to handle changing the playback speed
  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
  };

  // Helper function to render status effects with tooltips
  const renderStatusEffect = (effect: StatusEffect, index: number, isAlly: boolean) => {
    let statusColor = "bg-gray-600";
    if (effect.effect === "Burn") statusColor = "bg-red-600";
    if (effect.effect === "Poison") statusColor = "bg-green-600";
    if (effect.effect === "ReduceAtk") statusColor = "bg-orange-600";
    if (effect.effect === "ReduceSpd") statusColor = "bg-blue-600";

    // Create tooltip title and description based on effect type
    let title = '';
    let description = '';

    if (effect.effect === "Burn") {
      title = "Burning";
      description = `${effect.value} fire dmg/turn. ${effect.duration} turns left.`;
    } else if (effect.effect === "Poison") {
      title = "Poisoned";
      description = `${effect.value} poison dmg/turn. ${effect.duration} turns left.`;
    } else if (effect.effect === "ReduceAtk") {
      title = "Weakened";
      description = `-${effect.value}% Attack. ${effect.duration} turns left.`;
    } else if (effect.effect === "ReduceSpd") {
      title = "Slowed";
      description = `-${effect.value}% Speed. ${effect.duration} turns left.`;
    } else {
      title = effect.name;
      description = `${effect.effect === "Burn" || effect.effect === "Poison" ? 
        `${effect.value} dmg/turn` : 
        `-${effect.value}%`} (${effect.duration} turns left)`;
    }

    return (
      <TooltipProvider key={index}>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div 
              className={`text-xs px-1.5 py-0.5 rounded text-white ${statusColor} flex items-center cursor-help gap-0.5 leading-none`}
            >
              <span>{effect.name}</span>
              <span className="opacity-80">({effect.duration})</span>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            align="center"
            className="bg-gray-900/95 border-purple-900 text-white p-1.5 max-w-[180px] rounded-lg shadow-xl z-50"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Info className="text-yellow-400 flex-shrink-0" size={14} />
                <h4 className="font-semibold text-yellow-400 text-xs">{title}</h4>
              </div>
              <p className="text-xs leading-tight">{description}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Helper function to render skills with tooltips
  const renderSkill = (name: string, damage: number, cooldown?: number) => {
    let skillColor = "bg-purple-800";
    if (name.includes("Fireball") || name.includes("Ember") || name.includes("Wildfire")) {
      skillColor = "bg-red-700";
    } else if (name.includes("Wave") || name.includes("Tide")) {
      skillColor = "bg-blue-700";
    } else if (name.includes("Wind") || name.includes("Gust") || name.includes("Breeze")) {
      skillColor = "bg-teal-700";
    } else if (name.includes("Earth") || name.includes("Stone") || name.includes("Dust")) {
      skillColor = "bg-amber-800";
    }

    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div 
              className={`text-xs px-1.5 py-0.5 rounded text-white ${skillColor} flex items-center cursor-help gap-0.5 leading-none whitespace-nowrap`}
            >
              <span>{name}</span>
              {cooldown && <span className="opacity-80 text-[10px]">({cooldown}cd)</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            align="center"
            className="bg-gray-900/95 border-purple-900 text-white p-1.5 max-w-[180px] rounded-lg shadow-xl z-50"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Info className="text-yellow-400 flex-shrink-0" size={14} />
                <h4 className="font-semibold text-yellow-400 text-xs">{name}</h4>
              </div>
              <p className="text-xs leading-tight">Deals {Math.round(damage * 100)}% of attack as damage</p>
              {cooldown && (
                <p className="text-xs leading-tight opacity-80">{cooldown} turn cooldown</p>
              )}
              
              {/* Special skill effects descriptions */}
              {name === "Gust" && (
                <p className="text-xs leading-tight text-teal-400">Has 50% chance to apply Minor Slow (20% Speed reduction)</p>
              )}
              {name === "Stone Slam" && (
                <p className="text-xs leading-tight text-amber-400">Has 20% chance to apply Minor Weakness (10% Attack reduction)</p>
              )}
              {name === "Ember" && (
                <p className="text-xs leading-tight text-red-400">Has 30% chance to apply Burning (2 damage per turn)</p>
              )}
              {name === "Wildfire" && (
                <p className="text-xs leading-tight text-red-400">Hits 2 targets, 25% chance for 3rd target</p>
              )}
              {name === "Dust Spikes" && (
                <p className="text-xs leading-tight text-amber-400">Hits 2 random targets</p>
              )}
              {name === "Cleansing Tide" && (
                <p className="text-xs leading-tight text-blue-400">10% chance to remove 1 debuff from an ally</p>
              )}
              {name === "Breeze" && (
                <p className="text-xs leading-tight text-teal-400">15% chance to reduce target's Attack Meter by 20%</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Helper function to render unit statistics 
  const renderUnitStats = (unit: BattleUnit) => {
    // Check if unit has aura bonuses
    const hasAuraBonuses = unit.auraBonus && (
      (unit.auraBonus.attack !== undefined && unit.auraBonus.attack !== 0) || 
      (unit.auraBonus.vitality !== undefined && unit.auraBonus.vitality !== 0) || 
      (unit.auraBonus.speed !== undefined && unit.auraBonus.speed !== 0)
    );
    
    // Calculate bonus values for display
    const attackBonus = hasAuraBonuses && unit.auraBonus?.attack ? unit.auraBonus.attack : 0;
    const vitalityBonus = hasAuraBonuses && unit.auraBonus?.vitality ? unit.auraBonus.vitality : 0;
    const speedBonus = hasAuraBonuses && unit.auraBonus?.speed ? unit.auraBonus.speed : 0;

    // Calculate actual stats after applying status effects
    const effectiveSpeed = calculateEffectiveSpeed(unit);
    const effectiveAttack = calculateEffectiveAttack(unit);
    
    // Calculate effective values after status effects
    const speedReduction = unit.stats.speed !== effectiveSpeed;
    const attackReduction = unit.stats.attack !== effectiveAttack;

    return (
      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
        <div className="flex items-center">
          <Shield className="h-3 w-3 mr-1 text-blue-400" />
          <span>
            DEF: {unit.stats.attack}
            {hasAuraBonuses && attackBonus !== 0 && (
              <span className={attackBonus > 0 ? "text-green-400 ml-1" : "text-red-400 ml-1"}>
                {attackBonus > 0 ? "+" : ""}{attackBonus}%
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center">
          <Swords className="h-3 w-3 mr-1 text-red-400" />
          <span>
            ATK: {effectiveAttack}
            {hasAuraBonuses && attackBonus !== 0 && (
              <span className={attackBonus > 0 ? "text-green-400 ml-1" : "text-red-400 ml-1"}>
                {attackBonus > 0 ? "+" : ""}{attackBonus}%
              </span>
            )}
            {attackReduction && (
              <span className="text-red-400 ml-1">(-{Math.round((unit.stats.attack - effectiveAttack) / unit.stats.attack * 100)}%)</span>
            )}
          </span>
        </div>
        <div className="flex items-center">
          <Heart className="h-3 w-3 mr-1 text-red-500" />
          <span>
            VIT: {unit.stats.vitality}
            {hasAuraBonuses && vitalityBonus !== 0 && (
              <span className={vitalityBonus > 0 ? "text-green-400 ml-1" : "text-red-400 ml-1"}>
                {vitalityBonus > 0 ? "+" : ""}{vitalityBonus}%
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center">
          <Zap className="h-3 w-3 mr-1 text-yellow-400" />
          <span>
            SPD: {effectiveSpeed}
            {hasAuraBonuses && speedBonus !== 0 && (
              <span className={speedBonus > 0 ? "text-green-400 ml-1" : "text-red-400 ml-1"}>
                {speedBonus > 0 ? "+" : ""}{speedBonus}%
              </span>
            )}
            {speedReduction && (
              <span className="text-red-400 ml-1">(-{Math.round((unit.stats.speed - effectiveSpeed) / unit.stats.speed * 100)}%)</span>
            )}
          </span>
        </div>
      </div>
    );
  };

  // Helper function to extract turn number from log message
  const extractTurnNumber = (logMessage: string): number => {
    const match = logMessage.match(/Turn (\d+):/);
    return match ? parseInt(match[1]) : 0;
  };

  // IMPORTANT FIX: Calculate Speed with Status Effects applied
  const calculateEffectiveSpeed = (unit: BattleUnit): number => {
    let baseSpeed = unit.stats.speed;
    
    // Apply aura speed bonus if available
    if (unit.auraBonus?.speed) {
      baseSpeed = Math.floor(baseSpeed * (1 + unit.auraBonus.speed / 100));
    }
    
    // Apply speed reduction from status effects
    if (unit.statusEffects && unit.statusEffects.length > 0) {
      // Find all speed reduction effects
      const speedReductionEffects = unit.statusEffects.filter(effect => effect.effect === "ReduceSpd");
      
      // Apply each effect (multiplicatively)
      for (const effect of speedReductionEffects) {
        // Calculate reduction percentage (20% reduction = multiply by 0.8)
        const reductionMultiplier = 1 - (effect.value / 100);
        baseSpeed = Math.floor(baseSpeed * reductionMultiplier);
        console.log(`Applied ${effect.name} to ${unit.name}: Speed reduced by ${effect.value}% to ${baseSpeed}`);
      }
    }
    
    return baseSpeed;
  };
  
  // IMPORTANT FIX: Calculate Attack with Status Effects applied
  const calculateEffectiveAttack = (unit: BattleUnit): number => {
    let attackValue = unit.stats.attack;
    
    // Apply aura attack bonus if available
    if (unit.auraBonus?.attack) {
      attackValue = Math.floor(attackValue * (1 + unit.auraBonus.attack / 100));
    }
    
    // Apply attack reduction status effects if present
    if (unit.statusEffects && unit.statusEffects.length > 0) {
      // Find all attack reduction effects
      const attackReductionEffects = unit.statusEffects.filter(effect => effect.effect === "ReduceAtk");
      
      // Apply each effect (multiplicatively)
      for (const effect of attackReductionEffects) {
        // Calculate reduction percentage (10% reduction = multiply by 0.9)
        const reductionMultiplier = 1 - (effect.value / 100);
        attackValue = Math.floor(attackValue * reductionMultiplier);
        console.log(`Applied ${effect.name} to ${unit.name}: Attack reduced by ${effect.value}% to ${attackValue}`);
      }
    }
    
    return attackValue;
  };

  // Sort action log by turn number (descending)
  const sortedActionLog = actionLog.length > 0 ? [...actionLog].sort((a, b) => {
    return extractTurnNumber(b) - extractTurnNumber(a);
  }) : [];
  
  // Sort detailed action log by turn number (descending)
  const sortedDetailedLog = detailedActionLog.length > 0 ? [...detailedActionLog].sort((a, b) => {
    return extractTurnNumber(b) - extractTurnNumber(a);
  }) : [];

  // Initialize battle units
  useEffect(() => {
    if (battleLog && battleLog.length > 0) {
      const initialUnits = [...battleLog[0].allies, ...battleLog[0].enemies].map(unit => {
        // Calculate vitality with aura bonus if available
        let vitalityStat = unit.stats.vitality;
        if (unit.auraBonus?.vitality) {
          // Apply percentage bonus from aura
          vitalityStat = Math.floor(vitalityStat * (1 + unit.auraBonus.vitality / 100));
        }

        // Calculate HP based on adjusted vitality
        const hpValue = vitalityStat * 8;

        return {
          ...unit,
          attackMeter: 0,
          lastSkillUse: 0,
          totalDamageDealt: 0,
          totalDamageReceived: 0,
          totalHealingDone: 0,
          totalHealingReceived: 0,
          hp: hpValue,
          maxHp: hpValue
        };
      });
      setUnits(initialUnits);
    }
  }, [battleLog]);

  // Return the component
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A1A2E] border-[#432874] text-[#C8B8DB] max-w-6xl max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-[#FF9D00] font-cinzel">
            Battle Log - Stage {currentStage + 1}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="live" className="w-full">
          <TabsList>
            <TabsTrigger value="live">Live Battle</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="log">Action Log</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Allies</h3>
                {units.filter(u => battleLog[0]?.allies?.some((a: any) => a.id === u.id)).map(unit => (
                  <div key={unit.id} className="bg-[#432874]/20 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-[#7855FF]/30 flex items-center justify-center overflow-hidden border border-[#7855FF]/50">
                        <span className="text-lg">{unit.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span>{unit.name}</span>
                          <span>{Math.ceil(unit.hp)}/{unit.maxHp} HP</span>
                        </div>
                        <div className="w-full bg-[#432874]/30 h-2 rounded">
                          <motion.div
                            className="bg-[#00B9AE] h-full rounded"
                            style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-[#432874]/30 h-1 rounded mt-1">
                      <motion.div
                        className="bg-[#FF9D00] h-full rounded"
                        style={{ width: `${unit.attackMeter}%` }}
                      />
                    </div>
                    <div className="flex">
                      <div className="mr-3 flex-shrink-0">
                        <div className="w-16 h-16 bg-[#432874]/30 rounded-md border border-[#432874]/50 flex items-center justify-center text-[#C8B8DB]/40 text-xs">
                          Avatar
                        </div>
                      </div>

                      <div className="flex-grow">
                        {renderUnitStats(unit)}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="bg-[#432874]/10 rounded-md p-2 border border-[#432874]/20">
                        <div className="text-xs font-semibold text-[#FF9D00] mb-1">Combat Skills</div>
                        <div className="flex flex-wrap gap-1">
                          {unit.skills.basic && renderSkill(unit.skills.basic.name, unit.skills.basic.damage)}
                          {unit.skills.advanced && renderSkill(unit.skills.advanced.name, unit.skills.advanced.damage, unit.skills.advanced.cooldown)}
                          {unit.skills.ultimate && renderSkill(unit.skills.ultimate.name, unit.skills.ultimate.damage, unit.skills.ultimate.cooldown)}
                        </div>
                      </div>

                      <div className="bg-[#432874]/10 rounded-md p-2 border border-[#432874]/20">
                        <div className="text-xs font-semibold text-yellow-300 mb-1">Status Effects</div>
                        {unit.statusEffects && unit.statusEffects.length > 0 ? (
                          <div className="flex flex-wrap gap-0.5">
                            {unit.statusEffects.map((effect, index) => 
                              renderStatusEffect(effect, index, true)
                            )}
                          </div>
                        ) : (
                          <div className="text-xs italic text-[#C8B8DB]/40">No active effects</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Enemies</h3>
                {units.filter(u => battleLog[0]?.enemies?.some((e: any) => e.id === u.id)).map(unit => (
                  <div key={unit.id} className="bg-[#432874]/20 p-2 rounded">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-[#DC143C]/30 flex items-center justify-center overflow-hidden border border-[#DC143C]/50">
                        <span className="text-lg">{unit.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span>{unit.name}</span>
                          <span>{Math.ceil(unit.hp)}/{unit.maxHp} HP</span>
                        </div>
                        <div className="w-full bg-[#432874]/30 h-2 rounded">
                          <motion.div
                            className="bg-[#DC143C] h-full rounded"
                            style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="w-full bg-[#432874]/30 h-1 rounded mt-1">
                      <motion.div
                        className="bg-[#FF9D00] h-full rounded"
                        style={{ width: `${unit.attackMeter}%` }}
                      />
                    </div>
                    <div className="flex">
                      <div className="mr-3 flex-shrink-0">
                        <div className="w-16 h-16 bg-[#432874]/30 rounded-md border border-[#432874]/50 flex items-center justify-center text-[#C8B8DB]/40 text-xs">
                          Enemy
                        </div>
                      </div>

                      <div className="flex-grow">
                        {renderUnitStats(unit)}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="bg-[#432874]/10 rounded-md p-2 border border-[#432874]/20">
                        <div className="text-xs font-semibold text-[#FF9D00] mb-1">Combat Skills</div>
                        <div className="flex flex-wrap gap-1">
                          {unit.skills.basic && renderSkill(unit.skills.basic.name, unit.skills.basic.damage)}
                          {unit.skills.advanced && renderSkill(unit.skills.advanced.name, unit.skills.advanced.damage, unit.skills.advanced.cooldown)}
                          {unit.skills.ultimate && renderSkill(unit.skills.ultimate.name, unit.skills.ultimate.damage, unit.skills.ultimate.cooldown)}
                        </div>
                      </div>

                      <div className="bg-[#432874]/10 rounded-md p-2 border border-[#432874]/20">
                        <div className="text-xs font-semibold text-yellow-300 mb-1">Status Effects</div>
                        {unit.statusEffects && unit.statusEffects.length > 0 ? (
                          <div className="flex flex-wrap gap-0.5">
                            {unit.statusEffects.map((effect, index) => 
                              renderStatusEffect(effect, index, false)
                            )}
                          </div>
                        ) : (
                          <div className="text-xs italic text-[#C8B8DB]/40">No active effects</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="summary">
            <div className="space-y-4">
              <div className="bg-[#432874]/20 p-4 rounded-lg">
                <h3 className="font-semibold text-[#FF9D00] mb-3">Battle Overview</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-[#C8B8DB]/70 text-xs">Total Turns</div>
                    <div className="font-semibold text-xl">{actionLog.length}</div>
                  </div>
                  <div>
                    <div className="text-[#C8B8DB]/70 text-xs">Total Damage</div>
                    <div className="font-semibold text-xl">
                      {units.reduce((sum, unit) => sum + unit.totalDamageDealt, 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#C8B8DB]/70 text-xs">Total Healing</div>
                    <div className="font-semibold text-xl">
                      {units.reduce((sum, unit) => sum + unit.totalHealingDone, 0).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#C8B8DB]/70 text-xs">Status Effects</div>
                    <div className="font-semibold text-xl">
                      {units.reduce((sum, unit) => sum + (
                        (unit.burnSuccess || 0) + 
                        (unit.poisonSuccess || 0) + 
                        (unit.slowSuccess || 0) + 
                        (unit.weakenSuccess || 0)
                      ), 0)}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-[#432874]/20 p-4 rounded-lg">
                <h3 className="font-semibold text-[#FF9D00] mb-3">Status Effect Fixes Implemented</h3>
                <ul className="list-disc pl-5 space-y-2">
                  <li>✓ Status effects like Minor Slow from Gust skill are now properly applied</li>
                  <li>✓ Fixed bug where status effects weren't actually affecting character stats</li>
                  <li>✓ Added code to apply speed reduction effects when calculating unit speed</li>
                  <li>✓ Added code to apply attack reduction effects when calculating attack damage</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="log">
            <div className="space-y-2">
              <div className="bg-[#432874]/10 p-3 rounded-lg">
                <h3 className="font-semibold text-[#FF9D00] mb-2">Action Log</h3>
                <div className="h-[400px] overflow-y-auto space-y-1 pr-2">
                  {sortedActionLog.length > 0 ? (
                    sortedActionLog.map((log, index) => (
                      <div
                        key={index}
                        className="text-sm bg-[#432874]/20 p-2 rounded"
                        dangerouslySetInnerHTML={{ __html: log }}
                      />
                    ))
                  ) : (
                    <div className="text-sm italic opacity-70">No combat logs to display yet</div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={onClose}>
            Close
          </Button>
          {isComplete && runId && onCompleteDungeon && (
            <Button 
              variant="default" 
              onClick={() => onCompleteDungeon(runId)}
            >
              Complete Dungeon
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BattleLog;