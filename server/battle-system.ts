import { storage } from './storage';

// Battle system constants
const TOTAL_STAGES = 8; // All dungeons have 8 stages (mini-boss on 4, final boss on 8)
const ATTACK_METER_MAX = 100; // When meter hits 100%, unit takes action
const BASE_SPEED_REFERENCE = 40; // Base speed reference point (120 speed charges 3x faster than 40)
const MAX_STATUS_EFFECT_STACKS = 5; // Maximum stacks for effects like Poison/Burn
const MAX_ROUNDS_PER_STAGE = 50; // Safety limit to prevent infinite loops
const CRITICAL_HIT_CHANCE = 0.2; // 20% chance of critical hit
const CRITICAL_HIT_MULTIPLIER = 1.5; // Critical hits deal 1.5x damage

// Character/Unit types
interface BattleUnit {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  stats: {
    attack: number;
    vitality: number;
    speed: number;
    [key: string]: number;
  };
  skills: {
    basic: BattleSkill;
    advanced: BattleSkill | null;
    ultimate: BattleSkill | null;
    [key: string]: BattleSkill | null;
  };
  auraBonus?: {
    attack: number;
    vitality: number;
    speed: number;
    focus: number;
    accuracy: number;
    defense: number;
    resilience: number;
    element?: string;
    [key: string]: any;
  } | null;
  attackMeter: number;
  advancedSkillCooldown: number;
  ultimateSkillCooldown: number;
  statusEffects: StatusEffect[];
}

interface BattleSkill {
  name: string;
  damage: number;
  cooldown?: number;
  special?: string;
  aoe?: boolean;
}

interface StatusEffect {
  type: string;
  duration: number;
  stacks: number;
  source: string;
}

interface BattleAction {
  actor: string;
  skill: string;
  target: string;
  damage: number;
  isCritical: boolean;
  healing?: boolean;
  message?: string;
  type?: string;
}

interface BattleLogEntry {
  type: string;
  number?: number;
  actions?: BattleAction[];
  remainingAllies?: number;
  remainingEnemies?: number;
  allies?: BattleUnit[];
  enemies?: BattleUnit[];
  stageNumber?: number;
  totalStages?: number;
  message?: string;
  currentStage?: number;
  totalRounds?: number;
  completedStages?: number;
  survivingAllies?: string[];
  victory?: boolean;
  summary?: string;
  aliveAllies?: BattleUnit[];
  newEnemies?: BattleUnit[];
  timestamp?: number;
}

/**
 * Generate a detailed battle log for a dungeon run
 * Implements the combat mechanics as specified in documentation
 */
