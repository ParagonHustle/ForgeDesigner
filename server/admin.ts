import { Express, Request, Response } from 'express';
import { storage } from './storage';
import { db } from './db';
import { characters } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function registerAdminRoutes(app: Express) {
  // Admin endpoint to add advanced content (99999 Essence, Auras, and characters)
  app.post('/api/admin/add-advanced-content', async (req: Request, res: Response) => {
    try {
      // Get user ID from session
      const userId = req.session?.userId;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      // Add 99999 Essence
      let essence = await storage.getResourceByNameAndUserId('Essence', userId);
      if (essence) {
        await storage.updateResource(essence.id, {
          quantity: (essence.quantity || 0) + 99999
        });
      } else {
        await storage.createResource({
          userId,
          name: 'Essence',
          description: 'Magical essence used for crafting and upgrading',
          type: 'crafting',
          iconUrl: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=150&h=150&fit=crop',
          quantity: 99999
        });
      }
      
      console.log('Added 99999 Essence to user account');
      
      // Create Level 1 Auras
      const auraTypes = [
        { name: 'Flame Aura', element: 'fire', rarity: 'common', tier: 1 },
        { name: 'Ice Barrier', element: 'ice', rarity: 'common', tier: 1 },
        { name: 'Lightning Shield', element: 'lightning', rarity: 'uncommon', tier: 1 },
        { name: 'Earth Embrace', element: 'earth', rarity: 'common', tier: 1 },
        { name: 'Void Mantle', element: 'void', rarity: 'rare', tier: 1 }
      ];
      
      const createdAuras = [];
      for (const aura of auraTypes) {
        const newAura = await storage.createAura({
          userId,
          name: aura.name,
          description: `A level 1 ${aura.element} aura that provides elemental protection.`,
          element: aura.element,
          tier: aura.tier,
          rarity: aura.rarity,
          level: 1,
          requiredLevel: 1,
          power: 10 + Math.floor(Math.random() * 5),
          defense: 5 + Math.floor(Math.random() * 5),
          vitality: 3 + Math.floor(Math.random() * 3),
          energy: 5 + Math.floor(Math.random() * 5),
          iconUrl: `https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=150&h=150&fit=crop&auto=format&q=80&crop=entropy&cs=tinysrgb&ixid=MnwxfDB8MXxyYW5kb218MHx8fHx8fHx8MTY5MTkxMjcwMw&ixlib=rb-4.0.3`,
          skills: [],
          equippedByCharacterId: null,
          isFusing: false
        });
        createdAuras.push(newAura);
      }
      
      console.log(`Created ${createdAuras.length} auras`);
      
      // Create duplicate characters
      const existingCharacters = await storage.getCharacters(userId);
      const duplicateCharacters = [];
      
      if (existingCharacters.length > 0) {
        // Duplicate the first character twice
        const baseChar = existingCharacters[0];
        
        for (let i = 1; i <= 2; i++) {
          const newChar = await storage.createCharacter({
            userId,
            name: `${baseChar.name} Clone ${i}`,
            level: baseChar.level,
            class: baseChar.class,
            attack: baseChar.attack,
            defense: baseChar.defense,
            vitality: baseChar.vitality,
            speed: baseChar.speed,
            focus: baseChar.focus,
            accuracy: baseChar.accuracy,
            resilience: baseChar.resilience,
            avatarUrl: baseChar.avatarUrl || 'https://cdn.pixabay.com/photo/2021/03/02/12/03/avatar-6062252_1280.png',
            equippedAuraId: null,
            isActive: false
          });
          duplicateCharacters.push(newChar);
        }
      }
      
      console.log(`Created ${duplicateCharacters.length} duplicate characters`);
      
      // Create new characters with avatars
      const newCharacters = [
        {
          name: "Dragonfire",
          class: "battlemage",
          element: "fire",
          rarity: "legendary",
          level: 15,
          iconUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop"
        },
        {
          name: "Frostbite",
          class: "assassin",
          element: "ice",
          rarity: "epic",
          level: 12,
          iconUrl: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&h=150&fit=crop"
        },
        {
          name: "Thunderclap",
          class: "berserker",
          element: "lightning",
          rarity: "rare",
          level: 10,
          iconUrl: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&h=150&fit=crop"
        }
      ];
      
      const createdCharacters = [];
      for (const char of newCharacters) {
        const newChar = await storage.createCharacter({
          userId,
          name: char.name,
          level: char.level,
          class: char.class,
          element: char.element,
          rarity: char.rarity,
          attack: 10 + (char.level * 3) + Math.floor(Math.random() * 10),
          defense: 8 + (char.level * 2) + Math.floor(Math.random() * 8),
          vitality: 100 + (char.level * 10) + Math.floor(Math.random() * 20),
          speed: 5 + (char.level * 1) + Math.floor(Math.random() * 5),
          focus: 8 + (char.level * 2) + Math.floor(Math.random() * 7),
          accuracy: 80 + Math.floor(Math.random() * 10),
          resilience: 10 + (char.level * 1) + Math.floor(Math.random() * 5),
          avatarUrl: char.iconUrl || 'https://cdn.pixabay.com/photo/2021/03/02/12/03/avatar-6062252_1280.png',
          equippedAuraId: null,
          isActive: false
        });
        createdCharacters.push(newChar);
      }
      
      console.log(`Created ${createdCharacters.length} new characters`);
      
      // Log activity
      await storage.createActivityLog({
        userId,
        activityType: 'admin_content_added',
        description: `Added 99999 Essence, ${createdAuras.length} auras, and ${duplicateCharacters.length + createdCharacters.length} characters`,
        relatedIds: {}
      });
      
      return res.json({
        success: true,
        message: `Added advanced content to account`,
        auras: createdAuras.length,
        characters: duplicateCharacters.length + createdCharacters.length,
        essence: 99999
      });
    } catch (error) {
      console.error('Error adding advanced content:', error);
      return res.status(500).json({ message: 'Failed to add advanced content', error: error.message });
    }
  });
  
  // Admin endpoint to add 15,000 Essence
  app.post('/api/admin/add-essence', async (req: Request, res: Response) => {
    try {
      // Get user ID from session or use a specific user ID as fallback
      const userId = req.session?.userId || req.body.userId;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
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
      // Get user ID from session or use a specific user ID as fallback
      const userId = req.session?.userId || req.body.userId;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
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