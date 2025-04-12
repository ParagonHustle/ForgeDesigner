import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ScrollText, 
  Swords, 
  Shield, 
  Zap, 
  Play, 
  Pause, 
  Forward, 
  RotateCcw, 
  BarChart4, 
  Heart,
  Sparkles,
  Circle,
  Scissors,
  Beaker,
  Clock,
  BookOpen
} from 'lucide-react';

interface BattleLogProps {
  isOpen: boolean;
  onClose: () => void;
  battleLog: any[];
}

interface BattleSkill {
  id: string;
  name: string;
  damage?: number;
  cooldown: number;
  currentCooldown?: number;
  icon: string;
  description: string;
  type: 'attack' | 'heal' | 'buff' | 'debuff' | 'special';
  targetType: 'enemy' | 'ally' | 'self' | 'all';
}

interface BattleCombatant {
  id: string | number;
  name: string;
  hp: number;
  maxHp: number;
  attackSpeed: number; // Lower is faster
  attackTimer: number; // Current timer countdown
  skills: BattleSkill[];
  position: number; // 0-based index in formation
  type: 'character' | 'enemy';
  stats: {
    attack: number;
    defense: number;
    accuracy: number;
    speed: number;
  };
}

interface BattleState {
  characters: BattleCombatant[];
  enemies: BattleCombatant[];
  currentTurn: number;
  isActive: boolean;
  actionLog: any[];
  battleLogs: string[];
}

interface CombatStats {
  damageDealt: number;
  damageReceived: number;
  healingReceived: number;
  criticalHits: number;
  dodges: number;
  specialAbilitiesUsed: number;
}

interface CharacterSummary {
  id: string | number;
  name: string;
  stats: CombatStats;
}

interface BattleSummary {
  characters: CharacterSummary[];
  enemies: CharacterSummary[];
  totalRounds: number;
  totalDuration: number; // in simulated seconds
  mvpCharacter: string | null;
  toughestEnemy: string | null;
}

// Helper function to get skill icon based on icon name
const getSkillIcon = (iconName: string) => {
  switch (iconName) {
    case 'sword':
      return <Swords className="h-3 w-3" />;
    case 'shield':
      return <Shield className="h-3 w-3" />;
    case 'slash':
      return <Swords className="h-3 w-3" />;
    case 'potion':
      return <Beaker className="h-3 w-3" />;
    case 'claw':
      return <Scissors className="h-3 w-3" />;
    default:
      return <Circle className="h-3 w-3" />;
  }
};

