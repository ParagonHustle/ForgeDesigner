
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { Shield, Swords, Heart, Zap } from 'lucide-react';

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
        totalHealingReceived: 0,
        hp: unit.stats.vitality * 8,
        maxHp: unit.stats.vitality * 8
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
            // Update attack meter based on speed (120 speed = 3x faster than 40 speed)
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
    let skillType = 'basic';

    // Check for ultimate/advanced skill usage based on cooldown
    if (attacker.skills.ultimate && attackCount % attacker.skills.ultimate.cooldown === 0) {
      skill = attacker.skills.ultimate;
      skillType = 'ultimate';
    } else if (attacker.skills.advanced && attackCount % attacker.skills.advanced.cooldown === 0) {
      skill = attacker.skills.advanced;
      skillType = 'advanced';
    }

    // Calculate damage based on attacker's attack stat
    const damage = Math.floor(skill.damage * (attacker.stats.attack / 100));
    const actionMessage = `${attacker.name} used ${skill.name} (${skillType}) on ${target.name} for ${damage} damage!`;
    
    setActionLog(prev => [...prev, actionMessage]);

    setUnits(prevUnits => 
      prevUnits.map(u => {
        if (u.id === target.id) {
          const newHp = Math.max(0, u.hp - damage);
          return {
            ...u,
            hp: newHp,
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
      setActionLog(prev => [
        ...prev,
        `Battle ended! ${allAlliesDefeated ? 'Enemies' : 'Allies'} are victorious!`
      ]);
    }
  };

  const renderUnitStats = (unit: BattleUnit) => (
    <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
      <div className="flex items-center">
        <Swords className="h-3 w-3 mr-1 text-red-400" />
        <span>ATK: {unit.stats.attack}</span>
      </div>
      <div className="flex items-center">
        <Heart className="h-3 w-3 mr-1 text-red-500" />
        <span>VIT: {unit.stats.vitality}</span>
      </div>
      <div className="flex items-center">
        <Shield className="h-3 w-3 mr-1 text-blue-400" />
        <span>DEF: {unit.stats.vitality * 8}</span>
      </div>
      <div className="flex items-center">
        <Zap className="h-3 w-3 mr-1 text-yellow-400" />
        <span>SPD: {unit.stats.speed}</span>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#1A1A2E] border-[#432874] text-[#C8B8DB] max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-[#FF9D00] font-cinzel">
            Battle Log - Stage {currentStage + 1}
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
                      <span>{Math.ceil(unit.hp)}/{unit.maxHp} HP</span>
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
                    {renderUnitStats(unit)}
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Enemies</h3>
                {units.filter(u => battleLog[0].enemies.some(e => e.id === u.id)).map(unit => (
                  <div key={unit.id} className="bg-[#432874]/20 p-2 rounded">
                    <div className="flex justify-between">
                      <span>{unit.name}</span>
                      <span>{Math.ceil(unit.hp)}/{unit.maxHp} HP</span>
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
                    {renderUnitStats(unit)}
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="summary">
            <div className="space-y-4">
              <h3 className="font-semibold">Battle Statistics</h3>
              {units.map(unit => (
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

        <DialogFooter>
          {isComplete ? (
            <Button 
              className="bg-[#FF9D00] hover:bg-[#FF9D00]/80"
              onClick={() => {
                if (runId && onCompleteDungeon) {
                  onCompleteDungeon(runId);
                }
                onClose();
              }}
            >
              Complete Battle
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? 'Resume Battle' : 'Pause Battle'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BattleLog;
