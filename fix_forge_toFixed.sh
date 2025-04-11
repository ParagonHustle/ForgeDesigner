#!/bin/bash
# Fix toFixed issues in ForgeView.tsx
sed -i '613s/aura.statMultipliers)/aura.statMultipliers || {})/g' client/src/components/forge/ForgeView.tsx
sed -i '614s/value.toFixed(2)/typeof value === "number" ? value.toFixed(2) : "0.00"/g' client/src/components/forge/ForgeView.tsx
sed -i '650s/secondaryAura.statMultipliers)/secondaryAura.statMultipliers || {})/g' client/src/components/forge/ForgeView.tsx
sed -i '651s/value.toFixed(2)/typeof value === "number" ? value.toFixed(2) : "0.00"/g' client/src/components/forge/ForgeView.tsx
sed -i '698s/aura.statMultipliers)/aura.statMultipliers || {})/g' client/src/components/forge/ForgeView.tsx
sed -i '699s/value.toFixed(2)/typeof value === "number" ? value.toFixed(2) : "0.00"/g' client/src/components/forge/ForgeView.tsx
sed -i '731s/primaryAura.level/primaryAura.level || 1/g' client/src/components/forge/ForgeView.tsx
sed -i '829s/value.toFixed(2)/typeof value === "number" ? value.toFixed(2) : "0.00"/g' client/src/components/forge/ForgeView.tsx
chmod +x fix_forge_toFixed.sh
./fix_forge_toFixed.sh
