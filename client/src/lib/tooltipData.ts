import { GameMechanicTooltip } from "@/components/common/GameTooltip";

// Define all game tooltips data
export const gameMechanicsTooltips: GameMechanicTooltip[] = [
  // Combat Mechanics
  {
    id: 'attack-meter',
    title: 'Attack Meter',
    description: 'Determines when a character can attack. The meter fills based on Speed stat, and when it reaches 100% the character can perform an action.',
    category: 'combat'
  },
  {
    id: 'status-effects',
    title: 'Status Effects',
    description: 'Temporary conditions that affect characters in battle. Effects include Burning (damage over time), Poisoned (damage over time), Weakened (reduced attack), and Slowed (reduced speed).',
    category: 'combat'
  },
  {
    id: 'skill-cooldown',
    title: 'Skill Cooldown',
    description: 'Powerful skills can only be used every X number of turns. Basic skills have no cooldown, while Advanced and Ultimate skills trigger based on a set number of attacks.',
    category: 'combat'
  },
  {
    id: 'elemental-types',
    title: 'Elemental Types',
    description: 'Characters and auras have elemental types (Fire, Water, Earth, Air) that affect their skills and potential strengths against enemies of specific elements.',
    category: 'combat'
  },

  // Character Stats
  {
    id: 'attack-stat',
    title: 'Attack',
    description: 'Determines the base damage a character deals with skills. Damage is calculated as: Attack × Skill Damage Multiplier.',
    category: 'character'
  },
  {
    id: 'vitality-stat',
    title: 'Vitality',
    description: 'Determines a character\'s maximum health points (HP). Higher vitality means more survivability in battle.',
    category: 'character'
  },
  {
    id: 'speed-stat',
    title: 'Speed',
    description: 'Determines how quickly the Attack Meter fills, allowing characters to act more frequently in battle.',
    category: 'character'
  },
  {
    id: 'focus-stat',
    title: 'Focus',
    description: 'Improves the chance of landing critical hits and increases critical damage.',
    category: 'character'
  },
  {
    id: 'accuracy-stat',
    title: 'Accuracy',
    description: 'Determines the chance to hit enemies. Higher accuracy reduces the chance of missing attacks.',
    category: 'character'
  },
  {
    id: 'defense-stat',
    title: 'Defense',
    description: 'Reduces incoming physical damage. Each point of defense reduces damage by a percentage.',
    category: 'character'
  },
  {
    id: 'resilience-stat',
    title: 'Resilience',
    description: 'Reduces the duration and effects of negative status conditions. Also provides resistance to magical damage.',
    category: 'character'
  },

  // Aura Mechanics
  {
    id: 'aura-bonuses',
    title: 'Aura Bonuses',
    description: 'Auras provide percentage-based boosts to character stats when equipped. These bonuses are shown as green numbers next to the base stat values.',
    category: 'aura'
  },
  {
    id: 'aura-rarities',
    title: 'Aura Rarities',
    description: 'Auras come in different rarities: Common, Uncommon, Rare, Epic, and Legendary. Higher rarity auras provide stronger stat bonuses and skills.',
    category: 'aura'
  },
  {
    id: 'aura-skills',
    title: 'Aura Skills',
    description: 'Auras grant skills to characters. Each aura can provide Basic, Advanced, and occasionally Ultimate skills based on its rarity.',
    category: 'aura'
  },

  // Farming Mechanics
  {
    id: 'farming-tasks',
    title: 'Farming Tasks',
    description: 'Send characters to gather resources from different locations. Tasks take real time to complete, and yield resources based on the character\'s level and the task difficulty.',
    category: 'farming'
  },
  {
    id: 'resource-types',
    title: 'Resource Types',
    description: 'Different resources are used for various activities: Basic materials for crafting, premium currencies for special items, and building materials for upgrades.',
    category: 'farming'
  },
  {
    id: 'farming-slots',
    title: 'Farming Slots',
    description: 'The number of simultaneous farming tasks you can have is determined by your Townhall level and unlocked skills.',
    category: 'farming'
  },

  // Forge Mechanics
  {
    id: 'forging-tasks',
    title: 'Forging Tasks',
    description: 'Create new auras by combining elemental essences. The forge transforms these essences into auras with random stats and skills based on the recipe used.',
    category: 'forge'
  },
  {
    id: 'forge-slots',
    title: 'Forge Slots',
    description: 'The number of simultaneous forging tasks you can have is determined by your Townhall level and unlocked skills.',
    category: 'forge'
  },
  {
    id: 'forge-recipes',
    title: 'Forge Recipes',
    description: 'Different combinations of materials produce different types of auras. Higher quality materials and rare recipes are more likely to produce powerful auras.',
    category: 'forge'
  },

  // Dungeon Mechanics
  {
    id: 'dungeon-types',
    title: 'Dungeon Types',
    description: 'Dungeons come in different elemental types and difficulties. Each dungeon has unique enemies and potential rewards.',
    category: 'dungeons'
  },
  {
    id: 'dungeon-stages',
    title: 'Dungeon Stages',
    description: 'Each dungeon consists of multiple stages with progressively stronger enemies. The final stage typically contains a boss with special abilities.',
    category: 'dungeons'
  },
  {
    id: 'dungeon-rewards',
    title: 'Dungeon Rewards',
    description: 'Completing dungeons rewards you with resources, currencies, and occasionally rare auras. Higher difficulty dungeons provide better rewards.',
    category: 'dungeons'
  },

  // Building Mechanics
  {
    id: 'townhall-upgrades',
    title: 'Townhall Upgrades',
    description: 'The Townhall is your main building that determines the maximum level of other buildings and unlocks new features.',
    category: 'building'
  },
  {
    id: 'skill-tree',
    title: 'Skill Tree',
    description: 'Unlock powerful abilities and bonuses through the skill tree. Skill points are earned by leveling up your Townhall and completing special quests.',
    category: 'building'
  },
  {
    id: 'building-slots',
    title: 'Building Slots',
    description: 'You can construct various buildings that provide unique benefits, such as additional farming slots, forge improvements, or character bonuses.',
    category: 'building'
  },

  // General Mechanics
  {
    id: 'level-progression',
    title: 'Level Progression',
    description: 'Characters, buildings, and auras gain levels through experience or upgrades. Higher levels provide stronger stats and unlock new abilities.',
    category: 'general'
  },
  {
    id: 'currencies',
    title: 'Currencies',
    description: 'The game features multiple currencies: Rogue Credits (common), Soul Shards (premium), and Forge Tokens (special crafting currency).',
    category: 'general'
  },
  {
    id: 'seasons',
    title: 'Seasons',
    description: 'Limited-time events that offer special challenges, unique rewards, and themed content. Seasonal progress is tracked separately from main progression.',
    category: 'general'
  }
];

// Utility function to get tooltip by ID
export function getTooltipById(id: string): GameMechanicTooltip | undefined {
  return gameMechanicsTooltips.find(tooltip => tooltip.id === id);
}

// Utility function to get tooltips by category
export function getTooltipsByCategory(category: GameMechanicTooltip['category']): GameMechanicTooltip[] {
  return gameMechanicsTooltips.filter(tooltip => tooltip.category === category);
}