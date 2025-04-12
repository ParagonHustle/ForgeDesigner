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
import { Progress } from '@/components/ui/progress';

interface BattleLogProps {
  isOpen: boolean;
  onClose: () => void;
  battleLog: any[];
}

// Types for battle visualization
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
}

// Types for battle summary
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
    actionLog: []
  });
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
      setCurrentReplayStep(0);
      setIsReplaying(false);
      setActiveTab('log');
    }
    
    return () => {
      if (replayTimerRef.current) {
        clearTimeout(replayTimerRef.current);
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
      actionLog: []
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
      },
      {
        id: 'defensive-stance',
        name: 'Defensive Stance',
        cooldown: 3,
        currentCooldown: 0,
        icon: 'shield',
        description: 'Increase defense for 1 turn',
        type: 'buff',
        targetType: 'self'
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
      
      if (actions.length > 0) {
        console.log(`Initialized ${actions.length} replay actions on start`);
        replayActionsRef.current = actions;
      } else {
        console.error("Failed to create replay actions");
        return;
      }
    }
    
    // If we're at the end, restart from beginning
    if (currentReplayStep >= replayActionsRef.current.length) {
      console.log("Restarting replay from beginning");
      setCurrentReplayStep(0);
    }
    
    console.log(`Starting replay with ${replayActionsRef.current.length} actions`);
    
    // Set replaying state and start animation
    setIsReplaying(true);
    
    // Start or resume animation with a small delay to ensure state updates
    setTimeout(() => {
      advanceReplay();
    }, 100);
  };
  
  // Stop replay animation
  const stopReplay = () => {
    setIsReplaying(false);
    if (replayTimerRef.current !== null) {
      window.clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
  };
  
  // Reset replay to beginning
  const resetReplay = () => {
    stopReplay();
    setCurrentReplayStep(0);
  };
  
  // Advance replay to next step
  const advanceReplay = () => {
    if (!isReplaying) return;
    
    console.log("Advancing replay", currentReplayStep, "of", replayActionsRef.current.length);
    
    // If we've reached the end of the replay
    if (currentReplayStep >= replayActionsRef.current.length) {
      console.log("Reached end of replay");
      setIsReplaying(false);
      return;
    }
    
    // Get current action for delay calculation
    const action = replayActionsRef.current[currentReplayStep];
    console.log("Current action:", action);
    
    // Calculate appropriate delay
    const delay = action?.displayDelay ? action.displayDelay / replaySpeed : 1500 / replaySpeed;
    console.log("Delay:", delay, "ms at speed", replaySpeed);
    
    // Update current step
    setCurrentReplayStep(prev => prev + 1);
    
    // Schedule next step with appropriate delay
    replayTimerRef.current = window.setTimeout(() => {
      // Check if we're still supposed to be replaying
      if (isReplaying) {
        advanceReplay();
      }
    }, delay);
  };
  
  // Fast forward - increase replay speed
  const fastForward = () => {
    setReplaySpeed(prev => Math.min(prev * 2, 8));
  };
  
  // Render an action for the replay view
  const renderReplayAction = (action: any) => {
    if (action.type === 'stage-header') {
      return (
        <div className="py-3 px-4 bg-[#432874]/30 rounded-lg mb-3">
          <h3 className="text-lg font-cinzel font-bold text-[#FF9D00] flex items-center">
            <Sparkles className="mr-2 h-5 w-5" />
            Stage {action.stage} {action.isBossStage ? '- Boss Stage!' : ''}
          </h3>
        </div>
      );
    }
    
    if (action.type === 'enemies-intro') {
      return (
        <div className="py-2 px-3 bg-[#DC143C]/10 rounded-lg mb-3">
          <p className="text-sm mb-2">Encountered enemies:</p>
          <div className="flex flex-wrap gap-2">
            {action.enemies.map((enemy: any, idx: number) => (
              <Badge key={idx} className="bg-[#DC143C]/20 text-[#DC143C] border-[#DC143C]/30">
                {enemy.name} (Lvl {enemy.level || '?'})
              </Badge>
            ))}
          </div>
        </div>
      );
    }
    
    if (action.type === 'round-header') {
      return (
        <div className="py-2 px-3 bg-[#1F1D36]/80 rounded-lg mb-3">
          <h4 className="text-md font-semibold text-[#C8B8DB]">Round {action.round}</h4>
        </div>
      );
    }
    
    if (action.type === 'action') {
      // Customize action display based on type
      let icon = <Swords className="h-5 w-5 inline mr-2" />;
      let textColor = action.actor.includes('Enemy') 
        ? "text-[#DC143C]"
        : "text-[#00B9AE]";
        
      if (action.action === 'defend') icon = <Shield className="h-5 w-5 inline mr-2" />;
      if (action.action === 'special') icon = <Zap className="h-5 w-5 inline mr-2" />;
      if (action.action === 'heal') icon = <Heart className="h-5 w-5 inline mr-2 text-green-400" />;
      
      // Determine skill name based on action properties
      let skillName = '';
      if (action.skillName) {
        skillName = action.skillName;
      } else if (action.action === 'attack') {
        skillName = action.isCritical ? 'Critical Strike' : 'Basic Attack';
      } else if (action.action === 'defend') {
        skillName = 'Defensive Stance';
      } else if (action.action === 'special') {
        skillName = 'Special Ability';
      } else if (action.action === 'heal') {
        skillName = 'Healing';
      }
      
      return (
        <div className={`py-2 px-3 ${action.isCritical ? 'bg-[#FFD700]/10' : 'bg-[#1F1D36]/50'} rounded-lg mb-2 ${textColor}`}>
          <div className="flex flex-col">
            <p className="flex items-center">
              {icon}
              <span className="font-semibold">{action.actor}</span>
              <span className="mx-1">uses</span>
              <Badge className={`${action.isCritical ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-[#432874]/20 text-[#C8B8DB]'} border-0`}>
                {skillName}
              </Badge>
            </p>
            
            {action.action === 'attack' && (
              <div className="ml-7 mt-1">
                <span>Deals </span>
                <span className="font-bold">{action.damage}</span>
                <span> damage to </span>
                <span className="font-semibold">{action.target}</span>
                {action.elementalEffect && (
                  <Badge className="ml-2 bg-purple-500/20 text-purple-300 border-0">
                    {action.elementalEffect} Effect
                  </Badge>
                )}
                {action.targetRemainingHp && (
                  <div className="mt-1">
                    <Progress 
                      value={(action.targetRemainingHp / action.targetMaxHp) * 100} 
                      className="h-2 bg-[#432874]/30"
                    />
                    <span className="text-xs">
                      {action.targetRemainingHp}/{action.targetMaxHp} HP
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }
    
    if (action.type === 'stage-outcome') {
      return (
        <div className={`py-2 px-3 ${action.outcome === 'victory' ? 'bg-green-700/10' : 'bg-red-700/10'} rounded-lg mb-3`}>
          <p className={action.outcome === 'victory' ? 'text-green-400' : 'text-red-400'}>
            {action.summary || `Stage ${action.outcome === 'victory' ? 'cleared' : 'failed'}!`}
          </p>
        </div>
      );
    }
    
    if (action.type === 'recovery') {
      return (
        <div className="py-2 px-3 bg-[#00B9AE]/10 rounded-lg mb-3">
          <p className="text-[#00B9AE]/90 mb-1">{action.message}</p>
          <div className="flex flex-wrap gap-2">
            {action.characters?.map((char: any) => (
              <Badge key={char.id} className="bg-[#00B9AE]/20 text-[#00B9AE] border-[#00B9AE]/30">
                {char.name}: {char.hp}/{char.maxHp} HP
              </Badge>
            ))}
          </div>
        </div>
      );
    }
    
    if (action.type === 'final-result') {
      return (
        <div className={`py-3 px-4 ${action.success ? 'bg-green-700/10' : 'bg-red-700/10'} rounded-lg mb-3`}>
          <h3 className={`text-lg font-cinzel font-bold ${action.success ? 'text-green-400' : 'text-red-400'}`}>
            {action.success ? 'Victory!' : 'Defeat'}
          </h3>
          <p className="mt-1">{action.finalSummary}</p>
        </div>
      );
    }
    
    return (
      <div className="py-2 px-3 bg-[#1F1D36]/50 rounded-lg mb-2">
        <p>{JSON.stringify(action)}</p>
      </div>
    );
  };
  if (!battleLog || !Array.isArray(battleLog)) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB] max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[#FF9D00] font-cinzel text-xl">Battle Log</DialogTitle>
            <DialogDescription className="text-[#C8B8DB]/70">
              No battle log data available
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 text-center">
            <p>The battle log data is unavailable or in an unexpected format.</p>
          </div>
          <DialogFooter>
            <Button onClick={onClose} className="bg-[#432874]/50 hover:bg-[#432874]/70">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Check if it's a final result
  const finalResult = battleLog.find(entry => 'finalSummary' in entry);
  
  // Render the classic battle log tab
  const renderBattleLog = () => {
    return (
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
          
          // Handle simple round-based entries (older format)
          if ('round' in entry) {
            return (
              <div key={`round-${index}`} className="bg-[#1F1D36]/50 p-3 rounded-md mb-4">
                <p className="text-md font-semibold font-cinzel text-[#FF9D00] mb-2">Round {entry.round}</p>
                <div className="space-y-2">
                  {entry.actions?.map((action: any, actionIdx: number) => {
                    // Customize action display based on type
                    let icon = <Swords className="h-4 w-4 mr-2" />;
                    let textColor = action.actor.includes('Enemy') 
                      ? "text-[#DC143C]"
                      : "text-[#00B9AE]";
                      
                    // Get skill name if available
                    let skillName = action.skillName || (
                      action.action === 'attack' 
                        ? (action.isCritical ? 'Critical Strike' : 'Basic Attack')
                        : action.action === 'defend' ? 'Defensive Stance' : 'Special Ability'
                    );
                      
                    return (
                      <div key={`action-${actionIdx}`} className={`p-2 ${action.isCritical ? 'bg-[#FFD700]/10' : 'bg-[#1F1D36]/80'} rounded-md ${textColor}`}>
                        <div className="flex items-center">
                          {icon}
                          <span className="font-semibold">{action.actor}</span>
                          <span className="mx-1">uses</span>
                          <Badge className={`${action.isCritical ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-[#432874]/20 text-[#C8B8DB]'} border-0`}>
                            {skillName}
                          </Badge>
                        </div>
                        {action.action === 'attack' && (
                          <div className="ml-8 mt-1 text-sm">
                            <span>Deals </span>
                            <span className="font-bold">{action.damage}</span>
                            <span> damage to </span>
                            <span className="font-semibold">{action.target}</span>
                            {action.elementalEffect && (
                              <Badge className="ml-2 bg-purple-500/20 text-purple-300 border-0">
                                {action.elementalEffect} Effect
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          
          // Handle other types of entries
          return (
            <div key={`entry-${index}`} className="p-3 bg-[#432874]/20 rounded-md text-sm mb-3">
              {JSON.stringify(entry)}
            </div>
          );
        })}
      </div>
    );
  };
  
  // Initialize the replay actions if they're not already set
  useEffect(() => {
    if (isOpen && battleLog && Array.isArray(battleLog) && (!replayActionsRef.current || replayActionsRef.current.length === 0)) {
      console.log("Initializing replay actions on open");
      
      // Process the battle log entries into replay actions
      const actions: any[] = [];
      
      // Go through each round-based entry and add a round header followed by its actions
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
      
      // If actions were found, store them
      if (actions.length > 0) {
        console.log(`Created ${actions.length} replay actions`, actions);
        replayActionsRef.current = actions;
      }
    }
  }, [isOpen, battleLog]);
  
  // Render the current step for replay mode
  const renderCurrentReplayStep = () => {
    if (replayActionsRef.current.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <p className="text-[#C8B8DB]/70 mb-4">
            No replay data available
          </p>
        </div>
      );
    }
    
    if (currentReplayStep === 0 || currentReplayStep > replayActionsRef.current.length) {
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <p className="text-[#C8B8DB]/70 mb-4">
            Press play to start the battle replay
          </p>
          <div className="mb-3">
            <p className="text-xs text-[#C8B8DB]/50">
              {replayActionsRef.current.length} actions available for replay
            </p>
          </div>
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
  
  // Render the battle summary tab
  const renderBattleSummary = () => {
    if (!battleSummary) {
      return (
        <div className="py-8 text-center">
          <p className="text-[#C8B8DB]/70">No summary data available</p>
        </div>
      );
    }
    
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
        {finalResult && (
          <div className={`bg-${finalResult.success ? 'green' : 'red'}-900/20 rounded-lg p-4`}>
            <h3 className={`text-${finalResult.success ? 'green' : 'red'}-400 font-cinzel text-lg mb-2`}>
              {finalResult.success ? 'Victory!' : 'Defeat'}
            </h3>
            <p>{finalResult.finalSummary}</p>
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
            {finalResult?.finalSummary || 'A record of your dungeon adventure'}
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
                
                // Handle simple round-based entries (older format)
                if ('round' in entry) {
                  return (
                    <div key={`round-${index}`} className="bg-[#1F1D36]/50 p-3 rounded-md mb-4">
                      <p className="text-md font-semibold font-cinzel text-[#FF9D00] mb-2">Round {entry.round}</p>
                      <div className="space-y-2">
                        {entry.actions?.map((action: any, actionIdx: number) => {
                          // Customize action display based on type
                          let icon = <Swords className="h-4 w-4 mr-2" />;
                          let textColor = action.actor.includes('Enemy') 
                            ? "text-[#DC143C]"
                            : "text-[#00B9AE]";
                            
                          // Get skill name if available
                          let skillName = action.skillName || (
                            action.action === 'attack' 
                              ? (action.isCritical ? 'Critical Strike' : 'Basic Attack')
                              : action.action === 'defend' ? 'Defensive Stance' : 'Special Ability'
                          );
                            
                          return (
                            <div key={`action-${actionIdx}`} className={`p-2 ${action.isCritical ? 'bg-[#FFD700]/10' : 'bg-[#1F1D36]/80'} rounded-md ${textColor}`}>
                              <div className="flex items-center">
                                {icon}
                                <span className="font-semibold">{action.actor}</span>
                                <span className="mx-1">uses</span>
                                <Badge className={`${action.isCritical ? 'bg-[#FFD700]/20 text-[#FFD700]' : 'bg-[#432874]/20 text-[#C8B8DB]'} border-0`}>
                                  {skillName}
                                </Badge>
                              </div>
                              {action.action === 'attack' && (
                                <div className="ml-8 mt-1 text-sm">
                                  <span>Deals </span>
                                  <span className="font-bold">{action.damage}</span>
                                  <span> damage to </span>
                                  <span className="font-semibold">{action.target}</span>
                                  {action.elementalEffect && (
                                    <Badge className="ml-2 bg-purple-500/20 text-purple-300 border-0">
                                      {action.elementalEffect} Effect
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                
                // Handle other types of entries
                return (
                  <div key={`entry-${index}`} className="p-3 bg-[#432874]/20 rounded-md text-sm mb-3">
                    {JSON.stringify(entry)}
                  </div>
                );
              })}
            </div>
          </TabsContent>
          
          <TabsContent value="replay" className="border-none p-0">
            <div className="mb-4 bg-[#1F1D36]/70 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex space-x-2">
                  {!isReplaying ? (
                    <Button 
                      onClick={startReplay} 
                      className="bg-[#432874] hover:bg-[#432874]/80"
                      disabled={replayActionsRef.current.length === 0}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      {currentReplayStep === 0 ? 'Start Replay' : 'Resume'}
                    </Button>
                  ) : (
                    <Button 
                      onClick={stopReplay} 
                      className="bg-[#432874] hover:bg-[#432874]/80"
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  )}
                  <Button 
                    onClick={resetReplay} 
                    className="bg-[#1F1D36] hover:bg-[#1F1D36]/80"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
                <div className="flex items-center">
                  <span className="text-sm mr-2">Speed: {replaySpeed}x</span>
                  <Button 
                    onClick={fastForward} 
                    className="bg-[#1F1D36] hover:bg-[#1F1D36]/80"
                    disabled={replaySpeed >= 8}
                  >
                    <Forward className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Status indicator */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${isReplaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium">
                    {isReplaying ? 'Replay in progress...' : 'Replay ready'}
                  </span>
                </div>
                <div className="text-xs text-[#C8B8DB]/80">
                  {replayActionsRef.current.length > 0 ? 
                    `${currentReplayStep} of ${replayActionsRef.current.length} actions` :
                    'No replay data available'}
                </div>
              </div>
              
              <p className="text-xs text-[#C8B8DB]/60">
                Watch the battle unfold with timed animations. The replay shows detailed combat events including skill usage and damage indicators.
              </p>
            </div>
            
            {/* Replay visualization area */}
            <div className={`transition-all duration-200 ${isReplaying ? 'border-2 border-green-500/20 rounded-lg p-2' : ''}`}>
              {renderCurrentReplayStep()}
            </div>
          </TabsContent>
          
          <TabsContent value="visual" className="border-none p-0">
            <div className="mb-4 bg-[#1F1D36]/70 p-3 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex space-x-2">
                  {!isReplaying ? (
                    <Button 
                      onClick={startReplay} 
                      className="bg-[#432874] hover:bg-[#432874]/80"
                      disabled={replayActionsRef.current.length === 0}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      {currentReplayStep === 0 ? 'Start Battle' : 'Resume'}
                    </Button>
                  ) : (
                    <Button 
                      onClick={stopReplay} 
                      className="bg-[#432874] hover:bg-[#432874]/80"
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Pause
                    </Button>
                  )}
                  <Button 
                    onClick={resetReplay} 
                    className="bg-[#1F1D36] hover:bg-[#1F1D36]/80"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Reset
                  </Button>
                </div>
                <div className="flex items-center">
                  <span className="text-sm mr-2">Speed: {replaySpeed}x</span>
                  <Button 
                    onClick={fastForward} 
                    className="bg-[#1F1D36] hover:bg-[#1F1D36]/80"
                    disabled={replaySpeed >= 8}
                  >
                    <Forward className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Visual battle status indicator */}
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${isReplaying ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className="text-sm font-medium">
                    {isReplaying ? 'Battle in progress...' : 'Battle ready'}
                  </span>
                </div>
                <div className="text-xs text-[#C8B8DB]/80">
                  {replayActionsRef.current.length > 0 ? 
                    `Action ${currentReplayStep} of ${replayActionsRef.current.length}` :
                    'No battle data available'}
                </div>
              </div>
              
              <p className="text-xs text-[#C8B8DB]/60">
                Watch the battle unfold with detailed visuals. See all combatants, their skills, and attack timers in real-time.
              </p>
            </div>
            
            {/* Visual battle arena */}
            <div className={`transition-all duration-200 ${isReplaying ? 'border-2 border-green-500/20 rounded-lg p-2' : ''}`}>
              {renderCurrentReplayStep()}
            </div>
          </TabsContent>
          
          <TabsContent value="summary" className="border-none p-0">
            {renderBattleSummary()}
          </TabsContent>
        </Tabs>
        
        <DialogFooter>
          <Button onClick={onClose} className="bg-[#432874] hover:bg-[#432874]/70">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};



export default BattleLog;