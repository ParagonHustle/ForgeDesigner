import { useAuthStore } from './zustandStore';

/**
 * Handles the Discord OAuth2 authentication flow.
 */
export const discordAuth = {
  /**
   * Redirects the user to Discord's authorization endpoint.
   */
  login: () => {
    useAuthStore.getState().loginWithDiscord();
  },
  
  /**
   * Logs the user out by clearing their session.
   */
  logout: async () => {
    await useAuthStore.getState().logout();
  },
  
  /**
   * Checks if the user is authenticated.
   */
  isAuthenticated: (): boolean => {
    return useAuthStore.getState().isAuthenticated;
  },
  
  /**
   * Gets the current authenticated user.
   */
  getUser: () => {
    return useAuthStore.getState().user;
  },
  
  /**
   * Refreshes the user information from the server.
   */
  refreshUser: async () => {
    return await useAuthStore.getState().fetchUser();
  }
};

/**
 * Custom hook for using Discord auth in components
 */
export const useDiscordAuth = () => {
  const { user, isAuthenticated, isLoading, loginWithDiscord, logout, fetchUser } = useAuthStore();
  
  return {
    user,
    isAuthenticated,
    isLoading,
    login: loginWithDiscord,
    logout,
    fetchUser
  };
};
