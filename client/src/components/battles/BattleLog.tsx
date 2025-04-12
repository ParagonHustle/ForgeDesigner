import React from 'react';
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
import { ScrollText, Swords, Shield, Zap } from 'lucide-react';

interface BattleLogProps {
  isOpen: boolean;
  onClose: () => void;
  battleLog: any[];
}

const BattleLog: React.FC<BattleLogProps> = ({ isOpen, onClose, battleLog }) => {
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
                              
                            let actionText = '';
                            if (action.action === 'attack') {
                              actionText = `${action.actor} attacks ${action.target} for ${action.damage} damage${action.isCritical ? ' (Critical!)' : ''}`;
                            } else if (action.action === 'defend') {
                              actionText = `${action.actor} defends, reducing incoming damage`;
                            } else if (action.action === 'special') {
                              actionText = `${action.actor} uses a special ability on ${action.target}`;
                            } else {
                              actionText = JSON.stringify(action);
                            }
                            
                            return (
                              <p key={`action-${actionIdx}`} className={`${textColor}`}>
                                {icon} {actionText}
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
                <div key={`round-${index}`} className="bg-[#1F1D36]/50 p-3 rounded-md">
                  <p className="text-sm font-semibold mb-2">Round {entry.round}:</p>
                  <div className="space-y-1 text-sm">
                    {entry.actions?.map((action: any, actionIdx: number) => {
                      let textColor = action.actor.includes('Enemy') 
                        ? "text-[#DC143C]/90"
                        : "text-[#00B9AE]/90";
                        
                      return (
                        <p key={`action-${actionIdx}`} className={`${textColor}`}>
                          <Swords className="h-4 w-4 inline mr-1" /> 
                          {action.actor} attacks {action.target} for {action.damage} damage
                          {action.isCritical ? ' (Critical!)' : ''}
                        </p>
                      );
                    })}
                  </div>
                </div>
              );
            }
            
            // Handle other types of entries
            return (
              <div key={`entry-${index}`} className="p-2 bg-[#432874]/20 rounded-md text-sm">
                {JSON.stringify(entry)}
              </div>
            );
          })}
        </div>
        
        <DialogFooter>
          <Button onClick={onClose} className="bg-[#432874]/50 hover:bg-[#432874]/70">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BattleLog;