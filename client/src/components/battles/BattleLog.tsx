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
  runId: number | null;
  onCompleteDungeon?: (runId: number) => void;
}

export default function BattleLog({ 
  isOpen, 
  onClose, 
  battleLog,
  runId,
  onCompleteDungeon 
}: BattleLogProps) {
  const handleComplete = () => {
    if (runId && onCompleteDungeon) {
      onCompleteDungeon(runId);
      onClose();
    }
  };

  if (!battleLog || battleLog.length === 0) {
    return null;
  }

  const finalResult = battleLog[battleLog.length - 1];
  const stages = battleLog.slice(0, -1);

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Battle Log</DialogTitle>
          <DialogDescription>
            Review the battle progress and outcomes
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="summary" className="flex-1 overflow-hidden">
          <TabsList>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="details">Battle Details</TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="h-full overflow-y-auto">
            <div className="space-y-4 p-4">
              <div className="bg-[#1A1A2E] rounded-lg p-4 border border-[#432874]/30">
                <h3 className="text-lg font-semibold mb-2">Final Result</h3>
                <div className="flex items-center space-x-2 mb-2">
                  <Badge className={finalResult.success ? 'bg-green-600' : 'bg-red-600'}>
                    {finalResult.success ? 'Victory' : 'Defeat'}
                  </Badge>
                  <span>Completed {finalResult.completedStages} of {finalResult.totalStages} stages</span>
                </div>
                <p className="text-sm text-[#C8B8DB]/80">{finalResult.finalSummary}</p>
              </div>

              {finalResult.success && finalResult.rewards && (
                <div className="bg-[#1A1A2E] rounded-lg p-4 border border-[#432874]/30">
                  <h3 className="text-lg font-semibold mb-2">Rewards</h3>
                  <div className="space-y-2">
                    {finalResult.rewards.rogueCredits && (
                      <div className="flex items-center">
                        <span className="text-[#FF9D00]">{finalResult.rewards.rogueCredits}</span>
                        <span className="ml-2">Rogue Credits</span>
                      </div>
                    )}
                    {finalResult.rewards.soulShards && (
                      <div className="flex items-center">
                        <span className="text-[#00B9AE]">{finalResult.rewards.soulShards}</span>
                        <span className="ml-2">Soul Shards</span>
                      </div>
                    )}
                    {finalResult.rewards.materials?.map((material: any, index: number) => (
                      <div key={index} className="flex items-center">
                        <span className="text-[#C8B8DB]">{material.amount}</span>
                        <span className="ml-2">{material.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="details" className="h-full overflow-y-auto">
            <div className="space-y-4 p-4">
              {stages.map((stage, index) => (
                <div key={index} className="bg-[#1A1A2E] rounded-lg p-4 border border-[#432874]/30">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Stage {stage.stage}</h3>
                    <Badge className={stage.outcome === 'victory' ? 'bg-green-600' : 'bg-red-600'}>
                      {stage.outcome === 'victory' ? 'Victory' : 'Defeat'}
                    </Badge>
                  </div>

                  {stage.rounds?.map((round: any, roundIndex: number) => (
                    <div key={roundIndex} className="mt-2 space-y-1">
                      <h4 className="text-sm font-semibold">Round {round.round}</h4>
                      {round.actions?.map((action: any, actionIndex: number) => (
                        <div key={actionIndex} className="text-sm text-[#C8B8DB]/80">
                          {action.action === 'attack' ? (
                            <div className="flex items-center">
                              <span className="font-medium">{action.actor}</span>
                              <span className="mx-1">→</span>
                              <span>{action.target}</span>
                              <span className="mx-1">for</span>
                              <span className="text-red-400">{action.damage}</span>
                              <span className="mx-1">damage</span>
                              {action.isCritical && (
                                <Badge className="ml-2 bg-yellow-600">Critical</Badge>
                              )}
                            </div>
                          ) : (
                            <div>{action.message}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}

                  {stage.recovery && (
                    <div className="mt-4 text-sm text-[#C8B8DB]/80">
                      <p>{stage.recovery.message}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={handleComplete}>
            {finalResult.success ? 'Collect Rewards' : 'Return to Town'}
          </Button>
          {runId && ( // Added conditional rendering for the "Complete Dungeon Run" button
            <Button className="w-full bg-[#FF9D00] hover:bg-[#FF9D00]/80" onClick={() => onCompleteDungeon?.(runId)}>
              Complete Dungeon Run
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}