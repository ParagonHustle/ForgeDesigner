/**
 * New Battle System for The Forge
 * Deterministic implementation with improved architecture
 */

/**
 * Random Number Generator with seeding for deterministic results
 * This ensures dungeons always generate the same results when viewed multiple times
 */
class DeterministicRandom {
  private seed: number;
  private m: number = 2147483647;  // 2^31 - 1
  private a: number = 16807;       // 7^5
  private c: number = 0;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Linear Congruential Generator formula: (a * seed + c) % m
  next(): number {
    this.seed = (this.a * this.seed + this.c) % this.m;
    return this.seed / this.m; // Normalize to [0, 1)
  }

  // Get random integer between min (inclusive) and max (exclusive)
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min) + min);
  }

  // Random boolean with probability
  nextBool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}

// Global dungeon RNG
let dungeonRNG: DeterministicRandom;

/**
 * Type definitions for the battle system
 */

// Status effect applied to units in battle
export interface StatusEffect {
  name: string;           // Display name of the effect
  type: string;           // Effect type (burn, poison, slow, weaken, etc.)
  value: number;          // Magnitude of the effect
  duration: number;       // Remaining turns/actions
  source?: string;        // Source of the effect (character/skill name)
}

// Core battle unit (character or enemy)
export interface BattleUnit {
  id: string;             // Unique identifier 
  name: string;           // Display name
  hp: number;             // Current health points
  maxHp: number;          // Maximum health points
  attackMeter: number;    // Current attack meter progress (0-100)
  
  // Base stats
  stats: {
    attack: number;       // Base attack power
    vitality: number;     // Base vitality (affects max HP)
    speed: number;        // Base speed (affects attack meter fill rate)
    [key: string]: number; // Additional stats
  };
  
  // Combat skills
  skills: {
    basic: BattleSkill;   // Always available skill
    advanced: BattleSkill | null; // Skill with moderate cooldown
    ultimate: BattleSkill | null; // Powerful skill with long cooldown
    [key: string]: BattleSkill | null; // Additional skills
  };
  
  // Optional bonuses from auras
  auraBonus?: {
    attack: number;       // % bonus to attack
    vitality: number;     // % bonus to vitality
    speed: number;        // % bonus to speed
    focus?: number;       // % bonus to critical chance
    accuracy?: number;    // % reduction in miss chance
    defense?: number;     // % reduction in damage taken
    resilience?: number;  // % resistance to status effects
    element?: string;     // Elemental affinity
    [key: string]: any;   // Other bonuses
  } | null;
  
  // Gameplay state tracking
  advancedSkillCooldown: number;  // Turns until advanced skill is available
  ultimateSkillCooldown: number;  // Turns until ultimate skill is available
  statusEffects: StatusEffect[];  // Active status effects on this unit
}

// Skill definition
export interface BattleSkill {
  name: string;           // Display name
  damage: number;         // Base damage/healing value
  cooldown?: number;      // Turns between uses
  special?: string;       // Special effect type
  aoe?: boolean;          // Whether it hits multiple targets
}

// Combat action performed in battle
export interface BattleAction {
  actor: string;          // Name of the unit performing the action
  skill: string;          // Name of the skill used
  target: string;         // Name of the target unit
  damage: number;         // Amount of damage/healing done
  isCritical: boolean;    // Whether the hit was critical
  healing?: boolean;      // Whether this is a healing action
  message?: string;       // Display message for this action
  type?: string;          // Action type (attack, status, defeat, etc.)
}

// Battle log entry types
export interface BattleEvent {
  type: string;           // Event type (round, system_message, etc.)
  timestamp?: number;     // When this event occurred
  
  // Round-specific properties
  number?: number;            // Round number (when type === 'round')
  actions?: BattleAction[];   // Array of actions in this round
  remainingAllies?: number;   // Number of allies still alive after round
  remainingEnemies?: number;  // Number of enemies still alive after round
  
  // Stage progress properties
  allies?: BattleUnit[];      // All allies in battle
  enemies?: BattleUnit[];     // All enemies in battle
  currentStage?: number;      // Current dungeon stage
  totalStages?: number;       // Total stages in dungeon
  message?: string;           // Display message
  victory?: boolean;          // Whether the battle/stage was won
  summary?: string;           // Battle summary
  
