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
      
      // Create powerful auras
      const auraTypes = [
        { name: 'Phoenix Rebirth', element: 'fire', rarity: 'legendary', tier: 5,
          power: 55, defense: 15, vitality: 120, energy: 35, skills: ['Rising Flame', 'Rebirth', 'Ashen Wings'] },
        { name: 'Glacier Mantle', element: 'ice', rarity: 'epic', tier: 4,
          power: 25, defense: 55, vitality: 150, energy: 15, skills: ['Frozen Armor', 'Winter Wind', 'Permafrost'] },
        { name: 'Thunder God', element: 'lightning', rarity: 'legendary', tier: 5,
          power: 60, defense: 10, vitality: 100, energy: 45, skills: ['Lightning Strike', 'Thunder Clap', 'Storm Call'] },
        { name: 'Mountain Strength', element: 'earth', rarity: 'epic', tier: 4,
          power: 20, defense: 60, vitality: 220, energy: 5, skills: ['Stone Skin', 'Earth Spike', 'Avalanche'] },
        { name: 'Void Entity', element: 'shadow', rarity: 'legendary', tier: 5,
          power: 45, defense: 45, vitality: 140, energy: 40, skills: ['Dark Absorption', 'Null Zone', 'Oblivion'] },
        { name: 'Light Halo', element: 'light', rarity: 'legendary', tier: 5,
          power: 35, defense: 35, vitality: 150, energy: 30, skills: ['Divine Ray', 'Blessing', 'Holy Nova'] },
        { name: 'Tornado Force', element: 'wind', rarity: 'epic', tier: 4,
          power: 40, defense: 10, vitality: 80, energy: 60, skills: ['Gale Force', 'Cyclone', 'Air Shield'] },
        { name: 'Arcane Power', element: 'arcane', rarity: 'legendary', tier: 5,
          power: 50, defense: 20, vitality: 120, energy: 60, skills: ['Mystic Blast', 'Arcane Shield', 'Mana Surge'] },
        { name: 'Nature\'s Blessing', element: 'nature', rarity: 'epic', tier: 4,
          power: 25, defense: 25, vitality: 180, energy: 30, skills: ['Rejuvenate', 'Thornshield', 'Wild Growth'] },
        { name: 'Water Flow', element: 'water', rarity: 'rare', tier: 3,
          power: 20, defense: 30, vitality: 140, energy: 35, skills: ['Tidal Wave', 'Healing Stream', 'Whirlpool'] }
      ];
      
      const createdAuras = [];
      for (const aura of auraTypes) {
        const newAura = await storage.createAura({
          userId,
          name: aura.name,
          element: aura.element,
          tier: aura.tier,
          rarity: aura.rarity,
          level: 30,
          requiredLevel: 25,
          power: aura.power || 50,
          defense: aura.defense || 30,
          vitality: aura.vitality || 150,
          energy: aura.energy || 30,
          iconUrl: `https://images.unsplash.com/photo-1614728894747-a83421e2b9c9?w=150&h=150&fit=crop&auto=format&q=80&crop=entropy&cs=tinysrgb&ixid=MnwxfDB8MXxyYW5kb218MHx8fHx8fHx8MTY5MTkxMjcwMw&ixlib=rb-4.0.3`,
          skills: aura.skills || [],
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
          level: 35,
          iconUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&h=150&fit=crop"
        },
        {
          name: "Frostbite",
          class: "assassin",
          element: "ice",
          rarity: "epic",
          level: 35,
          iconUrl: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=150&h=150&fit=crop"
        },
        {
          name: "Thunderclap",
          class: "berserker",
          element: "lightning",
          rarity: "legendary",
          level: 35,
          iconUrl: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&h=150&fit=crop"
        },
        {
          name: "Titan",
          class: "Guardian",
          element: "earth",
          rarity: "legendary",
          level: 35,
          iconUrl: "https://images.unsplash.com/photo-1560982631-1dcbf0d2e5d5?w=250&h=250&fit=crop"
        },
        {
          name: "Blaze",
          class: "Pyromancer",
          element: "fire",
          rarity: "epic",
          level: 35,
          iconUrl: "https://images.unsplash.com/photo-1599689868230-f88c0481f2a2?w=250&h=250&fit=crop"
        },
        {
          name: "Phantom",
          class: "Shadow Stalker",
          element: "shadow",
          rarity: "legendary",
          level: 35,
          iconUrl: "https://images.unsplash.com/photo-1596499058780-974c9225d88f?w=250&h=250&fit=crop"
        },
        {
          name: "Ironheart",
          class: "Tank",
          element: "metal",
          rarity: "epic",
          level: 35,
          iconUrl: "https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=250&h=250&fit=crop"
        },
        {
          name: "Lightbringer",
          class: "Paladin",
          element: "light",
          rarity: "legendary",
          level: 35,
          iconUrl: "https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=250&h=250&fit=crop"
        },
        {
          name: "Stormbringer",
          class: "Elementalist",
          element: "lightning",
          rarity: "epic",
          level: 35,
          iconUrl: "https://images.unsplash.com/photo-1521119989659-a83eee488004?w=250&h=250&fit=crop"
        },
        {
          name: "Nightshade",
          class: "Assassin",
          element: "shadow",
          rarity: "epic",
          level: 35,
          iconUrl: "https://images.unsplash.com/photo-1559123519-e05d8e2a15bd?w=250&h=250&fit=crop"
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