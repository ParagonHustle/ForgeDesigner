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

// Interface definitions remained the same
interface StatusEffect {
  name: string;
  duration: number;
  effect: string; 
  value: number;  
  source?: string; 
}

interface BattleUnit {
  id: string | number;
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
    basic: { name: string; damage: number }; 
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
  const [activeAttacker, setActiveAttacker] = useState<string | number | null>(null);
  const [activeTarget, setActiveTarget] = useState<string | number | null>(null);
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
  
  useEffect(() => {
    console.log('battleLog data:', battleLog);
    if (battleLog.length > 0 && isOpen) {
      // Reset logs and states when a new battle log is loaded
      setActionLog([]);
      setDetailedActionLog([]);
      setUnits([]);
      setIsComplete(false);
      setCurrentStage(0);
      resetAnimationStates();
      
      // Get the initial data from the first stage of the battle log
      console.log('Looking for initial battle data from entry types:', battleLog.map(entry => entry.type));
      const initialBattleData = battleLog.find(entry => 
        entry.type === 'battle-start' || entry.type === 'battle_start'
      );
      if (initialBattleData) {
        // Set up initial units
        const initialUnits = [
          ...initialBattleData.allies.map((ally: any) => {
            // Calculate HP based on vitality (8x multiplier)
            const maxHp = ally.stats.vitality * 8;
            
            return {
              id: ally.id,
              name: ally.name,
              hp: maxHp,
              maxHp: maxHp,
              attackMeter: 0,
              totalDamageDealt: 0,
              totalDamageReceived: 0,
              totalHealingDone: 0,
              totalHealingReceived: 0,
              stats: { ...ally.stats },
              auraBonus: ally.auraBonus,
              skills: { ...ally.skills },
              statusEffects: []
            };
          }),
          ...initialBattleData.enemies.map((enemy: any) => {
            // Calculate HP based on vitality (8x multiplier)
            const maxHp = enemy.stats.vitality * 8;
            
            return {
              id: enemy.id,
              name: enemy.name,
              hp: maxHp,
              maxHp: maxHp,
              attackMeter: 0,
              totalDamageDealt: 0,
              totalDamageReceived: 0,
              totalHealingDone: 0,
              totalHealingReceived: 0,
              stats: { ...enemy.stats },
              skills: { ...enemy.skills },
              statusEffects: []
            };
          })
        ];
        
        console.log('Setting initial units:', initialUnits);
        setUnits(initialUnits);
        
        // Start replay after a short delay for initialization
        if (!isPaused) {
          setTimeout(() => {
            console.log('Starting battle simulation with units:', initialUnits);
            simulateBattle(0);
          }, 1000);
        }
      }
    }
  }, [battleLog, isOpen, isPaused]);
  
  // Reset animation states to default
  const resetAnimationStates = () => {
    setActiveAttacker(null);
    setActiveTarget(null);
    setShowAttackAnimation(false);
    setShowDamageAnimation(false);
    setAttackAnimationType('basic');
    setCurrentSkillName('');
    setAnimationInProgress(false);
  };
  
