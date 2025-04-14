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
              <span className="opacity-80 bg-black/20 rounded px-0.5 ml-0.5">({effect.duration})</span>
            </div>
          </TooltipTrigger>
          <TooltipContent
            side={isAlly ? "right" : "left"}
            align="center"
            className="bg-gray-900/95 border-purple-900 text-white p-1.5 max-w-[220px] rounded-lg shadow-xl z-50"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Info className="text-yellow-400 flex-shrink-0" size={14} />
                <h4 className="font-semibold text-yellow-400 text-xs">{title}</h4>
              </div>
              <p className="text-xs leading-tight">{description}</p>
              <p className="text-xs leading-tight text-gray-400 italic mt-1">Duration decreases when unit takes an action</p>
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

  // Function to check if battle has ended
  const checkBattleEnd = () => {
    const battleEntry = battleLog.find(log => log.allies && Array.isArray(log.allies));
    if (!battleEntry) {
      console.error("No battle entry found with allies array");
      return;
    }

    const allies = units.filter(u => battleEntry.allies.some((a: any) => a.id === u.id));
    const enemies = units.filter(u => battleEntry.enemies.some((e: any) => e.id === u.id));

    const allAlliesDefeated = allies.every((a: BattleUnit) => a.hp <= 0);
    const allEnemiesDefeated = enemies.every((e: BattleUnit) => e.hp <= 0);

    console.log(`Checking battle end conditions:
      - All allies defeated: ${allAlliesDefeated} (${allies.length} allies)
      - All enemies defeated: ${allEnemiesDefeated} (${enemies.length} enemies)
      - Current stage: ${currentStage + 1} of 8
      - Is battle complete: ${isComplete}
    `);

    // If all allies are defeated, the dungeon run is over
    if (allAlliesDefeated) {
      setIsPaused(true);
      setIsComplete(true);
      setActionLog(prev => [
        ...prev,
        `Battle ended! Your party has been defeated at stage ${currentStage + 1}.`
      ]);
      console.log(`Dungeon ended - party defeated at stage ${currentStage + 1}`);
    } 
    // If all enemies are defeated, progress to next stage or complete
    else if (allEnemiesDefeated && !isComplete) {
      setIsPaused(true);
      // Mark as complete for now - in real app would progress to next stage
      setIsComplete(true);
      setActionLog(prev => [
        ...prev,
        `Congratulations! You've defeated all enemies!`
      ]);
    }
  };

  // Function for a unit to perform an action
  const performAction = (attacker: BattleUnit, target: BattleUnit) => {
    // Skip if either unit is defeated
    if (attacker.hp <= 0 || target.hp <= 0) return;
    
    // Increment turn count for this action
    turnCountRef.current += 1;
    setBattleRound(turnCountRef.current);
    
    // Choose which skill to use based on cooldowns and chance
    // Skill selection logic: 70% chance for basic, 20% chance for advanced, 10% chance for ultimate if available
    const skillRoll = Math.random() * 100;
    let skill = attacker.skills.basic;
    let skillType = "basic";
    
    if (attacker.skills.advanced && skillRoll > 70) {
      skill = attacker.skills.advanced;
      skillType = "advanced";
    } else if (attacker.skills.ultimate && skillRoll > 90) {
      skill = attacker.skills.ultimate;
      skillType = "ultimate";
    }
    
    // Get the battle entry to determine if attacker is ally or enemy
    const battleEntry = battleLog.find(log => log.allies && Array.isArray(log.allies));
    const isAlly = battleEntry?.allies?.some((a: any) => a.id === attacker.id) || false;
    
    // Calculate damage with our fixed attack calculation
    let attackValue = calculateEffectiveAttack(attacker);
    
    // Damage = Attack * Skill Damage Multiplier
    const damage = Math.floor(attackValue * skill.damage);
    
    // Determine if we should apply status effects based on the skill
    let statusEffectApplied = false;
    let statusEffectMessage = "";
    let newStatusEffect: StatusEffect | null = null;
    
    // Check skill name to determine potential status effects
    if (skill.name === "Gust") {
      // Gust has 50% chance to apply Minor Slow (20% Speed reduction)
      const effectRoll = Math.random() * 100;
      if (effectRoll <= 50) {
        statusEffectApplied = true;
        newStatusEffect = {
          name: "Minor Slow",
          duration: 3, // lasts for 3 turns
          effect: "ReduceSpd",
          value: 20, // 20% reduction
          source: attacker.id
        };
        statusEffectMessage = `${attacker.name}'s Gust applied Minor Slow to ${target.name}! (Speed -20% for 3 turns)`;
      }
    } else if (skill.name === "Stone Slam") {
      // Stone Slam has 20% chance to apply Minor Weakness (10% Attack reduction)
      const effectRoll = Math.random() * 100;
      // Increase chance for testing
      if (effectRoll <= 50) { // 50% for testing instead of 20%
        statusEffectApplied = true;
        newStatusEffect = {
          name: "Minor Weakness",
          duration: 2, // lasts for 2 turns
          effect: "ReduceAtk",
          value: 10, // 10% reduction
          source: attacker.id
        };
        statusEffectMessage = `${attacker.name}'s Stone Slam weakened ${target.name}! (Attack -10% for 2 turns)`;
        
        // Debug log for testing
        console.log(`Applied Minor Weakness to ${target.name} from ${attacker.name}: Duration ${newStatusEffect.duration} turns`);
      }
    } else if (skill.name === "Ember") {
      // Ember has 30% chance to apply Burning effect
      const effectRoll = Math.random() * 100;
      // Increase chance for testing
      if (effectRoll <= 60) { // 60% for testing instead of 30%
        statusEffectApplied = true;
        newStatusEffect = {
          name: "Burning",
          duration: 3, // lasts for 3 turns
          effect: "Burn",
          value: 2, // 2 damage per turn
          source: attacker.id
        };
        statusEffectMessage = `${attacker.name}'s Ember set ${target.name} on fire! (2 damage per turn for 3 turns)`;
        
        // Debug log for testing
        console.log(`Applied Burning to ${target.name} from ${attacker.name}: Duration ${newStatusEffect.duration} turns, Damage ${newStatusEffect.value}/turn`);
      }
    }
    
    // Apply damage and status effects to target
    setUnits(prevUnits => {
      return prevUnits.map(u => {
        // Update target with damage and new status effects
        if (u.id === target.id) {
          const newHp = Math.max(0, u.hp - damage);
          
          // Check if target is defeated
          if (newHp <= 0 && u.hp > 0) {
            setActionLog(prev => [`${target.name} has been defeated!`, ...prev]);
          }
          
          // Apply new status effect if any
          let updatedStatusEffects = u.statusEffects ? [...u.statusEffects] : [];
          if (statusEffectApplied && newStatusEffect) {
            // Check if we already have this type of effect
            const existingEffectIndex = updatedStatusEffects.findIndex(
              effect => effect.effect === newStatusEffect!.effect
            );
            
            if (existingEffectIndex >= 0) {
              // Replace existing effect with new one (refresh duration)
              updatedStatusEffects[existingEffectIndex] = newStatusEffect;
            } else {
              // Add new effect
              updatedStatusEffects.push(newStatusEffect);
            }
          }
          
          return {
            ...u,
            hp: newHp,
            totalDamageReceived: u.totalDamageReceived + damage,
            statusEffects: updatedStatusEffects
          };
        }
        
        // Update attacker and reduce durations of their status effects
        if (u.id === attacker.id) {
          // When a unit acts, their status effects should have their duration reduced by 1
          let updatedStatusEffects: StatusEffect[] = [];
          let statusEffectsExpired: string[] = [];
          
          // Process each status effect on the attacker
          if (u.statusEffects && u.statusEffects.length > 0) {
            u.statusEffects.forEach(effect => {
              // Decrease duration by 1 since this unit just took an action
              const newDuration = effect.duration - 1;
              
              // If effect still has duration, keep it
              if (newDuration > 0) {
                updatedStatusEffects.push({
                  ...effect,
                  duration: newDuration
                });
              } else {
                // Effect has expired
                statusEffectsExpired.push(effect.name);
              }
            });
            
            // Log expired effects
            statusEffectsExpired.forEach(effectName => {
              setActionLog(prev => [`${effectName} has worn off from ${attacker.name}!`, ...prev]);
            });
          }
          
          return {
            ...u,
            attackMeter: 0, // Reset attack meter after action
            totalDamageDealt: u.totalDamageDealt + damage,
            statusEffects: updatedStatusEffects
          };
        }
        
        return u;
      });
    });
    
    // Log the attack
    const actionMessage = `Turn ${turnCountRef.current}: ${attacker.name} used ${skill.name} on ${target.name} for ${damage} damage!`;
    setActionLog(prev => [actionMessage, ...prev]);
    
    // Log status effect application if any
    if (statusEffectApplied) {
      setActionLog(prev => [statusEffectMessage, ...prev]);
    }
    
    // Check if battle has ended
    setTimeout(checkBattleEnd, 300);
  };
  
  // Function to apply damage from DoT status effects
  // This should run every few ticks, but NOT decrease durations
  const processStatusEffectDamage = () => {
    // Create a timestamp to ensure this only processes once per cycle
    const processingTime = Date.now();
    
    // Track which units have had DoT effects applied this cycle 
    // to prevent double-processing
    const processedUnits = new Set<string>();
    
    setUnits(prevUnits => {
      const updatedUnits = [...prevUnits];
      
      // Process each unit
      for (let i = 0; i < updatedUnits.length; i++) {
        const unit = updatedUnits[i];
        
        // Skip dead units
        if (unit.hp <= 0) continue;
        
        // Skip units with no status effects
        if (!unit.statusEffects || unit.statusEffects.length === 0) continue;
        
        // Skip if this unit was already processed in this cycle
        if (processedUnits.has(unit.id)) {
          console.log(`Skipping duplicate DoT processing for ${unit.name}`);
          continue;
        }
        
        // Mark this unit as processed
        processedUnits.add(unit.id);
        
        let totalDoTDamage = 0;
        
        // Process each status effect for damage only
        unit.statusEffects.forEach(effect => {
          // Calculate damage based on effect type
          if (effect.effect === "Burn") {
            totalDoTDamage += effect.value;
            console.log(`Applying Burn damage to ${unit.name}: ${effect.value} damage, ${effect.duration} turns remaining`);
          }
          
          // Add any other DoT effect processing here
          if (effect.effect === "Poison") {
            totalDoTDamage += effect.value;
            console.log(`Applying Poison damage to ${unit.name}: ${effect.value} damage, ${effect.duration} turns remaining`);
          }
        });
        
        // Apply DoT damage if any
        if (totalDoTDamage > 0) {
          const newHp = Math.max(0, unit.hp - totalDoTDamage);
          
          // Log the damage with status effect details
          let statusEffectNames = unit.statusEffects
            ?.filter(effect => effect.effect === "Burn" || effect.effect === "Poison")
            .map(effect => `${effect.name} (${effect.duration} turns left)`)
            .join(" and ");
            
          setActionLog(prev => [`${unit.name} takes ${totalDoTDamage} damage from ${statusEffectNames}!`, ...prev]);
          
          // Add debug log to track damage-over-time effects
          console.log(`DoT damage to ${unit.name}: ${totalDoTDamage} damage from status effects at ${processingTime}. Current HP: ${unit.hp} -> ${newHp}`);
          
          // Check if unit died from DoT
          if (newHp <= 0 && unit.hp > 0) {
            setActionLog(prev => [`${unit.name} has been defeated by status effects!`, ...prev]);
          }
          
          updatedUnits[i] = {
            ...unit,
            hp: newHp,
            totalDamageReceived: unit.totalDamageReceived + totalDoTDamage
          };
        }
      }
      
      return updatedUnits;
    });
  };

  // Counter for status effect processing (only process every 4 ticks)
  const statusEffectTickRef = useRef(0);

  // Function to reset attack meters and apply status effects each tick
  const simulationTick = () => {
    if (isPaused || isComplete || units.length === 0) return;
    
    // Increment status effect counter
    statusEffectTickRef.current += 1;
    
    // Process DOT damage every 8 ticks (reduced frequency to make it less frequent)
    if (statusEffectTickRef.current >= 8) {
      processStatusEffectDamage();
      statusEffectTickRef.current = 0;
      console.log("Processing DoT damage at tick cycle " + turnCountRef.current);
    }
    
    // Update all units
    setUnits(prevUnits => {
      // Find battle entry
      const battleEntry = battleLog.find(log => log.allies && Array.isArray(log.allies));
      if (!battleEntry) return prevUnits;
      
      // Make a copy of the units to update
      const updatedUnits = [...prevUnits];
      
      // Track which units should attack this tick
      const attackingUnits: BattleUnit[] = [];
      
      // Update each unit's attack meter
      for (let i = 0; i < updatedUnits.length; i++) {
        const unit = updatedUnits[i];
        
        // Skip defeated units
        if (unit.hp <= 0) continue;
        
        // Calculate speed with our fixed calculation that includes status effects
        const effectiveSpeed = calculateEffectiveSpeed(unit);
        
        // Increase attack meter based on effective speed
        const meterIncrease = (effectiveSpeed / 40) * playbackSpeed;
        const newMeter = unit.attackMeter + meterIncrease;
        
        // If meter is full, unit should attack
        if (newMeter >= 100) {
          attackingUnits.push(unit);
        }
        
        // Update the unit with new meter value
        updatedUnits[i] = {
          ...unit,
          attackMeter: Math.min(newMeter, 100) // Cap at 100
        };
      }
      
      return updatedUnits;
    });
    
    // Process actions for units that are ready to attack
    units.forEach(unit => {
      if (unit.hp <= 0 || unit.attackMeter < 100) return;
      
      // Determine if unit is ally or enemy
      const battleEntry = battleLog.find(log => log.allies && Array.isArray(log.allies));
      const isAlly = battleEntry?.allies?.some((a: any) => a.id === unit.id) || false;
      
      // Find a target
      const possibleTargets = units.filter(u => {
        // Units must be alive
        if (u.hp <= 0) return false;
        
        // Target opposite side
        if (isAlly) {
          return battleEntry?.enemies?.some((e: any) => e.id === u.id);
        } else {
          return battleEntry?.allies?.some((a: any) => a.id === u.id);
        }
      });
      
      // If there are targets, perform the action
      if (possibleTargets.length > 0) {
        // Pick a random target
        const targetIndex = Math.floor(Math.random() * possibleTargets.length);
        const target = possibleTargets[targetIndex];
        
        // Perform the action
        performAction(unit, target);
      }
    });
  };
  
  // Set up a timer to advance the battle simulation
  useEffect(() => {
    if (isPaused || isComplete) return;
    
    const interval = setInterval(() => {
      simulationTick();
    }, 300); // Tick every 300ms
    
    return () => clearInterval(interval);
  }, [isPaused, isComplete, units, playbackSpeed]);
  
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
      
      // Reset battle state
      setActionLog([]);
      setIsComplete(false);
      setIsPaused(false);
      turnCountRef.current = 1;
      setBattleRound(1);
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
            <div className="flex justify-between items-center mb-3">
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsPaused(!isPaused)}
                  className="w-24"
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSpeedChange(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : 1)}
                  className="w-24"
                >
                  {playbackSpeed}x Speed
                </Button>
              </div>
              <div className="text-sm">
                Turn: {battleRound}
              </div>
            </div>
            
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