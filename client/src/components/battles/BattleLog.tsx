import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Shield, Swords, Heart, Zap } from 'lucide-react';

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
  const [isComplete, setIsComplete] = useState(false);
  const [battleRound, setBattleRound] = useState(1);
  
  // Function to handle changing the playback speed
  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
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
                    setActionLog(prev => [...prev, message]);
                  });
                  
                  // Check if unit was defeated by status effects
                  if (updatedUnits[i].hp <= 0 && unit.hp > 0) {
                    setActionLog(prev => [...prev, `${unit.name} has been defeated by status effects!`]);
                    
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
              // Calculate healing amount to show in the log
              const healAmount = Math.floor(800 * 0.05); // 5% of 800 = 40 HP
              
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
                effect = {
                  name: "Burning",
                  effect: "Burn",
                  value: burnDamage,
                  duration: 3,
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
            
            const actionMessage = `${attacker.name} used ${skill.name} (${skillType} - ${skill.damage.toFixed(2)}x) on ${target.name} for ${damage} damage!${statusEffectText}${healingEffectText}`;
            console.log(actionMessage);
            
            // Update action log
            setActionLog(prev => [...prev, actionMessage]);
            
            // Apply damage to the target first
            setUnits(prevUnits => {
              const updatedUnits = prevUnits.map(u => {
                if (u.id === target.id) {
                  const newHp = Math.max(0, u.hp - damage);
                  // Check if target is defeated
                  if (newHp <= 0 && u.hp > 0) {
                    setActionLog(prev => [...prev, `${target.name} has been defeated!`]);
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
                  const attackerMaxHp = 800; // Standard base value for G-Wolf, the healer
                  const healAmount = Math.floor(attackerMaxHp * 0.05); // Should heal for 40 HP
                  
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

  const selectTarget = (attacker: BattleUnit, allUnits: BattleUnit[]) => {
    // Get first log entry that has allies defined
    const battleEntry = battleLog.find(log => log.allies && Array.isArray(log.allies));
    const isAlly = battleEntry?.allies?.some((a: any) => a.id === attacker.id) || false;

    const possibleTargets = allUnits.filter(u =>
      u.hp > 0 &&
      (isAlly ? battleEntry?.enemies?.some((e: any) => e.id === u.id) : battleEntry?.allies?.some((a: any) => a.id === u.id))
    );
    return possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
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

    // Calculate damage: Attack * Damage Multiplier
    // Apply aura bonus if available
    let attackValue = attacker.stats.attack;
    if (attacker.auraBonus?.attack) {
      // Add percentage bonus from aura
      attackValue = Math.floor(attackValue * (1 + attacker.auraBonus.attack / 100));
    }
    
    // Damage = Attack * Skill Damage Multiplier
    const damage = Math.floor(attackValue * skill.damage);
    
    // Format the action message with more details
    let statusEffectText = "";
    if (skillType !== 'basic' && Math.random() < 0.3) { // 30% chance to apply status effect for advanced/ultimate skills
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
        effect = {
          name: "Burning",
          effect: "Burn",
          value: burnDamage,
          duration: 3,
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
      // Calculate healing amount to show in the log
      const healAmount = Math.floor(800 * 0.05); // 5% of 800 = 40 HP
      healingEffectText = ` (includes healing for ${healAmount} HP)`;
    }
    
    const actionMessage = `${attacker.name} used ${skill.name} (${skillType} - ${skill.damage.toFixed(2)}x) on ${target.name} for ${damage} damage!${statusEffectText}${healingEffectText}`;

    setActionLog(prev => [...prev, actionMessage]);

    // First apply damage to the target
    setUnits(prevUnits => {
      const updatedUnits = prevUnits.map(u => {
        if (u.id === target.id) {
          const newHp = Math.max(0, u.hp - damage);
          
          // Check if target is defeated
          if (newHp <= 0 && u.hp > 0) {
            setActionLog(prev => [...prev, `${target.name} has been defeated!`]);
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
          const attackerMaxHp = 800; // Standard base value for G-Wolf, the healer
          const healAmount = Math.floor(attackerMaxHp * 0.05); // Should heal for 40 HP
          
          // Add a single healing message
          const healMessage = `${attacker.name} healed ${healTarget.name} for ${healAmount} HP with Soothing Current!`;
          setActionLog(prev => [...prev, healMessage]);
          
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
      <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
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
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A1A2E] border-[#432874] text-[#C8B8DB] max-w-4xl max-h-[80vh] overflow-y-auto">
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
                  onClick={() => handleSpeedChange(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : 1)}
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
                    <div className="w-full bg-[#432874]/30 h-1 rounded mt-1">
                      <motion.div
                        className="bg-[#FF9D00] h-full rounded"
                        style={{ width: `${unit.attackMeter}%` }}
                      />
                    </div>
                    {renderUnitStats(unit)}
                    
                    {/* Status effects display for allies */}
                    {unit.statusEffects && unit.statusEffects.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {unit.statusEffects.map((effect, index) => {
                          let statusColor = "bg-gray-600";
                          if (effect.effect === "Burn") statusColor = "bg-red-600";
                          if (effect.effect === "Poison") statusColor = "bg-green-600";
                          if (effect.effect === "ReduceAtk") statusColor = "bg-orange-600";
                          if (effect.effect === "ReduceSpd") statusColor = "bg-blue-600";
                          
                          return (
                            <div 
                              key={index}
                              className={`text-xs px-1 rounded text-white ${statusColor} flex items-center`}
                              title={`${effect.name}: ${effect.effect === "Burn" || effect.effect === "Poison" ? 
                                `${effect.value} damage per turn` : 
                                `${effect.value}% reduction`} (${effect.duration} turns remaining)`}
                            >
                              {effect.name} ({effect.duration})
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Enemies</h3>
                {units.filter(u => battleLog[0]?.enemies?.some((e: any) => e.id === u.id)).map(unit => (
                  <div key={unit.id} className="bg-[#432874]/20 p-2 rounded">
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
                    <div className="w-full bg-[#432874]/30 h-1 rounded mt-1">
                      <motion.div
                        className="bg-[#FF9D00] h-full rounded"
                        style={{ width: `${unit.attackMeter}%` }}
                      />
                    </div>
                    {renderUnitStats(unit)}
                    
                    {/* Status effects display for enemies */}
                    {unit.statusEffects && unit.statusEffects.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {unit.statusEffects.map((effect, index) => {
                          let statusColor = "bg-gray-600";
                          if (effect.effect === "Burn") statusColor = "bg-red-600";
                          if (effect.effect === "Poison") statusColor = "bg-green-600";
                          if (effect.effect === "ReduceAtk") statusColor = "bg-orange-600";
                          if (effect.effect === "ReduceSpd") statusColor = "bg-blue-600";
                          
                          return (
                            <div 
                              key={index}
                              className={`text-xs px-1 rounded text-white ${statusColor} flex items-center`}
                              title={`${effect.name}: ${effect.effect === "Burn" || effect.effect === "Poison" ? 
                                `${effect.value} damage per turn` : 
                                `${effect.value}% reduction`} (${effect.duration} turns remaining)`}
                            >
                              {effect.name} ({effect.duration})
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="summary">
            <div className="space-y-4">
              <h3 className="font-semibold">Battle Statistics</h3>
              {units.map(unit => (
                <div key={unit.id} className="bg-[#432874]/20 p-3 rounded">
                  <h4 className="font-medium mb-2">{unit.name}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Damage Dealt: {unit.totalDamageDealt}</div>
                    <div>Damage Received: {unit.totalDamageReceived}</div>
                    <div>Healing Done: {unit.totalHealingDone}</div>
                    <div>Healing Received: {unit.totalHealingReceived}</div>
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
                  const allAlliesDefeated = battleEntry.allies.every((a: any) => 
                    units.find(u => u.id === a.id)?.hp <= 0
                  );
                  
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