const BattleLog: React.FC<BattleLogProps> = ({ isOpen, onClose, battleLog }) => {
  const [activeTab, setActiveTab] = useState('log');
  const [isReplaying, setIsReplaying] = useState(false);
  const [currentReplayStep, setCurrentReplayStep] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState(1);
  const [battleSummary, setBattleSummary] = useState<BattleSummary | null>(null);
  
  // State for visual battle replay
  const [battleState, setBattleState] = useState<BattleState>({
    characters: [],
    enemies: [],
    currentTurn: 0,
    isActive: false,
    actionLog: [],
    battleLogs: []
  });
  const [autoPlayActive, setAutoPlayActive] = useState(false);
  const battleTimerRef = useRef<number | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<BattleSkill | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  
  const replayTimerRef = useRef<number | null>(null);
  const replayActionsRef = useRef<any[]>([]);
  
  // Reset replay state when the dialog is opened or closed
  useEffect(() => {
    if (isOpen) {
      // Generate battle summary when dialog opens
      generateBattleSummary();
      // Initialize battle visualization with characters and enemies
      initializeBattleState();
    } else {
      stopReplay();
      stopAutoPlay();
      setCurrentReplayStep(0);
      setIsReplaying(false);
      setActiveTab('log');
    }
    
    return () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
      }
      if (battleTimerRef.current) {
        clearTimeout(battleTimerRef.current);
      }
    };
  }, [isOpen, battleLog]);
  
  // Initialize battle state with characters and enemies from battle log
  const initializeBattleState = () => {
    if (!battleLog || !Array.isArray(battleLog)) return;
    
    console.log("Initializing battle state from log:", battleLog);
    
    // Maps to track unique characters and enemies
    const characterMap = new Map<string, BattleCombatant>();
    const enemyMap = new Map<string, BattleCombatant>();
    
    // Find all unique characters and enemies in the battle log
    battleLog.forEach(entry => {
      if ('actions' in entry && Array.isArray(entry.actions)) {
        entry.actions.forEach((action: any) => {
          // Process actor (attacker)
          const isCharacter = !action.actor.includes('Enemy');
          const actorMap = isCharacter ? characterMap : enemyMap;
          
          if (!actorMap.has(action.actor)) {
            // Create a default combatant
            const combatant: BattleCombatant = {
              id: action.actor,
              name: action.actor,
              hp: 100, // Default starting HP
              maxHp: 100,
              attackSpeed: isCharacter ? 4 : 5, // Characters attack slightly faster
              attackTimer: 0,
              position: actorMap.size, // Position based on order found
              type: isCharacter ? 'character' : 'enemy',
              skills: generateDefaultSkills(isCharacter),
              stats: {
                attack: isCharacter ? 20 : 15,
                defense: isCharacter ? 15 : 10,
                accuracy: 90,
                speed: isCharacter ? 10 : 8
              }
            };
            
            actorMap.set(action.actor, combatant);
          }
          
          // Process target (if it's an attack action)
          if (action.action === 'attack' && action.target) {
            const isTargetCharacter = !action.target.includes('Enemy');
            const targetMap = isTargetCharacter ? characterMap : enemyMap;
            
            if (!targetMap.has(action.target)) {
              // Create a default target
              const target: BattleCombatant = {
                id: action.target,
                name: action.target,
                hp: 100, // Default starting HP
                maxHp: 100,
                attackSpeed: isTargetCharacter ? 4 : 5,
                attackTimer: 0,
                position: targetMap.size, // Position based on order found
                type: isTargetCharacter ? 'character' : 'enemy',
                skills: generateDefaultSkills(isTargetCharacter),
                stats: {
                  attack: isTargetCharacter ? 20 : 15,
                  defense: isTargetCharacter ? 15 : 10,
                  accuracy: 90,
                  speed: isTargetCharacter ? 10 : 8
                }
              };
              
              targetMap.set(action.target, target);
            }
            
            // Update target HP if available in the action
            if (action.targetRemainingHp !== undefined && action.targetMaxHp !== undefined) {
              const target = targetMap.get(action.target);
              if (target) {
                target.hp = action.targetRemainingHp;
                target.maxHp = action.targetMaxHp;
              }
            }
          }
        });
      }
    });
    
    // Convert maps to arrays
    const characters = Array.from(characterMap.values());
    const enemies = Array.from(enemyMap.values());
    
    // Update battle state
    setBattleState({
      characters,
      enemies,
      currentTurn: 0,
      isActive: false,
      actionLog: [],
      battleLogs: []
    });
    
    console.log("Battle state initialized with", characters.length, "characters and", enemies.length, "enemies");
  };
  
  // Generate default skills for a combatant
  const generateDefaultSkills = (isCharacter: boolean): BattleSkill[] => {
    // Basic skills that all combatants have
    const commonSkills: BattleSkill[] = [
      {
        id: 'basic-attack',
        name: 'Basic Attack',
        damage: isCharacter ? 20 : 15,
        cooldown: 0, // No cooldown for basic attack
        currentCooldown: 0,
        icon: 'sword',
        description: 'A basic attack dealing physical damage',
        type: 'attack',
        targetType: 'enemy'
      }
    ];
    
    // Character-specific skills
    if (isCharacter) {
      commonSkills.push({
        id: 'power-strike',
        name: 'Power Strike',
        damage: 35,
        cooldown: 2,
        currentCooldown: 0,
        icon: 'slash',
        description: 'A powerful strike with a chance to critical hit',
        type: 'attack',
        targetType: 'enemy'
      });
      
      commonSkills.push({
        id: 'healing-potion',
        name: 'Healing Potion',
        cooldown: 4,
        currentCooldown: 0,
        icon: 'potion',
        description: 'Restore 30% of max HP',
        type: 'heal',
        targetType: 'self'
      });
    } 
    // Enemy-specific skills
    else {
      commonSkills.push({
        id: 'savage-blow',
        name: 'Savage Blow',
        damage: 25,
        cooldown: 3,
        currentCooldown: 0,
        icon: 'claw',
        description: 'A savage attack that ignores some defense',
        type: 'attack',
        targetType: 'enemy'
      });
    }
    
    return commonSkills;
  };
  
  // Process the battle log to extract all actions for replay
  useEffect(() => {
    if (battleLog && Array.isArray(battleLog)) {
      // Debug log to see what we're processing
      console.log("Processing battle log for replay:", battleLog);
      
      const actions: any[] = [];
      
      // Process each entry in the battle log
      battleLog.forEach(entry => {
        // Debug the structure of each entry
        console.log("Processing entry:", entry);
        
        // Handle stage-based format
        if ('stage' in entry) {
          // Add stage header
          actions.push({
            type: 'stage-header',
            stage: entry.stage,
            isBossStage: entry.isBossStage,
            displayDelay: 2000, // Give more time to read stage header
          });
          
          // Add enemies introduction
          if (entry.enemies && entry.enemies.length > 0) {
            actions.push({
              type: 'enemies-intro',
              enemies: entry.enemies,
              displayDelay: 1500,
            });
          }
          
          // Add rounds
          if (entry.rounds && Array.isArray(entry.rounds)) {
            entry.rounds.forEach(round => {
              // Add round header
              actions.push({
                type: 'round-header',
                round: round.number,
              });
              
              // Add actions
              if (round.actions && Array.isArray(round.actions)) {
                round.actions.forEach(action => {
                  actions.push({
                    type: 'action',
                    ...action,
                    displayDelay: action.action === 'attack' ? 1500 : 1000,
                  });
                });
              }
            });
          }
          
          // Add stage summary
          if (entry.outcome) {
            actions.push({
              type: 'stage-outcome',
              outcome: entry.outcome,
              summary: entry.summary,
            });
          }
          
          // Add recovery if present
          if (entry.recovery) {
            actions.push({
              type: 'recovery',
              ...entry.recovery,
              displayDelay: 2000,
            });
          }
        }
        // Handle simple round-based format
        else if ('round' in entry) {
          // Add round header
          actions.push({
            type: 'round-header',
            round: entry.round,
          });
          
          // Add actions
          if (entry.actions && Array.isArray(entry.actions)) {
            entry.actions.forEach(action => {
              actions.push({
                type: 'action',
                ...action,
                displayDelay: action.action === 'attack' ? 1500 : 1000,
              });
            });
          }
        }
        // Handle final result
        else if ('finalSummary' in entry) {
          actions.push({
            type: 'final-result',
            ...entry,
            displayDelay: 3000,
          });
        }
      });
      
      replayActionsRef.current = actions;
    }
  }, [battleLog]);
  
  // Generate battle summary
  const generateBattleSummary = () => {
    if (!battleLog || !Array.isArray(battleLog)) return;
    
    // Initialize character stats
    const characterStats = new Map<string, CharacterSummary>();
    const enemyStats = new Map<string, CharacterSummary>();
    let totalRounds = 0;
    
    // Process battle log to collect stats
    battleLog.forEach(entry => {
      // Handle stage-based format
      if ('stage' in entry && entry.rounds && Array.isArray(entry.rounds)) {
        entry.rounds.forEach(round => {
          totalRounds++;
          if (round.actions && Array.isArray(round.actions)) {
            round.actions.forEach(action => {
              processAction(action, characterStats, enemyStats);
            });
          }
        });
      }
      // Handle simple round-based format
      else if ('round' in entry) {
        totalRounds++;
        if (entry.actions && Array.isArray(entry.actions)) {
          entry.actions.forEach(action => {
            processAction(action, characterStats, enemyStats);
          });
        }
      }
    });
    
    // Find MVP character (most damage dealt)
    let mvp: string | null = null;
    let maxDamage = 0;
    characterStats.forEach((char, id) => {
      if (char.stats.damageDealt > maxDamage) {
        maxDamage = char.stats.damageDealt;
        mvp = char.name;
      }
    });
    
    // Find toughest enemy (most damage dealt by enemy)
    let toughest: string | null = null;
    let maxEnemyDamage = 0;
    enemyStats.forEach((enemy, id) => {
      if (enemy.stats.damageDealt > maxEnemyDamage) {
        maxEnemyDamage = enemy.stats.damageDealt;
        toughest = enemy.name;
      }
    });
    
    // Create battle summary
    const summary: BattleSummary = {
      characters: Array.from(characterStats.values()),
      enemies: Array.from(enemyStats.values()),
      totalRounds,
      totalDuration: totalRounds * 10, // roughly estimate 10 seconds per round
      mvpCharacter: mvp,
      toughestEnemy: toughest
    };
    
    setBattleSummary(summary);
  };
  
  // Process a single action to collect stats
  const processAction = (
    action: any, 
    characterStats: Map<string, CharacterSummary>, 
    enemyStats: Map<string, CharacterSummary>
  ) => {
    const isCharacter = !action.actor.includes('Enemy');
    const statsMap = isCharacter ? characterStats : enemyStats;
    const targetMap = isCharacter ? enemyStats : characterStats;
    
    // Initialize actor stats if needed
    if (!statsMap.has(action.actor)) {
      statsMap.set(action.actor, {
        id: action.actor,
        name: action.actor,
        stats: {
          damageDealt: 0,
          damageReceived: 0,
          healingReceived: 0,
          criticalHits: 0,
          dodges: 0,
          specialAbilitiesUsed: 0
        }
      });
    }
    
    // Initialize target stats if needed
    if (action.target && !targetMap.has(action.target)) {
      targetMap.set(action.target, {
        id: action.target,
        name: action.target,
        stats: {
          damageDealt: 0,
          damageReceived: 0,
          healingReceived: 0,
          criticalHits: 0,
          dodges: 0,
          specialAbilitiesUsed: 0
        }
      });
    }
    
    const actorStats = statsMap.get(action.actor)!;
    
    // Update stats based on action type
    if (action.action === 'attack') {
      actorStats.stats.damageDealt += action.damage || 0;
      if (action.isCritical) {
        actorStats.stats.criticalHits++;
      }
      
      // Update target's stats
      if (action.target) {
        const targetStats = targetMap.get(action.target);
        if (targetStats) {
          targetStats.stats.damageReceived += action.damage || 0;
        }
      }
    } 
    else if (action.action === 'special') {
      actorStats.stats.specialAbilitiesUsed++;
    }
    else if (action.action === 'heal') {
      const targetStats = targetMap.get(action.target);
      if (targetStats) {
        targetStats.stats.healingReceived += action.amount || 0;
      }
    }
    else if (action.action === 'dodge') {
      actorStats.stats.dodges++;
    }
  };
  
  // Start replay animation
  const startReplay = () => {
    // Start by ensuring we have actions to replay
    if (replayActionsRef.current.length === 0) {
      console.log("No actions available for replay, re-initializing");
      
      // Re-process battle log data
      const actions: any[] = [];
      
      battleLog.forEach(entry => {
        if ('round' in entry) {
          // Add round header
          actions.push({
            type: 'round-header',
            round: entry.round,
            displayDelay: 1000
          });
          
          // Add all actions from this round
          if (entry.actions && Array.isArray(entry.actions)) {
            entry.actions.forEach(action => {
              actions.push({
                type: 'action',
                ...action,
                displayDelay: 1500
              });
            });
          }
          
          // Add round summary if available
          if (entry.outcome) {
            actions.push({
              type: 'stage-outcome',
              outcome: entry.outcome,
              summary: entry.summary,
              displayDelay: 2000
            });
          }
        }
      });
      
      // If we still have no actions, we can't replay
      if (actions.length === 0) {
        return;
      }
      
      replayActionsRef.current = actions;
    }
    
    // Start or resume replay
    setIsReplaying(true);
    console.log("Starting replay with", replayActionsRef.current.length, "actions");
    
    // If we're at the end, start from the beginning
    if (currentReplayStep >= replayActionsRef.current.length) {
      setCurrentReplayStep(0);
    }
    
    advanceReplay();
  };
  
  // Stop replay animation
  const stopReplay = () => {
    setIsReplaying(false);
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
  };
  
  // Start auto-play battle simulation
  const startAutoPlay = () => {
    if (autoPlayActive) return;
    
    console.log("Starting auto-play battle simulation");
    
    // Initialize with dummy battle data if none exists
    if (battleState.characters.length === 0 || battleState.enemies.length === 0) {
      console.log("Creating initial battle state for auto-play");
      
      // Set up a basic battle scenario
      const newState = {
        characters: [{
          id: "char1",
          name: "Character 1",
          type: "character",
          hp: 100,
          maxHp: 100,
          attackSpeed: 4.0,
          attackTimer: 0,
          stats: {
            attack: 20,
            defense: 15,
            accuracy: 90,
            speed: 10
          },
          skills: [
            { id: "skill1", name: "Basic Attack", icon: "sword", cooldown: 0, currentCooldown: 0 },
            { id: "skill2", name: "Power Strike", icon: "shieldOff", cooldown: 3, currentCooldown: 0 },
            { id: "skill3", name: "Healing Potion", icon: "heart", cooldown: 5, currentCooldown: 0 }
          ]
        }],
        enemies: [
          {
            id: "enemy1",
            name: "Enemy 1",
            type: "enemy",
            hp: 80,
            maxHp: 80,
            attackSpeed: 4.5,
            attackTimer: 0,
            stats: {
              attack: 16,
              defense: 10,
              accuracy: 85,
              speed: 8
            },
            skills: [
              { id: "skill1", name: "Basic Attack", icon: "sword", cooldown: 0, currentCooldown: 0 }
            ]
          },
          {
            id: "enemy2",
            name: "Enemy 2",
            type: "enemy",
            hp: 70,
            maxHp: 70,
            attackSpeed: 3.5,
            attackTimer: 0,
            stats: {
              attack: 18,
              defense: 8,
              accuracy: 88,
              speed: 12
            },
            skills: [
              { id: "skill1", name: "Basic Attack", icon: "sword", cooldown: 0, currentCooldown: 0 }
            ]
          }
        ],
        currentTurn: 0,
        isActive: true,
        actionLog: [],
        battleLogs: ["Battle begins! Characters and enemies prepare to fight..."]
      };
      
      setBattleState(newState);
    } else {
      // Use existing battle state
      console.log("Using existing battle state for auto-play with", 
                battleState.characters.length, "characters and", 
                battleState.enemies.length, "enemies");
      
      setBattleState(prev => ({
        ...prev, 
        isActive: true,
        battleLogs: [...(prev.battleLogs || []), "Battle resumes! Characters and enemies re-engage in combat..."]
      }));
    }
    
    setAutoPlayActive(true);
    
    // Clear any existing timer
    if (battleTimerRef.current) {
      clearTimeout(battleTimerRef.current);
    }
    
    // Start the timer to update the battle state
    battleTimerRef.current = window.setTimeout(updateBattleState, 100);
  };
  
  // Stop auto-play battle simulation
  const stopAutoPlay = () => {
    setAutoPlayActive(false);
    setBattleState(prev => ({...prev, isActive: false}));
    
    if (battleTimerRef.current) {
      clearTimeout(battleTimerRef.current);
      battleTimerRef.current = null;
    }
  };
  
  // Check if battle is still active (has at least one character and one enemy alive)
  const isBattleActive = () => {
    const aliveCharacters = battleState.characters.filter(c => c.hp > 0);
    const aliveEnemies = battleState.enemies.filter(e => e.hp > 0);
    return aliveCharacters.length > 0 && aliveEnemies.length > 0;
  };
  
  // Update the battle state by advancing attack timers and triggering attacks
  const updateBattleState = () => {
    if (!autoPlayActive) return;
    
    // Check if battle should end
    if (!isBattleActive()) {
      // Determine outcome
      const aliveCharacters = battleState.characters.filter(c => c.hp > 0);
      const outcome = aliveCharacters.length > 0 ? 'victory' : 'defeat';
      
      // Add a battle completion log entry
      const logEntry = outcome === 'victory' 
        ? 'Victory! Your party has defeated all enemies!' 
        : 'Defeat! Your party has been defeated.';
        
      setBattleState(prev => ({
        ...prev,
        battleLogs: [...prev.battleLogs, logEntry].slice(-20)
      }));
      
      stopAutoPlay();
      return;
    }
    
    setBattleState(prev => {
      // Create a copy of the current state
      const newState = {...prev};
      
      // Advance attack timers for all combatants
      const allCombatants = [...newState.characters, ...newState.enemies];
      let anyAttacksTriggered = false;
      const newLogs: string[] = [];
      
      // First, decrement cooldowns for all skills
      allCombatants.forEach(combatant => {
        combatant.skills.forEach(skill => {
          if (skill.currentCooldown && skill.currentCooldown > 0) {
            skill.currentCooldown -= 0.1;
            if (skill.currentCooldown < 0) skill.currentCooldown = 0;
          }
        });
      });
      
      // Then, update attack timers and trigger attacks
      allCombatants.forEach(combatant => {
        // Only process if combatant has HP
        if (combatant.hp <= 0) return;
        
        // Advance attack timer
        combatant.attackTimer += 0.1;
        
        // Check if it's time to attack
        if (combatant.attackTimer >= combatant.attackSpeed) {
          // Reset timer
          combatant.attackTimer = 0;
          
          // Determine targets based on combatant type
          const targets = combatant.type === 'character' ? newState.enemies : newState.characters;
          
          // Filter for alive targets
          const aliveTargets = targets.filter(t => t.hp > 0);
          
          // If no alive targets, battle is over
          if (aliveTargets.length === 0) {
            return;
          }
          
          // Pick a target randomly
          const targetIndex = Math.floor(Math.random() * aliveTargets.length);
          const target = aliveTargets[targetIndex];
          
          // Calculate damage (add some randomness to damage)
          const baseDamage = combatant.stats.attack;
          const damageReduction = target.stats.defense / 100; // Convert defense to percentage
          const randomFactor = 0.8 + Math.random() * 0.4; // Random factor between 0.8 and 1.2
          const damage = Math.max(1, Math.floor(baseDamage * randomFactor * (1 - damageReduction)));
          
          // Determine if critical hit (5% chance)
          const isCritical = Math.random() < 0.05;
          const criticalMultiplier = isCritical ? 1.5 : 1;
          const finalDamage = Math.floor(damage * criticalMultiplier);
          
          // Generate a battle log entry
          const logEntry = isCritical
            ? `${combatant.name} lands a CRITICAL HIT on ${target.name} for ${finalDamage} damage!`
            : `${combatant.name} attacks ${target.name} for ${finalDamage} damage!`;
          newLogs.push(logEntry);
          
          // Apply damage to target
          target.hp = Math.max(0, target.hp - finalDamage);
          
          // Check if target was defeated
          if (target.hp <= 0) {
            newLogs.push(`${target.name} has been defeated!`);
          }
          
          // Add attack action to log
          newState.actionLog.push({
            actor: combatant.name,
            action: 'attack',
            target: target.name,
            damage: finalDamage,
            isCritical,
            targetRemainingHp: target.hp,
            targetMaxHp: target.maxHp
          });
          
          anyAttacksTriggered = true;
        }
      });
      
      // Add new logs to the battle logs
      if (newLogs.length > 0) {
        newState.battleLogs = [...newState.battleLogs, ...newLogs].slice(-20);
      }
      
      // Increment current turn if any attacks happened
      if (anyAttacksTriggered) {
        newState.currentTurn += 1;
      }
      
      return newState;
    });
    
    // Schedule next update (delay based on battle speed)
    const updateInterval = 100; // 100ms for standard real-time battle speed
    battleTimerRef.current = window.setTimeout(updateBattleState, updateInterval);
  };
  
  // Reset replay to beginning
  const resetReplay = () => {
    stopReplay();
    setCurrentReplayStep(0);
  };
  
  // Advance to next step in replay
  const advanceReplay = () => {
    // Only advance if we're replaying and there are actions left
    if (isReplaying && currentReplayStep < replayActionsRef.current.length) {
      // Schedule next step
      const currentAction = replayActionsRef.current[currentReplayStep];
      const delay = Math.max(500, (currentAction.displayDelay || 1000) / replaySpeed);
      
      replayTimerRef.current = window.setTimeout(() => {
        // Advance to next step
        setCurrentReplayStep(prev => {
          const next = prev + 1;
          
          // If we've reached the end, stop replaying
          if (next >= replayActionsRef.current.length) {
            setIsReplaying(false);
            return prev;
          }
          
          // Continue replay
          advanceReplay();
          return next;
        });
      }, delay);
    }
  };
  
  // Continue replay when speed changes
  useEffect(() => {
    if (isReplaying) {
      stopReplay();
      startReplay();
    }
  }, [replaySpeed]);
  
  // Render the replay tab content
  const renderReplayTab = () => {
    // Show replay controls
    if (replayActionsRef.current.length === 0) {
      return (
        <div className="py-8 text-center">
          <p className="text-[#C8B8DB]/70">No replay data available</p>
        </div>
      );
    }
    
    // Get all actions up to the current step
    const actionsToRender = replayActionsRef.current.slice(0, currentReplayStep);
    const lastAction = actionsToRender[actionsToRender.length - 1];
    
    // If we're in visual battle view mode
    if (activeTab === 'visual') {
      return renderVisualBattleReplay(lastAction);
    }
    
    return (
      <div className="py-4 space-y-2">
        {/* Visual indicator for latest action */}
        <div className="h-1 bg-[#432874]/30 rounded-full mb-2">
          <div 
            className="h-full bg-[#FF9D00] rounded-full transition-all" 
            style={{ width: `${(currentReplayStep / replayActionsRef.current.length) * 100}%` }}
          />
        </div>
        
        {/* Latest action at the top */}
        <div className="bg-[#1F1D36] border border-[#FF9D00]/30 rounded-lg p-3 mb-4 animate-pulse">
          {renderReplayAction(lastAction)}
        </div>
        
        {/* Previous actions */}
        <div className="space-y-2 overflow-y-auto max-h-[300px] pr-2 opacity-80">
          {actionsToRender.slice(0, -1).reverse().map((action, idx) => (
            <div key={idx} className="bg-[#1F1D36]/50 border border-[#432874]/30 rounded-lg p-3">
              {renderReplayAction(action)}
            </div>
          ))}
        </div>
      </div>
    );
  };
  
  // Render visual battle replay showing all combatants
  const renderVisualBattleReplay = (currentAction: any) => {
    const { characters, enemies, isActive, battleLogs } = battleState;
    
    return (
      <div className="bg-[#1F1D36]/80 rounded-lg p-4">
        {/* Battle arena with both sides */}
        <div className="flex flex-col space-y-8">
          {/* Top info bar */}
          <div className="flex justify-between items-center px-2 py-1 bg-[#432874]/30 rounded">
            <span className="text-sm font-medium">
              {isActive ? 'Live Battle' : currentAction?.type === 'round-header' ? `Round ${currentAction.round}` : ''}
            </span>
            <div className="flex items-center gap-2">
              {!isReplaying && (
                <button 
                  onClick={autoPlayActive ? stopAutoPlay : startAutoPlay}
                  className={`px-2 py-0.5 rounded text-xs ${autoPlayActive ? 'bg-red-600' : 'bg-green-600'}`}
                >
                  {autoPlayActive ? 'Stop Auto-Play' : 'Start Auto-Play'}
                </button>
              )}
              <span className="text-xs text-[#C8B8DB]/70">
                {isActive ? `Turn: ${battleState.currentTurn}` : `Action ${currentReplayStep} of ${replayActionsRef.current.length}`}
              </span>
            </div>
          </div>
          
          {/* Live battle log */}
          {isActive && (
            <div className="bg-[#1F1D36]/90 border border-[#432874]/50 rounded-lg p-3 max-h-[120px] overflow-y-auto">
              <h4 className="text-sm font-semibold text-[#C8B8DB] mb-2">Battle Log</h4>
              <div className="space-y-1 text-xs">
                {battleLogs.length === 0 ? (
                  <p className="text-[#C8B8DB]/50 italic">Battle will begin soon...</p>
                ) : (
                  battleLogs.map((log, index) => (
                    <div key={index} className="text-[#C8B8DB]">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {/* Characters side */}
          <div className="flex flex-col space-y-1">
            <h3 className="text-md font-semibold text-[#00B9AE] mb-2">Your Party</h3>
            
            {characters.map((character: BattleCombatant, index: number) => (
              <div 
                key={character.id} 
                className={`bg-[#1F1D36]/70 rounded-lg p-3 ${
                  currentAction?.actor === character.name ? 'ring-2 ring-[#00B9AE]' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  {/* Character info */}
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="font-semibold text-[#00B9AE]">{character.name}</span>
                      <div className="ml-2 px-2 py-0.5 bg-[#00B9AE]/10 rounded text-xs">
                        HP: {character.hp}/{character.maxHp}
                      </div>
                    </div>
                    
                    {/* HP Bar */}
                    <Progress 
                      value={(character.hp / character.maxHp) * 100} 
                      className="h-2 bg-[#1F1D36] mb-2"
                    />
                    
                    {/* Attack timer */}
                    <div className="flex items-center text-xs mb-3">
                      <Clock className="h-3 w-3 mr-1 text-[#C8B8DB]/70" />
                      <span className="text-[#C8B8DB]/70 mr-2">Attack Speed:</span>
                      <div className="w-20 bg-[#1F1D36] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#00B9AE] h-full rounded-full" 
                          style={{ width: `${(1 - character.attackTimer / character.attackSpeed) * 100}%` }}
                        />
                      </div>
                      <span className="ml-2 text-[#C8B8DB]/70">
                        {Math.max(0, character.attackSpeed - character.attackTimer).toFixed(1)}s
                      </span>
                    </div>
                    
                    {/* Skills */}
                    <div className="flex gap-2 flex-wrap">
                      {character.skills.map((skill: BattleSkill) => (
                        <div 
                          key={skill.id}
                          className={`
                            px-2 py-1 rounded text-xs flex items-center 
                            ${skill.currentCooldown ? 'bg-[#1F1D36]/80 text-[#C8B8DB]/40' : 'bg-[#432874]/50 text-[#C8B8DB]'}
                            ${currentAction?.skillName === skill.name ? 'ring-1 ring-yellow-400' : ''}
                          `}
                        >
                          {getSkillIcon(skill.icon)}
                          <span className="ml-1">{skill.name}</span>
                          {skill.currentCooldown > 0 && (
                            <span className="ml-1 bg-[#1F1D36] px-1 rounded">{skill.currentCooldown}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Character stats */}
                  <div className="ml-4 p-2 bg-[#1F1D36]/60 rounded text-xs flex flex-col space-y-1 w-20 text-[#C8B8DB]/80">
                    <div className="flex justify-between">
                      <span>ATK:</span>
                      <span>{character.stats.attack}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DEF:</span>
                      <span>{character.stats.defense}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ACC:</span>
                      <span>{character.stats.accuracy}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SPD:</span>
                      <span>{character.stats.speed}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Battle event display */}
          {currentAction && (
            <div className="py-3 px-4 bg-[#432874]/20 rounded-lg border border-[#432874]/40">
              {renderReplayAction(currentAction)}
            </div>
          )}
          
          {/* Enemies side */}
          <div className="flex flex-col space-y-1">
            <h3 className="text-md font-semibold text-[#DC143C] mb-2">Enemies</h3>
            
            {enemies.map((enemy: BattleCombatant, index: number) => (
              <div 
                key={enemy.id} 
                className={`bg-[#1F1D36]/70 rounded-lg p-3 ${
                  currentAction?.actor === enemy.name ? 'ring-2 ring-[#DC143C]' : ''
                } ${
                  currentAction?.target === enemy.name ? 'ring-2 ring-yellow-500' : ''
                }`}
              >
                <div className="flex justify-between items-start">
                  {/* Enemy info */}
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="font-semibold text-[#DC143C]">{enemy.name}</span>
                      <div className="ml-2 px-2 py-0.5 bg-[#DC143C]/10 rounded text-xs">
                        HP: {enemy.hp}/{enemy.maxHp}
                      </div>
                    </div>
                    
                    {/* HP Bar */}
                    <Progress 
                      value={(enemy.hp / enemy.maxHp) * 100} 
                      className="h-2 bg-[#1F1D36] mb-2"
                    />
                    
                    {/* Attack timer */}
                    <div className="flex items-center text-xs mb-3">
                      <Clock className="h-3 w-3 mr-1 text-[#C8B8DB]/70" />
                      <span className="text-[#C8B8DB]/70 mr-2">Attack Speed:</span>
                      <div className="w-20 bg-[#1F1D36] h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#DC143C] h-full rounded-full" 
                          style={{ width: `${(1 - enemy.attackTimer / enemy.attackSpeed) * 100}%` }}
                        />
                      </div>
                      <span className="ml-2 text-[#C8B8DB]/70">
                        {Math.max(0, enemy.attackSpeed - enemy.attackTimer).toFixed(1)}s
                      </span>
                    </div>
                    
                    {/* Skills */}
                    <div className="flex gap-2 flex-wrap">
                      {enemy.skills.map((skill: BattleSkill) => (
                        <div 
                          key={skill.id}
                          className={`
                            px-2 py-1 rounded text-xs flex items-center 
                            ${skill.currentCooldown ? 'bg-[#1F1D36]/80 text-[#C8B8DB]/40' : 'bg-[#1F1D36]/60 text-[#C8B8DB]'}
                            ${currentAction?.skillName === skill.name ? 'ring-1 ring-yellow-400' : ''}
                          `}
                        >
                          {getSkillIcon(skill.icon)}
                          <span className="ml-1">{skill.name}</span>
                          {skill.currentCooldown > 0 && (
                            <span className="ml-1 bg-[#1F1D36] px-1 rounded">{skill.currentCooldown}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Enemy stats */}
                  <div className="ml-4 p-2 bg-[#1F1D36]/60 rounded text-xs flex flex-col space-y-1 w-20 text-[#C8B8DB]/80">
                    <div className="flex justify-between">
                      <span>ATK:</span>
                      <span>{enemy.stats.attack}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>DEF:</span>
                      <span>{enemy.stats.defense}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>ACC:</span>
                      <span>{enemy.stats.accuracy}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SPD:</span>
                      <span>{enemy.stats.speed}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };
  
  // Render the replay action descriptions
  const renderReplayAction = (action: any) => {
    if (!action) return null;
    
    switch (action.type) {
      case 'stage-header':
        return (
          <div className="flex items-center justify-between">
            <span className="font-cinzel font-semibold text-[#FF9D00]">
              Stage {action.stage} {action.isBossStage ? '- Boss Stage' : ''}
            </span>
            <Badge className="bg-[#432874]/40 text-[#C8B8DB] border-[#432874]/30">
              Prepare for battle!
            </Badge>
          </div>
        );
      
      case 'enemies-intro':
        return (
          <div>
            <span className="text-[#DC143C]">Enemies appeared:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {action.enemies.map((enemy: any, i: number) => (
                <Badge 
                  key={i} 
                  className="bg-[#1F1D36] border-[#DC143C]/30 text-[#DC143C]"
                >
                  {enemy.name} (Lvl {enemy.level || '?'})
                </Badge>
              ))}
            </div>
          </div>
        );
      
      case 'round-header':
        return (
          <div className="font-cinzel font-medium text-[#C8B8DB]/80">
            Round {action.round}
          </div>
        );
      
      case 'action':
        let iconComponent = <Swords className="h-4 w-4 inline mr-1" />;
        if (action.action === 'defend') iconComponent = <Shield className="h-4 w-4 inline mr-1" />;
        if (action.action === 'special') iconComponent = <Zap className="h-4 w-4 inline mr-1" />;
        if (action.action === 'heal') iconComponent = <Heart className="h-4 w-4 inline mr-1" />;
        
        const isCharacter = !action.actor.includes('Enemy');
        const actorColor = isCharacter ? 'text-[#00B9AE]' : 'text-[#DC143C]';
        
        // Get skill name if available
        const skillName = action.skillName || (
          action.action === 'attack' 
            ? (action.isCritical ? 'Critical Strike' : 'Basic Attack')
            : action.action === 'defend' ? 'Defensive Stance' 
            : action.action === 'heal' ? 'Healing' 
            : 'Special Ability'
        );
        
        return (
          <div className="flex items-start">
            <span className="mt-1">{iconComponent}</span>
            <div>
              <span className={`font-semibold ${actorColor}`}>{action.actor}</span>
              {' uses '}
              <Badge className={
                action.isCritical 
                  ? 'bg-yellow-900/30 text-yellow-500 border-0 mx-1'
                  : 'bg-[#432874]/20 text-[#C8B8DB] border-0 mx-1'
              }>
                {skillName}
              </Badge>
              
              {action.action === 'attack' && (
                <>
                  {' on '}
                  <span className={isCharacter ? 'text-[#DC143C] font-semibold' : 'text-[#00B9AE] font-semibold'}>
                    {action.target}
                  </span>
                  {' for '}
                  <span className="font-bold">{action.damage}</span>
                  {' damage'}
                  {action.elementalEffect && (
                    <Badge className="ml-1 bg-purple-500/20 text-purple-300 border-0">
                      {action.elementalEffect}
                    </Badge>
                  )}
                </>
              )}
              
              {action.action === 'heal' && (
                <>
                  {' restoring '}
                  <span className="text-green-400 font-bold">{action.amount}</span>
                  {' HP'}
                </>
              )}
              
              {action.targetRemainingHp !== undefined && (
                <span className="text-xs block mt-1 opacity-80">
                  {action.target} HP: {action.targetRemainingHp}/{action.targetMaxHp}
                </span>
              )}
            </div>
          </div>
        );
      
      case 'stage-outcome':
        return (
          <div>
            <Badge 
              className={
                action.outcome === 'victory' 
                  ? "bg-green-700/20 text-green-400 border-green-700/30" 
                  : "bg-red-700/20 text-red-400 border-red-700/30"
              }
            >
              {action.outcome === 'victory' ? 'Victory!' : 'Defeat'}
            </Badge>
            {action.summary && (
              <p className="mt-1 text-[#C8B8DB]/80">{action.summary}</p>
            )}
          </div>
        );
      
      case 'final-result':
        return (
          <div>
            <Badge 
              className={
                action.success 
                  ? "bg-green-700/20 text-green-400 border-green-700/30" 
                  : "bg-red-700/20 text-red-400 border-red-700/30"
              }
            >
              {action.success ? 'Dungeon Cleared!' : 'Dungeon Failed'}
            </Badge>
            <p className="mt-1 text-[#C8B8DB]/80">{action.finalSummary}</p>
          </div>
        );
        
      case 'recovery':
        return (
          <div>
            <span className="text-[#00B9AE]">{action.message}</span>
            {action.characters && (
              <div className="flex flex-wrap gap-1 mt-1">
                {action.characters.map((char: any, i: number) => (
                  <Badge 
                    key={i} 
                    className="bg-[#1F1D36] border-[#00B9AE]/30 text-[#00B9AE]"
                  >
                    {char.name}: {char.hp}/{char.maxHp} HP
                  </Badge>
                ))}
              </div>
            )}
          </div>
        );
      
      default:
        return <div>Unknown action type</div>;
    }
  };
  
  // Render the battle summary tab
  const renderBattleSummary = () => {
    if (!battleSummary) {
      return (
        <div className="py-8 text-center">
          <p className="text-[#C8B8DB]/70">No summary data available</p>
        </div>
      );
    }
    
    const finalResult = battleLog.find((entry: any) => 'finalSummary' in entry);
    
    return (
      <div className="space-y-6 py-4">
        {/* Battle overview */}
        <div className="bg-[#1F1D36]/50 rounded-lg p-4">
          <h3 className="text-[#FF9D00] font-cinzel text-lg mb-2">Battle Overview</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#1A1A2E] rounded p-3 flex flex-col items-center justify-center">
              <p className="text-[#C8B8DB]/70 text-sm">Total Rounds</p>
              <p className="text-2xl font-cinzel text-[#FF9D00]">{battleSummary.totalRounds}</p>
            </div>
            <div className="bg-[#1A1A2E] rounded p-3 flex flex-col items-center justify-center">
              <p className="text-[#C8B8DB]/70 text-sm">Battle Duration</p>
              <p className="text-2xl font-cinzel text-[#00B9AE]">
                {Math.floor(battleSummary.totalDuration / 60)}:{(battleSummary.totalDuration % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </div>
          {battleSummary.mvpCharacter && (
            <div className="mt-3 bg-[#432874]/20 rounded-lg p-3">
              <div className="flex justify-between">
                <div>
                  <p className="text-[#C8B8DB]/70 text-sm">MVP Character</p>
                  <p className="text-[#FF9D00] font-semibold">{battleSummary.mvpCharacter}</p>
                </div>
                {battleSummary.toughestEnemy && (
                  <div className="text-right">
                    <p className="text-[#C8B8DB]/70 text-sm">Toughest Enemy</p>
                    <p className="text-[#DC143C] font-semibold">{battleSummary.toughestEnemy}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Character Stats */}
        {battleSummary.characters.length > 0 && (
          <div className="bg-[#1F1D36]/50 rounded-lg p-4">
            <h3 className="text-[#00B9AE] font-cinzel text-lg mb-3">Character Performance</h3>
            <div className="space-y-4">
              {battleSummary.characters.map(char => (
                <div key={char.id} className="bg-[#1A1A2E] rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-cinzel font-semibold text-[#00B9AE]">{char.name}</p>
                    {char.name === battleSummary.mvpCharacter && (
                      <Badge className="bg-yellow-900/30 text-yellow-500 border-yellow-900/50">
                        MVP
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-[#C8B8DB]/70">Damage Dealt</p>
                      <p className="font-semibold text-[#FF9D00]">{char.stats.damageDealt}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C8B8DB]/70">Damage Received</p>
                      <p className="font-semibold text-[#DC143C]">{char.stats.damageReceived}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C8B8DB]/70">Critical Hits</p>
                      <p className="font-semibold text-yellow-500">{char.stats.criticalHits}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C8B8DB]/70">Healing Received</p>
                      <p className="font-semibold text-green-500">{char.stats.healingReceived}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C8B8DB]/70">Special Abilities</p>
                      <p className="font-semibold text-purple-400">{char.stats.specialAbilitiesUsed}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C8B8DB]/70">Dodges</p>
                      <p className="font-semibold text-blue-400">{char.stats.dodges}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Enemy Stats */}
        {battleSummary.enemies.length > 0 && (
          <div className="bg-[#1F1D36]/50 rounded-lg p-4">
            <h3 className="text-[#DC143C] font-cinzel text-lg mb-3">Enemy Performance</h3>
            <div className="space-y-3">
              {battleSummary.enemies.map(enemy => (
                <div key={enemy.id} className="bg-[#1A1A2E] rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2">
                    <p className="font-cinzel font-semibold text-[#DC143C]">{enemy.name}</p>
                    {enemy.name === battleSummary.toughestEnemy && (
                      <Badge className="bg-red-900/30 text-red-500 border-red-900/50">
                        Toughest
                      </Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-[#C8B8DB]/70">Damage Dealt</p>
                      <p className="font-semibold text-[#DC143C]">{enemy.stats.damageDealt}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#C8B8DB]/70">Damage Received</p>
                      <p className="font-semibold text-[#00B9AE]">{enemy.stats.damageReceived}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Final Result */}
        {battleLog.find((entry: any) => 'finalSummary' in entry) && (
          <div className={`bg-${battleLog.find((entry: any) => 'finalSummary' in entry)?.success ? 'green' : 'red'}-900/20 rounded-lg p-4`}>
            <h3 className={`text-${battleLog.find((entry: any) => 'finalSummary' in entry)?.success ? 'green' : 'red'}-400 font-cinzel text-lg mb-2`}>
              {battleLog.find((entry: any) => 'finalSummary' in entry)?.success ? 'Victory!' : 'Defeat'}
            </h3>
            <p>{battleLog.find((entry: any) => 'finalSummary' in entry)?.finalSummary}</p>
          </div>
        )}
      </div>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB] max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#FF9D00] font-cinzel text-xl flex items-center">
            <ScrollText className="mr-2 h-5 w-5" /> 
            Battle Log
          </DialogTitle>
          <DialogDescription className="text-[#C8B8DB]/70">
            {battleLog.find((entry: any) => 'finalSummary' in entry)?.finalSummary || 'A record of your dungeon adventure'}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="log" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="log" className="data-[state=active]:bg-[#432874] data-[state=active]:text-white">
              <ScrollText className="h-4 w-4 mr-2" />
              Log
            </TabsTrigger>
            <TabsTrigger value="replay" className="data-[state=active]:bg-[#432874] data-[state=active]:text-white">
              <Play className="h-4 w-4 mr-2" />
              Replay
            </TabsTrigger>
            <TabsTrigger value="visual" className="data-[state=active]:bg-[#432874] data-[state=active]:text-white">
              <Swords className="h-4 w-4 mr-2" />
              Battle View
            </TabsTrigger>
            <TabsTrigger value="summary" className="data-[state=active]:bg-[#432874] data-[state=active]:text-white">
              <BarChart4 className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="log" className="border-none p-0">
            <div className="py-4 space-y-4">
              {battleLog.map((entry, index) => {
                // Skip the final result since we already used it in the header
                if ('finalSummary' in entry) return null;
                
                // Handle stage entry
                if ('stage' in entry) {
                  return (
                    <div key={`stage-${index}`} className="mb-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-cinzel font-bold text-[#00B9AE]">
                          Stage {entry.stage} {entry.isBossStage ? '- Boss Stage' : ''}
                        </h3>
                        <Badge 
                          className={entry.outcome === 'victory' 
                            ? "bg-green-700/20 text-green-400 border-green-700/30" 
                            : "bg-red-700/20 text-red-400 border-red-700/30"
                          }
                        >
                          {entry.outcome === 'victory' ? 'Victory' : 'Defeat'}
                        </Badge>
                      </div>
                      
                      {/* Enemy info */}
                      <div className="bg-[#432874]/10 p-3 rounded-md mb-3">
                        <p className="text-sm mb-2 font-semibold text-[#C8B8DB]">Enemies:</p>
                        <div className="flex flex-wrap gap-2">
                          {entry.enemies?.map((enemy: any, enemyIdx: number) => (
                            <Badge key={enemyIdx} className="bg-[#DC143C]/20 text-[#DC143C] border-[#DC143C]/30">
                              {enemy.name} (Lvl {enemy.level})
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      {/* Combat rounds */}
                      <div className="space-y-3">
                        {entry.rounds?.map((round: any, roundIdx: number) => (
                          <div key={`round-${roundIdx}`} className="bg-[#1F1D36]/50 p-3 rounded-md">
                            <p className="text-sm font-semibold mb-2">Round {round.number}:</p>
                            <div className="space-y-1 text-sm">
                              {round.actions?.map((action: any, actionIdx: number) => {
                                // Customize action display based on type
                                let icon = <Swords className="h-4 w-4 inline mr-1" />;
                                if (action.action === 'defend') icon = <Shield className="h-4 w-4 inline mr-1" />;
                                if (action.action === 'special') icon = <Zap className="h-4 w-4 inline mr-1" />;
                                
                                let textColor = action.actor.includes('Enemy') 
                                  ? "text-[#DC143C]/90"
                                  : "text-[#00B9AE]/90";
                                  
                                // Get skill name if available
                                let skillName = action.skillName || (
                                  action.action === 'attack' 
                                    ? (action.isCritical ? 'Critical Strike' : 'Basic Attack')
                                    : action.action === 'defend' ? 'Defensive Stance' : 'Special Ability'
                                );
                                
                                return (
                                  <p key={`action-${actionIdx}`} className={`${textColor} flex items-start`}>
                                    <span className="inline-block mt-1">{icon}</span>
                                    <span>
                                      <span className="font-semibold">{action.actor}</span>
                                      {' uses '}
                                      <Badge className={
                                        action.isCritical 
                                          ? 'bg-yellow-900/30 text-yellow-500 border-0 mx-1'
                                          : 'bg-[#432874]/20 text-[#C8B8DB] border-0 mx-1'
                                      }>
                                        {skillName}
                                      </Badge>
                                      {action.action === 'attack' && (
                                        <>
                                          {' on '}
                                          <span className="font-semibold">{action.target}</span>
                                          {' for '}
                                          <span className="font-bold">{action.damage}</span>
                                          {' damage'}
                                          {action.elementalEffect && (
                                            <Badge className="ml-1 bg-purple-500/20 text-purple-300 border-0">
                                              {action.elementalEffect}
                                            </Badge>
                                          )}
                                        </>
                                      )}
                                    </span>
                                  </p>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Stage summary */}
                      {entry.summary && (
                        <div className="mt-3 p-2 bg-[#432874]/20 rounded-md text-sm">
                          {entry.summary}
                        </div>
                      )}
                      
                      {/* Recovery info */}
                      {entry.recovery && (
                        <div className="mt-3 p-2 bg-[#00B9AE]/10 rounded-md text-sm">
                          <p className="text-[#00B9AE]/90">{entry.recovery.message}</p>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {entry.recovery.characters?.map((char: any) => (
                              <Badge key={char.id} className="bg-[#00B9AE]/20 text-[#00B9AE] border-[#00B9AE]/30">
                                {char.name}: {char.hp}/{char.maxHp} HP
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                }
                
                // Handle round-based format
                if ('round' in entry) {
                  return (
                    <div key={`round-${index}`} className="bg-[#1F1D36]/50 p-3 rounded-md mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-md font-cinzel font-bold text-[#C8B8DB]">
                          Round {entry.round}
                        </h3>
                        {entry.outcome && (
                          <Badge 
                            className={entry.outcome === 'victory' 
                              ? "bg-green-700/20 text-green-400 border-green-700/30" 
                              : "bg-red-700/20 text-red-400 border-red-700/30"
                            }
                          >
                            {entry.outcome === 'victory' ? 'Victory' : 'Defeat'}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1 text-sm">
                        {entry.actions?.map((action: any, actionIdx: number) => {
                          // Customize action display based on type
                          let icon = <Swords className="h-4 w-4 inline mr-1" />;
                          if (action.action === 'defend') icon = <Shield className="h-4 w-4 inline mr-1" />;
                          if (action.action === 'special') icon = <Zap className="h-4 w-4 inline mr-1" />;
                          
                          let textColor = action.actor.includes('Enemy') 
                            ? "text-[#DC143C]/90"
                            : "text-[#00B9AE]/90";
                          
                          return (
                            <p key={`action-${actionIdx}`} className={`${textColor}`}>
                              {icon} <span className="font-semibold">{action.actor}</span>
                              {action.action === 'attack' && (
                                <>
                                  {' attacks '}
                                  <span className="font-semibold">{action.target}</span>
                                  {' for '}
                                  <span className="font-bold">{action.damage}</span>
                                  {' damage'}
                                  {action.isCritical && (
                                    <Badge className="ml-1 bg-yellow-900/20 text-yellow-500 border-0">
                                      Critical!
                                    </Badge>
                                  )}
                                </>
                              )}
                            </p>
                          );
                        })}
                      </div>
                      
                      {/* Round summary */}
                      {entry.summary && (
                        <div className="mt-3 p-2 bg-[#432874]/20 rounded-md text-sm">
                          {entry.summary}
                        </div>
                      )}
                    </div>
                  );
                }
                
                return null;
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="replay" className="border-none p-0">
            <div className="py-4">
              {/* Replay controls */}
              <div className="flex items-center justify-between bg-[#1F1D36]/50 p-3 rounded-md mb-4">
                <div className="flex space-x-2">
                  {isReplaying ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="bg-[#1F1D36] hover:bg-[#432874]/30"
                      onClick={stopReplay}
                    >
                      <Pause className="h-4 w-4 mr-1" /> Pause
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="bg-[#1F1D36] hover:bg-[#432874]/30"
                      onClick={startReplay}
                    >
                      <Play className="h-4 w-4 mr-1" /> Play
                    </Button>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-[#1F1D36] hover:bg-[#432874]/30"
                    onClick={() => {
                      stopReplay();
                      if (currentReplayStep < replayActionsRef.current.length) {
                        setCurrentReplayStep(currentReplayStep + 1);
                      }
                    }}
                  >
                    <Forward className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-[#1F1D36] hover:bg-[#432874]/30"
                    onClick={resetReplay}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Speed:</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={`px-2 ${replaySpeed === 0.5 ? 'bg-[#432874]/30' : ''}`}
                    onClick={() => setReplaySpeed(0.5)}
                  >
                    0.5x
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={`px-2 ${replaySpeed === 1 ? 'bg-[#432874]/30' : ''}`}
                    onClick={() => setReplaySpeed(1)}
                  >
                    1x
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={`px-2 ${replaySpeed === 2 ? 'bg-[#432874]/30' : ''}`}
                    onClick={() => setReplaySpeed(2)}
                  >
                    2x
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={`px-2 ${replaySpeed === 4 ? 'bg-[#432874]/30' : ''}`}
                    onClick={() => setReplaySpeed(4)}
                  >
                    4x
                  </Button>
                </div>
              </div>
              
              {/* Render replay content based on current step */}
              {renderReplayTab()}
            </div>
          </TabsContent>
          
          <TabsContent value="visual" className="border-none p-0">
            <div className="py-4">
              {/* Replay controls */}
              <div className="flex items-center justify-between bg-[#1F1D36]/50 p-3 rounded-md mb-4">
                <div className="flex space-x-2">
                  {isReplaying ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="bg-[#1F1D36] hover:bg-[#432874]/30"
                      onClick={stopReplay}
                    >
                      <Pause className="h-4 w-4 mr-1" /> Pause
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="bg-[#1F1D36] hover:bg-[#432874]/30"
                      onClick={startReplay}
                    >
                      <Play className="h-4 w-4 mr-1" /> Play
                    </Button>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-[#1F1D36] hover:bg-[#432874]/30"
                    onClick={() => {
                      stopReplay();
                      if (currentReplayStep < replayActionsRef.current.length) {
                        setCurrentReplayStep(currentReplayStep + 1);
                      }
                    }}
                  >
                    <Forward className="h-4 w-4" />
                  </Button>
                  
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="bg-[#1F1D36] hover:bg-[#432874]/30"
                    onClick={resetReplay}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Speed:</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={`px-2 ${replaySpeed === 0.5 ? 'bg-[#432874]/30' : ''}`}
                    onClick={() => setReplaySpeed(0.5)}
                  >
                    0.5x
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={`px-2 ${replaySpeed === 1 ? 'bg-[#432874]/30' : ''}`}
                    onClick={() => setReplaySpeed(1)}
                  >
                    1x
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={`px-2 ${replaySpeed === 2 ? 'bg-[#432874]/30' : ''}`}
                    onClick={() => setReplaySpeed(2)}
                  >
                    2x
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className={`px-2 ${replaySpeed === 4 ? 'bg-[#432874]/30' : ''}`}
                    onClick={() => setReplaySpeed(4)}
                  >
                    4x
                  </Button>
                </div>
              </div>
              
              {/* Render visual battle replay */}
              {renderReplayTab()}
            </div>
          </TabsContent>
          
          <TabsContent value="summary" className="border-none p-0">
            {renderBattleSummary()}
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex items-center justify-between pt-4 border-t border-[#432874]/50">
          <div>
            <span className="text-xs text-[#C8B8DB]/50">
              Type: {activeTab === 'log' ? 'Full Log' : activeTab === 'replay' ? 'Action Replay' : activeTab === 'visual' ? 'Visual Battle' : 'Battle Summary'}
            </span>
          </div>
          
          <Button 
            variant="outline" 
            onClick={onClose}
            className="bg-[#1F1D36] hover:bg-[#432874]/30 border-[#432874]/50"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BattleLog;