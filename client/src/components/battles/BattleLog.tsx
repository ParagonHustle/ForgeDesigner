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
  speed: number;
  attackMeter: number;
  burnAttempts?: number;
  burnSuccess?: number;
  poisonAttempts?: number;
  poisonSuccess?: number;
  slowAttempts?: number;
  slowSuccess?: number;
  weakenAttempts?: number;
  weakenSuccess?: number;
  // Track the last roll value for each status effect
  lastBurnRoll?: number;
  lastPoisonRoll?: number;
  lastSlowRoll?: number;
  lastWeakenRoll?: number;
  stats: {
    attack: number;
    vitality: number;
    speed: number;
  };
  // Add aura bonuses 
  auraBonus?: {
    attack: number;
    vitality: number;
    speed: number;
    focus: number;
    accuracy: number;
    defense: number;
    resilience: number;
    element?: string;
  };
  skills: {
    basic: { name: string; damage: number }; // damage is a multiplier (e.g. 0.8 means 80% of attack)
    advanced?: { name: string; damage: number; cooldown: number };
    ultimate?: { name: string; damage: number; cooldown: number };
  };
  // Status effects that can be applied
  statusEffects?: StatusEffect[];
  // Track when status effects were last updated (by round number)
  lastStatusUpdate?: number;
  lastSkillUse: number;
  totalDamageDealt: number;
  totalDamageReceived: number;
  totalHealingDone: number;
  totalHealingReceived: number;
}

interface BattleLogProps {
  isOpen: boolean;
  onClose: () => void;
  battleLog: any[];
  runId: number | null;
  onCompleteDungeon?: (runId: number) => void;
}