  // Process turn
  const processTurn = (turn: any) => {
    turnCountRef.current = turn.turnNumber;
    setBattleRound(turn.turnNumber);
    
    // Apply effects like burning and poison before the unit acts
    if (turn.preActionEffects && turn.preActionEffects.length > 0) {
      turn.preActionEffects.forEach((effect: any) => {
        if (effect.type === 'dot-damage') {
          updateUnitHealth(effect.targetId, -effect.value);
          
          const effectType = effect.effect === 'Burn' ? 'Burning' : 'Poison';
          const logMessage = `Turn ${turn.turnNumber}: ${effect.targetName} takes ${effect.value} damage from ${effectType}`;
          addToLog(logMessage);
          
          // Add more detailed information to the detailed log
          const detailedLogMessage = `Turn ${turn.turnNumber}: ${effect.targetName} suffers ${effect.value} damage from ${effectType} (${effect.duration} turns remaining)`;
          addToDetailedLog(detailedLogMessage);
        }
      });
    }
    
    // Process this turn's actions (attack, use skill, etc)
    if (turn.action) {
      const { action } = turn;
      
      // Update attack meter for the actor
      updateUnitAttackMeter(action.actorId, 0); // Reset attack meter after acting
      
      setActiveAttacker(action.actorId);
      
      // Log the action based on type
      if (action.type === 'attack') {
        setAttackAnimationType('basic');
        setCurrentSkillName(action.skillName || 'Basic Attack');
        
        // For attacks with multiple targets (like Wildfire or Dust Spikes)
        if (Array.isArray(action.targetId)) {
          // Trigger animation for multiple targets sequentially
          triggerMultiTargetAttackAnimation(action.actorId, action.targetId, action.damage, action.skillName);
          
          // Log the multi-target attack
          const targetNames = action.targetId.map((id: string) => {
            const target = units.find(u => u.id === id);
            return target ? target.name : 'Unknown';
          }).join(', ');
          
          const logMessage = `Turn ${turn.turnNumber}: ${action.actorName} used ${action.skillName} on ${targetNames}`;
          addToLog(logMessage);
          
          // Log damage for each target in the detailed log
          action.targetId.forEach((targetId: string, index: number) => {
            const target = units.find(u => u.id === targetId);
            if (target) {
              const damageValue = Array.isArray(action.damage) ? action.damage[index] : action.damage;
              const detailedLogMessage = `Turn ${turn.turnNumber}: ${action.actorName} deals ${damageValue} damage to ${target.name} with ${action.skillName}`;
              addToDetailedLog(detailedLogMessage);
              
              // Update stats for damage tracking
              updateUnitDamageStats(action.actorId, targetId, damageValue);
            }
          });
        } else {
          // Single target attack
          setActiveTarget(action.targetId);
          setShowAttackAnimation(true);
          
          setTimeout(() => {
            setShowAttackAnimation(false);
            setShowDamageAnimation(true);
            
            // Update health after a delay for visual effect
            setTimeout(() => {
              updateUnitHealth(action.targetId, -action.damage);
              setShowDamageAnimation(false);
              
              setTimeout(() => {
                setActiveAttacker(null);
                setActiveTarget(null);
              }, 300);
            }, 300);
          }, 500 / playbackSpeed);
          
          const logMessage = `Turn ${turn.turnNumber}: ${action.actorName} used ${action.skillName || 'Basic Attack'} on ${action.targetName} for ${action.damage} damage`;
          addToLog(logMessage);
          
          // Add more detailed information to the detailed log
          let detailedLogMessage = `Turn ${turn.turnNumber}: ${action.actorName} deals ${action.damage} damage to ${action.targetName}`;
          if (action.critical) {
            detailedLogMessage += ' (Critical Hit!)';
          }
          addToDetailedLog(detailedLogMessage);
          
          // Update stats for damage tracking
          updateUnitDamageStats(action.actorId, action.targetId, action.damage);
        }
      } else if (action.type === 'heal') {
        // Healing action processing
        setActiveTarget(action.targetId);
        setAttackAnimationType('advanced');
        setCurrentSkillName(action.skillName || 'Heal');
        
        setTimeout(() => {
          updateUnitHealth(action.targetId, action.value); // Healing is positive
          
          setTimeout(() => {
            setActiveAttacker(null);
            setActiveTarget(null);
          }, 300);
        }, 500 / playbackSpeed);
        
        const logMessage = `Turn ${turn.turnNumber}: ${action.actorName} healed ${action.targetName} for ${action.value} HP`;
        addToLog(logMessage);
        
        // Add more detailed information to the detailed log
        const detailedLogMessage = `Turn ${turn.turnNumber}: ${action.actorName} restores ${action.value} HP to ${action.targetName} with ${action.skillName || 'Healing'}`;
        addToDetailedLog(detailedLogMessage);
        
        // Update stats for healing tracking
        updateUnitHealingStats(action.actorId, action.targetId, action.value);
      }
      
      // Process status effect applications
      if (action.statusEffects && action.statusEffects.length > 0) {
        action.statusEffects.forEach((effectData: any) => {
          if (effectData.applied) {
            // Add status effect to the target unit
            applyStatusEffect(effectData.targetId, {
              name: effectData.name,
              duration: effectData.duration,
              effect: effectData.type,
              value: effectData.value,
              source: action.actorId
            });
            
            // Log the status effect application
            const statusTarget = units.find(unit => unit.id === effectData.targetId);
            const statusLogMessage = `Turn ${turn.turnNumber}: ${action.actorName} applied ${effectData.name} to ${statusTarget?.name || 'Unknown'}`;
            addToDetailedLog(statusLogMessage);
            
            // For special effects like burn/poison/slow/weaken, add to tracker
            if (effectData.type === 'Burn') {
              updateStatusEffectStats(action.actorId, 'burn', true, effectData.roll);
            } else if (effectData.type === 'Poison') {
              updateStatusEffectStats(action.actorId, 'poison', true, effectData.roll);
            } else if (effectData.type === 'ReduceSpd') {
              updateStatusEffectStats(action.actorId, 'slow', true, effectData.roll);
            } else if (effectData.type === 'ReduceAtk') {
              updateStatusEffectStats(action.actorId, 'weaken', true, effectData.roll);
            }
          } else {
            // Status effect failed to apply (roll failed)
            const statusTarget = units.find(unit => unit.id === effectData.targetId);
            const statusLogMessage = `Turn ${turn.turnNumber}: ${action.actorName} failed to apply ${effectData.name} to ${statusTarget?.name || 'Unknown'} (roll: ${effectData.roll})`;
            addToDetailedLog(statusLogMessage);
            
            // For special effects like burn/poison/slow/weaken, add to tracker
            if (effectData.type === 'Burn') {
              updateStatusEffectStats(action.actorId, 'burn', false, effectData.roll);
            } else if (effectData.type === 'Poison') {
              updateStatusEffectStats(action.actorId, 'poison', false, effectData.roll);
            } else if (effectData.type === 'ReduceSpd') {
              updateStatusEffectStats(action.actorId, 'slow', false, effectData.roll);
            } else if (effectData.type === 'ReduceAtk') {
              updateStatusEffectStats(action.actorId, 'weaken', false, effectData.roll);
            }
          }
        });
      }
    }
    
    // Process meter updates for all units
    if (turn.meterUpdates) {
      turn.meterUpdates.forEach((update: any) => {
        updateUnitAttackMeter(update.unitId, update.value);
      });
    }
    
    // Process status effect updates
    if (turn.statusEffectUpdates) {
      turn.statusEffectUpdates.forEach((update: any) => {
        updateStatusEffectDuration(update.unitId, update.effectIndex, update.newDuration);
      });
    }
  };
  
  // Update attack meter for a unit
  const updateUnitAttackMeter = (unitId: string, newValue: number) => {
    setUnits(prevUnits => prevUnits.map(unit => {
      if (unit.id === unitId) {
        return {
          ...unit,
          attackMeter: newValue
        };
      }
      return unit;
    }));
  };
  