  // System message
  system_message?: string;    // System message to display
  
  // Any other properties
  [key: string]: any;
}

/**
 * Generates appropriate enemy units based on dungeon level and current stage
 * @param dungeonLevel The level of the dungeon
 * @param element The elemental type of the dungeon
 * @param numEnemies The number of enemies to generate
 * @param currentStage The current stage number
 * @param totalStages The total number of stages in the dungeon
 * @returns Array of generated enemy units
 */
function generateEnemies(
  dungeonLevel: number, 
  element: string = 'neutral', 
  numEnemies: number = 3,
  currentStage: number = 1, 
  totalStages: number = 3
): BattleUnit[] {
  const enemies: BattleUnit[] = [];
  
  // Calculate stage progression and difficulty scaling
  // Difficulty increases as stages progress
  const stageProgress = currentStage / totalStages;
  const stageDifficultyMod = 1 + (stageProgress * 0.7); // 1.23 for stage 1/3, 1.47 for stage 2/3, 1.7 for stage 3/3
  
  // Scale base stats based on dungeon level and current stage
  const baseAttack = (8 + Math.floor(dungeonLevel * 1.5)) * stageDifficultyMod;
  const baseVitality = (10 + Math.floor(dungeonLevel * 1.4)) * stageDifficultyMod;
  const baseSpeed = (10 + Math.floor(dungeonLevel * 0.7)) * stageDifficultyMod;
  const baseHP = baseVitality * 8;
  
  // Potentially increase enemy count in later stages
  let actualNumEnemies = numEnemies;
  if (currentStage >= Math.ceil(totalStages * 0.7)) {
    // For the final 30% of stages, add an additional enemy (if we're not already at max)
    actualNumEnemies = Math.min(numEnemies + 1, 3);
  }
  
  // Generate enemies
  for (let i = 0; i < actualNumEnemies; i++) {
    // Determine enemy type - make the last enemy stronger
    // Define boss and elite criteria properly - only do this once with proper hierarchy
    const isFinalBoss = (currentStage === totalStages && i === actualNumEnemies - 1);
    const isStageBoss = (!isFinalBoss && i === actualNumEnemies - 1);
    const isElite = (!isFinalBoss && !isStageBoss && stageProgress > 0.5 && i === actualNumEnemies - 2);
    
    // Define enemy name based on type and element
    let enemyName = '';
    if (element === 'fire') {
      enemyName = isFinalBoss ? 'Infernal Overlord' : 
                 isStageBoss ? 'Flame Commander' :
                 isElite ? 'Flame Sentinel' : 'Fire Imp';
    } else if (element === 'ice') {
      enemyName = isFinalBoss ? 'Glacial Titan' :
                 isStageBoss ? 'Frost Lord' :
                 isElite ? 'Frost Giant' : 'Ice Elemental';
    } else if (element === 'nature') {
      enemyName = isFinalBoss ? 'Ancient Elderwood' :
                 isStageBoss ? 'Elder Treant' :
                 isElite ? 'Ancient Treant' : 'Thorn Beast';
    } else if (element === 'shadow') {
      enemyName = isFinalBoss ? 'Void Harbinger' :
                 isStageBoss ? 'Shadow Master' :
                 isElite ? 'Shadow Fiend' : 'Void Wraith';
    } else if (element === 'arcane') {
      enemyName = isFinalBoss ? 'Archmage Construct' :
                 isStageBoss ? 'Arcane Overseer' :
                 isElite ? 'Arcane Golem' : 'Magic Construct';
    } else {
      enemyName = isFinalBoss ? 'Dungeon Overlord' :
                 isStageBoss ? 'Dungeon Master' :
                 isElite ? 'Dungeon Guardian' : 'Dungeon Creature';
    }
    
    // Apply enemy strength multipliers
    const regularMultiplier = 1.0;
    const eliteMultiplier = isElite ? 1.5 : regularMultiplier;
    const stageBossMultiplier = isStageBoss ? 1.8 : eliteMultiplier;
    const finalBossMultiplier = isFinalBoss ? 2.2 : stageBossMultiplier;
    
    // Use the highest applicable multiplier
    const strengthMultiplier = isFinalBoss ? finalBossMultiplier : 
                               isStageBoss ? stageBossMultiplier : 
                               isElite ? eliteMultiplier : 
                               regularMultiplier;
    
    // Add stage number indicator ONLY for the final boss
    if (isFinalBoss) {
      enemyName = `Stage ${currentStage} ${enemyName}`;
    }
    
    // For regular stage bosses, just add the stage number
    if (isStageBoss) {
      enemyName = `${enemyName} (Stage ${currentStage})`;
    }
    
    // Create the enemy unit
    const enemy: BattleUnit = {
      id: `enemy-${i}`,
      name: enemyName,
      hp: Math.floor(baseHP * strengthMultiplier),
      maxHp: Math.floor(baseHP * strengthMultiplier),
      attackMeter: 0,
      stats: {
        attack: Math.floor(baseAttack * strengthMultiplier),
        vitality: Math.floor(baseVitality * strengthMultiplier),
        speed: Math.floor(baseSpeed * (isFinalBoss ? 1.1 : isStageBoss ? 1.0 : isElite ? 0.9 : 1.0)) 
      },
      skills: {
        basic: {
          name: isFinalBoss ? 'Devastating Strike' : 
                isStageBoss ? 'Powerful Strike' :
                isElite ? 'Strong Strike' : 'Strike',
          damage: Math.floor(baseAttack * 0.9 * strengthMultiplier)
        },
        advanced: (isElite || isStageBoss || stageProgress > 0.3) ? {
          name: `${element.charAt(0).toUpperCase() + element.slice(1)} Blast`,
          damage: Math.floor(baseAttack * 1.5 * strengthMultiplier),
          cooldown: 3
        } : null,
        ultimate: isFinalBoss ? {
          name: 'Annihilation',
          damage: Math.floor(baseAttack * 3.0 * strengthMultiplier),
          cooldown: 4
        } : isStageBoss ? {
          name: 'Overwhelming Force',
          damage: Math.floor(baseAttack * 2.5 * strengthMultiplier),
          cooldown: 5
        } : isElite ? {
          name: 'Powerful Attack',
          damage: Math.floor(baseAttack * 2.0 * strengthMultiplier),
          cooldown: 6
        } : null
      },
      advancedSkillCooldown: 0,
      ultimateSkillCooldown: 0,
      statusEffects: []
    };
    
    enemies.push(enemy);
  }
  
  console.log(`Created ${enemies.length} enemies for stage ${currentStage}/${totalStages}, difficulty mod: ${stageDifficultyMod.toFixed(2)}`);
  
  return enemies;
}

