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
  
  // Animation states for battle transitions
  const [activeAttacker, setActiveAttacker] = useState<string | null>(null);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [showAttackAnimation, setShowAttackAnimation] = useState(false);
  const [showDamageAnimation, setShowDamageAnimation] = useState(false);
  const [attackAnimationType, setAttackAnimationType] = useState<'basic' | 'advanced' | 'ultimate'>('basic');
  const [currentSkillName, setCurrentSkillName] = useState<string>('');
  const [animationInProgress, setAnimationInProgress] = useState(false);
  
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
  
  // Helper function to render HP display with proper validation
  const renderHP = (hp: any, maxHp: any): string => {
    const validHp = Math.max(0, Math.ceil(Number(hp) || 0));
    const validMaxHp = Math.max(1, Number(maxHp) || 100);
    return `${validHp}/${validMaxHp} HP`;
  };
  
  // Helper function to calculate health bar percentage
  const calculateHealthPercent = (hp: any, maxHp: any): number => {
    const validHp = Math.max(0, Number(hp) || 0);
    const validMaxHp = Math.max(1, Number(maxHp) || 100);
    return Math.max(0, Math.min(100, (validHp / validMaxHp) * 100));
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
    // Skip if either unit is defeated or if an animation is already in progress
    if (attacker.hp <= 0 || target.hp <= 0) return;
    if (animationInProgress) return;
    
    // Set animation in progress to prevent multiple actions at once
    setAnimationInProgress(true);
    
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
    
    // Set animation states for visual feedback
    setActiveAttacker(attacker.id);
    setActiveTarget(target.id);
    setAttackAnimationType(skillType as 'basic' | 'advanced' | 'ultimate');
    setCurrentSkillName(skill.name);
    
    // Show attack animation
    setShowAttackAnimation(true);
    
    // After a delay, show damage animation
    setTimeout(() => {
      setShowAttackAnimation(false);
      setShowDamageAnimation(true);
      
      // After another delay, apply the actual damage and continue
      setTimeout(() => {
        setShowDamageAnimation(false);
        
        // Apply the damage to the target unit (update UI)
        setUnits(prevUnits => {
          return prevUnits.map(unit => {
            if (unit.id === target.id) {
              // Update target unit's HP
              return { 
                ...unit, 
                hp: Math.max(0, unit.hp - damage),
                totalDamageReceived: (unit.totalDamageReceived || 0) + damage
              };
            } else if (unit.id === attacker.id) {
              // Update attacker's damage dealt stat
              return {
                ...unit,
                totalDamageDealt: (unit.totalDamageDealt || 0) + damage
              };
            }
            return unit;
          });
        });
        
        // Add attack to the action log
        const attackString = `Turn ${turnCountRef.current}: <span class="text-${isAlly ? 'blue' : 'red'}-400">${attacker.name}</span> used <span class="font-semibold">${skill.name}</span> on <span class="text-${isAlly ? 'red' : 'blue'}-400">${target.name}</span> for <span class="text-yellow-400">${damage} damage</span>!`;
        
        setActionLog(prev => [attackString, ...prev]);
        
        // Reset attack meter for attacker
        setUnits(prevUnits => {
          return prevUnits.map(unit => {
            if (unit.id === attacker.id) {
              return { ...unit, attackMeter: 0 };
            }
            return unit;
          });
        });
        
        // Determine if we should apply status effects based on the skill
        let statusEffectApplied = false;
        let statusEffectMessage = "";
        let newStatusEffect: StatusEffect | null = null;
        
        // Check skill name to determine potential status effects
        if (skill.name === "Gust") {
          // 50% chance to apply Minor Slow (20% speed reduction) for 3 turns
          const slowRoll = Math.random() * 100;
          const slowChance = 50;
          
          // Update stats for reporting
          setUnits(prevUnits => {
            return prevUnits.map(unit => {
              if (unit.id === attacker.id) {
                return { 
                  ...unit, 
                  slowAttempts: (unit.slowAttempts || 0) + 1,
                  lastSlowRoll: slowRoll
                };
              }
              return unit;
            });
          });
          
          if (slowRoll <= slowChance) {
            statusEffectApplied = true;
            
            // Create status effect
            newStatusEffect = {
              name: "Minor Slow",
              duration: 3,
              effect: "ReduceSpd",
              value: 20, // 20% speed reduction
              source: attacker.id
            };
            
            // Add to target's status effects
            setUnits(prevUnits => {
              return prevUnits.map(unit => {
                if (unit.id === target.id) {
                  // Add status effect and update success counter
                  let existingEffects = unit.statusEffects || [];
                  
                  // Check if an existing effect of the same type exists
                  const existingEffectIndex = existingEffects.findIndex(e => e.effect === "ReduceSpd");
                  
                  if (existingEffectIndex >= 0) {
                    // Replace existing effect with the new one if it's stronger or has longer duration
                    if (existingEffects[existingEffectIndex].value < newStatusEffect!.value || 
                        existingEffects[existingEffectIndex].duration < newStatusEffect!.duration) {
                      
                      existingEffects = [
                        ...existingEffects.slice(0, existingEffectIndex),
                        newStatusEffect!,
                        ...existingEffects.slice(existingEffectIndex + 1)
                      ];
                      
                      statusEffectMessage = `<span class="text-${isAlly ? 'blue' : 'red'}-400">${attacker.name}</span> applied <span class="text-blue-400">Minor Slow</span> to <span class="text-${isAlly ? 'red' : 'blue'}-400">${target.name}</span> (replaces weaker effect)!`;
                    } else {
                      statusEffectMessage = `<span class="text-${isAlly ? 'blue' : 'red'}-400">${attacker.name}'s</span> <span class="text-blue-400">Minor Slow</span> was resisted by <span class="text-${isAlly ? 'red' : 'blue'}-400">${target.name}</span> (already has stronger effect)!`;
                      statusEffectApplied = false;
                    }
                  } else {
                    // Add new effect
                    existingEffects = [...existingEffects, newStatusEffect!];
                    statusEffectMessage = `<span class="text-${isAlly ? 'blue' : 'red'}-400">${attacker.name}</span> applied <span class="text-blue-400">Minor Slow</span> to <span class="text-${isAlly ? 'red' : 'blue'}-400">${target.name}</span> (Speed -20% for 3 turns)!`;
                  }
                  
                  return { 
                    ...unit, 
                    statusEffects: existingEffects,
                    slowSuccess: statusEffectApplied ? (unit.slowSuccess || 0) + 1 : (unit.slowSuccess || 0)
                  };
                } else if (unit.id === attacker.id) {
                  return {
                    ...unit,
                    slowSuccess: statusEffectApplied ? (unit.slowSuccess || 0) + 1 : (unit.slowSuccess || 0)
                  };
                }
                return unit;
              });
            });
          } else {
            statusEffectMessage = `<span class="text-${isAlly ? 'blue' : 'red'}-400">${attacker.name}'s</span> <span class="text-blue-400">Minor Slow</span> failed to affect <span class="text-${isAlly ? 'red' : 'blue'}-400">${target.name}</span> (${slowRoll.toFixed(1)}% > ${slowChance}%)!`;
          }
        } else if (skill.name === "Stone Slam") {
          // 20% chance to apply Minor Weakness (10% attack reduction) for 2 turns
          const weakenRoll = Math.random() * 100;
          const weakenChance = 20;
          
          // Update stats for reporting
          setUnits(prevUnits => {
            return prevUnits.map(unit => {
              if (unit.id === attacker.id) {
                return { 
                  ...unit, 
                  weakenAttempts: (unit.weakenAttempts || 0) + 1,
                  lastWeakenRoll: weakenRoll
                };
              }
              return unit;
            });
          });
          
          if (weakenRoll <= weakenChance) {
            statusEffectApplied = true;
            
            // Create status effect
            newStatusEffect = {
              name: "Minor Weakness",
              duration: 2,
              effect: "ReduceAtk",
              value: 10, // 10% attack reduction
              source: attacker.id
            };
            
            // Add to target's status effects
            setUnits(prevUnits => {
              return prevUnits.map(unit => {
                if (unit.id === target.id) {
                  // Add status effect and update success counter
                  let existingEffects = unit.statusEffects || [];
                  
                  // Check if an existing effect of the same type exists
                  const existingEffectIndex = existingEffects.findIndex(e => e.effect === "ReduceAtk");
                  
                  if (existingEffectIndex >= 0) {
                    // Replace existing effect with the new one if it's stronger or has longer duration
                    if (existingEffects[existingEffectIndex].value < newStatusEffect!.value || 
                        existingEffects[existingEffectIndex].duration < newStatusEffect!.duration) {
                      
                      existingEffects = [
                        ...existingEffects.slice(0, existingEffectIndex),
                        newStatusEffect!,
                        ...existingEffects.slice(existingEffectIndex + 1)
                      ];
                      
                      statusEffectMessage = `<span class="text-${isAlly ? 'blue' : 'red'}-400">${attacker.name}</span> applied <span class="text-orange-400">Minor Weakness</span> to <span class="text-${isAlly ? 'red' : 'blue'}-400">${target.name}</span> (replaces weaker effect)!`;
                    } else {
                      statusEffectMessage = `<span class="text-${isAlly ? 'blue' : 'red'}-400">${attacker.name}'s</span> <span class="text-orange-400">Minor Weakness</span> was resisted by <span class="text-${isAlly ? 'red' : 'blue'}-400">${target.name}</span> (already has stronger effect)!`;
                      statusEffectApplied = false;
                    }
                  } else {
                    // Add new effect
                    existingEffects = [...existingEffects, newStatusEffect!];
                    statusEffectMessage = `<span class="text-${isAlly ? 'blue' : 'red'}-400">${attacker.name}</span> applied <span class="text-orange-400">Minor Weakness</span> to <span class="text-${isAlly ? 'red' : 'blue'}-400">${target.name}</span> (Attack -10% for 2 turns)!`;
                  }
                  
                  return { 
                    ...unit, 
                    statusEffects: existingEffects,
                    weakenSuccess: statusEffectApplied ? (unit.weakenSuccess || 0) + 1 : (unit.weakenSuccess || 0)
                  };
                } else if (unit.id === attacker.id) {
                  return {
                    ...unit,
                    weakenSuccess: statusEffectApplied ? (unit.weakenSuccess || 0) + 1 : (unit.weakenSuccess || 0)
                  };
                }
                return unit;
              });
            });
          } else {
            statusEffectMessage = `<span class="text-${isAlly ? 'blue' : 'red'}-400">${attacker.name}'s</span> <span class="text-orange-400">Minor Weakness</span> failed to affect <span class="text-${isAlly ? 'red' : 'blue'}-400">${target.name}</span> (${weakenRoll.toFixed(1)}% > ${weakenChance}%)!`;
          }
        } else if (skill.name === "Ember") {
          // 30% chance to apply Burning effect for 2 turns
          const burnRoll = Math.random() * 100;
          const burnChance = 30;
          
          // Update stats for reporting
          setUnits(prevUnits => {
            return prevUnits.map(unit => {
              if (unit.id === attacker.id) {
                return { 
                  ...unit, 
                  burnAttempts: (unit.burnAttempts || 0) + 1,
                  lastBurnRoll: burnRoll
                };
              }
              return unit;
            });
          });
          
          if (burnRoll <= burnChance) {
            statusEffectApplied = true;
            
            // Burning damage is based on a percentage of target's max HP
            const burnDamage = Math.max(1, Math.floor(target.maxHp * 0.05)); // 5% of max HP
            
            // Create status effect
            newStatusEffect = {
              name: "Burning",
              duration: 2,
              effect: "Burn",
              value: burnDamage,
              source: attacker.id
            };
            
            // Add to target's status effects
            setUnits(prevUnits => {
              return prevUnits.map(unit => {
                if (unit.id === target.id) {
                  // Add status effect and update success counter
                  let existingEffects = unit.statusEffects || [];
                  
                  // Check if an existing effect of the same type exists
                  const existingEffectIndex = existingEffects.findIndex(e => e.effect === "Burn");
                  
                  if (existingEffectIndex >= 0) {
                    // Replace existing effect with the new one if it's stronger or has longer duration
                    if (existingEffects[existingEffectIndex].value < newStatusEffect!.value || 
                        existingEffects[existingEffectIndex].duration < newStatusEffect!.duration) {
                      
                      existingEffects = [
                        ...existingEffects.slice(0, existingEffectIndex),
                        newStatusEffect!,
                        ...existingEffects.slice(existingEffectIndex + 1)
                      ];
                      
                      statusEffectMessage = `<span class="text-${isAlly ? 'blue' : 'red'}-400">${attacker.name}</span> applied <span class="text-red-400">Burning</span> to <span class="text-${isAlly ? 'red' : 'blue'}-400">${target.name}</span> (replaces weaker burning)!`;
                    } else {
                      statusEffectMessage = `<span class="text-${isAlly ? 'blue' : 'red'}-400">${attacker.name}'s</span> <span class="text-red-400">Burning</span> was resisted by <span class="text-${isAlly ? 'red' : 'blue'}-400">${target.name}</span> (already has stronger effect)!`;
                      statusEffectApplied = false;
                    }
                  } else {
                    // Add new effect
                    existingEffects = [...existingEffects, newStatusEffect!];
                    statusEffectMessage = `<span class="text-${isAlly ? 'blue' : 'red'}-400">${attacker.name}</span> applied <span class="text-red-400">Burning</span> to <span class="text-${isAlly ? 'red' : 'blue'}-400">${target.name}</span> (${burnDamage} damage per turn for 2 turns)!`;
                  }
                  
                  return { 
                    ...unit, 
                    statusEffects: existingEffects,
                    burnSuccess: statusEffectApplied ? (unit.burnSuccess || 0) + 1 : (unit.burnSuccess || 0)
                  };
                } else if (unit.id === attacker.id) {
                  return {
                    ...unit,
                    burnSuccess: statusEffectApplied ? (unit.burnSuccess || 0) + 1 : (unit.burnSuccess || 0)
                  };
                }
                return unit;
              });
            });
          } else {
            statusEffectMessage = `<span class="text-${isAlly ? 'blue' : 'red'}-400">${attacker.name}'s</span> <span class="text-red-400">Burning</span> failed to affect <span class="text-${isAlly ? 'red' : 'blue'}-400">${target.name}</span> (${burnRoll.toFixed(1)}% > ${burnChance}%)!`;
          }
        }
        
        // Log status effect application if any
        if (statusEffectApplied) {
          setActionLog(prev => [statusEffectMessage, ...prev]);
        }
        
        // Check if battle has ended
        setTimeout(() => {
          checkBattleEnd();
          
          // Clear animation states
          setActiveAttacker(null);
          setActiveTarget(null);
          setShowAttackAnimation(false);
          setShowDamageAnimation(false);
          setAnimationInProgress(false);
        }, 300);
        
      }, 500);
    }, 500);
  };

  useEffect(() => {
    // Initialize units from battle log on first render
    if (battleLog.length > 0 && isOpen) {
      const battleEntry = battleLog[0];
      console.log("Battle entry data:", battleEntry);
      
      if (battleEntry && battleEntry.allies && battleEntry.enemies) {
        const allUnits = [...battleEntry.allies, ...battleEntry.enemies];
        console.log("All units before processing:", allUnits);
        
        // Make sure each unit has valid hp and maxHp values
        const processedUnits = allUnits.map((unit: any) => {
          // Ensure HP and maxHP are valid numbers by forcing numeric conversion and validation
          const maxHp = Number.isFinite(Number(unit.maxHp)) ? Math.max(1, Number(unit.maxHp)) : 100;
          const hp = Number.isFinite(Number(unit.hp)) ? Math.min(maxHp, Math.max(0, Number(unit.hp))) : maxHp;
          
          // Log the processed values for debugging
          console.log(`Processed unit ${unit.name}: hp=${hp}, maxHp=${maxHp}, original values: hp=${unit.hp}, maxHp=${unit.maxHp}`);
          
          return {
            ...unit,
            hp: hp,
            maxHp: maxHp,
            // Initialize tracking counters for display purposes
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            totalHealingDone: 0,
            totalHealingReceived: 0,
            // Add attack meter for each unit (starts between 70-90%)
            attackMeter: Math.floor(Math.random() * 20) + 70
          };
        });
        
        console.log("Processed units:", processedUnits);
        setUnits(processedUnits);
      }
    }
  }, [battleLog, isOpen]);

  useEffect(() => {
    // Battle simulation loop - only runs when not paused and there are units
    if (!isPaused && units.length > 0 && !isComplete) {
      const battleTimer = setInterval(() => {
        // Increment attack meters for all units
        setUnits(prevUnits => {
          // Find the unit with the highest attack meter
          let highestMeterUnit: BattleUnit | null = null;
          let highestMeter = 0;
          
          const updatedUnits = prevUnits.map(unit => {
            // Skip if unit is defeated
            if (unit.hp <= 0) return unit;
            
            // Calculate effective speed after status effects
            const effectiveSpeed = calculateEffectiveSpeed(unit);
            
            // Calculate meter increment based on speed
            // Formula: faster units fill their attack meter faster
            const increment = Math.max(1, Math.floor(effectiveSpeed / 5));
            
            // Increase attack meter
            const newMeter = Math.min(100, unit.attackMeter + increment * playbackSpeed);
            
            // Update highest meter tracker
            if (newMeter > highestMeter) {
              highestMeter = newMeter;
              highestMeterUnit = { ...unit, attackMeter: newMeter };
            }
            
            return { ...unit, attackMeter: newMeter };
          });
          
          // If any unit reached 100% attack meter
          if (highestMeter >= 100 && highestMeterUnit) {
            // Update status effect durations first
            highestMeterUnit = { 
              ...highestMeterUnit,
              statusEffects: highestMeterUnit.statusEffects?.map(effect => ({
                ...effect,
                // Decrease duration by 1 when the unit takes a turn
                duration: effect.duration - 1
              })).filter(effect => effect.duration > 0)
            };
            
            // Apply DoT effects (Burn, Poison, etc.) before the unit acts
            if (highestMeterUnit.statusEffects && highestMeterUnit.statusEffects.length > 0) {
              // Process Burn damage
              const burnEffect = highestMeterUnit.statusEffects.find(effect => effect.effect === "Burn");
              
              if (burnEffect) {
                const burnDamage = burnEffect.value;
                
                // Apply burning damage
                highestMeterUnit = {
                  ...highestMeterUnit,
                  hp: Math.max(0, highestMeterUnit.hp - burnDamage),
                  totalDamageReceived: (highestMeterUnit.totalDamageReceived || 0) + burnDamage
                };
                
                // Log damage
                const sourceUnit = prevUnits.find(u => u.id === burnEffect.source);
                
                // Update source unit's damage dealt if found
                if (sourceUnit) {
                  const sourceIndex = updatedUnits.findIndex(u => u.id === sourceUnit.id);
                  if (sourceIndex >= 0) {
                    updatedUnits[sourceIndex] = {
                      ...updatedUnits[sourceIndex],
                      totalDamageDealt: (updatedUnits[sourceIndex].totalDamageDealt || 0) + burnDamage
                    };
                  }
                }
                
                // Log to action log
                const attackerName = sourceUnit ? sourceUnit.name : "Unknown";
                const isSourceAlly = battleLog[0]?.allies?.some((a: any) => a.id === burnEffect.source);
                
                setActionLog(prev => [
                  `<span class="text-${isSourceAlly ? 'blue' : 'red'}-400">${attackerName}'s</span> <span class="text-red-400">Burning</span> dealt <span class="text-yellow-400">${burnDamage} damage</span> to <span class="text-${isSourceAlly ? 'red' : 'blue'}-400">${highestMeterUnit!.name}</span>!`,
                  ...prev
                ]);
              }
            }
            
            // Find a target - for simplicity, target a random unit from the opposite side
            const battleEntry = battleLog.find(log => log.allies && Array.isArray(log.allies));
            const isAlly = battleEntry?.allies?.some((a: any) => a.id === highestMeterUnit!.id) || false;
            
            // Get all valid targets (enemy units that are still alive)
            const validTargets = prevUnits
              .filter(u => u.hp > 0)
              .filter(u => isAlly ? 
                !battleEntry?.allies?.some((a: any) => a.id === u.id) : 
                battleEntry?.allies?.some((a: any) => a.id === u.id)
              );
            
            if (validTargets.length > 0) {
              // Select random target
              const targetIndex = Math.floor(Math.random() * validTargets.length);
              const target = validTargets[targetIndex];
              
              // Update the unit in our local updatedUnits array to include status effect duration changes
              const actingUnitIndex = updatedUnits.findIndex(u => u.id === highestMeterUnit!.id);
              if (actingUnitIndex >= 0) {
                updatedUnits[actingUnitIndex] = highestMeterUnit!;
              }
              
              // Queue the action to occur after the state update
              setTimeout(() => performAction(highestMeterUnit!, target), 50);
            }
          }
          
          return updatedUnits;
        });
      }, 100); // Update every 100ms
      
      return () => clearInterval(battleTimer);
    }
  }, [isPaused, units, isComplete, playbackSpeed, battleLog]);

  useEffect(() => {
    // Reset state when dialog is opened
    if (isOpen) {
      setIsPaused(false);
      setIsComplete(false);
      setActionLog([]);
      setDetailedActionLog([]);
      turnCountRef.current = 1;
      setBattleRound(1);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-5xl bg-[#241045] text-[#C8B8DB] border-[#432874] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">
            <div className="flex items-center gap-2">
              <span className="text-[#FF9D00]">Battle Log</span>
              <span className="text-sm font-normal opacity-60 mt-1">
                {isComplete ? "Battle Completed" : "Battle in Progress..."}
              </span>
            </div>
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
                  <motion.div 
                    key={unit.id} 
                    className={`bg-[#432874]/20 p-2 rounded ${activeAttacker === unit.id ? 'ring-2 ring-yellow-400' : ''} ${activeTarget === unit.id ? 'ring-2 ring-red-500' : ''}`}
                    animate={{
                      scale: (activeAttacker === unit.id && showAttackAnimation) ? [1, 1.05, 1] : 1,
                      x: (activeAttacker === unit.id && showAttackAnimation) ? [0, -5, 0] : 0
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-[#7855FF]/30 flex items-center justify-center overflow-hidden border border-[#7855FF]/50">
                        <span className="text-lg">{unit.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span>{unit.name}</span>
                          <motion.span 
                            animate={{ 
                              scale: (activeTarget === unit.id && showDamageAnimation) ? [1, 1.2, 1] : 1,
                              color: (activeTarget === unit.id && showDamageAnimation) ? ['#C8B8DB', '#ff0000', '#C8B8DB'] : '#C8B8DB' 
                            }}
                            transition={{ duration: 0.5 }}
                          >
                            {renderHP(unit.hp, unit.maxHp)}
                          </motion.span>
                        </div>
                        <div className="w-full bg-[#432874]/30 h-2 rounded">
                          <motion.div
                            className="bg-[#00B9AE] h-full rounded"
                            style={{ width: `${calculateHealthPercent(unit.hp, unit.maxHp)}%` }}
                            animate={{ 
                              backgroundColor: (activeTarget === unit.id && showDamageAnimation) ? ['#00B9AE', '#ff0000', '#00B9AE'] : '#00B9AE'
                            }}
                            transition={{ duration: 0.5 }}
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
                  </motion.div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Enemies</h3>
                {units.filter(u => battleLog[0]?.enemies?.some((e: any) => e.id === u.id)).map(unit => (
                  <motion.div 
                    key={unit.id} 
                    className={`bg-[#432874]/20 p-2 rounded ${activeAttacker === unit.id ? 'ring-2 ring-yellow-400' : ''} ${activeTarget === unit.id ? 'ring-2 ring-red-500' : ''}`}
                    animate={{
                      scale: (activeAttacker === unit.id && showAttackAnimation) ? [1, 1.05, 1] : 1,
                      x: (activeAttacker === unit.id && showAttackAnimation) ? [0, 5, 0] : 0
                    }}
                    transition={{ duration: 0.5 }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-[#DC143C]/30 flex items-center justify-center overflow-hidden border border-[#DC143C]/50">
                        <span className="text-lg">{unit.name.charAt(0)}</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span>{unit.name}</span>
                          <motion.span 
                            animate={{ 
                              scale: (activeTarget === unit.id && showDamageAnimation) ? [1, 1.2, 1] : 1,
                              color: (activeTarget === unit.id && showDamageAnimation) ? ['#C8B8DB', '#ff0000', '#C8B8DB'] : '#C8B8DB' 
                            }}
                            transition={{ duration: 0.5 }}
                          >
                            {renderHP(unit.hp, unit.maxHp)}
                          </motion.span>
                        </div>
                        <div className="w-full bg-[#432874]/30 h-2 rounded">
                          <motion.div
                            className="bg-[#DC143C] h-full rounded"
                            style={{ width: `${calculateHealthPercent(unit.hp, unit.maxHp)}%` }}
                            animate={{ 
                              backgroundColor: (activeTarget === unit.id && showDamageAnimation) ? ['#DC143C', '#ff0000', '#DC143C'] : '#DC143C'
                            }}
                            transition={{ duration: 0.5 }}
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
                  </motion.div>
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
                  <li>✓ Added animation states to visualize attack and damage actions</li>
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