  // Update health for a unit
  const updateUnitHealth = (unitId: string, changeAmount: number) => {
    setUnits(prevUnits => prevUnits.map(unit => {
      if (unit.id === unitId) {
        // Calculate new HP ensuring it's not below 0
        const newHp = Math.max(0, unit.hp + changeAmount);
        return {
          ...unit,
          hp: Math.min(newHp, unit.maxHp) // Don't exceed max HP
        };
      }
      return unit;
    }));
  };
  
  // Update damage statistics for a unit
  const updateUnitDamageStats = (attackerId: string, targetId: string, damageAmount: number) => {
    setUnits(prevUnits => prevUnits.map(unit => {
      if (unit.id === attackerId) {
        return {
          ...unit,
          totalDamageDealt: (unit.totalDamageDealt || 0) + damageAmount
        };
      }
      if (unit.id === targetId) {
        return {
          ...unit,
          totalDamageReceived: (unit.totalDamageReceived || 0) + damageAmount
        };
      }
      return unit;
    }));
  };
  
  // Update healing statistics for a unit
  const updateUnitHealingStats = (healerId: string, targetId: string, healAmount: number) => {
    setUnits(prevUnits => prevUnits.map(unit => {
      if (unit.id === healerId) {
        return {
          ...unit,
          totalHealingDone: (unit.totalHealingDone || 0) + healAmount
        };
      }
      if (unit.id === targetId) {
        return {
          ...unit,
          totalHealingReceived: (unit.totalHealingReceived || 0) + healAmount
        };
      }
      return unit;
    }));
  };
  
  // Update status effect statistics for applying effects
  const updateStatusEffectStats = (unitId: string, effectType: 'burn' | 'poison' | 'slow' | 'weaken', success: boolean, roll?: number) => {
    setUnits(prevUnits => prevUnits.map(unit => {
      if (unit.id === unitId) {
        let updatedUnit = { ...unit };
        
        if (effectType === 'burn') {
          updatedUnit.burnAttempts = (unit.burnAttempts || 0) + 1;
          if (success) updatedUnit.burnSuccess = (unit.burnSuccess || 0) + 1;
          if (roll !== undefined) updatedUnit.lastBurnRoll = roll;
        } else if (effectType === 'poison') {
          updatedUnit.poisonAttempts = (unit.poisonAttempts || 0) + 1;
          if (success) updatedUnit.poisonSuccess = (unit.poisonSuccess || 0) + 1;
          if (roll !== undefined) updatedUnit.lastPoisonRoll = roll;
        } else if (effectType === 'slow') {
          updatedUnit.slowAttempts = (unit.slowAttempts || 0) + 1;
          if (success) updatedUnit.slowSuccess = (unit.slowSuccess || 0) + 1;
          if (roll !== undefined) updatedUnit.lastSlowRoll = roll;
        } else if (effectType === 'weaken') {
          updatedUnit.weakenAttempts = (unit.weakenAttempts || 0) + 1;
          if (success) updatedUnit.weakenSuccess = (unit.weakenSuccess || 0) + 1;
          if (roll !== undefined) updatedUnit.lastWeakenRoll = roll;
        }
        
        return updatedUnit;
      }
      return unit;
    }));
  };
  
  // Apply a status effect to a unit
  const applyStatusEffect = (unitId: string, effect: StatusEffect) => {
    setUnits(prevUnits => prevUnits.map(unit => {
      if (unit.id === unitId) {
        // Initialize or add to existing status effects array
        const updatedStatusEffects = unit.statusEffects ? [...unit.statusEffects] : [];
        updatedStatusEffects.push(effect);
        return {
          ...unit,
          statusEffects: updatedStatusEffects
        };
      }
      return unit;
    }));
  };
  
  // Update the duration of a status effect
  const updateStatusEffectDuration = (unitId: string, effectIndex: number, newDuration: number) => {
    setUnits(prevUnits => prevUnits.map(unit => {
      if (unit.id === unitId && unit.statusEffects) {
        const updatedStatusEffects = [...unit.statusEffects];
        
        if (newDuration <= 0) {
          // Remove the effect if duration is zero or less
          updatedStatusEffects.splice(effectIndex, 1);
        } else if (updatedStatusEffects[effectIndex]) {
          // Update the duration of the effect
          updatedStatusEffects[effectIndex] = {
            ...updatedStatusEffects[effectIndex],
            duration: newDuration
          };
        }
        
        return {
          ...unit,
          statusEffects: updatedStatusEffects
        };
      }
      return unit;
    }));
  };
  
  // Add a message to the main log
  const addToLog = (message: string) => {
    setActionLog(prevLog => [...prevLog, message]);
  };
  
  // Add a message to the detailed log
  const addToDetailedLog = (message: string) => {
    setDetailedActionLog(prevLog => [...prevLog, message]);
  };
  
