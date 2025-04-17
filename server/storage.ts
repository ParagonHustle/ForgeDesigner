import { db } from './db';
import {
  users, characters, auras, resources, farmingTasks, dungeonTypes, dungeonRuns,
  forgingTasks, blackMarketListings, bountyQuests, buildingUpgrades, activityLogs, metadata,
  type User, type InsertUser, type Character, type InsertCharacter,
  type Aura, type InsertAura, type Resource, type InsertResource,
  type FarmingTask, type InsertFarmingTask, 
  type DungeonType, type InsertDungeonType, type DungeonRun, type InsertDungeonRun,
  type ForgingTask, type InsertForgingTask, type BlackMarketListing, type InsertBlackMarketListing,
  type BountyQuest, type InsertBountyQuest, type BuildingUpgrade, type InsertBuildingUpgrade,
  type ActivityLog, type InsertActivityLog, type Metadata, type InsertMetadata
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface IStorage {
  // User methods
  getUserById(id: number): Promise<User | undefined>;
  getUserByDiscordId(discordId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Character methods
  getCharacters(userId: number): Promise<Character[]>;
  getCharacterById(id: number): Promise<Character | undefined>;
  createCharacter(character: InsertCharacter): Promise<Character>;
  updateCharacter(id: number, updates: Partial<Character>): Promise<Character | undefined>;
  deleteCharacter(id: number): Promise<boolean>;
  getActiveCharacterTasks(characterId: number): Promise<(FarmingTask | ForgingTask)[]>;
  
  // Aura methods
  getAuras(userId: number): Promise<Aura[]>;
  getAuraById(id: number): Promise<Aura | undefined>;
  getCharacterAuras(characterId: number): Promise<Aura[]>;
  createAura(aura: InsertAura): Promise<Aura>;
  updateAura(id: number, updates: Partial<Aura>): Promise<Aura | undefined>;
  deleteAura(id: number): Promise<boolean>;
  
  // Resource methods
  getResources(userId: number): Promise<Resource[]>;
  getResourceByNameAndUserId(name: string, userId: number): Promise<Resource | undefined>;
  createResource(resource: InsertResource): Promise<Resource>;
  updateResource(id: number, updates: Partial<Resource>): Promise<Resource | undefined>;
  
  // Farming Task methods
  getFarmingTasks(userId: number): Promise<FarmingTask[]>;
  getFarmingTaskById(id: number): Promise<FarmingTask | undefined>;
  createFarmingTask(task: InsertFarmingTask): Promise<FarmingTask>;
  updateFarmingTask(id: number, updates: Partial<FarmingTask>): Promise<FarmingTask | undefined>;
  deleteFarmingTask(id: number): Promise<boolean>;
  
  // Dungeon Type methods
  getDungeonTypes(): Promise<DungeonType[]>;
  getDungeonTypeById(id: number): Promise<DungeonType | undefined>;
  getDungeonTypesByElement(elementalType: string): Promise<DungeonType[]>;
  getDungeonTypesByDifficulty(difficulty: string): Promise<DungeonType[]>;
  createDungeonType(dungeonType: InsertDungeonType): Promise<DungeonType>;
  updateDungeonType(id: number, updates: Partial<DungeonType>): Promise<DungeonType | undefined>;
  
  // Dungeon Run methods
  getDungeonRuns(userId: number): Promise<DungeonRun[]>;
  getDungeonRunById(id: number): Promise<DungeonRun | undefined>;
  createDungeonRun(run: InsertDungeonRun): Promise<DungeonRun>;
  updateDungeonRun(id: number, updates: Partial<DungeonRun>): Promise<DungeonRun | undefined>;
  
  // Forging Task methods
  getForgingTasks(userId: number): Promise<ForgingTask[]>;
  getForgingTaskById(id: number): Promise<ForgingTask | undefined>;
  createForgingTask(task: InsertForgingTask): Promise<ForgingTask>;
  updateForgingTask(id: number, updates: Partial<ForgingTask>): Promise<ForgingTask | undefined>;
  
  // Black Market methods
  getBlackMarketListings(userId?: number): Promise<BlackMarketListing[]>;
  getBlackMarketListingById(id: number): Promise<BlackMarketListing | undefined>;
  createBlackMarketListing(listing: InsertBlackMarketListing): Promise<BlackMarketListing>;
  updateBlackMarketListing(id: number, updates: Partial<BlackMarketListing>): Promise<BlackMarketListing | undefined>;
  deleteBlackMarketListing(id: number): Promise<boolean>;
  
  // Bounty Quest methods
  getBountyQuests(userId: number): Promise<BountyQuest[]>;
  getBountyQuestById(id: number): Promise<BountyQuest | undefined>;
  createBountyQuest(quest: InsertBountyQuest): Promise<BountyQuest>;
  updateBountyQuest(id: number, updates: Partial<BountyQuest>): Promise<BountyQuest | undefined>;
  
  // Building Upgrade methods
  getBuildingUpgrades(userId: number): Promise<BuildingUpgrade[]>;
  getBuildingUpgradeByTypeAndUserId(buildingType: string, userId: number): Promise<BuildingUpgrade | undefined>;
  createBuildingUpgrade(upgrade: InsertBuildingUpgrade): Promise<BuildingUpgrade>;
  updateBuildingUpgrade(id: number, updates: Partial<BuildingUpgrade>): Promise<BuildingUpgrade | undefined>;
  
  // Activity Log methods
  getActivityLogs(userId: number, limit?: number): Promise<ActivityLog[]>;
  createActivityLog(log: InsertActivityLog): Promise<ActivityLog>;
}

export class DatabaseStorage implements IStorage {
  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.discordId, discordId));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async getCharacters(userId: number): Promise<Character[]> {
    return db.select().from(characters).where(eq(characters.userId, userId));
  }

  async getCharacterById(id: number): Promise<Character | undefined> {
    const [character] = await db.select().from(characters).where(eq(characters.id, id));
    return character;
  }

  async createCharacter(character: InsertCharacter): Promise<Character> {
    const [newCharacter] = await db.insert(characters).values(character).returning();
    return newCharacter;
  }

  async updateCharacter(id: number, updates: Partial<Character>): Promise<Character | undefined> {
    const [updatedCharacter] = await db.update(characters)
      .set(updates)
      .where(eq(characters.id, id))
      .returning();
    return updatedCharacter;
  }

  async deleteCharacter(id: number): Promise<boolean> {
    const result = await db.delete(characters).where(eq(characters.id, id));
    return !!result.rowCount;
  }
  
  async getActiveCharacterTasks(characterId: number): Promise<(FarmingTask | ForgingTask)[]> {
    // Get active farming tasks
    const activeFarmingTasks = await db.select()
      .from(farmingTasks)
      .where(
        and(
          eq(farmingTasks.characterId, characterId),
          eq(farmingTasks.completed, false)
        )
      );
    
    // Get active forging tasks
    const activeForgingTasks = await db.select()
      .from(forgingTasks)
      .where(
        and(
          eq(forgingTasks.characterId, characterId),
          eq(forgingTasks.completed, false)
        )
      );
    
    // Combine both task types
    return [...activeFarmingTasks, ...activeForgingTasks];
  }

  async getAuras(userId: number): Promise<Aura[]> {
    return db.select().from(auras).where(eq(auras.userId, userId));
  }

  async getAuraById(id: number): Promise<Aura | undefined> {
    const [aura] = await db.select().from(auras).where(eq(auras.id, id));
    return aura;
  }

  async createAura(aura: InsertAura): Promise<Aura> {
    const [newAura] = await db.insert(auras).values(aura).returning();
    return newAura;
  }

  async updateAura(id: number, updates: Partial<Aura>): Promise<Aura | undefined> {
    const [updatedAura] = await db.update(auras)
      .set(updates)
      .where(eq(auras.id, id))
      .returning();
    return updatedAura;
  }

  async deleteAura(id: number): Promise<boolean> {
    const result = await db.delete(auras).where(eq(auras.id, id));
    return !!result.rowCount;
  }
  
  async getCharacterAuras(characterId: number): Promise<Aura[]> {
    // Find the character first to get its userId
    const character = await this.getCharacterById(characterId);
    if (!character) {
      return [];
    }
    
    // Get all auras for this user that are equipped on this character
    return db.select()
      .from(auras)
      .where(
        and(
          eq(auras.userId, character.userId),
          eq(auras.equippedByCharacterId, characterId)
        )
      );
  }

  async getResources(userId: number): Promise<Resource[]> {
    return db.select().from(resources).where(eq(resources.userId, userId));
  }

  async getResourceByNameAndUserId(name: string, userId: number): Promise<Resource | undefined> {
    const [resource] = await db.select().from(resources)
      .where(and(eq(resources.name, name), eq(resources.userId, userId)));
    return resource;
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const [newResource] = await db.insert(resources).values(resource).returning();
    return newResource;
  }

  async updateResource(id: number, updates: Partial<Resource>): Promise<Resource | undefined> {
    const [updatedResource] = await db.update(resources)
      .set(updates)
      .where(eq(resources.id, id))
      .returning();
    return updatedResource;
  }

  async getFarmingTasks(userId: number): Promise<FarmingTask[]> {
    return db.select().from(farmingTasks).where(eq(farmingTasks.userId, userId));
  }

  async getFarmingTaskById(id: number): Promise<FarmingTask | undefined> {
    const [task] = await db.select().from(farmingTasks).where(eq(farmingTasks.id, id));
    return task;
  }

  async createFarmingTask(task: InsertFarmingTask): Promise<FarmingTask> {
    const [newTask] = await db.insert(farmingTasks).values(task).returning();
    return newTask;
  }

  async updateFarmingTask(id: number, updates: Partial<FarmingTask>): Promise<FarmingTask | undefined> {
    const [updatedTask] = await db.update(farmingTasks)
      .set(updates)
      .where(eq(farmingTasks.id, id))
      .returning();
    return updatedTask;
  }

  async deleteFarmingTask(id: number): Promise<boolean> {
    const result = await db.delete(farmingTasks).where(eq(farmingTasks.id, id));
    return !!result.rowCount;
  }

  async getDungeonTypes(): Promise<DungeonType[]> {
    return db.select().from(dungeonTypes);
  }

  async getDungeonTypeById(id: number): Promise<DungeonType | undefined> {
    const [dungeonType] = await db.select().from(dungeonTypes).where(eq(dungeonTypes.id, id));
    return dungeonType;
  }

  async getDungeonTypesByElement(elementalType: string): Promise<DungeonType[]> {
    return db.select().from(dungeonTypes).where(eq(dungeonTypes.elementalType, elementalType));
  }

  async getDungeonTypesByDifficulty(difficulty: string): Promise<DungeonType[]> {
    return db.select().from(dungeonTypes).where(eq(dungeonTypes.difficulty, difficulty));
  }

  async createDungeonType(dungeonType: InsertDungeonType): Promise<DungeonType> {
    const [newDungeonType] = await db.insert(dungeonTypes).values(dungeonType).returning();
    return newDungeonType;
  }

  async updateDungeonType(id: number, updates: Partial<DungeonType>): Promise<DungeonType | undefined> {
    const [updatedDungeonType] = await db.update(dungeonTypes)
      .set(updates)
      .where(eq(dungeonTypes.id, id))
      .returning();
    return updatedDungeonType;
  }

  async getDungeonRuns(userId: number): Promise<DungeonRun[]> {
    return db.select().from(dungeonRuns).where(eq(dungeonRuns.userId, userId));
  }

  async getDungeonRunById(id: number): Promise<DungeonRun | undefined> {
    const [run] = await db.select().from(dungeonRuns).where(eq(dungeonRuns.id, id));
    return run;
  }

  async createDungeonRun(run: InsertDungeonRun): Promise<DungeonRun> {
    const [newRun] = await db.insert(dungeonRuns).values(run).returning();
    return newRun;
  }

  async updateDungeonRun(id: number, updates: Partial<DungeonRun>): Promise<DungeonRun | undefined> {
    const [updatedRun] = await db.update(dungeonRuns)
      .set(updates)
      .where(eq(dungeonRuns.id, id))
      .returning();
    return updatedRun;
  }

  async getForgingTasks(userId: number): Promise<ForgingTask[]> {
    return db.select().from(forgingTasks).where(eq(forgingTasks.userId, userId));
  }

  async getForgingTaskById(id: number): Promise<ForgingTask | undefined> {
    const [task] = await db.select().from(forgingTasks).where(eq(forgingTasks.id, id));
    return task;
  }

  async createForgingTask(task: InsertForgingTask): Promise<ForgingTask> {
    const [newTask] = await db.insert(forgingTasks).values(task).returning();
    return newTask;
  }

  async updateForgingTask(id: number, updates: Partial<ForgingTask>): Promise<ForgingTask | undefined> {
    const [updatedTask] = await db.update(forgingTasks)
      .set(updates)
      .where(eq(forgingTasks.id, id))
      .returning();
    return updatedTask;
  }

  async getBlackMarketListings(userId?: number): Promise<BlackMarketListing[]> {
    if (userId) {
      return db.select().from(blackMarketListings).where(eq(blackMarketListings.userId, userId));
    }
    return db.select().from(blackMarketListings);
  }

  async getBlackMarketListingById(id: number): Promise<BlackMarketListing | undefined> {
    const [listing] = await db.select().from(blackMarketListings).where(eq(blackMarketListings.id, id));
    return listing;
  }

  async createBlackMarketListing(listing: InsertBlackMarketListing): Promise<BlackMarketListing> {
    const [newListing] = await db.insert(blackMarketListings).values(listing).returning();
    return newListing;
  }

  async updateBlackMarketListing(id: number, updates: Partial<BlackMarketListing>): Promise<BlackMarketListing | undefined> {
    const [updatedListing] = await db.update(blackMarketListings)
      .set(updates)
      .where(eq(blackMarketListings.id, id))
      .returning();
    return updatedListing;
  }

  async deleteBlackMarketListing(id: number): Promise<boolean> {
    const result = await db.delete(blackMarketListings).where(eq(blackMarketListings.id, id));
    return !!result.rowCount;
  }

  async getBountyQuests(userId: number): Promise<BountyQuest[]> {
    return db.select().from(bountyQuests).where(eq(bountyQuests.userId, userId));
  }

  async getBountyQuestById(id: number): Promise<BountyQuest | undefined> {
    const [quest] = await db.select().from(bountyQuests).where(eq(bountyQuests.id, id));
    return quest;
  }

  async createBountyQuest(quest: InsertBountyQuest): Promise<BountyQuest> {
    const [newQuest] = await db.insert(bountyQuests).values(quest).returning();
    return newQuest;
  }

  async updateBountyQuest(id: number, updates: Partial<BountyQuest>): Promise<BountyQuest | undefined> {
    const [updatedQuest] = await db.update(bountyQuests)
      .set(updates)
      .where(eq(bountyQuests.id, id))
      .returning();
    return updatedQuest;
  }

  async getBuildingUpgrades(userId: number): Promise<BuildingUpgrade[]> {
    return db.select().from(buildingUpgrades).where(eq(buildingUpgrades.userId, userId));
  }

  async getBuildingUpgradeByTypeAndUserId(buildingType: string, userId: number): Promise<BuildingUpgrade | undefined> {
    const [upgrade] = await db.select().from(buildingUpgrades)
      .where(and(eq(buildingUpgrades.buildingType, buildingType), eq(buildingUpgrades.userId, userId)));
    return upgrade;
  }

  async createBuildingUpgrade(upgrade: InsertBuildingUpgrade): Promise<BuildingUpgrade> {
    const [newUpgrade] = await db.insert(buildingUpgrades).values(upgrade).returning();
    return newUpgrade;
  }

  async updateBuildingUpgrade(id: number, updates: Partial<BuildingUpgrade>): Promise<BuildingUpgrade | undefined> {
    const [updatedUpgrade] = await db.update(buildingUpgrades)
      .set(updates)
      .where(eq(buildingUpgrades.id, id))
      .returning();
    return updatedUpgrade;
  }

  async getActivityLogs(userId: number, limit?: number): Promise<ActivityLog[]> {
    const baseQuery = db.select()
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.timestamp));

    if (limit) {
      return baseQuery.limit(limit);
    }

    return baseQuery;
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const [newLog] = await db.insert(activityLogs).values(log).returning();
    return newLog;
  }

  // Building upgrade methods
  async getBuildingById(id: number): Promise<any | undefined> {
    // This is a placeholder implementation. In a real app, we would have a buildings table
    // For now, we'll return a mock building object
    return {
      id,
      name: 'Mock Building',
      level: 1,
      maxLevel: 5
    };
  }

  async upgradeBuilding(id: number): Promise<any> {
    // This is a placeholder implementation
    return {
      id,
      name: 'Mock Building',
      level: 2, // Incremented level
      maxLevel: 5
    };
  }

  // Building upgrades with skill paths
  async getBuildingUpgradesByUserId(userId: number): Promise<any | undefined> {
    try {
      // Get building upgrades from the metadata table
      const [existingData] = await db.select()
        .from(metadata)
        .where(and(
          eq(metadata.userId, userId),
          eq(metadata.key, 'building_upgrades')
        ));

      if (existingData && existingData.value) {
        return JSON.parse(existingData.value);
      }
      return undefined;
    } catch (error) {
      console.error('Error getting building upgrades:', error);
      return undefined;
    }
  }

  async createBuildingUpgrades(data: any): Promise<any> {
    try {
      // Store the building upgrades in the metadata table as JSON
      const [newData] = await db.insert(metadata)
        .values({
          userId: data.userId,
          key: 'building_upgrades',
          value: JSON.stringify(data)
        })
        .returning();

      return JSON.parse(newData.value);
    } catch (error) {
      console.error('Error creating building upgrades:', error);
      throw error;
    }
  }

  async updateBuildingUpgrades(userId: number, data: any): Promise<any> {
    try {
      // Update the existing building upgrades in the metadata table
      const [updatedData] = await db.update(metadata)
        .set({
          value: JSON.stringify(data)
        })
        .where(and(
          eq(metadata.userId, userId),
          eq(metadata.key, 'building_upgrades')
        ))
        .returning();

      if (!updatedData) {
        // If no records were updated, insert a new one
        return this.createBuildingUpgrades(data);
      }

      return JSON.parse(updatedData.value);
    } catch (error) {
      console.error('Error updating building upgrades:', error);
      throw error;
    }
  }
}

export const storage = new DatabaseStorage();