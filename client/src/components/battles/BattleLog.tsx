import { useState, useEffect } from 'react';
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
  const [battleRound, setBattleRound] = useState(1);
  
  // Reset to 1 when a new battle starts
  useEffect(() => {
    if (battleLog && battleLog.length > 0) {
      setBattleRound(1);
      setActionLog([]); // Clear action log when a new battle starts
      setDetailedActionLog([]); // Clear detailed log when a new battle starts
    }
  }, [battleLog]);

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
    if (units.length > 0) {
      console.log("Initial battle setup: Setting turn to 1");
      setBattleRound(1);
      setActionLog(prev => [...prev.map(item => 
        item.startsWith("Turn") ? item.replace(/Turn \d+/, "Turn 1") : item
      )]);
    }
  }, [units.length > 0]);

  // Battle simulation loop - using a more direct approach
  useEffect(() => {
    if (!isPaused && !isComplete && units.length > 0) {
      // Add debug logging
      console.log("Battle simulation running with", units.length, "units");

      const interval = setInterval(() => {
        // Increment battle round on each interval - this ensures status effects decrement properly
        setBattleRound(prevRound => {
          console.log(`Advancing to battle round ${prevRound + 1}`);
          return prevRound + 1;
        });

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

              console.log(`Processing ${unit.name}'s status effects - Current round: ${battleRound}, Is attack meter full: ${isAttackMeterFull}, Should decrement: ${shouldDecrement}`);

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
                lastStatusUpdate: battleRound // Mark this unit as having its status effects processed this round
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
                  lastStatusUpdate: battleRound // Mark this unit as having its status effects processed this round
                };
              }
            }

            // Update attack meter based on speed (120 speed = 3x faster than 40 speed)
            // Apply aura speed bonus if available
            let speedValue = unit.stats.speed;
            if (unit.auraBonus?.speed) {
              // Apply percentage bonus from aura
              speedValue = Math.floor(speedValue * (1 + unit.auraBonus.speed / 100));
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
        setTimeout(() => {
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
            if (attacker.auraBonus?.attack) {
              // Add percentage bonus from aura
              attackValue = Math.floor(attackValue * (1 + attacker.auraBonus.attack / 100));
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

            const actionMessage = `Turn ${battleRound}: ${attacker.name} used ${skill.name} on ${target.name} for ${damage} damage!${statusEffectText}${healingEffectText}`;
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
    if (attacker.auraBonus?.attack) {
      // Add percentage bonus from aura
      attackValue = Math.floor(attackValue * (1 + attacker.auraBonus.attack / 100));
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

    // Apply special status effects for specific skills
    // For Gust skill, do a single roll when the skill is used to determine if effect is applied
    if (skill.name === "Gust") {
      // Log the effect attempt to debug console to make sure the game system recognizes the effect attempt
      console.log(`${attacker.name} attempting to apply SLOW with Gust on ${target.name} - Turn ${battleRound}`);
      
      // Always update attempts counter and add to summary stats
      setUnits(prevUnits => {
        return prevUnits.map(u => {
          if (u.id === attacker.id) {
            return {
              ...u,
              slowAttempts: (u.slowAttempts || 0) + 1
            };
          }
          return u;
        });
      });
      
      // Add to detailed action log about attempt - add it to both arrays to ensure visibility
      setDetailedActionLog(prev => [`Turn ${battleRound}: EFFECT ATTEMPT - ${attacker.name} attempted SLOW on ${target.name}`, ...prev]);
      setActionLog(prev => [`Turn ${battleRound}: ${attacker.name} attempted to SLOW ${target.name}!`, ...prev]);

      // Roll once for effect application - 10% chance
      const effectRoll = Math.random();
      const effectSuccess = effectRoll < 0.1;
      
      // Add detailed log about the roll
      setDetailedActionLog(prev => [
        `Turn ${battleRound}: EFFECT ROLL - Value: ${(effectRoll * 100).toFixed(2)}%, Threshold: 10%, Success: ${effectSuccess ? "YES" : "NO"}`,
        ...prev
      ]);
      
      if (effectSuccess) { // 10% chance for Minor Slow
        // Update success counter only if effect lands
        setUnits(prevUnits => {
          return prevUnits.map(u => {
            if (u.id === attacker.id) {
              return {
                ...u,
                slowSuccess: (u.slowSuccess || 0) + 1
              };
            }
            return u;
          });
        });
        
        // Add to detailed action log and actionLog (main log)
        setDetailedActionLog(prev => [`Turn ${battleRound}: STATUS - ${attacker.name} applied SLOW to ${target.name}`, ...prev]);
        
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
        target.statusEffects.push(effect);

        statusEffectText = " [Minor Slow applied]";
      }
    } 
    else if (skill.name === "Breeze" && Math.random() < 0.1) { // 10% chance to reduce Turn Meter
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

      statusEffectText = " [Turn Meter reduced by 10%]";
    } else if (skill.name === "Stone Slam" || skill.name === "Boss Strike") { // 20% chance to apply Weakness
      // Log the effect attempt to debug console to make sure the game system recognizes the effect attempt
      console.log(`${attacker.name} attempting to apply WEAKEN with ${skill.name} on ${target.name} - Turn ${battleRound}`);
      
      // Always update attempts counter
      setUnits(prevUnits => {
        return prevUnits.map(u => {
          if (u.id === attacker.id) {
            return {
              ...u,
              weakenAttempts: (u.weakenAttempts || 0) + 1
            };
          }
          return u;
        });
      });
      
      // Add to detailed action log about attempt AND to main action log for visibility
      setDetailedActionLog(prev => [`Turn ${battleRound}: EFFECT ATTEMPT - ${attacker.name} attempted WEAKEN on ${target.name}`, ...prev]);
      setActionLog(prev => [`Turn ${battleRound}: ${attacker.name} attempted to WEAKEN ${target.name}!`, ...prev]);

      // Roll once for effect application - 20% chance
      const effectRoll = Math.random();
      const effectSuccess = effectRoll < 0.2;
      
      // Add detailed log about the roll
      setDetailedActionLog(prev => [
        `Turn ${battleRound}: EFFECT ROLL - Value: ${(effectRoll * 100).toFixed(2)}%, Threshold: 20%, Success: ${effectSuccess ? "YES" : "NO"}`,
        ...prev
      ]);
      
      if (effectSuccess) { // 20% chance to apply Weakness
        // Update success counter only if effect lands
        setUnits(prevUnits => {
          return prevUnits.map(u => {
            if (u.id === attacker.id) {
              return {
                ...u,
                weakenSuccess: (u.weakenSuccess || 0) + 1
              };
            }
            return u;
          });
        });
        
        // Add to both logs when effect is applied
        setDetailedActionLog(prev => [`Turn ${battleRound}: STATUS - ${attacker.name} applied WEAKEN to ${target.name}`, ...prev]);
        setActionLog(prev => [`Turn ${battleRound}: ${attacker.name} successfully applied WEAKEN to ${target.name}!`, ...prev]);
        
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
    else if (skillType !== 'basic' && Math.random() < 0.3) { // 30% chance to apply status effect for advanced/ultimate skills
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

    // Add healing effect text for Soothing Current
    let healingEffectText = "";
    if (skill.name === "Soothing Current") {
      // Calculate healing amount based on 5% of attacker's max HP
      const healAmount = Math.floor(attacker.maxHp * 0.05);
      healingEffectText = ` (includes healing for ${healAmount} HP)`;
    }

    const actionMessage = `Turn ${battleRound}: ${attacker.name} used ${skill.name} on ${target.name} for ${damage} damage!${statusEffectText}${healingEffectText}`;

    setActionLog(prev => [actionMessage, ...prev]);
    // Also add to detailed log for admin view
    setDetailedActionLog(prev => [`Turn ${battleRound}: Action - ${attacker.name} used ${skill.name}`, ...prev]);

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

        // IMPORTANT: Update the current stage AFTER setting up the new units to avoid race conditions
        // This ensures that components displaying the stage number use the updated value

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

                console.log(`Resetting enemy ${unit.name} for stage ${nextStage + 1}:
                  - HP: ${newMaxHp}
                  - Attack: ${newAttack}
                  - Vitality: ${newVitality}
                  - Speed: ${newSpeed}
                `);

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

                console.log(`Processing ally ${unit.name} after stage clear:
                  - Current HP: ${unit.hp}/${unit.maxHp} (no healing between stages)
                  - Cleared negative effects: ${
                    (unit.statusEffects?.length || 0) - (filteredEffects.length || 0)
                  } effects removed
                `);

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
      description = `Deals ${damagePercent}% of ATK damage with 10% chance to apply Minor Slow (-20% SPD) for 1 turn.`;
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
              
              {/* Status Effect Statistics */}
              <div className="bg-[#432874]/20 p-4 rounded-lg">
                <h3 className="font-semibold text-[#FF9D00] mb-3">Status Effect Statistics</h3>
                
                <div className="grid grid-cols-1 gap-4">
                  <div className="grid grid-cols-4 gap-2">
                    <div className="font-semibold text-center text-xs md:text-sm">Effect</div>
                    <div className="font-semibold text-center text-xs md:text-sm">Success Rate</div>
                    <div className="font-semibold text-center text-xs md:text-sm">Applied</div>
                    <div className="font-semibold text-center text-xs md:text-sm">Attempts</div>
                  </div>
                  
                  {/* Burn */}
                  <div className="grid grid-cols-4 gap-2 items-center py-1 border-b border-[#432874]/30">
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
                  </div>
                  
                  {/* Poison */}
                  <div className="grid grid-cols-4 gap-2 items-center py-1 border-b border-[#432874]/30">
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
                  </div>
                  
                  {/* Slow */}
                  <div className="grid grid-cols-4 gap-2 items-center py-1 border-b border-[#432874]/30">
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
                  </div>
                  
                  {/* Weaken */}
                  <div className="grid grid-cols-4 gap-2 items-center py-1">
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
              {actionLog.map((log, index) => {
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

                return (
                  <div 
                    key={index} 
                    className={`text-sm py-1 border-b border-[#432874]/20 ${
                      isAllyAction ? 'text-left' : 
                      isEnemyAction ? 'text-right' : 
                      'text-center'
                    }`}
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
                  const isEffectAttempt = log.includes('EFFECT ATTEMPT');
                  const isEffectRoll = log.includes('EFFECT ROLL');
                  const isStatusApplied = log.includes('STATUS -') && log.includes('applied');
                  const isActionLog = log.includes('Action -');
                  
                  // Style based on log type
                  let logStyle = '';
                  let borderStyle = '';
                  if (isEffectAttempt) {
                    logStyle = 'bg-blue-900/20 text-blue-300';
                    borderStyle = 'border-l-4 border-l-blue-500';
                  } else if (isEffectRoll) {
                    logStyle = 'bg-purple-900/20 text-purple-300';
                    borderStyle = 'border-l-4 border-l-purple-500';
                  } else if (isStatusApplied) {
                    logStyle = 'bg-green-900/20 text-green-300';
                    borderStyle = 'border-l-4 border-l-green-500';
                  } else if (isActionLog) {
                    logStyle = 'bg-gray-900/20 text-gray-300';
                  }
                  
                  // Format the log string for better readability
                  const formattedLog = log.replace(`Turn ${turnNumber}: `, '');
                  
                  return (
                    <div 
                      key={index} 
                      className={`py-1 border-b border-[#432874]/20 font-mono ${logStyle} ${borderStyle}`}
                      style={{whiteSpace: 'pre-wrap'}}
                    >
                      {`[Turn ${turnNumber}] ${formattedLog}`}
                    </div>
                  );
                })
              ) : (
                // When no logs are available, show a helpful message
                <div className="bg-[#1A1A2E]/70 p-4 border border-[#432874]/50 rounded-md mt-2">
                  <h3 className="text-[#FF9D00] font-semibold mb-2">No Debug Logs Available</h3>
                  <p className="text-[#C8B8DB]/80 mb-2">
                    Debug logs will appear here when skills with status effects are used in battle.
                  </p>
                  <div className="bg-[#432874]/20 p-3 rounded-md">
                    <h4 className="text-[#00B9AE] text-sm font-medium mb-1">Skills with Status Effects:</h4>
                    <ul className="list-disc list-inside space-y-1 text-[#C8B8DB]/90">
                      <li>Gust - Has chance to apply "Minor Slow" (20% Speed reduction)</li>
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
                    <div>Current Round: <span className="text-[#C8B8DB]">{battleRound}</span></div>
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