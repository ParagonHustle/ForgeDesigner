import KleosChatInterface from './KleosChatInterface';
import ActiveTasks from './ActiveTasks';
import OfferBanner from '../ui/OfferBanner';
import { useDiscordAuth } from '@/lib/discordAuth';
import { useGameStore } from '@/lib/zustandStore';
import { useEffect } from 'react';
import { Zap } from 'lucide-react';

const DashboardView = () => {
  const { user } = useDiscordAuth();
  const { 
    fetchFarmingTasks, 
    fetchDungeonRuns, 
    fetchForgingTasks,
    characters,
    farmingTasks,
    dungeonRuns,
    forgingTasks,
    speedBoostActive,
    speedBoostMultiplier
  } = useGameStore();
  
  // Refresh active tasks periodically
  useEffect(() => {
    const fetchActiveTasks = () => {
      fetchFarmingTasks();
      fetchDungeonRuns();
      fetchForgingTasks();
    };
    
    // Fetch initial data
    fetchActiveTasks();
    
    // Set up periodic refresh (every 10 seconds)
    const intervalId = setInterval(fetchActiveTasks, 10000);
    
    return () => clearInterval(intervalId);
  }, [fetchFarmingTasks, fetchDungeonRuns, fetchForgingTasks]);
  
  return (
    <>
      <OfferBanner />
      
      {/* Speed Boost Indicator */}
      {speedBoostActive && (
        <div className="mb-4 flex items-center justify-end">
          <div className="flex items-center bg-[#FF9D00]/20 text-[#FF9D00] px-3 py-1.5 rounded-md animate-pulse">
            <Zap className="h-4 w-4 mr-2" />
            <span className="font-bold">{speedBoostMultiplier}x Speed Boost Active</span>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Kleos Chat Interface Column */}
        <div className="md:col-span-8 space-y-6">
          <KleosChatInterface 
            charactersCount={characters.length}
            aurasCount={0} // Need to implement
            activeDungeons={dungeonRuns.filter(run => !run.completed).length}
            farmingSlotsCount={farmingTasks.filter(task => !task.completed).length}
          />
        </div>
        
        {/* Active Tasks Column */}
        <div className="md:col-span-4 space-y-6">
          <ActiveTasks 
            farmingTasks={farmingTasks}
            dungeonRuns={dungeonRuns}
            forgingTasks={forgingTasks}
          />
        </div>
      </div>
    </>
  );
};

export default DashboardView;
