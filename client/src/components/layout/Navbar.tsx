import { useDiscordAuth } from '@/lib/discordAuth';
import { useGameStore } from '@/lib/zustandStore';
import { Zap } from 'lucide-react';
import { useLocation, Link } from 'wouter';
import CompactDiscordChat from '@/components/common/CompactDiscordChat';

const Navbar = () => {
  const { user, logout } = useDiscordAuth();
  const { forgeTokens, rogueCredits, speedBoostActive, speedBoostMultiplier } = useGameStore();
  const location = useLocation();

  return (
    <nav className="bg-[#1A1A2E] border-b border-[#432874]/50 px-4 py-2 flex justify-between items-center sticky top-0 z-50">
      <div className="flex items-center">
        <div className="text-2xl font-cinzel font-bold text-[#FF9D00] mr-2">The Forge</div>
        <span className="bg-[#00B9AE]/20 text-[#00B9AE] text-xs px-2 py-0.5 rounded">Alpha v0.1</span>

        {/* Discord Chat - Further expanded width */}
        <div className="ml-5 flex-1 w-full max-w-4xl">
          <CompactDiscordChat />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        
        {/* Resources Display - More compact */}
        <div className="hidden md:flex items-center space-x-3">
          <div className="flex items-center">
            <img 
              src="https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=250&h=250&fit=crop" 
              alt="Forge Tokens" 
              className="w-4 h-4 rounded-full mr-1"
            />
            <span className="text-[#FFD700] text-xs">{forgeTokens}</span>
          </div>
          <div className="flex items-center">
            <img 
              src="https://images.unsplash.com/photo-1543486958-d783bfbf7f8e?w=250&h=250&fit=crop" 
              alt="Rogue Credits" 
              className="w-4 h-4 rounded-full mr-1"
            />
            <span className="text-xs">{rogueCredits}</span>
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
            {user?.isAdmin && (
              <span className="ml-2 bg-[#FF9D00] text-black text-xs px-2 py-0.5 rounded-full font-semibold">
                ADMIN
              </span>
            )}
          </div>

          {/* Dropdown menu */}
          <div className="absolute right-0 mt-2 w-48 bg-[#1A1A2E] border border-[#432874]/50 rounded-lg shadow-lg overflow-hidden transform scale-0 group-hover:scale-100 transition-transform origin-top-right">
            <div className="p-2 space-y-1">
              <button 
                onClick={() => window.location.reload()}
                className="w-full text-left p-2 hover:bg-[#432874]/20 rounded-md text-sm"
              >
                Refresh User Data
              </button>
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