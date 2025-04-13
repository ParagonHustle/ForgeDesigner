
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';

interface BattleUnit {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  speed: number;
  attackMeter: number;
  stats: {
    attack: number;
    vitality: number;
    speed: number;
  };
  skills: {
    basic: { name: string; damage: number };
    advanced?: { name: string; damage: number; cooldown: number };
    ultimate?: { name: string; damage: number; cooldown: number };
  };
  lastSkillUse: number;
  totalDamageDealt: number;
  totalDamageReceived: number;
  totalHealingDone: number;
  totalHealingReceived: number;
}

interface BattleLogProps {
  isOpen: boolean;
  onClose: () => void;
  battleLog: any[];
  runId: number | null;
  onCompleteDungeon?: (runId: number) => void;
}

const BattleLog = ({ isOpen, onClose, battleLog, runId, onCompleteDungeon }: BattleLogProps) => {
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isPaused, setIsPaused] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);
  const [units, setUnits] = useState<BattleUnit[]>([]);
  const [actionLog, setActionLog] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  // Initialize battle units
  useEffect(() => {
    if (battleLog && battleLog.length > 0) {
      const initialUnits = [...battleLog[0].allies, ...battleLog[0].enemies].map(unit => ({
        ...unit,
        attackMeter: 0,
        lastSkillUse: 0,
        totalDamageDealt: 0,
        totalDamageReceived: 0,
        totalHealingDone: 0,
        totalHealingReceived: 0
      }));
      setUnits(initialUnits);
    }
  }, [battleLog]);

  // Battle simulation loop
  useEffect(() => {
    if (!isPaused && !isComplete) {
      const interval = setInterval(() => {
        setUnits(prevUnits => {
          return prevUnits.map(unit => {
            // Update attack meter based on speed
            const meterIncrease = (unit.stats.speed / 40) * playbackSpeed;
            let newMeter = unit.attackMeter + meterIncrease;

            if (newMeter >= 100) {
              // Reset meter and perform attack
              newMeter = 0;
              const target = selectTarget(unit, prevUnits);
              if (target) {
                performAction(unit, target);
              }
            }

            return {
              ...unit,
              attackMeter: newMeter
            };
          });
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isPaused, playbackSpeed, isComplete]);

  const selectTarget = (attacker: BattleUnit, allUnits: BattleUnit[]) => {
    const isAlly = battleLog[0].allies.some(a => a.id === attacker.id);
    const possibleTargets = allUnits.filter(u => 
      u.hp > 0 && 
      (isAlly ? battleLog[0].enemies.some(e => e.id === u.id) : battleLog[0].allies.some(a => a.id === u.id))
    );
    return possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
  };

  const performAction = (attacker: BattleUnit, target: BattleUnit) => {
    const attackCount = attacker.lastSkillUse + 1;
    let skill = attacker.skills.basic;

    // Check for ultimate/advanced skill usage
    if (attacker.skills.ultimate && attackCount % attacker.skills.ultimate.cooldown === 0) {
      skill = attacker.skills.ultimate;
    } else if (attacker.skills.advanced && attackCount % attacker.skills.advanced.cooldown === 0) {
      skill = attacker.skills.advanced;
    }

    const damage = Math.floor(skill.damage * (attacker.stats.attack / 100));

    setActionLog(prev => [...prev, `${attacker.name} used ${skill.name} on ${target.name} for ${damage} damage!`]);

    setUnits(prevUnits => 
      prevUnits.map(u => {
        if (u.id === target.id) {
          return {
            ...u,
            hp: Math.max(0, u.hp - damage),
            totalDamageReceived: u.totalDamageReceived + damage
          };
        }
        if (u.id === attacker.id) {
          return {
            ...u,
            lastSkillUse: attackCount,
            totalDamageDealt: u.totalDamageDealt + damage
          };
        }
        return u;
      })
    );

    checkBattleEnd();
  };

  const checkBattleEnd = () => {
    const allies = units.filter(u => battleLog[0].allies.some(a => a.id === u.id));
    const enemies = units.filter(u => battleLog[0].enemies.some(e => e.id === u.id));

    const allAlliesDefeated = allies.every(a => a.hp <= 0);
    const allEnemiesDefeated = enemies.every(e => e.hp <= 0);

    if (allAlliesDefeated || allEnemiesDefeated) {
      setIsComplete(true);
      // Add defeated characters to cooldown
      allies.filter(a => a.hp <= 0).forEach(defeatedAlly => {
        // Implement 5-minute cooldown logic here
      });
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
  };

  const handleComplete = () => {
    setIsComplete(true);
    onClose();
  };

  const finalResult = battleLog[battleLog.length - 1];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A1A2E] border-[#432874] text-[#C8B8DB] max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#FF9D00] font-cinzel">
            Dungeon Battle Log
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="live" className="w-full">
          <TabsList>
            <TabsTrigger value="live">Live Battle</TabsTrigger>
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="log">Action Log</TabsTrigger>
          </TabsList>

          <TabsContent value="live" className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setIsPaused(!isPaused)}
                  className="w-24"
                >
                  {isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSpeedChange(playbackSpeed === 1 ? 2 : playbackSpeed === 2 ? 4 : 1)}
                  className="w-24"
                >
                  {playbackSpeed}x Speed
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">Allies</h3>
                {units.filter(u => battleLog[0].allies.some(a => a.id === u.id)).map(unit => (
                  <div key={unit.id} className="bg-[#432874]/20 p-2 rounded">
                    <div className="flex justify-between">
                      <span>{unit.name}</span>
                      <span>{unit.hp}/{unit.maxHp} HP</span>
                    </div>
                    <div className="w-full bg-[#432874]/30 h-2 rounded">
                      <motion.div
                        className="bg-[#00B9AE] h-full rounded"
                        style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
                      />
                    </div>
                    <div className="w-full bg-[#432874]/30 h-1 rounded mt-1">
                      <motion.div
                        className="bg-[#FF9D00] h-full rounded"
                        style={{ width: `${unit.attackMeter}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Enemies</h3>
                {units.filter(u => battleLog[0].enemies.some(e => e.id === u.id)).map(unit => (
                  <div key={unit.id} className="bg-[#432874]/20 p-2 rounded">
                    <div className="flex justify-between">
                      <span>{unit.name}</span>
                      <span>{unit.hp}/{unit.maxHp} HP</span>
                    </div>
                    <div className="w-full bg-[#432874]/30 h-2 rounded">
                      <motion.div
                        className="bg-[#DC143C] h-full rounded"
                        style={{ width: `${(unit.hp / unit.maxHp) * 100}%` }}
                      />
                    </div>
                    <div className="w-full bg-[#432874]/30 h-1 rounded mt-1">
                      <motion.div
                        className="bg-[#FF9D00] h-full rounded"
                        style={{ width: `${unit.attackMeter}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="summary">
            <div className="space-y-4">
              <h3 className="font-semibold">Battle Statistics</h3>
              {units.filter(u => battleLog[0].allies.some(a => a.id === u.id)).map(unit => (
                <div key={unit.id} className="bg-[#432874]/20 p-3 rounded">
                  <h4 className="font-medium mb-2">{unit.name}</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Damage Dealt: {unit.totalDamageDealt}</div>
                    <div>Damage Received: {unit.totalDamageReceived}</div>
                    <div>Healing Done: {unit.totalHealingDone}</div>
                    <div>Healing Received: {unit.totalHealingReceived}</div>
                  </div>
                </div>
              ))}

              <div className="mt-6">
                <h3 className="font-semibold mb-2">Dungeon Result</h3>
                <div className="bg-[#432874]/20 p-3 rounded">
                  <div>Stages Completed: {finalResult.completedStages} / {finalResult.totalStages}</div>
                  {finalResult.success && (
                    <div className="mt-2">
                      <h4 className="font-medium mb-1">Rewards Earned:</h4>
                      {finalResult.rewards && (
                        <ul className="list-disc list-inside text-sm">
                          {Object.entries(finalResult.rewards).map(([key, value]) => (
                            <li key={key}>{key}: {value}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="log">
            <div className="h-[400px] overflow-y-auto space-y-1">
              {actionLog.map((log, index) => (
                <div key={index} className="text-sm py-1 border-b border-[#432874]/20">
                  {log}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <Button onClick={handleComplete}>
            {finalResult.success ? 'Collect Rewards' : 'Return to Town'}
          </Button>
          {runId && (
            <Button 
              className="bg-[#FF9D00] hover:bg-[#FF9D00]/80" 
              onClick={() => onCompleteDungeon?.(runId)}
            >
              Complete Dungeon Run
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BattleLog;
