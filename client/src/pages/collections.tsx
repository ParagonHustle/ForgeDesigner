import { useEffect } from 'react';
import CollectionsView from '@/components/collections/CollectionsView';
import { useAuthStore } from '@/lib/zustandStore';
import { Redirect } from 'wouter';

export default function Collections() {
  const { user } = useAuthStore();

  // Redirect unauthenticated users
  if (!user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="container mx-auto p-4">
      <CollectionsView />
    </div>
  );
}