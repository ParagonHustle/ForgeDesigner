import KleosChatInterface from './KleosChatInterface';
import ActiveTasks from './ActiveTasks';
import OfferBanner from '../ui/OfferBanner';
import { useDiscordAuth } from '@/lib/discordAuth';
import { useGameStore } from '@/lib/zustandStore';
import { useEffect } from 'react';

const DashboardView = () => {
  const { user } = useDiscordAuth();
  const { 
    fetchFarmingTasks, 
    fetchDungeonRuns, 
    fetchForgingTasks,
    characters,
    farmingTasks,
    dungeonRuns,
    forgingTasks
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
