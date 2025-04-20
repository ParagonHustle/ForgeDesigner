import React from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/zustandStore';

/**
 * Component for admin tools and actions
 */
export function AdminTools() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  
  const freeCharacters = async () => {
    try {
      const response = await fetch('/api/admin/free-characters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 3 }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Characters Freed",
          description: `Successfully freed ${data.characters.length} characters`,
        });
        
        // Refresh characters query
        queryClient.invalidateQueries({ queryKey: ['/api/characters'] });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to free characters",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
      console.error('Error in freeCharacters:', error);
    }
  };
  
  const completeDungeons = async () => {
    try {
      const response = await fetch('/api/admin/complete-dungeons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 3 }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Dungeons Completed",
          description: `Successfully completed ${data.dungeons.length} dungeon runs`,
        });
        
        // Refresh dungeons query
        queryClient.invalidateQueries({ queryKey: ['/api/dungeons/runs'] });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to complete dungeons",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
      console.error('Error in completeDungeons:', error);
    }
  };
  
  const addResources = async () => {
    try {
      // Add essence
      const essenceResponse = await fetch('/api/admin/add-essence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 3 }),
      });
      
      // Add currency
      const currencyResponse = await fetch('/api/admin/add-currency', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 3 }),
      });
      
      if (essenceResponse.ok && currencyResponse.ok) {
        toast({
          title: "Resources Added",
          description: "Successfully added resources and currency",
        });
        
        // Refresh resources and user
        queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to add some resources",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
      console.error('Error in addResources:', error);
    }
  };
  
  const addAdvancedContent = async () => {
    try {
      const response = await fetch('/api/admin/add-advanced-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id || 3 }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({
          title: "Advanced Content Added",
          description: `Added 99999 Essence, ${data.auras} auras, and ${data.characters} characters`,
        });
        
        // Refresh queries
        queryClient.invalidateQueries({ queryKey: ['/api/resources'] });
        queryClient.invalidateQueries({ queryKey: ['/api/characters'] });
        queryClient.invalidateQueries({ queryKey: ['/api/auras'] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to add advanced content",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "An unexpected error occurred",
      });
      console.error('Error in addAdvancedContent:', error);
    }
  };

  return (
    <div className="border border-purple-800 bg-black/30 backdrop-blur-sm p-4 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-purple-400">Admin Tools</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold mb-2 text-purple-300">Character Management</h3>
          <Button 
            variant="outline" 
            onClick={freeCharacters}
            className="border-purple-600 hover:bg-purple-900/50"
          >
            Free Stuck Characters
          </Button>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2 text-purple-300">Dungeon Management</h3>
          <Button 
            variant="outline" 
            onClick={completeDungeons}
            className="border-purple-600 hover:bg-purple-900/50"
          >
            Complete All Dungeons
          </Button>
        </div>
        
        <div>
          <h3 className="text-lg font-semibold mb-2 text-purple-300">Resource Management</h3>
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              onClick={addResources}
              className="border-purple-600 hover:bg-purple-900/50"
            >
              Add Resources & Currency
            </Button>
            
            <Button 
              variant="outline" 
              onClick={addAdvancedContent}
              className="border-yellow-600 bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-300"
            >
              Add 99999 Essence + Characters & Auras
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => {
                fetch('/api/admin/add-more-auras', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  credentials: 'include'
                })
                  .then(response => response.json())
                  .then(data => {
                    toast({
                      title: 'Auras Added',
                      description: `Successfully added ${data.auras} new auras to your inventory.`,
                      duration: 3000
                    });
                  })
                  .catch(err => {
                    console.error('Error adding auras:', err);
                    toast({
                      title: 'Error',
                      description: 'Failed to add auras to inventory.',
                      variant: 'destructive',
                      duration: 3000
                    });
                  });
              }}
              className="border-blue-600 bg-blue-900/30 hover:bg-blue-900/50 text-blue-300"
            >
              Add More Auras
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => {
                fetch('/api/auth/logout', { credentials: 'include' })
                  .then(() => {
                    window.location.href = '/';
                  });
              }}
              className="border-purple-600 bg-purple-900/30 hover:bg-purple-900/50 text-purple-300"
            >
              Logout & Create Fresh Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}