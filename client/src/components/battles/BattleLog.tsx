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
  BarChart4, 
  Heart,
  Circle,
  Scissors,
  Beaker,
  Clock
} from 'lucide-react';

interface BattleLogProps {
  isOpen: boolean;
  onClose: () => void;
  battleLog: any[];
  onCompleteDungeon: (runId: number) => void;
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
  attackSpeed: number; 
  attackTimer: number; 
  skills: BattleSkill[];
  position: number; 
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
  totalDuration: number; 
  mvpCharacter: string | null;
  toughestEnemy: string | null;
}

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
  const [activeTab, setActiveTab] = useState('visual');
  const [battleSummary, setBattleSummary] = useState<BattleSummary | null>(null);
  const [isAutoplaying, setIsAutoplaying] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isAutoplaying) {
      interval = setInterval(() => {
        setBattleState(prevState => {
          let newState = { ...prevState };
          
          // Process characters
          const updatedCharacters = prevState.characters.map(char => {
            let updatedChar = {
              ...char,
              attackTimer: Math.max(0, char.attackTimer - 1),
              hp: char.hp > 0 ? char.hp : 0
            };
            
            if (updatedChar.attackTimer === 0 && updatedChar.hp > 0) {
              const target = newState.enemies.find(e => e.hp > 0);
              if (target) {
                const damage = Math.floor(updatedChar.stats.attack * (Math.random() * 0.3 + 0.85));
                newState.battleLogs.push(`${updatedChar.name} attacks ${target.name} for ${damage} damage!`);
                target.hp = Math.max(0, target.hp - damage);
                updatedChar.attackTimer = updatedChar.attackSpeed;
                
                if (target.hp <= 0) {
                  newState.battleLogs.push(`${target.name} has been defeated!`);
                }
              }
            }
            return updatedChar;
          });
          
          // Process enemies
          const updatedEnemies = newState.enemies.map(enemy => {
            let updatedEnemy = {
              ...enemy,
              attackTimer: Math.max(0, enemy.attackTimer - 1),
              hp: enemy.hp > 0 ? enemy.hp : 0
            };
            
            if (updatedEnemy.attackTimer === 0 && updatedEnemy.hp > 0) {
              const livingChars = updatedCharacters.filter(c => c.hp > 0);
              if (livingChars.length > 0) {
                const target = livingChars[Math.floor(Math.random() * livingChars.length)];
                const damage = Math.floor(updatedEnemy.stats.attack * (Math.random() * 0.3 + 0.85));
                newState.battleLogs.push(`${updatedEnemy.name} attacks ${target.name} for ${damage} damage!`);
                target.hp = Math.max(0, target.hp - damage);
                updatedEnemy.attackTimer = updatedEnemy.attackSpeed;
                
                if (target.hp <= 0) {
                  newState.battleLogs.push(`${target.name} has fallen!`);
                }
              }
            }
            return updatedEnemy;
          });
          
          // Check stage completion
          const allEnemiesDefeated = updatedEnemies.every(e => e.hp <= 0);
          const allCharactersDefeated = updatedCharacters.every(c => c.hp <= 0);
          
          if (allEnemiesDefeated && prevState.currentStage < 8) {
            // Generate new enemies for next stage
            newState.currentStage = prevState.currentStage + 1;
            newState.battleLogs.push(`Stage ${prevState.currentStage} complete! Advancing to stage ${newState.currentStage}...`);
            
            // Heal characters between stages (30% of max HP)
            updatedCharacters.forEach(char => {
              if (char.hp > 0) {
                const healAmount = Math.floor(char.maxHp * 0.3);
                char.hp = Math.min(char.maxHp, char.hp + healAmount);
                newState.battleLogs.push(`${char.name} recovers ${healAmount} HP!`);
              }
            });
            
            // Generate new enemies with scaled stats
            const scalingFactor = 1 + (newState.currentStage * 0.2);
            const newEnemies = generateEnemiesForStage(newState.currentStage, scalingFactor);
            return {
              ...newState,
              characters: updatedCharacters,
              enemies: newEnemies,
              currentTurn: prevState.currentTurn + 1,
              battleLogs: newState.battleLogs.slice(-5)
            };
          }
          
          if (allCharactersDefeated) {
            setIsAutoplaying(false);
            newState.battleLogs.push("Battle ended - Your party has been defeated!");
          }
          
          // Keep only last 5 logs
          if (newState.battleLogs.length > 5) {
            newState.battleLogs = newState.battleLogs.slice(-5);
          }

          return {
            ...newState,
            characters: updatedCharacters,
            enemies: updatedEnemies,
            currentTurn: prevState.currentTurn + 1
          };
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAutoplaying]);

  const generateEnemiesForStage = (stage: number, scalingFactor: number) => {
  const enemyTypes = [
    { name: 'Goblin', baseHp: 80, baseAttack: 15 },
    { name: 'Orc', baseHp: 100, baseAttack: 20 },
    { name: 'Troll', baseHp: 150, baseAttack: 25 },
    { name: 'Dark Elf', baseHp: 90, baseAttack: 22 }
  ];
  
  const numEnemies = Math.min(3, 1 + Math.floor(stage / 3));
  return Array.from({ length: numEnemies }, (_, i) => {
    const enemyType = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
    return {
      id: `enemy-${stage}-${i}`,
      name: `${enemyType.name} ${stage}-${i+1}`,
      hp: Math.floor(enemyType.baseHp * scalingFactor),
      maxHp: Math.floor(enemyType.baseHp * scalingFactor),
      attackSpeed: 5,
      attackTimer: 5,
      position: i,
      type: 'enemy' as const,
      skills: generateDefaultSkills(false),
      stats: {
        attack: Math.floor(enemyType.baseAttack * scalingFactor),
        defense: Math.floor(10 * scalingFactor),
        accuracy: 90,
        speed: 8
      }
    };
  });
};

const [battleState, setBattleState] = useState<BattleState>({
    characters: [],
    enemies: [],
    currentTurn: 0,
    currentStage: 1,
    isActive: false,
    actionLog: [],
    battleLogs: []
  });

  useEffect(() => {
    if (isOpen) {
      generateBattleSummary();
      initializeBattleState();
    }
  }, [isOpen, battleLog]);

  const initializeBattleState = () => {
    if (!battleLog || !Array.isArray(battleLog)) return;
    const characterMap = new Map<string, BattleCombatant>();
    const enemyMap = new Map<string, BattleCombatant>();
    battleLog.forEach(entry => {
      if ('actions' in entry && Array.isArray(entry.actions)) {
        entry.actions.forEach((action: any) => {
          const isCharacter = !action.actor.includes('Enemy');
          const actorMap = isCharacter ? characterMap : enemyMap;
          if (!actorMap.has(action.actor)) {
            const combatant: BattleCombatant = {
              id: action.actor,
              name: action.actor,
              hp: 100, 
              maxHp: 100,
              attackSpeed: isCharacter ? 4 : 5, 
              attackTimer: 0,
              position: actorMap.size, 
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
          if (action.action === 'attack' && action.target) {
            const isTargetCharacter = !action.target.includes('Enemy');
            const targetMap = isTargetCharacter ? characterMap : enemyMap;
            if (!targetMap.has(action.target)) {
              const target: BattleCombatant = {
                id: action.target,
                name: action.target,
                hp: 100, 
                maxHp: 100,
                attackSpeed: isTargetCharacter ? 4 : 5,
                attackTimer: 0,
                position: targetMap.size, 
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
    const characters = Array.from(characterMap.values());
    const enemies = Array.from(enemyMap.values());
    setBattleState({
      characters,
      enemies,
      currentTurn: 0,
      isActive: false,
      actionLog: [],
      battleLogs: []
    });
  };

  const generateDefaultSkills = (isCharacter: boolean): BattleSkill[] => {
    const commonSkills: BattleSkill[] = [
      {
        id: 'basic-attack',
        name: 'Basic Attack',
        damage: isCharacter ? 20 : 15,
        cooldown: 0, 
        currentCooldown: 0,
        icon: 'sword',
        description: 'A basic attack dealing physical damage',
        type: 'attack',
        targetType: 'enemy'
      }
    ];
    if (isCharacter) {
      // Only aura-provided skills will be added during battle initialization
      // This will be handled when processing the character data
    } else {
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

  const generateBattleSummary = () => {
    if (!battleLog || !Array.isArray(battleLog)) return;
    const characterStats = new Map<string, CharacterSummary>();
    const enemyStats = new Map<string, CharacterSummary>();
    let totalRounds = 0;
    battleLog.forEach(entry => {
      if ('stage' in entry && entry.rounds && Array.isArray(entry.rounds)) {
        entry.rounds.forEach(round => {
          totalRounds++;
          if (round.actions && Array.isArray(round.actions)) {
            round.actions.forEach(action => {
              processAction(action, characterStats, enemyStats);
            });
          }
        });
      } else if ('round' in entry) {
        totalRounds++;
        if (entry.actions && Array.isArray(entry.actions)) {
          entry.actions.forEach(action => {
            processAction(action, characterStats, enemyStats);
          });
        }
      }
    });
    let mvp: string | null = null;
    let maxDamage = 0;
    characterStats.forEach((char, id) => {
      if (char.stats.damageDealt > maxDamage) {
        maxDamage = char.stats.damageDealt;
        mvp = char.name;
      }
    });
    let toughest: string | null = null;
    let maxEnemyDamage = 0;
    enemyStats.forEach((enemy, id) => {
      if (enemy.stats.damageDealt > maxEnemyDamage) {
        maxEnemyDamage = enemy.stats.damageDealt;
        toughest = enemy.name;
      }
    });
    const summary: BattleSummary = {
      characters: Array.from(characterStats.values()),
      enemies: Array.from(enemyStats.values()),
      totalRounds,
      totalDuration: totalRounds * 10, 
      mvpCharacter: mvp,
      toughestEnemy: toughest
    };
    setBattleSummary(summary);
  };

  const processAction = (
    action: any, 
    characterStats: Map<string, CharacterSummary>, 
    enemyStats: Map<string, CharacterSummary>
  ) => {
    const isCharacter = !action.actor.includes('Enemy');
    const statsMap = isCharacter ? characterStats : enemyStats;
    const targetMap = isCharacter ? enemyStats : characterStats;
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
    if (action.action === 'attack') {
      actorStats.stats.damageDealt += action.damage || 0;
      if (action.isCritical) {
        actorStats.stats.criticalHits++;
      }
      if (action.target) {
        const targetStats = targetMap.get(action.target);
        if (targetStats) {
          targetStats.stats.damageReceived += action.damage || 0;
        }
      }
    } else if (action.action === 'special') {
      actorStats.stats.specialAbilitiesUsed++;
    } else if (action.action === 'heal') {
      const targetStats = targetMap.get(action.target);
      if (targetStats) {
        targetStats.stats.healingReceived += action.amount || 0;
      }
    } else if (action.action === 'dodge') {
      actorStats.stats.dodges++;
    }
  };

  const renderBattleSummary = () => {
    // Show live battle summary if battle is in progress
    if (isAutoplaying) {
      return (
        <div className="space-y-4 py-2">
          <div className="bg-[#1F1D36]/50 rounded-lg p-4">
            <h3 className="text-[#FF9D00] font-cinzel text-lg mb-4">Live Battle Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              {battleState.characters.map(char => (
                <div key={char.id} className="bg-[#1A1A2E] rounded-lg p-3">
                  <p className="text-[#00B9AE] text-sm mb-1">{char.name}</p>
                  <div className="text-xs">
                    <p>Damage Dealt: {char.stats.damageDealt || 0}</p>
                    <p>Critical Hits: {char.stats.criticalHits || 0}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

    // Show battle completion summary
    if (!battleSummary) {
      return (
        <div className="py-8 text-center">
          <p className="text-[#C8B8DB]/70">No summary data available</p>
        </div>
      );
    }
    const finalResult = battleLog.find((entry: any) => 'finalSummary' in entry);
    return (
      <div className="space-y-4 py-2 max-h-[75vh] overflow-y-auto px-2">
        <div className="bg-[#1F1D36]/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[#FF9D00] font-cinzel text-lg">Battle Summary</h3>
            {battleSummary.mvpCharacter && (
              <Badge className="bg-yellow-900/30 text-yellow-500 border-yellow-900/50 px-3">
                MVP: {battleSummary.mvpCharacter}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#1A1A2E] rounded-lg p-3 text-center">
              <p className="text-[#C8B8DB]/70 text-sm mb-1">Rounds</p>
              <p className="text-2xl font-cinzel text-[#FF9D00]">{battleSummary.totalRounds}</p>
            </div>
            <div className="bg-[#1A1A2E] rounded-lg p-3 text-center">
              <p className="text-[#C8B8DB]/70 text-sm mb-1">Duration</p>
              <p className="text-2xl font-cinzel text-[#00B9AE]">
                {Math.floor(battleSummary.totalDuration / 60)}:{(battleSummary.totalDuration % 60).toString().padStart(2, '0')}
              </p>
            </div>
          </div>
        </div>

        {battleSummary.characters.length > 0 && (
          <div className="space-y-3">
            {battleSummary.characters.map(char => (
              <div key={char.id} className="bg-[#1F1D36]/50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-cinzel text-lg text-[#00B9AE]">{char.name}</h4>
                  {char.name === battleSummary.mvpCharacter && (
                    <Badge className="bg-yellow-900/30 text-yellow-500 border-yellow-900/50">MVP</Badge>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-[#1A1A2E] rounded p-2 text-center">
                    <p className="text-[#C8B8DB]/70 text-xs mb-1">Damage</p>
                    <p className="font-semibold text-[#FF9D00]">{char.stats.damageDealt}</p>
                  </div>
                  <div className="bg-[#1A1A2E] rounded p-2 text-center">
                    <p className="text-[#C8B8DB]/70 text-xs mb-1">Critical Hits</p>
                    <p className="font-semibold text-yellow-500">{char.stats.criticalHits}</p>
                  </div>
                  <div className="bg-[#1A1A2E] rounded p-2 text-center">
                    <p className="text-[#C8B8DB]/70 text-xs mb-1">Healing</p>
                    <p className="font-semibold text-green-500">{char.stats.healingReceived}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {finalResult && (
          <div className={`bg-${finalResult.success ? 'green' : 'red'}-900/20 rounded-lg p-4 mt-4`}>
            <h3 className={`text-${finalResult.success ? 'green' : 'red'}-400 font-cinzel text-xl mb-2`}>
              {finalResult.success ? 'Victory!' : 'Defeat'}
            </h3>
            <p className="text-[#C8B8DB]">{finalResult.finalSummary}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A1A2E] border border-[#432874] text-[#C8B8DB] max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-[#FF9D00] font-cinzel text-xl flex items-center">
            <Swords className="mr-2 h-5 w-5" /> 
            Battle View
          </DialogTitle>
          <DialogDescription className="text-[#C8B8DB]/70">
            {battleLog.find((entry: any) => 'finalSummary' in entry)?.finalSummary || 'Current battle status'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="visual" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="visual" className="data-[state=active]:bg-[#432874] data-[state=active]:text-white">
              <Swords className="h-4 w-4 mr-2" />
              Battle View
            </TabsTrigger>
            <TabsTrigger value="summary" className="data-[state=active]:bg-[#432874] data-[state=active]:text-white">
              <BarChart4 className="h-4 w-4 mr-2" />
              Summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visual" className="border-none p-0">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-md font-semibold text-[#00B9AE] mb-2">Your Party</h3>
                <div className="space-y-1">
                  {battleState.characters.map((character: BattleCombatant) => (
                    <div key={character.id} className="bg-[#1F1D36]/70 rounded p-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#00B9AE] text-sm">{character.name}</span>
                        <div className="flex items-center gap-1">
                          <div className="text-xs flex items-center">
                            <Clock className="h-2 w-2" />
                            {Math.max(0, Math.ceil(character.attackTimer))}s
                          </div>
                          <div className="text-xs">HP: {character.hp}/{character.maxHp}</div>
                        </div>
                      </div>
                      <Progress value={(character.hp / character.maxHp) * 100} className="h-1.5" />
                      <Progress 
                        value={((character.attackSpeed - character.attackTimer) / character.attackSpeed) * 100} 
                        className="h-1 bg-[#432874]/20"
                      />
                      <div className="flex flex-wrap gap-0.5">
                        {character.skills.map((skill: BattleSkill) => (
                          <Badge key={skill.id} className="text-xs bg-[#432874]/50">
                            {getSkillIcon(skill.icon)}
                            <span className="ml-1">{skill.name}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-md font-semibold text-[#DC143C] mb-2">Enemies</h3>
                <div className="space-y-1">
                  {battleState.enemies.map((enemy: BattleCombatant) => (
                    <div key={enemy.id} className="bg-[#1F1D36]/70 rounded p-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#DC143C] text-sm">{enemy.name}</span>
                        <div className="flex items-center gap-1">
                          <div className="text-xs flex items-center">
                            <Clock className="h-2 w-2" />
                            {Math.max(0, Math.ceil(enemy.attackTimer))}s
                          </div>
                          <div className="text-xs">HP: {enemy.hp}/{enemy.maxHp}</div>
                        </div>
                      </div>
                      <Progress value={(enemy.hp / enemy.maxHp) * 100} className="h-1.5" />
                      <Progress 
                        value={((enemy.attackSpeed - enemy.attackTimer) / enemy.attackSpeed) * 100} 
                        className="h-1 bg-[#1F1D36]/60"
                      />
                      <div className="flex flex-wrap gap-0.5">
                        {enemy.skills.map((skill: BattleSkill) => (
                          <Badge key={skill.id} className="text-xs bg-[#1F1D36]/60">
                            {getSkillIcon(skill.icon)}
                            <span className="ml-1">{skill.name}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 bg-[#1F1D36]/90 border border-[#432874]/50 rounded-lg p-2">
              <div className="text-xs max-h-20 overflow-y-auto">
                {battleState.battleLogs.slice(-5).map((log, index) => (
                  <div key={index} className="text-[#C8B8DB]">{log}</div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="summary" className="border-none p-0">
            {renderBattleSummary()}
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex items-center justify-between pt-4 border-t border-[#432874]/50">
          <div className="flex gap-2">
            {!isAutoplaying && battleState.enemies.every(e => e.hp <= 0) ? (
              <Button 
                variant="outline"
                onClick={() => onCompleteDungeon(battleLog[0]?.runId)}
                className="bg-[#2D8A60] hover:bg-[#2D8A60]/80 text-white"
              >
                Collect Rewards
              </Button>
            ) : (
              <Button 
                variant="outline"
                onClick={() => setIsAutoplaying(!isAutoplaying)}
                className={`${isAutoplaying ? 'bg-[#432874]' : 'bg-[#1F1D36]'} hover:bg-[#432874]/30 border-[#432874]/50`}
              >
                {isAutoplaying ? 'Pause' : 'Play'}
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={onClose}
              className="bg-[#1F1D36] hover:bg-[#432874]/30 border-[#432874]/50"
            >
              Close
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BattleLog;