import { useState, useEffect } from 'react';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Pause, Play, SkipForward, Swords, Heart, Shield, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  const [battleMessages, setBattleMessages] = useState<string[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentStage, setCurrentStage] = useState(1);
  const [totalStages, setTotalStages] = useState(1);
  const [stagesCompleted, setStagesCompleted] = useState(0);
  const [isVictory, setIsVictory] = useState<boolean | null>(null);
  const [currentView, setCurrentView] = useState<'start' | 'battle' | 'end'>('start');
  
  // Process battle log on initial load
  useEffect(() => {
    if (isOpen) {
      console.log('Processing battle log:', battleLog);
      
      // Reset state when opening a new battle log
      setCurrentStage(1);
      setStagesCompleted(0);
      setCurrentRound(0);
      setIsVictory(null);
      
      // Initialize messages
      const messages: string[] = [];
      
      // If there's no battle log data or it's empty, add a default message
      if (!battleLog || battleLog.length === 0) {
        messages.push('No battle data available. You can still complete this dungeon to free your characters.');
        setBattleMessages(messages);
        return;
      }
      
      console.log('Analyzing battle log for stage transitions');
      
      // Find the initial battle_start event to properly initialize character stats
      const battleStartEvent = battleLog.find(event => 
        event.type === 'battle_start' || 
        event.type === 'init' || 
        (event.type === 'stage_start' && event.currentStage === 1)
      );
      
      // Find the first stage event to correctly handle character HP
      if (battleStartEvent) {
        console.log('Found initial battle setup event:', battleStartEvent);
        
        // Set initial allies with proper HP
        if (battleStartEvent.allies && battleStartEvent.allies.length > 0) {
          // Make sure initial characters have their full HP
          const initialAllies = battleStartEvent.allies.map(ally => ({
            ...ally,
            hp: ally.maxHp // Start with full health
          }));
          setAllies(initialAllies);
          console.log(`Set ${initialAllies.length} initial allies with full HP`);
        }
        
        // Set initial enemies
        if (battleStartEvent.enemies && battleStartEvent.enemies.length > 0) {
          setEnemies(battleStartEvent.enemies);
          console.log(`Set ${battleStartEvent.enemies.length} initial enemies`);
        }
        
        // Set total stages if available
        if (battleStartEvent.totalStages) {
          setTotalStages(battleStartEvent.totalStages);
          console.log(`Set total stages to ${battleStartEvent.totalStages}`);
        }
      }
      
      // Look for stage_complete and stage_start events specifically
      const stageCompleteEvents = battleLog.filter(event => event.type === 'stage_complete');
      const stageStartEvents = battleLog.filter(event => event.type === 'stage_start');
      
      // Find the dungeon_complete or battle_end event for final stage information
      const dungeonCompleteEvent = battleLog.find(event => event.type === 'dungeon_complete');
      const battleEndEvent = battleLog.find(event => event.type === 'battle_end');
      
      // Extract the most accurate stage information
      if (dungeonCompleteEvent) {
        // Most reliable source of stage completion data
        if (dungeonCompleteEvent.stagesCompleted !== undefined && dungeonCompleteEvent.totalStages !== undefined) {
          setStagesCompleted(dungeonCompleteEvent.stagesCompleted);
          setTotalStages(dungeonCompleteEvent.totalStages);
          console.log(`From dungeon_complete: Completed ${dungeonCompleteEvent.stagesCompleted}/${dungeonCompleteEvent.totalStages} stages`);
        }
      } else if (battleEndEvent) {
        // Second best source of stage completion data
        if (battleEndEvent.completedStages !== undefined && battleEndEvent.totalStages !== undefined) {
          setStagesCompleted(battleEndEvent.completedStages);
          setTotalStages(battleEndEvent.totalStages);
          console.log(`From battle_end: Completed ${battleEndEvent.completedStages}/${battleEndEvent.totalStages} stages`);
        }
      } else if (stageCompleteEvents.length > 0) {
        // Third best - count the stage_complete events
        setStagesCompleted(stageCompleteEvents.length);
        if (stageCompleteEvents[0].totalStages) {
          setTotalStages(stageCompleteEvents[0].totalStages);
        }
        console.log(`From stage_complete events: Completed ${stageCompleteEvents.length} stages`);
      }
      
      // Process the battle log events for display
      if (battleEndEvent) {
        if (battleEndEvent.completedStages) {
          setStagesCompleted(battleEndEvent.completedStages);
        }
        setIsVictory(!!battleEndEvent.victory);
      }
      
      console.log(`Found ${stageCompleteEvents.length} stage_complete events and ${stageStartEvents.length} stage_start events`);
      
      // Ensure battle log is processed in the right order
      messages.push('Battle begins! Your party enters the dungeon.');
      
      // Process each event in the log
      battleLog.forEach((event, index) => {
        // Extract battle configuration from battle_start event
        if (event.type === 'battle_start' || event.type === 'init') {
          if (event.allies) {
            setAllies(event.allies);
            console.log(`Set ${event.allies.length} initial allies`);
          }
          if (event.enemies) {
            setEnemies(event.enemies);
            console.log(`Set ${event.enemies.length} initial enemies`);
          }
          
          // Set total stages if available 
          if (event.totalStages) {
            setTotalStages(event.totalStages);
            console.log(`Set total stages to ${event.totalStages}`);
          }
          
          messages.push('Battle initialized.');
          messages.push(`Entering a dungeon with ${event.totalStages || 'multiple'} stages.`);
        }
        
        // Process round events
        if (event.type === 'round') {
          const roundNum = event.number || 0;
          setCurrentRound(roundNum);
          
          // Only add round begins message if this is a normal combat round (not a special transition round)
          if (event.actions && event.actions.length > 0) {
            messages.push(`Round ${roundNum} begins.`);
          }
          
          // Process actions in the round
          if (event.actions) {
            event.actions.forEach(action => {
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
              
              messages.push(actionText);
            });
          }
          
          // Update remaining combatants
          if (typeof event.remainingAllies === 'number' && typeof event.remainingEnemies === 'number') {
            if (event.remainingEnemies === 0) {
              messages.push(`All enemies defeated! End of round ${roundNum}.`);
            } else if (event.remainingAllies === 0) {
              messages.push(`Your party has been defeated! End of round ${roundNum}.`);
            } else {
              messages.push(`End of round ${roundNum}: ${event.remainingAllies} allies and ${event.remainingEnemies} enemies remaining.`);
            }
          }
        }
        
        // Process system messages
        if (event.type === 'system_message' && event.message) {
          messages.push(`System: ${event.message}`);
        }
        
        // Process stage transitions
        if (event.type === 'stage_complete') {
          console.log('Processing stage_complete event:', event);
          
          if (event.currentStage !== undefined) {
            setCurrentStage(event.currentStage);
            setStagesCompleted(event.currentStage);
            messages.push(`Stage ${event.currentStage} completed! ${event.message || ''}`);
          }
          
          // Update allies with the alive allies from this event
          if (event.aliveAllies && Array.isArray(event.aliveAllies)) {
            console.log(`Setting ${event.aliveAllies.length} alive allies from stage_complete event`);
            setAllies(event.aliveAllies);
          }
        }
        
        // Process new stage starting
        if (event.type === 'stage_start') {
          console.log('Processing stage_start event:', event);
          
          if (event.currentStage !== undefined) {
            setCurrentStage(event.currentStage);
            messages.push(`Stage ${event.currentStage} begins! ${event.message || ''}`);
          }
          
          // Update enemies with the new enemies for this stage
          if (event.enemies && Array.isArray(event.enemies)) {
            console.log(`Setting ${event.enemies.length} enemies from stage_start event`);
            setEnemies(event.enemies);
            messages.push(`New enemies appear for stage ${event.currentStage}!`);
          }
          
          // Mark start of a new stage in the battle log
          messages.push(`--- Stage ${event.currentStage || '?'} ---`);
        }
        
        // Process battle end
        if (event.type === 'battle_end') {
          setIsVictory(!!event.victory);
          
          // Set completed stages if provided
          if (event.completedStages !== undefined) {
            setStagesCompleted(event.completedStages);
          }
          
          if (event.summary) {
            messages.push(event.summary);
          } else {
            messages.push(event.victory 
              ? `Victory! Your party conquered ${event.completedStages || stagesCompleted}/${event.totalStages || totalStages} stages.` 
              : `Defeat! Your party was overwhelmed at stage ${event.currentStage || currentStage}.`);
          }
        }
      });
      
      // Update battle message state
      setBattleMessages(messages);
    }
  }, [isOpen, battleLog]);
  
  // Handle closing the dialog
  const handleClose = () => {
    // Reset all state
    setAllies([]);
    setEnemies([]);
    setBattleMessages([]);
    setCurrentRound(0);
    setCurrentStage(1);
    setTotalStages(1);
    setStagesCompleted(0);
    setIsVictory(null);
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
          
          {/* Battle Log Tab */}
          <TabsContent value="battle" className="flex-1 min-h-0 flex flex-col">
            <ScrollArea className="flex-1 rounded-md border border-[#432874] p-4 bg-[#251942]">
              {battleMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-[#C8B8DB] space-y-2 py-8">
                  <div className="text-center">
                    <p className="font-medium text-[#E5DBFF]">No battle data available</p>
                    <p className="text-sm mt-1">Click the "Complete Dungeon & Claim Rewards" button below to free your characters</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {battleMessages.map((message, i) => (
                    <div 
                      key={i} 
                      className={`px-3 py-2 rounded-md ${
                        message.includes('Critical') ? 'bg-[#432874]' : 
                        message.includes('System:') ? 'bg-[#1D1128] border border-[#432874]' :
                        message.includes('Stage') && message.includes('begins') ? 'bg-[#432874] border border-[#7B4AE2] mt-4 font-medium' :
                        message.includes('Stage') && message.includes('completed') ? 'bg-[#1D4136] border border-[#4AE292] mt-2 font-medium' :
                        i % 2 === 0 ? 'bg-[#321959]/50' : 'bg-transparent'
                      }`}
                    >
                      {message}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
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