  // Handle animating multi-target attacks (like Wildfire or Dust Spikes)
  const triggerMultiTargetAttackAnimation = (attackerId: string, targetIds: string[], damages: number[] | number, skillName: string) => {
    setActiveAttacker(attackerId);
    setAttackAnimationType('advanced');
    setCurrentSkillName(skillName);
    
    // Process each target sequentially with delays
    let delay = 0;
    const targetProcessingTime = 800 / playbackSpeed; // Time for each target
    
    targetIds.forEach((targetId, index) => {
      setTimeout(() => {
        setActiveTarget(targetId);
        setShowAttackAnimation(true);
        
        setTimeout(() => {
          setShowAttackAnimation(false);
          setShowDamageAnimation(true);
          
          // Calculate damage - could be an array of damages or a single value
          const damageValue = Array.isArray(damages) ? damages[index] : damages;
          
          // Update health after a delay for visual effect
          setTimeout(() => {
            updateUnitHealth(targetId, -damageValue);
            setShowDamageAnimation(false);
            
            // If last target, reset active states
            if (index === targetIds.length - 1) {
              setTimeout(() => {
                setActiveAttacker(null);
                setActiveTarget(null);
              }, 300);
            }
          }, 200);
        }, 300);
      }, delay);
      
      // Increment delay for next target
      delay += targetProcessingTime;
    });
  };
  
