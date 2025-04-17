import type { Express, Request, Response } from "express";
import { storage } from "./storage";
import { generateBattleLog } from "./new-battle-system";

/**
 * Process and generate a battle log for a dungeon run
 * @param run The dungeon run data
 * @param success Whether the run should succeed
 * @returns Battle log data
 */
async function processBattleLog(run: any, success: boolean): Promise<any[]> {
  // Check if we've already generated a battle log for this run
  if (run.battleLog && Array.isArray(run.battleLog) && run.battleLog.length > 0) {
    console.log('Using existing battle log for run', run.id);
    return run.battleLog;
  }
  
  // Process character IDs
  let characterIds: number[] = [];
  
  if (Array.isArray(run.characterIds)) {
    characterIds = run.characterIds;
  } else if (typeof run.characterIds === 'string') {
    try {
      characterIds = JSON.parse(run.characterIds);
    } catch (error) {
      console.error('Failed to parse character IDs:', error);
      characterIds = run.characterIds.split(',').map((id: string) => parseInt(id.trim()));
    }
  }
  
  console.log('Processing characters for battle log:', characterIds);
  
  // Set allies on run object for battle log generation
  run._allies = [];
  
  // Process each character
  for (const characterId of characterIds) {
    try {
      // Fetch character data
      const character = await storage.getCharacterById(characterId);
      
      if (!character) {
        console.warn(`Character ID ${characterId} not found, skipping...`);
        continue;
      }
      
      // Process auras for character
      const auras = await storage.getCharacterAuras(characterId);
      
      // Calculate aura bonuses
      const auraBonus = {
        attack: 0,
        vitality: 0,
        speed: 0,
        focus: 0,
        accuracy: 0,
        defense: 0,
        resilience: 0
      };
      
      if (auras && auras.length > 0) {
        auras.forEach(aura => {
          // Add stat bonuses directly from aura stats fields
          // Note: Auras are already filtered to only include those equipped on this character
          if (aura.attack) auraBonus.attack += aura.attack;
          if (aura.vitality) auraBonus.vitality += aura.vitality;
          if (aura.speed) auraBonus.speed += aura.speed;
          if (aura.focus) auraBonus.focus += aura.focus;
          if (aura.accuracy) auraBonus.accuracy += aura.accuracy;
          if (aura.defense) auraBonus.defense += aura.defense;
          if (aura.resilience) auraBonus.resilience += aura.resilience;
        });
      }
      
      // Create battle ally object with character data
      const ally = {
        id: `char-${character.id}`,
        name: character.name,
        level: character.level || 1,
        stats: {
          attack: character.attack || 10,
          vitality: character.vitality || 10,
          speed: character.speed || 10
        },
        auraBonus: Object.values(auraBonus).some(val => val > 0) ? auraBonus : null,
        skills: {
          basic: {
            name: "Basic Attack",
            damage: Math.floor((character.attack || 10) * 0.9),
            cooldown: 0
          },
          advanced: {
            name: "Quick Strike",
            damage: Math.floor((character.attack || 10) * 1.2),
            cooldown: 2
          },
          ultimate: {
            name: "Power Surge",
            damage: Math.floor((character.attack || 10) * 1.8),
            cooldown: 4
          }
        },
        // Set health values
        maxHp: (character.vitality || 10) * 8,
        hp: (character.vitality || 10) * 8,  // Start with full health
        attackMeter: 0,
        advancedSkillCooldown: 0,
        ultimateSkillCooldown: 0,
        statusEffects: []
      };
      
      // Add to allies list
      run._allies.push(ally);
    } catch (error) {
      console.error(`Error processing character ID ${characterId}:`, error);
    }
  }
  
  // Generate the battle log using the new battle system
  return await generateBattleLog(run, success);
}

/**
 * Register dungeon API routes
 * @param app Express application instance
 */
