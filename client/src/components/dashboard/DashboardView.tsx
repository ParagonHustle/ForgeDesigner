import WelcomeSection from './WelcomeSection';
import ActiveTasks from './ActiveTasks';
import ResourcesOverview from './ResourcesOverview';
import DiscordChat from './DiscordChat';
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
        {/* Left Column - Account Overview */}
        <div className="md:col-span-8 space-y-6">
          <WelcomeSection 
            username={user?.username || 'Adventurer'} 
            charactersCount={characters.length}
            aurasCount={0} // Need to implement
            activeDungeons={dungeonRuns.filter(run => !run.completed).length}
            farmingSlotsCount={farmingTasks.filter(task => !task.completed).length}
          />
          
          <ActiveTasks 
            farmingTasks={farmingTasks}
            dungeonRuns={dungeonRuns}
            forgingTasks={forgingTasks}
          />
        </div>
        
        {/* Right Column - Resources & Chat */}
        <div className="md:col-span-4 space-y-6">
          <ResourcesOverview />
          <DiscordChat />
        </div>
      </div>
    </>
  );
};

export default DashboardView;