const BattleLog = ({ isOpen, onClose, battleLog, runId, onCompleteDungeon }: BattleLogProps) => {
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
  
  // Forward declare checkBattleEnd to handle hoisting issues
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
      setIsComplete(true);
      setActionLog(prev => [
        ...prev,
        `Battle ended! Your party has been defeated at stage ${currentStage + 1}.`
      ]);
      console.log(`Dungeon ended - party defeated at stage ${currentStage + 1}`);
    } 
    // If all enemies are defeated and we haven't reached the final stage (8), progress to next stage
    else if (allEnemiesDefeated && !isComplete) {
      // Final stage is 7 (index 0-7 for 8 total stages)
      const isFinalStage = currentStage >= 7;

      if (isFinalStage) {
        // Complete dungeon if this is the final stage
        setIsComplete(true);
        setActionLog(prev => [
          ...prev,
          `Congratulations! You've completed all stages of the dungeon!`
        ]);
        console.log(`Dungeon completed - all 8 stages cleared!`);
      } else {
        // Progress to next stage
        const nextStage = currentStage + 1;

        // First update the action log to show progression
        setActionLog(prev => [
          ...prev,
          `Stage ${currentStage + 1} completed! Moving to stage ${nextStage + 1}...`
        ]);
        console.log(`Moving to stage ${nextStage + 1}`);

        // Reset enemy units for the next stage
        setTimeout(() => {
          // Reset the enemy units with new stats and HP
          setUnits(prevUnits => {
            const updatedUnits = prevUnits.map(unit => {
              // Check if this is an enemy
              const isEnemy = battleEntry.enemies.some((e: any) => e.id === unit.id);

              if (isEnemy) {
                // Generate new enemy based on next stage
                const stageMultiplier = 1 + (nextStage * 0.12); // 12% increase per stage
                const baseMaxHp = unit.maxHp > 0 ? 
                  Math.floor(unit.maxHp / (1 + (currentStage * 0.12))) : // Reverse calculate base HP if available
                  unit.maxHp; // Fallback to current maxHp

                const newMaxHp = Math.floor(baseMaxHp * stageMultiplier);
                const newAttack = Math.floor(unit.stats.attack * stageMultiplier);
                const newVitality = Math.floor(unit.stats.vitality * stageMultiplier);
                const newSpeed = Math.floor(unit.stats.speed * (1 + (nextStage * 0.05))); // 5% speed increase per stage

                return {
                  ...unit,
                  hp: newMaxHp,
                  maxHp: newMaxHp,
                  stats: {
                    ...unit.stats,
                    attack: newAttack,
                    vitality: newVitality,
                    speed: newSpeed
                  },
                  attackMeter: 0, // Reset attack meter
                  statusEffects: [], // Clear status effects from enemies
                  totalDamageDealt: 0,  // Reset statistics for the new stage
                  totalDamageReceived: 0
                };
              } 
              // If it's an ally, do NOT heal but do clear debuffs
              else {
                // Per user requirement: No healing between dungeon stages
                // Only keep beneficial status effects for allies between stages
                const filteredEffects = unit.statusEffects?.filter(
                  effect => !["Weakened", "Slowed", "Burning", "Poisoned"].includes(effect.name)
                ) || [];

                // Add a message to the action log that negative effects were removed
                if ((unit.statusEffects?.length || 0) > (filteredEffects.length || 0)) {
                  setActionLog(prev => [
                    ...prev,
                    `${unit.name} had negative status effects removed after completing stage ${currentStage + 1}.`
                  ]);
                }

                return {
                  ...unit,
                  // hp remains unchanged - no healing
                  statusEffects: filteredEffects,
                  attackMeter: Math.min(unit.attackMeter, 95) // Cap attack meter at 95% to prevent immediate attacks
                };
              }
            });

            // After updating all units, now set the stage
            setTimeout(() => {
              setCurrentStage(nextStage); // Update stage AFTER all units are reset
              console.log(`Stage ${nextStage + 1} is ready to begin`);
            }, 100);

            return updatedUnits;
          });
        }, 1000);
      }
    }
  };
  
  // Removed redundant useEffect - battle initialization is now handled in a single place below

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
    } else if (effect.effect === "Stun") {
      title = "Stunned";
      description = `Can't act for ${effect.duration} more turns.`;
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

  // Ensure the battle always starts at Turn 1 when initialized
  useEffect(() => {
    if (battleLog && battleLog.length > 0 && units.length > 0) {
      console.log("Initial battle setup: Setting turn to 1");
      
      // Reset both the state and the ref counter to 1
      setBattleRound(1);
      turnCountRef.current = 1;
      
      // Clear existing basic logs but preserve detailed logs for status effects
      setActionLog([]);
      
      // Initialize detailed logs with skill descriptions if they're empty
      if (detailedActionLog.length === 0) {
        const skillDescriptions = [
          "Turn 0: SKILL INFO - Gust has 50% chance to apply Minor Slow (20% Speed reduction)",
          "Turn 0: SKILL INFO - Stone Slam has 20% chance to apply Minor Weakness (10% Attack reduction)",
          "Turn 0: SKILL INFO - Wildfire has chance to apply Burn damage over time"
        ];
        setDetailedActionLog(skillDescriptions);
      }
      
      console.log("Battle log and action log reset. Starting from Turn 1");
    }
  }, [battleLog, units.length]);

  // Battle simulation loop - using a more direct approach
  useEffect(() => {
    if (!isPaused && !isComplete && units.length > 0) {
      // Add debug logging
      console.log("Battle simulation running with", units.length, "units");

      const interval = setInterval(() => {
        // DON'T increment battle round on each interval
        // Only increment when actual actions happen
        // This fixes the turn tracking issues
        
        // First pass: update meters and track which units should attack
        const unitsToAttack: { attacker: BattleUnit, target: BattleUnit }[] = [];

        setUnits(prevUnits => {
          const updatedUnits = [...prevUnits];

          // Process each unit's turn
          for (let i = 0; i < updatedUnits.length; i++) {
            const unit = updatedUnits[i];
            if (unit.hp <= 0) continue;

            // Process status effects before the unit takes their turn
            if (unit.statusEffects && unit.statusEffects.length > 0) {
              let statusEffectDamage = 0;
              let statusMessages: string[] = [];

              // Debug current status effects
              console.log(`${unit.name}'s status effects BEFORE processing:`, 
                unit.statusEffects.map(e => `${e.name}: ${e.duration} turns`).join(", "));

              // Create a copy of status effects to process
              const updatedStatusEffects = [...unit.statusEffects];

              // Process each status effect
              // Track effects that will be removed after processing
              const expiringEffects = [];
              const remainingEffects = [];

              // Process status effects - this only happens once per round
              // Status effects should only decrement when it's the unit's turn
              // This ensures effects last the proper number of full rounds

              // Check if the attack meter is full, which means it's the unit's turn
              // To fix the issue, we need to check the meter directly rather than unitsToAttack
              const isAttackMeterFull = unit.attackMeter + ((unit.stats.speed / 40) * playbackSpeed) >= 100;
              const shouldDecrement = isAttackMeterFull;

              console.log(`Processing ${unit.name}'s status effects - Current turn: ${turnCountRef.current}, Is attack meter full: ${isAttackMeterFull}, Should decrement: ${shouldDecrement}`);

              // First, create new effects with decremented durations and collect messages
              for (let j = 0; j < updatedStatusEffects.length; j++) {
                const effect = updatedStatusEffects[j];

                // Apply burn and poison effects (damage over time)
                // Only apply damage when it's the unit's turn (when attack meter will be full)
                if ((effect.effect === "Burn" || effect.effect === "Poison") && isAttackMeterFull) {
                  const dotDamage = effect.value;
                  statusEffectDamage += dotDamage;
                  statusMessages.push(`${unit.name} took ${dotDamage} damage from ${effect.name}`);
                }

                // Only decrement duration if it's a new round for this unit
                let newDuration = effect.duration;
                if (shouldDecrement) {
                  newDuration = effect.duration - 1;
                  console.log(`Decrementing ${unit.name}'s ${effect.name} effect from ${effect.duration} to ${newDuration} turns`);
                } else {
                  console.log(`Skipping decrement for ${unit.name}'s ${effect.name} - already processed this round`);
                }

                const updatedEffect = {
                  ...effect,
                  duration: newDuration
                };

                // Sort effects into expiring or remaining
                if (newDuration <= 0) {
                  expiringEffects.push(effect.name);
                  console.log(`${effect.name} has EXPIRED on ${unit.name}`);
                  statusMessages.push(`${effect.name} has expired on ${unit.name}`);
                } else {
                  remainingEffects.push(updatedEffect);
                  // Log all status effects with their remaining turns
                  console.log(`${unit.name}'s ${effect.name} effect has ${newDuration} turns remaining`);
                  statusMessages.push(`${unit.name}'s ${effect.name} effect: ${newDuration} turns remaining`);
                }

                // Update the effect in the array with the decremented duration
                updatedStatusEffects[j] = updatedEffect;
              }

              // Log summary of effects
              if (expiringEffects.length > 0) {
                console.log(`Effects expiring on ${unit.name}:`, expiringEffects.join(", "));
              }
              if (remainingEffects.length > 0) {
                console.log(`Effects remaining on ${unit.name}:`, 
                  remainingEffects.map(e => `${e.name} (${e.duration})`).join(", "));
              }

              // Debug updated status effects
              console.log(`${unit.name}'s status effects AFTER processing:`, 
                updatedStatusEffects.map(e => `${e.name}: ${e.duration} turns`).join(", "));

              // Apply damage and keep updated status effect durations
              // Even if no damage was taken, we need to update durations
              updatedUnits[i] = {
                ...unit,
                hp: Math.max(0, statusEffectDamage > 0 ? unit.hp - statusEffectDamage : unit.hp),
                totalDamageReceived: statusEffectDamage > 0 ? unit.totalDamageReceived + statusEffectDamage : unit.totalDamageReceived,
                // Keep all status effects but with their updated durations, filter out expired ones
                statusEffects: updatedStatusEffects.filter(effect => effect.duration > 0),
                lastStatusUpdate: turnCountRef.current // Mark this unit as having its status effects processed this round
              };

              // Add status effect messages to the action log (only if damage was taken)
              if (statusEffectDamage > 0) {
                setTimeout(() => {
                  statusMessages.forEach(message => {
                    setActionLog(prev => [message, ...prev]);
                  });

                  // Check if unit was defeated by status effects
                  if (updatedUnits[i].hp <= 0 && unit.hp > 0) {
                    setActionLog(prev => [`${unit.name} has been defeated by status effects!`, ...prev]);

                    // Check if this was the last alive ally
                    const battleEntry = battleLog.find(log => log.allies && Array.isArray(log.allies));
                    if (battleEntry) {
                      const updatedAllies = updatedUnits.filter(u => 
                        battleEntry.allies.some((a: any) => a.id === u.id)
                      );

                      // If this defeat means all allies are now defeated, end the battle
                      const allAlliesDefeated = updatedAllies.every(a => a.hp <= 0);
                      if (allAlliesDefeated && !isComplete) {
                        console.log("All allies defeated by status effects! Ending dungeon.");
                        setTimeout(() => {
                          // Adding slight delay for the defeat message to appear first
                          checkBattleEnd();
                        }, 50);
                      }
                    }
                  }
                }, 0);
              } else {
                // Make sure both expired effects are removed AND durations are updated
                const filteredEffects = updatedStatusEffects.filter(effect => effect.duration > 0);
                console.log(`${unit.name} status effects after filtering expired:`, 
                  filteredEffects.map(e => `${e.name}: ${e.duration} turns`).join(", "));

                updatedUnits[i] = {
                  ...unit,
                  statusEffects: filteredEffects,
                  lastStatusUpdate: turnCountRef.current // Mark this unit as having its status effects processed this round
                };
              }
            }

            // Update attack meter based on speed (120 speed = 3x faster than 40 speed)
            // Apply aura speed bonus if available
            let speedValue = unit.stats.speed;
            
            // Apply aura speed bonus if available
            if (unit.auraBonus?.speed) {
              // Apply percentage bonus from aura
              speedValue = Math.floor(speedValue * (1 + unit.auraBonus.speed / 100));
            }
            
            // Apply speed reduction status effects if present
            if (unit.statusEffects && unit.statusEffects.length > 0) {
              // Find all speed reduction effects
              const speedReductionEffects = unit.statusEffects.filter(effect => effect.effect === "ReduceSpd");
              
              // Apply each effect (multiplicatively)
              for (const effect of speedReductionEffects) {
                // Calculate reduction percentage (20% reduction = multiply by 0.8)
                const reductionMultiplier = 1 - (effect.value / 100);
                speedValue = Math.floor(speedValue * reductionMultiplier);
                console.log(`Applied ${effect.name} to ${unit.name}: Speed reduced by ${effect.value}% to ${speedValue}`);
              }
            }

            const meterIncrease = (speedValue / 40) * playbackSpeed;
            let newMeter = updatedUnits[i].attackMeter + meterIncrease;

            // If meter is full, find a target and add to attack queue
            if (newMeter >= 100) {
              console.log(`${unit.name}'s attack meter is full!`);
              // Reset meter
              newMeter = 0;

              // Find a target
              const possibleTargets = updatedUnits.filter(u => {
                if (u.hp <= 0) return false;

                // Allies target enemies, enemies target allies
                const isAttackerAlly = battleLog[0]?.allies?.some((a: any) => a.id === unit.id);
                const isTargetAlly = battleLog[0]?.allies?.some((a: any) => a.id === u.id);

                return isAttackerAlly !== isTargetAlly; // Target must be on opposite side
              });

              if (possibleTargets.length > 0) {
                const target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
                console.log(`${unit.name} will attack ${target.name}`);
                unitsToAttack.push({ attacker: unit, target });
              }
            }

            updatedUnits[i] = {
              ...updatedUnits[i], // Use the potentially updated unit with statusEffects and lastStatusUpdate
              attackMeter: newMeter
            };
          }

          // Check for battle completion
          const battleEntry = battleLog.find(log => log.allies && Array.isArray(log.allies));
          const allies = updatedUnits.filter(u => battleEntry?.allies.some((a: any) => a.id === u.id));
          const enemies = updatedUnits.filter(u => battleEntry?.enemies.some((e: any) => e.id === u.id));

          const allAlliesDefeated = allies.every((a: BattleUnit) => a.hp <= 0);
          const allEnemiesDefeated = enemies.every((e: BattleUnit) => e.hp <= 0);

          // Check for battle end conditions - either all allies or all enemies defeated
          if ((allEnemiesDefeated && !allAlliesDefeated && !isComplete) || (allAlliesDefeated && !isComplete)) {
            console.log(allAlliesDefeated 
              ? "All allies defeated, ending dungeon run!" 
              : "All enemies defeated, should progress to next stage!");
            checkBattleEnd();
          }

          return updatedUnits;
        });

        // Second pass: Process attacks after state update
        // Important: We increment the turn number ONCE before processing any attacks in a batch
        // This ensures first attack is turn 1, second group is turn 2, etc.
        // Do NOT increment inside the forEach loop or each action would jump multiple turns
        
        setTimeout(() => {
          // Increment the turn number once before processing all actions for this turn
          if (unitsToAttack.length > 0) {
            turnCountRef.current += 1;
            console.log(`Starting turn ${turnCountRef.current} with ${unitsToAttack.length} actions`);
          }
          
          unitsToAttack.forEach(({ attacker, target }) => {
            // Calculate attack details
            const attackCount = attacker.lastSkillUse + 1;
            let skill = attacker.skills.basic;
            let skillType = 'basic';

            // Check for ultimate/advanced skill usage based on cooldown
            if (attacker.skills.ultimate && attackCount % attacker.skills.ultimate.cooldown === 0) {
              skill = attacker.skills.ultimate;
              skillType = 'ultimate';
            } else if (attacker.skills.advanced && attackCount % attacker.skills.advanced.cooldown === 0) {
              skill = attacker.skills.advanced;
              skillType = 'advanced';
            }

            // Calculate damage: Attack * Damage Multiplier
            // Apply aura bonus if available
            let attackValue = attacker.stats.attack;
            
            // Apply aura attack bonus if available
            if (attacker.auraBonus?.attack) {
              // Add percentage bonus from aura
              attackValue = Math.floor(attackValue * (1 + attacker.auraBonus.attack / 100));
            }
            
            // Apply attack reduction status effects if present
            if (attacker.statusEffects && attacker.statusEffects.length > 0) {
              // Find all attack reduction effects
              const attackReductionEffects = attacker.statusEffects.filter(effect => effect.effect === "ReduceAtk");
              
              // Apply each effect (multiplicatively)
              for (const effect of attackReductionEffects) {
                // Calculate reduction percentage (10% reduction = multiply by 0.9)
                const reductionMultiplier = 1 - (effect.value / 100);
                attackValue = Math.floor(attackValue * reductionMultiplier);
                console.log(`Applied ${effect.name} to ${attacker.name}: Attack reduced by ${effect.value}% to ${attackValue}`);
              }
            }

            // Damage = Attack * Skill Damage Multiplier
            const damage = Math.floor(attackValue * skill.damage);

            // Check for special skills with healing effects (like Soothing Current)
            let healingEffectText = "";
            let healingTarget: BattleUnit | null = null;
            let healAmount = 0;

            // NOTE: We will handle healing in the performAction function only to avoid duplicate healing
            // This block will prepare the healing text for the action message with the exact amount
            if (skill.name === "Soothing Current") {
              // Calculate healing amount based on 5% of the caster's max HP
              const healAmount = Math.floor(attacker.maxHp * 0.05);

              // Get all living allies (hp > 0) to find who we'll be healing
              const battleEntry = battleLog.find(log => log.allies && Array.isArray(log.allies));
              const allies = units.filter(u => 
                battleEntry?.allies?.some((a: any) => a.id === u.id) && u.hp > 0
              );

              if (allies.length > 0) {
                // Sort allies by HP percentage (lowest first)
                const sortedAllies = [...allies].sort((a, b) => 
                  (a.hp / a.maxHp) - (b.hp / b.maxHp)
                );

                // Always pick the ally with the lowest HP percentage
                const healTarget = sortedAllies[0];

                // Include the heal target's name in the message
                healingEffectText = ` (healing ${healTarget.name} for ${healAmount} HP)`;
              } else {
                // Fallback if no allies found (shouldn't happen)
                healingEffectText = ` (with healing for ${healAmount} HP)`;
              }
            }

            // Format the action message with more details
            let statusEffectText = "";
            // Check for special basic skills that can apply effects (like Ember)
            const isEmberSkill = skill.name === "Ember";
            // Apply status effects in two cases:
            // 1. Non-basic skills with 30% chance
            // 2. Ember basic skill with 10% chance to apply burn
            if ((skillType !== 'basic' && Math.random() < 0.3) || (isEmberSkill && Math.random() < 0.1)) {
              // Determine the type of status effect based on skill name/type
              let effectType = "general";

              // Special handling for Ember - always applies Burn
              if (isEmberSkill) {
                effectType = "burn";
              }
              // For other skills, check name for hints
              else if (skill.name.toLowerCase().includes("burn") || skill.name.toLowerCase().includes("fire") || 
                  skill.name.toLowerCase().includes("flame") || skill.name.toLowerCase().includes("inferno")) {
                effectType = "burn";
              } else if (skill.name.toLowerCase().includes("poison") || skill.name.toLowerCase().includes("venom") || 
                        skill.name.toLowerCase().includes("toxic")) {
                effectType = "poison";
              }

              let effect: StatusEffect;
              if (effectType === "burn") {
                // Burn effect: 5% of max HP damage per turn
                const burnDamage = Math.floor(target.maxHp * 0.05);
                // Get burn duration based on skill
                let burnDuration = 3; // Default duration
                if (skill.name === "Ember") {
                  burnDuration = 1; // Ember applies burn for 1 turn only
                } else if (skill.name === "Flame Whip") {
                  burnDuration = 2; // Flame Whip applies burn for 2 turns
                }
                effect = {
                  name: "Burning",
                  effect: "Burn",
                  value: burnDamage,
                  duration: burnDuration,
                  source: attacker.id
                };
                statusEffectText = ` [Burning applied - ${burnDamage} damage per turn]`;
              } else if (effectType === "poison") {
                // Poison effect: 5% of max HP damage per turn
                const poisonDamage = Math.floor(target.maxHp * 0.05);
                effect = {
                  name: "Poisoned",
                  effect: "Poison",
                  value: poisonDamage,
                  duration: 3,
                  source: attacker.id
                };
                statusEffectText = ` [Poisoned applied - ${poisonDamage} damage per turn]`;
              } else {
                // General status effects
                const possibleEffects = [
                  {name: "Weakened", effect: "ReduceAtk", value: 10, duration: 2, source: attacker.id},
                  {name: "Slowed", effect: "ReduceSpd", value: 15, duration: 2, source: attacker.id}
                ];
                effect = possibleEffects[Math.floor(Math.random() * possibleEffects.length)];
                statusEffectText = ` [${effect.name} applied]`;
              }

              // Apply the status effect to the target
              if (!target.statusEffects) target.statusEffects = [];

              // Check if target already has this effect - if so, extend duration rather than adding new
              const existingEffectIndex = target.statusEffects.findIndex(e => e.effect === effect.effect);
              if (existingEffectIndex >= 0) {
                // Update the existing effect duration (extend it)
                target.statusEffects[existingEffectIndex].duration = Math.max(
                  target.statusEffects[existingEffectIndex].duration,
                  effect.duration
                );
                console.log(`Extended existing ${effect.name} effect on ${target.name} to ${target.statusEffects[existingEffectIndex].duration} turns`);
              } else {
                // Add new effect
                target.statusEffects.push(effect);
                console.log(`Added new ${effect.name} effect to ${target.name} with ${effect.duration} turns duration`);
              }
            }

            // Use the current turn number from our ref counter
            const actionMessage = `Turn ${turnCountRef.current}: ${attacker.name} used ${skill.name} on ${target.name} for ${damage} damage!${statusEffectText}${healingEffectText}`;
            console.log(actionMessage);

            // Update action log
            setActionLog(prev => [actionMessage, ...prev]);

            // Apply damage to the target first
            setUnits(prevUnits => {
              const updatedUnits = prevUnits.map(u => {
                if (u.id === target.id) {
                  const newHp = Math.max(0, u.hp - damage);
                  // Check if target is defeated
                  if (newHp <= 0 && u.hp > 0) {
                    setActionLog(prev => [`${target.name} has been defeated!`, ...prev]);
                  }
                  return {
                    ...u,
                    hp: newHp,
                    totalDamageReceived: u.totalDamageReceived + damage
                  };
                }
                if (u.id === attacker.id) {
                  return {
                    ...u,
                    lastSkillUse: attackCount,
                    totalDamageDealt: u.totalDamageDealt + damage
                  };
                }
                return u;
              });

              // If skill is Soothing Current, apply healing effect
              if (skill.name === "Soothing Current") {
                // Get all living allies (hp > 0)
                const allies = updatedUnits.filter(u => 
                  battleLog[0]?.allies?.some((a: any) => a.id === u.id) && u.hp > 0
                );

                // Debug
                console.log("SECOND LOCATION - Initial allies:");
                allies.forEach(ally => {
                  console.log(`Ally ${ally.name}: ${ally.hp}/${ally.maxHp} = ${(ally.hp / ally.maxHp * 100).toFixed(1)}%`);
                });

                if (allies.length > 0) {
                  // Sort allies by HP percentage (lowest first)
                  const sortedAllies = [...allies].sort((a, b) => 
                    (a.hp / a.maxHp) - (b.hp / b.maxHp)
                  );

                  // Always pick the ally with the lowest HP percentage
                  const healTarget = sortedAllies[0];

                  // Debug the selected heal target
                  console.log(`SECOND LOCATION - Selected heal target: ${healTarget.name} with ${healTarget.hp}/${healTarget.maxHp} = ${(healTarget.hp / healTarget.maxHp * 100).toFixed(1)}%`);

                  // Calculate healing amount (5% of attacker's max HP)
                  const healAmount = Math.floor(attacker.maxHp * 0.05);

                  // We won't add a separate log message here - only one will be shown in the action message

                  // Apply healing
                  return updatedUnits.map(u => {
                    if (u.id === healTarget.id) {
                      const newHp = Math.min(u.maxHp, u.hp + healAmount);
                      return {
                        ...u,
                        hp: newHp,
                        totalHealingReceived: u.totalHealingReceived + healAmount
                      };
                    }
                    if (u.id === attacker.id) {
                      return {
                        ...u,
                        totalHealingDone: u.totalHealingDone + healAmount
                      };
                    }
                    return u;
                  });
                }
              }

              return updatedUnits;
            });
          });

          // Check if battle has ended after all attacks
          if (unitsToAttack.length > 0) {
            setTimeout(() => {
              const allies = units.filter(u => battleLog[0]?.allies?.some((a: any) => a.id === u.id));
              const enemies = units.filter(u => battleLog[0]?.enemies?.some((e: any) => e.id === u.id));

              const allAlliesDefeated = allies.every((a: BattleUnit) => a.hp <= 0);
              const allEnemiesDefeated = enemies.every((e: BattleUnit) => e.hp <= 0);

              if (allAlliesDefeated || allEnemiesDefeated) {
                setIsComplete(true);
                setActionLog(prev => [
                  ...prev,
                  `Battle ended! ${allAlliesDefeated ? 'Enemies' : 'Allies'} are victorious!`
                ]);
                console.log("Battle complete!");
              }
            }, 100);
          }
        }, 50);

      }, 200); // Slower interval to make attacks more visible

      return () => clearInterval(interval);
    }
  }, [isPaused, playbackSpeed, isComplete, units, battleLog]);

  const selectTarget = (attacker: BattleUnit, allUnits: BattleUnit[], skillName?: string) => {
    // Get first log entry that has allies defined
    const battleEntry = battleLog.find(log => log.allies && Array.isArray(log.allies));
    const isAlly = battleEntry?.allies?.some((a: any) => a.id === attacker.id) || false;

    // Standard target selection (enemies for allies, allies for enemies)
    const possibleTargets = allUnits.filter(u =>
      u.hp > 0 &&
      (isAlly ? battleEntry?.enemies?.some((e: any) => e.id === u.id) : battleEntry?.allies?.some((a: any) => a.id === u.id))
    );

    // Special case: Cleansing Tide - find allies with debuffs
    if (skillName === "Cleansing Tide" && isAlly) {
      const alliesWithDebuffs = allUnits.filter(u => 
        u.hp > 0 && 
        battleEntry?.allies?.some((a: any) => a.id === u.id) && 
        u.statusEffects && 
        u.statusEffects.length > 0
      );

      // If we have allies with debuffs, select one randomly
      if (alliesWithDebuffs.length > 0) {
        return possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
      }
    }

    // Special case: For multi-target attacks, we'll handle this differently
    // but still return a single target here for the initial attack
    return possibleTargets.length > 0 ? 
      possibleTargets[Math.floor(Math.random() * possibleTargets.length)] : 
      null;
  };
  
  const performAction = (attacker: BattleUnit, target: BattleUnit) => {
    // We no longer increment turns here - turns are incremented once per interval
    // before processing all actions for that turn
    // Simply sync the battle round display with the current turn count
    setBattleRound(turnCountRef.current);
    
    const attackCount = attacker.lastSkillUse + 1;
    let skill = attacker.skills.basic;
    let skillType = 'basic';

    // Check for ultimate/advanced skill usage based on cooldown
    if (attacker.skills.ultimate && attackCount % attacker.skills.ultimate.cooldown === 0) {
      skill = attacker.skills.ultimate;
      skillType = 'ultimate';
    } else if (attacker.skills.advanced && attackCount % attacker.skills.advanced.cooldown === 0) {
      skill = attacker.skills.advanced;
      skillType = 'advanced';
    }

    // Get battle entries for targeting
    const battleEntry = battleLog.find(log => log.allies && Array.isArray(log.allies));
    const isAlly = battleEntry?.allies?.some((a: any) => a.id === attacker.id) || false;

    // Calculate damage: Attack * Damage Multiplier
    // Apply aura bonus if available
    let attackValue = attacker.stats.attack;
    
    // Apply aura attack bonus if available
    if (attacker.auraBonus?.attack) {
      // Add percentage bonus from aura
      attackValue = Math.floor(attackValue * (1 + attacker.auraBonus.attack / 100));
    }
    
    // Apply attack reduction status effects if present
    if (attacker.statusEffects && attacker.statusEffects.length > 0) {
      // Find all attack reduction effects
      const attackReductionEffects = attacker.statusEffects.filter(effect => effect.effect === "ReduceAtk");
      
      // Apply each effect (multiplicatively)
      for (const effect of attackReductionEffects) {
        // Calculate reduction percentage (10% reduction = multiply by 0.9)
        const reductionMultiplier = 1 - (effect.value / 100);
        attackValue = Math.floor(attackValue * reductionMultiplier);
        console.log(`Applied ${effect.name} to ${attacker.name}: Attack reduced by ${effect.value}% to ${attackValue}`);
      }
    }

    // Damage = Attack * Skill Damage Multiplier
    const damage = Math.floor(attackValue * skill.damage);

    // Handle special skill behaviors
    const applySpecialSkillBehavior = () => {
      // Get all enemies or allies (opposite of attacker side)
      const possibleTargets = units.filter(u => {
        // Units must be alive
        if (u.hp <= 0) return false;

        // Target opposite side of the attacker (allies target enemies, enemies target allies)
        if (isAlly) {
          return battleEntry?.enemies?.some((e: any) => e.id === u.id);
        } else {
          return battleEntry?.allies?.some((a: any) => a.id === u.id);
        }
      });

      // Cleansing Tide behavior (remove 1 debuff from random ally)
      if (skill.name === "Cleansing Tide" && isAlly && Math.random() < 0.1) { // 10% chance
        // Find allies with debuffs
        const alliesWithDebuffs = units.filter(u => 
          u.hp > 0 && 
          battleEntry?.allies?.some((a: any) => a.id === u.id) && 
          u.statusEffects && 
          u.statusEffects.length > 0
        );

        if (alliesWithDebuffs.length > 0) {
          // Select random ally with debuffs
          const targetAlly = alliesWithDebuffs[Math.floor(Math.random() * alliesWithDebuffs.length)];

          // Remove one random debuff
          if (targetAlly.statusEffects && targetAlly.statusEffects.length > 0) {
            const randomEffect = targetAlly.statusEffects[Math.floor(Math.random() * targetAlly.statusEffects.length)];

            // Update units state to remove the debuff
            setUnits(prevUnits => {
              return prevUnits.map(u => {
                if (u.id === targetAlly.id) {
                  return {
                    ...u,
                    statusEffects: u.statusEffects?.filter(e => 
                      e.name !== randomEffect.name || e.duration !== randomEffect.duration
                    ) || []
                  };
                }
                return u;
              });
            });

            // Log the cleanse effect
            setActionLog(prev => [
              `${attacker.name}'s Cleansing Tide removed ${randomEffect.name} from ${targetAlly.name}!`,
              ...prev
            ]);
          }
        }
      }

      // Wildfire (target 2 enemies with chance for 3rd)
      if (skill.name === "Wildfire" && possibleTargets.length > 1) {
        // Always hit 2 targets
        const secondTarget = possibleTargets.find(u => u.id !== target.id) || possibleTargets[0]; 

        // Apply damage to second target if found
        if (secondTarget) {
          setUnits(prevUnits => {
            return prevUnits.map(u => {
              if (u.id === secondTarget.id) {
                const newHp = Math.max(0, u.hp - damage);

                // Check if target is defeated
                if (newHp <= 0 && u.hp > 0) {
                  setActionLog(prev => [`${secondTarget.name} has been defeated!`, ...prev]);
                }

                return {
                  ...u,
                  hp: newHp,
                  totalDamageReceived: u.totalDamageReceived + damage
                };
              }
              if (u.id === attacker.id) {
                return {
                  ...u,
                  totalDamageDealt: u.totalDamageDealt + damage
                };
              }
              return u;
            });
          });

          // Log the second hit
          setActionLog(prev => [
            `${attacker.name}'s Wildfire also hit ${secondTarget.name} for ${damage} damage!`,
            ...prev
          ]);

          // 25% chance to hit a 3rd target
          if (Math.random() < 0.25 && possibleTargets.length > 2) {
            const thirdTargetOptions = possibleTargets.filter(u => u.id !== target.id && u.id !== secondTarget.id);
            if (thirdTargetOptions.length > 0) {
              const thirdTarget = thirdTargetOptions[Math.floor(Math.random() * thirdTargetOptions.length)];

              // Apply damage to third target
              setUnits(prevUnits => {
                return prevUnits.map(u => {
                  if (u.id === thirdTarget.id) {
                    const newHp = Math.max(0, u.hp - damage);

                    // Check if target is defeated
                    if (newHp <= 0 && u.hp > 0) {
                      setActionLog(prev => [`${thirdTarget.name} has been defeated!`, ...prev]);
                    }

                    return {
                      ...u,
                      hp: newHp,
                      totalDamageReceived: u.totalDamageReceived + damage
                    };
                  }
                  if (u.id === attacker.id) {
                    return {
                      ...u,
                      totalDamageDealt: u.totalDamageDealt + damage
                    };
                  }
                  return u;
                });
              });

              // Log the third hit
              setActionLog(prev => [
                `${attacker.name}'s Wildfire spread to ${thirdTarget.name} for ${damage} damage!`,
                ...prev
              ]);
            }
          }
        }
      }

      // Dust Spikes (attack 2 random targets)
      if (skill.name === "Dust Spikes" && possibleTargets.length > 1) {
        // Find a second random target different from the primary
        const secondTargetOptions = possibleTargets.filter(u => u.id !== target.id);
        if (secondTargetOptions.length > 0) {
          const secondTarget = secondTargetOptions[Math.floor(Math.random() * secondTargetOptions.length)];

          // Apply damage to second target
          setUnits(prevUnits => {
            return prevUnits.map(u => {
              if (u.id === secondTarget.id) {
                const newHp = Math.max(0, u.hp - damage);

                // Check if target is defeated
                if (newHp <= 0 && u.hp > 0) {
                  setActionLog(prev => [`${secondTarget.name} has been defeated!`, ...prev]);
                }

                return {
                  ...u,
                  hp: newHp,
                  totalDamageReceived: u.totalDamageReceived + damage
                };
              }
              if (u.id === attacker.id) {
                return {
                  ...u,
                  totalDamageDealt: u.totalDamageDealt + damage
                };
              }
              return u;
            });
          });

          // Log the second hit
          setActionLog(prev => [
            `${attacker.name}'s Dust Spikes also hit ${secondTarget.name} for ${damage} damage!`,
            ...prev
          ]);
        }
      }
    };

    // Apply special skill behaviors
    applySpecialSkillBehavior();

    // Format the action message with more details
    let statusEffectText = "";

    // Use a direct debug message for testing 
    console.log(`Skill used: ${skill.name} by ${attacker.name}`);

    // Add direct combat log for the damage that will display even if special effects fail
    const basicMessage = `${attacker.name} used ${skill.name} on ${target.name} for ${damage} damage!`;
    setActionLog(prev => [`Turn ${turnCountRef.current}: ${basicMessage}`, ...prev]);
    
    // Apply special status effects for specific skills
    // Debug to check if the skill name is recognized correctly
    console.log(`SKILL DEBUG !!!: Checking skill: "${skill.name}" against "Gust" - Match: ${skill.name === "Gust"}`);
    
    // Add explicit log entry visible in the battle log
    setActionLog(prev => [`DEBUG - Skill Name: "${skill.name}" - Is Exact Gust Match: ${skill.name === "Gust"}`, ...prev]);
    setDetailedActionLog(prev => [`DEBUG - Skill "${skill.name}" used by ${attacker.name}`, ...prev]);
    
    // Add a log entry specifically for ALL G-Wolf skill uses
    if (attacker.name === "G-Wolf") {
      setActionLog(prev => [`G-WOLF USING SKILL: "${skill.name}" - Skill Type: ${skillType}`, ...prev]);
      console.log("!!! G-WOLF SKILL !!!");
      console.log("Skill being used:", skill);
      
      if (skill.name.toLowerCase().includes("gust")) {
        setActionLog(prev => [`DETECTED GUST: G-Wolf is using a gust-like skill!`, ...prev]);
      }
    }
    
    // Same for Albus
    if (attacker.name === "Albus Dumbleboom") {
      setActionLog(prev => [`ALBUS USING SKILL: "${skill.name}" - Skill Type: ${skillType}`, ...prev]);
      console.log("!!! ALBUS SKILL !!!");
      console.log("Skill being used:", skill);
      
      if (skill.name.toLowerCase().includes("gust")) {
        setActionLog(prev => [`DETECTED GUST: Albus is using a gust-like skill!`, ...prev]);
      }
    }
    
    // *** IMPORTANT FIX: Connect Gust to status effect system ***
    const isGustSkill = skill.name === "Gust" || 
                       skill.name.toLowerCase() === "gust".toLowerCase() || 
                       skill.name.toLowerCase().includes("gust");
    
    if (isGustSkill) {
      console.log(`💨 GUARANTEED GUST EFFECT: ${attacker.name} will apply Minor Slow to ${target.name}`);
      setActionLog(prev => [`GUST DETECTED: ${skill.name} by ${attacker.name} - Will apply Minor Slow!`, ...prev]);
      
      // Track attempt to apply Slow effect
      console.log(`${attacker.name} attempting to apply SLOW with Gust on ${target.name} - Turn ${turnCountRef.current}`);
      
      // Directly apply Minor Slow effect
      const slowEffect: StatusEffect = {
        name: "Minor Slow",
        effect: "ReduceSpd",
        value: 20,
        duration: 1,
        source: attacker.id
      };
      
      // Initialize status effects array if needed
      if (!target.statusEffects) target.statusEffects = [];
      
      // Add effect and update counters
      target.statusEffects.push(slowEffect);
      console.log(`Applied Minor Slow effect to ${target.name} with ${slowEffect.duration} turn duration`);
      
      // Update success counter
      setUnits(prevUnits => {
        return prevUnits.map(u => {
          if (u.id === attacker.id) {
            return {
              ...u,
              slowAttempts: (u.slowAttempts || 0) + 1,
              slowSuccess: (u.slowSuccess || 0) + 1
            };
          }
          return u;
        });
      });
      
      statusEffectText = " [Minor Slow applied]";
      
      // Update attempts counter
      setUnits(prevUnits => {
        return prevUnits.map(u => {
          if (u.id === attacker.id) {
            const currentAttempts = typeof u.slowAttempts === 'number' ? u.slowAttempts : 0;
            return {
              ...u,
              slowAttempts: currentAttempts + 1
            };
          }
          return u;
        });
      });

      // *** IMPORTANT FIX: Changed to ALWAYS succeed when applying Minor Slow with Gust ***
      // Force the roll to always succeed (100% chance instead of 50%)
      const effectRoll = 0; // Will always be less than the threshold
      const effectSuccess = true; // Always succeed
      
      // Store the roll value
      setUnits(prevUnits => {
        return prevUnits.map(u => {
          if (u.id === attacker.id) {
            return {
              ...u,
              lastSlowRoll: effectRoll
            };
          }
          return u;
        });
      });

      // Add roll attempt to logs
      const rollMessage = `${attacker.name}'s Gust roll: ${effectRoll.toFixed(1)}% - ${effectSuccess ? 'SUCCESS!' : 'FAILED'}`;
      setActionLog(prev => [`Turn ${turnCountRef.current}: ${rollMessage}`, ...prev]);
      setDetailedActionLog(prev => [`Turn ${turnCountRef.current}: EFFECT ROLL - ${rollMessage}`, ...prev]);
      
      // For testing/debugging - add a very clear message that will be visible in the action log
      console.log("TESTING STATUS EFFECT: Attempting to apply Slow with Gust!");
      
      // Add a more visible attempt message without HTML formatting
      const rollAttemptMessage = `${attacker.name} used Gust - 50% chance to apply Minor Slow on ${target.name}`;
      
      // Always add the attempt to the action log for visibility
      setActionLog(prev => [`Turn ${turnCountRef.current}: ${rollAttemptMessage}`, ...prev]);
      
      // Add to detailed log too - this is what we see in debug logs
      console.log("Adding Gust attempt to detailed log");
      setDetailedActionLog(prev => [`Turn ${turnCountRef.current}: EFFECT ATTEMPT - ${rollAttemptMessage}`, ...prev]);
      
      // Store the last roll value on the attacker for reporting
      setUnits(prevUnits => {
        return prevUnits.map(u => {
          if (u.id === attacker.id) {
            return {
              ...u,
              lastSlowRoll: effectRoll
            };
          }
          return u;
        });
      });
      
      // *** IMPORTANT FIX: Always succeed with Minor Slow from Gust skills ***
      // This forces success regardless of roll
      const updatedSuccess = true;
      const resultText = updatedSuccess ? "SUCCESS!" : "FAILED";
      const icon = updatedSuccess ? '🌪️' : '';
      const rollResultMessage = `${attacker.name}'s Gust: GUARANTEED Minor Slow Effect! ${icon}`;
      
      // Add roll result to action log - using HTML markup that will be rendered with dangerouslySetInnerHTML
      setActionLog(prev => [`Turn ${turnCountRef.current}: ${rollResultMessage}`, ...prev]);
      
      // Also add to detailed log for Debug tab
      const rollDetailedMessage = `Turn ${turnCountRef.current}: EFFECT ROLL - ${attacker.name}'s Gust - Rolled: ${effectRoll.toFixed(1)}% vs 50.0% threshold - ${updatedSuccess ? 'SUCCESS' : 'FAILED'}`;
      console.log("Adding Gust roll result to detailed log:", rollDetailedMessage);
      setDetailedActionLog(prev => [rollDetailedMessage, ...prev]);
      
      // Record the last roll for UI display in the summary tab
      setUnits(prevUnits => {
        return prevUnits.map(u => {
          if (u.id === attacker.id) {
            return {
              ...u,
              lastSlowRoll: effectRoll
            };
          }
          return u;
        });
      });
      
      // This detailed log entry is now redundant - already added above
      
      if (updatedSuccess) { // 50% chance for Minor Slow (updated for testing)
        // Update success counter only if effect lands
        setUnits(prevUnits => {
          return prevUnits.map(u => {
            if (u.id === attacker.id) {
              // Make sure we properly initialize and increment the counter
              const currentSuccesses = typeof u.slowSuccess === 'number' ? u.slowSuccess : 0;
              return {
                ...u,
                slowSuccess: currentSuccesses + 1
              };
            }
            return u;
          });
        });
        
        // Add to detailed action log
        setDetailedActionLog(prev => [`Turn ${turnCountRef.current}: STATUS - ${attacker.name} applied SLOW to ${target.name}`, ...prev]);
        
        // Format a plain text success message with an icon
        const successMessage = `${attacker.name} successfully applied Minor Slow to ${target.name}! 🌪️`;
        console.log("Adding success message to action log:", successMessage);
        setActionLog(prev => [`Turn ${turnCountRef.current}: ${successMessage}`, ...prev]);
        
        // Debug log for Gust effect
        console.log("💨 Applying Minor Slow from Gust:", attacker.name, "->", target.name);
        
        // Apply Minor Slow (20% Speed reduction) for 1 turn
        const effect: StatusEffect = {
          name: "Minor Slow",
          effect: "ReduceSpd",
          value: 20,
          duration: 1,
          source: attacker.id
        };

        // Apply the status effect to the target
        if (!target.statusEffects) target.statusEffects = [];
        // Check if target already has this effect
        const existingEffectIndex = target.statusEffects.findIndex(e => e.effect === effect.effect);
        if (existingEffectIndex >= 0) {
          // Extend existing effect duration
          target.statusEffects[existingEffectIndex].duration = Math.max(
            target.statusEffects[existingEffectIndex].duration,
            effect.duration
          );
          console.log(`Extended Minor Slow duration on ${target.name} to ${target.statusEffects[existingEffectIndex].duration} turns`);
        } else {
          // Add new effect
          target.statusEffects.push(effect);
          console.log(`Added Minor Slow effect to ${target.name} with ${effect.duration} turn duration`);
        }

        statusEffectText = " [Minor Slow applied]";
      }
    } 
    else if (skill.name === "Breeze") { // 10% chance to reduce Turn Meter
      // Track this effect attempt
      setDetailedActionLog(prev => [`Turn ${turnCountRef.current}: EFFECT ATTEMPT - ${attacker.name} attempted turn meter reduction on ${target.name}`, ...prev]);
      
      // Roll for effect application
      const effectRoll = Math.random() * 100; // Roll 0-100 for clearer percentage display
      const effectSuccess = effectRoll < 10; // 10% chance
      
      // Create a plain text result message with emoji
      const resultText = effectSuccess ? "SUCCESS!" : "FAILED";
      const icon = effectSuccess ? '🌪️' : '';
      const rollResultMessage = `${attacker.name}'s Breeze roll: ${effectRoll.toFixed(1)}% - ${resultText} ${icon}`;
      
      // Add roll result to action log for player visibility
      setActionLog(prev => [`Turn ${turnCountRef.current}: ${rollResultMessage}`, ...prev]);
      
      // Add detailed log about the roll for Debug tab
      setDetailedActionLog(prev => [
        `Turn ${turnCountRef.current}: EFFECT ROLL - ${attacker.name}'s Breeze - Rolled: ${effectRoll.toFixed(1)}% vs 10.0% threshold - ${effectSuccess ? 'SUCCESS' : 'FAILED'}`,
        ...prev
      ]);
      
      if (effectSuccess) {
        // Apply Turn Meter reduction (10%)
        setUnits(prevUnits => {
          return prevUnits.map(u => {
            if (u.id === target.id) {
              return {
                ...u,
                attackMeter: Math.max(0, u.attackMeter - 10) // Reduce by 10%
              };
            }
            return u;
          });
        });
        
        // Log the successful application
        setDetailedActionLog(prev => [`Turn ${turnCountRef.current}: STATUS - ${attacker.name} reduced ${target.name}'s turn meter by 10%`, ...prev]);
        statusEffectText = ` [Turn Meter reduced by 10% - ${(effectRoll * 100).toFixed(1)}% roll]`;
      }
    } else if (skill.name === "Stone Slam" || skill.name === "Boss Strike") { // 20% chance to apply Weakness
      // Log the effect attempt to debug console to make sure the game system recognizes the effect attempt
      console.log(`${attacker.name} attempting to apply WEAKEN with ${skill.name} on ${target.name} - Turn ${turnCountRef.current}`);
      
      // Always update attempts counter
      setUnits(prevUnits => {
        return prevUnits.map(u => {
          if (u.id === attacker.id) {
            // Make sure we properly initialize and increment the counter
            const currentAttempts = typeof u.weakenAttempts === 'number' ? u.weakenAttempts : 0;
            return {
              ...u,
              weakenAttempts: currentAttempts + 1
            };
          }
          return u;
        });
      });
      
      // Add to detailed action log about attempt AND to main action log for visibility
      setDetailedActionLog(prev => [`Turn ${turnCountRef.current}: EFFECT ATTEMPT - ${attacker.name} attempted WEAKEN on ${target.name}`, ...prev]);
      setActionLog(prev => [`Turn ${turnCountRef.current}: ${attacker.name} attempted to WEAKEN ${target.name}!`, ...prev]);

      // Roll once for effect application - 20% chance 
      const effectRoll = Math.random() * 100; // Roll 0-100 for clearer percentage display
      const effectSuccess = effectRoll < 20; // 20% chance
      
      // Record the last roll for UI display in the summary tab
      setUnits(prevUnits => {
        return prevUnits.map(u => {
          if (u.id === attacker.id) {
            return {
              ...u,
              lastWeakenRoll: effectRoll
            };
          }
          return u;
        });
      });
      
      // Create a plain text result message with emoji
      const resultText = effectSuccess ? "SUCCESS!" : "FAILED";
      const icon = effectSuccess ? '🪨' : '';
      const rollResultMessage = `${attacker.name}'s ${skill.name} roll: ${effectRoll.toFixed(1)}% - ${resultText} ${icon}`;
      
      // Add roll result to action log
      setActionLog(prev => [`Turn ${turnCountRef.current}: ${rollResultMessage}`, ...prev]);
      
      // Add detailed log about the roll for Debug tab
      setDetailedActionLog(prev => [
        `Turn ${turnCountRef.current}: EFFECT ROLL - ${attacker.name}'s ${skill.name} - Rolled: ${effectRoll.toFixed(1)}% vs 20.0% threshold - ${effectSuccess ? 'SUCCESS' : 'FAILED'}`,
        ...prev
      ]);
      
      if (effectSuccess) { // 20% chance to apply Weakness
        // Update success counter only if effect lands
        setUnits(prevUnits => {
          return prevUnits.map(u => {
            if (u.id === attacker.id) {
              // Make sure we properly initialize and increment the counter
              const currentSuccesses = typeof u.weakenSuccess === 'number' ? u.weakenSuccess : 0;
              return {
                ...u,
                weakenSuccess: currentSuccesses + 1
              };
            }
            return u;
          });
        });
        
        // Add to both logs when effect is applied
        setDetailedActionLog(prev => [`Turn ${turnCountRef.current}: STATUS - ${attacker.name} applied WEAKEN to ${target.name}`, ...prev]);
        setActionLog(prev => [`Turn ${turnCountRef.current}: ${attacker.name} successfully applied WEAKEN to ${target.name}!`, ...prev]);
        
        // Apply Weakness (10% Attack reduction) for 2 turns
        const effect: StatusEffect = {
          name: "Weakened",
          effect: "ReduceAtk",
          value: 10,
          duration: 2,
          source: attacker.id
        };

        // Apply the status effect to the target
        if (!target.statusEffects) target.statusEffects = [];

        // Check if target already has this effect, if so, extend duration rather than adding new
        const existingEffectIndex = target.statusEffects.findIndex(e => e.effect === effect.effect);
        if (existingEffectIndex >= 0) {
          // Extend existing effect duration
          target.statusEffects[existingEffectIndex].duration = Math.max(
            target.statusEffects[existingEffectIndex].duration,
            effect.duration
          );
          console.log(`Extended ${effect.name} duration to ${target.statusEffects[existingEffectIndex].duration} turns`);
        } else {
          // Add new effect
          target.statusEffects.push(effect);
          console.log(`Added new effect ${effect.name} with ${effect.duration} turns duration`);
        }

        statusEffectText = " [Weakened applied]";
      }
    }

    // Regular effect chances based on skill type
    else if (skillType !== 'basic') { // 30% chance to apply status effect for advanced/ultimate skills
      // First track the attempt in the debug logs
      setDetailedActionLog(prev => [`Turn ${turnCountRef.current}: EFFECT ATTEMPT - ${attacker.name} attempted status effect with ${skill.name}`, ...prev]);
      
      // Roll for the effect application
      const effectRoll = Math.random() * 100; // Roll 0-100 for clearer percentage display
      const effectSuccess = effectRoll < 30; // 30% chance
      
      // Create a plain text result message with emoji
      const resultText = effectSuccess ? "SUCCESS!" : "FAILED";
      let icon = '';
      if (effectSuccess) {
        if (skill.name.toLowerCase().includes("fire") || skill.name.toLowerCase().includes("flame") || skill.name.toLowerCase().includes("ember")) {
          icon = '🔥';
        } else if (skill.name.toLowerCase().includes("water") || skill.name.toLowerCase().includes("wave")) {
          icon = '💧';
        } else if (skill.name.toLowerCase().includes("stone") || skill.name.toLowerCase().includes("rock")) {
          icon = '🪨';
        } else if (skill.name.toLowerCase().includes("wind") || skill.name.toLowerCase().includes("gust")) {
          icon = '🌪️';
        }
      }
      const rollResultMessage = `${attacker.name}'s ${skill.name} roll: ${effectRoll.toFixed(1)}% - ${resultText} ${icon}`;
      
      // Add roll result to action log for player visibility
      setActionLog(prev => [`Turn ${turnCountRef.current}: ${rollResultMessage}`, ...prev]);
      
      // Add detailed log about the roll for Debug tab
      setDetailedActionLog(prev => [
        `Turn ${turnCountRef.current}: EFFECT ROLL - ${attacker.name}'s ${skill.name} - Rolled: ${effectRoll.toFixed(1)}% vs 30.0% threshold - ${effectSuccess ? 'SUCCESS' : 'FAILED'}`,
        ...prev
      ]);
      
      if (effectSuccess) {
        // Determine the type of status effect based on skill name/type
        let effectType = "general";
        if (skill.name.toLowerCase().includes("burn") || skill.name.toLowerCase().includes("fire") || 
            skill.name.toLowerCase().includes("flame") || skill.name.toLowerCase().includes("inferno")) {
          effectType = "burn";
        } else if (skill.name.toLowerCase().includes("poison") || skill.name.toLowerCase().includes("venom") || 
                  skill.name.toLowerCase().includes("toxic")) {
          effectType = "poison";
        }

        let effect: StatusEffect;
        if (effectType === "burn") {
          // Burn effect: 5% of max HP damage per turn
          const burnDamage = Math.floor(target.maxHp * 0.05);
          // Get burn duration based on skill
          let burnDuration = 3; // Default duration
          if (skill.name === "Ember") {
            burnDuration = 1; // Ember applies burn for 1 turn only
          } else if (skill.name === "Flame Whip") {
            burnDuration = 2; // Flame Whip applies burn for 2 turns
          }
          effect = {
            name: "Burning",
            effect: "Burn",
            value: burnDamage,
            duration: burnDuration,
            source: attacker.id
          };
          statusEffectText = ` [Burning applied - ${burnDamage} damage per turn]`;
        } else if (effectType === "poison") {
          // Poison effect: 5% of max HP damage per turn
          const poisonDamage = Math.floor(target.maxHp * 0.05);
          effect = {
            name: "Poisoned",
            effect: "Poison",
            value: poisonDamage,
            duration: 3,
            source: attacker.id
          };
          statusEffectText = ` [Poisoned applied - ${poisonDamage} damage per turn]`;
        } else {
          // General status effects
          const possibleEffects = [
            {name: "Weakened", effect: "ReduceAtk", value: 10, duration: 2, source: attacker.id},
            {name: "Slowed", effect: "ReduceSpd", value: 15, duration: 2, source: attacker.id}
          ];
          effect = possibleEffects[Math.floor(Math.random() * possibleEffects.length)];
          statusEffectText = ` [${effect.name} applied]`;
        }

        // Apply the status effect to the target (will be added when the unit's state is updated)
        if (!target.statusEffects) target.statusEffects = [];

        // Debug status effects
        console.log(`Status effects before update for ${target.name}:`, 
          target.statusEffects.map(e => `${e.name}: ${e.duration} turns`).join(", "));

        // Check if target already has this effect, if so, extend duration rather than adding new
        const existingEffectIndex = target.statusEffects.findIndex(e => e.effect === effect.effect);
        if (existingEffectIndex >= 0) {
          // Extend existing effect duration
          target.statusEffects[existingEffectIndex].duration = Math.max(
            target.statusEffects[existingEffectIndex].duration,
            effect.duration
          );
          console.log(`Extended ${effect.name} duration to ${target.statusEffects[existingEffectIndex].duration} turns`);
        } else {
          // Add new effect
          target.statusEffects.push(effect);
          console.log(`Added new effect ${effect.name} with ${effect.duration} turns duration`);
        }

        // Debug updated status effects
        console.log(`Status effects after update for ${target.name}:`, 
          target.statusEffects.map(e => `${e.name}: ${e.duration} turns`).join(", "));
      }
    }

    // Add healing effect text for Soothing Current
    let healingEffectText = "";
    if (skill.name === "Soothing Current") {
      // Calculate healing amount based on 5% of attacker's max HP
      const healAmount = Math.floor(attacker.maxHp * 0.05);
      healingEffectText = ` (includes healing for ${healAmount} HP)`;
    }

    // Create a combined message with damage and status effect, but only when no separate status message was added
    const actionMessage = `Turn ${turnCountRef.current}: ${attacker.name} used ${skill.name} on ${target.name} for ${damage} damage!${statusEffectText}${healingEffectText}`;
    
    // Add to action log, making sure it appears in the right order
    setActionLog(prev => [actionMessage, ...prev]);
    console.log("Added action message to log:", actionMessage);
    // Also add to detailed log for admin view
    setDetailedActionLog(prev => [`Turn ${turnCountRef.current}: Action - ${attacker.name} used ${skill.name}`, ...prev]);

    // First apply damage to the target
    setUnits(prevUnits => {
      const updatedUnits = prevUnits.map(u => {
        if (u.id === target.id) {
          const newHp = Math.max(0, u.hp - damage);

          // Check if target is defeated
          if (newHp <= 0 && u.hp > 0) {
            setActionLog(prev => [`${target.name} has been defeated!`, ...prev]);
          }

          // Preserve status effects that were just added to the target
          return {
            ...u,
            hp: newHp,
            totalDamageReceived: u.totalDamageReceived + damage,
            statusEffects: target.statusEffects // Use the updated status effects
          };
        }
        if (u.id === attacker.id) {
          return {
            ...u,
            lastSkillUse: attackCount,
            totalDamageDealt: u.totalDamageDealt + damage
          };
        }
        return u;
      });

      // If the skill is Soothing Current, apply healing to the lowest HP ally
      if (skill.name === "Soothing Current") {
        // Get all living allies
        const battleEntry = battleLog.find(log => log.allies && Array.isArray(log.allies));
        const allies = updatedUnits.filter(u => 
          battleEntry?.allies?.some((a: any) => a.id === u.id) && u.hp > 0
        );

        if (allies.length > 0) {
          // Debug allies HP percentages
          allies.forEach(ally => {
            console.log(`Ally ${ally.name}: ${ally.hp}/${ally.maxHp} = ${(ally.hp / ally.maxHp * 100).toFixed(1)}%`);
          });

          // Sort allies by HP percentage (lowest first)
          const sortedAllies = [...allies].sort((a, b) => 
            (a.hp / a.maxHp) - (b.hp / b.maxHp)
          );

          // Debug sorted order
          console.log("Sorted allies by HP percentage:");
          sortedAllies.forEach(ally => {
            console.log(`Sorted Ally ${ally.name}: ${ally.hp}/${ally.maxHp} = ${(ally.hp / ally.maxHp * 100).toFixed(1)}%`);
          });

          // Always pick the ally with the lowest HP percentage, 
          // only consider the attacker's ID if we actually need to find a different target
          let healTarget = sortedAllies[0];

          // Debug the selected heal target
          console.log(`Selected heal target: ${healTarget.name} with ${healTarget.hp}/${healTarget.maxHp} = ${(healTarget.hp / healTarget.maxHp * 100).toFixed(1)}%`);

          // Calculate healing amount (5% of attacker's max HP)
          const healAmount = Math.floor(attacker.maxHp * 0.05);

          // Add a single healing message
          const healMessage = `${attacker.name} healed ${healTarget.name} for ${healAmount} HP with Soothing Current!`;
          setActionLog(prev => [healMessage, ...prev]);

          // Apply healing
          return updatedUnits.map(u => {
            if (u.id === healTarget.id) {
              const newHp = Math.min(u.maxHp, u.hp + healAmount);
              return {
                ...u,
                hp: newHp,
                totalHealingReceived: u.totalHealingReceived + healAmount
              };
            }
            if (u.id === attacker.id) {
              return {
                ...u,
                totalHealingDone: u.totalHealingDone + healAmount
              };
            }
            return u;
          });
        }
      }

      return updatedUnits;
    });

    checkBattleEnd();
  };

  // Helper function to render a skill with tooltip
  const renderSkill = (skillName: string, damage: number, cooldown?: number) => {
    // Determine skill color/style based on type
    let skillStyle = "bg-blue-600/40";
    let skillIcon = "⚔️";

    if (skillName.toLowerCase().includes("flame") || skillName.toLowerCase().includes("fire") || 
        skillName.toLowerCase().includes("inferno") || skillName.toLowerCase().includes("ember")) {
      skillStyle = "bg-red-600/40";
      skillIcon = "🔥";
    } else if (skillName.toLowerCase().includes("frost") || skillName.toLowerCase().includes("ice") || 
              skillName.toLowerCase().includes("freeze")) {
      skillStyle = "bg-blue-600/40";
      skillIcon = "❄️";
    } else if (skillName.toLowerCase().includes("shock") || skillName.toLowerCase().includes("lightning") || 
              skillName.toLowerCase().includes("thunder")) {
      skillStyle = "bg-yellow-600/40";
      skillIcon = "⚡";
    } else if (skillName.toLowerCase().includes("earth") || skillName.toLowerCase().includes("rock") || 
              skillName.toLowerCase().includes("stone")) {
      skillStyle = "bg-amber-800/40";
      skillIcon = "🪨";
    } else if (skillName.toLowerCase().includes("water") || skillName.toLowerCase().includes("wave") || 
              skillName.toLowerCase().includes("current")) {
      skillStyle = "bg-sky-600/40";
      skillIcon = "💧";
    } else if (skillName.toLowerCase().includes("wind") || skillName.toLowerCase().includes("gust") || 
              skillName.toLowerCase().includes("storm")) {
      skillStyle = "bg-teal-600/40";
      skillIcon = "🌪️";
    }

    // Format the tooltip details with special effects
    const damagePercent = Math.round(damage * 100);
    let description = '';

    // Special skill descriptions with complete logic for all skills
    if (skillName === "Soothing Current") {
      description = `Deals ${damagePercent}% of ATK damage and heals the ally with lowest HP for 5% of caster's max HP.`;
      if (cooldown) description += ` Cooldown: ${cooldown} turns.`;
    } else if (skillName === "Ember") {
      description = `Deals ${damagePercent}% of ATK damage with 10% chance to apply Burning (DoT) for 1 turn.`;
      if (cooldown) description += ` Cooldown: ${cooldown} turns.`;
    } else if (skillName === "Flame Whip") {
      description = `Deals ${damagePercent}% of ATK damage with 30% chance to apply Burning (DoT) for 2 turns.`;
      if (cooldown) description += ` Cooldown: ${cooldown} turns.`;
    } else if (skillName === "Inferno") {
      description = `Deals ${damagePercent}% of ATK damage with 30% chance to apply Burning (DoT) for 3 turns.`;
      if (cooldown) description += ` Cooldown: ${cooldown} turns.`;
    } else if (skillName === "Venom Strike") {
      description = `Deals ${damagePercent}% of ATK damage with 30% chance to apply Poison (DoT) for 3 turns.`;
      if (cooldown) description += ` Cooldown: ${cooldown} turns.`;
    } else if (skillName === "Boss Strike") {
      description = `Deals ${damagePercent}% of ATK damage with 30% chance to apply Weakened (-10% ATK) for 2 turns.`;
      if (cooldown) description += ` Cooldown: ${cooldown} turns.`;
    } else if (skillName === "Cleansing Tide") {
      description = `Deals ${damagePercent}% of ATK damage with 10% chance to remove a random debuff from a random ally.`;
      if (cooldown) description += ` Cooldown: ${cooldown} turns.`;
    } else if (skillName === "Gust") {
      description = `Deals ${damagePercent}% of ATK damage with 50% chance to apply Minor Slow (-20% SPD) for 1 turn.`;
      if (cooldown) description += ` Cooldown: ${cooldown} turns.`;
    } else if (skillName === "Breeze") {
      description = `Deals ${damagePercent}% of ATK damage with 10% chance to reduce target's Attack Meter by 10%.`;
      if (cooldown) description += ` Cooldown: ${cooldown} turns.`;
    } else if (skillName === "Stone Slam") {
      description = `Deals ${damagePercent}% of ATK damage with 20% chance to apply Weakened (-10% ATK) for 2 turns.`;
      if (cooldown) description += ` Cooldown: ${cooldown} turns.`;
    } else if (skillName === "Wildfire") {
      description = `Deals ${damagePercent}% of ATK damage to 2 targets, with 25% chance to hit a 3rd target.`;
      if (cooldown) description += ` Cooldown: ${cooldown} turns.`;
    } else if (skillName === "Dust Spikes") {
      description = `Deals ${damagePercent}% of ATK damage to 2 random targets.`;
      if (cooldown) description += ` Cooldown: ${cooldown} turns.`;
    } else {
      // Default description for other skills
      description = cooldown 
        ? `Deals ${damagePercent}% of ATK damage. Cooldown: ${cooldown} turns.`
        : `Deals ${damagePercent}% of ATK damage.`;
    }

    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <div 
              className={`text-xs px-1.5 py-0.5 rounded text-white ${skillStyle} flex items-center cursor-help gap-0.5 leading-none`}
            >
              <span>{skillIcon}</span>
              <span>{skillName}</span>
              {cooldown && <span className="opacity-80 ml-1">({cooldown}t)</span>}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="center"
            className="bg-gray-900/95 border-purple-900 text-white p-1.5 max-w-[180px] rounded-lg shadow-xl z-50"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <Info className="text-yellow-400 flex-shrink-0" size={14} />
                <h4 className="font-semibold text-yellow-400 text-xs">{skillName}</h4>
              </div>
              <p className="text-xs leading-tight">{description}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const renderUnitStats = (unit: BattleUnit) => {
    // Check if unit has aura bonuses
    const hasAuraBonuses = unit.auraBonus && (
      (unit.auraBonus.attack !== undefined && unit.auraBonus.attack !== 0) || 
      (unit.auraBonus.vitality !== undefined && unit.auraBonus.vitality !== 0) || 
      (unit.auraBonus.speed !== undefined && unit.auraBonus.speed !== 0)
    );

    // Get aura bonus values safely
    const attackBonus = unit.auraBonus?.attack ?? 0;
    const vitalityBonus = unit.auraBonus?.vitality ?? 0;
    const speedBonus = unit.auraBonus?.speed ?? 0;

    return (
      <div className="mt-2 text-xs">
        {/* Stats section */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center">
            <Swords className="h-3 w-3 mr-1 text-red-400" />
            <span>
              ATK: {unit.stats.attack}
              {hasAuraBonuses && attackBonus !== 0 && (
                <span className={attackBonus > 0 ? "text-green-400 ml-1" : "text-red-400 ml-1"}>
                  {attackBonus > 0 ? "+" : ""}{attackBonus}%
                </span>
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
              SPD: {unit.stats.speed}
              {hasAuraBonuses && speedBonus !== 0 && (
                <span className={speedBonus > 0 ? "text-green-400 ml-1" : "text-red-400 ml-1"}>
                  {speedBonus > 0 ? "+" : ""}{speedBonus}%
                </span>
              )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // Helper function to extract turn number from log message
  const extractTurnNumber = (logMessage: string): number => {
    const match = logMessage.match(/Turn (\d+):/);
    return match ? parseInt(match[1]) : 0;
  };

  // Sort action log by turn number (descending)
  const sortedActionLog = [...actionLog].sort((a, b) => {
    return extractTurnNumber(b) - extractTurnNumber(a);
  });
  
  // Sort detailed action log by turn number (descending)
  const sortedDetailedLog = [...detailedActionLog].sort((a, b) => {
    return extractTurnNumber(b) - extractTurnNumber(a);
  });

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
            <TabsTrigger value="admin">Admin Log</TabsTrigger>
            <TabsTrigger value="debug-logs">Debug Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-4">
            <div className="flex justify-between items-center">
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
                  onClick={() => handleSpeedChange(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : playbackSpeed === 4 ? 8 : 1)}
                  className="w-24"
                >
                  {playbackSpeed}x Speed
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Allies</h3>
                {units.filter(u => battleLog[0]?.allies?.some((a: any) => a.id === u.id)).map(unit => (
                  <div key={unit.id} className="bg-[#432874]/20 p-2 rounded">
                    <div className="flex items-center gap-2">
                      {/* Character avatar space - default placeholder until proper avatars are added */}
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
                      {/* Avatar placeholder */}
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
                      {/* Skills Section - Now in its own dedicated container */}
                      <div className="bg-[#432874]/10 rounded-md p-2 border border-[#432874]/20">
                        <div className="text-xs font-semibold text-[#FF9D00] mb-1">Combat Skills</div>
                        <div className="flex flex-wrap gap-1">
                          {unit.skills.basic && renderSkill(unit.skills.basic.name, unit.skills.basic.damage)}
                          {unit.skills.advanced && renderSkill(unit.skills.advanced.name, unit.skills.advanced.damage, unit.skills.advanced.cooldown)}
                          {unit.skills.ultimate && renderSkill(unit.skills.ultimate.name, unit.skills.ultimate.damage, unit.skills.ultimate.cooldown)}
                        </div>
                      </div>

                      {/* Status Effects Section - in its own container, always showing for consistency */}
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
                      {/* Enemy avatar space - default placeholder until proper avatars are added */}
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
                      {/* Avatar placeholder */}
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
                      {/* Skills Section - Now in its own dedicated container */}
                      <div className="bg-[#432874]/10 rounded-md p-2 border border-[#432874]/20">
                        <div className="text-xs font-semibold text-[#FF9D00] mb-1">Combat Skills</div>
                        <div className="flex flex-wrap gap-1">
                          {unit.skills.basic && renderSkill(unit.skills.basic.name, unit.skills.basic.damage)}
                          {unit.skills.advanced && renderSkill(unit.skills.advanced.name, unit.skills.advanced.damage, unit.skills.advanced.cooldown)}
                          {unit.skills.ultimate && renderSkill(unit.skills.ultimate.name, unit.skills.ultimate.damage, unit.skills.ultimate.cooldown)}
                        </div>
                      </div>

                      {/* Status Effects Section - in its own container, always showing for consistency */}
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
              {/* Battle Overview Section */}
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
              
              {/* Status Effect Statistics - Enhanced to show both successes and attempts clearly */}
              <div className="bg-[#432874]/20 p-4 rounded-lg">
                <h3 className="font-semibold text-[#FF9D00] mb-3">Status Effect Statistics</h3>
                
                {/* Message for first time users */}
                <div className="bg-[#1A1A2E]/60 p-2 rounded-md mb-3 text-sm">
                  <div className="flex items-center text-[#00B9AE]">
                    <Info className="h-4 w-4 mr-2" />
                    <span>Status effect attempts and successes are tracked here</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-5 gap-2">
                    <div className="font-semibold text-center text-xs md:text-sm">Effect</div>
                    <div className="font-semibold text-center text-xs md:text-sm">Success Rate</div>
                    <div className="font-semibold text-center text-xs md:text-sm">Applied</div>
                    <div className="font-semibold text-center text-xs md:text-sm">Attempts</div>
                    <div className="font-semibold text-center text-xs md:text-sm">Last Roll</div>
                  </div>
                  
                  {/* Burn */}
                  <div className="grid grid-cols-5 gap-2 items-center py-1 border-b border-[#432874]/30">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-red-500 mr-2"></div>
                      <span>Burn</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-full bg-[#432874]/30 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, Math.round(units.reduce((sum, unit) => sum + (unit.burnSuccess || 0), 0) / 
                            Math.max(units.reduce((sum, unit) => sum + (unit.burnAttempts || 0), 0), 1) * 100))}%` 
                          }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs">
                        {Math.round(units.reduce((sum, unit) => sum + (unit.burnSuccess || 0), 0) / 
                        Math.max(units.reduce((sum, unit) => sum + (unit.burnAttempts || 0), 0), 1) * 100)}%
                      </span>
                    </div>
                    <div className="text-center text-green-400 font-medium">
                      {units.reduce((sum, unit) => sum + (unit.burnSuccess || 0), 0)}
                    </div>
                    <div className="text-center text-[#C8B8DB]/70">
                      {units.reduce((sum, unit) => sum + (unit.burnAttempts || 0), 0)}
                    </div>
                    <div className="text-center text-yellow-300">
                      {units.reduce((sum, unit) => sum + (unit.lastBurnRoll || 0), 0) > 0 
                        ? `${(units.reduce((sum, unit) => sum + (unit.lastBurnRoll || 0), 0) * 100).toFixed(1)}%`
                        : '—'
                      }
                    </div>
                  </div>
                  
                  {/* Poison */}
                  <div className="grid grid-cols-5 gap-2 items-center py-1 border-b border-[#432874]/30">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-green-500 mr-2"></div>
                      <span>Poison</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-full bg-[#432874]/30 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-emerald-700 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, Math.round(units.reduce((sum, unit) => sum + (unit.poisonSuccess || 0), 0) / 
                            Math.max(units.reduce((sum, unit) => sum + (unit.poisonAttempts || 0), 0), 1) * 100))}%` 
                          }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs">
                        {Math.round(units.reduce((sum, unit) => sum + (unit.poisonSuccess || 0), 0) / 
                        Math.max(units.reduce((sum, unit) => sum + (unit.poisonAttempts || 0), 0), 1) * 100)}%
                      </span>
                    </div>
                    <div className="text-center text-green-400 font-medium">
                      {units.reduce((sum, unit) => sum + (unit.poisonSuccess || 0), 0)}
                    </div>
                    <div className="text-center text-[#C8B8DB]/70">
                      {units.reduce((sum, unit) => sum + (unit.poisonAttempts || 0), 0)}
                    </div>
                    <div className="text-center text-yellow-300">
                      {units.reduce((sum, unit) => sum + (unit.lastPoisonRoll || 0), 0) > 0 
                        ? `${(units.reduce((sum, unit) => sum + (unit.lastPoisonRoll || 0), 0) * 100).toFixed(1)}%`
                        : '—'
                      }
                    </div>
                  </div>
                  
                  {/* Slow */}
                  <div className="grid grid-cols-5 gap-2 items-center py-1 border-b border-[#432874]/30">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-blue-500 mr-2"></div>
                      <span>Slow</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-full bg-[#432874]/30 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-400 to-indigo-600 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, Math.round(units.reduce((sum, unit) => sum + (unit.slowSuccess || 0), 0) / 
                            Math.max(units.reduce((sum, unit) => sum + (unit.slowAttempts || 0), 0), 1) * 100))}%` 
                          }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs">
                        {Math.round(units.reduce((sum, unit) => sum + (unit.slowSuccess || 0), 0) / 
                        Math.max(units.reduce((sum, unit) => sum + (unit.slowAttempts || 0), 0), 1) * 100)}%
                      </span>
                    </div>
                    <div className="text-center text-green-400 font-medium">
                      {units.reduce((sum, unit) => sum + (unit.slowSuccess || 0), 0)}
                    </div>
                    <div className="text-center text-[#C8B8DB]/70">
                      {units.reduce((sum, unit) => sum + (unit.slowAttempts || 0), 0)}
                    </div>
                    <div className="text-center text-yellow-300">
                      {units.reduce((sum, unit) => sum + (unit.lastSlowRoll || 0), 0) > 0 
                        ? `${(units.reduce((sum, unit) => sum + (unit.lastSlowRoll || 0), 0) * 100).toFixed(1)}%`
                        : '—'
                      }
                    </div>
                  </div>
                  
                  {/* Weaken */}
                  <div className="grid grid-cols-5 gap-2 items-center py-1">
                    <div className="flex items-center">
                      <div className="h-3 w-3 rounded-full bg-purple-500 mr-2"></div>
                      <span>Weaken</span>
                    </div>
                    <div className="flex items-center justify-center">
                      <div className="w-full bg-[#432874]/30 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-purple-400 to-purple-700 h-2 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, Math.round(units.reduce((sum, unit) => sum + (unit.weakenSuccess || 0), 0) / 
                            Math.max(units.reduce((sum, unit) => sum + (unit.weakenAttempts || 0), 0), 1) * 100))}%` 
                          }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs">
                        {Math.round(units.reduce((sum, unit) => sum + (unit.weakenSuccess || 0), 0) / 
                        Math.max(units.reduce((sum, unit) => sum + (unit.weakenAttempts || 0), 0), 1) * 100)}%
                      </span>
                    </div>
                    <div className="text-center text-green-400 font-medium">
                      {units.reduce((sum, unit) => sum + (unit.weakenSuccess || 0), 0)}
                    </div>
                    <div className="text-center text-[#C8B8DB]/70">
                      {units.reduce((sum, unit) => sum + (unit.weakenAttempts || 0), 0)}
                    </div>
                    <div className="text-center text-yellow-300">
                      {units.reduce((sum, unit) => sum + (unit.lastWeakenRoll || 0), 0) > 0 
                        ? `${(units.reduce((sum, unit) => sum + (unit.lastWeakenRoll || 0), 0) * 100).toFixed(1)}%`
                        : '—'
                      }
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Individual Unit Stats */}
              <h3 className="font-semibold text-[#FF9D00] mt-4">Unit Performance</h3>
              {units.map(unit => (
                <div key={unit.id} className="bg-[#432874]/20 p-3 rounded">
                  <h4 className={`font-medium mb-2 ${battleLog[0]?.allies?.some((a: any) => a.id === unit.id) ? 'text-[#00B9AE]' : 'text-[#E83B69]'}`}>
                    {unit.name}
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Damage Dealt: <span className="font-medium">{unit.totalDamageDealt.toLocaleString()}</span></div>
                    <div>Damage Received: <span className="font-medium">{unit.totalDamageReceived.toLocaleString()}</span></div>
                    <div>Healing Done: <span className="font-medium">{unit.totalHealingDone.toLocaleString()}</span></div>
                    <div>Healing Received: <span className="font-medium">{unit.totalHealingReceived.toLocaleString()}</span></div>
                  </div>
                  
                  <div className="mt-3 border-t border-[#432874]/40 pt-2">
                    <h5 className="text-sm font-medium text-yellow-400 mb-1">Status Effect Statistics</h5>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {(unit.burnAttempts || 0) > 0 && (
                        <div>
                          <span className="text-red-400">Burn:</span> <span className="text-green-400">{unit.burnSuccess || 0}</span>/{unit.burnAttempts || 0}
                          <span className="text-[#C8B8DB]/60 ml-1">
                            ({Math.round(((unit.burnSuccess || 0) / (unit.burnAttempts || 1)) * 100)}%)
                          </span>
                        </div>
                      )}
                      {(unit.poisonAttempts || 0) > 0 && (
                        <div>
                          <span className="text-green-400">Poison:</span> <span className="text-green-400">{unit.poisonSuccess || 0}</span>/{unit.poisonAttempts || 0}
                          <span className="text-[#C8B8DB]/60 ml-1">
                            ({Math.round(((unit.poisonSuccess || 0) / (unit.poisonAttempts || 1)) * 100)}%)
                          </span>
                        </div>
                      )}
                      {(unit.slowAttempts || 0) > 0 && (
                        <div>
                          <span className="text-blue-400">Slow:</span> <span className="text-green-400">{unit.slowSuccess || 0}</span>/{unit.slowAttempts || 0}
                          <span className="text-[#C8B8DB]/60 ml-1">
                            ({Math.round(((unit.slowSuccess || 0) / (unit.slowAttempts || 1)) * 100)}%)
                          </span>
                        </div>
                      )}
                      {(unit.weakenAttempts || 0) > 0 && (
                        <div>
                          <span className="text-purple-400">Weaken:</span> <span className="text-green-400">{unit.weakenSuccess || 0}</span>/{unit.weakenAttempts || 0}
                          <span className="text-[#C8B8DB]/60 ml-1">
                            ({Math.round(((unit.weakenSuccess || 0) / (unit.weakenAttempts || 1)) * 100)}%)
                          </span>
                        </div>
                      )}
                      {!unit.burnAttempts && !unit.poisonAttempts && !unit.slowAttempts && !unit.weakenAttempts && (
                        <div className="text-xs italic text-[#C8B8DB]/40 col-span-2">No status effects attempted</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="log">
            <div className="h-[400px] overflow-y-auto space-y-1">
              {sortedActionLog.map((log, index) => {
                // Improved ally detection - check for ANY ally character in The Forge
                const allyNames = ["G-Wolf", "Kleos", "Brawler Frank", "Gideon", "Albus Dumbleboom", "Grimmjaw"];
                const isAllyAction = allyNames.some(name => log.includes(`${name} used`));
                const isEnemyAction = (log.includes("Boss") || log.includes("Minion")) && log.includes(" used ");

                // Format damage numbers in red and bold
                let formattedLog = log;
                if (log.includes("damage")) {
                  // Extract the damage number
                  const damageMatch = log.match(/for (\d+) damage/);
                  if (damageMatch && damageMatch[1]) {
                    const damageAmount = damageMatch[1];
                    formattedLog = log.replace(
                      `for ${damageAmount} damage`,
                      `for <span class="text-red-500 font-bold">${damageAmount}</span> damage`
                    );
                  }
                }

                // Format healing numbers in green and bold
                if (log.includes("healed")) {
                  const healMatch = log.match(/for (\d+) HP/);
                  if (healMatch && healMatch[1]) {
                    const healAmount = healMatch[1];
                    formattedLog = log.replace(
                      `for ${healAmount} HP`,
                      `for <span class="text-green-500 font-bold">${healAmount}</span> HP`
                    );
                  }
                }

                // Format all healing in messages - supports multiple formats:
                // "with healing for X HP"
                // "includes healing for X HP"
                // "healing X for Y HP"
                if (formattedLog.includes("healing")) {
                  // First pattern: "healing CHARACTER for X HP"
                  const healTargetMatch = formattedLog.match(/healing ([\w\s-]+) for (\d+) HP/);
                  if (healTargetMatch && healTargetMatch[1] && healTargetMatch[2]) {
                    const healTarget = healTargetMatch[1];
                    const healAmount = healTargetMatch[2];
                    formattedLog = formattedLog.replace(
                      `healing ${healTarget} for ${healAmount} HP`,
                      `healing <span class="text-indigo-300 font-semibold">${healTarget}</span> for <span class="text-green-500 font-bold">${healAmount}</span> HP`
                    );
                  } 
                  // Second pattern: just "healing for X HP" (without character name)
                  else {
                    const healMatch = formattedLog.match(/healing for (\d+) HP/);
                    if (healMatch && healMatch[1]) {
                      const healAmount = healMatch[1];
                      formattedLog = formattedLog.replace(
                        `healing for ${healAmount} HP`,
                        `healing for <span class="text-green-500 font-bold">${healAmount}</span> HP`
                      );
                    }
                  }
                }

                // Highlight status effects in yellow and underline them
                const statusEffects = ["Burning", "Poisoned", "Weakened", "Slowed"];
                statusEffects.forEach(effect => {
                  if (formattedLog.includes(effect)) {
                    formattedLog = formattedLog.replace(
                      new RegExp(`${effect}`, 'g'),
                      `<span class="text-yellow-300 underline">${effect}</span>`
                    );
                  }
                });

                // Simple tooltip for status effect logs
                const hasStatusEffect = 
                  log.includes('Gust') || 
                  log.includes('Slow') || 
                  log.includes('Weaken') || 
                  log.includes('SLOW') || 
                  log.includes('WEAKEN') || 
                  log.includes('Burn') ||
                  log.includes('roll:');
                
                // Add status effect icons
                const iconType = 
                  log.includes('Gust') || log.includes('Slow') || log.includes('SLOW') ? '🌪️' : 
                  log.includes('Stone Slam') || log.includes('Weaken') || log.includes('WEAKEN') ? '🪨' : 
                  log.includes('Burn') || log.includes('Burning') || log.includes('Fire') ? '🔥' : '';
                
                // Add color coding for success/failure
                if (log.includes('roll:')) {
                  if (log.includes('SUCCESS')) {
                    formattedLog = formattedLog.replace(
                      'SUCCESS!',
                      '<span class="text-green-400 font-bold">SUCCESS!</span>'
                    );
                  } else if (log.includes('FAILED')) {
                    formattedLog = formattedLog.replace(
                      'FAILED',
                      '<span class="text-red-400 font-bold">FAILED</span>'
                    );
                  }
                  
                  // Extract roll value if available
                  const rollMatch = log.match(/roll: ([\d.]+)%/);
                  if (rollMatch && rollMatch[1]) {
                    const rollValue = rollMatch[1];
                    if (log.includes('SUCCESS')) {
                      formattedLog = formattedLog.replace(
                        `${rollValue}%`,
                        `<span class="text-green-400 font-semibold">${rollValue}%</span>`
                      );
                    } else {
                      formattedLog = formattedLog.replace(
                        `${rollValue}%`,
                        `<span class="text-red-400 font-semibold">${rollValue}%</span>`
                      );
                    }
                  }
                }
                
                const logClass = `text-sm py-1 border-b border-[#432874]/20 ${
                  isAllyAction ? 'text-left' : 
                  isEnemyAction ? 'text-right' : 
                  'text-center'
                }`;
                
                // Add tooltip for status effect logs
                return hasStatusEffect ? (
                  <div key={index} className="relative group">
                    <div 
                      className={`${logClass} ${log.includes('roll:') ? 'cursor-help' : ''} flex items-center`}
                    >
                      {iconType && isAllyAction && <span className="mr-1">{iconType}</span>}
                      <span dangerouslySetInnerHTML={{ __html: formattedLog }} />
                      {iconType && isEnemyAction && <span className="ml-1">{iconType}</span>}
                      
                      {log.includes('roll:') && (
                        <span className="w-2 h-2 rounded-full ml-1 inline-block bg-blue-500"></span>  
                      )}
                    </div>
                    
                    {log.includes('roll:') && (
                      <div className="invisible group-hover:visible absolute left-full top-0 ml-2 p-2 bg-black/90 border border-purple-800 rounded-md z-50 w-64 text-xs text-white">
                        <div className="font-bold text-purple-300 mb-1">Status Effect Details</div>
                        {log.includes('Gust') && (
                          <div>
                            <div className="font-semibold text-cyan-300">Gust Status Effect:</div>
                            <div>Has a 20% chance to apply "Minor Slow" (20% Speed reduction) for 1 turn.</div>
                          </div>
                        )}
                        {log.includes('Stone Slam') && (
                          <div>
                            <div className="font-semibold text-yellow-300">Stone Slam Status Effect:</div>
                            <div>Has a 20% chance to apply "Minor Weakness" (10% Attack reduction) for 2 turns.</div>
                          </div>
                        )}
                        {(log.includes('Burn') || log.includes('Fire')) && (
                          <div>
                            <div className="font-semibold text-orange-400">Burn Status Effect:</div>
                            <div>Has a 30% chance to apply "Burn" (5% max HP damage per turn) for 3 turns.</div>
                          </div>
                        )}
                        <div className="mt-1 text-gray-400 italic">The system rolls a random number from 0-100. If the roll is below the threshold, the effect is applied.</div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    key={index} 
                    className={logClass}
                    dangerouslySetInnerHTML={{ __html: formattedLog }}
                  />
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="admin">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-3">
                <h3 className="font-semibold text-green-400">Damage Calculations</h3>
                <div className="bg-[#432874]/20 p-3 rounded text-sm space-y-2 max-h-[400px] overflow-y-auto">
                  <p>- ATK * Skill Damage% = Base Damage</p>
                  <p>- Status effects like Weaken reduce ATK by %</p>
                  <p>- Critical hits deal 50% more damage</p>
                  <p>- Element advantages add 20% damage</p>
                  <div className="border-t border-[#432874] my-2 pt-2">
                    <p className="font-semibold text-green-300">Example:</p>
                    <p>100 ATK * 0.8 (80% skill) = 80 damage</p>
                    <p>With -10% Weaken: 90 ATK * 0.8 = 72 damage</p>
                    <p>With crit: 80 * 1.5 = 120 damage</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-blue-400">Detailed System Log</h3>
                <div className="bg-[#432874]/20 p-3 rounded text-sm max-h-[400px] overflow-y-auto font-mono">
                  <div className="text-gray-400">// Real-time battle information</div>
                  {detailedActionLog.map((log, index) => (
                    <div 
                      key={index}
                      className={`mt-1 ${
                        log.includes('ATTACK ROLL') ? 'text-green-400' :
                        log.includes('DAMAGE CALC') ? 'text-yellow-300' :
                        log.includes('STATUS') ? 'text-red-400' :
                        log.includes('SPEED') ? 'text-blue-400' :
                        'text-white'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-semibold text-purple-400">Status Effect Analysis</h3>
                <div className="bg-[#432874]/20 p-3 rounded text-sm max-h-[400px] overflow-y-auto">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1">
                    <div className="col-span-2 font-semibold text-purple-300">Chance to Apply:</div>
                    <div>Burning: 10-30%</div>
                    <div>Poison: 30%</div>
                    <div>Weakened: 20-30%</div>
                    <div>Slowed: 10-20%</div>
                    
                    <div className="col-span-2 font-semibold text-purple-300 mt-2">Effect Duration:</div>
                    <div>Burning: 1-3 turns</div>
                    <div>Poison: 3 turns</div>
                    <div>Weakened: 2 turns</div>
                    <div>Slowed: 1-2 turns</div>
                    
                    <div className="col-span-2 font-semibold text-purple-300 mt-2">Effect Power:</div>
                    <div>Burning: 5% max HP damage/turn</div>
                    <div>Poison: 3% max HP damage/turn</div>
                    <div>Weakened: -10% Attack</div>
                    <div>Slowed: -20% Speed</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="debug-logs">
            <div className="h-[400px] overflow-y-auto space-y-1 text-xs font-mono">
              {/* Show the detailed logs directly for better visibility of all status effect attempts */}
              {detailedActionLog.length > 0 ? (
                // When we have logs, display them with proper formatting
                detailedActionLog.map((log, index) => {
                  const turnMatch = log.match(/Turn (\d+):/);
                  const turnNumber = turnMatch ? turnMatch[1] : "?";
                  
                  // Highlight different types of logs
                  const isEffectAttempt = log.includes('EFFECT ATTEMPT') || log.includes('used Gust - 50% chance');
                  const isEffectRoll = log.includes('EFFECT ROLL') || log.includes('roll:');
                  const isStatusApplied = log.includes('STATUS -') || log.includes('successfully applied');
                  const isActionLog = log.includes('Action -');
                  
                  // Extract roll information for effect rolls with new format for Gust
                  let rollInfo = null;
                  let successStatus = null;
                  let rollValue = null;
                  let thresholdValue = null;
                  
                  if (isEffectRoll) {
                    // Try to parse roll details - first try the standard format
                    const rollMatch = log.match(/Rolled: ([\d.]+)% vs ([\d.]+)% threshold - (SUCCESS|FAILED)/);
                    
                    // Also try the new Gust format
                    const gustRollMatch = log.match(/roll: ([\d.]+)% - (SUCCESS!|FAILED)/);
                    
                    if (rollMatch) {
                      rollValue = parseFloat(rollMatch[1]);
                      thresholdValue = parseFloat(rollMatch[2]);
                      successStatus = rollMatch[3];
                    } else if (gustRollMatch) {
                      rollValue = parseFloat(gustRollMatch[1]);
                      thresholdValue = 50.0; // Gust has 50% chance for testing
                      successStatus = gustRollMatch[2].includes('SUCCESS') ? 'SUCCESS' : 'FAILED';
                    }
                  }
                  
                  // Style based on log type
                  let logStyle = '';
                  let borderStyle = '';
                  let icon = '';
                  
                  if (isEffectAttempt) {
                    logStyle = 'bg-blue-900/20 text-blue-300';
                    borderStyle = 'border-l-4 border-l-blue-500';
                    icon = '🎲';
                  } else if (isEffectRoll) {
                    if (successStatus === 'SUCCESS' || log.includes('SUCCESS!')) {
                      logStyle = 'bg-green-900/20 text-green-300';
                      borderStyle = 'border-l-4 border-l-green-500';
                      icon = '✓';
                    } else {
                      logStyle = 'bg-red-900/20 text-red-300';
                      borderStyle = 'border-l-4 border-l-red-500';
                      icon = '✗';
                    }
                  } else if (isStatusApplied) {
                    logStyle = 'bg-green-900/20 text-green-300';
                    borderStyle = 'border-l-4 border-l-green-500';
                    icon = '✨';
                  } else if (isActionLog) {
                    logStyle = 'bg-gray-900/20 text-gray-300';
                    icon = '⚔️';
                  }
                  
                  // Format the log string for better readability
                  let formattedLog = log.replace(`Turn ${turnNumber}: `, '');
                  
                  // If it's an effect roll with parsed data, create a prettier formatted display
                  if (isEffectRoll && rollValue !== null && thresholdValue !== null) {
                    // Extract skill name if possible
                    const skillMatch = formattedLog.match(/'s ([^-]+) -/) || formattedLog.match(/([A-Za-z-]+)'s Gust roll/);
                    const skillName = skillMatch ? skillMatch[1] : 'Gust';
                    
                    // Extract character name for Gust rolls
                    const nameMatch = formattedLog.match(/([A-Za-z -]+)'s Gust roll/);
                    const charName = nameMatch ? nameMatch[1] : '';
                    
                    // Extract effect type
                    let effectType = '';
                    if (formattedLog.includes('SLOW')) {
                      effectType = 'SLOW';
                    } else if (formattedLog.includes('WEAKEN')) {
                      effectType = 'WEAKEN';
                    } else if (skillName === 'Gust') {
                      effectType = 'SLOW';
                    }
                    
                    return (
                      <div 
                        key={index} 
                        className={`py-2 px-1 border-b border-[#432874]/20 font-mono ${logStyle} ${borderStyle}`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{icon}</span>
                          <span className="font-semibold">[Turn {turnNumber}]</span>
                          <span>{charName || effectType} roll {skillName && !skillName.includes('Gust') ? `(${skillName})` : ''}:</span>
                        </div>
                        <div className="mt-1 pl-8 flex items-center gap-2">
                          <div className="w-full bg-gray-800 h-4 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${successStatus === 'SUCCESS' ? 'bg-green-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(100, (rollValue / thresholdValue) * 100)}%` }}
                            />
                          </div>
                          <span className={successStatus === 'SUCCESS' ? 'text-green-300' : 'text-red-300'}>
                            {rollValue.toFixed(1)}% / {thresholdValue.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    );
                  }
                  
                  // For non-roll logs
                  return (
                    <div 
                      key={index} 
                      className={`py-1 border-b border-[#432874]/20 font-mono ${logStyle} ${borderStyle}`}
                      style={{whiteSpace: 'pre-wrap'}}
                    >
                      <span className="inline-block mr-2">{icon}</span>
                      <span className="font-semibold">[Turn {turnNumber}]</span> {formattedLog}
                    </div>
                  );
                })
              ) : (
                // When no logs are available, show a helpful message
                <div className="bg-[#1A1A2E]/70 p-4 border border-[#432874]/50 rounded-md mt-2">
                  <h3 className="text-[#FF9D00] font-semibold mb-2">Debug Logs Array Length: {detailedActionLog.length}</h3>
                  <p className="text-[#C8B8DB]/80 mb-2">
                    Here are the first 3 detailed action logs (raw format):
                    {detailedActionLog.slice(0, 3).map((log, i) => (
                      <div key={i} className="text-xs font-mono text-white my-1 p-1 bg-black/30">{log}</div>
                    ))}
                  </p>
                  <div className="bg-[#432874]/20 p-3 rounded-md">
                    <h4 className="text-[#00B9AE] text-sm font-medium mb-1">Skills with Status Effects:</h4>
                    <ul className="list-disc list-inside space-y-1 text-[#C8B8DB]/90">
                      <li>Gust - Has chance to apply "Minor Slow" (20% Speed reduction, increased to 50% for testing)</li>
                      <li>Stone Slam - Has chance to apply "Minor Weakness" (10% Attack reduction)</li>
                      <li>Wildfire - Has chance for burn damage over time</li>
                    </ul>
                  </div>
                </div>
              )}
              
              {/* Add debug information about current battle state */}
              {units.length > 0 && (
                <div className="mt-4 p-3 bg-[#1A1A2E]/70 border border-[#432874]/50 rounded-md">
                  <h4 className="text-[#FF9D00] font-medium mb-2">Battle Debug Information:</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[#C8B8DB]/80">
                    <div>Current Turn: <span className="text-[#C8B8DB]">{turnCountRef.current}</span></div>
                    <div>Battle Round State: <span className="text-[#C8B8DB]">{battleRound}</span></div>
                    <div>Units in Battle: <span className="text-[#C8B8DB]">{units.length}</span></div>
                    <div>Action Log Entries: <span className="text-[#C8B8DB]">{actionLog.length}</span></div>
                    <div>Detailed Log Entries: <span className="text-[#C8B8DB]">{detailedActionLog.length}</span></div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex flex-col gap-2 sm:gap-0">
          {isComplete && (
            <div className="w-full flex-col space-y-2 text-center mb-2">
              <h4 className="text-[#FF9D00] font-semibold">
                {/* First check if there's a valid battleLog entry with allies array */}
                {(() => {
                  const battleEntry = battleLog.find(log => log.allies && Array.isArray(log.allies));
                  if (!battleEntry) return `Dungeon Completed! Cleared ${currentStage + 1} of 8 stages`;

                  // Then check if all allies are defeated
                  const allAlliesDefeated = battleEntry?.allies?.every((a: any) => {
                    const unit = units.find(u => u.id === a.id);
                    return unit ? unit.hp <= 0 : true; // Consider missing units as defeated
                  }) || false;

                  return allAlliesDefeated 
                    ? `Your party was defeated on Stage ${currentStage + 1}` 
                    : `Dungeon Completed! Cleared ${currentStage + 1} of 8 stages`;
                })()}
              </h4>
              <div className="text-sm">
                <div>Reward Based on Progress:</div>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-yellow-400">+{Math.floor(50 * Math.pow(1.2, currentStage))} Rogue Credits</span>
                  <span className="text-purple-400">+{Math.floor(15 * Math.pow(1.3, currentStage))} Soul Shards</span>
                </div>
              </div>
            </div>
          )}

          {isComplete ? (
            <Button
              className="bg-[#FF9D00] hover:bg-[#FF9D00]/80"
              onClick={() => {
                if (runId && onCompleteDungeon) {
                  onCompleteDungeon(runId);
                }
                onClose();
              }}
            >
              Collect Rewards
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? 'Resume Battle' : 'Pause Battle'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BattleLog;