export function registerDungeonRoutes(app: Express) {
  // Get all dungeon types
  app.get('/api/dungeons/types', async (req: Request, res: Response) => {
    try {
      const dungeonTypes = await storage.getDungeonTypes();
      res.json(dungeonTypes);
    } catch (error) {
      console.error('Failed to fetch dungeon types:', error);
      res.status(500).json({ error: 'Failed to fetch dungeon types' });
    }
  });
  
  // Get all dungeon runs for the current user
  app.get('/api/dungeons/runs', async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      const runs = await storage.getDungeonRuns(req.session.userId);
      res.json(runs);
    } catch (error) {
      console.error('Failed to fetch dungeon runs:', error);
      res.status(500).json({ error: 'Failed to fetch dungeon runs' });
    }
  });
  
  // Start a new dungeon run
  app.post('/api/dungeons/start', async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      const { dungeonTypeId, dungeonName, dungeonLevel, characterIds, startTime, endTime } = req.body;
      
      if (!dungeonTypeId || !characterIds || characterIds.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Get dungeon type to retrieve element
      const dungeonType = await storage.getDungeonTypeById(dungeonTypeId);
      
      // Create the dungeon run
      const runData = {
        userId: req.session.userId,
        dungeonTypeId,
        dungeonName: dungeonName || 'Unknown Dungeon',
        dungeonLevel: dungeonLevel || 1,
        elementalType: dungeonType?.elementalType || 'neutral',
        characterIds,
        startTime: startTime || new Date().toISOString(),
        endTime: endTime || new Date(Date.now() + 3600000).toISOString(), // Default 1 hour
        completed: false,
        success: false,
        battleLog: null,
        totalStages: 3 // Default to 3 stages for standard dungeons
      };
      
      const run = await storage.createDungeonRun(runData);
      res.status(201).json(run);
    } catch (error) {
      console.error('Failed to start dungeon run:', error);
      res.status(500).json({ error: 'Failed to start dungeon run' });
    }
  });
  
  // Get a specific dungeon run
  app.get('/api/dungeons/runs/:id', async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      const runId = parseInt(req.params.id);
      const run = await storage.getDungeonRunById(runId);
      
      if (!run) {
        return res.status(404).json({ error: 'Dungeon run not found' });
      }
      
      if (run.userId !== req.session.userId) {
        return res.status(403).json({ error: 'Unauthorized access to dungeon run' });
      }
      
      res.json(run);
    } catch (error) {
      console.error('Failed to fetch dungeon run:', error);
      res.status(500).json({ error: 'Failed to fetch dungeon run' });
    }
  });
  
  // Get battle log for a dungeon run
  app.get('/api/dungeons/runs/:id/battlelog', async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      const runId = parseInt(req.params.id);
      const run = await storage.getDungeonRunById(runId);
      
      if (!run) {
        return res.status(404).json({ error: 'Dungeon run not found' });
      }
      
      if (run.userId !== req.session.userId) {
        return res.status(403).json({ error: 'Unauthorized access to dungeon run' });
      }
      
      // If run is not completed, we need to check if it's time to complete it
      if (!run.completed && new Date(run.endTime) <= new Date()) {
        // Determine success randomly (70% chance of success for testing)
        const success = Math.random() < 0.7;
        
        // Process the battle log
        // Make sure we include totalStages in the run object
        run.totalStages = run.totalStages || 3; // Default to 3 stages
        
        const battleLog = await processBattleLog(run, success);
        
        // Mark as completed but don't save yet
        run.completed = true;
        run.success = success;
        run.battleLog = battleLog;
        
        // Return the battle log
        res.json(battleLog);
      } else if (run.battleLog) {
        // Return existing battle log
        res.json(run.battleLog);
      } else {
        // Generate a preliminary battle log (not saved)
        const preliminaryLog = [
          {
            type: 'system_message',
            message: 'The dungeon run is still in progress. Check back later for the battle log.',
            timestamp: Date.now()
          }
        ];
        res.json(preliminaryLog);
      }
    } catch (error) {
      console.error('Failed to fetch battle log:', error);
      res.status(500).json({ error: 'Failed to fetch battle log' });
    }
  });
  
  // Complete a dungeon run
  app.post('/api/dungeons/complete/:id', async (req: Request, res: Response) => {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    try {
      const runId = parseInt(req.params.id);
      const run = await storage.getDungeonRunById(runId);
      
      if (!run) {
        return res.status(404).json({ error: 'Dungeon run not found' });
      }
      
      if (run.userId !== req.session.userId) {
        return res.status(403).json({ error: 'Unauthorized access to dungeon run' });
      }
      
      // If already completed, just return the run
      if (run.completed) {
        return res.json({ 
          success: run.success, 
          message: run.success ? 'Dungeon already completed successfully' : 'Dungeon was already failed'
        });
      }
      
      // Determine if run is successful (70% chance for testing)
      const success = Math.random() < 0.7;
      
      // Create a battle log if needed
      if (!run.battleLog) {
        // Make sure we include totalStages
        run.totalStages = run.totalStages || 3; // Default to 3 stages
        run.battleLog = await processBattleLog(run, success);
      }
      
      // Update run status
      const updatedRun = await storage.updateDungeonRun(runId, {
        completed: true,
        success,
        battleLog: run.battleLog
      });
      
      // TODO: Award rewards based on dungeon level and success/failure
      
      res.json({ 
        success, 
        message: success ? 'Dungeon completed successfully' : 'Dungeon run failed',
        updatedRun
      });
    } catch (error) {
      console.error('Failed to complete dungeon run:', error);
      res.status(500).json({ error: 'Failed to complete dungeon run' });
    }
  });
}