  // MAIN BATTLE SIMULATION LOGIC
  const simulateBattle = (startIndex: number) => {
    if (isPaused || !isOpen) return;
    
    // Find all battle turn events
    console.log('Full battle log array:', battleLog);
    console.log('Types found in battleLog:', battleLog.map(event => event.type));
    
    // Also include battle_end events which provide final outcome details
    const battleEvents = battleLog.filter(event => 
      event.type === 'battle-turn' || 
      event.type === 'battle_turn' || 
      event.type === 'round' ||  // Include 'round' events
      event.type === 'stage-clear' ||
      event.type === 'stage_clear' ||
      event.type === 'battle-end' ||
      event.type === 'battle_end' ||
      event.type === 'dungeon-complete' ||
      event.type === 'dungeon_complete' ||
      event.type === 'dungeon-failed' ||
      event.type === 'dungeon_failed'
    );
    
    console.log('Filtered battle events:', battleEvents);
    
    // Process battle events one by one with appropriate delays
    const processEvents = (index: number) => {
      if (index >= battleEvents.length || isPaused || !isOpen) {
        return;
      }
      
      const event = battleEvents[index];
      
      if (event.type === 'battle-turn' || event.type === 'battle_turn') {
        setAnimationInProgress(true);
        
        setTimeout(() => {
          processTurn(event);
          
          // Calculate delay based on action complexity
          let actionDelay = 1500; // Base delay
          
          // If it's a multi-target attack, add more delay
          if (event.action && event.action.type === 'attack' && Array.isArray(event.action.targetId)) {
            actionDelay += event.action.targetId.length * 600;
          }
          
          // Adjust for playback speed
          actionDelay = actionDelay / playbackSpeed;
          
          setTimeout(() => {
            setAnimationInProgress(false);
            processEvents(index + 1);
          }, actionDelay);
        }, 100);
      } else if (event.type === 'round') {
        // Process round events which contain multiple actions
        console.log("Processing round event:", event);
        setAnimationInProgress(true);
        setBattleRound(event.number);
        
        // Process each action in the round
        let actions = event.actions || [];
        
        // If there are no actions, we'll generate some mock actions based on the available units
        // This ensures the battle still progresses visually even with empty action arrays
        if (actions.length === 0 && units.length > 0) {
          console.log("No actions found, generating mock actions for this round");
          
          // Split units into allies and enemies for targeting
          const allies = units.filter(unit => {
            const id = String(unit.id);
            return !id.includes('enemy') && unit.hp > 0;
          });
          
          const enemies = units.filter(unit => {
            const id = String(unit.id);
            return id.includes('enemy') && unit.hp > 0;
          });
          
          // Generate one action per living unit, alternating between allies and enemies
          const allLivingUnits = units.filter(unit => unit.hp > 0);
          const mockActions = [];
          
          // Allies and enemies take turns attacking
          // We'll interleave ally and enemy actions for more dynamic battles
          const maxActions = Math.max(allies.length, enemies.length);
          
          for (let i = 0; i < maxActions; i++) {
            // Ally attacks if available
            if (i < allies.length && enemies.length > 0) {
              const ally = allies[i];
              const target = enemies[Math.floor(Math.random() * enemies.length)];
              const damage = Math.floor(ally.stats.attack * (0.8 + Math.random() * 0.4));
              const isCritical = Math.random() < 0.2;
              
              mockActions.push({
                actor: ally.name,
                skill: 'Basic Attack',
                target: target.name,
                damage: isCritical ? Math.floor(damage * 1.5) : damage,
                isCritical
              });
            }
            
            // Enemy attacks if available 
            if (i < enemies.length && allies.length > 0) {
              const enemy = enemies[i];
              const target = allies[Math.floor(Math.random() * allies.length)];
              const damage = Math.floor(enemy.stats.attack * (0.6 + Math.random() * 0.4));
              const isCritical = Math.random() < 0.15;
              
              mockActions.push({
                actor: enemy.name,
                skill: 'Enemy Attack',
                target: target.name,
                damage: isCritical ? Math.floor(damage * 1.5) : damage,
                isCritical
              });
            }
          }
          
          actions = mockActions;
        }
        
        let actionIndex = 0;
        
        const processAction = () => {
          if (actionIndex >= actions.length) {
            // Check if any enemies were defeated during this round
            const currentEnemies = units.filter(unit => {
              const id = String(unit.id);
              return id.includes('enemy') && unit.hp > 0;
            });
            
            // Check if any allies were defeated during this round
            const currentAllies = units.filter(unit => {
              const id = String(unit.id);
              return !id.includes('enemy') && unit.hp > 0;
            });
            
            // Add battle status message
            addToLog(`Round ${event.number}: Allies: ${currentAllies.length}, Enemies: ${currentEnemies.length}`);
            
            // Only check for battle completion if this is the last event
            // We'll let the battle_end event handle the final victory/defeat message
            if (currentEnemies.length === 0 && index === battleLog.length - 2) {
              addToLog(`Round ${event.number}: All enemies in this stage defeated!`);
            } else if (currentAllies.length === 0 && index === battleLog.length - 2) {
              addToLog(`Round ${event.number}: All allies defeated! Battle lost!`);
            } else {
              // Just a regular round update, don't announce victory/defeat
            }
            
            setAnimationInProgress(false);
            processEvents(index + 1);
            return;
          }
          
          const action = actions[actionIndex];
          console.log("Processing action:", action);
          
          // If it's a defeat action, just log it
          if (action.type === 'defeat') {
            const message = `${action.target} was defeated!`;
            addToLog(message);
            addToDetailedLog(message);
            actionIndex++;
            setTimeout(processAction, 300 / playbackSpeed);
            return;
          }
          
          // Otherwise it's an attack action
          const attackerIndex = units.findIndex(u => u.name === action.actor);
          if (attackerIndex !== -1) {
            setActiveAttacker(units[attackerIndex].id);
          }
          setShowAttackAnimation(true);
          
          const targetIndex = units.findIndex(u => u.name === action.target);
          if (targetIndex !== -1) {
            setActiveTarget(units[targetIndex].id);
          }
          
          // Log the action
          const message = action.message || 
            `${action.actor} used ${action.skill} on ${action.target} for ${action.damage < 0 ? Math.abs(action.damage) + ' healing' : action.damage + ' damage'}${action.isCritical ? ' (Critical Hit!)' : ''}`;
          
          addToLog(message);
          addToDetailedLog(message);
          
          // Update unit HP
          setUnits(prevUnits => 
            prevUnits.map(unit => {
              if (unit.name === action.target) {
                // For healing actions (damage is negative)
                if (action.damage < 0 || action.healing) {
                  const healAmount = Math.abs(action.damage);
                  return {
                    ...unit,
                    hp: Math.min(unit.hp + healAmount, unit.maxHp),
                    totalHealingReceived: (unit.totalHealingReceived || 0) + healAmount
                  };
                } else {
                  // For damage actions
                  return {
                    ...unit,
                    hp: Math.max(0, unit.hp - action.damage),
                    totalDamageReceived: (unit.totalDamageReceived || 0) + action.damage
                  };
                }
              }
              return unit;
            })
          );
          
          // Move to next action after delay
          setTimeout(() => {
            setShowAttackAnimation(false);
            setActiveAttacker(null);
            setActiveTarget(null);
            actionIndex++;
            setTimeout(processAction, 300 / playbackSpeed);
          }, 900 / playbackSpeed);
        };
        
        processAction();
      } else if (event.type === 'stage-clear' || event.type === 'stage_clear') {
        // Handle stage clear event
        setCurrentStage(prevStage => prevStage + 1);
        
        // Log stage completion
        const stageMessage = `Stage ${event.stageNumber} complete! Moving to stage ${event.stageNumber + 1}...`;
        addToLog(stageMessage);
        addToDetailedLog(stageMessage);
        
        // Update units with carried over health from previous stage
        if (event.remainingUnits) {
          setUnits(prevUnits => {
            // Create a map of the previous units for easy lookup
            const unitMap = new Map(prevUnits.map(unit => [unit.id, unit]));
            
            // Update each unit that continues to the next stage
            return event.remainingUnits.map((unit: any) => {
              const prevUnit = unitMap.get(unit.id);
              
              if (prevUnit) {
                return {
                  ...prevUnit,
                  hp: unit.hp, // Update the HP
                  attackMeter: 0, // Reset attack meter for new stage
                  // Keep existing status effects, damage counters, etc.
                };
              }
              
              // If it's a new unit (like new enemies in the stage)
              return {
                id: unit.id,
                name: unit.name,
                hp: unit.stats.vitality * 8, // Calculate HP based on VIT
                maxHp: unit.stats.vitality * 8,
                attackMeter: 0,
                totalDamageDealt: 0,
                totalDamageReceived: 0,
                totalHealingDone: 0,
                totalHealingReceived: 0,
                stats: { ...unit.stats },
                auraBonus: unit.auraBonus,
                skills: { ...unit.skills },
                statusEffects: []
              };
            });
          });
        }
        
        // Short pause before continuing
        setTimeout(() => {
          processEvents(index + 1);
        }, 2000 / playbackSpeed);
      } else if (event.type === 'battle-end' || event.type === 'battle_end') {
        // Handle battle end event that appears after all round events
        // This marks the final state of the battle
        
        // Log the final outcome 
        const message = event.success 
          ? "Battle complete! All enemies defeated!" 
          : "Battle failed! Your party was defeated.";
        
        addToLog(message);
        addToDetailedLog(message);
        
        // Process to the next event (usually dungeon-complete or dungeon-failed)
        setTimeout(() => {
          processEvents(index + 1);
        }, 1000 / playbackSpeed);
        
      } else if (event.type === 'dungeon-complete' || event.type === 'dungeon_complete' || 
                 event.type === 'dungeon-failed' || event.type === 'dungeon_failed') {
        // Handle dungeon completion or failure
        setIsComplete(true);
        
        // Log the final outcome
        const outcomeMessage = (event.type === 'dungeon-complete' || event.type === 'dungeon_complete')
          ? `Dungeon run successful! Reached stage ${event.stageReached} of ${event.totalStages}.`
          : `Dungeon run failed at stage ${event.stageReached} of ${event.totalStages}.`;
        
        addToLog(outcomeMessage);
        addToDetailedLog(outcomeMessage);
        
        // If there's loot, display it
        if (event.loot && event.loot.length > 0) {
          const lootMessage = `Obtained loot: ${event.loot.map((item: any) => `${item.quantity} ${item.name}`).join(', ')}`;
          addToLog(lootMessage);
          addToDetailedLog(lootMessage);
        }
        
        // Additional rewards (if any)
        if (event.experienceGained) {
          const expMessage = `Gained ${event.experienceGained} experience.`;
          addToLog(expMessage);
          addToDetailedLog(expMessage);
        }
        
        if (event.goldEarned) {
          const goldMessage = `Earned ${event.goldEarned} gold.`;
          addToLog(goldMessage);
          addToDetailedLog(goldMessage);
        }
      }
    };
    
    // Start processing events from the given index
    processEvents(startIndex);
  };
  
