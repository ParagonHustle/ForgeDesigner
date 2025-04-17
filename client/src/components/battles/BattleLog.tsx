import { useState, useEffect, useRef } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter, DialogClose
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Pause, Play, SkipForward, Swords, Zap, Heart, Shield, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

/**
 * Types for battle system
 */
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
  isAlly?: boolean;
  totalDamageDealt: number;
  totalDamageReceived: number;
  totalHealingDone: number;
  totalHealingReceived: number;
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
}

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

interface BattleEvent {
  type: string;
  data?: any;
  allies?: BattleUnit[];
  enemies?: BattleUnit[];
  timestamp?: number;
  // Round-specific properties
  number?: number;            // Round number (when type === 'round')
  actions?: BattleAction[];   // Array of actions in this round
  remainingAllies?: number;   // Number of allies still alive after round
  remainingEnemies?: number;  // Number of enemies still alive after round
  // Stage progression properties
  currentStage?: number;
  totalStages?: number;       // Total number of stages in the dungeon
  message?: string;
  aliveAllies?: BattleUnit[];
  newEnemies?: BattleUnit[];
  // System message
  system_message?: string;
  // Battle completion
  summary?: string;           // Summary of the battle outcome
  victory?: boolean;          // Whether the battle was won
  survivingAllies?: string[]; // Names of surviving allies
}

interface BattleLogProps {
  isOpen: boolean;
  onClose: () => void;
  battleLog: BattleEvent[];
  runId: number | null;
  onCompleteDungeon?: (runId: number) => void;
}

/**
 * BattleLog Component
 * Displays a visual representation of a dungeon battle
 */
