import { useState, useEffect, useRef } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Pause, Play, SkipForward, Rewind, Swords, Heart, Shield, Zap, ChevronRight, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

/**
 * Types for battle system
 */
interface BattleUnit {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  attackMeter: number;
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
  statusEffects: StatusEffect[];
}

interface StatusEffect {
  name: string;
  type: string;
  value: number;
  duration: number;
  source?: string;
}

interface BattleSkill {
  name: string;
  damage: number;
  cooldown?: number;
  special?: string;
  aoe?: boolean;
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

interface BattleEvent {
  type: string;
  timestamp?: number;
  
  // Round-specific properties
  number?: number;
  actions?: BattleAction[];
  remainingAllies?: number;
  remainingEnemies?: number;
  
  // Stage properties
  allies?: BattleUnit[];
  enemies?: BattleUnit[];
  currentStage?: number;
  totalStages?: number;
  message?: string;
  
  // System message
  system_message?: string;
  
  // Summary
  victory?: boolean;
  summary?: string;
  
  [key: string]: any;
}

interface BattleLogProps {
  isOpen: boolean;
  onClose: () => void;
  battleLog: BattleEvent[];
  runId: number;
  onCompleteDungeon: (runId: number) => void;
}

/**
 * BattleLog Component - Enhanced Version
 * Displays battle log events in a structured format with stage progression
 */
export default function BattleLog({ 
  isOpen, 
  onClose, 
  battleLog, 
  runId, 
  onCompleteDungeon 
}: BattleLogProps) {
  const [currentTab, setCurrentTab] = useState('battle');
  const [allies, setAllies] = useState<BattleUnit[]>([]);
  const [enemies, setEnemies] = useState<BattleUnit[]>([]);
  
  // Stage and round management
  const [currentStage, setCurrentStage] = useState(1);
  const [totalStages, setTotalStages] = useState(1);
  const [stagesCompleted, setStagesCompleted] = useState(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [maxRoundPerStage, setMaxRoundPerStage] = useState<Record<number, number>>({});
  
  // Battle status tracking
  const [isVictory, setIsVictory] = useState<boolean | null>(null);
  const [currentView, setCurrentView] = useState<'start' | 'battle' | 'end'>('start');
  
  // Playback state
  const [isPaused, setIsPaused] = useState(true);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [autoPlay, setAutoPlay] = useState(false);
  const playbackTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Battle messages organized by stage and round
  const [battleMessagesByStage, setBattleMessagesByStage] = useState<Record<number, string[]>>({});
  const [currentStageBattleMessages, setCurrentStageBattleMessages] = useState<string[]>([]);
  
  // Animation states
  const [activeAttacker, setActiveAttacker] = useState<string | null>(null);
  const [activeTarget, setActiveTarget] = useState<string | null>(null);
  const [activeSkill, setActiveSkill] = useState<string | null>(null);
  const [showDamageAnimation, setShowDamageAnimation] = useState(false);
  
  // Track battle units by stage
  const [alliesByStage, setAlliesByStage] = useState<Record<number, BattleUnit[]>>({});
  const [enemiesByStage, setEnemiesByStage] = useState<Record<number, BattleUnit[]>>({});
  
  // Process battle log on initial load
  useEffect(() => {
    if (isOpen) {
      console.log('Processing battle log:', battleLog);
      
      // Reset state when opening a new battle log
      setCurrentStage(1);
      setStagesCompleted(0);
      setCurrentRound(0);
      setIsVictory(null);
      setIsPaused(true);
      
      // Clear any existing playback timer
      if (playbackTimerRef.current) {
        clearTimeout(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
      
      // Initialize message collections
      const messagesByStage: Record<number, string[]> = {};
      const roundsByStage: Record<number, number> = {};
      const stageAllies: Record<number, BattleUnit[]> = {};
      const stageEnemies: Record<number, BattleUnit[]> = {};
      
      // If there's no battle log data or it's empty, add a default message
      if (!battleLog || battleLog.length === 0) {
        messagesByStage[1] = ['No battle data available. You can still complete this dungeon to free your characters.'];
        setBattleMessagesByStage(messagesByStage);
        setCurrentStageBattleMessages(messagesByStage[1] || []);
        return;
      }
      
      console.log('Analyzing battle log for stage transitions');
      
      // Find initialization events
      const battleStartEvent = battleLog.find(event => 
        event.type === 'battle_start' || 
        event.type === 'init'
      );
      
      const stageStarts = battleLog.filter(event => event.type === 'stage_start');
      const stageCompletes = battleLog.filter(event => event.type === 'stage_complete');
      const battleEndEvent = battleLog.find(event => event.type === 'battle_end');
      
      // Determine total stages from any reliable source
      let totalStagesCount = 1;
      if (battleStartEvent?.totalStages) {
        totalStagesCount = battleStartEvent.totalStages;
      } else if (battleEndEvent?.totalStages) {
        totalStagesCount = battleEndEvent.totalStages;
      } else if (stageStarts.length > 0) {
        // Find maximum stage number from stage_start events
        totalStagesCount = Math.max(...stageStarts.map(event => event.currentStage || 1));
      }
      setTotalStages(totalStagesCount);
      
      // Set victory state
      if (battleEndEvent) {
        setIsVictory(!!battleEndEvent.victory);
        if (battleEndEvent.completedStages) {
          setStagesCompleted(battleEndEvent.completedStages);
        }
      }
      
      // Initialize intro messages
      messagesByStage[0] = [
        'Battle begins! Your party enters the dungeon.',
        `Entering a dungeon with ${totalStagesCount} stages.`,
        'Prepare for combat!'
      ];
      
      // Process each stage
      for (let stage = 1; stage <= totalStagesCount; stage++) {
        // Initialize empty arrays for this stage
        messagesByStage[stage] = [];
        
        // Find stage start event for this stage
        const stageStartEvent = stageStarts.find(event => event.currentStage === stage);
        if (stageStartEvent) {
          // Add stage start message
          messagesByStage[stage].push(`--- Stage ${stage} Begins ---`);
          
          // Store enemies for this stage
          if (stageStartEvent.enemies && stageStartEvent.enemies.length > 0) {
            stageEnemies[stage] = stageStartEvent.enemies;
            messagesByStage[stage].push(`${stageStartEvent.enemies.length} enemies appear!`);
          }
          
          // Store allies for this stage (carry over from previous stage if needed)
          if (stageStartEvent.allies && stageStartEvent.allies.length > 0) {
            stageAllies[stage] = stageStartEvent.allies;
          } else if (stage > 1 && stageAllies[stage - 1]) {
            // If no allies in this stage event, use the ones from the previous stage
            stageAllies[stage] = stageAllies[stage - 1];
          } else if (battleStartEvent?.allies) {
            // Last resort: use allies from battle start
            stageAllies[stage] = battleStartEvent.allies;
          }
        }
        
        // Find all round events for this stage
        const roundEvents = battleLog.filter(event => 
          event.type === 'round' && 
          (event.currentStage === stage || (!event.currentStage && stage === 1))
        );
        
        // Process round events for this stage
        let maxRound = 0;
        roundEvents.forEach(roundEvent => {
          const roundNum = roundEvent.number || 0;
          if (roundNum > maxRound) maxRound = roundNum;
          
          // Round header
          messagesByStage[stage].push(`Round ${roundNum} begins.`);
          
          // Process actions in the round
          if (roundEvent.actions && roundEvent.actions.length > 0) {
            roundEvent.actions.forEach(action => {
              let actionText = '';
              
              if (action.healing) {
                actionText = `${action.actor} used ${action.skill} to heal ${action.target} for ${action.damage} HP`;
              } else {
                actionText = `${action.actor} used ${action.skill} on ${action.target} for ${action.damage} damage`;
                if (action.isCritical) actionText += ' (Critical hit!)';
              }
              
              if (action.message) {
                actionText = action.message;  // Override with custom message if provided
              }
              
              messagesByStage[stage].push(actionText);
            });
          }
          
          // Add round summary
          if (typeof roundEvent.remainingAllies === 'number' && typeof roundEvent.remainingEnemies === 'number') {
            if (roundEvent.remainingEnemies === 0) {
              messagesByStage[stage].push(`All enemies defeated! End of round ${roundNum}.`);
            } else if (roundEvent.remainingAllies === 0) {
              messagesByStage[stage].push(`Your party has been defeated! End of round ${roundNum}.`);
            } else {
              messagesByStage[stage].push(`End of round ${roundNum}: ${roundEvent.remainingAllies} allies and ${roundEvent.remainingEnemies} enemies remaining.`);
            }
          }
        });
        
        // Store max round for this stage
        roundsByStage[stage] = maxRound;
        
        // Find stage complete event for this stage
        const stageCompleteEvent = stageCompletes.find(event => event.currentStage === stage);
        if (stageCompleteEvent) {
          // Add stage complete message
          messagesByStage[stage].push(`--- Stage ${stage} Complete ---`);
          
          // Update allies with survivors
          if (stageCompleteEvent.aliveAllies && stageCompleteEvent.aliveAllies.length > 0) {
            stageAllies[stage] = stageCompleteEvent.aliveAllies;
            messagesByStage[stage].push(`${stageCompleteEvent.aliveAllies.length} allies survived and continue to the next stage.`);
          }
        }
      }
      
      // Add a summary at the end
      if (battleEndEvent) {
        const finalStage = totalStagesCount;
        if (!messagesByStage[finalStage]) messagesByStage[finalStage] = [];
        
        if (battleEndEvent.summary) {
          messagesByStage[finalStage].push(`--- Battle Summary ---`);
          messagesByStage[finalStage].push(battleEndEvent.summary);
        } else {
          messagesByStage[finalStage].push(`--- Battle Summary ---`);
          messagesByStage[finalStage].push(battleEndEvent.victory 
            ? `Victory! Your party conquered ${battleEndEvent.completedStages || stagesCompleted}/${totalStagesCount} stages.` 
            : `Defeat! Your party was overwhelmed at stage ${battleEndEvent.currentStage || currentStage}.`);
        }
      }
      
      // Set state with all our stage data
      setBattleMessagesByStage(messagesByStage);
      setAlliesByStage(stageAllies);
      setEnemiesByStage(stageEnemies);
      setMaxRoundPerStage(roundsByStage);
      
      // Set current stage to 1 and set messages for stage 1
      setCurrentStage(1);
      setCurrentStageBattleMessages(messagesByStage[1] || messagesByStage[0] || []);
      
      // If we have allies and enemies for stage 1, set them as active
      if (stageAllies[1]) setAllies(stageAllies[1]);
      if (stageEnemies[1]) setEnemies(stageEnemies[1]);
      
      console.log('Battle log processing complete. Messages by stage:', messagesByStage);
    }
  }, [isOpen, battleLog]);
  
  // Function to change the active stage
  const changeStage = (stageNum: number) => {
    // Make sure stage is within valid range
    const validStage = Math.max(1, Math.min(stageNum, totalStages));
    
    // Update current stage
    setCurrentStage(validStage);
    
    // Update UI with data for this stage
    setCurrentStageBattleMessages(battleMessagesByStage[validStage] || []);
    
    // Update allies and enemies for this stage
    if (alliesByStage[validStage]) {
      setAllies(alliesByStage[validStage]);
    }
    if (enemiesByStage[validStage]) {
      setEnemies(enemiesByStage[validStage]);
    }
    
    // Reset current round when changing stages
    setCurrentRound(0);
    
    // Pause playback when changing stages
    setIsPaused(true);
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
  };
  
  // Go to next stage
  const goToNextStage = () => {
    if (currentStage < totalStages) {
      changeStage(currentStage + 1);
    }
  };
  
  // Go to previous stage
  const goToPrevStage = () => {
    if (currentStage > 1) {
      changeStage(currentStage - 1);
    }
  };
  
  // Toggle auto-play
  const toggleAutoPlay = () => {
    setAutoPlay(!autoPlay);
    
    // If enabling autoplay, make sure we're not paused
    if (!autoPlay) {
      setIsPaused(false);
    }
  };
  
  // Handle closing the dialog
  const handleClose = () => {
    // Clear any playback timer
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    
    // Reset all state
    setAllies([]);
    setEnemies([]);
    setCurrentStageBattleMessages([]);
    setBattleMessagesByStage({});
    setCurrentRound(0);
    setCurrentStage(1);
    setTotalStages(1);
    setStagesCompleted(0);
    setIsVictory(null);
    setAlliesByStage({});
    setEnemiesByStage({});
    setMaxRoundPerStage({});
    setAutoPlay(false);
    setIsPaused(true);
    onClose();
  };
  
  // Handle completing the dungeon
  const handleComplete = () => {
    onCompleteDungeon(runId);
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="h-5 w-5" />
              <span>
                {totalStages > 1 
                  ? `Battle Report - Stage ${currentStage}/${totalStages}` 
                  : 'Battle Report'} 
                {currentRound > 0 && ` (Round ${currentRound})`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 px-2 py-0 text-xs"
                onClick={() => setCurrentStage(1)}
              >
                <Play className="h-3 w-3 mr-1" />
                Restart
              </Button>
            </div>
          </DialogTitle>
          <DialogDescription>
            {isVictory === true && `Your party completed ${stagesCompleted}/${totalStages} stages successfully!`}
            {isVictory === false && `Your party was defeated at stage ${currentStage}.`}
            {isVictory === null && `Multi-stage dungeon - battle through all ${totalStages} stages to complete`}
          </DialogDescription>
        </DialogHeader>
        
        {/* Stage Progress Bar */}
        {totalStages > 1 && (
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span>Stage Progress</span>
              <span>{stagesCompleted}/{totalStages} Stages</span>
            </div>
            <div className="h-2 bg-[#1D1128] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#7B4AE2] to-[#4AE292]"
                style={{ width: `${(stagesCompleted / totalStages) * 100}%` }}
              />
            </div>
          </div>
        )}
        
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1 min-h-0 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="battle">Battle Log</TabsTrigger>
            <TabsTrigger value="units">Combatants</TabsTrigger>
          </TabsList>
          
          {/* Stage Navigation */}
          {totalStages > 1 && (
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="outline"
                size="sm"
                disabled={currentStage <= 1}
                onClick={goToPrevStage}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous Stage
              </Button>
              
              <div className="flex items-center gap-2">
                <div className="text-sm">
                  Stage {currentStage} of {totalStages}
                </div>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                disabled={currentStage >= totalStages}
                onClick={goToNextStage}
              >
                Next Stage
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
          
          {/* Battle Log Tab */}
          <TabsContent value="battle" className="flex-1 min-h-0 flex flex-col">
            <ScrollArea className="flex-1 rounded-md border border-[#432874] p-4 bg-[#251942]">
              {!currentStageBattleMessages || currentStageBattleMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#C8B8DB] space-y-2 py-8">
                  <div className="text-center">
                    <p className="font-medium text-[#E5DBFF]">No battle data available for this stage</p>
                    <p className="text-sm mt-1">Try viewing a different stage or click "Complete Dungeon & Claim Rewards" to free your characters</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {currentStageBattleMessages.map((message: string, i: number) => (
                    <div 
                      key={i} 
                      className={`px-3 py-2 rounded-md ${
                        message.includes('Critical') ? 'bg-[#432874]' : 
                        message.includes('System:') ? 'bg-[#1D1128] border border-[#432874]' :
                        message.includes('Stage') && message.includes('Begins') ? 'bg-[#432874] border border-[#7B4AE2] mt-4 font-medium' :
                        message.includes('Stage') && message.includes('Complete') ? 'bg-[#1D4136] border border-[#4AE292] mt-2 font-medium' :
                        message.includes('Battle Summary') ? 'bg-[#432874] border border-[#7B4AE2] mt-4 font-semibold' :
                        i % 2 === 0 ? 'bg-[#321959]/50' : 'bg-transparent'
                      }`}
                    >
                      {message}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            
            {/* Playback Controls */}
            <div className="flex items-center justify-between mt-4 bg-[#1D1128] p-2 rounded-md">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? <Play className="h-4 w-4 mr-1" /> : <Pause className="h-4 w-4 mr-1" />}
                {isPaused ? 'Play' : 'Pause'}
              </Button>
              
              <div className="flex items-center gap-2">
                <Label htmlFor="autoplay" className="text-xs">Auto-Play</Label>
                <Switch 
                  id="autoplay" 
                  checked={autoPlay} 
                  onCheckedChange={toggleAutoPlay} 
                />
              </div>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={goToNextStage}
                disabled={currentStage >= totalStages}
              >
                <SkipForward className="h-4 w-4 mr-1" />
                Skip to Next Stage
              </Button>
            </div>
          </TabsContent>
          
          {/* Units Tab */}
          <TabsContent value="units" className="flex-1 min-h-0 flex flex-col">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Allies Column */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#E5DBFF]">Your Party</h3>
                {allies.length === 0 ? (
                  <div className="text-[#C8B8DB] text-center py-4">No ally data</div>
                ) : (
                  <div className="space-y-2">
                    {allies.map(unit => (
                      <div key={unit.id} className="bg-[#321959] rounded-md p-3 relative">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-medium text-[#E5DBFF]">{unit.name}</div>
                          <Badge variant={unit.hp <= 0 ? "destructive" : "outline"}>
                            {unit.hp <= 0 ? 'Defeated' : 'Active'}
                          </Badge>
                        </div>
                        
                        {/* Health Bar */}
                        <div className="space-y-1 mb-2">
                          <div className="flex justify-between text-xs">
                            <span>HP: {Math.max(0, unit.hp)} / {unit.maxHp}</span>
                            <span>{Math.floor((unit.hp / unit.maxHp) * 100)}%</span>
                          </div>
                          <Progress 
                            value={Math.max(0, (unit.hp / unit.maxHp) * 100)} 
                            className="h-2"
                          />
                        </div>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 text-xs text-[#C8B8DB]">
                          <div className="flex items-center gap-1">
                            <Swords className="h-3 w-3" /> ATK: {unit.stats.attack}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> VIT: {unit.stats.vitality}
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" /> SPD: {unit.stats.speed}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Enemies Column */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-[#E5DBFF]">Enemies</h3>
                {enemies.length === 0 ? (
                  <div className="text-[#C8B8DB] text-center py-4">No enemy data</div>
                ) : (
                  <div className="space-y-2">
                    {enemies.map(unit => (
                      <div key={unit.id} className="bg-[#321959] rounded-md p-3 relative">
                        <div className="flex justify-between items-start mb-1">
                          <div className="font-medium text-[#E5DBFF]">{unit.name}</div>
                          <Badge variant={unit.hp <= 0 ? "destructive" : "outline"}>
                            {unit.hp <= 0 ? 'Defeated' : 'Active'}
                          </Badge>
                        </div>
                        
                        {/* Health Bar */}
                        <div className="space-y-1 mb-2">
                          <div className="flex justify-between text-xs">
                            <span>HP: {Math.max(0, unit.hp)} / {unit.maxHp}</span>
                            <span>{Math.floor((unit.hp / unit.maxHp) * 100)}%</span>
                          </div>
                          <Progress 
                            value={Math.max(0, (unit.hp / unit.maxHp) * 100)} 
                            className="h-2"
                          />
                        </div>
                        
                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-2 text-xs text-[#C8B8DB]">
                          <div className="flex items-center gap-1">
                            <Swords className="h-3 w-3" /> ATK: {unit.stats.attack}
                          </div>
                          <div className="flex items-center gap-1">
                            <Heart className="h-3 w-3" /> VIT: {unit.stats.vitality}
                          </div>
                          <div className="flex items-center gap-1">
                            <Zap className="h-3 w-3" /> SPD: {unit.stats.speed}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="flex flex-col gap-2 sm:gap-0">
          {/* Always show a button to claim rewards/complete dungeon, 
              regardless of battle log state */}
          <Button 
            onClick={handleComplete} 
            className="w-full"
            variant="default"
            size="lg"
          >
            Complete Dungeon & Claim Rewards
          </Button>
          
          <div className="text-xs text-center text-muted-foreground mt-1">
            Completing this dungeon will free your characters for other tasks
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}