/**
 * Calculate whether an attack is a critical hit
 * @param attacker The attacking unit
 * @returns boolean indicating critical hit
 */
function isCriticalHit(attacker: BattleUnit): boolean {
  // Base critical chance (5%)
  let criticalChance = 5;
  
  // Apply focus bonus if available
  if (attacker.auraBonus?.focus) {
    criticalChance += attacker.auraBonus.focus;
  }
  
  // Cap critical chance at 30%
  criticalChance = Math.min(30, criticalChance);
  
  // Determine if critical hit occurs with deterministic RNG
  return dungeonRNG.next() * 100 < criticalChance;
}

/**
 * Calculate actual damage after applying critical hits and defenses
 * @param attacker The attacking unit
 * @param defender The defending unit
 * @param skill The skill being used
 * @returns Object containing damage and critical hit status
 */
function calculateDamage(attacker: BattleUnit, defender: BattleUnit, skill: BattleSkill): { damage: number, isCritical: boolean } {
  // Check for critical hit
  const critical = isCriticalHit(attacker);
  
  // Base damage from skill
  let damage = skill.damage;
  
  // Apply critical multiplier if applicable
  if (critical) {
    damage = Math.floor(damage * 1.5);
  }
  
  // Apply defender's defense if available
  if (defender.auraBonus?.defense) {
    const damageReduction = defender.auraBonus.defense / 100;
    damage = Math.floor(damage * (1 - Math.min(0.5, damageReduction))); // Cap damage reduction at 50%
  }
  
  // Ensure minimum damage of 1
  damage = Math.max(1, damage);
  
  return { damage, isCritical: critical };
}

