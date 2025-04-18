import { Express, Request, Response } from 'express';
import { storage } from './storage';
import { db } from './db';
import { characters } from '@shared/schema';
import { eq } from 'drizzle-orm';

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
  
  // Admin endpoint to free stuck characters
  app.post('/api/admin/free-characters', async (req: Request, res: Response) => {
    try {
      // Get user ID from session or use a specific user ID as fallback
      const userId = req.session?.userId || req.body.userId;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      // Get all active characters for this user
      const activeCharacters = await db.query.characters.findMany({
        where: (characters, { and, eq }) => 
          and(eq(characters.userId, userId), eq(characters.isActive, true))
      });
      
      console.log(`Found ${activeCharacters.length} active characters for user ${userId}`);
      
      // Update each character to set isActive = false
      const results = [];
      for (const character of activeCharacters) {
        await db.update(characters)
          .set({ isActive: false })
          .where(eq(characters.id, character.id));
        
        results.push({
          id: character.id,
          name: character.name,
          freed: true
        });
        
        console.log(`Freed character: ${character.name} (ID: ${character.id})`);
      }
      
      // Log activity
      await storage.createActivityLog({
        userId,
        activityType: 'characters_freed',
        description: `Freed ${results.length} stuck characters`,
        relatedIds: { characterIds: results.map(c => c.id) }
      });
      
      return res.json({
        success: true,
        message: `Freed ${results.length} characters`,
        characters: results
      });
    } catch (error) {
      console.error('Error freeing characters:', error);
      return res.status(500).json({ message: 'Failed to free characters', error: error.message });
    }
  });
  
  // Admin endpoint to force complete all dungeon runs
  app.post('/api/admin/complete-dungeons', async (req: Request, res: Response) => {
    try {
      // Get user ID from session or use a specific user ID as fallback
      const userId = req.session?.userId || req.body.userId;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      // Get all incomplete dungeon runs for this user
      const dungeonRuns = await storage.getDungeonRuns(userId);
      const incompleteDungeons = dungeonRuns.filter(run => !run.completed);
      
      console.log(`Found ${incompleteDungeons.length} incomplete dungeons for user ${userId}`);
      
      // Force complete each dungeon
      const results = [];
      for (const run of incompleteDungeons) {
        // Force the dungeon to complete with success=true
        const updatedRun = await storage.updateDungeonRun(run.id, {
          completed: true,
          success: true,
          completedStages: run.totalStages || 8
        });
        
        results.push({
          id: updatedRun.id,
          name: updatedRun.dungeonName,
          completed: true
        });
        
        console.log(`Completed dungeon: ${run.dungeonName} (ID: ${run.id})`);
      }
      
      // Log activity
      await storage.createActivityLog({
        userId,
        activityType: 'dungeons_completed',
        description: `Force-completed ${results.length} dungeons`,
        relatedIds: { dungeonIds: results.map(d => d.id) }
      });
      
      return res.json({
        success: true,
        message: `Completed ${results.length} dungeons`,
        dungeons: results
      });
    } catch (error) {
      console.error('Error completing dungeons:', error);
      return res.status(500).json({ message: 'Failed to complete dungeons', error: error.message });
    }
  });
}