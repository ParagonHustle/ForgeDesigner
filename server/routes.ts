import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import {
  insertUserSchema,
  insertCharacterSchema,
  insertAuraSchema,
  insertResourceSchema,
  insertFarmingTaskSchema,
  insertDungeonRunSchema,
  insertForgingTaskSchema,
  insertBlackMarketListingSchema,
  insertBountyQuestSchema,
  insertBuildingUpgradeSchema,
  insertActivityLogSchema
} from "@shared/schema";

// Configure session middleware for authentication
const configureSession = (app: Express) => {
  app.use(session({
    secret: process.env.SESSION_SECRET || 'forge-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 // 24 hours
    }
  }));
};

// Authentication middleware
const authenticateUser = async (req: Request, res: Response, next: Function) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Unauthorized. Please log in.' });
  }
  
  const user = await storage.getUserById(req.session.userId);
  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ message: 'User not found. Please log in again.' });
  }
  
  next();
};

// Error handling middleware
const handleErrors = (err: any, req: Request, res: Response, next: Function) => {
  if (err instanceof ZodError) {
    const validationError = fromZodError(err);
    return res.status(400).json({ message: validationError.message });
  }
  
  console.error('Error:', err);
  res.status(500).json({ message: 'Internal server error' });
};

export async function registerRoutes(app: Express): Promise<Server> {
  configureSession(app);
  const httpServer = createServer(app);
  
  // WebSocket functionality temporarily removed to fix startup issues
  
  // Discord OAuth routes
  app.get('/api/auth/discord', (req, res) => {
    // In a real implementation, you would redirect to Discord OAuth
    // For this MVP, we'll simulate a successful login
    res.redirect('/api/auth/discord/callback?code=mock_code');
  });
  
  app.get('/api/auth/discord/callback', async (req, res) => {
    try {
      // Simulate getting user from Discord
      const mockDiscordUser = {
        id: '123456789',
        username: 'ForgeHero',
        avatar: 'https://cdn.pixabay.com/photo/2021/03/02/12/03/avatar-6062252_1280.png',
        roles: ['member']
      };
      
      // Check if user exists
      let user = await storage.getUserByDiscordId(mockDiscordUser.id);
      
      if (!user) {
        // Create new user
        user = await storage.createUser({
          discordId: mockDiscordUser.id,
          username: mockDiscordUser.username,
          avatarUrl: mockDiscordUser.avatar,
          roles: mockDiscordUser.roles,
          forgeTokens: 6200,
          rogueCredits: 2450,
          soulShards: 34,
          lastLogin: new Date()
        });
        
        // Create initial resources for new user
        await storage.createResource({
          userId: user.id,
          name: 'Celestial Ore',
          type: 'material',
          quantity: 156,
          description: 'A rare material used in crafting Auras',
          iconUrl: 'https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=150&h=150&fit=crop'
        });
      } else {
        // Update existing user's login time
        user = await storage.updateUser(user.id, { lastLogin: new Date() }) as typeof user;
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Redirect to client
      res.redirect('/');
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).json({ message: 'Authentication failed' });
    }
  });
  
  app.get('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.redirect('/');
    });
  });
  
  app.get('/api/auth/user', async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    try {
      const user = await storage.getUserById(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: 'User not found' });
      }
      
      return res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user data' });
    }
  });
  
  // Character routes
  app.get('/api/characters', authenticateUser, async (req, res) => {
    try {
      const characters = await storage.getCharacters(req.session.userId!);
      res.json(characters);
    } catch (error) {
      console.error('Error fetching characters:', error);
      res.status(500).json({ message: 'Failed to fetch characters' });
    }
  });
  
  app.post('/api/characters', authenticateUser, async (req, res) => {
    try {
      const characterData = insertCharacterSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      
      const character = await storage.createCharacter(characterData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.session.userId!,
        activityType: 'character_created',
        description: `Added new character: ${character.name}`,
        relatedIds: { characterId: character.id }
      });
      
      res.status(201).json(character);
    } catch (error) {
      handleErrors(error, req, res, () => {});
    }
  });
  
  // Aura routes
  app.get('/api/auras', authenticateUser, async (req, res) => {
    try {
      const auras = await storage.getAuras(req.session.userId!);
      res.json(auras);
    } catch (error) {
      console.error('Error fetching auras:', error);
      res.status(500).json({ message: 'Failed to fetch auras' });
    }
  });
  
  app.post('/api/auras', authenticateUser, async (req, res) => {
    try {
      const auraData = insertAuraSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      
      const aura = await storage.createAura(auraData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.session.userId!,
        activityType: 'aura_created',
        description: `Created new ${aura.element} Aura: ${aura.name}`,
        relatedIds: { auraId: aura.id }
      });
      
      res.status(201).json(aura);
    } catch (error) {
      handleErrors(error, req, res, () => {});
    }
  });
  
  // Resource routes
  app.get('/api/resources', authenticateUser, async (req, res) => {
    try {
      const resources = await storage.getResources(req.session.userId!);
      res.json(resources);
    } catch (error) {
      console.error('Error fetching resources:', error);
      res.status(500).json({ message: 'Failed to fetch resources' });
    }
  });
  
  // Farming routes
  app.get('/api/farming/tasks', authenticateUser, async (req, res) => {
    try {
      const tasks = await storage.getFarmingTasks(req.session.userId!);
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching farming tasks:', error);
      res.status(500).json({ message: 'Failed to fetch farming tasks' });
    }
  });
  
  app.post('/api/farming/tasks', authenticateUser, async (req, res) => {
    try {
      const taskData = insertFarmingTaskSchema.parse({
        ...req.body,
        userId: req.session.userId
      });
      
      // Check if character is available
      const character = await storage.getCharacterById(taskData.characterId);
      if (!character) {
        return res.status(404).json({ message: 'Character not found' });
      }
      
      if (character.isActive) {
        return res.status(400).json({ message: 'Character is already active in another task' });
      }
      
      // Mark character as active in farming
      await storage.updateCharacter(character.id, {
        isActive: true,
        activityType: 'farming',
        activityEndTime: taskData.endTime
      });
      
      const task = await storage.createFarmingTask(taskData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.session.userId!,
        activityType: 'farming_started',
        description: `Started farming ${task.resourceName}`,
        relatedIds: { characterId: character.id, taskId: task.id }
      });
      
      res.status(201).json(task);
    } catch (error) {
      handleErrors(error, req, res, () => {});
    }
  });
  
  app.post('/api/farming/complete/:id', authenticateUser, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getFarmingTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Farming task not found' });
      }
      
      if (task.userId !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to access this task' });
      }
      
      if (task.completed) {
        return res.status(400).json({ message: 'Task already completed' });
      }
      
      // Mark task as completed
      await storage.updateFarmingTask(taskId, { completed: true });
      
      // Free up the character
      await storage.updateCharacter(task.characterId, {
        isActive: false,
        activityType: null,
        activityEndTime: null
      });
      
      // Add resources to user inventory
      const resource = await storage.getResourceByNameAndUserId(task.resourceName, req.session.userId!);
      
      if (resource) {
        // Random amount between 10-30
        const gainedAmount = Math.floor(Math.random() * 21) + 10;
        await storage.updateResource(resource.id, { quantity: resource.quantity + gainedAmount });
        
        // Log activity
        await storage.createActivityLog({
          userId: req.session.userId!,
          activityType: 'farming_completed',
          description: `Completed farming and gained ${gainedAmount} ${task.resourceName}`,
          relatedIds: { characterId: task.characterId, taskId: task.id }
        });
        
        return res.json({
          success: true,
          resource: task.resourceName,
          amount: gainedAmount
        });
      } else {
        // Create new resource if it doesn't exist
        const gainedAmount = Math.floor(Math.random() * 21) + 10;
        await storage.createResource({
          userId: req.session.userId!,
          name: task.resourceName,
          type: 'material',
          quantity: gainedAmount,
          description: `A material obtained from farming`,
          iconUrl: 'https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=150&h=150&fit=crop'
        });
        
        return res.json({
          success: true,
          resource: task.resourceName,
          amount: gainedAmount
        });
      }
    } catch (error) {
      console.error('Error completing farming task:', error);
      res.status(500).json({ message: 'Failed to complete farming task' });
    }
  });
  
  // Dungeon routes
  app.get('/api/dungeons/runs', authenticateUser, async (req, res) => {
    try {
      const runs = await storage.getDungeonRuns(req.session.userId!);
      res.json(runs);
    } catch (error) {
      console.error('Error fetching dungeon runs:', error);
      res.status(500).json({ message: 'Failed to fetch dungeon runs' });
    }
  });
  
  app.post('/api/dungeons/start', authenticateUser, async (req, res) => {
    try {
      const runData = insertDungeonRunSchema.parse({
        ...req.body,
        userId: req.session.userId,
        startTime: new Date(),
        completed: false
      });
      
      // Check if all characters are available
      for (const charId of runData.characterIds) {
        const character = await storage.getCharacterById(charId);
        if (!character) {
          return res.status(404).json({ message: `Character ${charId} not found` });
        }
        
        if (character.isActive) {
          return res.status(400).json({
            message: `Character ${character.name} is already active in another task`
          });
        }
      }
      
      // Mark all characters as active
      for (const charId of runData.characterIds) {
        await storage.updateCharacter(charId, {
          isActive: true,
          activityType: 'dungeon',
          activityEndTime: runData.endTime
        });
      }
      
      const run = await storage.createDungeonRun(runData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.session.userId!,
        activityType: 'dungeon_started',
        description: `Started dungeon: ${run.dungeonName} (Level ${run.dungeonLevel})`,
        relatedIds: { runId: run.id, characterIds: runData.characterIds }
      });
      
      res.status(201).json(run);
    } catch (error) {
      handleErrors(error, req, res, () => {});
    }
  });
  
  app.post('/api/dungeons/complete/:id', authenticateUser, async (req, res) => {
    try {
      const runId = parseInt(req.params.id);
      const run = await storage.getDungeonRunById(runId);
      
      if (!run) {
        return res.status(404).json({ message: 'Dungeon run not found' });
      }
      
      if (run.userId !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to access this run' });
      }
      
      if (run.completed) {
        return res.status(400).json({ message: 'Run already completed' });
      }
      
      // Determine success (70% chance for simplicity)
      const success = Math.random() < 0.7;
      
      // Generate battle log and rewards
      const battleLog = generateMockBattleLog(run, success);
      
      // Generate rewards if successful
      let rewards = null;
      if (success) {
        rewards = {
          rogueCredits: Math.floor(Math.random() * 101) + 50,
          soulShards: Math.floor(Math.random() * 3) + 1,
          materials: [
            { name: 'Celestial Ore', amount: Math.floor(Math.random() * 11) + 5 }
          ]
        };
        
        // Update user resources
        const user = await storage.getUserById(req.session.userId!);
        if (user) {
          await storage.updateUser(user.id, {
            rogueCredits: user.rogueCredits + rewards.rogueCredits,
            soulShards: user.soulShards + rewards.soulShards
          });
        }
        
        // Update material resources
        for (const material of rewards.materials) {
          const resource = await storage.getResourceByNameAndUserId(material.name, req.session.userId!);
          if (resource) {
            await storage.updateResource(resource.id, {
              quantity: resource.quantity + material.amount
            });
          } else {
            await storage.createResource({
              userId: req.session.userId!,
              name: material.name,
              type: 'material',
              quantity: material.amount,
              description: 'A valuable material found in dungeons',
              iconUrl: 'https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=150&h=150&fit=crop'
            });
          }
        }
      }
      
      // Mark run as completed
      await storage.updateDungeonRun(runId, {
        completed: true,
        success,
        battleLog,
        rewards
      });
      
      // Free up the characters
      for (const charId of run.characterIds) {
        await storage.updateCharacter(charId, {
          isActive: false,
          activityType: null,
          activityEndTime: null
        });
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.session.userId!,
        activityType: 'dungeon_completed',
        description: `${success ? 'Successfully' : 'Failed to'} complete dungeon: ${run.dungeonName}`,
        relatedIds: { runId: run.id }
      });
      
      res.json({
        success,
        battleLog,
        rewards
      });
    } catch (error) {
      console.error('Error completing dungeon run:', error);
      res.status(500).json({ message: 'Failed to complete dungeon run' });
    }
  });
  
  // Forge routes
  app.get('/api/forge/tasks', authenticateUser, async (req, res) => {
    try {
      const tasks = await storage.getForgingTasks(req.session.userId!);
      res.json(tasks);
    } catch (error) {
      console.error('Error fetching forging tasks:', error);
      res.status(500).json({ message: 'Failed to fetch forging tasks' });
    }
  });
  
  app.post('/api/forge/craft', authenticateUser, async (req, res) => {
    try {
      const taskData = insertForgingTaskSchema.parse({
        ...req.body,
        userId: req.session.userId,
        taskType: 'craft',
        startTime: new Date(),
        completed: false
      });
      
      // Verify user has the required materials
      if (taskData.requiredMaterials) {
        for (const [materialName, amount] of Object.entries(taskData.requiredMaterials)) {
          const resource = await storage.getResourceByNameAndUserId(materialName, req.session.userId!);
          if (!resource || resource.quantity < amount) {
            return res.status(400).json({
              message: `Insufficient ${materialName} for crafting`
            });
          }
          
          // Subtract materials
          await storage.updateResource(resource.id, {
            quantity: resource.quantity - amount
          });
        }
      }
      
      const task = await storage.createForgingTask(taskData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.session.userId!,
        activityType: 'aura_crafting_started',
        description: `Started crafting a ${taskData.targetElement} Aura`,
        relatedIds: { taskId: task.id }
      });
      
      res.status(201).json(task);
    } catch (error) {
      handleErrors(error, req, res, () => {});
    }
  });
  
  app.post('/api/forge/fusion', authenticateUser, async (req, res) => {
    try {
      const { primaryAuraId, secondaryAuraId } = req.body;
      
      // Check if auras exist and belong to the user
      const primaryAura = await storage.getAuraById(primaryAuraId);
      const secondaryAura = await storage.getAuraById(secondaryAuraId);
      
      if (!primaryAura || !secondaryAura) {
        return res.status(404).json({ message: 'One or both auras not found' });
      }
      
      if (primaryAura.userId !== req.session.userId || secondaryAura.userId !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to use these auras' });
      }
      
      if (primaryAura.isFusing || secondaryAura.isFusing) {
        return res.status(400).json({ message: 'One or both auras are already in fusion' });
      }
      
      // Mark auras as fusing
      const fusionEndTime = new Date(Date.now() + 60 * 1000); // 1 minute for demo
      await storage.updateAura(primaryAuraId, {
        isFusing: true,
        fusionEndTime
      });
      
      await storage.updateAura(secondaryAuraId, {
        isFusing: true,
        fusionEndTime
      });
      
      // Create fusion task
      const taskData = {
        userId: req.session.userId!,
        taskType: 'fusion',
        primaryAuraId,
        secondaryAuraId,
        startTime: new Date(),
        endTime: fusionEndTime,
        completed: false
      };
      
      const task = await storage.createForgingTask(taskData);
      
      // Log activity
      await storage.createActivityLog({
        userId: req.session.userId!,
        activityType: 'aura_fusion_started',
        description: `Started fusing ${primaryAura.name} with ${secondaryAura.name}`,
        relatedIds: { taskId: task.id, auraIds: [primaryAuraId, secondaryAuraId] }
      });
      
      res.status(201).json(task);
    } catch (error) {
      console.error('Error starting fusion:', error);
      res.status(500).json({ message: 'Failed to start fusion process' });
    }
  });
  
  app.post('/api/forge/complete/:id', authenticateUser, async (req, res) => {
    try {
      const taskId = parseInt(req.params.id);
      const task = await storage.getForgingTaskById(taskId);
      
      if (!task) {
        return res.status(404).json({ message: 'Forging task not found' });
      }
      
      if (task.userId !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to access this task' });
      }
      
      if (task.completed) {
        return res.status(400).json({ message: 'Task already completed' });
      }
      
      // Different logic based on task type
      if (task.taskType === 'craft') {
        // Create new aura
        const newAura = await storage.createAura({
          userId: req.session.userId!,
          name: `${task.targetElement} Aura`,
          level: 1,
          element: task.targetElement!,
          rarity: task.targetRarity!,
          tier: 1,
          statMultipliers: {
            attack: Math.random() * 0.2 + 1.1,
            defense: Math.random() * 0.2 + 1.1,
            health: Math.random() * 0.2 + 1.1
          },
          skills: []
        });
        
        // Update task
        await storage.updateForgingTask(taskId, {
          completed: true,
          resultAuraId: newAura.id
        });
        
        // Log activity
        await storage.createActivityLog({
          userId: req.session.userId!,
          activityType: 'aura_crafted',
          description: `Crafted a new ${newAura.element} Aura (Level ${newAura.level})`,
          relatedIds: { auraId: newAura.id }
        });
        
        return res.json({
          success: true,
          aura: newAura
        });
      } else if (task.taskType === 'fusion') {
        // Get auras
        const primaryAura = await storage.getAuraById(task.primaryAuraId!);
        const secondaryAura = await storage.getAuraById(task.secondaryAuraId!);
        
        if (!primaryAura || !secondaryAura) {
          return res.status(404).json({ message: 'One or both fusion auras not found' });
        }
        
        // Create upgraded aura (level + 1)
        const newLevel = Math.min(primaryAura.level + 1, 5);
        const resultAura = await storage.createAura({
          userId: req.session.userId!,
          name: `Enhanced ${primaryAura.element} Aura`,
          level: newLevel,
          element: primaryAura.element,
          rarity: primaryAura.rarity,
          tier: primaryAura.tier,
          statMultipliers: {
            attack: primaryAura.statMultipliers.attack * 1.2,
            defense: primaryAura.statMultipliers.defense * 1.2,
            health: primaryAura.statMultipliers.health * 1.2
          },
          skills: [...(primaryAura.skills || [])]
        });
        
        // 30% chance to transfer a skill from secondary aura
        if (secondaryAura.skills && secondaryAura.skills.length > 0 && Math.random() < 0.3) {
          const randomSkill = secondaryAura.skills[Math.floor(Math.random() * secondaryAura.skills.length)];
          resultAura.skills = [...resultAura.skills, randomSkill];
          await storage.updateAura(resultAura.id, { skills: resultAura.skills });
        }
        
        // Delete source auras
        await storage.deleteAura(primaryAura.id);
        await storage.deleteAura(secondaryAura.id);
        
        // Update task
        await storage.updateForgingTask(taskId, {
          completed: true,
          resultAuraId: resultAura.id
        });
        
        // Log activity
        await storage.createActivityLog({
          userId: req.session.userId!,
          activityType: 'aura_fusion_completed',
          description: `Fused auras to create enhanced Level ${resultAura.level} ${resultAura.element} Aura`,
          relatedIds: { auraId: resultAura.id }
        });
        
        return res.json({
          success: true,
          aura: resultAura
        });
      } else {
        return res.status(400).json({ message: 'Unknown task type' });
      }
    } catch (error) {
      console.error('Error completing forging task:', error);
      res.status(500).json({ message: 'Failed to complete forging task' });
    }
  });
  
  // Black Market routes
  app.get('/api/blackmarket/listings', authenticateUser, async (req, res) => {
    try {
      // Get all listings (for MVP, we'll only show system listings)
      const listings = await storage.getBlackMarketListings();
      res.json(listings);
    } catch (error) {
      console.error('Error fetching market listings:', error);
      res.status(500).json({ message: 'Failed to fetch market listings' });
    }
  });
  
  app.post('/api/blackmarket/buy/:id', authenticateUser, async (req, res) => {
    try {
      const listingId = parseInt(req.params.id);
      const listing = await storage.getBlackMarketListingById(listingId);
      
      if (!listing) {
        return res.status(404).json({ message: 'Listing not found' });
      }
      
      if (listing.sold) {
        return res.status(400).json({ message: 'Item already sold' });
      }
      
      // Check if user has enough currency
      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      if (listing.currencyType === 'forgeTokens' && user.forgeTokens < listing.price) {
        return res.status(400).json({ message: 'Not enough Forge Tokens' });
      }
      
      if (listing.currencyType === 'rogueCredits' && user.rogueCredits < listing.price) {
        return res.status(400).json({ message: 'Not enough Rogue Credits' });
      }
      
      // Deduct currency
      if (listing.currencyType === 'forgeTokens') {
        await storage.updateUser(user.id, {
          forgeTokens: user.forgeTokens - listing.price
        });
      } else {
        await storage.updateUser(user.id, {
          rogueCredits: user.rogueCredits - listing.price
        });
      }
      
      // Mark as sold
      await storage.updateBlackMarketListing(listingId, { sold: true });
      
      // Transfer the item to the user
      let purchasedItem;
      if (listing.itemType === 'character') {
        // Get character details (for MVP, generate a new character)
        purchasedItem = await storage.createCharacter({
          userId: user.id,
          name: `Market Hero ${Math.floor(Math.random() * 1000)}`,
          class: ['Warrior', 'Mage', 'Rogue', 'Cleric'][Math.floor(Math.random() * 4)],
          rarity: ['common', 'rare', 'epic'][Math.floor(Math.random() * 3)],
          level: Math.floor(Math.random() * 5) + 1,
          avatarUrl: [
            'https://images.unsplash.com/photo-1577095972620-2f389ca3abcd?w=150&h=150&fit=crop',
            'https://images.unsplash.com/photo-1613477564751-fc2a7c5bbb7a?w=150&h=150&fit=crop',
            'https://images.unsplash.com/photo-1578336134673-1eef9c8c5e36?w=150&h=150&fit=crop'
          ][Math.floor(Math.random() * 3)],
          attack: Math.floor(Math.random() * 10) + 10,
          defense: Math.floor(Math.random() * 10) + 10,
          health: Math.floor(Math.random() * 50) + 100,
          speed: Math.floor(Math.random() * 10) + 10,
          vitality: Math.floor(Math.random() * 10) + 10,
          intelligence: Math.floor(Math.random() * 10) + 10,
          luck: Math.floor(Math.random() * 10) + 10
        });
      } else if (listing.itemType === 'aura') {
        // Create a new aura
        purchasedItem = await storage.createAura({
          userId: user.id,
          name: `Market Aura ${Math.floor(Math.random() * 1000)}`,
          level: Math.floor(Math.random() * 3) + 1,
          element: ['fire', 'water', 'earth', 'air'][Math.floor(Math.random() * 4)],
          rarity: ['common', 'rare', 'epic'][Math.floor(Math.random() * 3)],
          tier: 1,
          statMultipliers: {
            attack: Math.random() * 0.3 + 1.1,
            defense: Math.random() * 0.3 + 1.1,
            health: Math.random() * 0.3 + 1.1
          },
          skills: []
        });
      } else if (listing.itemType === 'resource') {
        // Add resources to inventory
        const resourceName = ['Celestial Ore', 'Moonsilver', 'Dragon Scale', 'Phoenix Feather'][Math.floor(Math.random() * 4)];
        const quantity = Math.floor(Math.random() * 41) + 10;
        
        const existingResource = await storage.getResourceByNameAndUserId(resourceName, user.id);
        if (existingResource) {
          purchasedItem = await storage.updateResource(existingResource.id, {
            quantity: existingResource.quantity + quantity
          });
        } else {
          purchasedItem = await storage.createResource({
            userId: user.id,
            name: resourceName,
            type: 'material',
            quantity: quantity,
            description: 'A valuable material from the Black Market',
            iconUrl: 'https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=150&h=150&fit=crop'
          });
        }
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.session.userId!,
        activityType: 'item_purchased',
        description: `Purchased ${listing.itemType} from the Black Market for ${listing.price} ${listing.currencyType}`,
        relatedIds: { listingId: listing.id }
      });
      
      res.json({
        success: true,
        item: purchasedItem
      });
    } catch (error) {
      console.error('Error purchasing item:', error);
      res.status(500).json({ message: 'Failed to purchase item' });
    }
  });
  
  // Bounty Board routes
  app.get('/api/bounty/quests', authenticateUser, async (req, res) => {
    try {
      const quests = await storage.getBountyQuests(req.session.userId!);
      res.json(quests);
    } catch (error) {
      console.error('Error fetching bounty quests:', error);
      res.status(500).json({ message: 'Failed to fetch bounty quests' });
    }
  });
  
  // Buildings routes
  app.get('/api/buildings', authenticateUser, async (req, res) => {
    try {
      const buildings = await storage.getBuildingUpgrades(req.session.userId!);
      res.json(buildings);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      res.status(500).json({ message: 'Failed to fetch buildings' });
    }
  });
  
  // Activity log routes
  app.get('/api/activity', authenticateUser, async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
      const logs = await storage.getActivityLogs(req.session.userId!, limit);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ message: 'Failed to fetch activity logs' });
    }
  });
  
  // Add error handling middleware
  app.use(handleErrors);
  
  return httpServer;
}