/**
 * Process a single round of battle
 * @param allies List of ally units
 * @param enemies List of enemy units
 * @param roundNumber The current round number
 * @returns A battle event containing the round's actions
 */
function processRound(allies: BattleUnit[], enemies: BattleUnit[], roundNumber: number): BattleEvent {
  const actions: BattleAction[] = [];
  
  // Get all living units
  const livingAllies = allies.filter(unit => unit.hp > 0);
  const livingEnemies = enemies.filter(unit => unit.hp > 0);
  
  // If either side is defeated, end the round immediately
  if (livingAllies.length === 0 || livingEnemies.length === 0) {
    return {
      type: 'round',
      number: roundNumber,
      actions: [],
      remainingAllies: livingAllies.length,
      remainingEnemies: livingEnemies.length,
      timestamp: Date.now()
    };
  }
  
  // For simplicity, each living ally attacks a random living enemy
  for (const ally of livingAllies) {
    // Skip if no living enemies remain
    if (livingEnemies.length === 0) break;
    
    // Select a random living enemy using deterministic RNG
    const targetIndex = dungeonRNG.nextInt(0, livingEnemies.length);
    const target = livingEnemies[targetIndex];
    
    // Determine which skill to use (simple implementation)
    let skill = ally.skills.basic;
    
    // Try to use ultimate skill if available
    if (ally.skills.ultimate && ally.ultimateSkillCooldown === 0) {
      skill = ally.skills.ultimate;
      ally.ultimateSkillCooldown = skill.cooldown || 5;
    } 
    // Try to use advanced skill if available
    else if (ally.skills.advanced && ally.advancedSkillCooldown === 0) {
      skill = ally.skills.advanced;
      ally.advancedSkillCooldown = skill.cooldown || 3;
    }
    
    // Calculate damage
    const { damage, isCritical } = calculateDamage(ally, target, skill);
    
    // Apply damage to target
    target.hp = Math.max(0, target.hp - damage);
    
    // Record the action
    actions.push({
      actor: ally.name,
      skill: skill.name,
      target: target.name,
      damage,
      isCritical
    });
    
    // Remove target from living enemies if defeated
    if (target.hp <= 0) {
      livingEnemies.splice(targetIndex, 1);
    }
  }
  
  // For simplicity, each living enemy attacks a random living ally
  for (const enemy of enemies.filter(unit => unit.hp > 0)) {
    // Skip if no living allies remain
    if (livingAllies.length === 0) break;
    
    // Select a random living ally using deterministic RNG
    const targetIndex = dungeonRNG.nextInt(0, livingAllies.length);
    const target = livingAllies[targetIndex];
    
    // Determine which skill to use (simple implementation)
    let skill = enemy.skills.basic;
    
    // Try to use ultimate skill if available
    if (enemy.skills.ultimate && enemy.ultimateSkillCooldown === 0) {
      skill = enemy.skills.ultimate;
      enemy.ultimateSkillCooldown = skill.cooldown || 5;
    } 
    // Try to use advanced skill if available
    else if (enemy.skills.advanced && enemy.advancedSkillCooldown === 0) {
      skill = enemy.skills.advanced;
      enemy.advancedSkillCooldown = skill.cooldown || 3;
    }
    
    // Calculate damage
    const { damage, isCritical } = calculateDamage(enemy, target, skill);
    
    // Apply damage to target
    target.hp = Math.max(0, target.hp - damage);
    
    // Record the action
    actions.push({
      actor: enemy.name,
      skill: skill.name,
      target: target.name,
      damage,
      isCritical
    });
    
    // Remove target from living allies if defeated
    if (target.hp <= 0) {
      livingAllies.splice(targetIndex, 1);
    }
  }
  
  // Decrement cooldowns
  for (const unit of [...allies, ...enemies]) {
    if (unit.advancedSkillCooldown > 0) unit.advancedSkillCooldown--;
    if (unit.ultimateSkillCooldown > 0) unit.ultimateSkillCooldown--;
  }
  
  // Return the round event
  return {
    type: 'round',
    number: roundNumber,
    actions,
    remainingAllies: livingAllies.length,
    remainingEnemies: livingEnemies.length,
    timestamp: Date.now()
  };
}

