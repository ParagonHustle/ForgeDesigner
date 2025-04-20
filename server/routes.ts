import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ZodError } from "zod";
import { fromZodError } from "zod-validation-error";
import { townhallSkillTree, hasBuildingPlans, consumeBuildingPlan } from './townhallSkills';
import { registerDungeonRoutes } from './dungeon-routes';
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
  
  // Direct login API - creates a player account directly with lots of characters and auras
  app.post('/api/auth/login', async (req, res) => {
    try {
      console.log('Starting direct login process');
      
      // Create a consistent user ID for testing
      const userId = 'player123456';
      
      let userData = null;
      
      // Check if user exists
      try {
        userData = await storage.getUserByDiscordId(userId);
        console.log('User check:', userData ? 'Found existing user' : 'No user found, will create');
      } catch (findError) {
        console.error('Error checking for user:', findError);
        userData = null;
      }
      
      if (!userData) {
        // Create new user with privileges
        console.log('Creating new user');
        userData = await storage.createUser({
          discordId: userId,
          username: 'Player',
          avatarUrl: 'https://cdn.pixabay.com/photo/2021/03/02/12/03/avatar-6062252_1280.png',
          roles: ['admin', 'member'],
          forgeTokens: 99999,
          rogueCredits: 99999,
          soulShards: 9999,
          lastLogin: new Date(),
          isAdmin: true
        });
        console.log('Created user with ID:', userData.id);
        
        // Create abundant resources
        await Promise.all([
          storage.createResource({
            userId: userData.id,
            name: 'Celestial Ore',
            type: 'material',
            quantity: 9999,
            description: 'A rare material used in crafting Auras',
            iconUrl: 'https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=150&h=150&fit=crop'
          }),
          storage.createResource({
            userId: userData.id,
            name: 'Abyssal Pearl',
            type: 'material',
            quantity: 9999,
            description: 'A rare material from the ocean depths',
            iconUrl: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=150&h=150&fit=crop'
          }),
          storage.createResource({
            userId: userData.id,
            name: 'Mystic Crystal',
            type: 'material',
            quantity: 9999,
            description: 'Crystal with magical properties',
            iconUrl: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=150&h=150&fit=crop'
          }),
          storage.createResource({
            userId: userData.id,
            name: 'Dragon Scale',
            type: 'material',
            quantity: 9999,
            description: 'Rare scales from an ancient dragon',
            iconUrl: 'https://images.unsplash.com/photo-1592950630581-03cb41342cc5?w=150&h=150&fit=crop'
          }),
          storage.createResource({
            userId: userData.id,
            name: 'Phoenix Feather',
            type: 'material',
            quantity: 9999,
            description: 'Magical feathers that burn eternally',
            iconUrl: 'https://images.unsplash.com/photo-1553356084-58ef4a67b2a7?w=150&h=150&fit=crop'
          }),
          storage.createResource({
            userId: userData.id,
            name: 'Essence',
            type: 'crafting',
            quantity: 99999,
            description: 'Pure magical essence for crafting',
            iconUrl: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=150&h=150&fit=crop'
          })
        ]);
        
        // Create a diverse set of characters
        const charactersToCreate = [
          {
            name: 'Dragonslayer',
            class: 'Warrior',
            level: 35,
            attack: 75,
            defense: 80,
            vitality: 450,
            speed: 40,
            focus: 30,
            accuracy: 55,
            resilience: 65,
            avatarUrl: 'https://images.unsplash.com/photo-1580519542036-c47de6d5f458?w=250&h=250&fit=crop'
          },
          {
            name: 'Shadowmage',
            class: 'Mage',
            level: 35,
            attack: 85,
            defense: 40,
            vitality: 320,
            speed: 55,
            focus: 90,
            accuracy: 75,
            resilience: 45,
            avatarUrl: 'https://images.unsplash.com/photo-1618336753974-aae8e04506a7?w=250&h=250&fit=crop'
          },
          {
            name: 'Swiftblade',
            class: 'Rogue',
            level: 35,
            attack: 70,
            defense: 45,
            vitality: 350,
            speed: 95,
            focus: 60,
            accuracy: 85,
            resilience: 50,
            avatarUrl: 'https://images.unsplash.com/photo-1524117074681-31bd4de22ad3?w=250&h=250&fit=crop'
          },
          {
            name: 'Ironheart',
            class: 'Tank',
            level: 35,
            attack: 65,
            defense: 95,
            vitality: 520,
            speed: 30,
            focus: 40,
            accuracy: 50,
            resilience: 85,
            avatarUrl: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=250&h=250&fit=crop'
          },
          {
            name: 'Lightbringer',
            class: 'Paladin',
            level: 35,
            attack: 70,
            defense: 75,
            vitality: 480,
            speed: 45,
            focus: 65,
            accuracy: 60,
            resilience: 70,
            avatarUrl: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=250&h=250&fit=crop'
          },
          {
            name: 'Stormbringer',
            class: 'Elementalist',
            level: 35,
            attack: 80,
            defense: 45,
            vitality: 350,
            speed: 65,
            focus: 85,
            accuracy: 75,
            resilience: 55,
            avatarUrl: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=250&h=250&fit=crop'
          },
          {
            name: 'Nightshade',
            class: 'Assassin',
            level: 35,
            attack: 85,
            defense: 35,
            vitality: 320,
            speed: 90,
            focus: 70,
            accuracy: 90,
            resilience: 40,
            avatarUrl: 'https://images.unsplash.com/photo-1559123519-e05d8e2a15bd?w=250&h=250&fit=crop'
          },
          {
            name: 'Soulweaver',
            class: 'Necromancer',
            level: 35,
            attack: 75,
            defense: 50,
            vitality: 360,
            speed: 45,
            focus: 95,
            accuracy: 70,
            resilience: 60,
            avatarUrl: 'https://images.unsplash.com/photo-1604076913837-52ab5629fba9?w=250&h=250&fit=crop'
          },
          {
            name: 'Wildheart',
            class: 'Druid',
            level: 35,
            attack: 65,
            defense: 60,
            vitality: 420,
            speed: 70,
            focus: 75,
            accuracy: 65,
            resilience: 75,
            avatarUrl: 'https://images.unsplash.com/photo-1525824236856-8c0aabe8dbde?w=250&h=250&fit=crop'
          },
          {
            name: 'Frostbite',
            class: 'Cryomancer',
            level: 35,
            attack: 80,
            defense: 55,
            vitality: 380,
            speed: 50,
            focus: 85,
            accuracy: 75,
            resilience: 60,
            avatarUrl: 'https://images.unsplash.com/photo-1534947290-5ee0aff6e50f?w=250&h=250&fit=crop'
          }
        ];
        
        // Create characters sequentially to avoid DB conflicts
        for (const charData of charactersToCreate) {
          await storage.createCharacter({
            userId: userData.id,
            ...charData
          });
        }
        
        // Create a variety of auras
        const aurasToCreate = [
          {
            name: 'Fire Emblem',
            element: 'Fire',
            level: 25,
            rarity: 'Legendary',
            attack: 45,
            defense: 10,
            vitality: 100,
            speed: 25,
            focus: 30,
            iconUrl: 'https://images.unsplash.com/photo-1549813069-f95e44d7f498?w=150&h=150&fit=crop'
          },
          {
            name: 'Ice Barrier',
            element: 'Ice',
            level: 25,
            rarity: 'Epic',
            attack: 15,
            defense: 50,
            vitality: 150,
            speed: 5,
            focus: 20,
            iconUrl: 'https://images.unsplash.com/photo-1579974849948-1b0a7e76121a?w=150&h=150&fit=crop'
          },
          {
            name: 'Lightning Strike',
            element: 'Lightning',
            level: 25,
            rarity: 'Epic',
            attack: 40,
            defense: 5,
            vitality: 80,
            speed: 50,
            focus: 35,
            iconUrl: 'https://images.unsplash.com/photo-1537210249814-b9a10a161ae4?w=150&h=150&fit=crop'
          },
          {
            name: 'Earth Shield',
            element: 'Earth',
            level: 25,
            rarity: 'Rare',
            attack: 10,
            defense: 45,
            vitality: 200,
            speed: 0,
            focus: 15,
            iconUrl: 'https://images.unsplash.com/photo-1510343513665-87c889f8b0ef?w=150&h=150&fit=crop'
          },
          {
            name: 'Wind Rush',
            element: 'Wind',
            level: 25,
            rarity: 'Epic',
            attack: 20,
            defense: 15,
            vitality: 90,
            speed: 55,
            focus: 25,
            iconUrl: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=150&h=150&fit=crop'
          },
          {
            name: 'Shadow Cloak',
            element: 'Shadow',
            level: 25,
            rarity: 'Legendary',
            attack: 30,
            defense: 30,
            vitality: 120,
            speed: 35,
            focus: 40,
            iconUrl: 'https://images.unsplash.com/photo-1519608425089-7f3bfa6f6bb8?w=150&h=150&fit=crop'
          },
          {
            name: 'Light Halo',
            element: 'Light',
            level: 25,
            rarity: 'Legendary',
            attack: 35,
            defense: 35,
            vitality: 150,
            speed: 30,
            focus: 45,
            iconUrl: 'https://images.unsplash.com/photo-1523401257547-36b5171b3be0?w=150&h=150&fit=crop'
          },
          {
            name: 'Nature\'s Blessing',
            element: 'Nature',
            level: 25,
            rarity: 'Epic',
            attack: 25,
            defense: 25,
            vitality: 180,
            speed: 25,
            focus: 30,
            iconUrl: 'https://images.unsplash.com/photo-1462690417829-5b41247f6b0e?w=150&h=150&fit=crop'
          },
          {
            name: 'Water Flow',
            element: 'Water',
            level: 25,
            rarity: 'Rare',
            attack: 20,
            defense: 30,
            vitality: 140,
            speed: 20,
            focus: 35,
            iconUrl: 'https://images.unsplash.com/photo-1454789476662-53eb23ba5907?w=150&h=150&fit=crop'
          },
          {
            name: 'Arcane Power',
            element: 'Arcane',
            level: 25,
            rarity: 'Legendary',
            attack: 50,
            defense: 20,
            vitality: 120,
            speed: 15,
            focus: 60,
            iconUrl: 'https://images.unsplash.com/photo-1590496793929-36417d3117de?w=150&h=150&fit=crop'
          },
          {
            name: 'Volcanic Fury',
            element: 'Fire',
            level: 25,
            rarity: 'Epic',
            attack: 55,
            defense: 15,
            vitality: 90,
            speed: 20,
            focus: 25,
            iconUrl: 'https://images.unsplash.com/photo-1610498955353-c92da35d40da?w=150&h=150&fit=crop'
          },
          {
            name: 'Frost Nova',
            element: 'Ice',
            level: 25,
            rarity: 'Epic',
            attack: 35,
            defense: 35,
            vitality: 110,
            speed: 10,
            focus: 40,
            iconUrl: 'https://images.unsplash.com/photo-1476368571201-5b1ad1c8e3b5?w=150&h=150&fit=crop'
          },
          {
            name: 'Thunder God',
            element: 'Lightning',
            level: 25,
            rarity: 'Legendary',
            attack: 60,
            defense: 10,
            vitality: 100,
            speed: 45,
            focus: 30,
            iconUrl: 'https://images.unsplash.com/photo-1537210249814-b9a10a161ae4?w=150&h=150&fit=crop'
          },
          {
            name: 'Mountain\'s Strength',
            element: 'Earth',
            level: 25,
            rarity: 'Epic',
            attack: 20,
            defense: 60,
            vitality: 220,
            speed: 0,
            focus: 15,
            iconUrl: 'https://images.unsplash.com/photo-1553075712-453f7dfe1d6c?w=150&h=150&fit=crop'
          },
          {
            name: 'Tornado Force',
            element: 'Wind',
            level: 25,
            rarity: 'Epic',
            attack: 40,
            defense: 10,
            vitality: 80,
            speed: 60,
            focus: 25,
            iconUrl: 'https://images.unsplash.com/photo-1527482797697-8795b05a13fe?w=150&h=150&fit=crop'
          }
        ];
        
        // Create auras sequentially to avoid DB conflicts
        for (const auraData of aurasToCreate) {
          await storage.createAura({
            userId: userData.id,
            ...auraData
          });
        }
        
        console.log('Created abundant resources, characters, and auras');
      } else {
        // Check if the user already has characters and auras
        const existingCharacters = await storage.getCharacters(userData.id);
        const existingAuras = await storage.getAuras(userData.id);
        
        // If the user has less than 10 characters, add more
        if (existingCharacters.length < 10) {
          console.log('Adding more characters to existing account');
          
          // Sample list of characters to add if needed
          const additionalCharacters = [
            {
              userId: userData.id,
              name: 'Ironheart',
              class: 'Tank',
              level: 35,
              attack: 65,
              defense: 95,
              vitality: 520,
              speed: 30,
              focus: 40,
              accuracy: 50,
              resilience: 85,
              avatarUrl: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=250&h=250&fit=crop'
            },
            {
              userId: userData.id,
              name: 'Lightbringer',
              class: 'Paladin',
              level: 35,
              attack: 70,
              defense: 75,
              vitality: 480,
              speed: 45,
              focus: 65,
              accuracy: 60,
              resilience: 70,
              avatarUrl: 'https://images.unsplash.com/photo-1589182373726-e4f658ab50f0?w=250&h=250&fit=crop'
            },
            {
              userId: userData.id,
              name: 'Stormbringer',
              class: 'Elementalist',
              level: 35,
              attack: 80,
              defense: 45,
              vitality: 350,
              speed: 65,
              focus: 85,
              accuracy: 75,
              resilience: 55,
              avatarUrl: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=250&h=250&fit=crop'
            },
            {
              userId: userData.id,
              name: 'Nightshade',
              class: 'Assassin',
              level: 35,
              attack: 85,
              defense: 35,
              vitality: 320,
              speed: 90,
              focus: 70,
              accuracy: 90,
              resilience: 40,
              avatarUrl: 'https://images.unsplash.com/photo-1559123519-e05d8e2a15bd?w=250&h=250&fit=crop'
            }
          ];
          
          for (const charData of additionalCharacters) {
            if (!existingCharacters.some(c => c.name === charData.name)) {
              await storage.createCharacter(charData);
            }
          }
        }
        
        // If the user has less than 15 auras, add more
        if (existingAuras.length < 15) {
          console.log('Adding more auras to existing account');
          
          // Sample list of auras to add if needed
          const additionalAuras = [
            {
              userId: userData.id,
              name: 'Shadow Cloak',
              element: 'Shadow',
              level: 25,
              rarity: 'Legendary',
              attack: 30,
              defense: 30,
              vitality: 120,
              speed: 35,
              focus: 40,
              iconUrl: 'https://images.unsplash.com/photo-1519608425089-7f3bfa6f6bb8?w=150&h=150&fit=crop',
              skills: JSON.stringify(['Dark Shroud', 'Shadow Step', 'Umbral Blast'])
            },
            {
              userId: userData.id,
              name: 'Light Halo',
              element: 'Light',
              level: 25,
              rarity: 'Legendary',
              attack: 35,
              defense: 35,
              vitality: 150,
              speed: 30,
              focus: 45,
              iconUrl: 'https://images.unsplash.com/photo-1523401257547-36b5171b3be0?w=150&h=150&fit=crop',
              skills: JSON.stringify(['Divine Ray', 'Blessing', 'Holy Nova'])
            },
            {
              userId: userData.id,
              name: 'Phoenix Rebirth',
              element: 'Fire',
              level: 30,
              rarity: 'Legendary',
              attack: 55,
              defense: 15,
              vitality: 120,
              speed: 35,
              focus: 25,
              iconUrl: 'https://images.unsplash.com/photo-1599518537242-eecf4fecc159?w=150&h=150&fit=crop',
              skills: JSON.stringify(['Rising Flame', 'Rebirth', 'Ashen Wings'])
            },
            {
              userId: userData.id,
              name: 'Glacier Mantle',
              element: 'Ice',
              level: 30,
              rarity: 'Epic',
              attack: 25,
              defense: 55,
              vitality: 150,
              speed: 15,
              focus: 30,
              iconUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=150&h=150&fit=crop',
              skills: JSON.stringify(['Frozen Armor', 'Winter Wind', 'Permafrost'])
            },
            {
              userId: userData.id,
              name: 'Void Entity',
              element: 'Shadow',
              level: 30,
              rarity: 'Legendary',
              attack: 45,
              defense: 45,
              vitality: 140,
              speed: 40,
              focus: 50,
              iconUrl: 'https://images.unsplash.com/photo-1599227693667-d342bdbf5a3d?w=150&h=150&fit=crop',
              skills: JSON.stringify(['Dark Absorption', 'Null Zone', 'Oblivion'])
            }
          ];
          
          for (const auraData of additionalAuras) {
            if (!existingAuras.some(a => a.name === auraData.name)) {
              // Parse skills from string to array
              const { skills: skillsString, ...otherAuraData } = auraData;
              let skillsArray = [];
              
              // Convert skills string to array if needed
              if (skillsString) {
                try {
                  // If it's already a JSON string, parse it
                  if (typeof skillsString === 'string') {
                    skillsArray = JSON.parse(skillsString);
                  } 
                  // If it's already an array, use it directly
                  else if (Array.isArray(skillsString)) {
                    skillsArray = skillsString;
                  }
                } catch (e) {
                  console.warn(`Could not parse skills for ${auraData.name}:`, e);
                  skillsArray = [];
                }
              }
              
              await storage.createAura({
                ...otherAuraData,
                skills: skillsArray
              });
            }
          }
        }
        
        // Ensure user has at least 9999 of essential resources
        const resources = await storage.getResourcesByUserId(userData.id);
        const essentialResources = [
          { name: 'Celestial Ore', type: 'material', desc: 'A rare material used in crafting Auras', icon: 'https://images.unsplash.com/photo-1608054791095-e0482e3e5139?w=150&h=150&fit=crop' },
          { name: 'Abyssal Pearl', type: 'material', desc: 'A rare material from the ocean depths', icon: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=150&h=150&fit=crop' },
          { name: 'Mystic Crystal', type: 'material', desc: 'Crystal with magical properties', icon: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=150&h=150&fit=crop' },
          { name: 'Essence', type: 'crafting', desc: 'Pure magical essence for crafting', icon: 'https://images.unsplash.com/photo-1614728263952-84ea256f9679?w=150&h=150&fit=crop' }
        ];
        
        for (const resource of essentialResources) {
          const existingResource = resources.find(r => r.name === resource.name);
          if (!existingResource) {
            await storage.createResource({
              userId: userData.id,
              name: resource.name,
              type: resource.type,
              quantity: 9999,
              description: resource.desc,
              iconUrl: resource.icon
            });
          } else if (existingResource.quantity < 9999) {
            await storage.updateResource(existingResource.id, {
              quantity: 9999
            });
          }
        }
        
        // Update existing user login time
        console.log('Updating existing user login time');
        userData = await storage.updateUser(userData.id, { lastLogin: new Date() });
      }
      
      // Set session with user ID
      req.session.userId = userData.id;
      console.log('Set session userId to ID:', userData.id);
      
      // Return user data directly
      res.json(userData);
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ 
        message: 'Login failed', 
        error: error instanceof Error ? error.message : String(error)
      });
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
      
      // Note: Using the imported dungeon-routes module for processing
      // This is a fallback that should never be called in practice
      const battleLog = [{ 
        type: 'system_message', 
        timestamp: Date.now(), 
        message: 'Dungeon run processing has been moved to the dungeon-routes module. Please use the new APIs.'
      }];
      
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
      
      // CRITICAL FIX: Sanitize battle log to ensure all units have full health at battle start
      // This is our final safeguard before sending data to the client
      const sanitizedBattleLog = battleLog.map(entry => {
        // Only process battle_start events which contain unit data
        if (entry.type === 'battle_start') {
          // Ensure all allies have proper HP values (not 0 or less)
          if (entry.allies && Array.isArray(entry.allies)) {
            entry.allies = entry.allies.map(ally => {
              // If HP is 0 or invalid, set it to maxHp
              if (!ally.hp || ally.hp <= 0) {
                console.warn(`API Response Fix: Correcting ally ${ally.name} with invalid HP (${ally.hp}) to ${ally.maxHp}`);
                return { ...ally, hp: ally.maxHp };
              }
              return ally;
            });
          }
          
          // Ensure all enemies have proper HP values (not 0 or less)
          if (entry.enemies && Array.isArray(entry.enemies)) {
            entry.enemies = entry.enemies.map(enemy => {
              // If HP is 0 or invalid, set it to maxHp
              if (!enemy.hp || enemy.hp <= 0) {
                console.warn(`API Response Fix: Correcting enemy ${enemy.name} with invalid HP (${enemy.hp}) to ${enemy.maxHp}`);
                return { ...enemy, hp: enemy.maxHp };
              }
              return enemy;
            });
          }
        }
        
        return entry;
      });
      
      console.log('Sanitized battle log to ensure proper health values before sending to client');
      
      res.json({
        success,
        battleLog: sanitizedBattleLog,
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

// DISABLED:   // DISABLED - duplicate route
// DISABLED:   // app.post('/api/buildings/upgrade', authenticateUser, async (req, res) => {
// DISABLED:     try {
// DISABLED:       const { buildingType, allocatedSkill } = req.body;
// DISABLED:       
// DISABLED:       if (!buildingType) {
// DISABLED:         return res.status(400).json({ message: 'Building type is required' });
// DISABLED:       }
// DISABLED:       
// DISABLED:       // Get user to check resources
// DISABLED:       const user = await storage.getUserById(req.session.userId!);
// DISABLED:       if (!user) {
// DISABLED:         return res.status(404).json({ message: 'User not found' });
// DISABLED:       }
// DISABLED:       
// DISABLED:       // Get the townhall to determine building level restrictions
// DISABLED:       const townhall = await storage.getBuildingUpgradeByTypeAndUserId('townhall', req.session.userId!);
// DISABLED:       const townhallLevel = townhall?.currentLevel || 1;
// DISABLED:       
// DISABLED:       // Set max allowed level to 9 for all buildings regardless of townhall level
// DISABLED:       const maxAllowedLevel = 9;
// DISABLED:       
// DISABLED:       // Get the existing building
// DISABLED:       const existingBuilding = await storage.getBuildingUpgradeByTypeAndUserId(buildingType, req.session.userId!);
// DISABLED:       
// DISABLED:       if (!existingBuilding) {
// DISABLED:         // Create a new building upgrade if it doesn't exist
// DISABLED:         const newBuilding = await storage.createBuildingUpgrade({
// DISABLED:           userId: req.session.userId!,
// DISABLED:           buildingType,
// DISABLED:           currentLevel: 1,
// DISABLED:           upgradeInProgress: false,
// DISABLED:           unlockedSkills: []
// DISABLED:         });
// DISABLED:         
// DISABLED:         return res.status(201).json(newBuilding);
// DISABLED:       }
// DISABLED:       
// DISABLED:       // Check if already upgrading
// DISABLED:       if (existingBuilding.upgradeInProgress) {
// DISABLED:         return res.status(400).json({ message: 'Building is already being upgraded' });
// DISABLED:       }
// DISABLED:       
// DISABLED:       // Building configs with max level and upgrade time
// DISABLED:       const buildingConfigs = {
// DISABLED:         townhall: { maxLevel: 9, upgradeTime: 60 },
// DISABLED:         forge: { maxLevel: 9, upgradeTime: 45 },
// DISABLED:         blackmarket: { maxLevel: 9, upgradeTime: 30 },
// DISABLED:         barracks: { maxLevel: 9, upgradeTime: 45 },
// DISABLED:         library: { maxLevel: 9, upgradeTime: 30 },
// DISABLED:         guild: { maxLevel: 9, upgradeTime: 90 },
// DISABLED:         bountyBoard: { maxLevel: 9, upgradeTime: 40 }
// DISABLED:       };
// DISABLED:       
// DISABLED:       const config = buildingConfigs[buildingType as keyof typeof buildingConfigs];
// DISABLED:       const maxLevel = config?.maxLevel || 50;
// DISABLED:       
// DISABLED:       // For townhall, use its own max level
// DISABLED:       if (buildingType === 'townhall') {
// DISABLED:         if (existingBuilding.currentLevel >= maxLevel) {
// DISABLED:           return res.status(400).json({ message: 'Townhall is already at max level' });
// DISABLED:         }
// DISABLED:       } else {
// DISABLED:         // For other buildings, check against the max allowed level
// DISABLED:         if (existingBuilding.currentLevel >= Math.min(maxAllowedLevel, maxLevel)) {
// DISABLED:           return res.status(400).json({ 
// DISABLED:             message: 'Building has reached maximum level',
// DISABLED:             currentLevel: existingBuilding.currentLevel,
// DISABLED:             maxAllowedLevel: maxAllowedLevel
// DISABLED:           });
// DISABLED:         }
// DISABLED:       }
// DISABLED:       
// DISABLED:       // Calculate cost
// DISABLED:       const baseCosts = {
// DISABLED:         townhall: { rogueCredits: 1000, forgeTokens: 100 },
// DISABLED:         forge: { rogueCredits: 800, forgeTokens: 80 },
// DISABLED:         blackmarket: { rogueCredits: 600, forgeTokens: 60 },
// DISABLED:         barracks: { rogueCredits: 800, forgeTokens: 80 },
// DISABLED:         library: { rogueCredits: 600, forgeTokens: 60 },
// DISABLED:         guild: { rogueCredits: 1200, forgeTokens: 120 },
// DISABLED:         bountyBoard: { rogueCredits: 700, forgeTokens: 70 }
// DISABLED:       };
// DISABLED:       
// DISABLED:       const baseCost = baseCosts[buildingType as keyof typeof baseCosts] || { rogueCredits: 500, forgeTokens: 50 };
// DISABLED:       const levelMultiplier = existingBuilding.currentLevel;
// DISABLED:       const cost = {
// DISABLED:         rogueCredits: baseCost.rogueCredits * levelMultiplier,
// DISABLED:         forgeTokens: baseCost.forgeTokens * levelMultiplier
// DISABLED:       };
// DISABLED:       
// DISABLED:       // Check if user can afford upgrade
// DISABLED:       if (user.rogueCredits! < cost.rogueCredits || user.forgeTokens! < cost.forgeTokens) {
// DISABLED:         return res.status(400).json({ 
// DISABLED:           message: 'Insufficient resources for upgrade',
// DISABLED:           required: cost,
// DISABLED:           current: {
// DISABLED:             rogueCredits: user.rogueCredits,
// DISABLED:             forgeTokens: user.forgeTokens
// DISABLED:           }
// DISABLED:         });
// DISABLED:       }
// DISABLED:       
// DISABLED:       // Deduct costs
// DISABLED:       await storage.updateUser(user.id, {
// DISABLED:         rogueCredits: user.rogueCredits! - cost.rogueCredits,
// DISABLED:         forgeTokens: user.forgeTokens! - cost.forgeTokens
// DISABLED:       });
// DISABLED:       
// DISABLED:       // Set upgrade in progress
// DISABLED:       const upgradeTime = (config?.upgradeTime || 30) * 60 * 1000; // minutes to milliseconds
// DISABLED:       const updatedBuilding = await storage.updateBuildingUpgrade(existingBuilding.id, {
// DISABLED:         upgradeInProgress: true,
// DISABLED:         upgradeStartTime: new Date(),
// DISABLED:         upgradeEndTime: new Date(Date.now() + upgradeTime)
// DISABLED:       });
// DISABLED:       
// DISABLED:       // Log activity
// DISABLED:       await storage.createActivityLog({
// DISABLED:         userId: req.session.userId!,
// DISABLED:         activityType: 'building_upgrade_started',
// DISABLED:         description: `Started upgrading ${buildingType} to level ${existingBuilding.currentLevel + 1}`,
// DISABLED:         relatedIds: { buildingId: existingBuilding.id }
// DISABLED:       });
// DISABLED:       
// DISABLED:       res.json(updatedBuilding);
// DISABLED:     } catch (error) {
// DISABLED:       console.error('Error starting building upgrade:', error);
// DISABLED:       res.status(500).json({ message: 'Failed to start building upgrade' });
// DISABLED:     }
// DISABLED:   });
// DISABLED:   
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
  
  // Register dungeon routes from new, modular implementation
  registerDungeonRoutes(app);
  
  return httpServer;
}

// NOTE: The battle log generation has been moved to the new modular dungeon-routes.ts implementation.
// The following function is kept for reference but is no longer used.

/*
async function processBattleLog(run: any, success: boolean) {
  // See dungeon-routes.ts for the new implementation
  return [];
}
*/

// Function to handle building skill routes
export async function addBuildingSkillRoutes(app: Express) {
  // Building skill routes implementation
  app.post('/api/buildings/upgrade', authenticateUser, async (req: Request, res: Response) => {
    try {
      const { buildingId, buildingType, slotId, upgradePath, pathName } = req.body;
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Handle different types of upgrades
      if (buildingType === 'farmSlot' || buildingType === 'forgeSlot') {
        // This is a slot upgrade
        if (slotId === undefined || upgradePath === undefined) {
          return res.status(400).json({ message: 'Missing required fields for slot upgrade' });
        }
        
        // Get current upgrades for this user
        let userUpgrades = await storage.getBuildingUpgradesByUserId(userId);
        
        if (!userUpgrades) {
          // Create initial upgrades record if none exists
          userUpgrades = await storage.createBuildingUpgrades({
            userId,
            farmSlots: [],
            forgeSlots: [],
            marketUpgrades: []
          });
        }
        
        // Create upgrade data
        const upgradeData = {
          slotId,
          level: 1, // Start at level 1 or increment existing level
          upgradePath,
          pathName,
          timestamp: new Date().toISOString()
        };
        
        // Update the appropriate slot category
        let updatedUpgrades;
        if (buildingType === 'farmSlot') {
          // Check if this slot already has upgrades
          const existingSlotIndex = userUpgrades.farmSlots.findIndex(
            (slot: any) => slot.slotId === slotId
          );
          
          if (existingSlotIndex >= 0) {
            // Increment existing slot level
            userUpgrades.farmSlots[existingSlotIndex].level += 1;
            // Update path name if it was changed
            userUpgrades.farmSlots[existingSlotIndex].upgradePath = upgradePath;
            userUpgrades.farmSlots[existingSlotIndex].pathName = pathName;
            userUpgrades.farmSlots[existingSlotIndex].timestamp = upgradeData.timestamp;
          } else {
            // Add new slot upgrade
            userUpgrades.farmSlots.push(upgradeData);
          }
          
          updatedUpgrades = await storage.updateBuildingUpgrades(userId, userUpgrades);
        } else {
          // Handle forge slots
          const existingSlotIndex = userUpgrades.forgeSlots.findIndex(
            (slot: any) => slot.slotId === slotId
          );
          
          if (existingSlotIndex >= 0) {
            // Increment existing slot level
            userUpgrades.forgeSlots[existingSlotIndex].level += 1;
            // Update path name if it was changed
            userUpgrades.forgeSlots[existingSlotIndex].upgradePath = upgradePath;
            userUpgrades.forgeSlots[existingSlotIndex].pathName = pathName;
            userUpgrades.forgeSlots[existingSlotIndex].timestamp = upgradeData.timestamp;
          } else {
            // Add new slot upgrade
            userUpgrades.forgeSlots.push(upgradeData);
          }
          
          updatedUpgrades = await storage.updateBuildingUpgrades(userId, userUpgrades);
        }
        
        return res.json({ 
          success: true, 
          upgrades: updatedUpgrades
        });
      } else {
        // Regular building upgrade
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
      }
    } catch (error) {
      console.error('Error upgrading building:', error);
      return res.status(500).json({ message: 'Failed to upgrade building' });
    }
  });
  
  // Get all building upgrades for current user
  app.get('/api/buildings/upgrades', authenticateUser, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }
      
      // Get all upgrades for this user
      const userUpgrades = await storage.getBuildingUpgradesByUserId(userId);
      
      if (!userUpgrades) {
        // Return empty default structure if no upgrades exist
        return res.json({
          farmSlots: [],
          forgeSlots: [],
          marketUpgrades: []
        });
      }
      
      return res.json(userUpgrades);
    } catch (error) {
      console.error('Error getting building upgrades:', error);
      return res.status(500).json({ message: 'Failed to get building upgrades' });
    }
  });
}
