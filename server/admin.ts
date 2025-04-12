import { Express, Request, Response } from 'express';
import { storage } from './storage';

export async function registerAdminRoutes(app: Express) {
  // Admin endpoint to add 15,000 Essence
  app.post('/api/admin/add-essence', async (req: Request, res: Response) => {
    try {
      // Get user ID (using ID 1 for development)
      const userId = 1;
      
      // Check if Essence resource exists
      let essence = await storage.getResourceByNameAndUserId('Essence', userId);
      
      if (essence) {
        // Update existing resource
        const updatedEssence = await storage.updateResource(essence.id, {
          quantity: (essence.quantity || 0) + 15000
        });
        res.json(updatedEssence);
      } else {
        // Create new Essence resource
        const newEssence = await storage.createResource({
          userId,
          name: 'Essence',
          description: 'Magical essence used for crafting and upgrading',
          type: 'crafting',
          iconUrl: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=150&h=150&fit=crop',
          quantity: 15000
        });
        res.json(newEssence);
      }
      
      // Log activity
      await storage.createActivityLog({
        userId,
        activityType: 'resource_added',
        description: 'Added 15,000 Essence',
        relatedIds: {}
      });
      
      console.log('Added 15,000 Essence to user account');
      
    } catch (error) {
      console.error('Error adding essence:', error);
      res.status(500).json({ message: 'Failed to add essence' });
    }
  });
  
  // Admin endpoint to add 5,000 Rogue Credits and 5,000 Forge Tokens
  app.post('/api/admin/add-currency', async (req: Request, res: Response) => {
    try {
      // Get user ID (using ID 1 for development)
      const userId = 1;
      
      // Get the user
      const user = await storage.getUserById(userId);
      
      if (user) {
        // Update user with additional currency
        const updatedUser = await storage.updateUser(userId, {
          rogueCredits: (user.rogueCredits || 0) + 5000,
          forgeTokens: (user.forgeTokens || 0) + 5000
        });
        
        // Log activity
        await storage.createActivityLog({
          userId,
          activityType: 'currency_added',
          description: 'Added 5,000 Rogue Credits and 5,000 Forge Tokens',
          relatedIds: {}
        });
        
        console.log('Added currency to user account', updatedUser);
        res.json({ success: true, user: updatedUser });
      } else {
        res.status(404).json({ message: 'User not found' });
      }
    } catch (error) {
      console.error('Error adding currency:', error);
      res.status(500).json({ message: 'Failed to add currency' });
    }
  });
  
  // Add more admin routes here as needed
}