  // Function to restart the battle simulation
  const restartBattle = () => {
    // Reset all state
    setActionLog([]);
    setDetailedActionLog([]);
    resetAnimationStates();
    setCurrentStage(0);
    setIsComplete(false);
    
    // Get the initial battle data again
    const initialBattleData = battleLog.find(entry => entry.type === 'battle-start' || entry.type === 'battle_start');
    if (initialBattleData) {
      // Reset units to their initial state
      const initialUnits = [
        ...initialBattleData.allies.map((ally: any) => {
          const maxHp = ally.stats.vitality * 8;
          return {
            id: ally.id,
            name: ally.name,
            hp: maxHp,
            maxHp: maxHp,
            attackMeter: 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            totalHealingDone: 0,
            totalHealingReceived: 0,
            stats: { ...ally.stats },
            auraBonus: ally.auraBonus,
            skills: { ...ally.skills },
            statusEffects: []
          };
        }),
        ...initialBattleData.enemies.map((enemy: any) => {
          const maxHp = enemy.stats.vitality * 8;
          return {
            id: enemy.id,
            name: enemy.name,
            hp: maxHp,
            maxHp: maxHp,
            attackMeter: 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            totalHealingDone: 0,
            totalHealingReceived: 0,
            stats: { ...enemy.stats },
            skills: { ...enemy.skills },
            statusEffects: []
          };
        })
      ];
      
      setUnits(initialUnits);
      
      // Restart the simulation after a delay
      setTimeout(() => {
        simulateBattle(0);
      }, 1000);
    }
  };
  
  // Handle closing the dialog and cleaning up
  const handleClose = () => {
    setIsPaused(true);
    resetAnimationStates();
    onClose();
  };
  
