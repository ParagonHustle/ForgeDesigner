import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import CountdownTimer from '../common/CountdownTimer';
import { Link } from 'wouter';
import { Grid, Gem, Hammer, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useGameStore } from '@/lib/zustandStore';
import { apiRequest } from '@/lib/queryClient';
import type { FarmingTask, DungeonRun, ForgingTask, Character, Aura } from '@shared/schema';

interface ActiveTasksProps {
  farmingTasks: FarmingTask[];
  dungeonRuns: DungeonRun[];
  forgingTasks: ForgingTask[];
}

const ActiveTasks = ({ farmingTasks, dungeonRuns, forgingTasks }: ActiveTasksProps) => {
  const { toast } = useToast();
  const { characters, fetchFarmingTasks, fetchDungeonRuns, fetchForgingTasks } = useGameStore();
  const [completingTask, setCompletingTask] = useState<number | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [completedAura, setCompletedAura] = useState<Aura | null>(null);

  // Filter tasks
  const activeFarmingTasks = farmingTasks.filter(task => !task.completed);
  const activeDungeonRuns = dungeonRuns.filter(run => !run.completed);
  const activeForgingTasks = forgingTasks.filter(task => !task.completed);
  
  // Count completed tasks for each category - only count tasks that are completed AND done
  const completedFarmingCount = farmingTasks.filter(task => 
    task.completed === true && 
    new Date(task.endTime) <= new Date() &&
    // Only show tasks that are recently completed (within the last hour)
    new Date(task.endTime).getTime() > new Date().getTime() - (60 * 60 * 1000)
  ).length;
  const completedDungeonCount = dungeonRuns.filter(run => 
    run.completed === true && 
    new Date(run.endTime) <= new Date() &&
    // Only show dungeon runs that are recently completed (within the last hour)
    new Date(run.endTime).getTime() > new Date().getTime() - (60 * 60 * 1000)
  ).length;
  const completedForgingCount = forgingTasks.filter(task => 
    task.completed === true && 
    new Date(task.endTime) <= new Date() &&
    // Only show forging tasks that are recently completed (within the last hour)
    new Date(task.endTime).getTime() > new Date().getTime() - (60 * 60 * 1000)
  ).length;

  // Group characters by ID for easier lookup
  const charactersById = characters.reduce<Record<number, Character>>((acc, char) => {
    acc[char.id] = char;
    return acc;
  }, {});

  const handleCompleteFarmingTask = async (taskId: number) => {
    if (completingTask) return;
    setCompletingTask(taskId);

    try {
      const res = await apiRequest('POST', `/api/farming/complete/${taskId}`, undefined);
      const data = await res.json();

      toast({
        title: "Farming Complete",
        description: `Gained ${data.amount} ${data.resource}`,
      });

      // Refresh farming tasks
      fetchFarmingTasks();
    } catch (error) {
      console.error('Error completing farming task:', error);
      toast({
        title: "Error",
        description: "Failed to complete farming task",
        variant: "destructive",
      });
    } finally {
      setCompletingTask(null);
    }
  };

  const handleCompleteDungeonRun = async (runId: number) => {
    if (completingTask) return;
    setCompletingTask(runId);

    try {
      const res = await apiRequest('POST', `/api/dungeons/complete/${runId}`, undefined);
      const data = await res.json();

      toast({
        title: data.success ? "Dungeon Cleared!" : "Dungeon Failed",
        description: data.success 
          ? `You gained rewards from the dungeon` 
          : "Your party had to retreat from the dungeon",
        variant: data.success ? "default" : "destructive",
      });

      // Refresh dungeon runs
      fetchDungeonRuns();
    } catch (error) {
      console.error('Error completing dungeon run:', error);
      toast({
        title: "Error",
        description: "Failed to complete dungeon run",
        variant: "destructive",
      });
    } finally {
      setCompletingTask(null);
    }
  };

  const handleCompleteForging = async (taskId: number) => {
    if (completingTask) return;
    setCompletingTask(taskId);

    try {
      const res = await apiRequest('POST', `/api/forge/complete/${taskId}`, undefined);
      const data = await res.json();

      // Store the completed aura and show dialog
      setCompletedAura(data.aura);
      setShowResultDialog(true);

      // Refresh forging tasks
      fetchForgingTasks();
    } catch (error) {
      console.error('Error completing forging task:', error);
      toast({
        title: "Error",
        description: "Failed to complete forging task",
        variant: "destructive",
      });
    } finally {
      setCompletingTask(null);
    }
  };

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  if (activeFarmingTasks.length === 0 && activeDungeonRuns.length === 0 && activeForgingTasks.length === 0) {
    return (
      <motion.div 
        className="bg-[#1A1A2E] rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-cinzel font-bold">Active Tasks</h2>
        </div>

        <div className="bg-[#2D1B4E]/20 rounded-lg p-8 text-center">
          <p className="text-[#C8B8DB]/80 mb-4">You have no active tasks at the moment.</p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Link href="/dungeons">
              <Button className="bg-[#432874] hover:bg-[#432874]/80">
                <Grid className="mr-2 h-4 w-4" />
                Start Dungeon
              </Button>
            </Link>
            <Link href="/farming">
              <Button className="bg-[#432874] hover:bg-[#432874]/80">
                <Gem className="mr-2 h-4 w-4" />
                Start Farming
              </Button>
            </Link>
            <Link href="/forge">
              <Button className="bg-[#432874] hover:bg-[#432874]/80">
                <Hammer className="mr-2 h-4 w-4" />
                Start Forging
              </Button>
            </Link>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <>
      <motion.div 
        className="bg-[#1A1A2E] rounded-xl p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-lg font-cinzel font-bold">Active Tasks</h2>
          <Link href="/dungeons">
            <button className="text-[#FF9D00] text-xs hover:underline">View All</button>
          </Link>
        </div>

        {/* Completed tasks notification bar */}
        {(completedFarmingCount > 0 || completedDungeonCount > 0 || completedForgingCount > 0) && (
          <div className="flex flex-wrap gap-2 mb-3">
            {completedFarmingCount > 0 && (
              <Link href="/farming">
                <div className="flex items-center bg-[#228B22]/20 text-[#228B22] px-2 py-1 rounded border border-[#228B22]/30 text-xs hover:bg-[#228B22]/30 transition-colors">
                  <Gem className="h-3 w-3 mr-1" />
                  <span>Farming</span>
                  <span className="ml-1 w-4 h-4 bg-[#228B22] text-black rounded-full flex items-center justify-center text-[10px] font-bold">
                    {completedFarmingCount}
                  </span>
                </div>
              </Link>
            )}
            
            {completedDungeonCount > 0 && (
              <Link href="/dungeons">
                <div className="flex items-center bg-[#DC143C]/20 text-[#DC143C] px-2 py-1 rounded border border-[#DC143C]/30 text-xs hover:bg-[#DC143C]/30 transition-colors">
                  <Grid className="h-3 w-3 mr-1" />
                  <span>Dungeon</span>
                  <span className="ml-1 w-4 h-4 bg-[#DC143C] text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                    {completedDungeonCount}
                  </span>
                </div>
              </Link>
            )}
            
            {completedForgingCount > 0 && (
              <Link href="/forge">
                <div className="flex items-center bg-[#FF9D00]/20 text-[#FF9D00] px-2 py-1 rounded border border-[#FF9D00]/30 text-xs hover:bg-[#FF9D00]/30 transition-colors">
                  <Hammer className="h-3 w-3 mr-1" />
                  <span>Forge</span>
                  <span className="ml-1 w-4 h-4 bg-[#FF9D00] text-black rounded-full flex items-center justify-center text-[10px] font-bold">
                    {completedForgingCount}
                  </span>
                </div>
              </Link>
            )}
          </div>
        )}

        <motion.div 
          className="space-y-2"
          variants={container}
          initial="hidden"
          animate="show"
        >
        {/* Dungeon Tasks */}
        {activeDungeonRuns.map((run) => (
          <motion.div 
            key={`dungeon-${run.id}`}
            className="bg-[#1F1D36]/50 p-2 rounded-lg border border-[#432874]/30"
            variants={item}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Grid className="h-5 w-5 text-[#DC143C]" />
                <span className="ml-2 font-semibold">{run.dungeonName} (Level {run.dungeonLevel})</span>
              </div>
              <div className="flex items-center text-sm">
                <div className="bg-[#DC143C]/20 text-[#DC143C] px-2 py-0.5 rounded">In Progress</div>
                <CountdownTimer 
                  endTime={run.endTime} 
                  className="ml-2" 
                  onComplete={() => {}} // Removed auto-complete
                />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {run.characterIds.map((charId) => (
                <img 
                  key={charId}
                  src={charactersById[charId]?.avatarUrl || "https://via.placeholder.com/150"} 
                  alt={charactersById[charId]?.name || "Character"} 
                  className="w-10 h-10 rounded-full border border-[#DC143C]/50"
                />
              ))}
            </div>
            {new Date(run.endTime) <= new Date() && (
              <Link href="/dungeons">
                <Button 
                  className="w-full mt-2 bg-[#DC143C] hover:bg-[#DC143C]/80 text-white"
                >
                  View Dungeon Run
                </Button>
              </Link>
            )}
          </motion.div>
        ))}

        {/* Farming Tasks */}
        {activeFarmingTasks.map((task) => {
          // Get the character name if there's a character assigned
          const character = task.characterId ? charactersById[task.characterId] : null;
          const characterName = character ? character.name : 'Unknown';

          return (
            <motion.div 
              key={`farming-${task.id}`}
              className="bg-[#1F1D36]/50 p-2 rounded-lg border border-[#432874]/30"
              variants={item}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Gem className="h-5 w-5 text-[#228B22]" />
                  <span className="ml-2 font-semibold">{task.resourceName} Farming</span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="bg-[#228B22]/20 text-[#228B22] px-2 py-0.5 rounded">Active</div>
                  <CountdownTimer 
                    endTime={task.endTime} 
                    className="ml-2" 
                    onComplete={() => handleCompleteFarmingTask(task.id)}
                  />
                </div>
              </div>

              {/* Display assigned character */}
              <div className="mt-2 text-sm text-[#C8B8DB]/70 flex items-center">
                <User className="h-3 w-3 mr-1" />
                <span>Assigned: {characterName}</span>
              </div>

              <div className="mt-2">
                <div className="flex items-center">
                  <img 
                    src={charactersById[task.characterId]?.avatarUrl || "https://via.placeholder.com/150"} 
                    alt={charactersById[task.characterId]?.name || "Farming Character"} 
                    className="w-10 h-10 rounded-full border border-[#228B22]/50"
                  />
                  <div className="ml-2">
                    <div className="text-sm font-semibold">
                      {charactersById[task.characterId]?.name || "Character"}, Lvl {charactersById[task.characterId]?.level || "?"}
                    </div>
                    <div className="text-xs text-[#C8B8DB]/70">+15% Farming Efficiency</div>
                  </div>
                </div>
              </div>

              {new Date(task.endTime) <= new Date() && (
                <Button 
                  className="w-full mt-2 bg-[#228B22] hover:bg-[#228B22]/80 text-white"
                  onClick={() => handleCompleteFarmingTask(task.id)}
                  disabled={completingTask === task.id}
                >
                  {completingTask === task.id ? "Collecting..." : "Collect Resources"}
                </Button>
              )}
            </motion.div>
          );
        })}

        {/* Forge Tasks */}
        {activeForgingTasks.map((task) => {
          const startTime = task.startTime ? new Date(task.startTime) : new Date();
          const endTime = task.endTime ? new Date(task.endTime) : new Date();

          const taskProgress = Math.min(
            100,
            Math.max(
              0,
              ((new Date().getTime() - startTime.getTime()) /
                (endTime.getTime() - startTime.getTime())) *
                100
            )
          );

          // Get the character name if there's a character assigned
          const character = task.characterId ? charactersById[task.characterId] : null;
          const characterName = character ? character.name : 'Unknown';

          return (
            <motion.div 
              key={`forge-${task.id}`}
              className="bg-[#1F1D36]/50 p-2 rounded-lg border border-[#432874]/30"
              variants={item}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Hammer className="h-5 w-5 text-[#FF9D00]" />
                  <span className="ml-2 font-semibold">
                    {task.taskType === 'craft' 
                      ? `Crafting ${task.targetElement} Aura` 
                      : 'Aura Fusion'}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <div className="bg-[#FF9D00]/20 text-[#FF9D00] px-2 py-0.5 rounded">Crafting</div>
                  <CountdownTimer 
                    endTime={task.endTime} 
                    className="ml-2" 
                    onComplete={() => handleCompleteForging(task.id)}
                  />
                </div>
              </div>

              {/* Display assigned character */}
              <div className="mt-2 text-sm text-[#C8B8DB]/70 flex items-center">
                <User className="h-3 w-3 mr-1" />
                <span>Assigned: {characterName}</span>
              </div>

              <div className="mt-2">
                <Progress value={taskProgress} className="h-2 bg-[#1F1D36] border-[#432874]/20" />
              </div>
              {new Date(task.endTime) <= new Date() && (
                <Link href="/forge">
                  <Button 
                    className="w-full mt-2 bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
                  >
                    Go to Forge
                  </Button>
                </Link>
              )}
            </motion.div>
          );
        })}
      </motion.div>
      
      {/* Forge Result Dialog */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="bg-[#1A1A2E] border-[#432874] max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-cinzel text-[#FF9D00]">
              Forging Complete!
            </DialogTitle>
          </DialogHeader>

          {completedAura && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  completedAura.element === 'fire' ? 'bg-red-500/30 text-red-300' 
                  : completedAura.element === 'water' ? 'bg-blue-500/30 text-blue-300'
                  : completedAura.element === 'earth' ? 'bg-green-500/30 text-green-300' 
                  : completedAura.element === 'wind' ? 'bg-cyan-500/30 text-cyan-300'
                  : completedAura.element === 'light' ? 'bg-yellow-500/30 text-yellow-300'
                  : 'bg-purple-500/30 text-purple-300'
                }`}>
                  <span className="text-2xl">{completedAura.element?.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold capitalize">
                    {completedAura.name || `${completedAura.element} Aura`}
                  </h3>
                  <div className="flex gap-2">
                    <Badge className="bg-purple-700/30 text-purple-300 border-purple-600/30">
                      Level {completedAura.level}
                    </Badge>
                    <Badge className="bg-[#432874]/30 text-[#C8B8DB]">
                      {completedAura.tier ? `Tier ${completedAura.tier}` : 'Basic Tier'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="bg-[#432874]/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Stat Multipliers</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[#C8B8DB]">
                  {completedAura.attack && (
                    <div>Attack: <span className="text-[#FF9D00]">+{completedAura.attack}%</span></div>
                  )}
                  {completedAura.defense && (
                    <div>Defense: <span className="text-[#FF9D00]">+{completedAura.defense}%</span></div>
                  )}
                  {completedAura.vitality && (
                    <div>Vitality: <span className="text-[#FF9D00]">+{completedAura.vitality}%</span></div>
                  )}
                  {completedAura.speed && (
                    <div>Speed: <span className="text-[#FF9D00]">+{completedAura.speed}%</span></div>
                  )}
                  {completedAura.accuracy && (
                    <div>Accuracy: <span className="text-[#FF9D00]">+{completedAura.accuracy}%</span></div>
                  )}
                  {completedAura.focus && (
                    <div>Focus: <span className="text-[#FF9D00]">+{completedAura.focus}%</span></div>
                  )}
                  {completedAura.resilience && (
                    <div>Resilience: <span className="text-[#FF9D00]">+{completedAura.resilience}%</span></div>
                  )}
                </div>
              </div>

              {/* Aura basic info */}
              <div className="bg-[#432874]/20 rounded-lg p-4">
                <h4 className="font-semibold mb-2">Element: {completedAura.element}</h4>
                <p className="text-[#C8B8DB]">A powerful {completedAura.element} aura that enhances your character's abilities.</p>
              </div>

              {completedAura.skills && (
                <div className="bg-[#432874]/20 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Skills</h4>
                  <div className="space-y-2">
                    {(typeof completedAura.skills === 'string' 
                      ? JSON.parse(completedAura.skills) 
                      : completedAura.skills
                    ).map((skill: any, index: number) => (
                      <div key={index} className="border border-[#432874]/40 rounded p-2">
                        <div className="font-medium text-[#FF9D00]">{skill.name}</div>
                        <div className="text-sm text-[#C8B8DB]/80">{typeof skill.description === 'string' ? skill.description : `Skill effect for ${skill.name}`}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button 
              onClick={() => setShowResultDialog(false)}
              className="bg-[#FF9D00] hover:bg-[#FF9D00]/80 text-[#1A1A2E]"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </motion.div>
    </>
  );
};

export default ActiveTasks;