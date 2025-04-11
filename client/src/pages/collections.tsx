import { useEffect } from 'react';
import CollectionsView from '@/components/collections/CollectionsView';
import { useDiscordAuth } from '@/lib/discordAuth';
import { Redirect } from 'wouter';

export default function Collections() {
  const { isAuthenticated, isAuthenticating } = useDiscordAuth();

  // Redirect unauthenticated users
  if (!isAuthenticated && !isAuthenticating) {
    return <Redirect to="/" />;
  }

  return (
    <div className="container mx-auto p-4">
      <CollectionsView />
    </div>
  );
}