#!/bin/bash

# List of files to update
FILES=(
  "client/src/components/common/CompactDiscordChat.tsx"
  "client/src/components/dashboard/ResourcesOverview.tsx"
  "client/src/components/dashboard/DiscordChat.tsx"
  "client/src/components/dashboard/KleosChatInterface.tsx"
  "client/src/components/dashboard/DashboardView.tsx"
  "client/src/components/forge/ForgeView.tsx"
  "client/src/components/blackmarket/BlackMarketView.tsx"
  "client/src/components/buildings/BuildingsView.tsx"
  "client/src/components/bounty/BountyBoardView.tsx"
  "client/src/components/collections/CollectionsView.tsx"
  "client/src/components/inventory/InventoryView.tsx"
  "client/src/components/townhall/TownhallView.tsx"
  "client/src/components/tavern/TavernView.tsx"
  "client/src/pages/collections.tsx"
)

# Perform replacements in each file
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Replace import statements
    sed -i 's/import { useDiscordAuth } from .\/lib\/discordAuth.;/import { useAuthStore } from '\''@\/lib\/zustandStore'\'';/g' "$file"
    sed -i 's/import { useDiscordAuth } from .\/..\/lib\/discordAuth.;/import { useAuthStore } from '\''@\/lib\/zustandStore'\'';/g' "$file"
    sed -i 's/import { useDiscordAuth } from .\/...\/lib\/discordAuth.;/import { useAuthStore } from '\''@\/lib\/zustandStore'\'';/g' "$file"
    sed -i 's/import { useDiscordAuth } from .\/....\/lib\/discordAuth.;/import { useAuthStore } from '\''@\/lib\/zustandStore'\'';/g' "$file"
    sed -i 's/import { useDiscordAuth } from .\@\/lib\/discordAuth.;/import { useAuthStore } from '\''@\/lib\/zustandStore'\'';/g' "$file"
    
    # Replace hook usage
    sed -i 's/const { user, logout } = useDiscordAuth()/const { user, logout } = useAuthStore()/g' "$file"
    sed -i 's/const { user } = useDiscordAuth()/const { user } = useAuthStore()/g' "$file"
    sed -i 's/useDiscordAuth()/useAuthStore()/g' "$file"
    
    echo "Updated $file"
  else
    echo "File not found: $file"
  fi
done

echo "Auth update complete"
