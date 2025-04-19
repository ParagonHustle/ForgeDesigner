import { ReactNode, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import AICompanion from '../ui/AICompanion';
import { useAuthStore, useGameStore } from '@/lib/zustandStore';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout = ({ children }: MainLayoutProps) => {
  const { isAuthenticated, isLoading, user, login, fetchUser } = useAuthStore();
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

  // Load user data on mount and auto-login for prototype
  useEffect(() => {
    fetchUser().then((userData) => {
      // For prototype: Auto-login if not authenticated
      if (!userData) {
        console.log('Auto-login for prototype initiated');
        login();
      }
    });
  }, [fetchUser, login]);

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

  // If not authenticated, show auto-login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex flex-col items-center justify-center p-4">
        <div className="bg-[#432874]/20 border border-[#432874]/50 rounded-xl p-8 max-w-md w-full">
          <h1 className="text-4xl font-cinzel font-bold text-[#FF9D00] text-center mb-6">The Forge</h1>
          <p className="text-[#C8B8DB] text-center mb-8">
            Welcome to The Forge - the management platform for Aura Forge. 
            <br/><span className="text-[#FF9D00]">(Prototype: Click below to log in automatically as an admin with full access)</span>
          </p>
          
          {/* Auto-login button */}
          <button 
            onClick={() => login()}
            className="w-full bg-[#7855FF] hover:bg-[#6248BF] transition-colors text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 bg-green-500 text-white text-xs px-2 py-0.5">PROTOTYPE</div>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 mr-2">
              <path d="M15 6v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3" />
            </svg>
            <span>Auto-Login as Admin</span>
          </button>
          
          <div className="mt-6 text-center text-[#C8B8DB]/60 text-sm">
            Alpha v0.1 - Prototype Mode - No Discord Account Required
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
