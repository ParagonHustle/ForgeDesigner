import {
  users, characters, auras, resources, farmingTasks, dungeonRuns,
  forgingTasks, blackMarketListings, bountyQuests, buildingUpgrades,
  activityLogs,
  type User, type InsertUser,
  type Character, type InsertCharacter,
  type Aura, type InsertAura,
  type Resource, type InsertResource,
  type FarmingTask, type InsertFarmingTask,
  type DungeonRun, type InsertDungeonRun,
  type ForgingTask, type InsertForgingTask,
  type BlackMarketListing, type InsertBlackMarketListing,
  type BountyQuest, type InsertBountyQuest,
  type BuildingUpgrade, type InsertBuildingUpgrade,
  type ActivityLog, type InsertActivityLog
} from "@shared/schema";

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
  
  // Aura methods
  getAuras(userId: number): Promise<Aura[]>;
  getAuraById(id: number): Promise<Aura | undefined>;
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private characters: Map<number, Character>;
  private auras: Map<number, Aura>;
  private resources: Map<number, Resource>;
  private farmingTasks: Map<number, FarmingTask>;
  private dungeonRuns: Map<number, DungeonRun>;
  private forgingTasks: Map<number, ForgingTask>;
  private blackMarketListings: Map<number, BlackMarketListing>;
  private bountyQuests: Map<number, BountyQuest>;
  private buildingUpgrades: Map<number, BuildingUpgrade>;
  private activityLogs: Map<number, ActivityLog>;
  
  private userIdCounter: number;
  private characterIdCounter: number;
  private auraIdCounter: number;
  private resourceIdCounter: number;
  private farmingTaskIdCounter: number;
  private dungeonRunIdCounter: number;
  private forgingTaskIdCounter: number;
  private blackMarketListingIdCounter: number;
  private bountyQuestIdCounter: number;
  private buildingUpgradeIdCounter: number;
  private activityLogIdCounter: number;

  constructor() {
    this.users = new Map();
    this.characters = new Map();
    this.auras = new Map();
    this.resources = new Map();
    this.farmingTasks = new Map();
    this.dungeonRuns = new Map();
    this.forgingTasks = new Map();
    this.blackMarketListings = new Map();
    this.bountyQuests = new Map();
    this.buildingUpgrades = new Map();
    this.activityLogs = new Map();
    
    this.userIdCounter = 1;
    this.characterIdCounter = 1;
    this.auraIdCounter = 1;
    this.resourceIdCounter = 1;
    this.farmingTaskIdCounter = 1;
    this.dungeonRunIdCounter = 1;
    this.forgingTaskIdCounter = 1;
    this.blackMarketListingIdCounter = 1;
    this.bountyQuestIdCounter = 1;
    this.buildingUpgradeIdCounter = 1;
    this.activityLogIdCounter = 1;
  }

  // User methods
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByDiscordId(discordId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.discordId === discordId);
  }

  async createUser(user: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const newUser: User = { ...user, id, lastLogin: new Date() };
    this.users.set(id, newUser);
    return newUser;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  // Character methods
  async getCharacters(userId: number): Promise<Character[]> {
    return Array.from(this.characters.values()).filter(
      character => character.userId === userId
    );
  }

  async getCharacterById(id: number): Promise<Character | undefined> {
    return this.characters.get(id);
  }

  async createCharacter(character: InsertCharacter): Promise<Character> {
    const id = this.characterIdCounter++;
    const newCharacter: Character = { ...character, id };
    this.characters.set(id, newCharacter);
    return newCharacter;
  }

  async updateCharacter(id: number, updates: Partial<Character>): Promise<Character | undefined> {
    const character = this.characters.get(id);
    if (!character) return undefined;
    
    const updatedCharacter = { ...character, ...updates };
    this.characters.set(id, updatedCharacter);
    return updatedCharacter;
  }

  async deleteCharacter(id: number): Promise<boolean> {
    return this.characters.delete(id);
  }

  // Aura methods
  async getAuras(userId: number): Promise<Aura[]> {
    return Array.from(this.auras.values()).filter(
      aura => aura.userId === userId
    );
  }

  async getAuraById(id: number): Promise<Aura | undefined> {
    return this.auras.get(id);
  }

  async createAura(aura: InsertAura): Promise<Aura> {
    const id = this.auraIdCounter++;
    const newAura: Aura = { ...aura, id };
    this.auras.set(id, newAura);
    return newAura;
  }

  async updateAura(id: number, updates: Partial<Aura>): Promise<Aura | undefined> {
    const aura = this.auras.get(id);
    if (!aura) return undefined;
    
    const updatedAura = { ...aura, ...updates };
    this.auras.set(id, updatedAura);
    return updatedAura;
  }

  async deleteAura(id: number): Promise<boolean> {
    return this.auras.delete(id);
  }

  // Resource methods
  async getResources(userId: number): Promise<Resource[]> {
    return Array.from(this.resources.values()).filter(
      resource => resource.userId === userId
    );
  }

  async getResourceByNameAndUserId(name: string, userId: number): Promise<Resource | undefined> {
    return Array.from(this.resources.values()).find(
      resource => resource.name === name && resource.userId === userId
    );
  }

  async createResource(resource: InsertResource): Promise<Resource> {
    const id = this.resourceIdCounter++;
    const newResource: Resource = { ...resource, id };
    this.resources.set(id, newResource);
    return newResource;
  }

  async updateResource(id: number, updates: Partial<Resource>): Promise<Resource | undefined> {
    const resource = this.resources.get(id);
    if (!resource) return undefined;
    
    const updatedResource = { ...resource, ...updates };
    this.resources.set(id, updatedResource);
    return updatedResource;
  }

  // Farming Task methods
  async getFarmingTasks(userId: number): Promise<FarmingTask[]> {
    return Array.from(this.farmingTasks.values()).filter(
      task => task.userId === userId
    );
  }

  async getFarmingTaskById(id: number): Promise<FarmingTask | undefined> {
    return this.farmingTasks.get(id);
  }

  async createFarmingTask(task: InsertFarmingTask): Promise<FarmingTask> {
    const id = this.farmingTaskIdCounter++;
    const newTask: FarmingTask = { ...task, id };
    this.farmingTasks.set(id, newTask);
    return newTask;
  }

  async updateFarmingTask(id: number, updates: Partial<FarmingTask>): Promise<FarmingTask | undefined> {
    const task = this.farmingTasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...updates };
    this.farmingTasks.set(id, updatedTask);
    return updatedTask;
  }

  async deleteFarmingTask(id: number): Promise<boolean> {
    return this.farmingTasks.delete(id);
  }

  // Dungeon Run methods
  async getDungeonRuns(userId: number): Promise<DungeonRun[]> {
    return Array.from(this.dungeonRuns.values()).filter(
      run => run.userId === userId
    );
  }

  async getDungeonRunById(id: number): Promise<DungeonRun | undefined> {
    return this.dungeonRuns.get(id);
  }

  async createDungeonRun(run: InsertDungeonRun): Promise<DungeonRun> {
    const id = this.dungeonRunIdCounter++;
    const newRun: DungeonRun = { ...run, id };
    this.dungeonRuns.set(id, newRun);
    return newRun;
  }

  async updateDungeonRun(id: number, updates: Partial<DungeonRun>): Promise<DungeonRun | undefined> {
    const run = this.dungeonRuns.get(id);
    if (!run) return undefined;
    
    const updatedRun = { ...run, ...updates };
    this.dungeonRuns.set(id, updatedRun);
    return updatedRun;
  }

  // Forging Task methods
  async getForgingTasks(userId: number): Promise<ForgingTask[]> {
    return Array.from(this.forgingTasks.values()).filter(
      task => task.userId === userId
    );
  }

  async getForgingTaskById(id: number): Promise<ForgingTask | undefined> {
    return this.forgingTasks.get(id);
  }

  async createForgingTask(task: InsertForgingTask): Promise<ForgingTask> {
    const id = this.forgingTaskIdCounter++;
    const newTask: ForgingTask = { ...task, id };
    this.forgingTasks.set(id, newTask);
    return newTask;
  }

  async updateForgingTask(id: number, updates: Partial<ForgingTask>): Promise<ForgingTask | undefined> {
    const task = this.forgingTasks.get(id);
    if (!task) return undefined;
    
    const updatedTask = { ...task, ...updates };
    this.forgingTasks.set(id, updatedTask);
    return updatedTask;
  }

  // Black Market methods
  async getBlackMarketListings(userId?: number): Promise<BlackMarketListing[]> {
    const allListings = Array.from(this.blackMarketListings.values());
    if (userId) {
      return allListings.filter(listing => listing.userId === userId);
    }
    return allListings;
  }

  async getBlackMarketListingById(id: number): Promise<BlackMarketListing | undefined> {
    return this.blackMarketListings.get(id);
  }

  async createBlackMarketListing(listing: InsertBlackMarketListing): Promise<BlackMarketListing> {
    const id = this.blackMarketListingIdCounter++;
    const newListing: BlackMarketListing = { ...listing, id };
    this.blackMarketListings.set(id, newListing);
    return newListing;
  }

  async updateBlackMarketListing(id: number, updates: Partial<BlackMarketListing>): Promise<BlackMarketListing | undefined> {
    const listing = this.blackMarketListings.get(id);
    if (!listing) return undefined;
    
    const updatedListing = { ...listing, ...updates };
    this.blackMarketListings.set(id, updatedListing);
    return updatedListing;
  }

  async deleteBlackMarketListing(id: number): Promise<boolean> {
    return this.blackMarketListings.delete(id);
  }

  // Bounty Quest methods
  async getBountyQuests(userId: number): Promise<BountyQuest[]> {
    return Array.from(this.bountyQuests.values()).filter(
      quest => quest.userId === userId
    );
  }

  async getBountyQuestById(id: number): Promise<BountyQuest | undefined> {
    return this.bountyQuests.get(id);
  }

  async createBountyQuest(quest: InsertBountyQuest): Promise<BountyQuest> {
    const id = this.bountyQuestIdCounter++;
    const newQuest: BountyQuest = { ...quest, id };
    this.bountyQuests.set(id, newQuest);
    return newQuest;
  }

  async updateBountyQuest(id: number, updates: Partial<BountyQuest>): Promise<BountyQuest | undefined> {
    const quest = this.bountyQuests.get(id);
    if (!quest) return undefined;
    
    const updatedQuest = { ...quest, ...updates };
    this.bountyQuests.set(id, updatedQuest);
    return updatedQuest;
  }

  // Building Upgrade methods
  async getBuildingUpgrades(userId: number): Promise<BuildingUpgrade[]> {
    return Array.from(this.buildingUpgrades.values()).filter(
      upgrade => upgrade.userId === userId
    );
  }

  async getBuildingUpgradeByTypeAndUserId(buildingType: string, userId: number): Promise<BuildingUpgrade | undefined> {
    return Array.from(this.buildingUpgrades.values()).find(
      upgrade => upgrade.buildingType === buildingType && upgrade.userId === userId
    );
  }

  async createBuildingUpgrade(upgrade: InsertBuildingUpgrade): Promise<BuildingUpgrade> {
    const id = this.buildingUpgradeIdCounter++;
    const newUpgrade: BuildingUpgrade = { ...upgrade, id };
    this.buildingUpgrades.set(id, newUpgrade);
    return newUpgrade;
  }

  async updateBuildingUpgrade(id: number, updates: Partial<BuildingUpgrade>): Promise<BuildingUpgrade | undefined> {
    const upgrade = this.buildingUpgrades.get(id);
    if (!upgrade) return undefined;
    
    const updatedUpgrade = { ...upgrade, ...updates };
    this.buildingUpgrades.set(id, updatedUpgrade);
    return updatedUpgrade;
  }

  // Activity Log methods
  async getActivityLogs(userId: number, limit?: number): Promise<ActivityLog[]> {
    const logs = Array.from(this.activityLogs.values())
      .filter(log => log.userId === userId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    if (limit) {
      return logs.slice(0, limit);
    }
    return logs;
  }

  async createActivityLog(log: InsertActivityLog): Promise<ActivityLog> {
    const id = this.activityLogIdCounter++;
    const newLog: ActivityLog = { ...log, id };
    this.activityLogs.set(id, newLog);
    return newLog;
  }
}

export const storage = new MemStorage();
