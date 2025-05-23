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

// Interface definitions for battle system
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
    focus?: number;
    accuracy?: number;
    defense?: number;
    resilience?: number;
    element?: string;
  };
  skills: {
    basic: { name: string; damage: number }; 
    advanced?: { name: string; damage: number; cooldown: number };
    ultimate?: { name: string; damage: number; cooldown: number };
  };
  statusEffects?: StatusEffect[];
  actionTimer?: number; // For compatibility with API
}

// Interface for battle actions within a round
interface BattleAction {
  actor: string;
  target: string;
  skill: string;
  damage: number;
  isCritical: boolean;
  healing?: boolean;
  message?: string;
  type?: string;
}

// Interface for battle event types
interface BattleEvent {
  type: string;
  data?: any;
  allies?: BattleUnit[];
  enemies?: BattleUnit[];
  timestamp?: number;
  // Stage progression properties
  currentStage?: number;
  message?: string;
  aliveAllies?: BattleUnit[];
  newEnemies?: BattleUnit[];
  // System message
  system_message?: string;
  // Round-specific properties
  number?: number;            // Round number (when type === 'round')
  actions?: BattleAction[];   // Array of actions in this round
  remainingAllies?: number;   // Number of allies still alive after round
  remainingEnemies?: number;  // Number of enemies still alive after round
}

interface BattleLogProps {
  isOpen: boolean;
  onClose: () => void;
  battleLog: BattleEvent[];
  runId: number | null;
  onCompleteDungeon?: (runId: number) => void;
}

