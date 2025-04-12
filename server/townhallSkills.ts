// Townhall skill tree structure
export const townhallSkillTree = [
  // Main Townhall skills
  {
    id: 'resource_production',
    name: 'Resource Production',
    description: 'Increases resource gain by 5% per level',
    maxLevel: 5
  },
  {
    id: 'experience_boost',
    name: 'Experience Boost',
    description: 'Increases XP gain by 5% per level',
    maxLevel: 5
  },
  {
    id: 'construction_speed',
    name: 'Construction Speed',
    description: 'Reduces building upgrade time by 5% per level',
    maxLevel: 5
  },
  {
    id: 'extra_farming_slot',
    name: 'Extra Farming Slot',
    description: 'Unlocks an additional farming slot',
    maxLevel: 5
  },

  // Farm Plot unlocks
  { 
    id: 'th_farm_plot_1', 
    name: 'Farm Plot #1', 
    description: 'Unlocks farm plot #1 (requires Building Plans)', 
    maxLevel: 1 
  },
  { 
    id: 'th_farm_plot_2', 
    name: 'Farm Plot #2', 
    description: 'Unlocks farm plot #2 (requires Building Plans)', 
    maxLevel: 1 
  },
  { 
    id: 'th_farm_plot_3', 
    name: 'Farm Plot #3', 
    description: 'Unlocks farm plot #3 (requires Building Plans)', 
    maxLevel: 1 
  },
  { 
    id: 'th_farm_plot_4', 
    name: 'Farm Plot #4', 
    description: 'Unlocks farm plot #4 (requires Building Plans)', 
    maxLevel: 1 
  },
  { 
    id: 'th_farm_plot_5', 
    name: 'Farm Plot #5', 
    description: 'Unlocks farm plot #5 (requires Building Plans)', 
    maxLevel: 1 
  },
  
  // Forge Crafting Slot unlocks
  { 
    id: 'th_forge_slot_1', 
    name: 'Forge Crafting Slot #1', 
    description: 'Unlocks forge crafting slot #1 (requires Building Plans)', 
    maxLevel: 1 
  },
  { 
    id: 'th_forge_slot_2', 
    name: 'Forge Crafting Slot #2', 
    description: 'Unlocks forge crafting slot #2 (requires Building Plans)', 
    maxLevel: 1 
  },
  { 
    id: 'th_forge_slot_3', 
    name: 'Forge Crafting Slot #3', 
    description: 'Unlocks forge crafting slot #3 (requires Building Plans)', 
    maxLevel: 1 
  },
  { 
    id: 'th_forge_slot_4', 
    name: 'Forge Crafting Slot #4', 
    description: 'Unlocks forge crafting slot #4 (requires Building Plans)', 
    maxLevel: 1 
  },
  { 
    id: 'th_forge_slot_5', 
    name: 'Forge Crafting Slot #5', 
    description: 'Unlocks forge crafting slot #5 (requires Building Plans)', 
    maxLevel: 1 
  },
  
  // Special unlocks (every 5th level)
  { 
    id: 'th_crafting_station_1', 
    name: 'Crafting Station #1', 
    description: 'Unlocks crafting station #1 (available at Townhall level 5)', 
    maxLevel: 1, 
    requires: { townhall_level: 5 } 
  },
  { 
    id: 'th_crafting_station_2', 
    name: 'Crafting Station #2', 
    description: 'Unlocks crafting station #2 (available at Townhall level 10)', 
    maxLevel: 1, 
    requires: { townhall_level: 10 } 
  },
  { 
    id: 'th_farm_expansion_1', 
    name: 'Farm Expansion #1', 
    description: 'Unlocks an extra farm expansion (available at Townhall level 5)', 
    maxLevel: 1, 
    requires: { townhall_level: 5 } 
  },
  { 
    id: 'th_farm_expansion_2', 
    name: 'Farm Expansion #2', 
    description: 'Unlocks an extra farm expansion (available at Townhall level 10)', 
    maxLevel: 1, 
    requires: { townhall_level: 10 } 
  },
];

/**
 * Checks if a player has the required Building Plans resource
 * @param userId The user ID to check
 * @param storage The storage interface to use
 * @returns True if the player has Building Plans, false otherwise
 */
export async function hasBuildingPlans(userId: number, storage: any): Promise<boolean> {
  try {
    const resource = await storage.getResourceByNameAndUserId('Building Plans', userId);
    return resource && resource.quantity && resource.quantity >= 1;
  } catch (error) {
    console.error('Error checking for Building Plans:', error);
    return false;
  }
}

/**
 * Consumes a Building Plan resource from the player's inventory
 * @param userId The user ID to consume from
 * @param storage The storage interface to use
 * @returns True if successful, false otherwise
 */
export async function consumeBuildingPlan(userId: number, storage: any): Promise<boolean> {
  try {
    const resource = await storage.getResourceByNameAndUserId('Building Plans', userId);
    if (!resource || !resource.quantity || resource.quantity < 1) {
      return false;
    }
    
    await storage.updateResource(resource.id, {
      quantity: resource.quantity - 1
    });
    
    return true;
  } catch (error) {
    console.error('Error consuming Building Plan:', error);
    return false;
  }
}

/**
 * Gets the total available farming plots based on unlocked skills
 * @param unlockedSkills Array of unlocked skill IDs
 * @returns The number of available farming plots
 */
export function getAvailableFarmingPlots(unlockedSkills: string[]): number {
  return unlockedSkills.filter(skill => skill.startsWith('th_farm_plot_')).length;
}

/**
 * Gets the total available forge slots based on unlocked skills
 * @param unlockedSkills Array of unlocked skill IDs
 * @returns The number of available forge slots
 */
export function getAvailableForgeSlots(unlockedSkills: string[]): number {
  return unlockedSkills.filter(skill => skill.startsWith('th_forge_slot_')).length;
}

/**
 * Checks if the player needs to make a special upgrade choice
 * @param currentLevel The current Townhall level
 * @param unlockedSkills Array of unlocked skill IDs
 * @returns True if a special choice is available, false otherwise
 */
export function hasSpecialUpgradeChoice(currentLevel: number, unlockedSkills: string[]): boolean {
  if (currentLevel % 5 !== 0) return false;
  
  const levelSpecificUpgrades = townhallSkillTree.filter(skill => 
    skill.requires && skill.requires.townhall_level === currentLevel
  );
  
  // Check if any of these upgrades haven't been unlocked yet
  return levelSpecificUpgrades.some(skill => !unlockedSkills.includes(skill.id));
}