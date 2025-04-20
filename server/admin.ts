import { Express, Request, Response } from 'express';
import { storage } from './storage';
import { db } from './db';
import { characters } from '@shared/schema';
import { eq } from 'drizzle-orm';

export async function registerAdminRoutes(app: Express) {
  // Admin endpoint to add more auras to inventory
  app.post('/api/admin/add-more-auras', async (req: Request, res: Response) => {
    try {
      // Get user ID from session or request
      const userId = req.session?.userId || req.body.userId;
      
      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }
      
      // Create powerful auras
      const aurasToCreate = [
        {
          name: 'Phoenix Rebirth',
          element: 'fire',
          tier: 5,
          level: 30,
          rarity: 'legendary',
          attack: 55,
          defense: 15,
          vitality: 120, 
          speed: 25,
          focus: 30,
          skills: JSON.stringify(['Rising Flame', 'Rebirth', 'Ashen Wings']),
          iconUrl: 'https://images.unsplash.com/photo-1549813069-f95e44d7f498?w=150&h=150&fit=crop'
        },
        {
          name: 'Glacier Mantle',
          element: 'ice',
          tier: 4,
          level: 30,
          rarity: 'epic',
          attack: 25,
          defense: 55,
          vitality: 150,
          speed: 5,
          focus: 20,
          skills: JSON.stringify(['Frozen Armor', 'Winter Wind', 'Permafrost']),
          iconUrl: 'https://images.unsplash.com/photo-1579974849948-1b0a7e76121a?w=150&h=150&fit=crop'
        },
        {
          name: 'Lightning Strike',
          element: 'lightning',
          tier: 4,
          level: 30,
          rarity: 'epic',
          attack: 40,
          defense: 5,
          vitality: 80,
          speed: 50,
          focus: 35,
          skills: JSON.stringify(['Thunder Bolt', 'Chain Lightning', 'Static Field']),
          iconUrl: 'https://images.unsplash.com/photo-1537210249814-b9a10a161ae4?w=150&h=150&fit=crop'
        },
        {
          name: 'Earth Shield',
          element: 'earth',
          tier: 3,
          level: 30,
          rarity: 'rare',
          attack: 10,
          defense: 45,
          vitality: 200,
          speed: 0,
          focus: 15,
          skills: JSON.stringify(['Stone Skin', 'Earth Spike', 'Boulder Toss']),
          iconUrl: 'https://images.unsplash.com/photo-1510343513665-87c889f8b0ef?w=150&h=150&fit=crop'
        },
        {
          name: 'Wind Rush',
          element: 'wind',
          tier: 4,
          level: 30,
          rarity: 'epic',
          attack: 20,
          defense: 15,
          vitality: 90,
          speed: 55,
          focus: 25,
          skills: JSON.stringify(['Gale Force', 'Cyclone', 'Air Shield']),
          iconUrl: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=150&h=150&fit=crop'
        },
        {
          name: 'Shadow Cloak',
          element: 'shadow',
          tier: 5,
          level: 30,
          rarity: 'legendary',
          attack: 30,
          defense: 30,
          vitality: 120,
          speed: 35,
          focus: 40,
          skills: JSON.stringify(['Dark Shroud', 'Shadow Step', 'Umbral Blast']),
          iconUrl: 'https://images.unsplash.com/photo-1519608425089-7f3bfa6f6bb8?w=150&h=150&fit=crop'
        },
        {
          name: 'Light Halo',
          element: 'light',
          tier: 5,
          level: 30,
          rarity: 'legendary',
          attack: 35,
          defense: 35,
          vitality: 150,
          speed: 30,
          focus: 45,
          skills: JSON.stringify(['Divine Ray', 'Blessing', 'Holy Nova']),
          iconUrl: 'https://images.unsplash.com/photo-1523401257547-36b5171b3be0?w=150&h=150&fit=crop'
        },
        {
          name: 'Nature\'s Blessing',
          element: 'nature',
          tier: 4,
          level: 30,
          rarity: 'epic',
          attack: 25,
          defense: 25,
          vitality: 180,
          speed: 25,
          focus: 30,
          skills: JSON.stringify(['Rejuvenate', 'Thornshield', 'Wild Growth']),
          iconUrl: 'https://images.unsplash.com/photo-1462690417829-5b41247f6b0e?w=150&h=150&fit=crop'
        },
        {
          name: 'Water Flow',
          element: 'water',
          tier: 3,
          level: 30,
          rarity: 'rare',
          attack: 20,
          defense: 30,
          vitality: 140,
          speed: 20,
          focus: 35,
          skills: JSON.stringify(['Tidal Wave', 'Healing Stream', 'Whirlpool']),
          iconUrl: 'https://images.unsplash.com/photo-1454789476662-53eb23ba5907?w=150&h=150&fit=crop'
        },
        {
          name: 'Arcane Power',
          element: 'arcane',
          tier: 5,
          level: 30,
          rarity: 'legendary',
          attack: 50,
          defense: 20,
          vitality: 120,
          speed: 15,
          focus: 60,
          skills: JSON.stringify(['Mystic Blast', 'Arcane Shield', 'Mana Surge']),
          iconUrl: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?w=150&h=150&fit=crop'
        },
        {
          name: 'Volcanic Fury',
          element: 'fire',
          tier: 4,
          level: 30,
          rarity: 'epic',
          attack: 55,
          defense: 15,
          vitality: 90,
          speed: 20,
          focus: 25,
          skills: JSON.stringify(['Magma Strike', 'Lava Flow', 'Eruption']),
          iconUrl: 'https://images.unsplash.com/photo-1610498955353-c92da35d40da?w=150&h=150&fit=crop'
        },
        {
          name: 'Frost Nova',
          element: 'ice',
          tier: 4,
          level: 30,
          rarity: 'epic',
          attack: 35,
          defense: 35,
          vitality: 110,
          speed: 10,
          focus: 40,
          skills: JSON.stringify(['Frozen Core', 'Ice Blast', 'Winter\'s Grasp']),
          iconUrl: 'https://images.unsplash.com/photo-1476368571201-5b1ad1c8e3b5?w=150&h=150&fit=crop'
        },
        {
          name: 'Thunder God',
          element: 'lightning',
          tier: 5,
          level: 30,
          rarity: 'legendary',
          attack: 60,
          defense: 10,
          vitality: 100,
          speed: 45,
          focus: 30,
          skills: JSON.stringify(['Lightning Strike', 'Thunder Clap', 'Storm Call']),
          iconUrl: 'https://images.unsplash.com/photo-1537210249814-b9a10a161ae4?w=150&h=150&fit=crop'
        },
        {
          name: 'Mountain\'s Strength',
          element: 'earth',
          tier: 4,
          level: 30,
          rarity: 'epic',
          attack: 20,
          defense: 60,
          vitality: 220,
          speed: 0,
          focus: 15,
          skills: JSON.stringify(['Stone Skin', 'Earth Spike', 'Avalanche']),
          iconUrl: 'https://images.unsplash.com/photo-1553075712-453f7dfe1d6c?w=150&h=150&fit=crop'
        },
        {
          name: 'Tornado Force',
          element: 'wind',
          tier: 4,
          level: 30,
          rarity: 'epic',
          attack: 40,
          defense: 10,
          vitality: 80,
          speed: 60,
          focus: 25,
          skills: JSON.stringify(['Gale Force', 'Cyclone', 'Air Shield']),
          iconUrl: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=150&h=150&fit=crop'
        }
      ];
      
      // Create auras sequentially to avoid DB conflicts
      const createdAuras = [];
      for (const aura of aurasToCreate) {
        try {
          // Extract skills from the stringified JSON for proper storage
          const { skills: skillsString, ...auraData } = aura;
          let skills = [];
          
          // Parse skills if they exist
          if (skillsString) {
            try {
              skills = JSON.parse(skillsString as string);
            } catch (e) {
              console.warn(`Could not parse skills for ${aura.name}:`, e);
              skills = [];
            }
          }
          
          const newAura = await storage.createAura({
            userId,
            ...auraData,
            skills: skills
          });
          createdAuras.push(newAura);
        } catch (error) {
          console.error(`Error creating aura ${aura.name}:`, error);
        }
      }
      
      // Log activity
      await storage.createActivityLog({
        userId,
        activityType: 'auras_added',
        description: `Added ${createdAuras.length} new auras`,
        relatedIds: {}
      });
      
      return res.json({
        success: true,
        message: `Added ${createdAuras.length} auras to inventory`,
        auras: createdAuras.length
      });
    } catch (error) {
      console.error('Error adding auras:', error);
      return res.status(500).json({ 
        message: 'Failed to add auras', 
        error: error instanceof Error ? error.message : String(error) 
      });
    }
  });
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