// Helper function to generate mock battle log
function generateMockBattleLog(run: any, success: boolean) {
  const rounds = Math.floor(Math.random() * 4) + 3; // 3-6 rounds
  const log = [];
  
  for (let i = 1; i <= rounds; i++) {
    const roundActions = [];
    
    // Player character actions
    for (const charId of run.characterIds) {
      const damage = Math.floor(Math.random() * 50) + 20;
      roundActions.push({
        actor: `Character ${charId}`,
        target: `Enemy ${Math.floor(Math.random() * 3) + 1}`,
        action: 'attack',
        damage: damage,
        isCritical: Math.random() < 0.2
      });
    }
    
    // Enemy actions
    for (let j = 1; j <= 3; j++) {
      if (Math.random() < 0.8) { // 80% chance to attack
        const damage = Math.floor(Math.random() * 30) + 10;
        roundActions.push({
          actor: `Enemy ${j}`,
          target: `Character ${run.characterIds[Math.floor(Math.random() * run.characterIds.length)]}`,
          action: 'attack',
          damage: damage,
          isCritical: Math.random() < 0.1
        });
      }
    }
    
    log.push({
      round: i,
      actions: roundActions
    });
  }
  
  // Final round with outcome
  log.push({
    round: rounds + 1,
    outcome: success ? 'victory' : 'defeat',
    summary: success ? 
      'Your party defeats all enemies and claims the dungeon rewards!' : 
      'Your party is overwhelmed by the enemies and must retreat.'
  });
  
  return log;
}