/**
 * Primary function to generate a battle log for a dungeon run
 * @param run The dungeon run data including characters and dungeon info
 * @param success Whether the run is predetermined to succeed
 * @returns A complete battle log with all events
 */
export async function generateBattleLog(run: any, success: boolean): Promise<BattleEvent[]> {
  console.log('Generating battle log for run:', run.id);
  console.log('Success preset:', success);
  
  // Initialize deterministic random generator with a seed based on dungeon run ID and creation time
  // This ensures the same dungeon will always generate the same battle sequence
  const seed = run.id * 1000 + (new Date(run.createdAt || Date.now()).getTime() % 1000);
  dungeonRNG = new DeterministicRandom(seed);
  console.log(`Initialized deterministic RNG with seed: ${seed}`);
  
  // Create an empty battle log
  const battleLog: BattleEvent[] = [];
  
  // Add initialization message
  battleLog.push({
    type: 'system_message',
    message: 'Initializing battle system...',
    timestamp: Date.now()
  });
  
  // Extract allies from the run (this should be from _allies prepared in the routes file)
  const allies = run._allies || [];
  
  // If no allies, add an error message and return
  if (allies.length === 0) {
    battleLog.push({
      type: 'system_message',
      message: 'No characters found for this dungeon run.',
      timestamp: Date.now()
    });
    return battleLog;
  }
  
  // Determine dungeon parameters
  const dungeonLevel = run.dungeonLevel || 1;
  const dungeonElement = run.element || 'neutral';
  
  // Create enemies based on dungeon level (adjust number based on ally count)
  const numEnemies = Math.min(5, Math.max(2, allies.length));
  // Determine total stages 
  const totalStages = run.totalStages || 3; // Default to 3 stages if not specified
  // Generate enemies for first stage
  const enemies = generateEnemies(dungeonLevel, dungeonElement, numEnemies, 1, totalStages);
  
  // Add battle start event
  battleLog.push({
    type: 'battle_start',
    allies,
    enemies,
    message: `A battle begins in a level ${dungeonLevel} ${dungeonElement} dungeon!`,
    timestamp: Date.now()
  });
  
  // Determine number of rounds based on success/failure and force the outcome if needed
  const maxRounds = 10; // Maximum number of rounds to simulate
  let roundNumber = 1;
  
  // If success is predetermined but unlikely with fair battle, boost allies
  if (success) {
    allies.forEach(ally => {
      ally.stats.attack = Math.floor(ally.stats.attack * 1.2); // Boost attack by 20%
      ally.hp = ally.maxHp; // Ensure full health
    });
  }
  
  // If failure is predetermined but unlikely with fair battle, boost enemies
  if (!success) {
    enemies.forEach(enemy => {
      enemy.stats.attack = Math.floor(enemy.stats.attack * 1.3); // Boost attack by 30%
    });
  }
  
  // Simulate battle rounds
  let battleOngoing = true;
  while (battleOngoing && roundNumber <= maxRounds) {
    // Process the round
    const roundEvent = processRound(allies, enemies, roundNumber);
    battleLog.push(roundEvent);
    
    // Check if battle is over
    if (roundEvent.remainingAllies === 0 || roundEvent.remainingEnemies === 0) {
      battleOngoing = false;
    }
    
    // Move to next round
    roundNumber++;
  }
  
  // Force the outcome if it doesn't match the predetermined result
  let livingAllies = allies.filter(unit => unit.hp > 0);
  const livingEnemies = enemies.filter(unit => unit.hp > 0);
  
  const actualSuccess = livingEnemies.length === 0;
  
  // If the outcome doesn't match the predetermined result, add a twist
  if (actualSuccess !== success) {
    if (success) {
      // Force a success by defeating remaining enemies
      battleLog.push({
        type: 'system_message',
        message: 'A mysterious energy surges through your party, giving them renewed strength!',
        timestamp: Date.now()
      });
      
      // Final heroic round
      livingEnemies.forEach(enemy => {
        // Defeat enemy
        enemy.hp = 0;
        
        // Random ally lands the finishing blow using deterministic RNG
        const randomAlly = livingAllies[dungeonRNG.nextInt(0, livingAllies.length)];
        
        battleLog.push({
          type: 'round',
          number: roundNumber++,
          actions: [{
            actor: randomAlly.name,
            skill: 'Heroic Surge',
            target: enemy.name,
            damage: enemy.maxHp,
            isCritical: true,
            message: `${randomAlly.name} delivers a devastating final blow!`
          }],
          remainingAllies: livingAllies.length,
          remainingEnemies: 0,
          timestamp: Date.now()
        });
      });
    } else {
      // Force a failure with a surprise attack
      battleLog.push({
        type: 'system_message',
        message: 'The dungeon reveals a hidden trap!',
        timestamp: Date.now()
      });
      
      // Defeat all allies with a trap
      livingAllies.forEach(ally => {
        ally.hp = 0;
      });
      
      battleLog.push({
        type: 'round',
        number: roundNumber++,
        actions: [{
          actor: 'Dungeon Trap',
          skill: 'Deadly Mechanism',
          target: 'Party',
          damage: 9999,
          isCritical: true,
          message: 'A hidden mechanism activates, overwhelming the entire party!'
        }],
        remainingAllies: 0,
        remainingEnemies: livingEnemies.length,
        timestamp: Date.now()
      });
    }
  }
  
  // Set up multi-stage dungeon progression using totalStages declared above
  let currentStage = 1;
  let stagesCompleted = 0;
  let partyDefeated = livingAllies.length === 0;
  
  console.log(`[STAGE SETUP] Starting dungeon with ${totalStages} total stages`);
  console.log(`[STAGE SETUP] Initial living allies: ${livingAllies.length}`);
  console.log(`[STAGE SETUP] Party defeated status: ${partyDefeated}`);
  
  // Process all stages of the dungeon
  if (!partyDefeated) {
    console.log(`[DUNGEON] Starting to process all dungeon stages (Total: ${totalStages})`);
    
    // First stage has just been simulated above - check if it was successful
    const firstStageEnemiesRemaining = enemies.filter(unit => unit.hp > 0).length;
    
    if (firstStageEnemiesRemaining === 0) {
      // First stage was successful
      console.log(`[STAGE ${currentStage}] First stage successfully completed`);
      stagesCompleted++;
      
      // Add stage completion event
      battleLog.push({
        type: 'stage_complete',
        currentStage,
        totalStages,
        message: `Stage ${currentStage} completed! Preparing for the next challenge...`,
        aliveAllies: livingAllies,
        timestamp: Date.now()
      });
    } else {
      console.log(`[STAGE ${currentStage}] First stage incomplete - enemies remaining: ${firstStageEnemiesRemaining}`);
      console.log(`[STAGE ${currentStage}] Living allies: ${livingAllies.length}`);
      
      // Add battle event indicating first stage isn't complete yet
      battleLog.push({
        type: 'system_message',
        message: `The battle continues with the first stage...`,
        timestamp: Date.now()
      });
      
      // Don't proceed to next stage since first stage isn't complete
      partyDefeated = true;
    }
    
    // Process additional stages if first stage was successful
    while (currentStage < totalStages && !partyDefeated) {
      currentStage++;
      
      // Generate new enemies for this stage (with appropriate difficulty scaling)
      const stageEnemies = generateEnemies(
        dungeonLevel + Math.floor(currentStage / 2), 
        dungeonElement,
        numEnemies,
        currentStage,  // Pass current stage number
        totalStages    // Pass total stages
      );
      
      // Add stage start event
      battleLog.push({
        type: 'stage_start',
        currentStage,
        totalStages,
        enemies: stageEnemies,
        message: `Stage ${currentStage} begins! New enemies approach...`,
        timestamp: Date.now()
      });
      
      // Reset existing enemies for the battle simulation
      enemies.length = 0;
      stageEnemies.forEach(enemy => enemies.push(enemy));
      
      // Simulate battle for this stage
      battleOngoing = true;
      roundNumber = 1;
      
      while (battleOngoing && roundNumber <= maxRounds) {
        // Process the round
        const roundEvent = processRound(livingAllies, enemies, roundNumber);
        battleLog.push(roundEvent);
        
        // Check battle status after the round
        console.log(`[STAGE ${currentStage}] Round ${roundNumber}: ${roundEvent.remainingAllies} allies vs ${roundEvent.remainingEnemies} enemies`);
        
        // Check if battle is over
        if (roundEvent.remainingAllies === 0 || roundEvent.remainingEnemies === 0) {
          console.log(`[STAGE ${currentStage}] Battle ended after round ${roundNumber}`);
          battleOngoing = false;
        }
        
        // Move to next round
        roundNumber++;
      }
      
      // If battle reached max rounds limit without resolution
      if (battleOngoing && roundNumber > maxRounds) {
        console.log(`[STAGE ${currentStage}] Battle reached max rounds (${maxRounds}) without resolution`);
      }
      
      // Update living allies and enemies after this stage
      const updatedLivingAllies = livingAllies.filter(unit => unit.hp > 0);
      const updatedLivingEnemies = enemies.filter(unit => unit.hp > 0);
      
      console.log(`[STAGE ${currentStage}] After battle: ${updatedLivingAllies.length} allies alive, ${updatedLivingEnemies.length} enemies alive`);
      
      // Check if party defeated
      if (updatedLivingAllies.length === 0) {
        partyDefeated = true;
        console.log(`[STAGE ${currentStage}] Party defeated, ending dungeon progression`);
        
        // Add defeat message
        battleLog.push({
          type: 'system_message',
          message: `Your party has been defeated at stage ${currentStage}!`,
          timestamp: Date.now()
        });
      } 
      // Check if stage cleared
      else if (updatedLivingEnemies.length === 0) {
        // Stage completed
        stagesCompleted++;
        console.log(`[STAGE ${currentStage}] Stage completed! Stages completed: ${stagesCompleted}/${totalStages}`);
        
        // Add stage completion event
        battleLog.push({
          type: 'stage_complete',
          currentStage,
          totalStages,
          message: `Stage ${currentStage} completed!${currentStage === totalStages ? ' You have conquered the dungeon!' : ' Preparing for the next challenge...'}`,
          aliveAllies: updatedLivingAllies, // Pass the updated allies array
          timestamp: Date.now()
        });
        
        // IMPORTANT FIX: Replace the livingAllies array for the next stage
        // This ensures living allies are properly tracked between stages
        livingAllies = [...updatedLivingAllies];
        
        // No HP restoration between stages as requested
        console.log(`[STAGE ${currentStage}] ${livingAllies.length} allies preparing for next stage`);
      } else {
        // Something unexpected happened - both allies and enemies still alive after max rounds
        console.log(`[STAGE ${currentStage}] WARNING: Battle ended without clear victor after max rounds`);
        console.log(`[STAGE ${currentStage}] ${updatedLivingAllies.length} allies vs ${updatedLivingEnemies.length} enemies`);
      }
    }
  }
  
  // Scale rewards based on stages completed
  const rewardMultiplier = Math.max(0.3, stagesCompleted / totalStages);
  
  // Add final battle end event with all stages information
  const victorious = success; // Use the predetermined outcome
  
  console.log(`[BATTLE END] Stages completed: ${stagesCompleted}/${totalStages}`);
  console.log(`[BATTLE END] Living allies remaining: ${livingAllies.length}`);
  console.log(`[BATTLE END] Party defeated status: ${partyDefeated}`);
  console.log(`[BATTLE END] Predetermined outcome (success): ${success}`);
  
  // Override stages completed if needed to ensure the success outcome
  if (victorious && stagesCompleted < totalStages && !partyDefeated) {
    console.log(`[BATTLE END] Overriding stages completed from ${stagesCompleted} to ${totalStages} to match predetermined success`);
    stagesCompleted = totalStages;
  }
  
  battleLog.push({
    type: 'battle_end',
    victory: victorious,
    completedStages: stagesCompleted,
    totalStages,
    rewardMultiplier,
    summary: victorious
      ? `Victory! Your party completed ${stagesCompleted} of ${totalStages} stages.`
      : `Defeat! Your party completed ${stagesCompleted} of ${totalStages} stages before being overwhelmed.`,
    timestamp: Date.now()
  });
  
  return battleLog;
}