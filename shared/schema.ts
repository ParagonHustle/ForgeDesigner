import { pgTable, text, serial, integer, boolean, timestamp, json, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  discordId: text("discord_id").notNull().unique(),
  username: text("username").notNull(),
  avatarUrl: text("avatar_url"),
  roles: text("roles").array(),
  lastLogin: timestamp("last_login").defaultNow(),
  forgeTokens: integer("forge_tokens").default(0),
  rogueCredits: integer("rogue_credits").default(0),
  soulShards: integer("soul_shards").default(0),
  townhallLevel: integer("townhall_level").default(1),
  forgeLevel: integer("forge_level").default(1),
  blackMarketLevel: integer("black_market_level").default(1),
  bountyBoardLevel: integer("bounty_board_level").default(1),
  tavernLevel: integer("tavern_level").default(1),
});

// Character model
export const characters = pgTable("characters", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  level: integer("level").default(1),
  class: text("class").notNull(), 
  rarity: text("rarity").notNull(),
  avatarUrl: text("avatar_url").notNull(),
  equippedAuraId: integer("equipped_aura_id"),
  attack: integer("attack").default(10),
  defense: integer("defense").default(10),
  health: integer("health").default(100),
  speed: integer("speed").default(10),
  vitality: integer("vitality").default(10),
  intelligence: integer("intelligence").default(10),
  luck: integer("luck").default(10),
  passiveSkill: text("passive_skill"),
  isActive: boolean("is_active").default(false),
  activityType: text("activity_type"), // 'farming', 'dungeon', null
  activityEndTime: timestamp("activity_end_time"),
});

// Aura model
export const auras = pgTable("auras", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  level: integer("level").default(1),
  element: text("element").notNull(), // fire, water, earth, air, light, dark
  rarity: text("rarity").notNull(), // common, rare, epic, legendary
  tier: integer("tier").default(1),
  statMultipliers: jsonb("stat_multipliers").notNull(), // attack, defense, health, etc.
  skills: jsonb("skills").array(),
  equippedByCharacterId: integer("equipped_by_character_id"),
  isFusing: boolean("is_fusing").default(false),
  fusionEndTime: timestamp("fusion_end_time"),
});

// Resource model
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  type: text("type").notNull(), // material, currency, upgrade
  quantity: integer("quantity").default(0),
  description: text("description"),
  iconUrl: text("icon_url"),
});

// Farming task model
export const farmingTasks = pgTable("farming_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  characterId: integer("character_id").notNull(),
  resourceName: text("resource_name").notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time").notNull(),
  completed: boolean("completed").default(false),
  slotIndex: integer("slot_index").notNull(),
});

// Dungeon run model
export const dungeonRuns = pgTable("dungeon_runs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  dungeonName: text("dungeon_name").notNull(),
  dungeonLevel: integer("dungeon_level").notNull(),
  characterIds: integer("character_ids").array().notNull(),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time").notNull(),
  completed: boolean("completed").default(false),
  success: boolean("success"),
  rewards: jsonb("rewards"),
  battleLog: jsonb("battle_log"),
});

// Forging task model
export const forgingTasks = pgTable("forging_tasks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  taskType: text("task_type").notNull(), // 'craft', 'fusion'
  primaryAuraId: integer("primary_aura_id"),
  secondaryAuraId: integer("secondary_aura_id"),
  targetElement: text("target_element"),
  targetRarity: text("target_rarity"),
  requiredMaterials: jsonb("required_materials"),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time").notNull(),
  completed: boolean("completed").default(false),
  resultAuraId: integer("result_aura_id"),
});

// Black Market listing model
export const blackMarketListings = pgTable("black_market_listings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  itemType: text("item_type").notNull(), // 'character', 'aura', 'resource'
  itemId: integer("item_id").notNull(),
  price: integer("price").notNull(),
  currencyType: text("currency_type").notNull(), // 'forgeTokens', 'rogueCredits'
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  sold: boolean("sold").default(false),
});

// Bounty quest model
export const bountyQuests = pgTable("bounty_quests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  requirements: jsonb("requirements").notNull(),
  rewards: jsonb("rewards").notNull(),
  difficulty: text("difficulty").notNull(), // 'easy', 'medium', 'hard', 'epic'
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  completed: boolean("completed").default(false),
});

// Building upgrade model
export const buildingUpgrades = pgTable("building_upgrades", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  buildingType: text("building_type").notNull(), // 'townhall', 'forge', 'blackmarket', etc.
  currentLevel: integer("current_level").notNull(),
  upgradeStartTime: timestamp("upgrade_start_time"),
  upgradeEndTime: timestamp("upgrade_end_time"),
  upgradeInProgress: boolean("upgrade_in_progress").default(false),
  unlockedSkills: text("unlocked_skills").array(),
});

// Activity log model
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  activityType: text("activity_type").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  relatedIds: jsonb("related_ids"),
});

// Define insert schemas for each model
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertCharacterSchema = createInsertSchema(characters).omit({ id: true });
export const insertAuraSchema = createInsertSchema(auras).omit({ id: true });
export const insertResourceSchema = createInsertSchema(resources).omit({ id: true });
export const insertFarmingTaskSchema = createInsertSchema(farmingTasks).omit({ id: true });
export const insertDungeonRunSchema = createInsertSchema(dungeonRuns).omit({ id: true });
export const insertForgingTaskSchema = createInsertSchema(forgingTasks).omit({ id: true });
export const insertBlackMarketListingSchema = createInsertSchema(blackMarketListings).omit({ id: true });
export const insertBountyQuestSchema = createInsertSchema(bountyQuests).omit({ id: true });
export const insertBuildingUpgradeSchema = createInsertSchema(buildingUpgrades).omit({ id: true });
export const insertActivityLogSchema = createInsertSchema(activityLogs).omit({ id: true });

// Define types for each model
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Character = typeof characters.$inferSelect;
export type InsertCharacter = z.infer<typeof insertCharacterSchema>;

export type Aura = typeof auras.$inferSelect;
export type InsertAura = z.infer<typeof insertAuraSchema>;

export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;

export type FarmingTask = typeof farmingTasks.$inferSelect;
export type InsertFarmingTask = z.infer<typeof insertFarmingTaskSchema>;

export type DungeonRun = typeof dungeonRuns.$inferSelect;
export type InsertDungeonRun = z.infer<typeof insertDungeonRunSchema>;

export type ForgingTask = typeof forgingTasks.$inferSelect;
export type InsertForgingTask = z.infer<typeof insertForgingTaskSchema>;

export type BlackMarketListing = typeof blackMarketListings.$inferSelect;
export type InsertBlackMarketListing = z.infer<typeof insertBlackMarketListingSchema>;

export type BountyQuest = typeof bountyQuests.$inferSelect;
export type InsertBountyQuest = z.infer<typeof insertBountyQuestSchema>;

export type BuildingUpgrade = typeof buildingUpgrades.$inferSelect;
export type InsertBuildingUpgrade = z.infer<typeof insertBuildingUpgradeSchema>;

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
