#!/bin/bash
# Fix rarity references in ForgeView.tsx
sed -i 's/aura\.rarity === .common./true/g' client/src/components/forge/ForgeView.tsx
sed -i 's/aura\.rarity === .rare./false/g' client/src/components/forge/ForgeView.tsx
sed -i 's/aura\.rarity === .epic./false/g' client/src/components/forge/ForgeView.tsx
sed -i 's/{aura\.rarity} • /Element: {aura.element} • /g' client/src/components/forge/ForgeView.tsx
sed -i 's/{aura\.rarity}/Level {aura.level}/g' client/src/components/forge/ForgeView.tsx
chmod +x fix_forge_rarity.sh
./fix_forge_rarity.sh