  // Function to handle completing the dungeon and claiming rewards
  const handleCompleteDungeon = () => {
    if (runId && onCompleteDungeon) {
      onCompleteDungeon(runId);
    }
    handleClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col bg-[#251942] text-[#E5DBFF] border-[#6A3FB5]" aria-describedby="battle-log-description">
        <div id="battle-log-description" className="sr-only">Battle log showing combat between your party and enemies</div>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold flex items-center justify-between">
            <span>
              Battle Log {currentStage > 0 && `- Stage ${currentStage + 1}`}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-normal">Speed:</span>
              <button 
                onClick={() => handleSpeedChange(1)}
                className={`px-2 py-0.5 rounded text-xs ${playbackSpeed === 1 ? 'bg-[#6A3FB5] text-white' : 'bg-[#35235B] hover:bg-[#4D318A]'}`}
              >
                1x
              </button>
              <button 
                onClick={() => handleSpeedChange(2)}
                className={`px-2 py-0.5 rounded text-xs ${playbackSpeed === 2 ? 'bg-[#6A3FB5] text-white' : 'bg-[#35235B] hover:bg-[#4D318A]'}`}
              >
                2x
              </button>
              <button 
                onClick={() => handleSpeedChange(4)}
                className={`px-2 py-0.5 rounded text-xs ${playbackSpeed === 4 ? 'bg-[#6A3FB5] text-white' : 'bg-[#35235B] hover:bg-[#4D318A]'}`}
              >
                4x
              </button>
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="mb-4 ml-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {!isComplete ? (
                  <span>Battle in Progress - Round {battleRound}</span>
                ) : (
                  <span>Battle Complete - Reached Stage {currentStage + 1}</span>
                )}
              </h3>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setIsPaused(!isPaused)}
                  className="h-8 text-sm"
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={restartBattle}
                  className="h-8 text-sm"
                >
                  Restart
                </Button>
                {isComplete && runId && onCompleteDungeon && (
                  <Button 
                    size="sm" 
                    onClick={handleCompleteDungeon}
                    className="h-8 text-sm bg-[#6A3FB5] hover:bg-[#8352D3]"
                  >
                    Complete Dungeon
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 px-4 overflow-auto flex-1">
            <div className="flex flex-col">
              <h4 className="text-md font-semibold mb-2">Your Party</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-10">
                {units.filter(unit => typeof unit.id === 'string' ? !unit.id.startsWith('enemy') : (typeof unit.id === 'number' && unit.id <= 10)).map(unit => (
                  <motion.div 
                    key={unit.id} 
                    className={`relative ${activeTarget === unit.id ? 'scale-105' : ''}`}
                    animate={{
                      scale: (activeAttacker === unit.id && showAttackAnimation) ? [1, 1.05, 1] : 1,
                      x: (activeAttacker === unit.id && showAttackAnimation) ? [0, -5, 0] : 0
                    }}
                  >
                    {/* Status effects above character */}
                    {unit.statusEffects && unit.statusEffects.length > 0 && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 flex flex-wrap gap-1 justify-center z-10">
                        {unit.statusEffects.map((effect, index) => renderStatusEffect(effect, index, true))}
                      </div>
                    )}
                    
                    {/* Attack meter arc above character */}
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-14 h-2">
                      <div className="relative w-full h-1 bg-gray-700/50 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-yellow-500 rounded-full"
                          style={{ 
                            width: `${Math.min(100, unit.attackMeter)}%`,
                            transition: 'width 0.5s ease-in-out'
                          }}
                        />
                      </div>
                    </div>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            {/* Health border circular indicator */}
                            <div className={`
                              w-14 h-14 rounded-full flex items-center justify-center
                              ${activeTarget === unit.id ? 'ring-2 ring-red-500' : ''}
                              ${activeAttacker === unit.id ? 'ring-2 ring-yellow-500' : ''} 
                            `}
                              style={{
                                background: `conic-gradient(
                                  ${unit.hp / unit.maxHp < 0.3 ? '#EF4444' : '#7644D0'} ${calculateHealthPercent(unit.hp, unit.maxHp) * 3.6}deg, 
                                  #432874 0deg
                                )`
                              }}
                            >
                              {/* Inner circle with character avatar */}
                              <div className="w-11 h-11 bg-[#251942] rounded-full flex items-center justify-center text-[#E5DBFF] text-xl font-bold">
                                {unit.name.substring(0, 1)}
                              </div>
                            </div>
                            
                            {/* Character name and HP */}
                            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-center w-20">
                              <div className="text-xs font-semibold truncate">{unit.name}</div>
                              <div className={`text-xs ${unit.hp / unit.maxHp < 0.3 ? 'text-red-400' : 'text-[#C8B8DB]'}`}>
                                {Math.ceil(unit.hp)}/{unit.maxHp}
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="p-3 max-w-xs bg-[#251942] text-[#E5DBFF] border border-[#6A3FB5]">
                          <h4 className="font-semibold mb-2">{unit.name}</h4>
                          <div className="text-xs text-[#C8B8DB] mb-1">Stats:</div>
                          <div className="mb-2">{renderUnitStats(unit)}</div>
                          
                          <div className="text-xs text-[#C8B8DB] mb-1">Skills:</div>
                          <div className="flex flex-wrap gap-1">
                            {renderSkill(unit.skills.basic.name, unit.skills.basic.damage)}
                            {unit.skills.advanced && renderSkill(unit.skills.advanced.name, unit.skills.advanced.damage, unit.skills.advanced.cooldown)}
                            {unit.skills.ultimate && renderSkill(unit.skills.ultimate.name, unit.skills.ultimate.damage, unit.skills.ultimate.cooldown)}
                          </div>
                          
                          {unit.statusEffects && unit.statusEffects.length > 0 && (
                            <>
                              <div className="text-xs text-[#C8B8DB] mb-1 mt-2">Status Effects:</div>
                              <div className="flex flex-wrap gap-1">
                                {unit.statusEffects.map((effect, index) => renderStatusEffect(effect, index, true))}
                              </div>
                            </>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </motion.div>
                ))}
              </div>
            </div>
            
            <div className="flex flex-col">
              <h4 className="text-md font-semibold mb-2">Enemies</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-10">
                {units.filter(unit => typeof unit.id === 'string' ? unit.id.startsWith('enemy') : (typeof unit.id === 'number' && unit.id > 10)).map(unit => (
                  <motion.div 
                    key={unit.id} 
                    className={`relative ${activeTarget === unit.id ? 'scale-105' : ''}`}
                    animate={{
                      scale: (activeAttacker === unit.id && showAttackAnimation) ? [1, 1.05, 1] : 1,
                      x: (activeAttacker === unit.id && showAttackAnimation) ? [0, 5, 0] : 0
                    }}
                  >
                    {/* Status effects above character */}
                    {unit.statusEffects && unit.statusEffects.length > 0 && (
                      <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 flex flex-wrap gap-1 justify-center z-10">
                        {unit.statusEffects.map((effect, index) => renderStatusEffect(effect, index, false))}
                      </div>
                    )}
                    
                    {/* Attack meter arc above character */}
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-14 h-2">
                      <div className="relative w-full h-1 bg-gray-700/50 rounded-full overflow-hidden">
                        <div 
                          className="absolute top-0 left-0 h-full bg-yellow-500 rounded-full"
                          style={{ 
                            width: `${Math.min(100, unit.attackMeter)}%`,
                            transition: 'width 0.5s ease-in-out'
                          }}
                        />
                      </div>
                    </div>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="relative">
                            {/* Health border circular indicator */}
                            <div className={`
                              w-14 h-14 rounded-full flex items-center justify-center
                              ${activeTarget === unit.id ? 'ring-2 ring-red-500' : ''}
                              ${activeAttacker === unit.id ? 'ring-2 ring-yellow-500' : ''} 
                            `}
                              style={{
                                background: `conic-gradient(
                                  ${unit.hp / unit.maxHp < 0.3 ? '#EF4444' : '#D74D20'} ${calculateHealthPercent(unit.hp, unit.maxHp) * 3.6}deg, 
                                  #432874 0deg
                                )`
                              }}
                            >
                              {/* Inner circle with enemy avatar */}
                              <div className="w-11 h-11 bg-[#251942] rounded-full flex items-center justify-center text-[#E5DBFF] text-xl font-bold">
                                {unit.name.substring(0, 1)}
                              </div>
                            </div>
                            
                            {/* Character name and HP */}
                            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-center w-20">
                              <div className="text-xs font-semibold truncate">{unit.name}</div>
                              <div className={`text-xs ${unit.hp / unit.maxHp < 0.3 ? 'text-red-400' : 'text-[#C8B8DB]'}`}>
                                {Math.ceil(unit.hp)}/{unit.maxHp}
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="p-3 max-w-xs bg-[#251942] text-[#E5DBFF] border border-[#6A3FB5]">
                          <h4 className="font-semibold mb-2">{unit.name}</h4>
                          <div className="text-xs text-[#C8B8DB] mb-1">Stats:</div>
                          <div className="mb-2">{renderUnitStats(unit)}</div>
                          
                          <div className="text-xs text-[#C8B8DB] mb-1">Skills:</div>
                          <div className="flex flex-wrap gap-1">
                            {renderSkill(unit.skills.basic.name, unit.skills.basic.damage)}
                            {unit.skills.advanced && renderSkill(unit.skills.advanced.name, unit.skills.advanced.damage, unit.skills.advanced.cooldown)}
                            {unit.skills.ultimate && renderSkill(unit.skills.ultimate.name, unit.skills.ultimate.damage, unit.skills.ultimate.cooldown)}
                          </div>
                          
                          {unit.statusEffects && unit.statusEffects.length > 0 && (
                            <>
                              <div className="text-xs text-[#C8B8DB] mb-1 mt-2">Status Effects:</div>
                              <div className="flex flex-wrap gap-1">
                                {unit.statusEffects.map((effect, index) => renderStatusEffect(effect, index, false))}
                              </div>
                            </>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="mt-4 px-4">
            <Tabs defaultValue="action">
              <TabsList className="bg-[#35235B]">
                <TabsTrigger value="action">Action Log</TabsTrigger>
                <TabsTrigger value="detailed">Detailed Log</TabsTrigger>
                <TabsTrigger value="stats">Battle Stats</TabsTrigger>
              </TabsList>
              
              <TabsContent value="action" className="border border-[#6A3FB5]/40 rounded-md mt-2">
                <div className="bg-[#432874]/20 p-4 rounded-lg">
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {sortedActionLog.length > 0 ? (
                      sortedActionLog.map((log, index) => (
                        <div key={index} className="text-sm">
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm italic text-gray-400">
                        Battle log will appear here...
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="detailed" className="border border-[#6A3FB5]/40 rounded-md mt-2">
                <div className="bg-[#432874]/20 p-4 rounded-lg">
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {sortedDetailedLog.length > 0 ? (
                      sortedDetailedLog.map((log, index) => (
                        <div key={index} className="text-sm">
                          {log}
                        </div>
                      ))
                    ) : (
                      <div className="text-sm italic text-gray-400">
                        Detailed log will appear here...
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="stats" className="border border-[#6A3FB5]/40 rounded-md mt-2">
                <div className="bg-[#432874]/10 p-3 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    {units.map(unit => (
                      <div key={unit.id}
                        className="text-sm bg-[#432874]/20 p-2 rounded"
                      >
                        <div className="font-semibold mb-1">{unit.name}</div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          <div>Damage Dealt: {unit.totalDamageDealt || 0}</div>
                          <div>Damage Taken: {unit.totalDamageReceived || 0}</div>
                          <div>Healing Done: {unit.totalHealingDone || 0}</div>
                          <div>Healing Received: {unit.totalHealingReceived || 0}</div>
                          
                          {/* Status effect success rates */}
                          {unit.burnAttempts && unit.burnAttempts > 0 && (
                            <div>Burn Rate: {unit.burnSuccess || 0}/{unit.burnAttempts} ({Math.round((unit.burnSuccess || 0) / unit.burnAttempts * 100)}%)</div>
                          )}
                          {unit.poisonAttempts && unit.poisonAttempts > 0 && (
                            <div>Poison Rate: {unit.poisonSuccess || 0}/{unit.poisonAttempts} ({Math.round((unit.poisonSuccess || 0) / unit.poisonAttempts * 100)}%)</div>
                          )}
                          {unit.slowAttempts && unit.slowAttempts > 0 && (
                            <div>Slow Rate: {unit.slowSuccess || 0}/{unit.slowAttempts} ({Math.round((unit.slowSuccess || 0) / unit.slowAttempts * 100)}%)</div>
                          )}
                          {unit.weakenAttempts && unit.weakenAttempts > 0 && (
                            <div>Weaken Rate: {unit.weakenSuccess || 0}/{unit.weakenAttempts} ({Math.round((unit.weakenSuccess || 0) / unit.weakenAttempts * 100)}%)</div>
                          )}
                          
                          {/* Show last rolls if available */}
                          {unit.lastBurnRoll !== undefined && (
                            <div>Last Burn Roll: {unit.lastBurnRoll}/100</div>
                          )}
                          {unit.lastPoisonRoll !== undefined && (
                            <div>Last Poison Roll: {unit.lastPoisonRoll}/100</div>
                          )}
                          {unit.lastSlowRoll !== undefined && (
                            <div>Last Slow Roll: {unit.lastSlowRoll}/100</div>
                          )}
                          {unit.lastWeakenRoll !== undefined && (
                            <div>Last Weaken Roll: {unit.lastWeakenRoll}/100</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BattleLog;