const BattleLog = ({ isOpen, onClose, battleLog, runId, onCompleteDungeon }: BattleLogProps) => {
  // State declarations
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPaused, setIsPaused] = useState(true); // Start paused to let user control battle speed
  const [currentStage, setCurrentStage] = useState(0);
  const [currentAction, setCurrentAction] = useState(0);
  const [units, setUnits] = useState<BattleUnit[]>([]);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [detailedActionLog, setDetailedActionLog] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [activeTab, setActiveTab] = useState('battle');
  
  // Animation states
  const [animationInProgress, setAnimationInProgress] = useState(false);
  const [pendingStatusEffectAnimations, setPendingStatusEffectAnimations] = useState<any[]>([]);
  const [animationQueue, setAnimationQueue] = useState<any[]>([]);
  const [activeAttacker, setActiveAttacker] = useState<string | number | null>(null);
  const [activeTarget, setActiveTarget] = useState<string | number | null>(null);
  const [showAttackAnimation, setShowAttackAnimation] = useState(false);
  const [showDamageAnimation, setShowDamageAnimation] = useState(false);
  const [attackAnimationType, setAttackAnimationType] = useState<'basic' | 'advanced' | 'ultimate'>('basic');
  const [currentSkillName, setCurrentSkillName] = useState<string>('');
  
  // No rounds in the battle system, just stages
  
  // Effect to handle pause/resume of battle animation
  useEffect(() => {
    // When isPaused changes, handle animation state
    if (isPaused) {
      // Pause the animation by clearing timeout
      if (battleAnimationRef.current) {
        clearTimeout(battleAnimationRef.current);
        battleAnimationRef.current = null;
      }
      console.log("Battle animation paused");
    } else {
      // Resume the animation by calling animateBattleStep
      console.log("Battle animation resumed");
      
      // Create local function for step animation to avoid reference issues
      const animateBattleStep = () => {
        // Clear any existing animation
        if (battleAnimationRef.current) {
          clearTimeout(battleAnimationRef.current);
        }
        
        // Get current animation step
        const step = battleStepRef.current;
        
        // If no battle log or animation complete, stop
        if (!battleLog || battleLog.length === 0 || step >= actionLog.length + 5) {
          console.log("Battle animation complete or no battle log");
          return;
        }
        
        // Update the action logs with one more message (in batches of 1-3)
        setActionLog(prev => [...prev, ...(actionLog.slice(prev.length, prev.length + 1))].filter(Boolean));
        setDetailedActionLog(prev => [...prev, ...(detailedActionLog.slice(prev.length, prev.length + 1))].filter(Boolean));
        
        // Simulate attack animations
        if (step % 3 === 0) {
          // Find a random attacker and target for visualization
          const attackerIndex = Math.floor(Math.random() * units.length);
          const targetIndex = (attackerIndex + 1 + Math.floor(Math.random() * (units.length - 1))) % units.length;
          
          // Set attacker and target
          setActiveAttacker(units[attackerIndex]?.id || null);
          setActiveTarget(units[targetIndex]?.id || null);
          
          // Show attack animation
          setShowAttackAnimation(true);
          setTimeout(() => {
            setShowAttackAnimation(false);
            setActiveAttacker(null);
            setActiveTarget(null);
          }, 300);
        }
        
        // Increment step counter
        battleStepRef.current = step + 1;
        
        // Schedule next animation step based on playback speed
        // Base delay is 800ms, divided by playback speed
        const stepDelay = 800 / playbackSpeed;
        battleAnimationRef.current = setTimeout(animateBattleStep, stepDelay);
      };
      
      // Start animation with a small delay
      battleAnimationRef.current = setTimeout(animateBattleStep, 300);
    }
    
    // Cleanup on unmount or effect rerun
    return () => {
      if (battleAnimationRef.current) {
        clearTimeout(battleAnimationRef.current);
      }
    };
  }, [isPaused, playbackSpeed]);
  
  // Function to handle changing the playback speed
  const handleSpeedChange = (newSpeed: number) => {
    console.log(`Setting playback speed to ${newSpeed}x`);
    setPlaybackSpeed(newSpeed);
    
    // If animation is currently in progress, restart with new speed to apply it
    if (!isPaused) {
      setIsPaused(true);
      setTimeout(() => {
        setIsPaused(false);
      }, 50);
    }
  };
  
  // CRITICAL FIX: Update attack meters during battle animation
  useEffect(() => {
    // Only run this effect when battle is active and not paused
    if (!isOpen || isPaused || units.length === 0) {
      return;
    }
    
    console.log("Setting up attack meter animation for active battle");
    
    // Create an interval to increment attack meters based on unit speed
    const meterInterval = setInterval(() => {
      setUnits(prevUnits => {
        // Create a new array to ensure React triggers a re-render
        return prevUnits.map(unit => {
          // Skip defeated units
          if (unit.hp <= 0) {
            return unit;
          }
          
          // Calculate speed-based meter gain (faster units fill meter quicker)
          const speedMultiplier = unit.stats.speed / 50; // Base speed reference
          const meterGain = 5 * Math.max(0.5, Math.min(2, speedMultiplier));
          
          // Create a new unit object with updated attack meter
          return {
            ...unit,
            // Increment the attack meter without exceeding 100%
            attackMeter: Math.min(100, (unit.attackMeter || 0) + meterGain)
          };
        });
      });
    }, 300); // Update every 300ms for smoother animation
    
    // Clean up interval on unmount or when battle state changes
    return () => {
      clearInterval(meterInterval);
      console.log("Cleaned up attack meter animation interval");
    };
  }, [isOpen, isPaused, units.length]);
  
  // Function to handle dialog close
  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset ALL battle state when closing dialog to prevent stale data persistence
      setUnits([]);
      setActionLog([]);
      setDetailedActionLog([]);
      setCurrentStage(0);
      setCurrentAction(0);
      setAnimationInProgress(false);
      setPendingStatusEffectAnimations([]);
      setIsComplete(false);
      setIsPaused(true);
      setPlaybackSpeed(1);
      setAnimationQueue([]);
      setShowAttackAnimation(false);
      setActiveAttacker(null);
      setActiveTarget(null);
      setActiveTab('battle');
      
      // Signal to parent component that dialog has closed
      onClose();
    }
  };
  
  // Function to handle restart battle button
  const restartBattle = () => {
    // Reset state to initial values
    setCurrentStage(0);
    setIsPaused(true); // Start paused to let user control battle pace
    setUnits([]);
    setActionLog([]);
    setDetailedActionLog([]);
    setIsComplete(false);
    setActiveAttacker(null);
    setActiveTarget(null);
    
    // Add a helpful message for the user
    setTimeout(() => {
      if (actionLog.length === 0) {
        setActionLog(["Battle loaded! Press 'Resume' to start the battle and watch combat actions in sequence."]);
        setDetailedActionLog(["Welcome to The Forge battle system. This battle simulation will show all combat actions between your party and enemies. Press the Resume button to begin, or adjust the speed using the controls above."]);
      }
    }, 500);
  };
  
  // Function to handle complete dungeon button
  const handleCompleteDungeon = () => {
    if (runId && onCompleteDungeon) {
      onCompleteDungeon(runId);
    }
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
  
  // Render status effect icon with tooltip
  const renderStatusEffect = (effect: StatusEffect, index: number, isAlly: boolean) => {
    // Get icon based on effect type
    let icon;
    let bgColor = "bg-gray-800";
    
    if (effect.effect === "ReduceAtk") {
      icon = <Swords size={14} className="text-red-400" />;
      bgColor = "bg-red-900/50";
    } else if (effect.effect === "ReduceSpd") {
      icon = <Zap size={14} className="text-blue-400" />;
      bgColor = "bg-blue-900/50";
    } else if (effect.effect === "Burn") {
      icon = <div className="w-2 h-2 bg-orange-500 rounded-full" />;
      bgColor = "bg-orange-900/50";
    } else if (effect.effect === "Poison") {
      icon = <div className="w-2 h-2 bg-green-500 rounded-full" />;
      bgColor = "bg-green-900/50";
    } else if (effect.effect === "Heal") {
      icon = <Heart size={14} className="text-green-400" />;
      bgColor = "bg-green-900/50";
    } else if (effect.effect === "Shield") {
      icon = <Shield size={14} className="text-blue-400" />;
      bgColor = "bg-blue-900/50";
    } else {
      icon = <Info size={14} className="text-gray-400" />;
    }
    
    return (
      <TooltipProvider key={`status-${effect.name}-${index}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center ${bgColor}`}>
              {icon}
              <span className="absolute -top-1 -right-1 text-[10px] bg-gray-900 rounded-full w-3 h-3 flex items-center justify-center">
                {effect.duration}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side={isAlly ? "top" : "bottom"} className="p-2 max-w-[200px] bg-[#251942] border border-[#6A3FB5]">
            <p className="font-semibold text-xs">{effect.name}</p>
            <p className="text-xs text-[#C8B8DB]">
              {effect.effect === "ReduceAtk" && `Reduces attack by ${effect.value}%`}
              {effect.effect === "ReduceSpd" && `Reduces speed by ${effect.value}%`}
              {effect.effect === "Burn" && `Deals ${effect.value} damage per action`}
              {effect.effect === "Poison" && `Deals ${effect.value} damage per action`}
              {effect.effect === "Heal" && `Heals ${effect.value} HP per action`}
              {effect.effect === "Shield" && `Absorbs ${effect.value} damage`}
            </p>
            {effect.source && <p className="text-xs italic mt-1">From: {effect.source}</p>}
            <p className="text-xs mt-1">Duration: {effect.duration} actions</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };
  
  // Render unit stats in tooltip
  const renderUnitStats = (unit: BattleUnit) => {
    // Calculate effective stats with status effects
    const effectiveSpeed = calculateEffectiveSpeed(unit);
    const effectiveAttack = calculateEffectiveAttack(unit);
    
    return (
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <Swords size={12} /> Attack:
          </span>
          <span className="font-semibold">
            {effectiveAttack}
            {unit.auraBonus?.attack && (
              <span className="text-green-400 ml-1">+{unit.auraBonus.attack}%</span>
            )}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <Heart size={12} /> Vitality:
          </span>
          <span className="font-semibold">
            {unit.stats.vitality}
            {unit.auraBonus?.vitality && (
              <span className="text-green-400 ml-1">+{unit.auraBonus.vitality}%</span>
            )}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="flex items-center gap-1">
            <Zap size={12} /> Speed:
          </span>
          <span className="font-semibold">
            {effectiveSpeed}
            {unit.auraBonus?.speed && (
              <span className="text-green-400 ml-1">+{unit.auraBonus.speed}%</span>
            )}
          </span>
        </div>
        
        <div className="mt-3 border-t border-[#6A3FB5] pt-2">
          <div className="text-[#C8B8DB] mb-1">Skills:</div>
          <div className="space-y-1">
            <div>Basic: {unit.skills.basic.name} ({unit.skills.basic.damage} dmg)</div>
            {unit.skills.advanced && (
              <div>Advanced: {unit.skills.advanced.name} ({unit.skills.advanced.damage} dmg)</div>
            )}
            {unit.skills.ultimate && (
              <div>Ultimate: {unit.skills.ultimate.name} ({unit.skills.ultimate.damage} dmg)</div>
            )}
          </div>
        </div>
        
        {/* Battle Statistics */}
        {unit.totalDamageDealt > 0 && (
          <div className="mt-3 border-t border-[#6A3FB5] pt-2">
            <div className="text-[#C8B8DB] mb-1">Battle Stats:</div>
            <div className="grid grid-cols-2 gap-y-1 gap-x-2">
              <div>Dmg Dealt: <span className="text-yellow-400">{Math.floor(unit.totalDamageDealt)}</span></div>
              <div>Dmg Taken: <span className="text-red-400">{Math.floor(unit.totalDamageReceived)}</span></div>
              {unit.totalHealingDone > 0 && (
                <div>Healing: <span className="text-green-400">{Math.floor(unit.totalHealingDone)}</span></div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // IMPORTANT BATTLE LOGIC FIXES
  
  // Add useEffect hook to process battle logs and update state
  useEffect(() => {
    // Enhanced debugging for battle log processing
    console.log("=== BATTLE LOG COMPONENT STATE ===");
    console.log("isOpen:", isOpen);
    console.log("isPaused:", isPaused);
    console.log("battleLog length:", battleLog?.length || 0);
    console.log("battleLog first few entries:", battleLog?.slice(0, 2));
    
    if (battleLog && battleLog.length > 0 && isOpen && !isPaused) {
      // Process battle log data
      console.log("Battle log data received:", JSON.stringify(battleLog).slice(0, 500) + "...");
      processBattleLog();
    } else {
      console.log("Not processing battle log because:", !battleLog ? "no log" : !battleLog.length ? "empty log" : !isOpen ? "dialog closed" : "is paused");
    }
  }, [battleLog, isOpen, isPaused]);
  
  // CRITICAL FIX - Animation system to process battle actions with timing and error handling
  useEffect(() => {
    // Skip animation processing if conditions aren't right
    if (!isOpen || isPaused || animationQueue.length === 0 || animationInProgress) {
      return;
    }

    // Function to handle animation process with proper error handling
    const processNextAnimation = () => {
      try {
        // Double-check queue length for safety
        if (animationQueue.length === 0) {
          console.error("Animation queue unexpectedly empty");
          return;
        }

        // Get next action from queue
        const nextAction = animationQueue[0];
        if (!nextAction) {
          console.error("First animation queue item is undefined");
          setAnimationQueue(prev => prev.slice(1));
          return;
        }

        // Mark animation as in progress
        setAnimationInProgress(true);

        // Process different animation types
        if (nextAction.type === 'attack') {
          // Setup attacker and target
          setActiveAttacker(nextAction.actor);
          setActiveTarget(nextAction.target);
          setCurrentSkillName(nextAction.skill);
          
          // Get references to the units
          const targetUnit = units.find(unit => unit.id === nextAction.target);
          const actorUnit = units.find(unit => unit.id === nextAction.actor);
          
          // Set animation type based on skill name
          if (nextAction.skill.toLowerCase().includes("ultimate")) {
            setAttackAnimationType('ultimate');
          } else if (nextAction.skill.toLowerCase().includes("advanced") || 
                    nextAction.skill.toLowerCase().includes("quick")) {
            setAttackAnimationType('advanced');
          } else {
            setAttackAnimationType('basic');
          }
          
          // Show attack animation first
          setShowAttackAnimation(true);
          
          // Then show damage animation after a delay
          setTimeout(() => {
            setShowAttackAnimation(false);
            setShowDamageAnimation(true);
            
            // Apply HP changes when damage is shown
            if (targetUnit) {
              const isHealing = nextAction.isHealing;
              const damage = nextAction.damage;
              
              if (isHealing) {
                // Healing logic - don't exceed max HP
                const healAmount = Math.abs(damage);
                targetUnit.hp = Math.min(targetUnit.maxHp, targetUnit.hp + healAmount);
              } else {
                // Damage logic - don't go below 0
                targetUnit.hp = Math.max(0, targetUnit.hp - damage);
                
                // Special handling for boss vs regular enemies
                if (targetUnit.hp <= 0) {
                  if (targetUnit.name.toLowerCase().includes('boss') && 
                      units.filter(u => u.id.toString().startsWith('enemy') && u.hp > 0).length === 1) {
                    console.log(`Final boss ${targetUnit.name} defeated!`);
                  } 
                  
                  // Always set HP to exactly 0 when defeated
                  targetUnit.hp = 0;
                }
              }
              
              // Update UI with new HP values
              setUnits([...units]);
            }
            
            // Finish animation after another delay
            setTimeout(() => {
              setShowDamageAnimation(false);
              setActiveAttacker(null);
              setActiveTarget(null);
              
              // Remove completed action and allow next animation
              setAnimationQueue(prev => prev.slice(1));
              setAnimationInProgress(false);
            }, 500);
          }, 700);
        } 
        else if (nextAction.type === 'defeat') {
          // Defeat animation logic
          setActiveTarget(nextAction.target);
          setShowDamageAnimation(true);
          
          setTimeout(() => {
            setShowDamageAnimation(false);
            setActiveTarget(null);
            
            // Ensure defeated unit has 0 HP
            const defeatedUnit = units.find(unit => unit.id === nextAction.target);
            if (defeatedUnit) {
              defeatedUnit.hp = 0;
              
              if (defeatedUnit.name.toLowerCase().includes('boss')) {
                console.log(`Boss ${defeatedUnit.name} explicitly set to defeated state`);
              }
              
              setUnits([...units]);
            }
            
            // Remove action and continue
            setAnimationQueue(prev => prev.slice(1));
            setAnimationInProgress(false);
          }, 1200);
        } 
        else {
          // Handle other action types (system messages etc.)
          setTimeout(() => {
            setAnimationQueue(prev => prev.slice(1));
            setAnimationInProgress(false);
          }, 800);
        }
      } catch (error) {
        // Error recovery
        console.error("Animation error:", error);
        setActiveAttacker(null);
        setActiveTarget(null);
        setShowAttackAnimation(false);
        setShowDamageAnimation(false);
        setAnimationInProgress(false);
        
        // Skip problematic action
        if (animationQueue.length > 0) {
          setAnimationQueue(prev => prev.slice(1));
        }
      }
    };

    // Start processing the next animation
    processNextAnimation();
  }, [isOpen, isPaused, animationQueue, animationInProgress, playbackSpeed, units]);
  

  
  // References for animation control
  const battleAnimationRef = useRef<NodeJS.Timeout | null>(null);
  const battleStepRef = useRef<number>(0);
  
  // Function to process battle log data
  const processBattleLog = () => {
    console.log("Processing battle log data...");
    
    if (!battleLog || battleLog.length === 0) {
      console.error("No battle log data available");
      return;
    }
    
    // Stop any existing animation
    if (battleAnimationRef.current) {
      clearTimeout(battleAnimationRef.current);
      battleAnimationRef.current = null;
    }
    
    // Reset battle step counter
    battleStepRef.current = 0;
    
    // Process battle events one-by-one with a timer
    let actionMessages: string[] = [];
    let detailedMessages: string[] = [];
    let stage = 0;
    let battleUnits: BattleUnit[] = [];
    
    // First, extract all units from the battle_start event (not init)
    const initEvent = battleLog.find(event => event.type === 'battle_start' || event.type === 'init');
    console.log("Found init event:", initEvent);
    
    if (initEvent) {
      // Extract allies and enemies directly from the event if they exist
      const allies = initEvent.allies || initEvent.data?.allies || [];
      const enemies = initEvent.enemies || initEvent.data?.enemies || [];
      
      console.log("Allies:", allies);
      console.log("Enemies:", enemies);
      
      // Instead of just validating, fix any characters or enemies with invalid HP
      let hasFixedHp = false;
      
      // CRITICAL FIX: Characters MUST start with full health
      // Fix any ally that doesn't have full HP in the initial battle state
      allies.forEach((ally: any) => {
        // Check if hp is not equal to maxHp (the full health requirement)
        if (typeof ally?.hp === 'number' && ally?.maxHp && ally.hp !== ally.maxHp) {
          console.warn(`Fixing ally ${ally.name} with incorrect HP: ${ally.hp}/${ally.maxHp}`);
          // Force set to FULL HP (maxHp) as per strict game requirements
          ally.hp = ally.maxHp;
          hasFixedHp = true;
        }
      });
      
      // CRITICAL FIX: Enemies should also start with full health
      // Fix any enemy that doesn't have full HP in the initial battle state
      enemies.forEach((enemy: any) => {
        // Check if hp is not equal to maxHp (full health requirement)
        if (typeof enemy?.hp === 'number' && enemy?.maxHp && enemy.hp !== enemy.maxHp) {
          console.warn(`Fixing enemy ${enemy.name} with incorrect HP: ${enemy.hp}/${enemy.maxHp}`);
          // Force set to FULL HP (maxHp) as per strict game requirements
          enemy.hp = enemy.maxHp;
          hasFixedHp = true;
        }
      });
      
      // Add detailed system messages if we had to fix any HP values
      if (hasFixedHp) {
        // Add a simple message to regular log
        actionMessages.push("System: Some units had critical health issues that were automatically fixed.");
        
        // Add more detailed information to the detailed log
        detailedMessages.push("System: Units with 0 or negative HP were detected and automatically healed to continue the battle.");
        
        // Add specific health fixes for transparency
        allies.forEach((ally: any) => {
          if (typeof ally?.hp === 'number' && ally.hp <= 0) {
            const newHp = Math.ceil(ally.maxHp * 0.25);
            detailedMessages.push(`System: ${ally.name} was critically injured (${ally.hp}/${ally.maxHp} HP) and received emergency healing to ${newHp} HP.`);
          }
        });
        
        enemies.forEach((enemy: any) => {
          if (typeof enemy?.hp === 'number' && enemy.hp <= 0) {
            detailedMessages.push(`System: ${enemy.name} was restored from ${enemy.hp} to ${enemy.maxHp} HP.`);
          }
        });
      }
      
      // Process allies
      if (Array.isArray(allies)) {
        allies.forEach((ally, index) => {
          if (!ally) return; // Skip if ally is undefined/null
          
          // CRITICAL FIX: Characters MUST start with full health
          // Fix HP values for all allies to make sure they're at full HP
          if (typeof ally.hp === 'number' && typeof ally.maxHp === 'number' && ally.hp !== ally.maxHp) {
            console.log(`🔶 Fixing ally ${ally.name || 'Unknown'} with incorrect HP: ${ally.hp}/${ally.maxHp}`);
            // Force set to FULL HP (maxHp) as per strict game requirements
            ally.hp = ally.maxHp;
            console.log(`   Set HP to full value for ${ally.name || 'Unknown'}: ${ally.hp}/${ally.maxHp}`);
          }
          
          // Create a battle unit with safe default values - ENSURE FULL HEALTH
          const maxHp = typeof ally.maxHp === 'number' ? ally.maxHp : 100;
          const allyUnit: BattleUnit = {
            id: ally.id || `ally-${index}`,
            name: ally.name || `Ally ${index + 1}`,
            hp: maxHp, // CRITICAL FIX: Always start with FULL health (maxHp)
            maxHp: maxHp,
            attackMeter: typeof ally.actionTimer === 'number' ? ally.actionTimer : 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            totalHealingDone: 0,
            totalHealingReceived: 0,
            stats: {
              attack: typeof ally.stats?.attack === 'number' ? ally.stats.attack : 10,
              vitality: typeof ally.stats?.vitality === 'number' ? ally.stats.vitality : 10,
              speed: typeof ally.stats?.speed === 'number' ? ally.stats.speed : 10
            },
            skills: {
              basic: { 
                name: ally.skills?.basic?.name || "Basic Attack", 
                damage: typeof ally.skills?.basic?.damage === 'number' ? ally.skills.basic.damage : 5 
              }
            },
            statusEffects: Array.isArray(ally.statusEffects) ? ally.statusEffects : []
          };
          
          // Add optional fields only if they exist
          if (ally.auraBonus) {
            allyUnit.auraBonus = ally.auraBonus;
          }
          
          if (ally.skills?.advanced) {
            allyUnit.skills.advanced = ally.skills.advanced;
          }
          
          if (ally.skills?.ultimate) {
            allyUnit.skills.ultimate = ally.skills.ultimate;
          }
          
          battleUnits.push(allyUnit);
        });
      }
      
      // Process enemies
      if (Array.isArray(enemies)) {
        enemies.forEach((enemy, index) => {
          if (!enemy) return; // Skip if enemy is undefined/null
          
          // CRITICAL FIX: Enemies MUST start with full health
          // Fix HP values for all enemies to make sure they're at full HP
          if (typeof enemy.hp === 'number' && typeof enemy.maxHp === 'number' && enemy.hp !== enemy.maxHp) {
            console.log(`🔶 Fixing enemy ${enemy.name || 'Unknown'} with incorrect HP: ${enemy.hp}/${enemy.maxHp}`);
            // Force set to FULL HP (maxHp) as per strict game requirements
            enemy.hp = enemy.maxHp;
            console.log(`   Set HP to full value for ${enemy.name || 'Unknown'}: ${enemy.hp}/${enemy.maxHp}`);
          }
          
          // Create a battle unit with safe default values - ENSURE FULL HEALTH
          const maxHp = typeof enemy.maxHp === 'number' ? enemy.maxHp : 100;
          const enemyUnit: BattleUnit = {
            id: enemy.id || `enemy-${index}`,
            name: enemy.name || `Enemy ${index + 1}`,
            hp: maxHp, // CRITICAL FIX: Always start with FULL health (maxHp)
            maxHp: maxHp,
            attackMeter: typeof enemy.actionTimer === 'number' ? enemy.actionTimer : 0,
            totalDamageDealt: 0,
            totalDamageReceived: 0,
            totalHealingDone: 0,
            totalHealingReceived: 0,
            stats: {
              attack: typeof enemy.stats?.attack === 'number' ? enemy.stats.attack : 10,
              vitality: typeof enemy.stats?.vitality === 'number' ? enemy.stats.vitality : 10,
              speed: typeof enemy.stats?.speed === 'number' ? enemy.stats.speed : 10
            },
            skills: {
              basic: { 
                name: enemy.skills?.basic?.name || "Basic Attack", 
                damage: typeof enemy.skills?.basic?.damage === 'number' ? enemy.skills.basic.damage : 5 
              }
            },
            statusEffects: Array.isArray(enemy.statusEffects) ? enemy.statusEffects : []
          };
          
          // Add optional fields only if they exist
          if (enemy.auraBonus) {
            enemyUnit.auraBonus = enemy.auraBonus;
          }
          
          if (enemy.skills?.advanced) {
            enemyUnit.skills.advanced = enemy.skills.advanced;
          }
          
          if (enemy.skills?.ultimate) {
            enemyUnit.skills.ultimate = enemy.skills.ultimate;
          }
          
          battleUnits.push(enemyUnit);
        });
      }
      
      // Add helpful system messages about battle start and health rules
      actionMessages.push(`Battle system initialized: All units start with full health (HP = Vitality × 8).`);
      actionMessages.push(`Battle started with ${battleUnits.length} combatants.`);
      
      // Add health validation message if we had to fix any health values
      if (hasFixedHp) {
        actionMessages.push(`System: Health validation performed to ensure all units start at full health.`);
      }
      
      setUnits(battleUnits);
    }
    
    // Gather action logs
    battleLog.forEach(event => {
      if (event.type === 'action') {
        const { source, target, skill, damage } = event.data || {};
        if (source && target) {
          actionMessages.push(`${source.name} used ${skill?.name || 'an attack'} on ${target.name} for ${damage || 0} damage`);
        }
      } else if (event.type === 'status') {
        const { target, effect } = event.data || {};
        if (target && effect) {
          actionMessages.push(`${target.name} is affected by ${effect.name}`);
        }
      } else if (event.type === 'round') {
        // Process battle round events - these contain the actual combat actions
        console.log(`Processing round ${event.number || '(unknown)'}:`, event);
        
        // Extract round actions - each action is an attack/skill use from one unit to another
        if (Array.isArray(event.actions) && event.actions.length > 0) {
          event.actions.forEach((action: BattleAction) => {
            if (action.actor && action.target && typeof action.damage === 'number') {
              // Format the message differently based on whether it's damage or healing
              const isHealing = action.healing || action.damage < 0;
              const message = isHealing
                ? `${action.actor} healed ${action.target} for ${Math.abs(action.damage)} HP with ${action.skill}!`
                : `${action.actor} used ${action.skill} on ${action.target} for ${action.damage} damage${action.isCritical ? " (CRITICAL HIT!)" : ""}!`;
              
              // CRITICAL FIX: Instead of immediately updating unit HP, queue the animation
              // This ensures battle actions play out sequentially with visual feedback
              const targetUnit = units.find(unit => unit.name === action.target);
              const actorUnit = units.find(unit => unit.name === action.actor);
              
              if (targetUnit && actorUnit) {
                // FIXED: Safely handle potential undefined values to prevent runtime errors
                // Queue this action for animated processing with proper type safety
                const queuedAction = {
                  type: 'attack',
                  actor: actorUnit.id || 'unknown',
                  target: targetUnit.id || 'unknown',
                  actorName: action.actor || 'Unknown',
                  targetName: action.target || 'Unknown', 
                  damage: typeof action.damage === 'number' ? action.damage : 0,
                  skill: action.skill || 'Unknown Attack',
                  isHealing: Boolean(isHealing),
                  isCritical: Boolean(action.isCritical),
                  message: action.message || message || ''
                };
                
                console.log(`Queuing battle action: ${actorUnit.name} -> ${targetUnit.name} for ${action.damage} damage`);
                setAnimationQueue(prevQueue => [...prevQueue, queuedAction]);
                
                // Still need to update the underlying data for correct health calculation
                // Update target unit HP if found and action caused damage
                if (targetUnit && !isHealing && action.damage > 0) {
                  // Apply damage to target's HP
                  targetUnit.hp = Math.max(0, targetUnit.hp - action.damage);
                  targetUnit.totalDamageReceived = (targetUnit.totalDamageReceived || 0) + action.damage;
                  
                  // Update actor's stats if found
                  if (actorUnit) {
                    actorUnit.totalDamageDealt = (actorUnit.totalDamageDealt || 0) + action.damage;
                  }
                }
                
                // Handle healing
                if (targetUnit && isHealing && action.damage > 0) {
                  // Apply healing to target's HP (don't exceed maxHp)
                  const healAmount = Math.abs(action.damage);
                  targetUnit.hp = Math.min(targetUnit.maxHp, targetUnit.hp + healAmount);
                  targetUnit.totalHealingReceived = (targetUnit.totalHealingReceived || 0) + healAmount;
                  
                  // Update actor's healing stats
                  if (actorUnit) {
                    actorUnit.totalHealingDone = (actorUnit.totalHealingDone || 0) + healAmount;
                  }
                }
                
                // We need to update the units state to reflect the health changes
                setUnits([...units]);
              }
              
              // Add the message to both action logs
              actionMessages.push(message);
              if (action.message) {
                detailedMessages.push(action.message);
              } else {
                detailedMessages.push(message);
              }
            } else if (action.type === 'defeat' && action.target) {
              // Handle defeat actions separately for clarity
              const defeatMessage = `${action.target} has been defeated!`;
              actionMessages.push(defeatMessage);
              detailedMessages.push(defeatMessage);
              
              // CRITICAL FIX: Set defeated unit's HP to 0
              const defeatedUnit = units.find(unit => unit.name === action.target);
              if (defeatedUnit) {
                defeatedUnit.hp = 0; // Ensure defeated unit shows 0 HP
                console.log(`Unit ${defeatedUnit.name} has been defeated - setting HP to 0`);
                
                // Queue a defeat animation with proper type safety
                const queuedDefeat = {
                  type: 'defeat',
                  target: defeatedUnit.id || 'unknown',
                  targetName: action.target || 'Unknown',
                  message: defeatMessage || `A unit has been defeated!`
                };
                
                // Add this to animation queue with error handling
                try {
                  setAnimationQueue(prevQueue => [...prevQueue, queuedDefeat]);
                } catch (error) {
                  console.error('Error adding defeat action to queue:', error);
                }
                
                // Update units state to reflect the defeat
                setUnits([...units]);
              }
            }
          });
        }
      } else if (event.type === 'stage' || event.type === 'stage_progress') {
        // Handle both 'stage' and 'stage_progress' events for backward compatibility
        // Extract stage information from the event
        const stageData = event.data || {};
        const newStage = event.currentStage || stageData.stage;
        
        if (typeof newStage === 'number') {
          stage = newStage;
        } else {
          // If stage number not provided, increment current stage
          stage = stage + 1;
        }
        
        // Update UI with stage progression message
        const message = event.message || `Entering Stage ${stage}`;
        actionMessages.push(message);
      } else if (event.type === 'system_message') {
        // Handle system notification messages (like HP corrections)
        const systemMessage = event.message || event.system_message;
        if (systemMessage) {
          actionMessages.push(`System: ${systemMessage}`);
          detailedMessages.push(`System Notification: ${systemMessage}`);
        }
        
        // Extract and update units if provided in the event (for multi-stage battles)
        if (event.aliveAllies && event.newEnemies && Array.isArray(event.aliveAllies) && Array.isArray(event.newEnemies)) {
          // Update units list with surviving allies and new enemies
          const updatedUnits = [...event.aliveAllies, ...event.newEnemies];
          if (updatedUnits.length > 0) {
            setUnits(updatedUnits);
          }
        }
        
        // Update current stage state
        setCurrentStage(stage);
      }
    });
    
    // Check for battle completion
    const battleCompleteEvent = battleLog.find(event => 
      event.type === 'battle_end' || event.type === 'victory' || event.type === 'defeat'
    );
    
    if (battleCompleteEvent) {
      // Mark battle as complete for UI to show the complete dungeon button
      setIsComplete(true);
      actionMessages.push(`Battle Complete! ${battleCompleteEvent.type === 'victory' ? 'Victory!' : 'Defeat!'}`);
    }
    
    // Save all the messages, but we'll display them one-by-one with animation
    const allMessages = actionMessages;
    const allDetailedMessages = detailedMessages.length > 0 ? detailedMessages : actionMessages;
    
    // Start with just the first few system messages
    const initialMessages = allMessages.slice(0, 3);
    const initialDetailedMessages = allDetailedMessages.slice(0, 3);
    setActionLog(initialMessages);
    setDetailedActionLog(initialDetailedMessages);
    
    // Function to animate battle progression step-by-step
    const animateBattleStep = () => {
      // Clear any existing animation
      if (battleAnimationRef.current) {
        clearTimeout(battleAnimationRef.current);
      }
      
      // Get current animation step
      const step = battleStepRef.current;
      
      // If we've shown all messages, stop animation
      if (step >= allMessages.length) {
        console.log("Battle animation complete");
        return;
      }
      
      // Update the action logs with one more message
      setActionLog(allMessages.slice(0, Math.min(step + 3, allMessages.length)));
      setDetailedActionLog(allDetailedMessages.slice(0, Math.min(step + 3, allDetailedMessages.length)));
      
      // Find damage events related to this step and update unit health
      // Most health updates were already applied during event processing
      
      // Increment step counter
      battleStepRef.current = step + 1;
      
      // Schedule next animation step based on playback speed
      // Base delay is 800ms, divided by playback speed
      const stepDelay = isPaused ? 0 : (800 / playbackSpeed);
      battleAnimationRef.current = setTimeout(animateBattleStep, stepDelay);
    };
    
    // Start the battle animation if not paused
    if (!isPaused) {
      // Small delay before starting to let the UI render
      setTimeout(() => {
        animateBattleStep();
      }, 500);
    }
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
          {isPaused && (
            <div className="bg-[#35235B] p-2 rounded-md mt-2 text-xs text-[#E5DBFF]">
              <p className="font-semibold mb-1">Welcome to The Forge Battle System!</p>
              <p>This simulation shows combat between your party and enemies. Press the Resume button below to start the battle.</p>
              <p className="mt-1">Each unit's Attack Meter charges based on their Speed stat. When a meter reaches 100%, the unit takes action.</p>
            </div>
          )}
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="mb-4 ml-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {!isComplete ? (
                  <span>Battle in Progress - Stage {currentStage + 1}</span>
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
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center w-20">
                              <div className="text-xs font-semibold truncate">{unit.name}</div>
                              <div className={`text-xs ${unit.hp / unit.maxHp < 0.3 ? 'text-red-400' : 'text-[#C8B8DB]'}`}>
                                {Math.ceil(unit.hp)}/{unit.maxHp}
                              </div>
                              {/* Attack meter bar below HP */}
                              <div className="w-full h-1.5 bg-gray-800/40 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className="h-full bg-yellow-500/80 rounded-full"
                                  style={{ 
                                    width: `${Math.min(100, unit.attackMeter)}%`,
                                    transition: 'width 0.3s ease-out'
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="p-3 max-w-xs bg-[#251942] text-[#E5DBFF] border border-[#6A3FB5]">
                          <h4 className="font-semibold mb-2">{unit.name}</h4>
                          <div className="text-xs text-[#C8B8DB] mb-1">Stats:</div>
                          <div className="mb-2">{renderUnitStats(unit)}</div>
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
                              {/* Inner circle with character avatar */}
                              <div className="w-11 h-11 bg-[#251942] rounded-full flex items-center justify-center text-[#E5DBFF] text-xl font-bold">
                                {unit.name.substring(0, 1)}
                              </div>
                            </div>
                            
                            {/* Character name and HP */}
                            <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center w-20">
                              <div className="text-xs font-semibold truncate">{unit.name}</div>
                              <div className={`text-xs ${unit.hp / unit.maxHp < 0.3 ? 'text-red-400' : 'text-[#C8B8DB]'}`}>
                                {Math.ceil(unit.hp)}/{unit.maxHp}
                              </div>
                              {/* Attack meter bar below HP */}
                              <div className="w-full h-1.5 bg-gray-800/40 rounded-full mt-1 overflow-hidden">
                                <div 
                                  className="h-full bg-yellow-500/80 rounded-full"
                                  style={{ 
                                    width: `${Math.min(100, unit.attackMeter)}%`,
                                    transition: 'width 0.3s ease-out'
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent className="p-3 max-w-xs bg-[#251942] text-[#E5DBFF] border border-[#6A3FB5]">
                          <h4 className="font-semibold mb-2">{unit.name}</h4>
                          <div className="text-xs text-[#C8B8DB] mb-1">Stats:</div>
                          <div className="mb-2">{renderUnitStats(unit)}</div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Battle Action Log */}
          <div className="mt-4 px-4 pb-4">
            <Tabs defaultValue="battle-log" className="w-full">
              <TabsList className="mb-2">
                <TabsTrigger value="battle-log">Battle Log</TabsTrigger>
                <TabsTrigger value="detailed-log">Detailed Log</TabsTrigger>
              </TabsList>
              <TabsContent value="battle-log" className="h-32 overflow-auto bg-[#1E1433] rounded-md p-2">
                {actionLog.map((action, index) => (
                  <motion.div 
                    key={index} 
                    className="text-sm mb-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {action}
                  </motion.div>
                ))}
              </TabsContent>
              <TabsContent value="detailed-log" className="h-32 overflow-auto bg-[#1E1433] rounded-md p-2">
                {detailedActionLog.map((action, index) => (
                  <motion.div 
                    key={index} 
                    className="text-xs mb-1"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    {action}
                  </motion.div>
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BattleLog;