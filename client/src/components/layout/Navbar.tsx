import { useDiscordAuth } from '@/lib/discordAuth';
import { useGameStore } from '@/lib/zustandStore';
import { Zap } from 'lucide-react';
import { useLocation, Link } from 'wouter';
import CountdownTimer from '@/components/common/CountdownTimer';

const Navbar = () => {
  const { user, logout } = useDiscordAuth();
  const { forgeTokens, rogueCredits, speedBoostActive, speedBoostMultiplier, farmingTasks, dungeonRuns, forgingTasks } = useGameStore();
  const location = useLocation();

  // Get activity timers and counts
  const getActivityTimers = () => {
    const now = new Date().getTime();
    const activities = {
      dungeon: { time: Infinity, path: '/dungeons', count: 0 },
      forge: { time: Infinity, path: '/forge', count: 0 },
      farming: { time: Infinity, path: '/farming', count: 0 }
    };

    dungeonRuns?.forEach(run => {
      if (!run.completed) {
        activities.dungeon.count++;
        const endTime = new Date(run.endTime).getTime();
        if (endTime - now < activities.dungeon.time) {
          activities.dungeon.time = endTime - now;
        }
      }
    });

    forgingTasks?.forEach(task => {
      if (!task.completed) {
        activities.forge.count++;
        const endTime = new Date(task.endTime).getTime();
        if (endTime - now < activities.forge.time) {
          activities.forge.time = endTime - now;
        }
      }
    });

    farmingTasks?.forEach(task => {
      if (!task.completed) {
        activities.farming.count++;
        const endTime = new Date(task.endTime).getTime();
        if (endTime - now < activities.farming.time) {
          activities.farming.time = endTime - now;
        }
      }
    });

    return activities;
  };

  const activityTimers = getActivityTimers();
  
  return (
    <nav className="bg-[#1A1A2E] border-b border-[#432874]/50 px-4 py-2 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center">
        <div className="text-2xl font-cinzel font-bold text-[#FF9D00] mr-2">The Forge</div>
        <span className="bg-[#00B9AE]/20 text-[#00B9AE] text-xs px-2 py-0.5 rounded">Alpha v0.1</span>
        
        {/* Activity Timer Tags */}
        <div className="ml-4 flex gap-2">
          {Object.entries(activityTimers).map(([type, data]) => {
            if (data.count === 0) return null;
            const isComplete = data.time <= 0;
            return (
              <Link 
                key={type} 
                href={data.path}
                className={`
                  px-2 py-1 rounded text-xs flex items-center gap-1 cursor-pointer
                  ${isComplete 
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                    : 'bg-[#432874]/20 text-[#C8B8DB] border border-[#432874]/30'}
                `}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
                {data.count > 1 && (
                  <span className="text-[#FF9D00] font-semibold ml-1">
                    x{data.count}
                  </span>
                )}
                {!isComplete && (
                  <CountdownTimer 
                    endTime={new Date(Date.now() + data.time).toISOString()} 
                    className="ml-1"
                  />
                )}
                {isComplete && (
                  <span className="text-green-400">✓</span>
                )}
              </Link>
            );
          })}
        </div>
        
        {speedBoostActive && (
          <div className="ml-2 flex items-center bg-[#FF9D00]/20 text-[#FF9D00] text-xs px-2 py-0.5 rounded animate-pulse">
            <Zap className="h-3 w-3 mr-1" />
            <span>{speedBoostMultiplier}x Speed Boost</span>
          </div>
        )}
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Resources Display */}
        <div className="hidden md:flex items-center space-x-3">
          <div className="flex items-center">
            <img 
              src="https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=250&h=250&fit=crop" 
              alt="Forge Tokens" 
              className="w-5 h-5 rounded-full mr-1"
            />
            <span className="text-[#FFD700]">{forgeTokens}</span>
          </div>
          <div className="flex items-center">
            <img 
              src="https://images.unsplash.com/photo-1543486958-d783bfbf7f8e?w=250&h=250&fit=crop" 
              alt="Rogue Credits" 
              className="w-5 h-5 rounded-full mr-1"
            />
            <span>{rogueCredits}</span>
          </div>
        </div>
        
        {/* User Profile */}
        <div className="relative group">
          <div className="flex items-center bg-[#432874]/30 rounded-full px-3 py-1.5 cursor-pointer">
            <img 
              src={user?.avatarUrl || "https://cdn.pixabay.com/photo/2021/03/02/12/03/avatar-6062252_1280.png"} 
              alt="User Avatar" 
              className="w-7 h-7 rounded-full border border-[#FF9D00]"
            />
            <span className="ml-2 text-sm hidden md:block">{user?.username || "ForgeHero"}</span>
          </div>
          
          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-48 bg-[#1A1A2E] border border-[#432874]/50 rounded-lg shadow-lg overflow-hidden transform scale-0 group-hover:scale-100 transition-transform origin-top-right">
            <div className="p-2">
              <button 
                onClick={() => logout()}
                className="w-full text-left p-2 hover:bg-[#432874]/20 rounded-md text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
