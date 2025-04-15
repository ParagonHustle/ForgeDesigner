import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { townhallSkillTree, hasBuildingPlans, consumeBuildingPlan } from './townhallSkills';
import { generateBattleLog } from './battle-system';
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

// Global speed boost settings for faster gameplay
const SPEED_BOOST_ACTIVE = true;
const SPEED_BOOST_MULTIPLIER = 10; // 10x speed

// Helper function to apply speed boost to durations
function applySpeedBoost(durationMs: number): number {
  if (SPEED_BOOST_ACTIVE) {
    return Math.floor(durationMs / SPEED_BOOST_MULTIPLIER);
  }
  return durationMs;
}

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
  
  // Direct login route for development
  app.get('/api/auth/dev-login', async (req, res) => {
    try {
      console.log('Starting dev login process');
      
      // Define a default dev user
      const devUserId = 'dev123456';
      
      let user;
      
      // First try to find an existing user
      try {
        user = await storage.getUserByDiscordId(devUserId);
        console.log('User exists check result:', user ? 'Found existing user' : 'No user found, creating new one');
      } catch (findError) {
        console.error('Error checking for existing user:', findError);
        user = null;
      }
      
      if (!user) {
        try {
          // Create new dev user with fixed details
          const mockUser = {
            discordId: devUserId,
            username: 'DevUser',
            avatarUrl: 'https://cdn.pixabay.com/photo/2021/03/02/12/03/avatar-6062252_1280.png',
            roles: ['member'],
            forgeTokens: 5000,
            rogueCredits: 2000,
            soulShards: 25,
            lastLogin: new Date(),
            isAdmin: true
          };
          
          // Create new dev user
          user = await storage.createUser(mockUser);
          console.log('Created new dev user with ID:', user.id);
          
          // Create initial resources
          await storage.createResource({
            userId: user.id,
            name: 'Celestial Ore',
            type: 'material',
            quantity: 100,
            description: 'A rare material used in crafting Auras',
            iconUrl: 'https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=150&h=150&fit=crop'
          });
          
          // Add more starter resources
          await storage.createResource({
            userId: user.id,
            name: 'Abyssal Pearl',
            type: 'material',
            quantity: 50,
            description: 'A rare material from the ocean depths',
            iconUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=150&h=150&fit=crop'
          });
          
          // Create a starter character
          await storage.createCharacter({
            userId: user.id,
            name: 'Dragonslayer',
            class: 'Warrior',
            level: 15,
            attack: 25,
            defense: 30,
            vitality: 150,
            speed: 20,
            focus: 15,
            accuracy: 22,
            resilience: 28,
            avatarUrl: 'https://images.unsplash.com/photo-1580519542036-c47de6d5f458?w=250&h=250&fit=crop'
          });
          
          console.log('Created initial resources and starter character');
        } catch (createError) {
          console.error('Error creating dev user or starter content:', createError);
          return res.status(500).json({ 
            message: 'Dev login failed - Could not create user', 
            error: String(createError) 
          });
        }
      } else {
        console.log('Using existing dev user with ID:', user.id);
        
        // Update login time
        try {
          user = await storage.updateUser(user.id, { lastLogin: new Date() });
          console.log('Updated user login time');
        } catch (updateError) {
          console.error('Failed to update login time:', updateError);
          // Continue anyway as this is not critical
        }
      }
      
      if (!user || !user.id) {
        throw new Error('Failed to get a valid user object');
      }
      
      // Set session
      req.session.userId = user.id;
      console.log('Set session userId to:', user.id);
      
      // Redirect to client
      res.redirect('/?dev=true');
    } catch (error) {
      console.error('Dev login error:', error);
      res.status(500).json({ 
        message: 'Dev login failed', 
        error: error instanceof Error ? error.message : String(error)
      });
    }
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
      
      console.log('In Discord callback route with mock user:', mockDiscordUser);
      
      // Declare the user variable outside the try/catch block so it's accessible throughout the function
      let userData = null;
      
      try {
        // Check if user exists
        userData = await storage.getUserByDiscordId(mockDiscordUser.id);
        console.log('Retrieved user from database:', userData ? 'User found' : 'User not found');
        
        if (!userData) {
          // Create new user
          console.log('Creating new user');
          userData = await storage.createUser({
            discordId: mockDiscordUser.id,
            username: mockDiscordUser.username,
            avatarUrl: mockDiscordUser.avatar,
            roles: mockDiscordUser.roles,
            forgeTokens: 6200,
            rogueCredits: 2450,
            soulShards: 34,
            lastLogin: new Date(),
            isAdmin: false // Explicitly set isAdmin field for new users
          });
          console.log('New user created with ID:', userData.id);
          
          // Create initial resources for new user
          await storage.createResource({
            userId: userData.id,
            name: 'Celestial Ore',
            type: 'material',
            quantity: 156,
            description: 'A rare material used in crafting Auras',
            iconUrl: 'https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=150&h=150&fit=crop'
          });
          console.log('Initial resources created for new user');
        } else {
          // Update existing user's login time
          console.log('Updating existing user login time, ID:', userData.id);
          userData = await storage.updateUser(userData.id, { lastLogin: new Date() });
        }
      } catch (dbError) {
        console.error('Database error during user lookup/creation:', dbError);
        // Create a temporary user to continue with the auth flow for debugging
        const tempUser = {
          id: 1,
          discordId: mockDiscordUser.id,
          username: mockDiscordUser.username,
          avatarUrl: mockDiscordUser.avatar,
          roles: mockDiscordUser.roles,
          lastLogin: new Date(),
          forgeTokens: 1000,
          rogueCredits: 500,
          soulShards: 10,
          isAdmin: true
        };
        console.log('Created temporary user for debugging:', tempUser);
        
        // Set session with temp user
        req.session.userId = tempUser.id;
        return res.redirect('/?debug=true');
      }
      
      // If we get here, we should check the userData object
      if (!userData || !userData.id) {
        return res.status(500).json({ message: 'Failed to create or retrieve user' });
      }
      
      // Set session
      req.session.userId = userData.id;
      console.log('Setting session userId to:', userData.id);
      
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
  
  // Character level-up route
  app.post('/api/characters/:id/level-up', authenticateUser, async (req, res) => {
    try {
      const characterId = parseInt(req.params.id);
      const { levelIncrease = 1 } = req.body;
      
      // Get the character
      const character = await storage.getCharacterById(characterId);
      
      if (!character) {
        return res.status(404).json({ message: 'Character not found' });
      }
      
      if (character.userId !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to level up this character' });
      }
      
      // Calculate new level
      const currentLevel = character.level || 1;
      const newLevel = currentLevel + levelIncrease;
      
      // Update character level and stats
      const updatedCharacter = await storage.updateCharacter(characterId, {
        level: newLevel,
        // Increase stats proportionally (approximately 3-5% per level)
        attack: Math.floor((character.attack || 10) * (1 + 0.04 * levelIncrease)),
        defense: Math.floor((character.defense || 10) * (1 + 0.04 * levelIncrease)),
        vitality: Math.floor((character.vitality || 100) * (1 + 0.03 * levelIncrease)),
        speed: Math.floor((character.speed || 10) * (1 + 0.05 * levelIncrease)),
        focus: Math.floor((character.focus || 10) * (1 + 0.04 * levelIncrease)),
        accuracy: Math.floor((character.accuracy || 10) * (1 + 0.03 * levelIncrease)),
        resilience: Math.floor((character.resilience || 10) * (1 + 0.03 * levelIncrease))
      });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.session.userId!,
        activityType: 'character_leveled',
        description: `${character.name} reached level ${newLevel}`,
        relatedIds: { characterId }
      });
      
      res.json(updatedCharacter);
    } catch (error) {
      console.error('Error leveling up character:', error);
      res.status(500).json({ message: 'Failed to level up character' });
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
  
  app.get('/api/auras/:id', authenticateUser, async (req, res) => {
    try {
      const auraId = parseInt(req.params.id);
      const aura = await storage.getAuraById(auraId);
      
      if (!aura) {
        return res.status(404).json({ message: 'Aura not found' });
      }
      
      if (aura.userId !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to access this aura' });
      }
      
      res.json(aura);
    } catch (error) {
      console.error('Error fetching aura:', error);
      res.status(500).json({ message: 'Failed to fetch aura' });
    }
  });
  
  // Equip Aura to Character endpoint
  app.post('/api/characters/:characterId/equip-aura/:auraId', authenticateUser, async (req, res) => {
    try {
      const characterId = parseInt(req.params.characterId);
      const auraId = parseInt(req.params.auraId);
      
      // Check if character and aura exist and belong to the user
      const character = await storage.getCharacterById(characterId);
      const aura = await storage.getAuraById(auraId);
      
      if (!character || !aura) {
        return res.status(404).json({ message: 'Character or Aura not found' });
      }
      
      if (character.userId !== req.session.userId || aura.userId !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to use this character or aura' });
      }
      
      if (character.isActive) {
        return res.status(400).json({ message: 'Cannot equip aura to an active character' });
      }
      
      if (aura.isFusing) {
        return res.status(400).json({ message: 'Cannot equip an aura that is currently fusing' });
      }
      
      if (aura.equippedByCharacterId) {
        return res.status(400).json({ message: 'Aura is already equipped by another character' });
      }
      
      // If character already has an aura, unequip it first
      if (character.equippedAuraId) {
        const oldAura = await storage.getAuraById(character.equippedAuraId);
        if (oldAura) {
          await storage.updateAura(oldAura.id, { equippedByCharacterId: null });
        }
      }
      
      // Update character with new aura
      await storage.updateCharacter(characterId, { equippedAuraId: auraId });
      
      // Update aura with character reference
      await storage.updateAura(auraId, { equippedByCharacterId: characterId });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.session.userId!,
        activityType: 'aura_equipped',
        description: `Equipped ${aura.name} to ${character.name}`,
        relatedIds: { characterId, auraId }
      });
      
      res.json({ success: true, message: 'Aura equipped successfully' });
    } catch (error) {
      console.error('Error equipping aura:', error);
      res.status(500).json({ message: 'Failed to equip aura' });
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
  
  // Update resource - administrative endpoint
  app.post('/api/resources/update', authenticateUser, async (req, res) => {
    try {
      const { resourceName, amount } = req.body;
      
      if (!resourceName || typeof amount !== 'number') {
        return res.status(400).json({ message: 'Resource name and amount are required' });
      }
      
      // Find the resource
      let resource = await storage.getResourceByNameAndUserId(resourceName, req.session.userId!);
      
      // If resource doesn't exist, create it
      if (!resource) {
        resource = await storage.createResource({
          userId: req.session.userId!,
          name: resourceName,
          description: `${resourceName} resource`,
          quantity: amount,
          type: 'material'
        });
      } else {
        // Update existing resource
        resource = await storage.updateResource(resource.id, {
          quantity: resource.quantity + amount
        });
      }
      
      res.json(resource);
    } catch (error) {
      console.error('Error updating resource:', error);
      res.status(500).json({ message: 'Failed to update resource' });
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
      console.log('Farming task request body:', JSON.stringify(req.body));
      
      // If endTime is provided as an ISO string, convert it to Date
      let processedBody = {...req.body};
      if (typeof processedBody.endTime === 'string') {
        try {
          processedBody.endTime = new Date(processedBody.endTime);
          console.log('Converted farming endTime to Date object');
        } catch (e) {
          console.error('Failed to convert farming endTime string to Date:', e);
        }
      }
      
      // Apply speed boost to farming task duration
      if (processedBody.endTime) {
        const farmStartTime = new Date();
        const farmDuration = new Date(processedBody.endTime).getTime() - farmStartTime.getTime();
        const boostedDuration = applySpeedBoost(farmDuration);
        const boostedEndTime = new Date(farmStartTime.getTime() + boostedDuration);
        console.log(`Applied speed boost: Original farm duration ${farmDuration}ms, boosted ${boostedDuration}ms`);
        processedBody.endTime = boostedEndTime;
      }
      
      const taskData = insertFarmingTaskSchema.parse({
        ...processedBody,
        userId: req.session.userId
      });
      
      console.log('Parsed farming task data:', JSON.stringify(taskData));
      
      // Check if character is available
      const character = await storage.getCharacterById(taskData.characterId);
      if (!character) {
        return res.status(404).json({ message: 'Character not found' });
      }
      
      if (character.isActive) {
        return res.status(400).json({ message: 'Character is already active in another task' });
      }
      
      // Characters must have an aura equipped to start farming
      if (!character.equippedAuraId) {
        return res.status(400).json({ message: 'Character must have an aura equipped to start farming' });
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
      
      console.log('Farming task created successfully:', task.id);
      res.status(201).json(task);
    } catch (error) {
      console.error('Error starting farming task:', error);
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
  app.get('/api/dungeons/types', authenticateUser, async (req, res) => {
    try {
      let dungeonTypes;
      const { element, difficulty } = req.query;
      
      if (element) {
        dungeonTypes = await storage.getDungeonTypesByElement(element as string);
      } else if (difficulty) {
        dungeonTypes = await storage.getDungeonTypesByDifficulty(difficulty as string);
      } else {
        dungeonTypes = await storage.getDungeonTypes();
      }
      
      res.json(dungeonTypes);
    } catch (error) {
      console.error('Error fetching dungeon types:', error);
      res.status(500).json({ message: 'Failed to fetch dungeon types' });
    }
  });

  app.get('/api/dungeons/types/:id', authenticateUser, async (req, res) => {
    try {
      const dungeonType = await storage.getDungeonTypeById(parseInt(req.params.id));
      
      if (!dungeonType) {
        return res.status(404).json({ message: 'Dungeon type not found' });
      }
      
      res.json(dungeonType);
    } catch (error) {
      console.error('Error fetching dungeon type:', error);
      res.status(500).json({ message: 'Failed to fetch dungeon type' });
    }
  });
  
  app.post('/api/dungeons/types', authenticateUser, async (req, res) => {
    try {
      // Only admins can create dungeon types
      const user = await storage.getUserById(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Unauthorized to create dungeon types' });
      }
      
      const dungeonType = await storage.createDungeonType(req.body);
      res.status(201).json(dungeonType);
    } catch (error) {
      console.error('Error creating dungeon type:', error);
      res.status(500).json({ message: 'Failed to create dungeon type' });
    }
  });
  
  app.patch('/api/dungeons/types/:id', authenticateUser, async (req, res) => {
    try {
      // Only admins can update dungeon types
      const user = await storage.getUserById(req.session.userId!);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: 'Unauthorized to update dungeon types' });
      }
      
      const dungeonType = await storage.updateDungeonType(parseInt(req.params.id), req.body);
      
      if (!dungeonType) {
        return res.status(404).json({ message: 'Dungeon type not found' });
      }
      
      res.json(dungeonType);
    } catch (error) {
      console.error('Error updating dungeon type:', error);
      res.status(500).json({ message: 'Failed to update dungeon type' });
    }
  });

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
      // Convert the endTime string to a Date object if it's a string
      let endTimeData = req.body.endTime;
      if (typeof endTimeData === 'string') {
        endTimeData = new Date(endTimeData);
        console.log('Converted dungeon endTime to Date object');
      }
      
      // Apply speed boost to dungeon run time if needed
      // We need to preserve the original end time from client but boost it server-side
      const dungeonEndTime = new Date();
      const duration = new Date(endTimeData).getTime() - dungeonEndTime.getTime();
      const boostedDuration = applySpeedBoost(duration);
      const boostedEndTime = new Date(dungeonEndTime.getTime() + boostedDuration);
      console.log(`Applied speed boost: Original duration ${duration}ms, boosted ${boostedDuration}ms`);
      endTimeData = boostedEndTime;
      
      const runData = insertDungeonRunSchema.parse({
        ...req.body,
        userId: req.session.userId,
        startTime: new Date(),
        endTime: endTimeData,
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
        
        // Check if character has an aura equipped
        if (!character.equippedAuraId) {
          return res.status(400).json({ 
            message: `Character ${character.name} must have an aura equipped to enter dungeons` 
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
      
      // Generate battle log using proper battle system with character ID preprocessing
      const battleLog = await processBattleLog(run, success);
      
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
      console.log('Forge craft request body:', JSON.stringify(req.body));
      
      // Validate character selection
      const characterId = req.body.characterId;
      if (!characterId) {
        return res.status(400).json({ message: 'Character ID is required for crafting' });
      }
      
      // Check if character exists and belongs to the user
      const character = await storage.getCharacterById(characterId);
      if (!character || character.userId !== req.session.userId) {
        return res.status(404).json({ message: 'Character not found or not owned by you' });
      }
      
      // Check if character is available (not assigned to another task)
      const activeCharacterTasks = await storage.getActiveCharacterTasks(characterId);
      if (activeCharacterTasks.length > 0) {
        return res.status(400).json({ message: 'Character is already assigned to another task' });
      }
      
      // If endTime is provided as an ISO string, convert it to Date
      let processedBody = {...req.body};
      if (typeof processedBody.endTime === 'string') {
        try {
          processedBody.endTime = new Date(processedBody.endTime);
          console.log('Converted endTime to Date object');
        } catch (e) {
          console.error('Failed to convert endTime string to Date:', e);
        }
      }
      
      // Apply speed boost to crafting duration
      if (processedBody.endTime) {
        const craftStartTime = new Date();
        const craftDuration = new Date(processedBody.endTime).getTime() - craftStartTime.getTime();
        const boostedDuration = applySpeedBoost(craftDuration);
        const boostedEndTime = new Date(craftStartTime.getTime() + boostedDuration);
        console.log(`Applied speed boost: Original craft duration ${craftDuration}ms, boosted ${boostedDuration}ms`);
        processedBody.endTime = boostedEndTime;
      }
      
      const taskData = insertForgingTaskSchema.parse({
        ...processedBody,
        userId: req.session.userId,
        taskType: 'craft',
        startTime: new Date(),
        completed: false
      });
      
      console.log('Parsed task data:', JSON.stringify(taskData));
      
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
      
      console.log('Forge task created successfully:', task.id);
      res.status(201).json(task);
    } catch (error) {
      console.error('Error in forge/craft endpoint:', error);
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
      const fusionDuration = 60 * 1000; // 1 minute for demo
      const fusionEndTime = new Date(Date.now() + applySpeedBoost(fusionDuration)); // Apply speed boost
      await storage.updateAura(primaryAuraId, {
        isFusing: true,
        fusionEndTime
      });
      
      await storage.updateAura(secondaryAuraId, {
        isFusing: true,
        fusionEndTime
      });
      
      // Create fusion task
      const characterId = req.body.characterId;
      if (!characterId) {
        return res.status(400).json({ message: 'Character ID is required for fusion' });
      }
      
      // Check if character exists and belongs to the user
      const character = await storage.getCharacterById(characterId);
      if (!character || character.userId !== req.session.userId) {
        return res.status(404).json({ message: 'Character not found or not owned by you' });
      }
      
      // Check if character is available (not assigned to another task)
      const activeCharacterTasks = await storage.getActiveCharacterTasks(characterId);
      if (activeCharacterTasks.length > 0) {
        return res.status(400).json({ message: 'Character is already assigned to another task' });
      }
      
      const taskData = {
        userId: req.session.userId!,
        characterId: characterId,
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
        // Create new aura with stat bonuses ranging from -10% to +10%
        // Generate a value between -10 and +10 for each stat
        const generateStatBonus = () => Math.floor(Math.random() * 21) - 10; // -10 to +10
        
        // Default element if not specified (fire, water, earth, wind)
        const elementType = task.targetElement || ['fire', 'water', 'earth', 'wind'][Math.floor(Math.random() * 4)];
        
        // Get aura name based on element
        let auraName = '';
        switch(elementType) {
          case 'fire': 
            auraName = 'Inferno\'s Embrace';
            break;
          case 'water': 
            auraName = 'Ocean\'s Mercy';
            break;
          case 'earth': 
            auraName = 'Stoneguard\'s Pact';
            break;
          case 'wind': 
            auraName = 'Zephyr\'s Whisper';
            break;
          default:
            auraName = `${elementType.charAt(0).toUpperCase() + elementType.slice(1)} Aura`;
        }
        
        // Generate skills for the aura based on element
        // 50% chance of getting either basic skill for the element
        const skills = [];
        
        // Define the basic skills for each element
        const elementSkills = {
          fire: [
            {
              name: "Ember",
              type: "Basic",
              description: "A focused burst of flame latches onto the target, searing over time.",
              damage: 1.0,
              level: 1,
              effect: "10% chance to apply 1 Burn Stack for 1 Turn",
              targets: 1
            },
            {
              name: "Wildfire",
              type: "Basic",
              description: "Unpredictable flames leap across the battlefield in violent bursts.",
              damage: 0.8,
              level: 1,
              effect: "10% chance to hit 1 more target",
              targets: "2-3 Random"
            }
          ],
          water: [
            {
              name: "Soothing Current",
              type: "Basic",
              description: "A soft wave crashes through the enemy and flows into an ally.",
              damage: 0.8,
              level: 1,
              healing: 5,
              healTargetType: "lowest",
              logic: "0.8x Damage to 1 Target and Heal the lowest HP Ally for 5% of the Caster's Max Health",
              targets: 1
            },
            {
              name: "Cleansing Tide",
              type: "Basic",
              description: "Water surges over the battlefield, sweeping away ailing effects.",
              damage: 0.7,
              level: 1,
              effect: "10% chance to remove 1 Debuff from a Random Ally",
              targets: 1
            }
          ],
          earth: [
            {
              name: "Stone Slam",
              type: "Basic",
              description: "A hammering blow backed by earth essence dulls the target's edge.",
              damage: 1.0,
              level: 1,
              effect: "20% chance to apply Weakness (-10% Damage Dealt) for 1 Turn",
              targets: 1
            },
            {
              name: "Dust Spikes",
              type: "Basic",
              description: "Fragments of stone erupt from the ground and scatter outward.",
              damage: 0.9,
              level: 1,
              effect: "No special effect at Level 1",
              targets: "2 Random"
            }
          ],
          wind: [
            {
              name: "Gust",
              type: "Basic",
              description: "A sharp burst of wind knocks the enemy off balance.",
              damage: 0.8,
              level: 1,
              effect: "10% chance to apply Minor Slow (Speed -20%) for 1 Turn",
              targets: 1
            },
            {
              name: "Breeze",
              type: "Basic",
              description: "A disruptive current slips beneath the target, breaking their momentum.",
              damage: 0.7,
              level: 1,
              effect: "10% chance to reduce Turn Meter by 10%",
              targets: 1
            }
          ]
        };
        
        // 50% chance to get either skill, but only add ONE skill (not both)
        const skillIndex = Math.random() < 0.5 ? 0 : 1;
        // Use type assertion to handle the element type safely
        const elementTypeSafe = elementType as keyof typeof elementSkills;
        if (elementSkills[elementTypeSafe]) {
          // Only add one skill to the array (replacing any existing skills)
          skills[0] = elementSkills[elementTypeSafe][skillIndex];
        }
        
        const newAura = await storage.createAura({
          userId: req.session.userId!,
          name: auraName,
          level: 1,
          element: elementType,
          tier: 1,
          // Add stat bonuses in the range of -10% to +10%
          attack: generateStatBonus(),
          defense: generateStatBonus(),
          vitality: generateStatBonus(),
          speed: generateStatBonus(),
          focus: generateStatBonus(),
          resilience: generateStatBonus(), 
          accuracy: generateStatBonus(),
          fusionSource: false,
          creatorCharacterId: task.characterId,
          skills: skills
        });
        
        // Update task
        await storage.updateForgingTask(taskId, {
          completed: true,
          resultAuraId: newAura.id
        });
        
        // Free up the character
        if (task.characterId) {
          await storage.updateCharacter(task.characterId, {
            isActive: false,
            activityType: null,
            activityEndTime: null
          });
          
          const character = await storage.getCharacterById(task.characterId);
          if (character) {
            await storage.createActivityLog({
              userId: req.session.userId!,
              activityType: 'character_task_completed',
              description: `${character.name} has completed crafting a new aura`,
              relatedIds: { characterId: character.id, auraId: newAura.id }
            });
          }
        }
        
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
        const newLevel = Math.min(primaryAura.level !== null ? primaryAura.level + 1 : 2, 5);
        
        // Enhance stat bonuses by 1-2 points, capping at +10
        const enhanceStat = (baseStat: number | null) => {
          if (baseStat === null) return Math.floor(Math.random() * 5); // Random 0-4 if null
          
          // Add 1-2 points, but cap at 10
          const enhancement = Math.floor(Math.random() * 2) + 1;
          return Math.min(baseStat + enhancement, 10);
        };
        
        // Apply secondary aura's best stat if it's higher
        const combineBestStat = (primaryStat: number | null, secondaryStat: number | null) => {
          const pStat = primaryStat !== null ? primaryStat : -5;
          const sStat = secondaryStat !== null ? secondaryStat : -5;
          return Math.max(pStat, sStat);
        };
        
        // Get aura name based on element (maintain core aura names)
        let auraName = '';
        switch(primaryAura.element) {
          case 'fire': 
            auraName = 'Inferno\'s Embrace';
            break;
          case 'water': 
            auraName = 'Ocean\'s Mercy';
            break;
          case 'earth': 
            auraName = 'Stoneguard\'s Pact';
            break;
          case 'wind': 
            auraName = 'Zephyr\'s Whisper';
            break;
          default:
            auraName = `Enhanced ${primaryAura.element} Aura`;
        }
        
        // Keep the primary aura's skills (no chance-based upgrades)
        // Just carry over the existing skills
        const processedSkills = [...(primaryAura.skills || [])];
        
        // When fusing to create a Tier 2 aura, add an Advanced skill
        // Check if this will be a Tier 2 aura based on the primary aura's tier and the new level
        if ((primaryAura.tier === 1 || !primaryAura.tier) && newLevel >= 2) {
          // Define advanced skills for each element
          const advancedSkills = {
            fire: [
              {
                name: "Flame Whip",
                type: "Advanced",
                description: "A cracking lash of fire that scorches in a line.",
                damage: 1.2,
                level: 2,
                effect: "25% chance to apply 1 Burn Stack for 2 Turns",
                targets: "2-3 in a row"
              },
              {
                name: "Combustion",
                type: "Advanced",
                description: "Focuses heat into a precise explosion that weakens all defenses.",
                damage: 1.3,
                level: 2,
                effect: "15% chance to apply Defense Down (-20%) for 1 Turn",
                targets: 1
              }
            ],
            water: [
              {
                name: "Tidal Wave",
                type: "Advanced",
                description: "A wall of rushing water crashes over multiple enemies.",
                damage: 1.1,
                level: 2,
                effect: "15% chance to Knockback (reduce Turn Meter by 20%)",
                targets: "2-3 Random"
              },
              {
                name: "Mist Veil",
                type: "Advanced",
                description: "A protective fog envelops allies, protecting them from harm.",
                damage: 0.7,
                level: 2,
                effect: "Apply Shield (10% of Caster's Max HP) to lowest HP Ally",
                targets: 1
              }
            ],
            earth: [
              {
                name: "Fissure",
                type: "Advanced",
                description: "The ground breaks open beneath the enemy, disrupting their stance.",
                damage: 1.3,
                level: 2,
                effect: "35% chance to apply Stagger (miss next turn)",
                targets: 1
              },
              {
                name: "Stone Armor",
                type: "Advanced",
                description: "Layers of rock form a protective coating around the caster.",
                damage: 0.6,
                level: 2,
                effect: "Self buff: Defense Up (+30%) for 2 Turns",
                targets: 1
              }
            ],
            wind: [
              {
                name: "Cyclone",
                type: "Advanced",
                description: "A spinning vortex pulls in multiple enemies and tosses them about.",
                damage: 1.0,
                level: 2,
                effect: "35% chance to apply Confusion (50% chance to attack ally) for 1 Turn",
                targets: "2 Random"
              },
              {
                name: "Tailwind",
                type: "Advanced",
                description: "Favorable winds increase party movement speed.",
                damage: 0.6,
                level: 2,
                effect: "Grant Speed Up (+20%) to all allies for 2 Turns",
                targets: "All Allies"
              }
            ]
          };
          
          // Safely get the element type
          const elementTypeSafe = primaryAura.element as keyof typeof advancedSkills;
          
          // Select a random Advanced skill to add
          if (advancedSkills[elementTypeSafe]) {
            const randomIndex = Math.floor(Math.random() * advancedSkills[elementTypeSafe].length);
            const advancedSkill = advancedSkills[elementTypeSafe][randomIndex];
            
            // Add the Advanced skill if one doesn't already exist
            if (!processedSkills.some(skill => skill.type === "Advanced")) {
              processedSkills.push(advancedSkill);
            }
          }
        }
        
        // When fusing to create a Tier 3 aura, add an Ultimate skill
        if ((primaryAura.tier === 2 || newLevel >= 3) && newLevel >= 3) {
          // Define ultimate skills for each element
          const ultimateSkills = {
            fire: {
              name: "Supernova",
              type: "Ultimate",
              description: "All surrounding matter ignites in a cataclysmic blast of energy.",
              damage: 1.8,
              level: 3,
              effect: "Apply Burn (5% HP damage per turn) to all enemies for 2 Turns",
              targets: "All Enemies"
            },
            water: {
              name: "Abyssal Depths",
              type: "Ultimate",
              description: "The crushing pressure of the deep ocean consumes all enemies.",
              damage: 1.5,
              level: 3,
              effect: "Apply Slow (speed -40%) to all enemies for 2 Turns",
              targets: "All Enemies"
            },
            earth: {
              name: "Tectonic Shift",
              type: "Ultimate",
              description: "The battlefield fractures as massive stone pillars erupt from below.",
              damage: 1.7,
              level: 3,
              effect: "50% chance to Stun each enemy for 1 Turn",
              targets: "All Enemies"
            },
            wind: {
              name: "Hurricane",
              type: "Ultimate",
              description: "A devastating storm tears through the battlefield with unmatched fury.",
              damage: 1.6,
              level: 3,
              effect: "Reduce Turn Meter of all enemies by 30%",
              targets: "All Enemies"
            }
          };
          
          // Safely get the element type
          const elementTypeSafe = primaryAura.element as keyof typeof ultimateSkills;
          
          // Add the Ultimate skill if one doesn't already exist
          if (!processedSkills.some(skill => skill.type === "Ultimate") && 
              ultimateSkills[elementTypeSafe]) {
            processedSkills.push(ultimateSkills[elementTypeSafe]);
          }
        }
        
        const resultAura = await storage.createAura({
          userId: req.session.userId!,
          name: auraName,
          level: newLevel,
          element: primaryAura.element,
          tier: primaryAura.tier !== null ? primaryAura.tier + 1 : 2,
          // Enhance stat bonuses, capping at +10%
          attack: combineBestStat(enhanceStat(primaryAura.attack), secondaryAura.attack),
          defense: combineBestStat(enhanceStat(primaryAura.defense), secondaryAura.defense),
          vitality: combineBestStat(enhanceStat(primaryAura.vitality), secondaryAura.vitality),
          speed: combineBestStat(enhanceStat(primaryAura.speed), secondaryAura.speed),
          focus: combineBestStat(enhanceStat(primaryAura.focus), secondaryAura.focus),
          resilience: combineBestStat(enhanceStat(primaryAura.resilience), secondaryAura.resilience),
          accuracy: combineBestStat(enhanceStat(primaryAura.accuracy), secondaryAura.accuracy),
          // Record fusion source for display in aura details
          fusionSource: true,
          creatorCharacterId: task.characterId,
          skills: processedSkills
        });
        
        // 30% chance to transfer a skill from secondary aura if they're not the same skills
        if (secondaryAura.skills && secondaryAura.skills.length > 0 && Math.random() < 0.3) {
          // Find a skill from the secondary aura that isn't already in the result aura
          const availableSkills = secondaryAura.skills.filter(secondarySkill => 
            !resultAura.skills.some(resultSkill => resultSkill.name === secondarySkill.name)
          );
          
          if (availableSkills.length > 0) {
            const randomSkill = availableSkills[Math.floor(Math.random() * availableSkills.length)];
            resultAura.skills = [...resultAura.skills, randomSkill];
            await storage.updateAura(resultAura.id, { skills: resultAura.skills });
          }
        }
        
        // Delete source auras
        await storage.deleteAura(primaryAura.id);
        await storage.deleteAura(secondaryAura.id);
        
        // Update task
        await storage.updateForgingTask(taskId, {
          completed: true,
          resultAuraId: resultAura.id
        });
        
        // Free up the character
        if (task.characterId) {
          await storage.updateCharacter(task.characterId, {
            isActive: false,
            activityType: null,
            activityEndTime: null
          });
          
          const character = await storage.getCharacterById(task.characterId);
          if (character) {
            await storage.createActivityLog({
              userId: req.session.userId!,
              activityType: 'character_task_completed',
              description: `${character.name} has completed fusing auras to create a stronger one`,
              relatedIds: { characterId: character.id, auraId: resultAura.id }
            });
          }
        }
        
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
      // Get all listings
      let listings = await storage.getBlackMarketListings();
      
      // If no listings exist, create some sample listings
      if (listings.length === 0) {
        const systemId = 0; // System listings created by ID 0
        
        // Helper function to create premium listings (Forge Tokens)
        const createPremiumListing = (type, data, price, featured = false) => ({
          userId: systemId,
          itemType: type,
          itemId: Math.floor(Math.random() * 1000000) + 1, // Generate a placeholder ID
          itemData: data,
          price,
          currencyType: 'forgeTokens',
          sold: false,
          listedAt: new Date(),
          expiresAt: new Date(Date.now() + applySpeedBoost(86400000)), // Apply speed boost
          featured
        });
        
        // Helper function to create standard listings (Rogue Credits)
        const createStandardListing = (type, data, price) => ({
          userId: systemId,
          itemType: type,
          itemId: Math.floor(Math.random() * 1000000) + 1, // Generate a placeholder ID
          itemData: data,
          price,
          currencyType: 'rogueCredits', 
          sold: false,
          listedAt: new Date(),
          expiresAt: new Date(Date.now() + applySpeedBoost(86400000)) // Apply speed boost
        });
        
        // Sample premium character listings (forge tokens)
        const premiumCharacters = [
          createPremiumListing('character', {
            name: 'Shadow Rogue',
            level: 25,
            class: 'Rogue',
            stats: {
              strength: 52,
              agility: 85,
              intelligence: 60,
              vitality: 70
            },
            equippedAuraIds: [],
            passiveSkills: [
              { name: 'Shadowstep', description: 'Can teleport behind enemies once per battle' },
              { name: 'Critical Mastery', description: '15% increased critical hit chance' }
            ]
          }, 750, true),
          
          createPremiumListing('character', {
            name: 'Arcane Scholar',
            level: 20,
            class: 'Mage',
            stats: {
              strength: 30,
              agility: 45,
              intelligence: 90,
              vitality: 55
            },
            equippedAuraIds: [],
            passiveSkills: [
              { name: 'Spell Mastery', description: 'Spells cost 10% less mana' },
              { name: 'Arcane Shield', description: 'Automatically blocks first spell damage in battle' }
            ]
          }, 550)
        ];
        
        // Sample standard character listings (rogue credits)
        const standardCharacters = [
          createStandardListing('character', {
            name: 'Veteran Warrior',
            level: 15,
            class: 'Warrior',
            stats: {
              strength: 70,
              agility: 40,
              intelligence: 30,
              vitality: 65
            },
            equippedAuraIds: [],
            passiveSkills: [
              { name: 'Battle Hardened', description: 'Takes 5% less damage from physical attacks' }
            ]
          }, 2500)
        ];
        
        // Sample premium aura listings
        const premiumAuras = [
          createPremiumListing('aura', {
            name: 'Flame Emperor\'s Might',
            element: 'Fire',
            level: 3,
            attack: 8,
            defense: 6,
            vitality: 7,
            speed: 7,
            focus: 8,
            resilience: 5,
            accuracy: 6,
            skills: [
              { name: 'Inferno', description: 'Deals massive fire damage to all enemies', tier: 'Ultimate' },
              { name: 'Burning Aura', description: 'Enemies take burn damage when attacking the wearer', tier: 'Advanced' },
              { name: 'Fire Resistance', description: '25% resistance to fire damage', tier: 'Basic' }
            ]
          }, 900, true),
          
          createPremiumListing('aura', {
            name: 'Tidal Mastery',
            element: 'Water',
            level: 2,
            attack: 5,
            defense: 7,
            vitality: 6,
            speed: 9,
            focus: 8,
            resilience: 4,
            accuracy: 7,
            skills: [
              { name: 'Healing Tide', description: 'Restores health to all allies', tier: 'Advanced' },
              { name: 'Water Shield', description: 'Creates a barrier that absorbs damage', tier: 'Basic' }
            ]
          }, 600)
        ];
        
        // Sample standard aura listings
        const standardAuras = [
          createStandardListing('aura', {
            name: 'Earthen Protection',
            element: 'Earth',
            level: 1,
            attack: 4,
            defense: 9,
            vitality: 7,
            speed: 3,
            focus: 5,
            resilience: 8,
            accuracy: 4,
            skills: [
              { name: 'Stone Skin', description: 'Reduces physical damage by 10%', tier: 'Basic' }
            ]
          }, 1800)
        ];
        
        // Sample resource listings
        const resources = [
          createPremiumListing('resource', {
            name: 'Celestial Ore',
            type: 'material',
            quantity: 50,
            description: 'Rare material used for crafting high-level auras',
            iconUrl: 'https://images.unsplash.com/photo-1618221118493-9bce6d4b04cd?w=150&h=150&fit=crop'
          }, 300),
          
          createStandardListing('resource', {
            name: 'Aether Crystal',
            type: 'material',
            quantity: 20,
            description: 'Magical crystal that enhances aura crafting success rates',
            iconUrl: 'https://images.unsplash.com/photo-1566792368824-44a7882c53e5?w=150&h=150&fit=crop'
          }, 1200),
          
          createPremiumListing('resource', {
            name: 'Soul Shard Bundle',
            type: 'currency',
            quantity: 10,
            description: 'Bundle of soul shards used for advanced crafting',
            iconUrl: 'https://images.unsplash.com/photo-1518563071562-1e3a85d4523d?w=150&h=150&fit=crop'
          }, 450)
        ];
        
        // Create all the listings
        const allListings = [
          ...premiumCharacters,
          ...standardCharacters,
          ...premiumAuras,
          ...standardAuras,
          ...resources
        ];
        
        for (const listing of allListings) {
          await storage.createBlackMarketListing(listing);
        }
        
        // Fetch the newly created listings
        listings = await storage.getBlackMarketListings();
      }
      
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
      
      // Validate currency for purchase
      if (listing.currencyType === 'forgeTokens') {
        if (user.forgeTokens === null || user.forgeTokens < listing.price) {
          return res.status(400).json({ message: 'Not enough Forge Tokens' });
        }
        // Deduct forge tokens from user
        await storage.updateUser(user.id, {
          forgeTokens: user.forgeTokens - listing.price
        });
      } else if (listing.currencyType === 'rogueCredits') {
        if (user.rogueCredits === null || user.rogueCredits < listing.price) {
          return res.status(400).json({ message: 'Not enough Rogue Credits' });
        }
        // Deduct rogue credits from user
        await storage.updateUser(user.id, {
          rogueCredits: user.rogueCredits - listing.price
        });
      } else {
        return res.status(400).json({ message: 'Invalid currency type' });
      }
      
      // Mark as sold
      await storage.updateBlackMarketListing(listingId, { sold: true });
      
      // Transfer the item to the user
      let purchasedItem;
      if (listing.itemType === 'character') {
        // Get character details (for MVP, generate a new character with passiveSkills)
        purchasedItem = await storage.createCharacter({
          userId: user.id,
          name: `Market Hero ${Math.floor(Math.random() * 1000)}`,
          class: ['Warrior', 'Mage', 'Rogue', 'Cleric'][Math.floor(Math.random() * 4)],
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
          luck: Math.floor(Math.random() * 10) + 10,
          // Add passiveSkills array with random skills based on character class
          passiveSkills: [
            {
              name: ['Strength Boost', 'Quick Reflexes', 'Magical Aptitude', 'Divine Grace'][Math.floor(Math.random() * 4)],
              description: 'A special ability gained through market purchase'
            }
          ]
        });
      } else if (listing.itemType === 'aura') {
        // Create a new aura with stat values
        purchasedItem = await storage.createAura({
          userId: user.id,
          name: `Market Aura ${Math.floor(Math.random() * 1000)}`,
          level: Math.floor(Math.random() * 3) + 1,
          element: ['fire', 'water', 'earth', 'air'][Math.floor(Math.random() * 4)],
          tier: 1,
          // Add individual stat values
          attack: Math.floor(Math.random() * 15) + 5,
          defense: Math.floor(Math.random() * 15) + 5,
          vitality: Math.floor(Math.random() * 15) + 5,
          speed: Math.floor(Math.random() * 15) + 5,
          focus: Math.floor(Math.random() * 15) + 5,
          resilience: Math.floor(Math.random() * 15) + 5,
          accuracy: Math.floor(Math.random() * 15) + 5,
          // Market purchased aura
          fusionSource: false,
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
      let quests = await storage.getBountyQuests(req.session.userId!);
      
      // If no quests are found, create some sample daily and weekly quests
      if (quests.length === 0) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        
        // Get bounty board level to determine quest difficulties
        const bountyBoardUpgrade = await storage.getBuildingUpgradeByTypeAndUserId('bountyBoard', req.session.userId!);
        const bountyBoardLevel = bountyBoardUpgrade?.currentLevel || 1;
        
        // Determine quest availability based on bounty board level
        const canGenerateRare = bountyBoardLevel >= 3;
        const canGenerateEpic = bountyBoardLevel >= 5;
        const canGenerateMythic = bountyBoardLevel >= 7;
        const canGenerateLegendary = bountyBoardLevel >= 10;
        
        // Determine number of daily quests based on bounty board level
        const dailyQuestCount = Math.min(5, Math.floor(1.5 * bountyBoardLevel));
        
        // Base daily quests
        const dailyQuests = [
          {
            userId: req.session.userId!,
            name: "Resource Collector",
            description: "Gather various resources through farming missions",
            questType: "daily",
            difficulty: "Basic",
            requirements: {
              farmingCompleted: { current: 0, target: 3, label: "Complete farming missions" }
            },
            rewards: {
              rogueCredits: 150,
              forgeTokens: 30
            },
            completed: false,
            expiresAt: tomorrow
          }
        ];
        
        // Add Rare quest if available
        if (canGenerateRare) {
          dailyQuests.push({
            userId: req.session.userId!,
            name: "Dungeon Explorer",
            description: "Complete dungeon runs to earn extra rewards",
            questType: "daily",
            difficulty: "Rare",
            requirements: {
              dungeonRuns: { current: 0, target: 2, label: "Complete dungeon runs" }
            },
            rewards: {
              rogueCredits: 250,
              forgeTokens: 50,
              soulShards: 2
            },
            completed: false,
            expiresAt: tomorrow
          });
        }
        
        // Add Epic quest if available
        if (canGenerateEpic) {
          dailyQuests.push({
            userId: req.session.userId!,
            name: "Forge Apprentice",
            description: "Craft or fuse auras at The Forge",
            questType: "daily",
            difficulty: "Epic",
            requirements: {
              craftAuras: { current: 0, target: 1, label: "Craft an aura" }
            },
            rewards: {
              forgeTokens: 80,
              soulShards: 5,
              material: { name: "Celestial Ore", amount: 20 }
            },
            completed: false,
            expiresAt: tomorrow
          });
        }
        
        // Add Mythic quest if available
        if (canGenerateMythic) {
          dailyQuests.push({
            userId: req.session.userId!,
            name: "Elite Dungeon Challenge",
            description: "Conquer the most difficult dungeons",
            questType: "daily",
            difficulty: "Mythic",
            requirements: {
              eliteDungeons: { current: 0, target: 2, label: "Complete elite dungeons" },
              bossDefeats: { current: 0, target: 1, label: "Defeat dungeon boss" }
            },
            rewards: {
              rogueCredits: 500,
              forgeTokens: 100,
              soulShards: 8
            },
            completed: false,
            expiresAt: tomorrow
          });
        }
        
        // Base weekly quests
        const weeklyQuests = [
          {
            userId: req.session.userId!,
            name: "Master Collector",
            description: "Gather a large amount of resources throughout the week",
            questType: "weekly",
            difficulty: canGenerateRare ? "Rare" : "Basic",
            requirements: {
              farmingCompleted: { current: 0, target: 15, label: "Complete farming missions" }
            },
            rewards: {
              rogueCredits: 1000,
              forgeTokens: 200,
              material: { name: "Celestial Ore", amount: 50 }
            },
            completed: false,
            expiresAt: nextWeek
          }
        ];
        
        // Add Epic weekly quest if available
        if (canGenerateEpic) {
          weeklyQuests.push({
            userId: req.session.userId!,
            name: "Dungeon Master",
            description: "Prove your skill by completing multiple challenging dungeons",
            questType: "weekly",
            difficulty: "Epic",
            requirements: {
              dungeonRuns: { current: 0, target: 10, label: "Complete dungeon runs" },
              bossDefeats: { current: 0, target: 3, label: "Defeat dungeon bosses" }
            },
            rewards: {
              rogueCredits: 2000,
              forgeTokens: 350,
              soulShards: 15
            },
            completed: false,
            expiresAt: nextWeek
          });
        }
        
        // Add Legendary weekly quest if available
        if (canGenerateLegendary) {
          weeklyQuests.push({
            userId: req.session.userId!,
            name: "The Ultimate Challenge",
            description: "Only the most dedicated adventurers can complete this quest",
            questType: "weekly",
            difficulty: "Legendary",
            requirements: {
              legendaryDungeons: { current: 0, target: 5, label: "Complete legendary dungeons" },
              legendaryBosses: { current: 0, target: 3, label: "Defeat legendary bosses" },
              craftAuras: { current: 0, target: 5, label: "Craft high-level auras" }
            },
            rewards: {
              rogueCredits: 5000,
              forgeTokens: 1000,
              soulShards: 50,
              material: { name: "Celestial Essence", amount: 100 }
            },
            completed: false,
            expiresAt: nextWeek
          });
        }
        
        // Create all the quests
        for (const quest of [...dailyQuests, ...weeklyQuests]) {
          await storage.createBountyQuest(quest);
        }
        
        // Fetch the newly created quests
        quests = await storage.getBountyQuests(req.session.userId!);
      }
      
      res.json(quests);
    } catch (error) {
      console.error('Error fetching bounty quests:', error);
      res.status(500).json({ message: 'Failed to fetch bounty quests' });
    }
  });
  
  app.post('/api/bounty/quests/:id/claim', authenticateUser, async (req, res) => {
    try {
      const questId = parseInt(req.params.id);
      const quest = await storage.getBountyQuestById(questId);
      
      if (!quest) {
        return res.status(404).json({ message: 'Quest not found' });
      }
      
      if (quest.userId !== req.session.userId) {
        return res.status(403).json({ message: 'Not authorized to access this quest' });
      }
      
      if (quest.completed) {
        return res.status(400).json({ message: 'Quest already claimed' });
      }
      
      // Calculate if the quest is complete
      let isComplete = true;
      if (quest.requirements && typeof quest.requirements === 'object') {
        for (const [key, requirement] of Object.entries(quest.requirements)) {
          if (typeof requirement === 'object' && 'current' in requirement && 'target' in requirement) {
            if (requirement.current < requirement.target) {
              isComplete = false;
              break;
            }
          }
        }
      }
      
      if (!isComplete) {
        return res.status(400).json({ message: 'Quest requirements not met' });
      }
      
      // Mark as completed
      await storage.updateBountyQuest(questId, { completed: true });
      
      // Award rewards
      const user = await storage.getUserById(req.session.userId!);
      if (user && quest.rewards) {
        const updates: Partial<typeof user> = {};
        
        if ('rogueCredits' in quest.rewards && quest.rewards.rogueCredits) {
          updates.rogueCredits = (user.rogueCredits || 0) + quest.rewards.rogueCredits;
        }
        
        if ('forgeTokens' in quest.rewards && quest.rewards.forgeTokens) {
          updates.forgeTokens = (user.forgeTokens || 0) + quest.rewards.forgeTokens;
        }
        
        if ('soulShards' in quest.rewards && quest.rewards.soulShards) {
          updates.soulShards = (user.soulShards || 0) + quest.rewards.soulShards;
        }
        
        if (Object.keys(updates).length > 0) {
          await storage.updateUser(user.id, updates);
        }
        
        // Award material rewards if any
        if ('material' in quest.rewards && quest.rewards.material) {
          const { name, amount } = quest.rewards.material;
          const existingResource = await storage.getResourceByNameAndUserId(name, user.id);
          
          if (existingResource) {
            await storage.updateResource(existingResource.id, {
              quantity: (existingResource.quantity || 0) + amount
            });
          } else {
            await storage.createResource({
              userId: user.id,
              name,
              type: 'material',
              quantity: amount,
              description: `A material obtained from quests`,
              iconUrl: 'https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=150&h=150&fit=crop'
            });
          }
        }
      }
      
      // Log activity
      await storage.createActivityLog({
        userId: req.session.userId!,
        activityType: 'quest_completed',
        description: `Completed quest: ${quest.name}`,
        relatedIds: { questId: quest.id }
      });
      
      res.json({
        success: true,
        message: 'Quest rewards claimed successfully',
        rewards: quest.rewards
      });
    } catch (error) {
      console.error('Error claiming quest rewards:', error);
      res.status(500).json({ message: 'Failed to claim quest rewards' });
    }
  });
  
  // Buildings routes
  app.get('/api/buildings', authenticateUser, async (req, res) => {
    try {
      const buildings = await storage.getBuildingUpgrades(req.session.userId!);
      
      // Define the default building types
      const defaultBuildingTypes = ['townhall', 'forge', 'blackmarket', 'bountyBoard', 'tavern'];
      
      // Check if all default building types exist
      const existingTypes = buildings.map(b => b.buildingType);
      
      // Create missing buildings
      const createdBuildings = [];
      for (const type of defaultBuildingTypes) {
        if (!existingTypes.includes(type)) {
          console.log(`Creating default building for type: ${type}`);
          const newBuilding = await storage.createBuildingUpgrade({
            userId: req.session.userId!,
            buildingType: type,
            currentLevel: 1,
            upgradeInProgress: false,
            unlockedSkills: [],
            availableSkillPoints: 0,
            skillDistribution: {}
          });
          if (newBuilding) {
            createdBuildings.push(newBuilding);
          }
        }
      }
      
      // If any buildings were created, return all buildings including the new ones
      if (createdBuildings.length > 0) {
        const allBuildings = await storage.getBuildingUpgrades(req.session.userId!);
        return res.json(allBuildings);
      }
      
      res.json(buildings);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      res.status(500).json({ message: 'Failed to fetch buildings' });
    }
  });

  // Get building skill tree
  app.get('/api/buildings/skills/:buildingType', authenticateUser, async (req, res) => {
    try {
      const { buildingType } = req.params;
      
      console.log("GET /api/buildings/skills/:buildingType", { buildingType, userId: req.session.userId });
      
      // Get the building
      let building = await storage.getBuildingUpgradeByTypeAndUserId(buildingType, req.session.userId!);
      
      // If building doesn't exist, create a default one
      if (!building) {
        console.log(`Creating default building for type: ${buildingType}`);
        building = await storage.createBuildingUpgrade({
          userId: req.session.userId!,
          buildingType: buildingType,
          currentLevel: 1,
          upgradeInProgress: false,
          unlockedSkills: [],
          availableSkillPoints: 0,
          skillDistribution: {}
        });
        
        if (!building) {
          return res.status(500).json({ message: 'Failed to create building record' });
        }
      }
      
      // Define skill trees for each building type
      const skillTrees = {
        townhall: [
          { id: 'th_slot_1', name: 'Extra Farming Slot', description: 'Unlocks an additional farming slot', maxLevel: 5 },
          { id: 'th_resource_1', name: 'Resource Production', description: 'Increases resource gain by 5% per level', maxLevel: 5 },
          { id: 'th_exp_1', name: 'Experience Boost', description: 'Increases XP gain by 5% per level', maxLevel: 5 },
          { id: 'th_building_1', name: 'Construction Speed', description: 'Reduces building upgrade time by 5% per level', maxLevel: 5 },
        ],
        forge: [
          // Path A: Speed & Efficiency
          { id: 'forge_speed_a', name: 'Crafting Speed', description: 'Increases crafting speed by 3% per level', maxLevel: 10, path: 'a' },
          { id: 'forge_double_a', name: 'Double Forge Chance', description: 'Increases chance to craft twice by 1.5% per level', maxLevel: 10, path: 'a' },
          { id: 'forge_slots_a', name: 'Additional Crafting Slots', description: 'Unlocks crafting slot #2 at level 5, slot #3 at level 10', maxLevel: 10, path: 'a' },
          { id: 'forge_adv_speed_a', name: 'Advanced Crafting Speed', description: 'Further increases crafting speed by 2% per level', maxLevel: 10, path: 'a', requires: { forge_speed_a: 10 } },
          
          // Path B: Quality & Power
          { id: 'forge_quality_b', name: 'Forge Quality', description: 'Increases item quality by 2% per level', maxLevel: 10, path: 'b' },
          { id: 'forge_crit_b', name: 'Forge Critical Chance', description: 'Increases chance for critical crafting by 1% per level', maxLevel: 10, path: 'b' },
          { id: 'forge_slots_b', name: 'Quality Crafting Slot', description: 'Unlocks crafting slot #4 at level 10', maxLevel: 10, path: 'b' },
          { id: 'forge_enh_quality_b', name: 'Enhanced Quality', description: 'Further increases item quality by 1.5% per level', maxLevel: 10, path: 'b', requires: { forge_quality_b: 10 } },
          
          // Path C: Skill Mastery
          { id: 'forge_skill_c', name: 'Skill Boost', description: 'Increases skill boost by 2% per level', maxLevel: 10, path: 'c' },
          { id: 'forge_crit_c', name: 'Skill Critical Chance', description: 'Increases chance for critical skill bonus by 1% per level', maxLevel: 10, path: 'c' },
          { id: 'forge_slots_c', name: 'Mastery Crafting Slot', description: 'Unlocks crafting slot #5 at level 10', maxLevel: 10, path: 'c' },
          { id: 'forge_enh_skill_c', name: 'Enhanced Skill Boost', description: 'Further increases skill boost by 1.5% per level', maxLevel: 10, path: 'c', requires: { forge_skill_c: 10 } },
          
          // Cross-Path Specializations: A + B (Efficient Quality)
          { id: 'forge_quick_precision', name: 'Quick Precision', description: 'Increases quality by 1% and speed by 2% per level', maxLevel: 3, path: 'ab', requires: { points_a: 10, points_b: 10 } },
          { id: 'forge_crit_efficiency', name: 'Critical Efficiency', description: 'Increases double forge by 1% and critical chance by 1% per level', maxLevel: 3, path: 'ab', requires: { forge_quick_precision: 3 } },
          { id: 'forge_sixth_slot', name: '6th Crafting Slot', description: 'Unlocks crafting slot #6', maxLevel: 3, path: 'ab', requires: { forge_crit_efficiency: 3 } },
          
          // Cross-Path Specializations: B + C (Skillful Quality)
          { id: 'forge_refined_techniques', name: 'Refined Techniques', description: 'Increases skill boost and quality by 1.5% per level', maxLevel: 3, path: 'bc', requires: { points_b: 10, points_c: 10 } },
          { id: 'forge_enh_critical', name: 'Enhanced Critical', description: 'Increases forge critical chance by 2% per level', maxLevel: 3, path: 'bc', requires: { forge_refined_techniques: 3 } },
          { id: 'forge_master_artisan', name: 'Master Artisan', description: 'Increases stat multiplier and skill boost by 3% per level', maxLevel: 3, path: 'bc', requires: { forge_enh_critical: 3 } },
          
          // Cross-Path Specializations: A + C (Efficient Mastery)
          { id: 'forge_swift_learning', name: 'Swift Learning', description: 'Increases speed and skill boost by 2% per level', maxLevel: 3, path: 'ac', requires: { points_a: 10, points_c: 10 } },
          { id: 'forge_dual_crafting', name: 'Dual Crafting', description: 'Increases double forge by 2% and skill boost by 1.5% per level', maxLevel: 3, path: 'ac', requires: { forge_swift_learning: 3 } },
          { id: 'forge_twin_mastery', name: 'Twin Forge Mastery', description: 'Increases double forge and speed by 5% at level 3', maxLevel: 3, path: 'ac', requires: { forge_dual_crafting: 3 } },
        ],
        blackmarket: [
          { id: 'bm_slots_1', name: 'Listing Slots', description: 'Unlocks additional personal listing slot', maxLevel: 5 },
          { id: 'bm_premium_1', name: 'Premium Offers', description: 'Increases premium item offers available', maxLevel: 3 },
          { id: 'bm_standard_1', name: 'Standard Offers', description: 'Increases standard item offers available', maxLevel: 3 },
          { id: 'bm_fee_1', name: 'Reduced Fees', description: 'Reduces market listing fees by 5% per level', maxLevel: 5 },
        ],
        bountyBoard: [
          { id: 'bb_daily_1', name: 'Daily Quest Slots', description: 'Increases available daily quests by 1', maxLevel: 4 },
          { id: 'bb_weekly_1', name: 'Weekly Quest Slots', description: 'Increases available weekly quests by 1', maxLevel: 2 },
          { id: 'bb_rewards_1', name: 'Enhanced Rewards', description: 'Increases quest rewards by 10% per level', maxLevel: 5 },
          { id: 'bb_refresh_1', name: 'Quick Refresh', description: 'Reduces quest refresh timer by 1 hour per level', maxLevel: 3 },
        ],
      };
      
      // Get the appropriate skill tree
      const skillTree = skillTrees[buildingType as keyof typeof skillTrees] || [];
      
      // Return the skill tree with the current unlocked skills
      res.json({
        buildingType,
        currentLevel: building.currentLevel,
        unlockedSkills: building.unlockedSkills || [],
        availableSkillTree: skillTree
      });
    } catch (error) {
      console.error('Error fetching building skill tree:', error);
      res.status(500).json({ message: 'Failed to fetch building skill tree' });
    }
  });
  
  // Allocate skill points
  app.post('/api/buildings/skills/:buildingType', authenticateUser, async (req, res) => {
    try {
      const { buildingType } = req.params;
      const { skillId } = req.body;
      
      if (!skillId) {
        return res.status(400).json({ message: 'Skill ID is required' });
      }
      
      // Get the building
      let building = await storage.getBuildingUpgradeByTypeAndUserId(buildingType, req.session.userId!);
      
      // If building doesn't exist, create a default one
      if (!building) {
        console.log(`Creating default building for type: ${buildingType}`);
        building = await storage.createBuildingUpgrade({
          userId: req.session.userId!,
          buildingType: buildingType,
          currentLevel: 1,
          upgradeInProgress: false,
          unlockedSkills: [],
          availableSkillPoints: 0,
          skillDistribution: {}
        });
        
        if (!building) {
          return res.status(500).json({ message: 'Failed to create building record' });
        }
      }
      
      // Get the skill tree for this building type
      const skillTrees = {
        townhall: townhallSkillTree,
        forge: [
          // Path A: Speed & Efficiency
          { id: 'forge_speed_a', name: 'Crafting Speed', description: 'Increases crafting speed by 3% per level', maxLevel: 10, path: 'a' },
          { id: 'forge_double_a', name: 'Double Forge Chance', description: 'Increases chance to craft twice by 1.5% per level', maxLevel: 10, path: 'a' },
          { id: 'forge_slots_a', name: 'Additional Crafting Slots', description: 'Unlocks crafting slot #2 at level 5, slot #3 at level 10', maxLevel: 10, path: 'a' },
          { id: 'forge_adv_speed_a', name: 'Advanced Crafting Speed', description: 'Further increases crafting speed by 2% per level', maxLevel: 10, path: 'a', requires: { forge_speed_a: 10 } },
          
          // Path B: Quality & Power
          { id: 'forge_quality_b', name: 'Forge Quality', description: 'Increases item quality by 2% per level', maxLevel: 10, path: 'b' },
          { id: 'forge_crit_b', name: 'Forge Critical Chance', description: 'Increases chance for critical crafting by 1% per level', maxLevel: 10, path: 'b' },
          { id: 'forge_slots_b', name: 'Quality Crafting Slot', description: 'Unlocks crafting slot #4 at level 10', maxLevel: 10, path: 'b' },
          { id: 'forge_enh_quality_b', name: 'Enhanced Quality', description: 'Further increases item quality by 1.5% per level', maxLevel: 10, path: 'b', requires: { forge_quality_b: 10 } },
          
          // Path C: Skill Mastery
          { id: 'forge_skill_c', name: 'Skill Boost', description: 'Increases skill boost by 2% per level', maxLevel: 10, path: 'c' },
          { id: 'forge_crit_c', name: 'Skill Critical Chance', description: 'Increases chance for critical skill bonus by 1% per level', maxLevel: 10, path: 'c' },
          { id: 'forge_slots_c', name: 'Mastery Crafting Slot', description: 'Unlocks crafting slot #5 at level 10', maxLevel: 10, path: 'c' },
          { id: 'forge_enh_skill_c', name: 'Enhanced Skill Boost', description: 'Further increases skill boost by 1.5% per level', maxLevel: 10, path: 'c', requires: { forge_skill_c: 10 } },
          
          // Cross-Path Specializations
          { id: 'forge_quick_precision', name: 'Quick Precision', description: 'Increases quality by 1% and speed by 2% per level', maxLevel: 3, path: 'ab', requires: { points_a: 10, points_b: 10 } },
          { id: 'forge_crit_efficiency', name: 'Critical Efficiency', description: 'Increases double forge by 1% and critical chance by 1% per level', maxLevel: 3, path: 'ab', requires: { forge_quick_precision: 3 } },
          { id: 'forge_sixth_slot', name: '6th Crafting Slot', description: 'Unlocks crafting slot #6', maxLevel: 3, path: 'ab', requires: { forge_crit_efficiency: 3 } },
          { id: 'forge_refined_techniques', name: 'Refined Techniques', description: 'Increases skill boost and quality by 1.5% per level', maxLevel: 3, path: 'bc', requires: { points_b: 10, points_c: 10 } },
          { id: 'forge_enh_critical', name: 'Enhanced Critical', description: 'Increases forge critical chance by 2% per level', maxLevel: 3, path: 'bc', requires: { forge_refined_techniques: 3 } },
          { id: 'forge_master_artisan', name: 'Master Artisan', description: 'Increases stat multiplier and skill boost by 3% per level', maxLevel: 3, path: 'bc', requires: { forge_enh_critical: 3 } },
          { id: 'forge_swift_learning', name: 'Swift Learning', description: 'Increases speed and skill boost by 2% per level', maxLevel: 3, path: 'ac', requires: { points_a: 10, points_c: 10 } },
          { id: 'forge_dual_crafting', name: 'Dual Crafting', description: 'Increases double forge by 2% and skill boost by 1.5% per level', maxLevel: 3, path: 'ac', requires: { forge_swift_learning: 3 } },
          { id: 'forge_twin_mastery', name: 'Twin Forge Mastery', description: 'Increases double forge and speed by 5% at level 3', maxLevel: 3, path: 'ac', requires: { forge_dual_crafting: 3 } },
        ],
        blackmarket: [
          { id: 'bm_slots_1', name: 'Listing Slots', description: 'Unlocks additional personal listing slot', maxLevel: 5 },
          { id: 'bm_premium_1', name: 'Premium Offers', description: 'Increases premium item offers available', maxLevel: 3 },
          { id: 'bm_standard_1', name: 'Standard Offers', description: 'Increases standard item offers available', maxLevel: 3 },
          { id: 'bm_fee_1', name: 'Reduced Fees', description: 'Reduces market listing fees by 5% per level', maxLevel: 5 },
        ],
        bountyBoard: [
          { id: 'bb_daily_1', name: 'Daily Quest Slots', description: 'Increases available daily quests by 1', maxLevel: 4 },
          { id: 'bb_weekly_1', name: 'Weekly Quest Slots', description: 'Increases available weekly quests by 1', maxLevel: 2 },
          { id: 'bb_rewards_1', name: 'Enhanced Rewards', description: 'Increases quest rewards by 10% per level', maxLevel: 5 },
          { id: 'bb_refresh_1', name: 'Quick Refresh', description: 'Reduces quest refresh timer by 1 hour per level', maxLevel: 3 },
        ],
      };
      
      const skillTree = skillTrees[buildingType as keyof typeof skillTrees] || [];
      const selectedSkill = skillTree.find(skill => skill.id === skillId);
      
      if (!selectedSkill) {
        return res.status(404).json({ message: 'Skill not found in tree' });
      }
      
      // Check if the skill already has the maximum level
      const unlockedSkills = building.unlockedSkills || [];
      const skillCount = unlockedSkills.filter(id => id === skillId).length;
      
      if (skillCount >= selectedSkill.maxLevel) {
        return res.status(400).json({ message: 'This skill is already at maximum level' });
      }
      
      // Calculate path allocations
      const skillDistribution = building.skillDistribution || {};
      const pathCounts: Record<string, number> = {
        a: 0,
        b: 0,
        c: 0,
        ab: 0,
        bc: 0,
        ac: 0
      };
      
      // Count allocated points per path
      unlockedSkills.forEach(id => {
        const skill = skillTree.find(s => s.id === id);
        if (skill && skill.path) {
          pathCounts[skill.path] = (pathCounts[skill.path] || 0) + 1;
        }
      });
      
      // Check requirements for the selected skill
      if (selectedSkill.requires) {
        const meetsRequirements = Object.entries(selectedSkill.requires).every(([reqId, reqLevel]) => {
          // Special handling for path point requirements
          if (reqId.startsWith('points_')) {
            const path = reqId.split('_')[1];
            return pathCounts[path] >= reqLevel;
          }
          
          // Regular skill prerequisite check
          const prereqCount = unlockedSkills.filter(id => id === reqId).length;
          return prereqCount >= reqLevel;
        });
        
        if (!meetsRequirements) {
          return res.status(400).json({ 
            message: 'Skill requirements not met',
            requires: selectedSkill.requires
          });
        }
      }
      
      // Check if there are unallocated skill points (building level - allocated skills)
      const allocatedPoints = unlockedSkills.length;
      const availablePoints = building.currentLevel - allocatedPoints;
      
      if (availablePoints <= 0) {
        return res.status(400).json({ message: 'No skill points available' });
      }
      
      // Update skill distribution for path tracking
      const updatedDistribution = { ...skillDistribution };
      if (selectedSkill.path) {
        updatedDistribution[selectedSkill.path] = (updatedDistribution[selectedSkill.path] || 0) + 1;
      }
      
      // Add the skill to unlocked skills
      const updatedBuilding = await storage.updateBuildingUpgrade(building.id, {
        unlockedSkills: [...unlockedSkills, skillId],
        skillDistribution: updatedDistribution
      });
      
      res.json(updatedBuilding);
    } catch (error) {
      console.error('Error allocating skill point:', error);
      res.status(500).json({ message: 'Failed to allocate skill point' });
    }
  });

  app.post('/api/buildings/upgrade', authenticateUser, async (req, res) => {
    try {
      const { buildingType, allocatedSkill } = req.body;
      
      if (!buildingType) {
        return res.status(400).json({ message: 'Building type is required' });
      }
      
      // Get user to check resources
      const user = await storage.getUserById(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Get the townhall to determine building level restrictions
      const townhall = await storage.getBuildingUpgradeByTypeAndUserId('townhall', req.session.userId!);
      const townhallLevel = townhall?.currentLevel || 1;
      
      // Set max allowed level to 9 for all buildings regardless of townhall level
      const maxAllowedLevel = 9;
      
      // Get the existing building
      const existingBuilding = await storage.getBuildingUpgradeByTypeAndUserId(buildingType, req.session.userId!);
      
      if (!existingBuilding) {
        // Create a new building upgrade if it doesn't exist
        const newBuilding = await storage.createBuildingUpgrade({
          userId: req.session.userId!,
          buildingType,
          currentLevel: 1,
          upgradeInProgress: false,
          unlockedSkills: []
        });
        
        return res.status(201).json(newBuilding);
      }
      
      // Check if already upgrading
      if (existingBuilding.upgradeInProgress) {
        return res.status(400).json({ message: 'Building is already being upgraded' });
      }
      
      // Building configs with max level and upgrade time
      const buildingConfigs = {
        townhall: { maxLevel: 9, upgradeTime: 60 },
        forge: { maxLevel: 9, upgradeTime: 45 },
        blackmarket: { maxLevel: 9, upgradeTime: 30 },
        barracks: { maxLevel: 9, upgradeTime: 45 },
        library: { maxLevel: 9, upgradeTime: 30 },
        guild: { maxLevel: 9, upgradeTime: 90 },
        bountyBoard: { maxLevel: 9, upgradeTime: 40 }
      };
      
      const config = buildingConfigs[buildingType as keyof typeof buildingConfigs];
      const maxLevel = config?.maxLevel || 50;
      
      // For townhall, use its own max level
      if (buildingType === 'townhall') {
        if (existingBuilding.currentLevel >= maxLevel) {
          return res.status(400).json({ message: 'Townhall is already at max level' });
        }
      } else {
        // For other buildings, check against the max allowed level
        if (existingBuilding.currentLevel >= Math.min(maxAllowedLevel, maxLevel)) {
          return res.status(400).json({ 
            message: 'Building has reached maximum level',
            currentLevel: existingBuilding.currentLevel,
            maxAllowedLevel: maxAllowedLevel
          });
        }
      }
      
      // Calculate cost
      const baseCosts = {
        townhall: { rogueCredits: 1000, forgeTokens: 100 },
        forge: { rogueCredits: 800, forgeTokens: 80 },
        blackmarket: { rogueCredits: 600, forgeTokens: 60 },
        barracks: { rogueCredits: 800, forgeTokens: 80 },
        library: { rogueCredits: 600, forgeTokens: 60 },
        guild: { rogueCredits: 1200, forgeTokens: 120 },
        bountyBoard: { rogueCredits: 700, forgeTokens: 70 }
      };
      
      const baseCost = baseCosts[buildingType as keyof typeof baseCosts] || { rogueCredits: 500, forgeTokens: 50 };
      const levelMultiplier = existingBuilding.currentLevel;
      const cost = {
        rogueCredits: baseCost.rogueCredits * levelMultiplier,
        forgeTokens: baseCost.forgeTokens * levelMultiplier
      };
      
      // Check if user can afford upgrade
      if (user.rogueCredits! < cost.rogueCredits || user.forgeTokens! < cost.forgeTokens) {
        return res.status(400).json({ 
          message: 'Insufficient resources for upgrade',
          required: cost,
          current: {
            rogueCredits: user.rogueCredits,
            forgeTokens: user.forgeTokens
          }
        });
      }
      
      // Deduct costs
      await storage.updateUser(user.id, {
        rogueCredits: user.rogueCredits! - cost.rogueCredits,
        forgeTokens: user.forgeTokens! - cost.forgeTokens
      });
      
      // Set upgrade in progress
      const upgradeTime = (config?.upgradeTime || 30) * 60 * 1000; // minutes to milliseconds
      const updatedBuilding = await storage.updateBuildingUpgrade(existingBuilding.id, {
        upgradeInProgress: true,
        upgradeStartTime: new Date(),
        upgradeEndTime: new Date(Date.now() + upgradeTime)
      });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.session.userId!,
        activityType: 'building_upgrade_started',
        description: `Started upgrading ${buildingType} to level ${existingBuilding.currentLevel + 1}`,
        relatedIds: { buildingId: existingBuilding.id }
      });
      
      res.json(updatedBuilding);
    } catch (error) {
      console.error('Error starting building upgrade:', error);
      res.status(500).json({ message: 'Failed to start building upgrade' });
    }
  });
  
  app.post('/api/buildings/complete/:buildingType', authenticateUser, async (req, res) => {
    try {
      const { buildingType } = req.params;
      
      // Get the building
      const building = await storage.getBuildingUpgradeByTypeAndUserId(buildingType, req.session.userId!);
      
      if (!building) {
        return res.status(404).json({ message: 'Building not found' });
      }
      
      if (!building.upgradeInProgress) {
        return res.status(400).json({ message: 'Building is not being upgraded' });
      }
      
      if (building.upgradeEndTime && new Date(building.upgradeEndTime) > new Date()) {
        return res.status(400).json({ 
          message: 'Upgrade not complete yet',
          remainingTime: new Date(building.upgradeEndTime).getTime() - Date.now()
        });
      }
      
      // Complete upgrade
      const updatedBuilding = await storage.updateBuildingUpgrade(building.id, {
        currentLevel: building.currentLevel + 1,
        upgradeInProgress: false,
        upgradeStartTime: null,
        upgradeEndTime: null
      });
      
      // Log activity
      await storage.createActivityLog({
        userId: req.session.userId!,
        activityType: 'building_upgrade_completed',
        description: `Completed upgrading ${buildingType} to level ${building.currentLevel + 1}`,
        relatedIds: { buildingId: building.id }
      });
      
      res.json(updatedBuilding);
    } catch (error) {
      console.error('Error completing building upgrade:', error);
      res.status(500).json({ message: 'Failed to complete building upgrade' });
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
  
  // Register building skill routes
  await addBuildingSkillRoutes(app);
  
  // Add error handling middleware
  app.use(handleErrors);
  
  return httpServer;
}

// IMPORTANT: Using the battle system imported at the top of the file

// Helper function to generate battle log with proper Attack Meter turn-based system
// Implements the dungeon battle system as specified in the documentation
/**
 * Processes character IDs and generates a proper battle log using the battle system
 */
async function processBattleLog(run: any, success: boolean) {
  // CRITICAL FIX: Before calling the battle system, ensure character IDs are processed correctly
  if (!run.characterIds && typeof run.characterIds !== 'object') {
    console.error('Missing or invalid characterIds in run:', run);
    // Use an empty array as fallback if characterIds is missing
    run.characterIds = [];
  }
  
  // Make characterIds always an array
  if (!Array.isArray(run.characterIds)) {
    // If it's a string or other format, try to parse it if possible
    try {
      if (typeof run.characterIds === 'string') {
        run.characterIds = JSON.parse(run.characterIds);
      } else {
        // If it's not a string, convert to string and try to parse
        const idString = String(run.characterIds);
        // Check if it looks like a Postgres array representation
        if (idString.startsWith('{') && idString.endsWith('}')) {
          // Parse Postgres array format {1,2,3} to JavaScript array [1,2,3]
          run.characterIds = idString.slice(1, -1).split(',').map(id => parseInt(id.trim()));
        } else {
          // Default to empty array if we can't parse
          console.error('Could not parse characterIds:', run.characterIds);
          run.characterIds = [];
        }
      }
    } catch (error) {
      console.error('Error parsing characterIds:', error);
      run.characterIds = [];
    }
  }
  
  console.log('Processed characterIds for battle log:', run.characterIds);
  
  // Call the dedicated battle system implementation
  return await generateBattleLog(run, success);
}

// Function to handle building skill routes
export async function addBuildingSkillRoutes(app: Express) {
  // Building skill routes implementation
  app.post('/api/buildings/upgrade', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { buildingId } = req.body;
      
      if (!buildingId) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      const building = await storage.getBuildingById(buildingId);
      
      if (!building) {
        return res.status(404).json({ message: 'Building not found' });
      }
      
      // Update building level
      const updatedBuilding = await storage.upgradeBuilding(buildingId);
      
      return res.json({ 
        success: true, 
        building: updatedBuilding
      });
    } catch (error) {
      console.error('Error upgrading building:', error);
      return res.status(500).json({ message: 'Failed to upgrade building' });
    }
  });
}
