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
  Sparkles
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface BattleLogProps {
  isOpen: boolean;
  onClose: () => void;
  battleLog: any[];
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
  
  const replayTimerRef = useRef<number | null>(null);
  const replayActionsRef = useRef<any[]>([]);
  
  // Reset replay state when the dialog is opened or closed
  useEffect(() => {
    if (isOpen) {
      // Generate battle summary when dialog opens
      generateBattleSummary();
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
  
  // Process the battle log to extract all actions for replay
  useEffect(() => {
    if (battleLog && Array.isArray(battleLog)) {
      const actions: any[] = [];
      
      // Process each entry in the battle log
      battleLog.forEach(entry => {
        // Handle stage-based format
        if ('stage' in entry) {
          // Add stage header
          actions.push({
            type: 'stage-header',
            stage: entry.stage,
            isBossStage: entry.isBossStage,
          });
          
          // Add enemies introduction
          if (entry.enemies && entry.enemies.length > 0) {
            actions.push({
              type: 'enemies-intro',
              enemies: entry.enemies,
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
    setIsReplaying(true);
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
  
  // Reset replay to beginning
  const resetReplay = () => {
    setCurrentReplayStep(0);
    setIsReplaying(false);
    if (replayTimerRef.current) {
      clearTimeout(replayTimerRef.current);
      replayTimerRef.current = null;
    }
  };
  
  // Advance replay to next step
  const advanceReplay = () => {
    if (currentReplayStep < replayActionsRef.current.length) {
      const action = replayActionsRef.current[currentReplayStep];
      const delay = action?.displayDelay ? action.displayDelay / replaySpeed : 1500 / replaySpeed;
      
      setCurrentReplayStep(prev => prev + 1);
      
      // Schedule next step
      if (currentReplayStep < replayActionsRef.current.length - 1) {
        replayTimerRef.current = window.setTimeout(() => {
          if (isReplaying) {
            advanceReplay();
          }
        }, delay);
      } else {
        // End of replay
        setIsReplaying(false);
      }
    } else {
      setIsReplaying(false);
    }
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
  
  // Render the current step for replay mode
  const renderCurrentReplayStep = () => {
    if (currentReplayStep === 0 || currentReplayStep > replayActionsRef.current.length) {
      return (
        <div className="flex flex-col items-center justify-center py-10">
          <p className="text-[#C8B8DB]/70 mb-4">
            Press play to start the battle replay
          </p>
        </div>
      );
    }
    
    // Get all actions up to the current step
    const actionsToRender = replayActionsRef.current.slice(0, currentReplayStep);
    const lastAction = actionsToRender[actionsToRender.length - 1];
    
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
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="log" className="data-[state=active]:bg-[#432874] data-[state=active]:text-white">
              <ScrollText className="h-4 w-4 mr-2" />
              Log
            </TabsTrigger>
            <TabsTrigger value="replay" className="data-[state=active]:bg-[#432874] data-[state=active]:text-white">
              <Play className="h-4 w-4 mr-2" />
              Replay
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
                      disabled={currentReplayStep >= replayActionsRef.current.length}
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
              <p className="text-xs text-[#C8B8DB]/60">
                Watch the battle unfold with timed animations. The replay shows detailed combat events including skill usage and damage indicators.
              </p>
            </div>
            
            {renderCurrentReplayStep()}
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