export async function generateBattleLog(run: any, success: boolean): Promise<BattleLogEntry[]> {
  // ENHANCED LOGGING FOR DEBUGGING
  console.log("======= BATTLE SYSTEM: START =======");
  console.log("Generating battle log for run:", run.id);
  console.log("Success preset:", success);
  console.log("Run character IDs:", JSON.stringify(run.characterIds));
  console.log("Run dungeon level:", run.dungeonLevel);
  
  // Initialize battle data
  const battleLog: BattleLogEntry[] = [];
  const allies: BattleUnit[] = [];
  const enemies: BattleUnit[] = [];
  
  // Track current stage
  let currentStage = 1;

  // Get character data for allies
  console.log('Processing allies for battle, character IDs:', run.characterIds);
  for (const charId of run.characterIds) {
    console.log(`Getting character data for ID: ${charId}`);
    const char = await storage.getCharacterById(charId);
    const aura = char?.equippedAuraId ? await storage.getAuraById(char.equippedAuraId) : null;
    
    // Calculate aura stat bonuses if an aura is equipped
    const auraBonus = aura ? {
      attack: aura.attack || 0,
      vitality: aura.vitality || 0, 
      speed: aura.speed || 0,
      focus: aura.focus || 0,
      accuracy: aura.accuracy || 0,
      defense: aura.defense || 0,
      resilience: aura.resilience || 0,
      element: aura.element
    } : null;
    
    // Ensure vitality is always positive
    const vitality = Math.max(10, char?.vitality || 100);
    const healthPoints = vitality * 8;  // Multiply vitality by 8 for HP
    
    // According to documentation, HP = Vitality * 8
    const safeHealthPoints = Math.max(1, healthPoints); // Ensure minimum 1 HP
    
    // Per requirements, characters MUST start with FULL HP at battle beginning
    console.log(`Setting ally ${char?.name} initial HP to ${safeHealthPoints} (full health)`);
    allies.push({
      id: charId,
      name: char?.name || 'Unknown Hero',
      hp: safeHealthPoints, // CRITICAL: Allies must start at full HP
      maxHp: safeHealthPoints,
      stats: {
        attack: char?.attack || 50,
        vitality: vitality,
        speed: char?.speed || 40
      },
      skills: {
        basic: {
          name: 'Basic Attack',
          damage: 1.0
        },
        advanced: (aura?.skills?.[1] && typeof aura.skills[1] === 'object') ? {
          name: (aura.skills[1] as any).name || 'Advanced Attack',
          damage: Number((aura.skills[1] as any).damage) || 1.5,
          cooldown: Number((aura.skills[1] as any).cooldown) || 3
        } : null,
        ultimate: (aura?.skills?.[2] && typeof aura.skills[2] === 'object') ? {
          name: (aura.skills[2] as any).name || 'Ultimate Attack',
          damage: Number((aura.skills[2] as any).damage) || 2.0,
          cooldown: Number((aura.skills[2] as any).cooldown) || 5
        } : null
      },
      // Add aura bonuses to be applied during battle calculations
      auraBonus: auraBonus,
      // Initialize attack meter and cooldowns
      attackMeter: 0,
      advancedSkillCooldown: 0,
      ultimateSkillCooldown: 0,
      statusEffects: []
    });
  }

  // Generate enemies based on dungeon level
  const enemyCount = Math.min(3, Math.floor(run.dungeonLevel / 2) + 1);
  
  for (let i = 0; i < enemyCount; i++) {
    const type = i === enemyCount - 1 ? 'Boss' : 'Minion';
    const level = run.dungeonLevel;
    
    // Ensure vitality is always positive
    const vitality = Math.max(10, type === 'Boss' ? 200 + (level * 20) : 80 + (level * 10));
    const healthPoints = vitality * 8;  // Multiply vitality by 8 for HP
    
    // Ensure HP is always full at the start of a new battle and never negative
    const safeHealthPoints = Math.max(1, healthPoints);
    
    // Ensure enemies always start with full health
    console.log(`Setting enemy ${type} ${i + 1} initial HP to ${safeHealthPoints} (full health)`);
    enemies.push({
      id: `enemy_${i}`,
      name: `${type} ${i + 1}`,
      hp: safeHealthPoints,  // CRITICAL: Enemies must start at full HP
      maxHp: safeHealthPoints, // Set maxHP equal to 8x vitality
      stats: {
        attack: 40 + (level * 5),
        vitality: vitality,
        speed: type === 'Boss' ? 35 + (level * 2) : 45 + (level * 3)
      },
      skills: {
        basic: { name: 'Enemy Attack', damage: 1.0 },
        advanced: type === 'Boss' ? { name: 'Boss Strike', damage: 1.8, cooldown: 3 } : null,
        ultimate: type === 'Boss' ? { name: 'Boss Ultimate', damage: 2.5, cooldown: 5 } : null
      },
      // Initialize attack meter and cooldowns
      attackMeter: 0,
      advancedSkillCooldown: 0,
      ultimateSkillCooldown: 0,
      statusEffects: []
    });
  }

  // Force all units to have full HP to fix any issues that might have occurred
  let hpFixed = false;
  allies.forEach(ally => {
    if (ally.hp !== ally.maxHp) {
      console.warn(`Critical fix applied: Ally ${ally.name} HP was ${ally.hp}, forcing to ${ally.maxHp}`);
      ally.hp = ally.maxHp;
      hpFixed = true;
    }
  });
  
  enemies.forEach(enemy => {
    if (enemy.hp !== enemy.maxHp) {
      console.warn(`Critical fix applied: Enemy ${enemy.name} HP was ${enemy.hp}, forcing to ${enemy.maxHp}`);
      enemy.hp = enemy.maxHp;
      hpFixed = true;
    }
  });
  
  // Add a system message event to inform players about HP initialization
  battleLog.push({
    type: 'system_message',
    message: 'Battle system initialized: All units start with full health (HP = Vitality × 8).',
    timestamp: Date.now()
  });

  // Perform one final check to ensure all enemy values are consistent (specifically for the enemy HP display bug)
  for (let i = 0; i < enemies.length; i++) {
    // Double-check each enemy to guarantee they have proper HP values
    if (enemies[i].hp !== enemies[i].maxHp) {
      console.error(`CRITICAL ERROR FIXED: Enemy ${enemies[i].name} has inconsistent HP: ${enemies[i].hp}/${enemies[i].maxHp}`);
      enemies[i].hp = enemies[i].maxHp;
    }
  }

  // Initial battle state
  battleLog.push({
    type: 'battle_start',
    allies,
    enemies,
    timestamp: Date.now()
  });

  // Prepare for battle simulation with attack meter system
  let aliveAllies = [...allies];
  let aliveEnemies = [...enemies];
  
  // Track battle progress
  let stageBattleComplete = false;
  let currentRound = 0;
  
  // Add stage start notification
  battleLog.push({
    type: 'stage_start',
    stageNumber: currentStage,
    totalStages: TOTAL_STAGES,
    message: `Stage ${currentStage} of ${TOTAL_STAGES} begins!`,
    timestamp: Date.now()
  });

  // Main battle loop using the Attack Meter system as per documentation
  // Continue until stage is complete or max rounds reached
  let battleRound = 0;
  
  // Debug logging to check condition values
  console.log("BATTLE LOOP CONDITIONS CHECK:");
  console.log(`- MAX_ROUNDS_PER_STAGE: ${MAX_ROUNDS_PER_STAGE}`);
  console.log(`- aliveAllies.length: ${aliveAllies.length}`);
  console.log(`- aliveEnemies.length: ${aliveEnemies.length}`);
  console.log(`- stageBattleComplete: ${stageBattleComplete}`);
  
  // Verify all units have appropriate health values
  aliveAllies.forEach(ally => {
    console.log(`Ally ${ally.name} HP check: ${ally.hp}/${ally.maxHp}`);
    if (ally.hp <= 0) {
      console.warn(`WARNING: Ally ${ally.name} has invalid HP (${ally.hp}), fixing to ${ally.maxHp}`);
      ally.hp = ally.maxHp; // Ensure HP is correctly set
    }
  });
  
  aliveEnemies.forEach(enemy => {
    console.log(`Enemy ${enemy.name} HP check: ${enemy.hp}/${enemy.maxHp}`);
    if (enemy.hp <= 0) {
      console.warn(`WARNING: Enemy ${enemy.name} has invalid HP (${enemy.hp}), fixing to ${enemy.maxHp}`);
      enemy.hp = enemy.maxHp; // Ensure HP is correctly set
    }
  });
  
  while (battleRound < MAX_ROUNDS_PER_STAGE && aliveAllies.length > 0 && aliveEnemies.length > 0 && !stageBattleComplete) {
    console.log(`BATTLE ROUND ${battleRound + 1} STARTING`);
    battleRound++;
    currentRound++;
    const roundActions: BattleAction[] = [];
    
    // Update the attack meters for all units based on speed
    // According to documentation, units with 120 speed charge 3x faster than units with 40 speed
    aliveAllies.forEach(unit => {
      // Increment attack meter based on speed
      const speedFactor = unit.stats.speed / BASE_SPEED_REFERENCE;
      unit.attackMeter += ATTACK_METER_MAX * speedFactor * 0.2; // 0.2 represents one tick
      
      // Reduce cooldowns if they exist
      if (unit.advancedSkillCooldown > 0) {
        unit.advancedSkillCooldown--;
      }
      if (unit.ultimateSkillCooldown > 0) {
        unit.ultimateSkillCooldown--;
      }
    });
    
    aliveEnemies.forEach(unit => {
      // Increment attack meter based on speed
      const speedFactor = unit.stats.speed / BASE_SPEED_REFERENCE;
      unit.attackMeter += ATTACK_METER_MAX * speedFactor * 0.2; // 0.2 represents one tick
      
      // Reduce cooldowns if they exist
      if (unit.advancedSkillCooldown > 0) {
        unit.advancedSkillCooldown--;
      }
      if (unit.ultimateSkillCooldown > 0) {
        unit.ultimateSkillCooldown--;
      }
    });
    
    // Process all units that are ready to act (attack meter >= 100%)
    const readyUnits = [...aliveAllies, ...aliveEnemies].filter(unit => unit.attackMeter >= ATTACK_METER_MAX);
    
    // If any units are ready to act
    if (readyUnits.length > 0) {
      // Process each ready unit's action
      for (const unit of readyUnits) {
        // Skip if unit has been defeated since becoming ready
        if (!aliveAllies.includes(unit) && !aliveEnemies.includes(unit)) continue;
        
        // Reset attack meter after taking action
        unit.attackMeter = 0;
        
        const isAlly = aliveAllies.includes(unit);
        const targets = isAlly ? aliveEnemies : aliveAllies;
        if (targets.length === 0) continue;
        
        // Select skill based on cooldowns - prioritize ultimate, then advanced, then basic
        let selectedSkill: BattleSkill;
        
        if (unit.skills.ultimate && unit.ultimateSkillCooldown <= 0) {
          selectedSkill = unit.skills.ultimate;
          // Set cooldown for the ultimate skill
          unit.ultimateSkillCooldown = selectedSkill.cooldown || 5;
        } else if (unit.skills.advanced && unit.advancedSkillCooldown <= 0) {
          selectedSkill = unit.skills.advanced;
          // Set cooldown for the advanced skill
          unit.advancedSkillCooldown = selectedSkill.cooldown || 3;
        } else {
          selectedSkill = unit.skills.basic;
        }
        
        // Select random target from opposing side
        const target = targets[Math.floor(Math.random() * targets.length)];
        
        // Calculate damage
        const baseDamage = unit.stats.attack * selectedSkill.damage;
        const isCritical = Math.random() < CRITICAL_HIT_CHANCE;
        const damage = Math.floor(baseDamage * (isCritical ? CRITICAL_HIT_MULTIPLIER : 1));
        
        // Apply damage to target and ensure HP is never negative
        target.hp = Math.max(0, target.hp - damage);
        
        // Record the action
        roundActions.push({
          actor: unit.name,
          skill: selectedSkill.name,
          target: target.name,
          damage,
          isCritical,
          message: `${unit.name} uses ${selectedSkill.name} on ${target.name} for ${damage} damage${isCritical ? " (CRITICAL HIT!)" : ""}!`
        });
        
        // Check for special healing skills
        if (isAlly && selectedSkill.name === "Soothing Current" && aliveAllies.length > 0) {
          // Find the ally with the lowest HP (excluding the caster if possible)
          const otherAllies = aliveAllies.filter(ally => ally !== unit);
          const healTarget = otherAllies.length > 0 
            ? otherAllies.reduce((lowest, current) => 
                current.hp < lowest.hp ? current : lowest, otherAllies[0])
            : unit; // Self-heal if no other allies
          
          // Apply healing (5% of max health)
          const healAmount = Math.floor(unit.maxHp * 0.05);
          healTarget.hp = Math.min(healTarget.hp + healAmount, healTarget.maxHp);
          
          // Log the healing action separately
          roundActions.push({
            actor: unit.name,
            skill: `${selectedSkill.name} - Healing Effect`,
            target: healTarget.name,
            damage: -healAmount, // Negative damage indicates healing
            isCritical: false,
            healing: true,
            message: `${unit.name} healed ${healTarget.name} for ${healAmount} HP!`
          });
        }
        
        // Check if target is defeated
        if (target.hp <= 0) {
          // Special case handling for final bosses and last allies
          const isBoss = target.name.includes('Boss');
          const isLastEnemy = aliveEnemies.length === 1 && aliveEnemies[0] === target;
          const isLastAlly = aliveAllies.length === 1 && aliveAllies[0] === target;
          const isFinalStage = currentStage === TOTAL_STAGES;
          
          if (isAlly && isLastEnemy && isBoss && !isFinalStage) {
            // Let boss survive with 1 HP if it's not the final stage
            target.hp = 1;
            battleLog.push({
              type: 'system_message',
              message: `${target.name} is critically injured but refuses to fall!`,
            });
          } else if (!isAlly && isLastAlly && isFinalStage) {
            // Last stand for player in final stage
            const healAmount = Math.ceil(target.maxHp * 0.1); // 10% health revival
            target.hp = healAmount;
            
            battleLog.push({
              type: 'system_message',
              message: `In a final desperate effort, ${target.name} regains consciousness with ${healAmount} HP!`,
            });
            
            roundActions.push({
              actor: 'System',
              skill: 'Last Stand',
              target: target.name,
              damage: -healAmount, // Negative damage indicates healing
              isCritical: false,
              healing: true,
              message: `${target.name} refuses to give up, recovering with ${healAmount} HP!`
            });
          } else {
            // Normal defeat processing
            if (isAlly) {
              aliveEnemies = aliveEnemies.filter(e => e !== target);
            } else {
              aliveAllies = aliveAllies.filter(a => a !== target);
            }
            
            roundActions.push({
              type: 'defeat',
              actor: 'System',
              skill: 'Defeat',
              target: target.name,
              damage: 0,
              isCritical: false,
              message: `${target.name} has been defeated!`
            });
          }
        }
      }
    } else {
      // If no units are ready to act, force a minimal action to ensure battle progresses
      // This is a safety mechanism to prevent stalled battles
      if (aliveAllies.length > 0 && aliveEnemies.length > 0) {
        // Choose units with highest attack meters from each side
        aliveAllies.sort((a, b) => b.attackMeter - a.attackMeter);
        aliveEnemies.sort((a, b) => b.attackMeter - a.attackMeter);
        
        const ally = aliveAllies[0];
        const enemy = aliveEnemies[0];
        
        // Ally attacks first with a simple attack
        const allyDamage = Math.floor(ally.stats.attack * 0.8); // Reduced damage for forced action
        enemy.hp = Math.max(0, enemy.hp - allyDamage);
        
        roundActions.push({
          actor: ally.name,
          skill: "Quick Strike",
          target: enemy.name,
          damage: allyDamage,
          isCritical: false,
          message: `${ally.name} makes a quick strike at ${enemy.name} for ${allyDamage} damage!`
        });
        
        // Check if enemy is defeated
        if (enemy.hp <= 0) {
          if (aliveEnemies.length === 1 && enemy.name.includes('Boss') && currentStage < TOTAL_STAGES) {
            // Let boss survive with 1 HP
            enemy.hp = 1;
          } else {
            aliveEnemies = aliveEnemies.filter(e => e !== enemy);
            roundActions.push({
              type: 'defeat',
              actor: 'System',
              skill: 'Defeat',
              target: enemy.name,
              damage: 0,
              isCritical: false,
              message: `${enemy.name} has been defeated!`
            });
          }
        }
        
        // If enemies still alive, enemy counterattacks
        if (aliveEnemies.length > 0 && aliveAllies.length > 0) {
          // Use the first enemy if the original target was defeated
          const attacker = aliveEnemies[0];
          const enemyDamage = Math.floor(attacker.stats.attack * 0.7); // Reduced damage for forced action
          ally.hp = Math.max(0, ally.hp - enemyDamage);
          
          roundActions.push({
            actor: attacker.name,
            skill: "Counter Attack",
            target: ally.name,
            damage: enemyDamage,
            isCritical: false,
            message: `${attacker.name} counters, striking ${ally.name} for ${enemyDamage} damage!`
          });
          
          // Check if ally is defeated
          if (ally.hp <= 0) {
            if (aliveAllies.length === 1) {
              // Emergency resurrection with 25% health for last ally
              const healAmount = Math.ceil(ally.maxHp * 0.25);
              ally.hp = healAmount;
              
              roundActions.push({
                actor: 'System',
                skill: 'Emergency Recovery',
                target: ally.name,
                damage: -healAmount,
                isCritical: false,
                healing: true,
                message: `${ally.name} recovered with ${healAmount} HP through sheer will!`
              });
            } else {
              aliveAllies = aliveAllies.filter(a => a !== ally);
              roundActions.push({
                type: 'defeat',
                actor: 'System',
                skill: 'Defeat',
                target: ally.name,
                damage: 0,
                isCritical: false,
                message: `${ally.name} has been defeated!`
              });
            }
          }
        }
      }
    }
    
    // Record round results in battle log
    battleLog.push({
      type: 'round',
      number: currentRound,
      actions: roundActions,
      remainingAllies: aliveAllies.length,
      remainingEnemies: aliveEnemies.length
    });
    
    // Check if stage is complete (all enemies defeated)
    if (aliveEnemies.length === 0) {
      stageBattleComplete = true;
    }
  }
  
  // Record battle outcome
  const victory = aliveEnemies.length === 0;
  
  // Progress to next stage if victorious
  if (victory && currentStage < TOTAL_STAGES) {
    currentStage++;
    
    // Create enemies for next stage (harder)
    const newEnemies: BattleUnit[] = [];
    const nextStageDifficulty = run.dungeonLevel + currentStage - 1;
    const nextStageEnemyCount = Math.min(3, Math.floor(nextStageDifficulty / 2) + 1);
    
    for (let i = 0; i < nextStageEnemyCount; i++) {
      const type = (i === nextStageEnemyCount - 1 && currentStage === TOTAL_STAGES) ? 'Boss' : 'Minion';
      // Ensure vitality is always positive
      const vitality = Math.max(10, type === 'Boss' ? 
        250 + (nextStageDifficulty * 25) : 
        90 + (nextStageDifficulty * 12));
      
      const healthPoints = vitality * 8;  // Multiply vitality by 8 for HP
      // Ensure HP is never negative
      const safeHealthPoints = Math.max(1, healthPoints);
      
      newEnemies.push({
        id: `enemy_stage${currentStage}_${i}`,
        name: `${type} ${i + 1} (Stage ${currentStage})`,
        hp: safeHealthPoints,
        maxHp: safeHealthPoints,
        stats: {
          attack: 45 + (nextStageDifficulty * 6),
          vitality: vitality,
          speed: type === 'Boss' ? 40 + (nextStageDifficulty * 2) : 50 + (nextStageDifficulty * 3)
        },
        skills: {
          basic: { name: 'Enemy Attack', damage: 1.0 },
          advanced: type === 'Boss' ? { name: 'Boss Strike', damage: 1.8, cooldown: 3 } : null,
          ultimate: type === 'Boss' ? { name: 'Boss Ultimate', damage: 2.5, cooldown: 5 } : null
        },
        attackMeter: 0,
        advancedSkillCooldown: 0,
        ultimateSkillCooldown: 0,
        statusEffects: []
      });
    }
    
    // Record progress to next stage
    battleLog.push({
      type: 'stage_progress',
      currentStage,
      totalStages: TOTAL_STAGES,
      message: currentStage === TOTAL_STAGES ? 
        'Your party advances to the final stage!' : 
        `Your party advances to stage ${currentStage} of ${TOTAL_STAGES}.`,
      aliveAllies,
      newEnemies: newEnemies
    });
    
    // Set up next stage battle
    aliveEnemies = [...newEnemies];
    
    // Reset skill cooldowns or reduce them for the next stage
    aliveAllies.forEach(ally => {
      // Reduce cooldowns by 1 when progressing to next stage (minimum 0)
      ally.advancedSkillCooldown = Math.max(0, ally.advancedSkillCooldown - 1);
      ally.ultimateSkillCooldown = Math.max(0, ally.ultimateSkillCooldown - 1);
      
      // Clear status effects between stages
      ally.statusEffects = [];
    });
    
    // Continue battle simulation for next stage (recursive call)
    const nextStageBattleLog = await generateBattleLog({
      ...run,
      characterIds: aliveAllies.map(a => a.id),
      dungeonLevel: nextStageDifficulty,
      _stage: currentStage, // Internal tracking for recursive stages
      _allies: aliveAllies // Pass along surviving allies
    }, success);
    
    // Combine logs
    return [...battleLog, ...nextStageBattleLog];
  }
  
  // Final battle outcome for this stage
  battleLog.push({
    type: 'battle_end',
    victory,
    totalRounds: currentRound,
    currentStage,
    totalStages: TOTAL_STAGES,
    completedStages: victory ? currentStage : currentStage - 1,
    survivingAllies: aliveAllies.map(a => a.name),
    summary: victory && currentStage === TOTAL_STAGES ? 
      `Complete victory! You conquered all ${TOTAL_STAGES} stages of the dungeon!` : 
      victory ? `Victory at stage ${currentStage} of ${TOTAL_STAGES}!` : 
      `Defeat at stage ${currentStage} of ${TOTAL_STAGES} after ${currentRound} rounds of combat.`
  });
  
  // ENHANCED LOGGING FOR DEBUGGING
  console.log("======= BATTLE SYSTEM: COMPLETE =======");
  console.log(`Battle completed with ${battleLog.length} log entries`);
  console.log(`Final outcome: ${victory ? 'Victory' : 'Defeat'}`);
  console.log(`Stages completed: ${currentStage}/${TOTAL_STAGES}`);
  console.log(`Allies remaining: ${aliveAllies.length}`);
  console.log(`First few battle log entries:`, battleLog.slice(0, 3).map(entry => entry.type));
  
  return battleLog;
}