import { create } from 'zustand';
import { apiRequest } from './queryClient';
import type { User, Character, Aura, Resource, FarmingTask, DungeonRun, ForgingTask, BlackMarketListing, BountyQuest } from '@shared/schema';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithDiscord: () => void;
  logout: () => void;
  fetchUser: () => Promise<User | null>;
}

interface GameState {
  // Resources
  forgeTokens: number;
  rogueCredits: number;
  soulShards: number;
  resources: Resource[];
  
  // Game Settings
  speedBoostActive: boolean;
  speedBoostMultiplier: number;
  
  // Collections
  characters: Character[];
  auras: Aura[];
  
  // Active tasks
  farmingTasks: FarmingTask[];
  dungeonRuns: DungeonRun[];
  forgingTasks: ForgingTask[];
  
  // Marketplace
  blackMarketListings: BlackMarketListing[];
  
  // Bounties
  bountyQuests: BountyQuest[];
  
  // Discord chat
  discordMessages: { id: string; username: string; content: string; timestamp: Date }[];
  
  // Functions
  updateCurrencies: (forgeTokens: number, rogueCredits: number, soulShards: number) => void;
  fetchResources: () => Promise<void>;
  fetchCharacters: () => Promise<void>;
  fetchAuras: () => Promise<void>;
  fetchFarmingTasks: () => Promise<void>;
  fetchDungeonRuns: () => Promise<void>;
  fetchForgingTasks: () => Promise<void>;
  fetchBlackMarketListings: () => Promise<void>;
  fetchBountyQuests: () => Promise<void>;
  
  addDiscordMessage: (username: string, content: string) => void;
}

// Auth store
export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  
  loginWithDiscord: () => {
    window.location.href = '/api/auth/discord';
  },
  
  logout: async () => {
    try {
      await apiRequest('GET', '/api/auth/logout', undefined);
      set({ user: null, isAuthenticated: false });
    } catch (error) {
      console.error('Logout failed:', error);
    }
  },
  
  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/auth/user', { credentials: 'include' });
      if (res.ok) {
        const user = await res.json();
        set({ user, isAuthenticated: true, isLoading: false });
        
        // Update game store with user's currencies
        const gameStore = useGameStore.getState();
        gameStore.updateCurrencies(user.forgeTokens || 0, user.rogueCredits || 0, user.soulShards || 0);
        
        return user;
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
        return null;
      }
    } catch (error) {
      console.error('Error fetching user:', error);
      set({ user: null, isAuthenticated: false, isLoading: false });
      return null;
    }
  }
}));

// Game store
export const useGameStore = create<GameState>((set, get) => ({
  // Resources
  forgeTokens: 0,
  rogueCredits: 0,
  soulShards: 0,
  resources: [],
  
  // Game Settings
  speedBoostActive: true,
  speedBoostMultiplier: 10,
  
  // Collections
  characters: [],
  auras: [],
  
  // Active tasks
  farmingTasks: [],
  dungeonRuns: [],
  forgingTasks: [],
  
  // Marketplace
  blackMarketListings: [],
  
  // Bounties
  bountyQuests: [],
  
  // Discord chat
  discordMessages: [
    { id: '1', username: 'GuildMaster', content: 'Anyone want to try the new dungeon?', timestamp: new Date() },
    { id: '2', username: 'AuraCollector', content: 'I got a rare Fire Aura from fusion!', timestamp: new Date() },
    { id: '3', username: 'ForgeHero', content: "I'll join the dungeon run in 5", timestamp: new Date() }
  ],
  
  // Update currencies
  updateCurrencies: (forgeTokens, rogueCredits, soulShards) => {
    set({ forgeTokens, rogueCredits, soulShards });
  },
  
  // Functions
  fetchResources: async () => {
    try {
      const res = await fetch('/api/resources', { credentials: 'include' });
      if (res.ok) {
        const resources = await res.json();
        set({ resources });
      }
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  },
  
  fetchCharacters: async () => {
    try {
      const res = await fetch('/api/characters', { credentials: 'include' });
      if (res.ok) {
        const characters = await res.json();
        set({ characters });
      }
    } catch (error) {
      console.error('Error fetching characters:', error);
    }
  },
  
  fetchAuras: async () => {
    try {
      const res = await fetch('/api/auras', { credentials: 'include' });
      if (res.ok) {
        const auras = await res.json();
        set({ auras });
      }
    } catch (error) {
      console.error('Error fetching auras:', error);
    }
  },
  
  fetchFarmingTasks: async () => {
    try {
      const res = await fetch('/api/farming/tasks', { credentials: 'include' });
      if (res.ok) {
        const farmingTasks = await res.json();
        set({ farmingTasks });
      }
    } catch (error) {
      console.error('Error fetching farming tasks:', error);
    }
  },
  
  fetchDungeonRuns: async () => {
    try {
      const res = await fetch('/api/dungeons/runs', { credentials: 'include' });
      if (res.ok) {
        const dungeonRuns = await res.json();
        set({ dungeonRuns });
      }
    } catch (error) {
      console.error('Error fetching dungeon runs:', error);
    }
  },
  
  fetchForgingTasks: async () => {
    try {
      const res = await fetch('/api/forge/tasks', { credentials: 'include' });
      if (res.ok) {
        const forgingTasks = await res.json();
        set({ forgingTasks });
      }
    } catch (error) {
      console.error('Error fetching forging tasks:', error);
    }
  },
  
  fetchBlackMarketListings: async () => {
    try {
      const res = await fetch('/api/blackmarket/listings', { credentials: 'include' });
      if (res.ok) {
        const blackMarketListings = await res.json();
        set({ blackMarketListings });
      }
    } catch (error) {
      console.error('Error fetching black market listings:', error);
    }
  },
  
  fetchBountyQuests: async () => {
    try {
      const res = await fetch('/api/bounty/quests', { credentials: 'include' });
      if (res.ok) {
        const bountyQuests = await res.json();
        set({ bountyQuests });
      }
    } catch (error) {
      console.error('Error fetching bounty quests:', error);
    }
  },
  
  addDiscordMessage: (username: string, content: string) => {
    const newMessage = {
      id: Date.now().toString(),
      username,
      content,
      timestamp: new Date()
    };
    set((state) => ({
      discordMessages: [...state.discordMessages, newMessage].slice(-100) // Keep only latest 100 messages
    }));
  }
}));
