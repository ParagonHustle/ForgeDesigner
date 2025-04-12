import { ReactNode, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import AICompanion from '../ui/AICompanion';
import { useDiscordAuth } from '@/lib/discordAuth';
import { useGameStore } from '@/lib/zustandStore';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { isAuthenticated, isLoading, user, login, fetchUser } = useDiscordAuth();
  const { 
    fetchResources, 
    fetchCharacters, 
    fetchAuras, 
    fetchFarmingTasks, 
    fetchDungeonRuns,
    fetchForgingTasks,
    fetchBlackMarketListings,
    fetchBountyQuests
  } = useGameStore();

  // Load user data on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Fetch game data when authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      fetchResources();
      fetchCharacters();
      fetchAuras();
      fetchFarmingTasks();
      fetchDungeonRuns();
      fetchForgingTasks();
      fetchBlackMarketListings();
      fetchBountyQuests();
    }
  }, [
    isAuthenticated, 
    isLoading, 
    fetchResources, 
    fetchCharacters, 
    fetchAuras, 
    fetchFarmingTasks, 
    fetchDungeonRuns,
    fetchForgingTasks,
    fetchBlackMarketListings,
    fetchBountyQuests
  ]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-primary-900 flex items-center justify-center">
        <div className="text-secondary animate-pulse text-2xl font-cinzel">
          Loading The Forge...
        </div>
      </div>
    );
  }

  // If not authenticated, show login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex flex-col items-center justify-center p-4">
        <div className="bg-[#432874]/20 border border-[#432874]/50 rounded-xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-cinzel font-bold text-[#FF9D00] text-center mb-6">The Forge</h1>
          <p className="text-[#C8B8DB] text-center mb-8">
            Welcome to The Forge - the management platform for Aura Forge. Log in with Discord to begin your journey.
          </p>
          
          {/* Universal login button that uses the dev/prod logic in the store */}
          <button 
            onClick={() => login()}
            className="w-full bg-[#7855FF] hover:bg-[#6248BF] transition-colors text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center relative overflow-hidden"
          >
            {/* DEV mode indicator that shows up conditionally with client-side JS */}
            <div id="dev-indicator" className="absolute top-0 left-0 bg-green-500 text-white text-xs px-2 py-0.5 hidden">DEV</div>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 127.14 96.36" className="w-6 h-6 mr-2 fill-current">
              <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z" />
            </svg>
            <span id="login-button-text">Login with Discord</span>
          </button>
          
          {/* Client-side script to update login button text based on dev/prod environment */}
          <script dangerouslySetInnerHTML={{ __html: `
            (function() {
              const isDevEnvironment = window.location.hostname === 'localhost' || window.location.hostname.includes('replit');
              if (isDevEnvironment) {
                const indicator = document.getElementById('dev-indicator');
                const buttonText = document.getElementById('login-button-text');
                if (indicator) indicator.classList.remove('hidden');
                if (buttonText) buttonText.textContent = 'Dev Login (No Discord Required)';
              }
            })();
          `}} />
          
          <div className="mt-6 text-center text-[#C8B8DB]/60 text-sm">
            Alpha v0.1 - Connect your Discord account to start your adventure
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#1F1D36] text-[#C8B8DB] font-nunito">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <main className="flex-1 overflow-y-auto bg-[#1F1D36] p-4">
          {children}
          
          <div className="fixed bottom-4 right-4 md:hidden">
            <AICompanion />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;
