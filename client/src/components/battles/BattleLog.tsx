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

  const [battleState, setBattleState] = useState<BattleState>({
    characters: [],
    enemies: [],
    currentTurn: 0,
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
    if (!battleSummary) {
      return (
        <div className="py-8 text-center">
          <p className="text-[#C8B8DB]/70">No summary data available</p>
        </div>
      );
    }
    const finalResult = battleLog.find((entry: any) => 'finalSummary' in entry);
    return (
      <div className="space-y-3 py-2">
        <div className="bg-[#1F1D36]/50 rounded-lg p-3">
          <h3 className="text-[#FF9D00] font-cinzel text-base mb-2">Battle Overview</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-[#1A1A2E] rounded p-2 flex flex-col items-center justify-center">
              <p className="text-[#C8B8DB]/70 text-xs">Total Rounds</p>
              <p className="text-xl font-cinzel text-[#FF9D00]">{battleSummary.totalRounds}</p>
            </div>
            <div className="bg-[#1A1A2E] rounded p-2 flex flex-col items-center justify-center">
              <p className="text-[#C8B8DB]/70 text-xs">Duration</p>
              <p className="text-xl font-cinzel text-[#00B9AE]">
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
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-[#C8B8DB]/70">Damage Out</p>
                      <p className="font-semibold text-[#DC143C]">{enemy.stats.damageDealt}</p>
                    </div>
                    <div>
                      <p className="text-[#C8B8DB]/70">Damage In</p>
                      <p className="font-semibold text-[#00B9AE]">{enemy.stats.damageReceived}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
                <div className="space-y-2">
                  {battleState.characters.map((character: BattleCombatant) => (
                    <div key={character.id} className="bg-[#1F1D36]/70 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#00B9AE]">{character.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="text-xs flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {Math.max(0, Math.ceil(character.attackTimer))}s
                          </div>
                          <div className="text-xs">HP: {character.hp}/{character.maxHp}</div>
                        </div>
                      </div>
                      <Progress value={(character.hp / character.maxHp) * 100} className="h-2 mb-1" />
                      <Progress 
                        value={((character.attackSpeed - character.attackTimer) / character.attackSpeed) * 100} 
                        className="h-1 bg-[#432874]/20"
                      />
                      <div className="flex flex-wrap gap-1 mt-1">
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
                <div className="space-y-2">
                  {battleState.enemies.map((enemy: BattleCombatant) => (
                    <div key={enemy.id} className="bg-[#1F1D36]/70 rounded-lg p-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-[#DC143C]">{enemy.name}</span>
                        <div className="flex items-center gap-2">
                          <div className="text-xs flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {Math.max(0, Math.ceil(enemy.attackTimer))}s
                          </div>
                          <div className="text-xs">HP: {enemy.hp}/{enemy.maxHp}</div>
                        </div>
                      </div>
                      <Progress value={(enemy.hp / enemy.maxHp) * 100} className="h-2 mb-1" />
                      <Progress 
                        value={((enemy.attackSpeed - enemy.attackTimer) / enemy.attackSpeed) * 100} 
                        className="h-1 bg-[#1F1D36]/60"
                      />
                      <div className="flex flex-wrap gap-1 mt-1">
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