const BattleLog = ({ isOpen, onClose, battleLog, runId, onCompleteDungeon }: BattleLogProps) => {
  // State for battle display
  const [units, setUnits] = useState<BattleUnit[]>([]);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [detailedActionLog, setDetailedActionLog] = useState<string[]>([]);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [currentAction, setCurrentAction] = useState<number>(0);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(true);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<string>('battle');
  
  // References for animation control
  const battleAnimationRef = useRef<NodeJS.Timeout | null>(null);
  const battleStepRef = useRef<number>(0);
  
  // Effect to process battle log when opened
  useEffect(() => {
    if (isOpen) {
      if (battleLog && battleLog.length > 0) {
        // Initialize battle state
        setActionLog(['Battle initialized. Press Play to begin...']);
        setDetailedActionLog(['Welcome to the new dungeon battle system.']);
        
        // Extract initial units from battle_start event
        const initEvent = battleLog.find(event => 
          event.type === 'battle_start' || 
          event.type === 'init'
        );
        
        if (initEvent) {
          // Extract allies and enemies and ensure they have proper health values
          const allies = (initEvent.allies || []).map(unit => ({
            ...unit,
            isAlly: true,
            hp: unit.hp || unit.maxHp, // Ensure HP is set (fallback to maxHp if hp is 0)
            attackMeter: unit.attackMeter || 0 // Ensure attack meter is set
          }));
          
          const enemies = (initEvent.enemies || []).map(unit => ({
            ...unit,
            isAlly: false,
            hp: unit.hp || unit.maxHp, // Ensure HP is set (fallback to maxHp if hp is 0)
            attackMeter: unit.attackMeter || 0 // Ensure attack meter is set
          }));
          
          console.log("Initial units:", [...allies, ...enemies]);
          
          // Set units state
          setUnits([...allies, ...enemies]);
        }
      } else {
        // No battle log data
        setActionLog([
          'No battle data available.',
          'You can still complete this dungeon to free your characters.',
          'Click the "Complete Dungeon & Claim Rewards" button below.'
        ]);
        setDetailedActionLog([
          'This dungeon has no battle log, but you can still complete it.',
          'Completing the dungeon will free your characters for other tasks.'
        ]);
      }
    }
  }, [isOpen, battleLog]);
  
  // Effect to update attack meters during battle
  useEffect(() => {
    if (!isOpen || isPaused || units.length === 0) {
      return; // Don't update meters if battle is paused or closed
    }
    
    // Create an interval to increment attack meters
    const meterInterval = setInterval(() => {
      setUnits(prevUnits => {
        // Create a new array to ensure React detects the change
        let updatedUnits = [...prevUnits];
        let anyUnitReachedFull = false;
        
        // First pass: update meters for all units
        updatedUnits = updatedUnits.map(unit => {
          // Skip defeated units
          if (unit.hp <= 0) {
            return unit;
          }
          
          // Calculate speed-based meter gain
          const speedMultiplier = unit.stats.speed / 50;
          const meterGain = 5 * Math.max(0.5, Math.min(2, speedMultiplier));
          const newMeterValue = Math.min(100, (unit.attackMeter || 0) + meterGain);
          
          // Check if any unit has reached 100%
          if (newMeterValue >= 100 && (unit.attackMeter || 0) < 100) {
            anyUnitReachedFull = true;
          }
          
          // Return updated unit with new attack meter value
          return {
            ...unit,
            attackMeter: newMeterValue
          };
        });
        
        // Second pass: if any unit reached 100%, process an attack
        if (anyUnitReachedFull) {
          // Find the first unit with a full meter
          const attackingUnitIndex = updatedUnits.findIndex(unit => unit.hp > 0 && unit.attackMeter >= 100);
          
          if (attackingUnitIndex >= 0) {
            const attacker = updatedUnits[attackingUnitIndex];
            
            // Determine target (enemies target allies, allies target enemies)
            const possibleTargets = updatedUnits.filter(unit => 
              unit.hp > 0 && unit.isAlly !== attacker.isAlly
            );
            
            if (possibleTargets.length > 0) {
              // Choose a random target
              const targetIndex = Math.floor(Math.random() * possibleTargets.length);
              const target = possibleTargets[targetIndex];
              const targetUnitIndex = updatedUnits.findIndex(u => u.id === target.id);
              
              // Calculate damage (basic attack)
              const damage = Math.floor(attacker.stats.attack * 0.8 + Math.random() * attacker.stats.attack * 0.4);
              const isCritical = Math.random() < 0.1; // 10% critical chance
              const finalDamage = isCritical ? Math.floor(damage * 1.5) : damage;
              
              // Update target's health
              const newHp = Math.max(0, target.hp - finalDamage);
              updatedUnits[targetUnitIndex] = {
                ...updatedUnits[targetUnitIndex],
                hp: newHp
              };
              
              // Reset attacker's meter
              updatedUnits[attackingUnitIndex] = {
                ...updatedUnits[attackingUnitIndex],
                attackMeter: 0
              };
              
              // Add attack log
              const attackMessage = `${attacker.name} used ${attacker.skills.basic.name} on ${target.name} for ${finalDamage} damage${isCritical ? ' (CRITICAL!)' : ''}`;
              setActionLog(prev => [...prev, attackMessage]);
              
              // If target defeated, add log
              if (newHp <= 0) {
                setActionLog(prev => [...prev, `${target.name} was defeated!`]);
              }
            }
          }
        }
        
        return updatedUnits;
      });
    }, 300); // Update every 300ms
    
    return () => clearInterval(meterInterval);
  }, [isOpen, isPaused, units.length]);
  
  // Function to handle playback controls
  const togglePlayback = () => {
    console.log("Toggle playback called, current isPaused:", isPaused);
    
    const newIsPaused = !isPaused;
    setIsPaused(newIsPaused);
    
    if (!newIsPaused) {
      // Starting playback
      if (!battleAnimationRef.current) {
        console.log("Starting battle animation");
        
        // Add a small delay to ensure state is updated
        setTimeout(() => {
          if (units.length > 0) {
            // Find the first unit with 0 attack meter and set it to a small value
            // to kickstart the animation
            setUnits(prevUnits => 
              prevUnits.map(unit => ({
                ...unit,
                attackMeter: unit.attackMeter > 0 ? unit.attackMeter : 5
              }))
            );
            
            // Start the battle animation
            advanceBattle();
          }
        }, 100);
      }
    } else {
      // Pausing playback
      if (battleAnimationRef.current) {
        console.log("Pausing battle animation");
        clearTimeout(battleAnimationRef.current);
        battleAnimationRef.current = null;
      }
    }
  };
  
  // Function to advance the battle animation
  const advanceBattle = () => {
    console.log("Advancing battle, current step:", battleStepRef.current);
    
    // Increment action counter
    setCurrentAction(prev => prev + 1);
    
    // Check if we have battle logs to process
    if (!battleLog || battleLog.length === 0) {
      console.log("No battle logs available");
      setActionLog(prev => [...prev, "No battle log data available"]);
      setIsPaused(true);
      return;
    }
    
    // Update battle state based on log
    if (battleLog && battleLog.length > battleStepRef.current) {
      const event = battleLog[battleStepRef.current];
      console.log("Processing event:", event.type, event);
      
      try {
        // Process event based on type
        if (event.type === 'round') {
          // Round events have actions
          if (event.actions && event.actions.length > 0) {
            // Add log entries for each action
            event.actions.forEach(action => {
              // Create a formatted action message string
              const actionMessage = `${action.actor} used ${action.skill} on ${action.target} for ${action.damage} damage${action.isCritical ? ' (CRITICAL!)' : ''}`;
              setActionLog(prev => [...prev, actionMessage]);
            });
          }
          
          // Update unit health based on remaining units
          if (event.allies && Array.isArray(event.allies)) {
            setUnits(prev => {
              const updatedUnits = [...prev];
              // Update ally units
              for (const ally of event.allies || []) {
                const allyIndex = updatedUnits.findIndex(u => u.id === ally.id);
                if (allyIndex >= 0) {
                  updatedUnits[allyIndex] = {
                    ...updatedUnits[allyIndex],
                    ...ally,
                    hp: ally.hp || 0, // Ensure HP is not undefined
                    attackMeter: ally.attackMeter || 0
                  };
                }
              }
              return updatedUnits;
            });
          }
          
          if (event.enemies && Array.isArray(event.enemies)) {
            setUnits(prev => {
              const updatedUnits = [...prev];
              // Update enemy units
              for (const enemy of event.enemies || []) {
                const enemyIndex = updatedUnits.findIndex(u => u.id === enemy.id);
                if (enemyIndex >= 0) {
                  updatedUnits[enemyIndex] = {
                    ...updatedUnits[enemyIndex],
                    ...enemy,
                    hp: enemy.hp || 0, // Ensure HP is not undefined
                    attackMeter: enemy.attackMeter || 0
                  };
                }
              }
              return updatedUnits;
            });
          }
        } else if (event.type === 'battle_start' || event.type === 'init') {
          // Battle initialization
          const message = typeof event.message === 'string' ? event.message : "Battle initialized";
          setActionLog(prev => [...prev, message]);
          
          // Set initial units if needed
          if (units.length === 0 && event.allies && event.enemies) {
            const allies = (event.allies || []).map(unit => ({
              ...unit,
              isAlly: true,
              hp: unit.hp || unit.maxHp,
              attackMeter: unit.attackMeter || 0
            }));
            
            const enemies = (event.enemies || []).map(unit => ({
              ...unit,
              isAlly: false,
              hp: unit.hp || unit.maxHp,
              attackMeter: unit.attackMeter || 0
            }));
            
            setUnits([...allies, ...enemies]);
          }
        } else if (event.type === 'stage_complete') {
          // Stage completion
          setCurrentStage(event.currentStage || 0);
          const message = typeof event.message === 'string' 
            ? event.message 
            : `Stage ${event.currentStage || '?'} completed!`;
          setActionLog(prev => [...prev, message]);
          
          // Update units with living allies for next stage
          if (event.aliveAllies && Array.isArray(event.aliveAllies)) {
            setUnits(prev => {
              // Filter out dead allies and keep enemies for visualization
              const updatedUnits = prev.filter(unit => 
                !unit.isAlly || (unit.isAlly && 
                  event.aliveAllies && 
                  Array.isArray(event.aliveAllies) && 
                  event.aliveAllies.some(a => a && a.id === unit.id))
              );
              
              // Update ally stats
              if (event.aliveAllies && Array.isArray(event.aliveAllies)) {
                for (const ally of event.aliveAllies) {
                  if (ally) {
                    const allyIndex = updatedUnits.findIndex(u => u.id === ally.id);
                    if (allyIndex >= 0) {
                      updatedUnits[allyIndex] = {
                        ...updatedUnits[allyIndex],
                        ...ally,
                        isAlly: true,
                        hp: (ally.hp != null) ? ally.hp : ally.maxHp, // Ensure HP is set
                        attackMeter: 0 // Reset attack meter for next stage
                      };
                    }
                  }
                }
              }
              
              return updatedUnits;
            });
          }
        } else if (event.type === 'stage_start') {
          // Start of a new stage
          setCurrentStage(event.currentStage || 0);
          const message = typeof event.message === 'string' 
            ? event.message 
            : `Stage ${event.currentStage || '?'} begins!`;
          setActionLog(prev => [...prev, message]);
          
          // Add new enemies for this stage
          if (event.enemies && Array.isArray(event.enemies)) {
            const newEnemies = event.enemies.map(enemy => ({
              ...enemy,
              isAlly: false,
              hp: enemy.hp || enemy.maxHp,
              attackMeter: 0
            }));
            
            // Update units by replacing enemies and keeping allies
            setUnits(prev => {
              // Keep only allies from previous stage
              const allies = prev.filter(unit => unit.isAlly);
              // Add new enemies
              return [...allies, ...newEnemies];
            });
          }
        } else if (event.type === 'battle_end') {
          // Battle ended
          setIsComplete(true);
          // Handle battle end message with proper type checking
          let message = "Battle completed!";
          
          if (typeof event.message === 'string') {
            message = event.message;
          } else if (typeof event.summary === 'string') {
            message = event.summary;
          }
          
          setActionLog(prev => [...prev, message]);
        } else if (event.type === 'system_message') {
          // System message - ensure we always add a valid string to the log
          let message = "System notification";
          
          if (event.system_message && typeof event.system_message === 'string') {
            message = event.system_message;
          } else if (event.message && typeof event.message === 'string') {
            message = event.message;
          }
          
          setActionLog(prev => [...prev, message]);
        } else {
          // Unknown event type
          setActionLog(prev => [...prev, `Unknown event: ${event.type}`]);
        }
      } catch (error) {
        console.error("Error processing battle event:", error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        setActionLog(prev => [...prev, `Error: ${errorMessage}`]);
      }
      
      // Increment step
      battleStepRef.current += 1;
    } else {
      // End of battle log
      setActionLog(prev => [...prev, "Battle playback complete"]);
      setIsPaused(true);
      return;
    }
    
    // Schedule next step with delay based on playback speed
    const delay = Math.max(200, 1000 / playbackSpeed);
    battleAnimationRef.current = setTimeout(() => {
      // Only continue if still in playback mode
      if (!isPaused) {
        advanceBattle();
      }
    }, delay);
  };
  
  // Function to handle changing playback speed
  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
  };
  
  // Calculate health percentage for display
  const calculateHealthPercent = (hp: number, maxHp: number): number => {
    return Math.max(0, Math.min(100, (hp / maxHp) * 100));
  };
  
  // Calculate effective speed with status effects
  const calculateEffectiveSpeed = (unit: BattleUnit): number => {
    let baseSpeed = unit.stats.speed;
    
    // Apply aura speed bonus if available
    if (unit.auraBonus?.speed) {
      baseSpeed = Math.floor(baseSpeed * (1 + unit.auraBonus.speed / 100));
    }
    
    // Apply status effects if present
    if (unit.statusEffects && unit.statusEffects.length > 0) {
      // Find all speed reduction effects
      const speedReductionEffects = unit.statusEffects.filter(effect => 
        effect.effect === "ReduceSpd"
      );
      
      // Apply each effect
      for (const effect of speedReductionEffects) {
        const reductionMultiplier = 1 - (effect.value / 100);
        baseSpeed = Math.floor(baseSpeed * reductionMultiplier);
      }
    }
    
    return baseSpeed;
  };
  
  // Calculate effective attack with status effects
  const calculateEffectiveAttack = (unit: BattleUnit): number => {
    let attackValue = unit.stats.attack;
    
    // Apply aura attack bonus if available
    if (unit.auraBonus?.attack) {
      attackValue = Math.floor(attackValue * (1 + unit.auraBonus.attack / 100));
    }
    
    // Apply status effects if present
    if (unit.statusEffects && unit.statusEffects.length > 0) {
      // Find all attack reduction effects
      const attackReductionEffects = unit.statusEffects.filter(effect => 
        effect.effect === "ReduceAtk"
      );
      
      // Apply each effect
      for (const effect of attackReductionEffects) {
        const reductionMultiplier = 1 - (effect.value / 100);
        attackValue = Math.floor(attackValue * reductionMultiplier);
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
  
  // Function to handle dialog close
  const handleClose = (open: boolean) => {
    if (!open) {
      // Reset state when closing dialog
      setUnits([]);
      setActionLog([]);
      setDetailedActionLog([]);
      setCurrentStage(0);
      setCurrentAction(0);
      setIsComplete(false);
      setIsPaused(true);
      setPlaybackSpeed(1);
      
      // Signal to parent component
      onClose();
    }
  };
  
  // Function to handle restart battle
  const restartBattle = () => {
    // Reset state
    setCurrentStage(0);
    setCurrentAction(0);
    setIsPaused(true);
    
    // Clear any pending animation
    if (battleAnimationRef.current) {
      clearTimeout(battleAnimationRef.current);
      battleAnimationRef.current = null;
    }
    
    // Reset battle step counter
    battleStepRef.current = 0;
    
    // Reset action log
    setActionLog(['Battle restarted. Press Play to begin...']);
    
    // Re-extract initial units from battle log
    const initEvent = battleLog.find(event => 
      event.type === 'battle_start' || 
      event.type === 'init'
    );
    
    if (initEvent) {
      // Extract allies and enemies with proper health values
      const allies = (initEvent.allies || []).map(unit => ({
        ...unit,
        isAlly: true,
        hp: unit.hp || unit.maxHp, // Ensure HP is set (fallback to maxHp if hp is 0)
        attackMeter: unit.attackMeter || 0 // Ensure attack meter is set
      }));
      
      const enemies = (initEvent.enemies || []).map(unit => ({
        ...unit,
        isAlly: false,
        hp: unit.hp || unit.maxHp, // Ensure HP is set (fallback to maxHp if hp is 0)
        attackMeter: unit.attackMeter || 0 // Ensure attack meter is set
      }));
      
      console.log("Restarting with units:", [...allies, ...enemies]);
      
      // Set units state
      setUnits([...allies, ...enemies]);
    }
  };
  
  // Function to handle complete dungeon button
  const handleCompleteDungeon = () => {
    if (runId && onCompleteDungeon) {
      onCompleteDungeon(runId);
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Dungeon Battle {currentStage > 0 ? `- Stage ${currentStage}` : ''}</span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={togglePlayback}
                className="h-8 w-8 p-0"
              >
                {isPaused ? <Play size={14} /> : <Pause size={14} />}
              </Button>
              
              <Button
                size="sm"
                variant={playbackSpeed === 1 ? "default" : "outline"}
                onClick={() => handleSpeedChange(1)}
                className="h-8 px-2 text-xs"
              >
                1x
              </Button>
              
              <Button
                size="sm"
                variant={playbackSpeed === 2 ? "default" : "outline"}
                onClick={() => handleSpeedChange(2)}
                className="h-8 px-2 text-xs"
              >
                2x
              </Button>
              
              <Button
                size="sm"
                variant={playbackSpeed === 4 ? "default" : "outline"}
                onClick={() => handleSpeedChange(4)}
                className="h-8 px-2 text-xs"
              >
                4x
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab(activeTab === 'battle' ? 'stats' : 'battle')}
                className="h-8 px-2 text-xs"
              >
                {activeTab === 'battle' ? 'Stats' : 'Battle'}
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            Watch the battle unfold or check detailed statistics
          </DialogDescription>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="battle">Battle View</TabsTrigger>
            <TabsTrigger value="log">Battle Log</TabsTrigger>
            <TabsTrigger value="stats">Detailed Stats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="battle" className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 min-h-0 bg-[#1D1128] rounded-md p-4 relative">
              {units.length > 0 ? (
                <div className="h-full flex flex-col">
                  {/* Battle Arena */}
                  <div className="flex-1 flex flex-col">
                    {/* Enemies Section */}
                    <div className="mb-6">
                      <h3 className="text-red-400 font-semibold mb-2">Enemies</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {units
                          .filter(unit => unit.id?.toString().includes('enemy') || (!unit.id?.toString().includes('player') && !unit.id?.toString().includes('ally')))
                          .map((enemy, index) => (
                            <div key={`enemy-${index}`} className="bg-[#251942] p-3 rounded-md border border-red-900/30">
                              <div className="text-sm font-medium">{enemy.name}</div>
                              <div className="mt-2 bg-gray-800 h-2 rounded-full w-full overflow-hidden">
                                <div 
                                  className="bg-red-500 h-full rounded-full" 
                                  style={{ width: `${calculateHealthPercent(enemy.hp, enemy.maxHp)}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs mt-1">
                                <span>HP: {Math.max(0, enemy.hp)}/{enemy.maxHp}</span>
                                <span>{calculateHealthPercent(enemy.hp, enemy.maxHp).toFixed(0)}%</span>
                              </div>
                              
                              {/* Attack Meter */}
                              <div className="mt-3 bg-gray-800 h-1.5 rounded-full w-full overflow-hidden">
                                <div 
                                  className="bg-yellow-500 h-full rounded-full" 
                                  style={{ width: `${enemy.attackMeter || 0}%` }}
                                />
                              </div>
                              <div className="text-xs text-center mt-1">Attack: {(enemy.attackMeter || 0).toFixed(0)}%</div>
                              
                              {/* Status Effects */}
                              {enemy.statusEffects && enemy.statusEffects.length > 0 && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  {enemy.statusEffects.map((effect, i) => 
                                    renderStatusEffect(effect, i, false)
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                    
                    {/* Center Battle Area */}
                    <div className="my-4 border-t border-b border-[#6A3FB5]/30 py-3 text-center">
                      <div className="text-sm text-[#C8B8DB]">
                        {currentAction > 0 ? 
                          `Round ${Math.ceil(currentAction / (units.length || 1))}` : 
                          'Battle initialized. Press Play to begin...'}
                      </div>
                    </div>
                    
                    {/* Allies Section */}
                    <div className="mt-6">
                      <h3 className="text-green-400 font-semibold mb-2">Your Team</h3>
                      <div className="grid grid-cols-3 gap-3">
                        {units
                          .filter(unit => unit.id?.toString().includes('player') || unit.id?.toString().includes('ally'))
                          .map((ally, index) => (
                            <div key={`ally-${index}`} className="bg-[#251942] p-3 rounded-md border border-green-900/30">
                              <div className="text-sm font-medium">{ally.name}</div>
                              <div className="mt-2 bg-gray-800 h-2 rounded-full w-full overflow-hidden">
                                <div 
                                  className="bg-green-500 h-full rounded-full" 
                                  style={{ width: `${calculateHealthPercent(ally.hp, ally.maxHp)}%` }}
                                />
                              </div>
                              <div className="flex justify-between text-xs mt-1">
                                <span>HP: {Math.max(0, ally.hp)}/{ally.maxHp}</span>
                                <span>{calculateHealthPercent(ally.hp, ally.maxHp).toFixed(0)}%</span>
                              </div>
                              
                              {/* Attack Meter */}
                              <div className="mt-3 bg-gray-800 h-1.5 rounded-full w-full overflow-hidden">
                                <div 
                                  className="bg-blue-500 h-full rounded-full" 
                                  style={{ width: `${ally.attackMeter || 0}%` }}
                                />
                              </div>
                              <div className="text-xs text-center mt-1">Attack: {(ally.attackMeter || 0).toFixed(0)}%</div>
                              
                              {/* Status Effects */}
                              {ally.statusEffects && ally.statusEffects.length > 0 && (
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  {ally.statusEffects.map((effect, i) => 
                                    renderStatusEffect(effect, i, true)
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center">
                  <div className="text-center text-gray-400 italic mb-4">
                    No battle data available.
                  </div>
                  <div className="text-center text-sm max-w-md">
                    You can still complete this dungeon to free your characters for other tasks.
                    Click the "Complete Dungeon & Claim Rewards" button below.
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="log" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-2">
                {actionLog.map((message, index) => (
                  <div key={index} className="bg-[#251942] p-2 rounded-md text-sm">
                    {message}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="stats" className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                <h3 className="font-semibold text-lg">Battle Statistics</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  {units.map((unit, index) => (
                    <div key={index} className="bg-[#251942] p-3 rounded-md">
                      <div className="font-medium mb-2">{unit.name}</div>
                      {renderUnitStats(unit)}
                    </div>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex flex-col gap-2">
          <div className="flex justify-between items-center w-full">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={restartBattle}
              className="h-8 text-sm"
            >
              Restart
            </Button>
            
            <DialogClose asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="h-8"
              >
                Close
              </Button>
            </DialogClose>
          </div>
          
          {runId && onCompleteDungeon && (
            <Button 
              size="lg" 
              onClick={handleCompleteDungeon}
              className="w-full mt-2 bg-[#6A3FB5] hover:bg-[#8352D3]"
            >
              Complete Dungeon & Claim Rewards
            </Button>
          )}
          
          {runId && onCompleteDungeon && (
            <div className="text-xs text-center text-[#C8B8DB] mt-1">
              Completing this dungeon will free your characters for other tasks
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BattleLog;
